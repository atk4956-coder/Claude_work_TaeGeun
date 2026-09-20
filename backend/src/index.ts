import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { join } from 'path';
import * as dns from 'dns';
import axios from 'axios';
import { config } from './config/env.js';
import { fetchMolitData } from './services/molit.js';
import { initializeDatabase, saveEstateRecords, clearDatabase } from './services/database.js';

const app = express();

// Initialize database
initializeDatabase();

// Auto-load initial data on startup (Seoul all districts + Gyeonggi)
(async () => {
  try {
    console.log('[Init] Loading initial data for all Seoul districts and Gyeonggi...');

    // 서울 25개 구
    const seoulDistricts = [
      '강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구',
      '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구',
      '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'
    ];

    // 모든 서울 구 + 경기도 병렬 로드
    const allPromises = [
      ...seoulDistricts.map(district => fetchMolitData(district)),
      fetchMolitData('경기도'),
    ];

    await Promise.all(allPromises);
    console.log(`[Init] Initial data loaded: ${seoulDistricts.length} Seoul districts + Gyeonggi`);
  } catch (err) {
    console.error('[Init] Error loading initial data:', err);
  }
})();

// Middleware
app.use(cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json());

// 프론트엔드 정적 파일 서빙
const cwd = process.cwd();
const frontendPath = join(cwd, 'frontend/dist');
console.log(`[Init] CWD: ${cwd}`);
console.log(`[Init] Frontend path: ${frontendPath}`);
app.use(express.static(frontendPath));

// Routes
app.get('/', (_, res) => {
  res.json({
    message: 'Real Estate Market Analytics API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      estates: '/api/estates',
      stats: '/api/stats',
    },
  });
});

app.get('/api/health', (_, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// 네트워크 진단 엔드포인트
app.get('/api/network-test', async (_, res) => {
  const results: any = {};

  try {
    // 1. MOLIT API 도메인 해석 테스트
    await new Promise((resolve) => {
      dns.resolve('openapi.molit.go.kr', (err: any, addresses: any) => {
        results.dns = err ? `Error: ${err.message}` : `Resolved: ${addresses.join(', ')}`;
        resolve(null);
      });
    });

    // 2. HTTP 요청 테스트 (3초 타임아웃)
    const testUrl = 'https://openapi.molit.go.kr/';
    try {
      const response = await axios.get(testUrl, { timeout: 3000 });
      results.http = `Status: ${response.status}`;
    } catch (err: any) {
      results.http = `Error: ${err.code || err.message}`;
    }

    // 3. 환경 변수 확인
    results.molit_key_set = !!config.MOLIT_SERVICE_KEY;
    results.molit_key_length = config.MOLIT_SERVICE_KEY?.length || 0;

    res.json({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      results
    });
  } catch (err: any) {
    res.json({ error: err.message });
  }
});

app.get('/api/estates', async (req, res) => {
  try {
    const { region, limit } = req.query;
    const regionStr = (region as string || '서울').trim();

    console.log(`[API] /api/estates called with region: "${regionStr}"`);

    // Fetch data from specified region
    const allData = await fetchMolitData(regionStr);
    console.log(`[API] Fetched ${allData.length} records for region: "${regionStr}"`);

    // Filter by location if region is a specific district (서울 구)
    let filteredData = allData;
    const seoulGus = ['강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'];
    if (seoulGus.includes(regionStr)) {
      filteredData = allData.filter(d => d.location.includes(regionStr));
      console.log(`[API] Filtered by Seoul district: ${filteredData.length} records`);
    }

    // Limit results
    const limitNum = Math.max(1, parseInt(limit as string) || 100);
    const result = filteredData.slice(0, limitNum);

    console.log(`[API] Returning ${result.length} records`);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[API] /api/estates error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const { region } = req.query;
    const regionStr = (region as string || '서울').trim();

    console.log(`[API] /api/stats called with region: "${regionStr}"`);

    // Fetch data from specified region
    const allData = await fetchMolitData(regionStr);
    console.log(`[API] Fetched ${allData.length} records for region: "${regionStr}"`);

    // Filter by location if region is a specific district (서울 구)
    let filteredData = allData;
    const seoulGus = ['강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'];
    if (seoulGus.includes(regionStr)) {
      filteredData = allData.filter(d => d.location.includes(regionStr));
      console.log(`[API] Filtered by Seoul district: ${filteredData.length} records`);
    }

    if (filteredData.length === 0) {
      console.log('[API] No data, returning zeros');
      return res.json({
        success: true,
        stats: { totalDeals: 0, avgPrice: 0, minPrice: 0, maxPrice: 0, avgArea: 0, maxArea: 0, minArea: 0, pricePerArea: 0, locations: 0 },
      });
    }

    // Calculate stats
    const prices = filteredData.map(d => d.price);
    const areas = filteredData.map(d => d.area);
    const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    const avgArea = Math.round((areas.reduce((a, b) => a + b, 0) / areas.length) * 100) / 100;
    const totalPrice = avgPrice * filteredData.length;

    const stats = {
      totalDeals: filteredData.length,
      avgPrice,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      avgArea,
      minArea: Math.min(...areas),
      maxArea: Math.max(...areas),
      pricePerArea: avgArea > 0 ? Math.round((totalPrice / (avgArea * filteredData.length)) * 100) / 100 : 0,
      locations: new Set(filteredData.map(d => d.location)).size,
    };

    console.log(`[API] Stats calculated:`, stats);
    res.json({ success: true, stats });
  } catch (error) {
    console.error('[API] /api/stats error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Reset and reload data
app.get('/api/reset', async (_req, res) => {
  try {
    console.log('[Reset] Clearing database and reloading data...');

    // Clear all estates
    await clearDatabase();

    // Reload data for Seoul and Gyeonggi
    const [seoulData, gyeonggiData] = await Promise.all([
      fetchMolitData('서울'),
      fetchMolitData('경기도'),
    ]);

    const allData = [...seoulData, ...gyeonggiData];
    const saved = await saveEstateRecords(allData);

    console.log(`[Reset] Reloaded ${saved} records (Seoul: ${seoulData.length}, Gyeonggi: ${gyeonggiData.length})`);

    res.json({
      success: true,
      message: 'Database reset and reloaded',
      recordsLoaded: saved,
    });
  } catch (error) {
    console.error('[Reset] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Sync data from MOLIT API
app.get('/api/sync', async (_req, res) => {
  try {
    console.log('[Sync] Starting data sync for Seoul and Gyeonggi...');

    // Fetch from MOLIT API
    const [seoulData, gyeonggiData] = await Promise.all([
      fetchMolitData('서울'),
      fetchMolitData('경기도'),
    ]);

    const allData = [...seoulData, ...gyeonggiData];
    console.log(`[Sync] Fetched ${allData.length} records (Seoul: ${seoulData.length}, Gyeonggi: ${gyeonggiData.length})`);

    // Save to DB
    const saved = await saveEstateRecords(allData);

    console.log(`[Sync] Saved ${saved} records to database`);

    res.json({
      success: true,
      message: `Data sync completed`,
      fetched: allData.length,
      saved: saved,
    });
  } catch (error) {
    console.error('[Sync] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Start server
const PORT = config.BACKEND_PORT;
app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Backend server running on http://localhost:${PORT}`);
});

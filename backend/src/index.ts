import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from './config/env.js';
import { fetchMolitData } from './services/molit.js';
import { initializeDatabase, getLatestEstates, getStatistics, saveEstateRecords, clearDatabase } from './services/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Initialize database
initializeDatabase();

// Auto-load initial data on startup
(async () => {
  try {
    console.log('[Init] Loading initial data...');
    await fetchMolitData('서울');
    console.log('[Init] Initial data loaded');
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

app.get('/api/estates', async (req, res) => {
  try {
    const { region, limit } = req.query;
    const regionStr = (region as string || '').trim();

    console.log(`[API] /api/estates called with region: "${regionStr}"`);

    // Get all mock data
    const allData = await fetchMolitData('서울');
    console.log(`[API] Total data: ${allData.length} records`);

    // Filter by region if specified (and not '서울')
    let filteredData = allData;
    if (regionStr && regionStr !== '서울') {
      filteredData = allData.filter(d => d.location.includes(regionStr));
      console.log(`[API] Filtered to "${regionStr}": ${filteredData.length} records`);
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
    const regionStr = (region as string || '').trim();

    console.log(`[API] /api/stats called with region: "${regionStr}"`);

    // Get all mock data
    const allData = await fetchMolitData('서울');
    console.log(`[API] Total data: ${allData.length} records`);

    // Filter by region if specified (and not '서울')
    let filteredData = allData;
    if (regionStr && regionStr !== '서울') {
      filteredData = allData.filter(d => d.location.includes(regionStr));
      console.log(`[API] Filtered to "${regionStr}": ${filteredData.length} records`);
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

    // Reload mock data
    const data = await fetchMolitData('서울');
    const saved = await saveEstateRecords(data);

    console.log(`[Reset] Reloaded ${saved} records`);

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
    console.log('[Sync] Starting data sync...');

    // Fetch from MOLIT API
    const data = await fetchMolitData('서울');

    console.log(`[Sync] Fetched ${data.length} records`);

    // Save to DB
    const saved = await saveEstateRecords(data);

    console.log(`[Sync] Saved ${saved} records to database`);

    res.json({
      success: true,
      message: `Data sync completed`,
      fetched: data.length,
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

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
    const regionStr = region as string || '서울';

    // Get mock data directly (bypass DB issues)
    const data = await fetchMolitData(regionStr);

    // Filter by region if specified
    let filteredData = data;
    if (region && regionStr !== '서울') {
      filteredData = data.filter(d => d.location.includes(regionStr));
    }

    // Limit results
    const limitNum = parseInt(limit as string) || 100;
    res.json({ success: true, data: filteredData.slice(0, limitNum) });
  } catch (error) {
    console.error('Error fetching estates:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const { region } = req.query;
    const regionStr = region as string || '서울';

    // Get mock data directly
    const data = await fetchMolitData(regionStr);

    // Filter by region
    let filteredData = data;
    if (region && regionStr !== '서울') {
      filteredData = data.filter(d => d.location.includes(regionStr));
    }

    if (filteredData.length === 0) {
      return res.json({
        success: true,
        stats: { totalDeals: 0, avgPrice: 0, minPrice: 0, maxPrice: 0, avgArea: 0, maxArea: 0, minArea: 0, pricePerArea: 0, locations: 0 },
      });
    }

    const prices = filteredData.map(d => d.price);
    const areas = filteredData.map(d => d.area);
    const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    const avgArea = Math.round((areas.reduce((a, b) => a + b, 0) / areas.length) * 100) / 100;

    const stats = {
      totalDeals: filteredData.length,
      avgPrice,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      avgArea,
      minArea: Math.min(...areas),
      maxArea: Math.max(...areas),
      pricePerArea: Math.round((avgPrice * 10000 / avgArea) * 100) / 100,
      locations: new Set(filteredData.map(d => d.location)).size,
    };
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
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
    console.log('[Reset] Database cleared');

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
app.get('/api/sync', async (req, res) => {
  try {
    const { region } = req.query;
    const regionStr = region as string || '서울';

    console.log(`[Sync] Starting data sync for region: ${regionStr}`);

    // Fetch from MOLIT API
    const data = await fetchMolitData(regionStr);

    console.log(`[Sync] Fetched ${data.length} records`);

    // Save to DB
    const saved = await saveEstateRecords(data);

    console.log(`[Sync] Saved ${saved} records to database`);

    res.json({
      success: true,
      message: `Data sync completed`,
      fetched: data.length,
      saved: saved,
      region: regionStr,
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

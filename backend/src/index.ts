import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from './config/env.js';
import { fetchMolitData } from './services/molit.js';
import { initializeDatabase, getLatestEstates, getStatistics, saveEstateRecords } from './services/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Initialize database
initializeDatabase();

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

    // Fetch from MOLIT API and save to DB
    await fetchMolitData(regionStr);

    // Return data from DB
    const data = await getLatestEstates(parseInt(limit as string) || 100, regionStr);
    res.json({ success: true, data });
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

    // Fetch from MOLIT API and save to DB
    await fetchMolitData(regionStr);

    // Get stats from DB
    const stats = await getStatistics(regionStr);
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
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

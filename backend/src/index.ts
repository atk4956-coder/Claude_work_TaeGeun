import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from './config/env.js';
import { fetchMolitData } from './services/molit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json());

// 프론트엔드 정적 파일 서빙
const frontendPath = join(__dirname, '../../frontend/dist');
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
    const { region, dealType, pageNo } = req.query;
    const data = await fetchMolitData(
      region as string,
      dealType as string,
      parseInt(pageNo as string) || 1
    );
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
    const data = await fetchMolitData(region as string, 'apts', 1);

    if (data.length === 0) {
      return res.json({ success: true, stats: null });
    }

    const prices = data.map(d => d.price);
    const areas = data.map(d => d.area);

    const stats = {
      totalDeals: data.length,
      avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      maxPrice: Math.max(...prices),
      minPrice: Math.min(...prices),
      avgArea: Math.round(areas.reduce((a, b) => a + b, 0) / areas.length * 100) / 100,
      maxArea: Math.max(...areas),
      minArea: Math.min(...areas),
      pricePerArea: Math.round((prices.reduce((a, b) => a + b, 0) / areas.reduce((a, b) => a + b, 0)) * 100) / 100,
      locations: [...new Set(data.map(d => d.location))].length,
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

// Start server
const PORT = config.BACKEND_PORT;
app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Backend server running on http://localhost:${PORT}`);
});

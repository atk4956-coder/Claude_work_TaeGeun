import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { fetchMolitData } from './services/molit.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => {
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

// Start server
const PORT = config.BACKEND_PORT;
app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Backend server running on http://localhost:${PORT}`);
});

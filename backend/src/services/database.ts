import { Pool } from 'pg';

export interface EstateRecord {
  id?: number;
  date: string;
  price: number;
  area: number;
  location: string;
  region: string;
  dealType: string;
  createdAt?: string;
}

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      console.log('[DB] DATABASE_URL not set - using mock data mode');
      return null as any;
    }

    pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    });

    pool.on('error', (err) => {
      console.error('[DB] Unexpected error on idle client', err);
    });
  }

  return pool;
}

export async function initializeDatabase() {
  try {
    const client = getPool();
    if (!client) {
      console.log('[DB] Skipping initialization - no database URL');
      return;
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS estates (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        price INTEGER NOT NULL,
        area REAL NOT NULL,
        location TEXT NOT NULL,
        region TEXT NOT NULL,
        dealType TEXT DEFAULT 'apts',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(date, price, area, location)
      )
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_date ON estates(date)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_region ON estates(region)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_dealType ON estates(dealType)`);

    console.log('[DB] Database initialized successfully');
  } catch (err) {
    console.error('[DB] Error initializing database:', err);
  }
}

export async function saveEstateRecords(records: EstateRecord[]): Promise<number> {
  try {
    const client = getPool();
    if (!client) {
      console.log('[DB] No database connection - skipping save');
      return 0;
    }

    let count = 0;
    for (const rec of records) {
      try {
        const result = await client.query(
          `INSERT INTO estates (date, price, area, location, region, dealType)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (date, price, area, location) DO NOTHING`,
          [rec.date, rec.price, rec.area, rec.location, rec.region, rec.dealType || 'apts']
        );
        count += result.rowCount || 0;
      } catch (err) {
        console.error('[DB] Error inserting record:', err);
      }
    }

    console.log(`[DB] Saved ${count} records`);
    return count;
  } catch (err) {
    console.error('[DB] Error in saveEstateRecords:', err);
    return 0;
  }
}

export async function getLatestEstates(
  limit: number = 100,
  region?: string
): Promise<EstateRecord[]> {
  try {
    const client = getPool();
    if (!client) {
      console.log('[DB] No database connection - returning empty');
      return [];
    }

    let query = `SELECT id, date, price, area, location, region, dealType, createdAt
                 FROM estates`;
    const params: any[] = [];

    if (region) {
      query += ` WHERE region = $${params.length + 1}`;
      params.push(region);
    }

    query += ` ORDER BY date DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await client.query(query, params);
    return result.rows || [];
  } catch (err) {
    console.error('[DB] Error in getLatestEstates:', err);
    return [];
  }
}

export async function getStatistics(region?: string): Promise<any> {
  try {
    const client = getPool();
    if (!client) {
      return {
        totalDeals: 0,
        avgPrice: 0,
        minPrice: 0,
        maxPrice: 0,
        avgArea: 0,
        maxArea: 0,
        minArea: 0,
        pricePerArea: 0,
        locations: 0,
      };
    }

    let query = `SELECT
                   COUNT(*) as totalCount,
                   ROUND(AVG(price)) as avgPrice,
                   MIN(price) as minPrice,
                   MAX(price) as maxPrice,
                   ROUND(AVG(area)::numeric, 2) as avgArea,
                   MAX(area) as maxArea,
                   MIN(area) as minArea,
                   COUNT(DISTINCT location) as locations
                 FROM estates`;
    const params: any[] = [];

    if (region) {
      query += ` WHERE region = $${params.length + 1}`;
      params.push(region);
    }

    const result = await client.query(query, params);
    const row = result.rows[0];

    const totalDeals = parseInt(row.totalcount) || 0;
    const totalPrice = (parseInt(row.avgprice) || 0) * totalDeals;
    const pricePerArea = totalDeals > 0 ? Math.round((totalPrice / (parseFloat(row.avgarea) || 1)) * 100) / 100 : 0;

    return {
      totalDeals,
      avgPrice: parseInt(row.avgprice) || 0,
      minPrice: parseInt(row.minprice) || 0,
      maxPrice: parseInt(row.maxprice) || 0,
      avgArea: parseFloat(row.avgarea) || 0,
      maxArea: parseFloat(row.maxarea) || 0,
      minArea: parseFloat(row.minarea) || 0,
      pricePerArea,
      locations: parseInt(row.locations) || 0,
    };
  } catch (err) {
    console.error('[DB] Error in getStatistics:', err);
    return {
      totalCount: 0,
      avgPrice: 0,
      minPrice: 0,
      maxPrice: 0,
      avgArea: 0,
    };
  }
}

export async function clearDatabase(): Promise<void> {
  try {
    const client = getPool();
    if (client) {
      await client.query('DELETE FROM estates');
      console.log('[DB] All records deleted');
    }
  } catch (err) {
    console.error('[DB] Error clearing database:', err);
    throw err;
  }
}

export async function closeDatabase() {
  if (pool) {
    await pool.end();
    console.log('[DB] Database connection closed');
  }
}

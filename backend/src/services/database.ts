import sqlite3 from 'sqlite3';
import { config } from '../config/env.js';

const dbPath = config.DATABASE_FILE_PATH;

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

let db: any;

function getDb() {
  if (!db) {
    db = new (sqlite3.Database as any)(dbPath);
  }
  return db;
}

export function initializeDatabase() {
  const database = getDb();
  database.serialize(() => {
    database.run(`
      CREATE TABLE IF NOT EXISTS estates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        price INTEGER NOT NULL,
        area REAL NOT NULL,
        location TEXT NOT NULL,
        region TEXT NOT NULL,
        dealType TEXT DEFAULT 'apts',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(date, price, area, location)
      )
    `, (err: any) => {
      if (err) console.error('[DB] Error creating table:', err);
    });
  });
  console.log('[DB] Database initialized');
}

export async function saveEstateRecords(records: EstateRecord[]): Promise<number> {
  return new Promise((resolve) => {
    const database = getDb();
    let count = 0;

    database.serialize(() => {
      const stmt = database.prepare(`
        INSERT OR IGNORE INTO estates
        (date, price, area, location, region, dealType)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      records.forEach((rec: EstateRecord, index: number) => {
        stmt.run(rec.date, rec.price, rec.area, rec.location, rec.region, rec.dealType || 'apts', function(this: any, err: any) {
          if (!err && this.changes > 0) count++;
        });
      });

      stmt.finalize(() => resolve(count));
    });
  });
}

export async function getLatestEstates(limit: number = 100, region?: string): Promise<EstateRecord[]> {
  return new Promise((resolve) => {
    const database = getDb();
    let query = `SELECT id, date, price, area, location, region, dealType, createdAt FROM estates`;
    const params: any[] = [];

    if (region) {
      query += ` WHERE region = ?`;
      params.push(region);
    }

    query += ` ORDER BY date DESC LIMIT ?`;
    params.push(limit);

    database.all(query, params, (err: any, rows: any[]) => {
      resolve(err ? [] : (rows || []));
    });
  });
}

export async function getStatistics(region?: string): Promise<any> {
  return new Promise((resolve) => {
    const database = getDb();
    let query = `SELECT COUNT(*) as totalCount, AVG(price) as avgPrice, MIN(price) as minPrice, MAX(price) as maxPrice, AVG(area) as avgArea FROM estates`;
    const params: any[] = [];

    if (region) {
      query += ` WHERE region = ?`;
      params.push(region);
    }

    database.get(query, params, (err: any, row: any) => {
      if (err) {
        resolve({ totalCount: 0, avgPrice: 0, minPrice: 0, maxPrice: 0, avgArea: 0 });
      } else {
        resolve({
          totalCount: row?.totalCount || 0,
          avgPrice: Math.round(row?.avgPrice || 0),
          minPrice: row?.minPrice || 0,
          maxPrice: row?.maxPrice || 0,
          avgArea: Math.round((row?.avgArea || 0) * 100) / 100,
        });
      }
    });
  });
}

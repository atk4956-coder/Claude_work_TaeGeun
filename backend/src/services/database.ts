import Database from 'better-sqlite3';
import { config } from '../config/env.js';

const dbPath = config.DATABASE_FILE_PATH;
export const db = new Database(dbPath) as any;

// 타입 정의
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

// 테이블 초기화
export function initializeDatabase() {
  db.exec(`
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
    );

    CREATE INDEX IF NOT EXISTS idx_date ON estates(date);
    CREATE INDEX IF NOT EXISTS idx_region ON estates(region);
    CREATE INDEX IF NOT EXISTS idx_dealType ON estates(dealType);
  `);

  console.log('[DB] Database initialized successfully');
}

// 데이터 저장
export function saveEstateRecords(records: EstateRecord[]): number {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO estates
    (date, price, area, location, region, dealType)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((recs: EstateRecord[]) => {
    let count = 0;
    for (const rec of recs) {
      const result = stmt.run(
        rec.date,
        rec.price,
        rec.area,
        rec.location,
        rec.region,
        rec.dealType || 'apts'
      );
      if (result.changes > 0) count++;
    }
    return count;
  });

  return insertMany(records);
}

// 최신 데이터 조회
export function getLatestEstates(limit: number = 100, region?: string): EstateRecord[] {
  let query = `
    SELECT id, date, price, area, location, region, dealType, createdAt
    FROM estates
  `;

  const params: any[] = [];

  if (region) {
    query += ` WHERE region = ?`;
    params.push(region);
  }

  query += ` ORDER BY date DESC LIMIT ?`;
  params.push(limit);

  const stmt = db.prepare(query);
  return stmt.all(...params) as EstateRecord[];
}

// 날짜 범위로 데이터 조회
export function getEstatesByDateRange(
  startDate: string,
  endDate: string,
  region?: string
): EstateRecord[] {
  let query = `
    SELECT id, date, price, area, location, region, dealType, createdAt
    FROM estates
    WHERE date BETWEEN ? AND ?
  `;

  const params: any[] = [startDate, endDate];

  if (region) {
    query += ` AND region = ?`;
    params.push(region);
  }

  query += ` ORDER BY date DESC`;

  const stmt = db.prepare(query);
  return stmt.all(...params) as EstateRecord[];
}

// 통계 데이터 조회
export function getStatistics(region?: string) {
  let query = `
    SELECT
      COUNT(*) as totalCount,
      AVG(price) as avgPrice,
      MIN(price) as minPrice,
      MAX(price) as maxPrice,
      AVG(area) as avgArea
    FROM estates
  `;

  const params: any[] = [];

  if (region) {
    query += ` WHERE region = ?`;
    params.push(region);
  }

  const stmt = db.prepare(query);
  const result = stmt.get(...params) as any;

  return {
    totalCount: result?.totalCount || 0,
    avgPrice: Math.round(result?.avgPrice || 0),
    minPrice: result?.minPrice || 0,
    maxPrice: result?.maxPrice || 0,
    avgArea: Math.round((result?.avgArea || 0) * 100) / 100,
  };
}

// 지역별 데이터 개수
export function getCountByRegion() {
  const stmt = db.prepare(`
    SELECT region, COUNT(*) as count
    FROM estates
    GROUP BY region
    ORDER BY count DESC
  `);
  return stmt.all() as { region: string; count: number }[];
}

// 데이터 정리 (오래된 데이터 삭제, 선택사항)
export function cleanOldData(daysToKeep: number = 365) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const stmt = db.prepare(`
    DELETE FROM estates WHERE date < ?
  `);

  const result = stmt.run(cutoffDate.toISOString().split('T')[0]);
  console.log(`[DB] Deleted ${result.changes} old records`);
  return result.changes;
}

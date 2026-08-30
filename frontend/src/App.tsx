import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import './App.css'

interface HealthResponse {
  status: string
  timestamp: string
}

interface EstateData {
  date: string
  price: number
  area: number
  location: string
}

interface Stats {
  totalDeals: number
  avgPrice: number
  maxPrice: number
  minPrice: number
  avgArea: number
  maxArea: number
  minArea: number
  pricePerArea: number
  locations: number
}

const API_URL = import.meta.env.MODE === 'production'
  ? 'https://claudeworktaegeun-production.up.railway.app'
  : 'http://localhost:3001'

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [estates, setEstates] = useState<EstateData[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [region, setRegion] = useState('서울')

  useEffect(() => {
    async function fetchData() {
      try {
        const [healthRes, estatesRes, statsRes] = await Promise.all([
          fetch(`${API_URL}/api/health`),
          fetch(`${API_URL}/api/estates?region=${region}`),
          fetch(`${API_URL}/api/stats?region=${region}`),
        ])

        if (!healthRes.ok || !estatesRes.ok || !statsRes.ok) {
          throw new Error('API call failed')
        }

        const healthData = await healthRes.json()
        const estatesData = await estatesRes.json()
        const statsData = await statsRes.json()

        setHealth(healthData)
        setEstates(estatesData.data || [])
        setStats(statsData.stats)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [region])

  const statsData = stats ? [
    { label: '평균 거래가', value: `${stats.avgPrice}만원` },
    { label: '최고가', value: `${stats.maxPrice}만원` },
    { label: '최저가', value: `${stats.minPrice}만원` },
    { label: '평균 면적', value: `${stats.avgArea}㎡` },
    { label: '평균 가격/㎡', value: `${stats.pricePerArea}만원` },
    { label: '거래건수', value: `${stats.totalDeals}건` },
    { label: '활성 지역', value: `${stats.locations}곳` },
  ] : []

  return (
    <div className="app">
      <header>
        <h1>부동산 시장 분석</h1>
        <p>Real Estate Market Analytics Platform</p>
      </header>

      <main>
        <section className="control-panel">
          <h2>지역 선택</h2>
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="서울">서울</option>
            <option value="부산">부산</option>
            <option value="인천">인천</option>
          </select>
        </section>

        <section className="health-check">
          <h2>연결 상태</h2>
          {loading && <p>데이터 로딩 중...</p>}
          {error && <p className="error">오류: {error}</p>}
          {health && <div className="success">✓ 백엔드 서버 정상</div>}
        </section>

        {!loading && stats && (
          <section className="stats-grid">
            <h2>주요 지표</h2>
            <div className="stats">
              {statsData.map((stat) => (
                <div key={stat.label} className="stat-card">
                  <p className="stat-label">{stat.label}</p>
                  <p className="stat-value">{stat.value}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {!loading && estates.length > 0 && (
          <>
            <section className="chart-section">
              <h2>실거래가 추이</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={estates}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => `${value}만원`} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#8884d8"
                    name="거래가격(만원)"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </section>

            <section className="chart-section">
              <h2>면적별 분포</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={estates}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => `${value}㎡`} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="area"
                    stroke="#82ca9d"
                    name="면적(㎡)"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </section>
          </>
        )}

        <section className="info">
          <h2>데이터</h2>
          <p>총 {estates.length}건의 거래 데이터 (최근 3개월)</p>
          <p>Phase 2 진행 중: 실제 MOLIT API 연동 테스트 중...</p>
        </section>
      </main>
    </div>
  )
}

export default App

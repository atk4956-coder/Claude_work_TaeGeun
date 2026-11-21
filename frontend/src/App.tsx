import { useState, useEffect } from 'react'
import { LineChart, Line, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
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

interface TrendPoint {
  month: string
  avgPrice: number
  pricePerArea: number
  count: number
}

// 만원 단위를 억/만원 표기로 변환 (예: 127212 -> 12.7억)
function formatPrice(v: number): string {
  if (v >= 10000) return `${(v / 10000).toFixed(1)}억`
  return `${v.toLocaleString()}만원`
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

const API_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://claudeworktaegeun-production.up.railway.app'

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [estates, setEstates] = useState<EstateData[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [region, setRegion] = useState('서울')

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        const encodedRegion = encodeURIComponent(region)
        console.log(`[FE] Fetching data for region: ${region} (encoded: ${encodedRegion})`)

        const [healthRes, estatesRes, statsRes, trendRes] = await Promise.all([
          fetch(`${API_URL}/api/health`),
          fetch(`${API_URL}/api/estates?region=${encodedRegion}`),
          fetch(`${API_URL}/api/stats?region=${encodedRegion}`),
          fetch(`${API_URL}/api/trend?region=${encodedRegion}`),
        ])

        console.log(`[FE] Responses: health=${healthRes.ok}, estates=${estatesRes.ok}, stats=${statsRes.ok}`)

        if (!healthRes.ok || !estatesRes.ok || !statsRes.ok || !trendRes.ok) {
          throw new Error('API call failed')
        }

        const healthData = await healthRes.json()
        const estatesData = await estatesRes.json()
        const statsData = await statsRes.json()
        const trendData = await trendRes.json()

        console.log(`[FE] Data loaded: ${estatesData.data?.length || 0} estates, stats=`, statsData.stats)

        setHealth(healthData)
        setEstates(estatesData.data || [])
        setStats(statsData.stats)
        setTrend(trendData.trend || [])
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        console.error('[FE] Error:', errorMsg)
        setError(errorMsg)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [region])

  const statsData = stats ? [
    { label: '평균 거래가', value: formatPrice(stats.avgPrice) },
    { label: '최고가', value: formatPrice(stats.maxPrice) },
    { label: '최저가', value: formatPrice(stats.minPrice) },
    { label: '평균 면적', value: `${stats.avgArea}㎡` },
    { label: '평균 가격/㎡', value: `${Math.round(stats.pricePerArea).toLocaleString()}만원` },
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
            <optgroup label="서울 (25개 구)">
              <option value="서울">전체</option>
              <option value="강남구">강남구</option>
              <option value="강동구">강동구</option>
              <option value="강북구">강북구</option>
              <option value="강서구">강서구</option>
              <option value="관악구">관악구</option>
              <option value="광진구">광진구</option>
              <option value="구로구">구로구</option>
              <option value="금천구">금천구</option>
              <option value="노원구">노원구</option>
              <option value="도봉구">도봉구</option>
              <option value="동대문구">동대문구</option>
              <option value="동작구">동작구</option>
              <option value="마포구">마포구</option>
              <option value="서대문구">서대문구</option>
              <option value="서초구">서초구</option>
              <option value="성동구">성동구</option>
              <option value="성북구">성북구</option>
              <option value="송파구">송파구</option>
              <option value="양천구">양천구</option>
              <option value="영등포구">영등포구</option>
              <option value="용산구">용산구</option>
              <option value="은평구">은평구</option>
              <option value="종로구">종로구</option>
              <option value="중구">중구</option>
              <option value="중랑구">중랑구</option>
            </optgroup>
            <optgroup label="경기도 (주요 시)">
              <option value="경기도">경기도 전체</option>
              <option value="성남시">성남시</option>
              <option value="수원시">수원시</option>
              <option value="고양시">고양시</option>
              <option value="용인시">용인시</option>
              <option value="안산시">안산시</option>
              <option value="안양시">안양시</option>
              <option value="부천시">부천시</option>
              <option value="평택시">평택시</option>
              <option value="화성시">화성시</option>
            </optgroup>
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

        {!loading && trend.length > 0 && (
          <>
            <section className="chart-section">
              <h2>월별 평균 거래가 추이</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trend} margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis width={70} tickFormatter={(v: number) => formatPrice(v)} />
                  <Tooltip formatter={(value: any) => formatPrice(Number(value))} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="avgPrice"
                    stroke="#8884d8"
                    name="평균 거래가"
                  />
                </LineChart>
              </ResponsiveContainer>
            </section>

            <section className="chart-section">
              <h2>면적별 거래가 분포</h2>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="area" name="면적" unit="㎡" />
                  <YAxis type="number" dataKey="price" name="거래가" width={70} tickFormatter={(v: number) => formatPrice(v)} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Legend />
                  <Scatter name="거래 (면적 vs 가격)" data={estates} fill="#82ca9d" />
                </ScatterChart>
              </ResponsiveContainer>
            </section>
          </>
        )}

        <section className="info">
          <h2>데이터</h2>
          <p>총 {stats?.totalDeals ?? 0}건의 거래 데이터 (최근 12개월, 산점도는 최신 {estates.length}건)</p>
          {estates.length > 0 ? (
            <p>✅ 데이터 로드 완료 (PostgreSQL + MOLIT API)</p>
          ) : (
            <p>📊 데이터 로드 중...</p>
          )}
        </section>
      </main>
    </div>
  )
}

export default App

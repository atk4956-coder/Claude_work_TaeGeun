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

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [estates, setEstates] = useState<EstateData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [healthRes, estatesRes] = await Promise.all([
          fetch('/api/health'),
          fetch('/api/estates'),
        ])

        if (!healthRes.ok || !estatesRes.ok) {
          throw new Error('API call failed')
        }

        const healthData = await healthRes.json()
        const estatesData = await estatesRes.json()

        setHealth(healthData)
        setEstates(estatesData.data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <div className="app">
      <header>
        <h1>부동산 시장 분석</h1>
        <p>Real Estate Market Analytics Platform</p>
      </header>

      <main>
        <section className="health-check">
          <h2>백엔드 연결 상태</h2>
          {loading && <p>데이터 로딩 중...</p>}
          {error && <p className="error">오류: {error}</p>}
          {health && (
            <div className="success">
              <p>✓ 백엔드 서버 정상 연결됨</p>
              <p>상태: {health.status}</p>
            </div>
          )}
        </section>

        {!loading && estates.length > 0 && (
          <section className="chart-section">
            <h2>실거래가 추이</h2>
            <ResponsiveContainer width="100%" height={400}>
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
        )}

        <section className="info">
          <h2>현재 상태</h2>
          <p>Phase 2: 첫 데이터 연동 진행 중 ✓</p>
          <p>총 {estates.length}건의 거래 데이터가 표시되고 있습니다.</p>
        </section>
      </main>
    </div>
  )
}

export default App

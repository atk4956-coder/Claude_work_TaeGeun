import { useState, useEffect } from 'react'
import './App.css'

interface HealthResponse {
  status: string
  timestamp: string
}

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkHealth() {
      try {
        const response = await fetch('/api/health')
        if (!response.ok) throw new Error('Health check failed')
        const data = await response.json()
        setHealth(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    checkHealth()
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
          {loading && <p>확인 중...</p>}
          {error && <p className="error">오류: {error}</p>}
          {health && (
            <div className="success">
              <p>✓ 백엔드 서버 정상 연결됨</p>
              <p>상태: {health.status}</p>
              <p>시간: {health.timestamp}</p>
            </div>
          )}
        </section>

        <section className="info">
          <h2>안내</h2>
          <p>이 프로젝트는 한국 부동산 시장 분석 플랫폼입니다.</p>
          <p>Phase 1: 스캐폴딩 (현재 단계)</p>
          <p>Phase 2: 첫 데이터 연동 (다음 단계)</p>
        </section>
      </main>
    </div>
  )
}

export default App

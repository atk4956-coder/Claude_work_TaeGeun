# 부동산 시장 분석 플랫폼 - 프로젝트 가이드

한국(서울·경기) 아파트 실거래가를 분석하는 웹앱입니다.
- **Backend**: Express + TypeScript (포트 3001), 국토부 MOLIT API, 메모리 캐시, 선택적 PostgreSQL(`DATABASE_URL`)
- **Frontend**: React + Vite + Recharts (포트 5173, `/api`는 3001로 프록시)
- **Shared**: 공유 타입/유틸리티
- **배포**: Railway(주), Render. 백엔드가 `frontend/dist`를 정적 서빙

## 현재 상태 (2026-11-22 기준)

- ✅ Phase 1: 스캐폴딩, 헬스체크
- ✅ Phase 2: MOLIT 실데이터 연동(서울 25개 구 × 최근 12개월), 지역 선택, 통계 카드, 차트
- 🔄 Phase 3: DB 저장은 구현됨(`DATABASE_URL` 있을 때만). 자동 갱신(크론)과 DB 우선 로딩은 미구현
- ⏳ Phase 4~5: 이동평균 등 지표 확장, 트렌드 요약

## 실행

```bash
npm install
npm run dev:backend    # 터미널 1
npm run dev:frontend   # 터미널 2 → http://localhost:5173
```

환경변수는 `backend/.env`(템플릿: `backend/.env.example`). `MOLIT_SERVICE_KEY` 필수.
`ADMIN_TOKEN`을 설정해야 `/api/reset`, `/api/sync`를 `x-admin-token` 헤더로 호출할 수 있습니다.

## API

| 엔드포인트 | 설명 |
|---|---|
| `GET /api/health` | 헬스체크 |
| `GET /api/estates?region=&limit=` | 거래 목록 (최신순, 기본 100건) |
| `GET /api/stats?region=` | 요약 통계 |
| `GET /api/trend?region=` | 월별 평균 거래가·㎡당 가격·거래건수 |
| `GET /api/reset`, `/api/sync` | 관리용 (ADMIN_TOKEN 필요) |

가격 단위는 **만원**입니다. 화면에서는 `formatPrice`로 억 단위 표기.

## 중요한 파일

| 파일 | 설명 |
|---|---|
| `backend/src/index.ts` | Express 앱, 캐시, API 라우트 |
| `backend/src/services/molit.ts` | MOLIT 호출, 지역(LAWD_CD) 코드, 모의 데이터 폴백 |
| `backend/src/services/database.ts` | PostgreSQL 저장/조회 |
| `backend/src/config/env.ts` | 환경변수 스키마(zod) |
| `frontend/src/App.tsx` | 화면 전체 |

## 알려진 이슈 / 주의

- MOLIT 호출은 월별 `numOfRows=100` 상한이라 거래가 많은 구는 월 일부만 수집됨 (월별 평균이 표본 기반)
- 최초 서울 로딩에 약 20초 (25개 구 × 12개월). 로딩 중 요청은 느릴 수 있음
- 가격 단위를 억→만원으로 바꿨으므로, 이전에 저장된 DB 데이터는 `/api/reset`으로 재적재 필요
- MOLIT 키는 URL 인코딩 상태로 복사되므로 `env.ts`에서 `decodeURIComponent` 처리
- Node `--loader` 대신 `--import tsx` 사용 (backend dev 스크립트)
- 경기도 전체는 성남·수원·고양·용인만 조회

## 다음 할 일

1. MOLIT 수집량 상한 해결(페이지네이션) 및 DB 우선 로딩/백그라운드 갱신
2. 자동 갱신(크론)
3. 이동평균 등 지표, 트렌드 요약
4. 경기도 시·군 확대, 거래 유형 확대

**마지막 업데이트**: 2026-11-22
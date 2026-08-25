# 부동산 시장 분석 플랫폼 - 프로젝트 가이드

## 📊 프로젝트 개요

한국 부동산 시장을 분석하는 웹 애플리케이션입니다.
- **Backend**: Express + Node.js (포트 3001)
- **Frontend**: React + Vite (포트 5174)
- **Shared**: 공유 타입/유틸리티

---

## ✅ 현재 진행 상황

### Phase 1 ✓ (완료: 2026-08-19)
- Express 백엔드 기본 구조
- React + Vite 프론트엔드 기본 구조
- FE ↔ BE 헬스체크 통신 확인

### Phase 2 🔄 (진행 중: 2026-08-19)
- ✅ 모의 데이터 기반 `/api/estates` 엔드포인트 완성
- ✅ Recharts 차트 컴포넌트 구현
- ✅ 프론트엔드에서 백엔드 API 호출 및 차트 렌더링
- ⏳ 다음: 실제 MOLIT API 연동 (국토부 API 키 설정 후)

---

## 🚀 개발 시작 방법

### 단계별 실행 (권장)

**터미널 1 - 백엔드:**
```bash
cd C:\Users\PC\Desktop\TG\0_Claude\work\TestProject
npm run dev:backend
# 포트 3001에서 실행
```

**터미널 2 - 프론트엔드:**
```bash
cd C:\Users\PC\Desktop\TG\0_Claude\work\TestProject
npm run dev:frontend
# 포트 5174에서 실행
```

**브라우저:**
- http://localhost:5174

### 한 번에 실행 (선택사항)
```bash
npm run dev
```
(각 프로세스가 분리되지 않으므로 권장하지 않음)

---

## 🔧 중요한 파일

| 파일 | 설명 |
|-----|------|
| `backend/src/index.ts` | 백엔드 메인 파일 (Express 앱) |
| `backend/src/services/molit.ts` | MOLIT API 서비스 (현재 모의 데이터) |
| `backend/src/config/env.ts` | 환경변수 설정 (zod 스키마) |
| `backend/.env.example` | 환경변수 템플릿 |
| `backend/.env` | 실제 환경변수 (git 무시됨) |
| `frontend/src/App.tsx` | 프론트엔드 메인 (Recharts 차트) |

---

## ⚠️ 알려진 이슈 및 해결책

### Node.js tsx 로더 문제
- **문제**: `--loader` 플래그는 Node v20.6.0+에서 deprecated
- **해결**: `backend/package.json`의 dev 스크립트를 `--import`로 변경
- **상태**: ✅ 고정됨 (2026-08-19)

### MOLIT API 키 인코딩
- **문제**: data.go.kr에서 복사한 API 키가 URL 인코딩 상태
- **해결**: `backend/src/config/env.ts`에서 `decodeURIComponent()` 처리
- **상태**: ✅ 고정됨 (2026-08-19)

---

## 📝 Phase 2 다음 단계 (내일 또는 나중)

### 실제 MOLIT API 연동
1. data.go.kr에서 API 키 발급받기
2. `backend/.env`에 키 설정
3. `backend/src/services/molit.ts`에서 실제 API 호출 구현
4. XML 응답 파싱

### 데이터 개선
- 지역별 데이터 필터링
- 날짜 범위 필터
- 거래 유형별 필터

### Phase 3 예정
- SQLite 데이터베이스 연동
- 자동 데이터 갱신 (크론 작업)
- 다양한 지표 추가 (전세수급지수, 입주물량 등)

---

## 📚 참고 자료

- **data.go.kr**: https://www.data.go.kr/
- **Express**: https://expressjs.com/
- **React**: https://react.dev/
- **Vite**: https://vitejs.dev/
- **Recharts**: https://recharts.org/

---

## 💡 개발 팁

- **HMR 활성화**: Vite는 자동으로 핫 모듈 리로드 지원
- **Workspace 구조**: npm workspaces로 관리 → `npm run dev:backend` / `npm run dev:frontend` 사용
- **TypeScript**: 각 워크스페이스에서 `tsconfig.json` 확인
- **환경변수**: `.env.example`을 항상 먼저 확인

---

**마지막 업데이트**: 2026-08-19
**작업자**: atk4956@gmail.com

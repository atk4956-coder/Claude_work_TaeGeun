# 부동산 시장 분석 플랫폼

한국 부동산 시장을 분석하는 웹 애플리케이션입니다. 이후 주식, 암호화폐 등의 탭도 추가할 예정입니다.

## 프로젝트 구조

```
TestProject/
├── frontend/          # React + Vite
├── backend/           # Express + Node.js
├── shared/            # 공유 타입 및 유틸리티
└── package.json       # 워크스페이스 설정
```

## 설치

```bash
npm install
```

이 명령은 `frontend/`, `backend/`, `shared/` 워크스페이스의 모든 의존성을 설치합니다.

## 개발 시작

### 두 터미널 사용 (권장 — 각 프로세스가 명확하게 분리됨)

**터미널 1: 백엔드**
```bash
npm run dev:backend
```
기본 포트: 3001

**터미널 2: 프론트엔드**
```bash
npm run dev:frontend
```
기본 포트: 5173

브라우저에서 `http://localhost:5173` 접속

### 한 명령으로 모두 시작 (선택사항)

```bash
npm run dev
```

## 환경설정

`.env.example`을 `.env`로 복사하여 필요한 값을 설정합니다.

```bash
cp backend/.env.example backend/.env
```

필수 환경 변수:
- `MOLIT_SERVICE_KEY`: 국토교통부 실거래가 API 키 (Phase 2에서 발급)

## Phase별 진행 상황

- ✅ **Phase 1**: 스캐폴딩 (완료)
  - Express 백엔드 기본 구조
  - React + Vite 프론트엔드 기본 구조
  - FE ↔ BE 헬스체크 통신 확인

- ⏳ **Phase 2**: 첫 데이터 연동 (다음 세션)
  - 국토부 API 키 발급
  - MOLIT 실거래가 API 연동
  - 첫 번째 차트 렌더링

- ⏳ **Phase 3**: DB 저장 + 자동 갱신
- ⏳ **Phase 4**: 지표 확장 (지역선택, 이동평균 등)
- ⏳ **Phase 5**: 트렌드 요약 + 폴리싱

## 학습 관련 노트

각 Phase는 작고 검증 가능한 단위로 설계되었습니다. 매 단계마다 코드를 함께 리뷰하며 진행하므로, 스택에 대한 이해를 점진적으로 쌓을 수 있습니다.

### 유용한 개념

- **npm workspaces**: 한 리포지토리에서 여러 패키지 관리
- **Express**: 간단한 REST API 서버 프레임워크
- **React + Vite**: 빠른 HMR(핫 모듈 리로드)과 최신 개발 경험
- **Recharts**: React 친화적 차트 라이브러리 (Phase 2부터 사용)
- **Drizzle ORM**: TypeScript 친화적 DB 접근 (Phase 3부터 사용)

## 다음 단계

Phase 2 진행을 위해:
1. data.go.kr에서 MOLIT 실거래가 API 키 발급
2. `backend/.env`에 키 설정
3. 첫 데이터 fetch + 차트 렌더링 구현

---

진행 중 궁금한 점은 언제든지 물어보세요!

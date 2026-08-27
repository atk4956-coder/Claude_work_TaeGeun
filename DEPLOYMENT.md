# 📱 Frontend 배포 가이드 (Railway)

## 준비 사항
- Backend가 Railway에서 Online 상태로 실행 중
- Backend Railway URL 확인 (예: https://backend-xxx.railway.app)

## 단계별 배포

### Step 1: Frontend 환경변수 확인
- frontend/.env.example 확인됨
- Backend URL을 입력할 준비

### Step 2: Railway 대시보드에서 Frontend 추가
1. https://railway.com 로그인
2. eloquent-imagination 프로젝트 접속
3. **+ Add Service** 클릭
4. **Deploy from GitHub** 선택
5. Repository 선택: atk4956-coder/Claude_work_TaeGeun
6. **Root Directory** 입력: \rontend\
7. **Save** 클릭 (중요!)

### Step 3: Frontend 배포 대기
- Railway가 빌드 시작 (2-5분)
- Build logs 확인

### Step 4: 환경변수 설정
배포 중 또는 후에 Frontend Service에서:
1. **Settings** → **Variables** 탭
2. **VITE_API_URL** 추가
3. Backend Railway URL 입력
   - 예: https://backend-xxxxxx.railway.app

### Step 5: 배포 확인
1. Frontend Service에서 **Domains** 확인
2. 제공된 URL에 접속
3. 차트와 데이터가 표시되는지 확인

## Backend URL 찾는 방법
1. Backend Service 클릭
2. **Settings** → **Domains**
3. 표시되는 URL 복사

## 문제 해결
- 빌드 실패: Root Directory 다시 확인
- 데이터 안 보임: VITE_API_URL 환경변수 확인
- CORS 에러: Backend의 CORS 설정 확인

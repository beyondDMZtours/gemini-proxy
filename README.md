# Gemini API 프록시 서버

API 키를 안전하게 보호하는 Vercel 서버리스 프록시입니다.

---

## 🚀 배포 방법 (5분 소요)

### 1단계: GitHub에 업로드

1. [GitHub](https://github.com)에 로그인
2. 새 저장소(Repository) 생성
3. 이 폴더의 파일들을 업로드

### 2단계: Vercel 연결

1. [Vercel](https://vercel.com)에 GitHub으로 로그인
2. "Add New Project" 클릭
3. 방금 만든 GitHub 저장소 선택
4. "Deploy" 클릭

### 3단계: API 키 설정 (중요!)

1. Vercel 대시보드에서 프로젝트 선택
2. **Settings** → **Environment Variables**
3. 다음 변수 추가:
   - Name: `GEMINI_API_KEY`
   - Value: `your-actual-api-key`
4. **Save** 클릭
5. **Deployments** → 최신 배포 → **Redeploy** 클릭

### 4단계: URL 확인

배포 완료 후 URL이 생성됩니다:
```
https://your-project-name.vercel.app
```

API 엔드포인트:
```
https://your-project-name.vercel.app/api/generate
```

---

## 🔧 HTML 파일 수정 방법

기존 HTML 파일에서 다음 부분을 수정하세요:

### 변경 전 (921-922줄 근처)
```javascript
const CONFIG = {
    useClaudeAPI: false,
    claudeAPIKey: '',
    geminiAPIKey: localStorage.getItem('gemini_api_key') || '',
    geminiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent'
};
```

### 변경 후
```javascript
const CONFIG = {
    useClaudeAPI: false,
    claudeAPIKey: '',
    // geminiAPIKey는 더 이상 필요 없음 (서버에서 관리)
    proxyEndpoint: 'https://your-project-name.vercel.app/api/generate'
};
```

### API 호출 부분 수정 (1488줄 근처)

변경 전:
```javascript
const response = await fetch(CONFIG.geminiEndpoint, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': CONFIG.geminiAPIKey
    },
    body: JSON.stringify(requestBody)
});
```

변경 후:
```javascript
const response = await fetch(CONFIG.proxyEndpoint, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
});
```

> ⚠️ `x-goog-api-key` 헤더를 제거하세요! API 키는 이제 서버에서 자동으로 추가됩니다.

---

## ✅ 테스트 방법

브라우저에서 다음 URL 접속:
```
https://your-project-name.vercel.app/api/generate
```

`{"error":"Method not allowed"}` 메시지가 나오면 정상 작동 중입니다.
(POST 요청만 허용하므로 GET 요청은 거부됨)

---

## 🔒 보안 강화 (선택사항)

### 특정 도메인만 허용

`api/generate.js`의 CORS 설정을 수정:

```javascript
// 변경 전
res.setHeader('Access-Control-Allow-Origin', '*');

// 변경 후 (본인 도메인만 허용)
res.setHeader('Access-Control-Allow-Origin', 'https://yourdomain.com');
```

### Rate Limiting 추가

Vercel 대시보드 → Settings → Functions → Rate Limiting에서 설정 가능

---

## 📁 폴더 구조

```
gemini-proxy/
├── api/
│   └── generate.js    # API 엔드포인트
├── vercel.json        # Vercel 설정
├── package.json       # 프로젝트 정보
├── .env.example       # 환경 변수 예시
└── README.md          # 이 문서
```

---

## ❓ 문제 해결

### "Server configuration error" 에러
→ Vercel 환경 변수에 GEMINI_API_KEY가 설정되지 않음. 3단계 확인.

### CORS 에러
→ 브라우저에서 직접 테스트 중이라면 정상. 실제 HTML에서 호출하면 동작함.

### 504 Gateway Timeout
→ Gemini API 응답이 느림. Vercel 무료 티어는 10초 제한. Pro 플랜은 60초.

---

## 💰 비용

- **무료 티어**: 월 100GB 대역폭, 충분함
- **Pro 플랜**: 월 $20 (더 긴 타임아웃 필요시)

일반적인 개인 사용은 무료 티어로 충분합니다.

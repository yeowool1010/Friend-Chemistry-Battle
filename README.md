# 친구 케미 배틀

두 사람의 테스트 점수로 케미를 계산하는 Next.js 앱이다. 샘플 두 사람(민지, 준호)으로 화면이 이어진다. 점수는 서버가 계산하고, 문장은 Gemini가 만든다. `sk-`로 시작하는 OpenAI 키가 있을 때만 OpenAI를 쓴다. 결과는 Supabase `chemistry_results`에 저장한다.

## 실행

```bash
npm install
npm run dev
```

`.env.local`에 Supabase 주소, 비밀 키, Gemini API 키를 둔다. 예시는 `.env.example`에 있다.

브라우저에서 http://localhost:3000 을 연다.

## 화면

- `/` 시작. 이름을 입력하고 테스트를 시작하거나, 샘플 결과를 바로 본다.
- `/test` 여덟 문항. 민지 샘플 답안으로 채울 수 있다.
- `/waiting` 내 제출 상태와 준호 샘플 응답.
- `/result` 케미 점수와 AI 문장.

진행 중 답안은 이 브라우저 탭의 sessionStorage에 남는다. 완성된 분석은 Supabase에 저장한다.

## 계산과 외부 서비스

- 답안 → 점수: `src/lib/scoring.ts`
- 두 점수 → 케미: `src/lib/chemistry.ts`
- AI 교체 지점: `src/lib/ai/aiService.ts`
- Supabase 저장: `src/lib/supabase/results.ts`
- 테이블 정의: `supabase/schema.sql`

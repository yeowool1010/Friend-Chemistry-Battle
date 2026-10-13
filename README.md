# 친구 케미 배틀

두 사람의 테스트 점수로 케미를 계산하는 Next.js 앱이다. 점수는 서버가 계산하고, 문장은 Gemini가 만든다. `sk-`로 시작하는 OpenAI 키가 있을 때만 OpenAI를 쓴다. 결과는 Supabase `chemistry_results`에 저장한다.

## 실행

```bash
npm install
npm run dev
```

`.env.local`에 Supabase 주소, 비밀 키, Gemini API 키를 둔다. 예시는 `.env.example`에 있다.

브라우저에서 http://localhost:3000 을 연다.

## 화면

- `/` 첫 화면. 예시 결과와 테스트 시작.
- `/test` 닉네임과 아홉 문항. 정답은 없다.
- `/profile` 개인 유형. 여기서 친구 초대 링크를 만든다.
- `/c/[code]` 친구용 초대 화면. 친구가 같은 테스트를 끝내면 둘의 케미가 열린다.

진행 중 답안은 이 브라우저 탭의 sessionStorage에 남는다. 완성된 분석은 Supabase에 저장한다.

## 계산과 외부 서비스

- 답안 → 점수: `src/lib/scoring.ts`
- 두 점수 → 케미: `src/lib/chemistry.ts`
- AI 교체 지점: `src/lib/ai/aiService.ts`
- Supabase 저장: `src/lib/supabase/results.ts`
- 테이블 정의: `supabase/schema.sql`

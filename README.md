# 친구 케미 배틀

두 사람의 테스트 점수로 케미를 계산하는 Next.js 앱이다. 이번 단계에서는 샘플 두 사람(민지, 준호)으로 시작, 테스트, 대기, 결과 화면을 잇고, 외부 API는 연결하지 않는다.

## 실행

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:3000 을 연다.

## 화면

- `/` 시작. 이름을 입력하고 테스트를 시작하거나, 샘플 결과를 바로 본다.
- `/test` 여덟 문항. 민지 샘플 답안으로 채울 수 있다.
- `/waiting` 내 제출 상태와 준호 샘플 응답.
- `/result` 케미 점수와 임시 AI 분석.

점수는 이 브라우저 탭의 sessionStorage에만 남는다.

## 계산과 AI

- 답안 → 점수: `src/lib/scoring.ts`
- 두 점수 → 케미: `src/lib/chemistry.ts`
- AI 교체 지점: `src/lib/ai/aiService.ts`

지금은 `createAiService()`가 mock 구현만 반환한다. 업체를 바꿀 때는 이 함수만 수정하면 된다. 화면은 `AiService` 결과를 그대로 보여 준다.

Supabase, OpenAI, PostHog는 이후 단계에서 연결한다.

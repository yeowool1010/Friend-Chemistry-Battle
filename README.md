# 창업 시뮬레이션

업종, 지역, 예산을 넣으면 창업 전·중·후를 계산하는 Next.js 앱이다. 월세와 매출 구간은 계획용 기준이고, 문장만 Gemini가 다듬는다. 상가정보 API 키가 있으면 반경 500m 점포 수를 함께 보여 준다. `/ask`에서는 질문을 받아 상가·업종코드·인허가·예산 계산 자료를 카드로 정리한다.

## 실행

```bash
npm install
npm run dev
```

`.env.local` 예시는 `.env.example`에 있다. Gemini 키와 공공데이터포털 서비스 키가 없어도 계획 계산은 나온다.

브라우저에서 http://localhost:3000 을 연다.

## 계산

- 자금, 후보 지역, 부담, 손익 시나리오: `src/lib/simulate.ts`
- 업종·지역 기준표: `src/lib/catalog.ts`
- 실시간 점포 수와 안내 문장: `src/lib/enrich.ts`
- 자료 질문: `src/lib/ask.ts`

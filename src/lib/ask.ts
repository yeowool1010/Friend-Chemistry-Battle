"use server";

import { completeJson } from "@/lib/completeJson";

export type AskResult = {
  query: string;
  answer: string;
};

export async function askQuestion(query: string): Promise<AskResult> {
  const text = query.trim().slice(0, 500);
  if (!text) return { query: text, answer: "질문을 입력해 주세요." };

  const answer = await answerQuestion(text);
  return {
    query: text,
    answer: answer ?? "답을 정리하지 못했습니다. 같은 질문을 다시 보내 주세요.",
  };
}

async function answerQuestion(query: string): Promise<string | null> {
  const text = await completeJson({
    prompt: `너는 소상공인 창업 상담자다. 질문에 한국어로 바로 답한다.
오픈API, 공공데이터, 데이터 포털, 자료 이름, 다운로드 링크를 제안하지 마라.
공식 시세, 카드 매출, 성공률을 확정된 사실처럼 말하지 마라. 금액이 필요하면 계산 기준과 확인할 점을 말한다.
답은 네 문장 이내로 쓴다.

질문:
${query}`,
    schemaName: "ask_answer",
    temperature: 0.4,
    maxOutputTokens: 700,
    schema: { type: "OBJECT", properties: { answer: { type: "STRING" } }, required: ["answer"] },
  });
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as { answer?: string };
    const answer = parsed.answer?.trim();
    return answer ? answer : null;
  } catch {
    return null;
  }
}

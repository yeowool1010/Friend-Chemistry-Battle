import { mockAiService } from "@/lib/ai/mockAiService";
import type { AiService } from "@/lib/ai/types";

/**
 * AI 업체 교체 지점.
 *
 * 지금은 외부 API를 호출하지 않고 mockAiService만 반환한다.
 * OpenAI나 다른 업체로 바꿀 때는 이 함수에서 구현만 고르면 된다.
 * 화면과 requestChemistryAnalysis는 AiService 계약만 알면 된다.
 *
 * 예:
 *   if (process.env.AI_PROVIDER === "openai") return openAiService;
 *   return mockAiService;
 */
export function createAiService(): AiService {
  return mockAiService;
}

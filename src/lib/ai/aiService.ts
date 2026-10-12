import { geminiAiService } from "@/lib/ai/geminiAiService";
import type { AiService } from "@/lib/ai/types";

/**
 * AI 업체 교체 지점.
 * 화면은 이 함수가 돌려주는 AiService만 사용한다.
 */
export function createAiService(): AiService {
  return geminiAiService;
}

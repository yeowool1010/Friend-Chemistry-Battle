import { geminiAiService } from "@/lib/ai/geminiAiService";
import { openaiAiService } from "@/lib/ai/openaiAiService";
import type { AiService } from "@/lib/ai/types";

/**
 * AI 업체 교체 지점.
 * 점수는 chemistry.ts가 계산하고, 여기서 고른 서비스는 문장만 만든다.
 * OpenAI 키(sk-)가 있을 때만 OpenAI를 쓴다. 없으면 Gemini 키를 쓴다.
 */
export function createAiService(): AiService {
  if (process.env.OPENAI_API_KEY?.startsWith("sk-")) return openaiAiService;
  return geminiAiService;
}

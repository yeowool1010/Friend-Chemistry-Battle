import type { TraitScores } from "@/lib/types";

export interface AiAnalysisRequest {
  personA: { name: string; scores: TraitScores };
  personB: { name: string; scores: TraitScores };
  chemistry: number;
  type: string;
  similarity: number;
  complement: number;
}

export interface AiAnalysis {
  providerId: string;
  headline: string;
  troubleMaker: string;
  fixer: string;
  travel: string;
  meal: string;
  summary: string;
  storageError: string | null;
}

/**
 * 업체별 구현이 맞출 계약.
 * 점수는 chemistry.ts가 이미 계산해서 넘긴다. AI는 그 결과를 설명만 한다.
 */
export interface AiService {
  readonly id: string;
  analyze(request: AiAnalysisRequest): Promise<AiAnalysis>;
}

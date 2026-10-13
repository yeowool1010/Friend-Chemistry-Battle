export interface AiTraitSnapshot {
  key: string;
  label: string;
  left: number;
  right: number;
  score: number;
  comment: string;
  mode: "similar" | "complement";
}

export interface AiAnalysisRequest {
  personA: { name: string };
  personB: { name: string };
  overall: number;
  gradeLabel: string;
  gradeHeadline: string;
  dimensions: AiTraitSnapshot[];
}

export interface AiAnalysis {
  providerId: string;
  headline: string;
  troubleMaker: string;
  fixer: string;
  travel: string;
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

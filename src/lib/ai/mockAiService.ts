import { withAnd, withSubject } from "@/lib/korean";
import type { AiAnalysisRequest, AiService } from "@/lib/ai/types";

const MOCK_DELAY_MS = 280;

export const mockAiService: AiService = {
  id: "mock",
  async analyze(request) {
    await delay(MOCK_DELAY_MS);

    const ranked = [...request.dimensions].sort((left, right) => right.score - left.score);
    const strongest = ranked.slice(0, 2);
    const weakest = ranked[ranked.length - 1];
    const pair = `${withAnd(request.personA.name)} ${request.personB.name}`;

    return {
      providerId: "mock",
      summary: summaryFor(pair, request),
      strengths: strongest.map((dimension) => `${dimension.label} ${dimension.score}점. ${dimension.comment}`),
      watchouts:
        weakest && weakest.score < 78
          ? [`${weakest.label} ${weakest.score}점. ${weakest.comment}`]
          : ["크게 거슬리는 축은 보이지 않는다. 다만 이 문장은 실제 대화 습관까지 보지는 못했다."],
      nextMove: nextMoveFor(request.gradeLabel, strongest[0]?.label ?? "에너지", weakest?.label ?? "계획"),
    };
  },
};

function summaryFor(pair: string, request: AiAnalysisRequest): string {
  const lead = `${pair}의 케미는 ${request.overall}점, ${request.gradeLabel}이다. ${request.gradeHeadline}.`;

  if (request.overall >= 85) {
    return `${lead} 속도가 달라도 장면이 맞물려서, 같이 있으면 할 일이 재미 쪽으로 늘어난다.`;
  }
  if (request.overall >= 72) {
    return `${lead} 감정을 읽는 방식은 통하고, 일정이나 모험에서는 역할이 갈린다.`;
  }
  if (request.overall >= 58) {
    return `${lead} 적이 되는 조합은 아니다. 말을 꺼내는 타이밍과 노는 속도만 한 박자씩 조율하면 된다.`;
  }
  return `${lead} 같은 질문에 다른 본능으로 답한다. 기대한 반응이 안 나올 때 서운함이 생기기 쉽다.`;
}

function nextMoveFor(gradeLabel: string, strongLabel: string, weakLabel: string): string {
  if (gradeLabel === "환상의 케미" || gradeLabel === "잘 맞는 친구") {
    return `이번 주에는 ${withSubject(strongLabel)} 살아나는 자리를 하나 잡으면 충분하다.`;
  }
  return `다음 약속에서는 ${weakLabel}만 미리 정해 보자. 나머지는 평소대로 둬도 된다.`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

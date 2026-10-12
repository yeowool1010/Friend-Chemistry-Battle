"use server";

import { createAiService } from "@/lib/ai/aiService";
import type { AiAnalysis } from "@/lib/ai/types";
import { calculateChemistry } from "@/lib/chemistry";
import { hasTraitScores } from "@/lib/session";
import type { TraitScores } from "@/lib/types";

interface AnalysisInput {
  personA: { name: string; scores: TraitScores };
  personB: { name: string; scores: TraitScores };
}

export async function requestChemistryAnalysis(input: AnalysisInput): Promise<AiAnalysis> {
  const personA = sanitizePerson(input.personA);
  const personB = sanitizePerson(input.personB);
  const chemistry = calculateChemistry(personA.scores, personB.scores);
  const ai = createAiService();

  return ai.analyze({
    personA: { name: personA.name },
    personB: { name: personB.name },
    overall: chemistry.overall,
    gradeLabel: chemistry.grade.label,
    gradeHeadline: chemistry.grade.headline,
    dimensions: chemistry.dimensions.map((dimension) => ({
      key: dimension.key,
      label: dimension.label,
      left: dimension.left,
      right: dimension.right,
      score: dimension.score,
      comment: dimension.comment,
      mode: dimension.mode,
    })),
  });
}

function sanitizePerson(person: AnalysisInput["personA"]): { name: string; scores: TraitScores } {
  const name = person.name.trim();
  if (!name || name.length > 12) {
    throw new Error("이름을 확인해 주세요.");
  }
  if (!hasTraitScores(person.scores)) {
    throw new Error("점수 형식이 올바르지 않습니다.");
  }
  return { name, scores: person.scores };
}

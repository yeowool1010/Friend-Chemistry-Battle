"use server";

import { createAiService } from "@/lib/ai/aiService";
import type { AiAnalysis } from "@/lib/ai/types";
import { calculateChemistry } from "@/lib/chemistry";
import { hasTraitScores } from "@/lib/session";
import { saveChemistryResult } from "@/lib/supabase/results";
import type { TraitScores } from "@/lib/types";

interface AnalysisInput {
  personA: { name: string; scores: TraitScores };
  personB: { name: string; scores: TraitScores };
}

export type AnalysisResult = { ok: true; analysis: AiAnalysis } | { ok: false; message: string };

export async function requestChemistryAnalysis(input: AnalysisInput): Promise<AnalysisResult> {
  try {
    const personA = sanitizePerson(input.personA);
    const personB = sanitizePerson(input.personB);
    const chemistry = calculateChemistry(personA.scores, personB.scores);
    const analysis = await createAiService().analyze({
      personA: { name: personA.name, scores: personA.scores },
      personB: { name: personB.name, scores: personB.scores },
      chemistry: chemistry.overall,
      type: chemistry.grade.label,
      similarity: chemistry.similarity,
      complement: chemistry.complement,
    });

    const storageError = await saveChemistryResult({
      personAName: personA.name,
      personBName: personB.name,
      personAScores: personA.scores,
      personBScores: personB.scores,
      overall: chemistry.overall,
      gradeLabel: chemistry.grade.label,
      analysis,
    });

    return { ok: true, analysis: { ...analysis, storageError } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "분석을 만들지 못했습니다.";
    return { ok: false, message };
  }
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

import { readServerEnv } from "@/lib/serverEnv";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AiAnalysis } from "@/lib/ai/types";
import type { TraitScores } from "@/lib/types";

export interface ChemistryResultRow {
  personAName: string;
  personBName: string;
  personAScores: TraitScores;
  personBScores: TraitScores;
  overall: number;
  gradeLabel: string;
  analysis: AiAnalysis;
}

export async function saveChemistryResult(row: ChemistryResultRow): Promise<string | null> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("chemistry_results").insert({
    owner_id: readServerEnv("APP_OWNER_ID") || "yeowool1010",
    person_a_name: row.personAName,
    person_b_name: row.personBName,
    person_a_scores: row.personAScores,
    person_b_scores: row.personBScores,
    overall: row.overall,
    grade_label: row.gradeLabel,
    analysis: row.analysis,
  });

  if (!error) return null;
  return readableStorageError(error.message);
}

function readableStorageError(message: string): string {
  if (message.includes("chemistry_results") || message.includes("PGRST205")) {
    return "Supabase에는 연결됐지만 chemistry_results 테이블이 없습니다.";
  }
  return message;
}

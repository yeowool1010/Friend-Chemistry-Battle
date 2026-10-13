import type { AiAnalysis } from "@/lib/ai/types";
import { isInviteCode, stampInviteCode } from "@/lib/inviteCode";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AnswerMap, TraitScores } from "@/lib/types";

export interface BattleRow {
  id: string;
  host_name: string;
  host_answers: AnswerMap;
  host_scores: TraitScores;
  host_token: string;
  guest_name: string | null;
  guest_answers: AnswerMap | null;
  guest_scores: TraitScores | null;
  guest_token: string | null;
  overall: number | null;
  grade_label: string | null;
  analysis: AiAnalysis | null;
}

export async function insertBattle(input: {
  code: string;
  hostName: string;
  hostAnswers: AnswerMap;
  hostScores: TraitScores;
  hostToken: string;
}): Promise<string> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("battles")
    .insert({
      host_name: input.hostName,
      host_answers: stampInviteCode(input.hostAnswers, input.code),
      host_scores: input.hostScores,
      host_token: input.hostToken,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(readableBattleError(error?.message));
  }
  return input.code;
}

export async function readBattle(key: string): Promise<BattleRow | null> {
  const supabase = createSupabaseServerClient();
  const query = supabase.from("battles").select("*");
  const filtered = isUuid(key) ? query.eq("id", key) : query.filter("host_answers->>inviteCode", "eq", key);
  if (!isUuid(key) && !isInviteCode(key)) return null;
  const { data, error } = await filtered.maybeSingle();
  if (error) throw new Error(readableBattleError(error.message));
  return data as BattleRow | null;
}

export async function completeBattle(
  id: string,
  input: {
    guestName: string;
    guestAnswers: AnswerMap;
    guestScores: TraitScores;
    guestToken: string;
    overall: number;
    gradeLabel: string;
    analysis: AiAnalysis | null;
  },
): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("battles")
    .update({
      guest_name: input.guestName,
      guest_answers: input.guestAnswers,
      guest_scores: input.guestScores,
      guest_token: input.guestToken,
      overall: input.overall,
      grade_label: input.gradeLabel,
      analysis: input.analysis,
    })
    .eq("id", id)
    .is("guest_name", null)
    .select("id");

  if (error) throw new Error(readableBattleError(error.message));
  if (!data?.length) throw new Error("이미 친구가 답을 보냈습니다.");
}

export async function saveBattleAnalysis(id: string, analysis: AiAnalysis): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("battles").update({ analysis }).eq("id", id);
  if (error) throw new Error(readableBattleError(error.message));
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function readableBattleError(message: string | undefined): string {
  if (!message) return "초대 링크를 저장하지 못했습니다.";
  if (message.includes("battles") || message.includes("PGRST205")) {
    return "Supabase에는 연결됐지만 battles 테이블이 없습니다.";
  }
  return message;
}

"use server";

import { createAiService } from "@/lib/ai/aiService";
import type { AiAnalysis } from "@/lib/ai/types";
import { calculateChemistry } from "@/lib/chemistry";
import { QUESTIONS } from "@/lib/questions";
import { isComplete, scoreAnswers } from "@/lib/scoring";
import { createInviteCode, isInviteCode, readInviteCode } from "@/lib/inviteCode";
import { completeBattle, insertBattle, readBattle, type BattleRow } from "@/lib/supabase/battles";
import { saveChemistryResult } from "@/lib/supabase/results";
import { hasTraitScores } from "@/lib/session";
import type { AnswerMap, TraitScores } from "@/lib/types";

export interface OpenBattle {
  id: string;
  status: "open";
  hostName: string;
}

export interface DoneBattle {
  id: string;
  status: "done";
  hostName: string;
  guestName: string;
  overall: number;
  gradeLabel: string;
  gradeHeadline: string;
  hostScores: TraitScores;
  guestScores: TraitScores;
  analysis: AiAnalysis | null;
}

export type PublicBattle = OpenBattle | DoneBattle;

type ActionError = { ok: false; message: string };

export async function createBattleInvite(input: {
  name: string;
  answers: AnswerMap;
}): Promise<{ ok: true; id: string; token: string } | ActionError> {
  try {
    const name = sanitizeName(input.name);
    const answers = sanitizeAnswers(input.answers);
    const token = crypto.randomUUID();
    const id = await insertFreshBattle({
      hostName: name,
      hostAnswers: answers,
      hostScores: scoreAnswers(answers),
      hostToken: token,
    });
    return { ok: true, id, token };
  } catch (error) {
    return { ok: false, message: errorText(error) };
  }
}

export async function loadBattle(id: string): Promise<{ ok: true; battle: PublicBattle } | ActionError> {
  try {
    const battle = await requireBattle(id);
    return { ok: true, battle: toPublicBattle(battle) };
  } catch (error) {
    return { ok: false, message: errorText(error) };
  }
}

export async function submitGuestAnswer(input: {
  battleId: string;
  name: string;
  answers: AnswerMap;
}): Promise<{ ok: true; token: string | null } | ActionError> {
  try {
    const battle = await requireBattle(input.battleId);
    if (battle.guest_name) {
      return { ok: false, message: "이미 친구가 답을 보냈습니다." };
    }

    const name = sanitizeName(input.name);
    if (name === battle.host_name) {
      return { ok: false, message: "초대한 사람과 다른 이름을 써 주세요." };
    }
    const answers = sanitizeAnswers(input.answers);
    const guestScores = scoreAnswers(answers);
    const chemistry = calculateChemistry(battle.host_scores, guestScores);
    const analysis = await writeAnalysis(battle.host_name, name, battle.host_scores, guestScores, chemistry);
    const token = crypto.randomUUID();

    await completeBattle(battle.id, {
      guestName: name,
      guestAnswers: answers,
      guestScores,
      guestToken: token,
      overall: chemistry.overall,
      gradeLabel: chemistry.grade.label,
      analysis,
    });

    return { ok: true, token };
  } catch (error) {
    return { ok: false, message: errorText(error) };
  }
}

export async function remixBattle(input: {
  battleId: string;
  token: string;
}): Promise<{ ok: true; id: string; token: string } | ActionError> {
  try {
    const battle = await requireBattle(input.battleId);
    const side = sideForToken(battle, input.token);
    if (!side) return { ok: false, message: "이 브라우저에서 만든 테스트만 새 링크로 이어 갈 수 있습니다." };

    const token = crypto.randomUUID();
    const id = await insertFreshBattle({
      hostName: side.name,
      hostAnswers: side.answers,
      hostScores: side.scores,
      hostToken: token,
    });
    return { ok: true, id, token };
  } catch (error) {
    return { ok: false, message: errorText(error) };
  }
}

async function writeAnalysis(
  hostName: string,
  guestName: string,
  hostScores: TraitScores,
  guestScores: TraitScores,
  chemistry: ReturnType<typeof calculateChemistry>,
): Promise<AiAnalysis | null> {
  try {
    const analysis = await createAiService().analyze({
      personA: { name: hostName, scores: hostScores },
      personB: { name: guestName, scores: guestScores },
      chemistry: chemistry.overall,
      type: chemistry.grade.label,
      similarity: chemistry.similarity,
      complement: chemistry.complement,
    });
    const storageError = await saveChemistryResult({
      personAName: hostName,
      personBName: guestName,
      personAScores: hostScores,
      personBScores: guestScores,
      overall: chemistry.overall,
      gradeLabel: chemistry.grade.label,
      analysis,
    });
    return { ...analysis, storageError };
  } catch {
    return null;
  }
}

function toPublicBattle(battle: BattleRow): PublicBattle {
  const publicId = readInviteCode(battle.host_answers) ?? battle.id;
  if (!battle.guest_name || !battle.guest_scores || !hasTraitScores(battle.host_scores) || battle.overall === null || !battle.grade_label) {
    return { id: publicId, status: "open", hostName: battle.host_name };
  }

  const chemistry = calculateChemistry(battle.host_scores, battle.guest_scores);
  return {
    id: publicId,
    status: "done",
    hostName: battle.host_name,
    guestName: battle.guest_name,
    overall: chemistry.overall,
    gradeLabel: chemistry.grade.label,
    gradeHeadline: chemistry.grade.headline,
    hostScores: battle.host_scores,
    guestScores: battle.guest_scores,
    analysis: isAnalysis(battle.analysis) ? battle.analysis : null,
  };
}

function sideForToken(battle: NonNullable<Awaited<ReturnType<typeof readBattle>>>, token: string) {
  if (token === battle.host_token && hasTraitScores(battle.host_scores)) {
    return { name: battle.host_name, answers: battle.host_answers, scores: battle.host_scores };
  }
  if (battle.guest_token && token === battle.guest_token && battle.guest_name && battle.guest_answers && battle.guest_scores && hasTraitScores(battle.guest_scores)) {
    return { name: battle.guest_name, answers: battle.guest_answers, scores: battle.guest_scores };
  }
  return null;
}

async function insertFreshBattle(input: {
  hostName: string;
  hostAnswers: AnswerMap;
  hostScores: TraitScores;
  hostToken: string;
}): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = createInviteCode();
    const existing = await readBattle(code);
    if (existing) continue;
    return insertBattle({ ...input, code });
  }
  throw new Error("초대 코드를 만들지 못했습니다.");
}

async function requireBattle(id: string) {
  if (!isInviteCode(id) && !isUuid(id)) throw new Error("초대 링크가 올바르지 않습니다.");
  const battle = await readBattle(id);
  if (!battle) throw new Error("초대 링크를 찾지 못했습니다.");
  if (!hasTraitScores(battle.host_scores)) throw new Error("초대한 사람의 점수를 읽지 못했습니다.");
  return battle;
}

function sanitizeName(value: string): string {
  const name = value.trim();
  if (!name || name.length > 12) throw new Error("이름은 1자에서 12자까지입니다.");
  return name;
}

function sanitizeAnswers(value: AnswerMap): AnswerMap {
  const answers: AnswerMap = {};
  for (const question of QUESTIONS) {
    const index = value?.[question.id];
    if (typeof index === "number" && Number.isInteger(index) && index >= 0 && index < question.choices.length) {
      answers[question.id] = index;
    }
  }
  if (!isComplete(answers)) throw new Error("문항을 모두 고른 뒤에 진행할 수 있습니다.");
  return answers;
}

function isAnalysis(value: unknown): value is AiAnalysis {
  if (!value || typeof value !== "object") return false;
  const raw = value as Partial<AiAnalysis>;
  if (
    typeof raw.headline !== "string" ||
    typeof raw.troubleMaker !== "string" ||
    typeof raw.fixer !== "string" ||
    typeof raw.travel !== "string" ||
    typeof raw.summary !== "string"
  ) {
    return false;
  }
  raw.meal = typeof raw.meal === "string" ? raw.meal : "";
  return true;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "요청을 처리하지 못했습니다.";
}

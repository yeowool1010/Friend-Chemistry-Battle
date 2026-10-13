import type { AnswerMap } from "@/lib/types";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const INVITE_CODE_FIELD = "inviteCode";

export function createInviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}

export function isInviteCode(value: string): boolean {
  return /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(value);
}

export function stampInviteCode(answers: AnswerMap, code: string): AnswerMap {
  return { ...stripInviteCode(answers), [INVITE_CODE_FIELD]: code } as unknown as AnswerMap;
}

export function readInviteCode(answers: AnswerMap | null | undefined): string | null {
  const code = (answers as Record<string, unknown> | null | undefined)?.[INVITE_CODE_FIELD];
  return typeof code === "string" && isInviteCode(code) ? code : null;
}

export function stripInviteCode(answers: AnswerMap): AnswerMap {
  const next = { ...answers };
  delete (next as Record<string, unknown>)[INVITE_CODE_FIELD];
  return next;
}

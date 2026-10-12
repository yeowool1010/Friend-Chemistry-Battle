import { QUESTIONS } from "@/lib/questions";
import { isComplete, scoreAnswers } from "@/lib/scoring";
import {
  SAMPLE_JUNHO,
  SAMPLE_MINJI,
  cloneParticipant,
  createDefaultSession,
} from "@/lib/sampleData";
import {
  TRAIT_KEYS,
  type AnswerMap,
  type BattleSession,
  type Participant,
  type TraitScores,
} from "@/lib/types";

const STORAGE_KEY = "fcb-session-v1";

export function readSession(): BattleSession {
  if (typeof window === "undefined") return createDefaultSession();

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultSession();
    return parseSession(JSON.parse(raw));
  } catch {
    return createDefaultSession();
  }
}

export function writeSession(session: BattleSession): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // 저장이 막혀도 이번 탭의 화면 이동은 유지한다.
  }
}

export function startAsUser(name: string): BattleSession {
  return {
    me: {
      id: "me",
      name: name.trim().slice(0, 12),
      answers: {},
      scores: null,
      source: "user",
    },
    partner: cloneParticipant(SAMPLE_JUNHO),
    usingSamplePair: false,
  };
}

export function setAnswer(session: BattleSession, questionId: string, choiceIndex: number): BattleSession {
  return {
    ...session,
    usingSamplePair: false,
    me: {
      ...session.me,
      source: "user",
      scores: null,
      answers: { ...session.me.answers, [questionId]: choiceIndex },
    },
  };
}

export function applyMinjiAnswers(session: BattleSession): BattleSession {
  return {
    ...session,
    usingSamplePair: false,
    me: {
      ...session.me,
      source: "user",
      scores: null,
      answers: { ...SAMPLE_MINJI.answers },
    },
  };
}

export function submitMyAnswers(session: BattleSession): BattleSession | null {
  if (!isComplete(session.me.answers)) return null;

  return {
    ...session,
    usingSamplePair: false,
    me: {
      ...session.me,
      source: "user",
      scores: scoreAnswers(session.me.answers),
    },
  };
}

export function loadSamplePair(): BattleSession {
  return {
    me: cloneParticipant(SAMPLE_MINJI),
    partner: cloneParticipant(SAMPLE_JUNHO),
    usingSamplePair: true,
  };
}

function parseSession(value: unknown): BattleSession {
  if (!value || typeof value !== "object") return createDefaultSession();

  const raw = value as Partial<BattleSession>;
  const fallback = createDefaultSession();

  return {
    me: normalizeParticipant(raw.me, fallback.me),
    partner: normalizeParticipant(raw.partner, fallback.partner),
    usingSamplePair: raw.usingSamplePair === true,
  };
}

function normalizeParticipant(value: unknown, fallback: Participant): Participant {
  if (!value || typeof value !== "object") return fallback;

  const raw = value as Partial<Participant>;
  const answers = normalizeAnswers(raw.answers);
  const complete = isComplete(answers);
  const name = typeof raw.name === "string" ? raw.name.trim().slice(0, 12) : fallback.name;

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : fallback.id,
    name,
    answers,
    scores: complete ? scoreAnswers(answers) : null,
    source: raw.source === "sample" ? "sample" : "user",
  };
}

function normalizeAnswers(value: unknown): AnswerMap {
  if (!value || typeof value !== "object") return {};

  const answers: AnswerMap = {};
  for (const question of QUESTIONS) {
    const index = (value as Record<string, unknown>)[question.id];
    if (typeof index === "number" && Number.isInteger(index) && index >= 0 && index < question.choices.length) {
      answers[question.id] = index;
    }
  }
  return answers;
}

type SessionSnapshot = {
  hydrated: boolean;
  session: BattleSession;
};

const serverSnapshot: SessionSnapshot = {
  hydrated: false,
  session: createDefaultSession(),
};

let clientSnapshot: SessionSnapshot = serverSnapshot;
const sessionListeners = new Set<() => void>();

export function subscribeSession(listener: () => void) {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
}

export function getServerSnapshot(): SessionSnapshot {
  return serverSnapshot;
}

export function getClientSnapshot(): SessionSnapshot {
  if (typeof window === "undefined") return serverSnapshot;
  if (!clientSnapshot.hydrated) {
    clientSnapshot = { hydrated: true, session: readSession() };
  }
  return clientSnapshot;
}

export function updateSession(session: BattleSession) {
  if (typeof window === "undefined") return;
  clientSnapshot = { hydrated: true, session };
  writeSession(session);
  for (const listener of sessionListeners) listener();
}

export function hasTraitScores(value: unknown): value is TraitScores {
  if (!value || typeof value !== "object") return false;
  return TRAIT_KEYS.every((key) => {
    const score = (value as TraitScores)[key];
    return typeof score === "number" && Number.isFinite(score) && score >= 0 && score <= 100;
  });
}

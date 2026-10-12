import { QUESTIONS } from "@/lib/questions";
import { isComplete, scoreAnswers } from "@/lib/scoring";
import type { AnswerMap, BattleSession, Participant } from "@/lib/types";

const MINJI_CHOICES = [0, 1, 1, 0, 0, 3, 1, 0];
const JUNHO_CHOICES = [1, 1, 1, 3, 2, 3, 1, 2];

export interface SampleProfile {
  participant: Participant;
  blurb: string;
}

export const SAMPLE_MINJI = createSample("minji", "민지", MINJI_CHOICES);
export const SAMPLE_JUNHO = createSample("junho", "준호", JUNHO_CHOICES);

export const SAMPLE_PROFILES: SampleProfile[] = [
  {
    participant: SAMPLE_MINJI,
    blurb: "새로운 판을 먼저 열고, 할 말은 그 자리에서 한다.",
  },
  {
    participant: SAMPLE_JUNHO,
    blurb: "시간을 지키고, 서운한 말은 바로 꺼내지 않는다.",
  },
];

export type PairKind = "user" | "sample" | "fallback";

export interface ResolvedPair {
  me: Participant;
  partner: Participant;
  kind: PairKind;
}

export function resolveBattlePair(session: BattleSession): ResolvedPair {
  if (session.me.scores && session.partner.scores) {
    return {
      me: session.me,
      partner: session.partner,
      kind: session.usingSamplePair ? "sample" : "user",
    };
  }

  return {
    me: SAMPLE_MINJI,
    partner: SAMPLE_JUNHO,
    kind: "fallback",
  };
}

export function createDefaultSession(): BattleSession {
  return {
    me: {
      id: "me",
      name: "",
      answers: {},
      scores: null,
      source: "user",
    },
    partner: cloneParticipant(SAMPLE_JUNHO),
    usingSamplePair: false,
  };
}

export function cloneParticipant(participant: Participant): Participant {
  return {
    ...participant,
    answers: { ...participant.answers },
    scores: participant.scores ? { ...participant.scores } : null,
  };
}

function createSample(id: string, name: string, choiceIndexes: number[]): Participant {
  if (choiceIndexes.length !== QUESTIONS.length) {
    throw new Error(`${name} 샘플 답안 수가 문항 수와 다릅니다.`);
  }

  const answers: AnswerMap = {};
  QUESTIONS.forEach((question, index) => {
    answers[question.id] = choiceIndexes[index];
  });

  if (!isComplete(answers)) {
    throw new Error(`${name} 샘플 답안이 완전하지 않습니다.`);
  }

  return {
    id,
    name,
    answers,
    scores: scoreAnswers(answers),
    source: "sample",
  };
}

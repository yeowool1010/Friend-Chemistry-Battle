import { QUESTIONS } from "@/lib/questions";
import { TRAIT_KEYS, type AnswerMap, type TraitKey, type TraitScores } from "@/lib/types";

export function isComplete(answers: AnswerMap): boolean {
  return QUESTIONS.every((question) => {
    const index = answers[question.id];
    return typeof index === "number" && index >= 0 && index < question.choices.length;
  });
}

/** 선택지 점수를 더한 원점수. AI를 부르지 않는다. */
export function traitSums(answers: AnswerMap): TraitScores {
  const sums = emptyScores();

  for (const question of QUESTIONS) {
    const index = answers[question.id];
    const selected = typeof index === "number" ? question.choices[index] : undefined;
    if (!selected) continue;

    for (const key of TRAIT_KEYS) {
      sums[key] += selected.scores[key] ?? 0;
    }
  }

  return sums;
}

/** 원점수를 그 성향의 최대 득점 대비 0~100으로 맞춘다. 케미 비교는 이 값을 쓴다. */
export function scoreAnswers(answers: AnswerMap): TraitScores {
  const sums = traitSums(answers);
  const maxes = maxScores();
  const scores = emptyScores();

  for (const key of TRAIT_KEYS) {
    scores[key] = maxes[key] === 0 ? 0 : Math.round((sums[key] / maxes[key]) * 100);
  }
  return scores;
}

function maxScores(): TraitScores {
  const maxes = emptyScores();
  for (const question of QUESTIONS) {
    for (const key of TRAIT_KEYS) {
      maxes[key] += peak(question.choices.map((choice) => choice.scores[key] ?? 0));
    }
  }
  return maxes;
}

function peak(values: number[]): number {
  return values.reduce((highest, value) => Math.max(highest, value), 0);
}

function emptyScores(): Record<TraitKey, number> {
  return {
    spontaneous: 0,
    planning: 0,
    emotional: 0,
    extrovert: 0,
    realistic: 0,
  };
}

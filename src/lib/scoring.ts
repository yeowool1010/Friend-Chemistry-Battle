import { QUESTIONS } from "@/lib/questions";
import { TRAIT_KEYS, type AnswerMap, type TraitScores } from "@/lib/types";

export function isComplete(answers: AnswerMap): boolean {
  return QUESTIONS.every((question) => {
    const index = answers[question.id];
    return typeof index === "number" && index >= 0 && index < question.choices.length;
  });
}

export function scoreAnswers(answers: AnswerMap): TraitScores {
  const sums = emptyScores();
  const maxes = emptyScores();

  for (const question of QUESTIONS) {
    for (const key of TRAIT_KEYS) {
      const peak = Math.max(...question.choices.map((choice) => choice.scores[key] ?? 0));
      maxes[key] += peak;
    }

    const index = answers[question.id];
    const selected = typeof index === "number" ? question.choices[index] : undefined;
    if (!selected) continue;

    for (const key of TRAIT_KEYS) {
      sums[key] += selected.scores[key] ?? 0;
    }
  }

  const scores = emptyScores();
  for (const key of TRAIT_KEYS) {
    scores[key] = maxes[key] === 0 ? 0 : Math.round((sums[key] / maxes[key]) * 100);
  }
  return scores;
}

function emptyScores(): TraitScores {
  return {
    energy: 0,
    empathy: 0,
    planning: 0,
    candor: 0,
    adventure: 0,
    humor: 0,
  };
}

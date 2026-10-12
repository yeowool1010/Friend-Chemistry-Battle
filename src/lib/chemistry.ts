import { TRAITS, TRAIT_KEYS, type TraitKey, type TraitScores } from "@/lib/types";

export type ChemistryMode = "similar" | "complement";

export interface ChemistryRule {
  mode: ChemistryMode;
  /** complement일 때 가장 높게 치는 점수 차 */
  idealGap: number;
  weight: number;
}

/**
 * 공감·솔직·유머는 비슷할수록, 계획·모험·에너지는 적당한 간격일수록 케미가 높다.
 * 화면과 AI 설명은 이 함수의 결과를 그대로 쓴다.
 */
export const CHEMISTRY_RULES: Record<TraitKey, ChemistryRule> = {
  empathy: { mode: "similar", idealGap: 0, weight: 0.22 },
  candor: { mode: "similar", idealGap: 0, weight: 0.16 },
  humor: { mode: "similar", idealGap: 0, weight: 0.14 },
  planning: { mode: "complement", idealGap: 28, weight: 0.18 },
  adventure: { mode: "complement", idealGap: 24, weight: 0.16 },
  energy: { mode: "complement", idealGap: 18, weight: 0.14 },
};

export const CHEMISTRY_SUMMARY =
  "공감, 솔직, 유머는 점수가 비슷할수록 높다. 계획, 모험, 에너지는 적당한 간격이 역할을 나눌 때 높다.";

export interface ChemistryGrade {
  id: "spark" | "sync" | "adjust" | "contrast";
  label: string;
  headline: string;
}

export interface DimensionChemistry {
  key: TraitKey;
  label: string;
  description: string;
  mode: ChemistryMode;
  left: number;
  right: number;
  gap: number;
  score: number;
  comment: string;
}

export interface ChemistryResult {
  overall: number;
  grade: ChemistryGrade;
  dimensions: DimensionChemistry[];
}

export function calculateChemistry(left: TraitScores, right: TraitScores): ChemistryResult {
  const weightSum = TRAIT_KEYS.reduce((sum, key) => sum + CHEMISTRY_RULES[key].weight, 0);

  const dimensions = TRAIT_KEYS.map((key) => {
    const meta = TRAITS.find((trait) => trait.key === key);
    if (!meta) {
      throw new Error(`알 수 없는 성향입니다: ${key}`);
    }

    const rule = CHEMISTRY_RULES[key];
    const leftScore = clamp(left[key]);
    const rightScore = clamp(right[key]);
    const gap = Math.abs(leftScore - rightScore);
    const score = pairScore(leftScore, rightScore, rule);

    return {
      key,
      label: meta.label,
      description: meta.description,
      mode: rule.mode,
      left: leftScore,
      right: rightScore,
      gap,
      score,
      comment: describeDimension(meta.label, rule, gap, score),
    };
  });

  const overall = clamp(
    Math.round(
      dimensions.reduce((sum, dimension) => {
        return sum + dimension.score * (CHEMISTRY_RULES[dimension.key].weight / weightSum);
      }, 0),
    ),
  );

  return {
    overall,
    grade: gradeFor(overall),
    dimensions,
  };
}

export function pairScore(left: number, right: number, rule: ChemistryRule): number {
  const gap = Math.abs(left - right);
  if (rule.mode === "similar") {
    return clamp(Math.round(100 - gap));
  }

  const distance = Math.abs(gap - rule.idealGap);
  const maxDistance = Math.max(rule.idealGap, 100 - rule.idealGap);
  if (maxDistance === 0) return 100;
  return clamp(Math.round(100 - (distance / maxDistance) * 100));
}

function describeDimension(label: string, rule: ChemistryRule, gap: number, score: number): string {
  if (rule.mode === "similar") {
    if (score >= 88) return `${label} 점수가 가까워 이 장면에서는 설명이 거의 필요 없다.`;
    if (score >= 70) return `${label} 점수는 조금씩 다르지만, 어느 쪽이 틀렸다고 느끼기 전이다.`;
    return `${label} 점수 차이가 커서 같은 상황에서도 먼저 하는 행동이 갈린다.`;
  }

  if (score >= 85) return `${label} 간격이 적당해서 한쪽이 밀고 한쪽이 받아 주기 좋다.`;
  if (gap < rule.idealGap) return `${label} 점수가 비슷해 보완보다는 같은 방향으로 기운다.`;
  if (score >= 70) return `${label} 간격이 조금 넓지만, 한쪽이 판을 열고 한쪽이 받아 준다.`;
  return `${label} 간격이 넓다. 한쪽은 성급하고, 다른 쪽은 답답하다고 느낄 수 있다.`;
}

function gradeFor(overall: number): ChemistryGrade {
  if (overall >= 85) {
    return { id: "spark", label: "환상의 케미", headline: "같이 있으면 판이 커지는 조합" };
  }
  if (overall >= 72) {
    return { id: "sync", label: "잘 맞는 친구", headline: "결은 통하고, 빈자리는 서로 메운다" };
  }
  if (overall >= 58) {
    return { id: "adjust", label: "맞춰 가는 사이", headline: "좋은 쪽에 가깝고, 속도만 맞추면 된다" };
  }
  return { id: "contrast", label: "결이 다른 친구", headline: "틀린 게 아니라, 노는 방식이 다르다" };
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

import { TRAITS, TRAIT_KEYS, type TraitKey, type TraitScores } from "@/lib/types";

export const CHEMISTRY_DISCLAIMER = "재미를 위한 결과입니다.";

export type ChemistryStyle = "harmony" | "complement" | "mixed";

export interface ChemistryGrade {
  id: "soul" | "duo" | "chaos" | "banter" | "odd" | "mystery" | "miracle";
  label: string;
  headline: string;
}

export interface DimensionChemistry {
  key: TraitKey;
  label: string;
  description: string;
  left: number;
  right: number;
  gap: number;
  comment: string;
}

export interface ChemistryResult {
  overall: number;
  similarity: number;
  complement: number;
  style: ChemistryStyle;
  grade: ChemistryGrade;
  dimensions: DimensionChemistry[];
}

/**
 * 조화는 성향이 가까울수록, 보완은 차이가 60점 근처일수록 높다.
 * 최종 케미는 더 높은 쪽을 중심으로 잡고, 다른 쪽을 조금 섞는다.
 * AI는 이 숫자를 다시 계산하지 않는다.
 */
export function calculateChemistry(left: TraitScores, right: TraitScores): ChemistryResult {
  const dimensions = TRAIT_KEYS.map((key) => {
    const meta = TRAITS.find((trait) => trait.key === key);
    if (!meta) {
      throw new Error(`알 수 없는 성향입니다: ${key}`);
    }

    const leftScore = clamp(left[key]);
    const rightScore = clamp(right[key]);
    const gap = Math.abs(leftScore - rightScore);

    return {
      key,
      label: meta.label,
      description: meta.description,
      left: leftScore,
      right: rightScore,
      gap,
      comment: describeGap(meta.label, gap),
    };
  });

  const similarity = average(dimensions.map((dimension) => 100 - dimension.gap));
  const complement = average(dimensions.map((dimension) => complementOf(dimension.gap)));
  const lead = Math.max(similarity, complement);
  const other = Math.min(similarity, complement);
  const overall = clamp(Math.round(lead * 0.8 + other * 0.2));
  const style = styleFor(similarity, complement);

  return {
    overall,
    similarity,
    complement,
    style,
    grade: gradeFor(overall, style),
    dimensions,
  };
}

export function styleLabel(style: ChemistryStyle): string {
  if (style === "harmony") return "조화형";
  if (style === "complement") return "보완형";
  return "섞인 사이";
}

function complementOf(gap: number): number {
  const distance = Math.abs(gap - 62);
  return clamp(Math.round(100 - distance * 1.2));
}

function styleFor(similarity: number, complement: number): ChemistryStyle {
  if (complement >= similarity + 8) return "complement";
  if (similarity >= complement + 8) return "harmony";
  return "mixed";
}

function gradeFor(overall: number, style: ChemistryStyle): ChemistryGrade {
  if (overall >= 95) {
    return { id: "soul", label: "전생부터 친구형", headline: "만나기 전부터 알고 있던 사이" };
  }
  if (overall >= 85) {
    if (style === "complement") {
      return { id: "chaos", label: "환장의 보완형", headline: "한쪽이 터뜨리고 한쪽이 수습하는 조합" };
    }
    return { id: "duo", label: "환장의 단짝형", headline: "같이 있으면 판이 두 배가 되는 조합" };
  }
  if (overall >= 75) {
    return { id: "banter", label: "티격태격 찰떡형", headline: "투닥거려도 결국 같이 있는 조합" };
  }
  if (overall >= 60) {
    return { id: "odd", label: "묘하게 잘 맞는형", headline: "설명은 안 되는데 또 만나게 되는 조합" };
  }
  if (overall >= 40) {
    return { id: "mystery", label: "왜 친구인지 미스터리형", headline: "결은 다른데 연락은 남는 조합" };
  }
  return { id: "miracle", label: "기적의 우정형", headline: "계산이 안 나와도 친구인 조합" };
}

function describeGap(label: string, gap: number): string {
  if (gap <= 15) return `${label}이 비슷해서 이 장면에서는 말이 필요 없다.`;
  if (gap >= 45) return `${label} 차이가 커서 역할이 갈린다.`;
  return `${label}은 조금 다르고, 그 정도가 재미가 된다.`;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return clamp(Math.round(values.reduce((sum, value) => sum + value, 0) / values.length));
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

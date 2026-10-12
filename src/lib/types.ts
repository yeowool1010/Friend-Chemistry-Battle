export const TRAIT_KEYS = [
  "energy",
  "empathy",
  "planning",
  "candor",
  "adventure",
  "humor",
] as const;

export type TraitKey = (typeof TRAIT_KEYS)[number];

export type TraitScores = Record<TraitKey, number>;

export interface TraitMeta {
  key: TraitKey;
  label: string;
  description: string;
}

export const TRAITS: TraitMeta[] = [
  { key: "energy", label: "에너지", description: "같이 있을 때 템포" },
  { key: "empathy", label: "공감", description: "감정 신호를 읽는 정도" },
  { key: "planning", label: "계획", description: "미리 정해 두고 움직이는 정도" },
  { key: "candor", label: "솔직", description: "할 말을 바로 꺼내는 정도" },
  { key: "adventure", label: "모험", description: "새로운 판을 여는 정도" },
  { key: "humor", label: "유머", description: "장난과 드립의 농도" },
];

export type AnswerMap = Partial<Record<string, number>>;

export interface Participant {
  id: string;
  name: string;
  answers: AnswerMap;
  scores: TraitScores | null;
  source: "sample" | "user";
}

export interface BattleSession {
  me: Participant;
  partner: Participant;
  usingSamplePair: boolean;
}

export const TRAIT_KEYS = ["spontaneous", "planning", "emotional", "extrovert", "realistic"] as const;

export type TraitKey = (typeof TRAIT_KEYS)[number];

export type TraitScores = Record<TraitKey, number>;

export interface TraitMeta {
  key: TraitKey;
  label: string;
  description: string;
}

export const TRAITS: TraitMeta[] = [
  { key: "spontaneous", label: "즉흥성", description: "일단 움직이고 보는 정도" },
  { key: "planning", label: "계획성", description: "다음 수를 먼저 두는 정도" },
  { key: "emotional", label: "감정성", description: "공기와 기분을 먼저 읽는 정도" },
  { key: "extrovert", label: "외향성", description: "판을 열고 사람을 부르는 정도" },
  { key: "realistic", label: "현실성", description: "재미 다음의 계산을 보는 정도" },
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
  battleId: string | null;
  role: "host" | "guest" | null;
  inviteToken: string | null;
}

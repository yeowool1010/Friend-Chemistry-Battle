import { TRAITS, type TraitKey, type TraitScores } from "@/lib/types";

export interface Persona {
  title: string;
  line: string;
  reason: string;
}

const PERSONAS: Record<TraitKey, Persona> = {
  spontaneous: {
    title: "일단 하고 보는 사고유발형",
    line: "계획보다 행동이 먼저 나오는 타입.",
    reason: "친구들이 당신을 좋아하는 이유는 매번 무슨 일이 생기기 때문입니다.",
  },
  planning: {
    title: "뒤에서 다 정리하는 수습형",
    line: "정신없는 판도 일정표로 바꾸는 타입.",
    reason: "친구들이 당신을 찾는 이유는 끝나고 나면 숙소가 남아 있기 때문입니다.",
  },
  emotional: {
    title: "분위기부터 읽는 감정형",
    line: "말보다 공기가 먼저 오는 타입.",
    reason: "친구들이 당신을 찾는 이유는 설명이 필요 없기 때문입니다.",
  },
  extrovert: {
    title: "판을 먼저 여는 호출형",
    line: "조용한 단톡을 못 견디는 타입.",
    reason: "친구들이 당신을 좋아하는 이유는 약속이 생기기 때문입니다.",
  },
  realistic: {
    title: "계산이 빠른 현실형",
    line: "재미 다음에 통장부터 보는 타입.",
    reason: "친구들이 당신을 붙잡는 이유는 택시비가 남기 때문입니다.",
  },
};

const TIE_BREAK: TraitKey[] = ["spontaneous", "extrovert", "emotional", "planning", "realistic"];

export function describePersona(scores: TraitScores): Persona {
  const strongest = [...TRAITS].sort((left, right) => {
    const gap = scores[right.key] - scores[left.key];
    if (gap !== 0) return gap;
    return TIE_BREAK.indexOf(left.key) - TIE_BREAK.indexOf(right.key);
  })[0];

  return PERSONAS[strongest.key];
}

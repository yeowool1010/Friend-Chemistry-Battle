import type { TraitKey } from "@/lib/types";

export interface Choice {
  text: string;
  scores: Partial<Record<TraitKey, number>>;
}

export interface Question {
  id: string;
  prompt: string;
  choices: Choice[];
}

export const QUESTIONS: Question[] = [
  {
    id: "q1",
    prompt: "금요일 밤, 친구가 “나와”라고 하면",
    choices: [
      { text: "누구랑 어디인지 묻기 전에 일단 나간다", scores: { energy: 4, adventure: 2, humor: 1 } },
      { text: "누가 오는지 보고, 괜찮은 판이면 합류한다", scores: { energy: 2, planning: 2, empathy: 1 } },
      { text: "나가기 애매하면 통화로 대신한다", scores: { empathy: 2, planning: 1 } },
      { text: "이미 약속이 있어야 몸을 움직인다", scores: { energy: 1, planning: 4 } },
    ],
  },
  {
    id: "q2",
    prompt: "친구가 말수를 줄이고 축 처져 있다",
    choices: [
      { text: "옆에 앉아 이야기가 나올 때까지 들어 준다", scores: { empathy: 4 } },
      { text: "먹을 걸 챙기며 기분을 슬쩍 살핀다", scores: { empathy: 3, humor: 1 } },
      { text: "왜 그런지 그 자리에서 물어본다", scores: { empathy: 2, candor: 3 } },
      { text: "혼자 있고 싶은 신호로 보고 자리를 비킨다", scores: { empathy: 2, planning: 1 } },
    ],
  },
  {
    id: "q3",
    prompt: "둘만 떠나는 짧은 여행이라면",
    choices: [
      { text: "이동이랑 밥까지 미리 정해 둔다", scores: { planning: 4 } },
      { text: "큰 일정만 잡고 빈칸은 그날 정한다", scores: { planning: 2, adventure: 3 } },
      { text: "표만 있으면 된다. 나머지는 발길 가는 대로", scores: { adventure: 4 } },
      { text: "새로운 곳보다 익숙하고 편한 곳이 낫다", scores: { planning: 3, energy: 1 } },
    ],
  },
  {
    id: "q4",
    prompt: "의견이 정반대로 갈릴 때",
    choices: [
      { text: "그 자리에서 내 생각을 또박또박 말한다", scores: { candor: 4 } },
      { text: "상대 말을 한 번 더 듣고 내 쪽을 보탠다", scores: { candor: 2, empathy: 2 } },
      { text: "분위기가 상하면 내 의견은 접어 둔다", scores: { empathy: 2 } },
      { text: "사람들 앞은 넘기고, 나중에 둘만 있을 때 말한다", scores: { candor: 2, planning: 2 } },
    ],
  },
  {
    id: "q5",
    prompt: "처음 보는 메뉴를 고를 때",
    choices: [
      { text: "설명이 낯설수록 그게 당긴다", scores: { adventure: 4, humor: 1 } },
      { text: "친구가 고르면 대개 따라간다", scores: { adventure: 1, empathy: 2 } },
      { text: "후기를 보고 실패 확률이 낮은 걸 고른다", scores: { planning: 3, adventure: 1 } },
      { text: "늘 먹던 맛에서 잘 벗어나지 않는다", scores: { planning: 2 } },
    ],
  },
  {
    id: "q6",
    prompt: "단체 채팅에서 나는",
    choices: [
      { text: "드립이 먼저고, 대화가 식으면 다시 불을 지핀다", scores: { humor: 4, energy: 3, candor: 1 } },
      { text: "말은 짧아도 리액션은 빠르다", scores: { humor: 2, energy: 2 } },
      { text: "필요한 말만 하고 채팅은 빨리 닫는다", scores: { planning: 2, candor: 2 } },
      { text: "재미있는 걸 모아 두었다가 타이밍에 던진다", scores: { humor: 3, planning: 1 } },
    ],
  },
  {
    id: "q7",
    prompt: "약속 시간 10분 전",
    choices: [
      { text: "이미 도착해서 자리를 보고 있다", scores: { planning: 4 } },
      { text: "딱 맞춰 들어가는 편이다", scores: { planning: 3, energy: 2 } },
      { text: "가는 중이라는 말을 먼저 보낸다", scores: { planning: 1, humor: 2, energy: 2 } },
      { text: "시간보다 흐름을 따라가다 늦을 때가 있다", scores: { adventure: 2, humor: 1 } },
    ],
  },
  {
    id: "q8",
    prompt: "상대에게 서운한 일이 생기면",
    choices: [
      { text: "쌓아 두면 더 싫어져서 바로 말한다", scores: { candor: 4, empathy: 1 } },
      { text: "하루쯤 두고, 정리된 말로 다시 꺼낸다", scores: { candor: 3, planning: 3, empathy: 2 } },
      { text: "티는 나지만 입 밖으로 꺼내진 않는다", scores: { candor: 1, empathy: 2, humor: 1 } },
      { text: "농담으로 한 번 풀고, 그래도 남으면 그때 말한다", scores: { candor: 1, humor: 4, energy: 2 } },
    ],
  },
];

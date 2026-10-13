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

const MARKS = ["①", "②", "③", "④"] as const;

export function choiceMark(index: number): string {
  return MARKS[index] ?? String(index + 1);
}

export const QUESTIONS: Question[] = [
  {
    id: "q1",
    prompt: "친구랑 여행을 갔는데 기차 시간이 10분 남았다.",
    choices: [
      { text: "일단 뛰고 본다", scores: { spontaneous: 3 } },
      { text: "다음 기차를 알아본다", scores: { planning: 3, realistic: 1 } },
      { text: "친구에게 왜 늦었냐고 따진다", scores: { emotional: 2 } },
      { text: "커피부터 산다", scores: { spontaneous: 2 } },
    ],
  },
  {
    id: "q2",
    prompt: "친구가 새벽 2시에 “야 지금 나와”라고 하면?",
    choices: [
      { text: "나감", scores: { spontaneous: 3, extrovert: 2 } },
      { text: "이유부터 물어봄", scores: { realistic: 2, planning: 1 } },
      { text: "읽고 자는 척", scores: { realistic: 2 } },
      { text: "영상통화부터 검", scores: { emotional: 2, extrovert: 1 } },
    ],
  },
  {
    id: "q3",
    prompt: "친구가 연애 상담을 하면?",
    choices: [
      { text: "현실적으로 말함", scores: { realistic: 3 } },
      { text: "무조건 친구 편", scores: { emotional: 3 } },
      { text: "상대방 입장도 생각함", scores: { emotional: 1, realistic: 2 } },
      { text: "듣다가 내 연애 얘기함", scores: { extrovert: 2, spontaneous: 1 } },
    ],
  },
  {
    id: "q4",
    prompt: "단톡에 “오늘 밥 ㄱ?”가 올라오면",
    choices: [
      { text: "어디? 바로 나감", scores: { extrovert: 3, spontaneous: 2 } },
      { text: "메뉴랑 시간부터 정하자고 함", scores: { planning: 3 } },
      { text: "이모지만 달고 눈치 봄", scores: { emotional: 2 } },
      { text: "배달이 이득이라고 계산함", scores: { realistic: 3 } },
    ],
  },
  {
    id: "q5",
    prompt: "여행 숙소 사진이 실제랑 다르면",
    choices: [
      { text: "일단 여기서 잠", scores: { spontaneous: 3 } },
      { text: "바로 다른 숙소 검색", scores: { planning: 3, realistic: 1 } },
      { text: "리뷰에 할 말 다 씀", scores: { emotional: 3 } },
      { text: "환불 규정부터 봄", scores: { realistic: 3, planning: 1 } },
    ],
  },
  {
    id: "q6",
    prompt: "주말에 약속이 하나도 없으면",
    choices: [
      { text: "아무나 불러서 나감", scores: { extrovert: 3, spontaneous: 2 } },
      { text: "밀린 일부터 정리함", scores: { planning: 3, realistic: 1 } },
      { text: "누가 연락 올 때까지 폰만 봄", scores: { emotional: 2 } },
      { text: "혼자 있는 게 이득이라 집에 있음", scores: { realistic: 2 } },
    ],
  },
  {
    id: "q7",
    prompt: "친구가 갑자기 퇴사한다고 하면",
    choices: [
      { text: "축하부터 함", scores: { emotional: 2, spontaneous: 2 } },
      { text: "다음 달 월세부터 물어봄", scores: { realistic: 3 } },
      { text: "왜 그렇게 됐는지 같이 열받음", scores: { emotional: 3 } },
      { text: "이력서 같이 보자고 함", scores: { planning: 3, realistic: 1 } },
    ],
  },
  {
    id: "q8",
    prompt: "카톡이 왔는데 할 말이 애매하면",
    choices: [
      { text: "보는 즉시 아무 말이나 보냄", scores: { spontaneous: 2, extrovert: 2 } },
      { text: "문장 다듬어서 보냄", scores: { planning: 3 } },
      { text: "감정 상하면 읽씹", scores: { emotional: 3 } },
      { text: "용건 아니면 나중에", scores: { realistic: 2 } },
    ],
  },
  {
    id: "q9",
    prompt: "같이 내기했는데 지면",
    choices: [
      { text: "한 판 더", scores: { spontaneous: 3, extrovert: 1 } },
      { text: "왜 졌는지 복기함", scores: { planning: 2, realistic: 2 } },
      { text: "말투부터 달아오름", scores: { emotional: 3 } },
      { text: "이 판은 접고 밥 먹자", scores: { realistic: 2, planning: 1 } },
    ],
  },
];

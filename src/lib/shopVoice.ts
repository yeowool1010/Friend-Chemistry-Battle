"use server";

import { completeJson } from "@/lib/completeJson";
import { localShopVoice, type ShopContract, type ShopMarket, type ShopVoice } from "@/lib/play";

type VoiceInput = {
  largeName: string;
  industry: string;
  place: string;
  dong: string;
  budget: number;
  pyeong: number;
};

const FIELDS = [
  "shopName",
  "offerName",
  "offerLabel",
  "hours",
  "placeNoun",
  "capacityLabel",
  "stockNoun",
  "stockUnit",
  "regularNoun",
  "openButton",
  "stockButton",
  "promoButton",
  "priceGroup",
  "priceLow",
  "priceMid",
  "priceHigh",
  "readyLine",
  "emptyLine",
  "stockDone",
  "promoDone",
  "salesDone",
] as const;

export async function draftShopVoice(input: VoiceInput): Promise<ShopVoice | null> {
  const text = await completeJson({
    prompt: promptOf(input),
    schemaName: "shop_voice",
    temperature: 0.4,
    maxOutputTokens: 1400,
    schema: {
      type: "OBJECT",
      properties: {
        ...Object.fromEntries(FIELDS.map((key) => [key, { type: "STRING" }])),
        capacity: { type: "INTEGER" },
        events: { type: "ARRAY", items: { type: "STRING" } },
      },
      required: [...FIELDS, "capacity", "events"],
    },
  });
  if (!text) return null;
  try {
    return readVoice(JSON.parse(text) as Record<string, unknown>, input);
  } catch {
    return null;
  }
}

function promptOf(input: VoiceInput): string {
  return [
    "창업 게임의 가게 세팅 문장만 만든다. 예산, 월세, 매출 숫자는 만들지 마라.",
    `대분류: ${input.largeName}`,
    `중분류: ${input.industry}`,
    `지역: ${input.place}`,
    `동: ${input.dong || "구 전체"}`,
    `예산: ${input.budget}만원, 평수: ${input.pyeong}평.`,
    "이 업종이 실제로 하는 일만 써라.",
    "대분류가 음식이 아니면 메뉴, 재료, 밥, 식당, 좌석, 점심, 손님 식사를 쓰지 마라.",
    "부동산이면 중개 사무소, 매물, 상담, 계약, 중개 보수만 써라.",
    "교육이면 강좌, 교재, 수강. 병원이나 의원이면 접수와 진료만 쓰고 치료 효과를 단정하지 마라.",
    "소매면 상품과 진열. 수리면 부품과 접수. 숙박이면 객실과 투숙.",
    "예술·스포츠면 이용과 회원. 시설관리·임대면 접수와 자재. 과학·기술이면 의뢰와 상담.",
    "shopName은 2자에서 8자 사이 한글 상호다. 지역 이름은 넣지 마라.",
    "offerLabel은 6자 이내의 짧은 제목이다. 예: 주력 매물, 대표 강좌, 대표 메뉴.",
    "offerName은 그 업종의 구체적 상품이나 일 하나다. 제목을 반복하지 마라.",
    "regularNoun은 곳 단위로 셀 수 있는 말이다. 예: 재상담, 단골, 회원, 재방문.",
    "stockUnit은 숫자 뒤에 붙는 단위다. 예: 건, 세트, 일치.",
    "hours는 09:00–18:00처럼 시작과 끝만 쓴다. capacity는 1에서 40이다.",
    "events는 7개다. 각 문장은 28자 이내이고, 그 업종에서 하루 수요가 변하는 상황이다.",
    "readyLine, emptyLine, stockDone, promoDone, salesDone에는 금액을 넣지 마라. 버튼 이름은 8자 이내다.",
  ].join("\n");
}

function readVoice(raw: Record<string, unknown>, input: VoiceInput): ShopVoice | null {
  const seed = hash(`${input.place}|${input.dong}|${input.industry}|${input.budget}`);
  const local = localShopVoice(input.largeName, input.industry, seed);
  const text = (key: (typeof FIELDS)[number], max: number) => clip(raw[key], max) || local[key];
  const events = Array.isArray(raw.events) ? raw.events.map((item) => clip(item, 28)).filter(Boolean) : [];
  while (events.length < 7) events.push(local.events[events.length] || local.events[0]);
  const capacity = Number(raw.capacity);
  const voice: ShopVoice = {
    shopName: text("shopName", 12),
    offerName: text("offerName", 16),
    offerLabel: text("offerLabel", 8),
    hours: /^\d{2}:\d{2}[–-]\d{2}:\d{2}$/.test(clip(raw.hours, 16)) ? clip(raw.hours, 16).replace("-", "–") : local.hours,
    placeNoun: text("placeNoun", 8),
    capacityLabel: text("capacityLabel", 12),
    capacity: Number.isFinite(capacity) ? Math.min(40, Math.max(1, Math.round(capacity))) : local.capacity,
    stockNoun: text("stockNoun", 12),
    stockUnit: text("stockUnit", 6),
    regularNoun: text("regularNoun", 8),
    openButton: text("openButton", 8),
    stockButton: text("stockButton", 8),
    promoButton: text("promoButton", 8),
    priceGroup: text("priceGroup", 8),
    priceLow: text("priceLow", 8),
    priceMid: text("priceMid", 8),
    priceHigh: text("priceHigh", 8),
    readyLine: text("readyLine", 40),
    emptyLine: text("emptyLine", 40),
    stockDone: text("stockDone", 24),
    promoDone: text("promoDone", 24),
    salesDone: text("salesDone", 28),
    events: events.slice(0, 7),
  };
  if (input.largeName !== "음식" && /메뉴|재료|백반|밥상|좌석|점심|식당/.test(JSON.stringify(voice))) return null;
  return voice;
}

export async function draftShopMarket(input: VoiceInput & { anchorRent: number; interior: number }): Promise<ShopMarket | null> {
  const anchor = Math.max(8, Math.round(input.anchorRent));
  const text = await completeJson({
    prompt: [
      "한국 상가 점포 시세만 만원 단위 숫자로 답한다.",
      `지역: ${input.place}`,
      `동: ${input.dong || "구 전체"}`,
      `업종: ${input.largeName} ${input.industry}`,
      `점포: ${input.pyeong}평, 예산: ${input.budget}만원, 인테리어: ${input.interior}만원.`,
      `이 지역 ${input.pyeong}평 상가의 월세 참고값은 ${anchor}만원이다. 아파트 주거 시세가 아니라 가게가 들어갈 상가 시세다.`,
      "monthlyRent는 그 참고값의 0.5배에서 2배 사이다.",
      "deposit는 월세 계약 보증금이고 월세의 5개월에서 20개월이다.",
      "jeonse는 전세 보증금이고 월세의 80개월에서 180개월이다.",
      "salePrice는 매매가이고 월세의 150개월에서 400개월이다.",
      "contract는 매매, 전세, 월세 중 하나다.",
      "인테리어를 낸 뒤 남은 돈으로 낼 수 있는 계약만 고른다. 매매가나 전세 보증금이 남은 돈보다 크면 월세를 고른다.",
    ].join("\n"),
    schemaName: "shop_market",
    temperature: 0.2,
    maxOutputTokens: 400,
    schema: {
      type: "OBJECT",
      properties: {
        contract: { type: "STRING", enum: ["매매", "전세", "월세"] },
        monthlyRent: { type: "INTEGER" },
        deposit: { type: "INTEGER" },
        jeonse: { type: "INTEGER" },
        salePrice: { type: "INTEGER" },
      },
      required: ["contract", "monthlyRent", "deposit", "jeonse", "salePrice"],
    },
  });
  if (!text) return null;
  try {
    return readMarket(JSON.parse(text) as Record<string, unknown>, anchor);
  } catch {
    return null;
  }
}

function readMarket(raw: Record<string, unknown>, anchor: number): ShopMarket {
  const monthlyRent = bound(raw.monthlyRent, Math.round(anchor * 0.5), anchor * 2, anchor);
  const deposit = bound(raw.deposit, monthlyRent * 5, monthlyRent * 20, monthlyRent * 10);
  const jeonse = bound(raw.jeonse, monthlyRent * 80, monthlyRent * 180, monthlyRent * 120);
  const salePrice = bound(raw.salePrice, monthlyRent * 150, monthlyRent * 400, monthlyRent * 250);
  const contract: ShopContract = raw.contract === "매매" || raw.contract === "전세" || raw.contract === "월세" ? raw.contract : "월세";
  return { contract, monthlyRent, deposit, jeonse, salePrice };
}

function bound(value: unknown, min: number, max: number, fallback: number): number {
  const amount = Math.round(Number(value));
  if (!Number.isFinite(amount) || amount <= 0) return fallback;
  return Math.min(max, Math.max(min, amount));
}

function clip(value: unknown, max: number): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function hash(text: string): number {
  let n = 0;
  for (let i = 0; i < text.length; i += 1) n = (n * 33 + text.charCodeAt(i)) >>> 0;
  return n;
}

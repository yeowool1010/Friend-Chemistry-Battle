"use server";

import { completeJson } from "@/lib/completeJson";
import { loadResidentPopulation, type ResidentPopulation } from "@/lib/resident";
import { readServerEnv } from "@/lib/serverEnv";

export type { ResidentPopulation };

export type StoreDong = {
  name: string;
  count: number;
};

export type StoreCount = {
  count: number;
  month: string;
  dongs: StoreDong[];
  focus: string | null;
  partial: boolean;
};

export type OpeningEnding = "hope" | "despair";

export type OpeningDraft = {
  area: string;
  prepare: string;
  operate: string;
  outcome: string;
  weeks: { permit: number; build: number; ready: number };
  interior: { construction: number; kitchen: number; hall: number; sign: number; reserve: number };
  equipment: string[];
  leaseChecks: string[];
  permits: string[];
  peak: string;
  season: string;
  sales: { low: number; mid: number; high: number };
  labor: number;
  variableRatio: number;
};

export type Enrichment = {
  stores: StoreCount | null;
};

export async function loadAreaResidents(signguCds: string[], dongCode?: string): Promise<ResidentPopulation | null> {
  return loadResidentPopulation(signguCds, dongCode);
}

export async function enrichSimulation(input: {
  signguCds: string[];
  indsLclsCd: string;
  indsMclsCd?: string;
  dongName?: string;
  peerDongs?: string[];
}): Promise<Enrichment> {
  const stores = await countStores(input);
  return { stores };
}

export async function draftOutcome(input: OutcomeInput): Promise<string | null> {
  const text = await completeJson({
    prompt: outcomePrompt(input),
    schemaName: "opening_outcome",
    temperature: 0.5,
    maxOutputTokens: 900,
    schema: { type: "OBJECT", properties: { outcome: { type: "STRING" } }, required: ["outcome"] },
  });
  if (!text) return null;
  try {
    const outcome = clip((JSON.parse(text) as { outcome?: string }).outcome, 800);
    return outcome || null;
  } catch {
    return null;
  }
}

export async function draftOpening(input: DraftInput): Promise<OpeningDraft | null> {
  const text = await completeJson({
    prompt: openingPrompt(input),
    schemaName: "opening_draft",
    temperature: 0.3,
    maxOutputTokens: 1400,
    schema: openingSchema,
  });
  if (!text) return null;
  try {
    return normalizeDraft(JSON.parse(text) as RawDraft);
  } catch {
    return null;
  }
}

async function countStores(input: { signguCds: string[]; indsLclsCd: string; indsMclsCd?: string; dongName?: string; peerDongs?: string[] }): Promise<StoreCount | null> {
  const key = readServerEnv("DATA_GO_KR_SERVICE_KEY");
  if (!key || input.signguCds.length === 0) return null;

  try {
    const areas = await Promise.all(input.signguCds.map((code) => listDongNames(key, code, input)));
    if (areas.every((area) => area === null)) return null;
    const loaded = areas.flatMap((area) => area ?? []);
    const counts = new Map<string, number>();
    let total = 0;
    let month = "";
    let partial = false;
    for (const area of loaded) {
      total += area.total;
      partial = partial || area.partial;
      month = area.month || month;
      for (const name of area.names) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    for (const name of input.peerDongs ?? []) {
      const trimmed = name.trim();
      if (trimmed && !counts.has(trimmed)) counts.set(trimmed, 0);
    }
    if (input.dongName && !counts.has(input.dongName)) counts.set(input.dongName, 0);
    const dongs = [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ko"));
    const focus = input.dongName ?? null;
    return { count: total, month, dongs, focus, partial };
  } catch {
    return null;
  }
}

async function listDongNames(
  key: string,
  signguCd: string,
  input: { indsLclsCd: string; indsMclsCd?: string },
): Promise<{ names: string[]; total: number; month: string; partial: boolean } | null> {
  const names: string[] = [];
  let total = 0;
  let month = "";
  let received = 0;

  for (let page = 1; page <= 8; page += 1) {
    const url = new URL("https://apis.data.go.kr/B553077/api/open/sdsc2/storeListInDong");
    url.searchParams.set("serviceKey", key);
    url.searchParams.set("type", "json");
    url.searchParams.set("divId", "signguCd");
    url.searchParams.set("key", signguCd);
    url.searchParams.set("indsLclsCd", input.indsLclsCd);
    if (input.indsMclsCd) url.searchParams.set("indsMclsCd", input.indsMclsCd);
    url.searchParams.set("pageNo", String(page));
    url.searchParams.set("numOfRows", "1000");

    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) return page === 1 ? null : { names, total, month, partial: true };
    const body = (await response.json()) as {
      header?: { resultCode?: string; stdrYm?: string };
      body?: { totalCount?: number; items?: { adongNm?: string }[] | { item?: { adongNm?: string } | { adongNm?: string }[] } };
    };
    if (body.header?.resultCode === "03") return page === 1 ? { names, total: 0, month, partial: false } : { names, total, month, partial: names.length < total };
    if (body.header?.resultCode !== "00" || typeof body.body?.totalCount !== "number") return page === 1 ? null : { names, total, month, partial: true };

    total = body.body.totalCount;
    month = body.header.stdrYm ?? month;
    const items = readItems(body.body.items);
    received += items.length;
    for (const item of items) {
      const name = item.adongNm?.trim();
      if (name) names.push(name);
    }
    if (items.length < 1000 || received >= total) return { names, total, month, partial: received < total };
  }

  return { names, total, month, partial: received < total };
}

function readItems(items: { adongNm?: string }[] | { item?: { adongNm?: string } | { adongNm?: string }[] } | undefined): { adongNm?: string }[] {
  if (!items) return [];
  if (Array.isArray(items)) return items;
  if (!items.item) return [];
  return Array.isArray(items.item) ? items.item : [items.item];
}

type OutcomeInput = {
  ending: OpeningEnding;
  hopeImpossible: boolean;
  industry: string;
  place: string;
  scope: string;
  budget: number;
  pyeong: number;
  interior: number;
  deposit: number;
  runway: number;
  rent: number | null;
  gap: number;
  storeCount: number | null;
  population: number | null;
  salesMid: number | null;
};

type DraftInput = {
  industry: string;
  place: string;
  budget: number;
  pyeong: number;
  interior: number;
  rent: number | null;
  storeCount: number | null;
  storeMedian: number | null;
  storeRatio: number | null;
  population: number | null;
  households: number | null;
  scope: string;
};

type RawDraft = {
  area?: string;
  prepare?: string;
  operate?: string;
  permitWeeks?: number;
  buildWeeks?: number;
  readyWeeks?: number;
  construction?: number;
  kitchen?: number;
  hall?: number;
  sign?: number;
  reserve?: number;
  equipment?: string[];
  leaseChecks?: string[];
  permits?: string[];
  peak?: string;
  season?: string;
  salesLow?: number;
  salesMid?: number;
  salesHigh?: number;
  labor?: number;
  variablePercent?: number;
};

const openingSchema = {
  type: "OBJECT",
  properties: {
    area: { type: "STRING" },
    prepare: { type: "STRING" },
    operate: { type: "STRING" },
    permitWeeks: { type: "INTEGER" },
    buildWeeks: { type: "INTEGER" },
    readyWeeks: { type: "INTEGER" },
    construction: { type: "INTEGER" },
    kitchen: { type: "INTEGER" },
    hall: { type: "INTEGER" },
    sign: { type: "INTEGER" },
    reserve: { type: "INTEGER" },
    equipment: { type: "ARRAY", items: { type: "STRING" } },
    leaseChecks: { type: "ARRAY", items: { type: "STRING" } },
    permits: { type: "ARRAY", items: { type: "STRING" } },
    peak: { type: "STRING" },
    season: { type: "STRING" },
    salesLow: { type: "INTEGER" },
    salesMid: { type: "INTEGER" },
    salesHigh: { type: "INTEGER" },
    labor: { type: "INTEGER" },
    variablePercent: { type: "INTEGER" },
  },
  required: [
    "area",
    "prepare",
    "operate",
    "permitWeeks",
    "buildWeeks",
    "readyWeeks",
    "construction",
    "kitchen",
    "hall",
    "sign",
    "reserve",
    "equipment",
    "leaseChecks",
    "permits",
    "peak",
    "season",
    "salesLow",
    "salesMid",
    "salesHigh",
    "labor",
    "variablePercent",
  ],
};

function openingPrompt(input: DraftInput): string {
  const lines = [
    `업종 ${input.industry}`,
    `지역 ${input.place}`,
    `범위 ${input.scope || "시군구 전체"}`,
    `예산 ${input.budget}만원`,
    `평수 ${input.pyeong}평`,
    `인테리어 총액 ${input.interior}만원`,
    input.rent == null ? "월세 계획 기준 없음" : `월세 ${input.rent}만원`,
    input.storeCount == null ? "같은 업종 점포 수 없음" : `같은 업종 점포 ${input.storeCount}곳`,
    input.storeMedian == null ? "행정동 중앙값 없음" : `점포 있는 행정동 중앙값 ${input.storeMedian}곳`,
    input.storeRatio == null ? "중앙값 대비 배수 없음" : `중앙값 대비 ${input.storeRatio.toFixed(1)}배`,
    input.population == null ? "주민등록 인구 없음" : `주민등록 ${input.population}명`,
    input.households == null ? "세대수 없음" : `세대 ${input.households}가구`,
  ];
  return `너는 소상공인 창업 계획을 대략 잡는 작성자다. 아래 공개 수치만 근거로 한국어 JSON을 만든다.
점포 수와 주민등록 인구가 있으면 월 매출 세 구간(만원)을 대략 잡아라. 점포당 배후 인구는 주민등록 인구를 같은 업종 점포 수로 나눈 값이다. 그 배후 가운데 일부만 손님이 된다고 보고, 업종에 맞는 객단가로 기준 매출을 정한 뒤 보수는 기준의 0.7배, 여유는 1.4배로 잡아라. 인구나 점포 수가 없으면 매출은 0으로 둬라.
인테리어 총액은 바꾸지 말고 공사, 주방, 홀, 간판, 예비비 비율만 나눠라. 다섯 숫자의 합은 100이다.
주 수, 집기, 계약 전 확인, 인허가는 그 업종에서 보통 필요한 항목으로 적어라. 수수료나 공식 시세는 만들지 마라. 성공이나 실패를 단정하지 마라. 한산, 보통, 붐빔은 쓰지 마라.
area, prepare, operate는 각 두 문장 이내다. 목록은 항목당 20자 이내, 최대 5개다.

입력:
${lines.join("\n")}`;
}

function outcomePrompt(input: OutcomeInput): string {
  const lines = [
    `업종 ${input.industry}`,
    `지역 ${input.place}`,
    `범위 ${input.scope || "시군구 전체"}`,
    `예산 ${input.budget}만원`,
    `평수 ${input.pyeong}평`,
    `인테리어에 배정된 돈 ${input.interior}만원`,
    `보증금 ${input.deposit}만원`,
    `운영비 3개월 ${input.runway}만원`,
    input.rent == null ? "월세 계획 기준 없음" : `월세 ${input.rent}만원`,
    `예산을 빼고 남는 돈 ${input.gap}만원`,
    input.storeCount == null ? "같은 업종 점포 수 없음" : `같은 업종 점포 ${input.storeCount}곳`,
    input.population == null ? "주민등록 인구 없음" : `주민등록 ${input.population}명`,
    input.salesMid == null ? "기준 매출 없음" : `이미 잡아 둔 기준 매출 ${input.salesMid}만원`,
  ];
  const task = input.hopeImpossible
    ? "희망편을 골랐지만 예산이 보증금과 3개월 운영비에도 못 미친다. 이 금액으로 가게를 열어 희망을 찾는 것은 불가능하다고 말하라. 현실적으로 가장 희망적인 길은 사업을 접고 회사에 취업하거나, 사업을 하지 않고 집에서 계속 쉬는 쪽이라고 둘 다 대안으로 써라. 예산, 보증금, 월세를 집어 재치 있게 풀어라. 사람을 깎아내리거나 자해를 암시하지 마라. 폐업률을 확정된 사실처럼 말하지 마라."
    : input.ending === "despair"
      ? "절망편이다. 같은 수치에서 손님이 적고 비용이 먼저 나가는 창업결과를 써라. 이미 잡아 둔 매출 숫자를 바꾸지 마라. 폐업률을 확정된 사실처럼 말하지 마라."
      : "희망편이다. 같은 수치에서 단골이 생기고 운영이 버티는 창업결과를 써라. 이미 잡아 둔 매출 숫자를 바꾸지 마라. 성공률을 확정된 사실처럼 말하지 마라.";
  return `너는 소상공인 창업결과만 쓰는 작성자다. outcome 하나만 한국어로 만든다.
${task}
여섯 문장에서 여덟 문장으로 쓰고, 빈 줄로 두 문단을 나눠라. 공식 시세나 카드 매출이라고 말하지 마라. 한산, 보통, 붐빔은 쓰지 마라.

입력:
${lines.join("\n")}`;
}

function normalizeDraft(raw: RawDraft): OpeningDraft | null {
  const area = clip(raw.area, 240);
  const prepare = clip(raw.prepare, 240);
  const operate = clip(raw.operate, 240);
  const peak = clip(raw.peak, 40);
  const season = clip(raw.season, 80);
  if (!area || !prepare || !operate || !peak || !season) return null;

  const sales = [bound(raw.salesLow, 0, 20000), bound(raw.salesMid, 0, 20000), bound(raw.salesHigh, 0, 20000)].sort((a, b) => a - b);
  const [low, mid, high] = sales[1] === 0 ? [0, 0, 0] : sales;
  return {
    area,
    prepare,
    operate,
    outcome: "",
    weeks: {
      permit: bound(raw.permitWeeks, 1, 12),
      build: bound(raw.buildWeeks, 1, 16),
      ready: bound(raw.readyWeeks, 1, 8),
    },
    interior: splitRatios([raw.construction, raw.kitchen, raw.hall, raw.sign, raw.reserve]),
    equipment: linesOf(raw.equipment),
    leaseChecks: linesOf(raw.leaseChecks),
    permits: linesOf(raw.permits),
    peak,
    season,
    sales: { low, mid, high },
    labor: mid === 0 ? 0 : bound(raw.labor, 0, mid),
    variableRatio: bound(raw.variablePercent, 10, 70) / 100,
  };
}

function splitRatios(values: Array<number | undefined>): OpeningDraft["interior"] {
  const clean = values.map((value) => bound(value, 0, 100));
  const sum = clean.reduce((total, value) => total + value, 0);
  const scaled = sum === 0 ? [35, 25, 20, 12, 8] : clean.map((value) => Math.round((value * 100) / sum));
  scaled[0] += 100 - scaled.reduce((total, value) => total + value, 0);
  const [construction, kitchen, hall, sign, reserve] = scaled;
  return { construction, kitchen, hall, sign, reserve };
}

function linesOf(values: string[] | undefined): string[] {
  if (!Array.isArray(values)) return [];
  return values.map((item) => clip(item, 40)).filter(Boolean).slice(0, 5);
}

function clip(value: string | undefined, max: number): string {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function bound(value: number | undefined, min: number, max: number): number {
  const number = Math.round(Number(value));
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

import type { ChatDraft } from "@/lib/savedChats";
import { formatMan } from "@/lib/simulate";

export type ShopVoice = {
  shopName: string;
  offerName: string;
  offerLabel: string;
  hours: string;
  placeNoun: string;
  capacityLabel: string;
  capacity: number;
  stockNoun: string;
  stockUnit: string;
  regularNoun: string;
  openButton: string;
  stockButton: string;
  promoButton: string;
  priceGroup: string;
  priceLow: string;
  priceMid: string;
  priceHigh: string;
  readyLine: string;
  emptyLine: string;
  stockDone: string;
  promoDone: string;
  salesDone: string;
  events: string[];
};

export type PlaySetup = {
  shopName: string;
  menuName: string;
  hours: string;
  seats: number;
  largeName: string;
  industry: string;
  place: string;
  dong: string;
  budget: number;
  cash: number;
  weeklyRent: number;
  dailySales: number;
  monthlyRent: number;
  monthlySales: number;
  population: number | null;
  storeCount: number | null;
  pyeong: number;
  interiorCost: number;
  contract: ShopContract;
  deposit: number;
  jeonse: number;
  salePrice: number;
  upfront: number;
  areaRent: number;
  voice: ShopVoice;
};

export type ShopContract = "매매" | "전세" | "월세";

export type ShopMarket = {
  contract: ShopContract;
  monthlyRent: number;
  deposit: number;
  jeonse: number;
  salePrice: number;
};

export type PriceLevel = "slim" | "fair" | "hearty";
export type DayAction = "open" | "stock" | "promo";

export type PlayDay = {
  month: number;
  cash: number;
  stock: number;
  regulars: number;
  price: PriceLevel;
  notes: string[];
  over: boolean;
  broke: boolean;
};

const KEY = "shop-play-setup";
const MONTHS = 60;
const START_YEAR = 2026;
const START_MONTH = 11;

export function buildPlaySetup(draft: ChatDraft): PlaySetup | null {
  const result = draft.result;
  const budget = draft.budget;
  if (!result || budget == null || budget <= 0 || !result.place) return null;
  const industry = result.industry.label;
  const largeName = result.industry.largeName;
  const dong = draft.residentLabel;
  const seed = hash(`${result.place}|${dong}|${industry}|${budget}`);
  const playedBudget = Math.min(Math.max(budget, 500), 100_000);
  const pyeong = Math.min(80, Math.max(5, Math.round(draft.pyeong ?? 15)));
  const interiorCost = Math.max(0, Math.round(result.split.interior));
  const monthlyRent = result.planned ? Math.max(8, Math.round(result.split.marketRent)) : Math.max(8, Math.round(playedBudget * 0.018));
  const salesMid = draft.plan?.sales.mid ?? 0;
  const monthlySales = Math.max(16, Math.round(monthlyRent * 2.25)) + (salesMid > 0 ? Math.round(Math.min(monthlyRent * 0.55, salesMid * 0.01)) : 0);
  const weeklyRent = Math.max(8, Math.round((monthlyRent * 7) / 30));
  const dailySales = Math.max(12, Math.round(monthlySales / 26));
  const voice = localShopVoice(largeName, industry, seed);
  const drafted: PlaySetup = {
    shopName: voice.shopName,
    menuName: voice.offerName,
    hours: voice.hours,
    seats: voice.capacity,
    largeName,
    industry,
    place: result.place,
    dong,
    budget: playedBudget,
    cash: 0,
    weeklyRent,
    dailySales,
    monthlyRent,
    monthlySales,
    population: draft.residents?.population ?? null,
    storeCount: draft.stores?.count ?? null,
    pyeong,
    interiorCost,
    contract: "월세",
    deposit: 0,
    jeonse: 0,
    salePrice: 0,
    upfront: 0,
    areaRent: monthlyRent,
    voice,
  };
  return applyShopMarket(drafted, fallbackMarket(monthlyRent));
}

export function fallbackMarket(monthlyRent: number): ShopMarket {
  const rent = Math.max(8, Math.round(monthlyRent));
  return { contract: "월세", monthlyRent: rent, deposit: rent * 10, jeonse: rent * 120, salePrice: rent * 250 };
}

export function applyShopMarket(setup: PlaySetup, market: ShopMarket): PlaySetup {
  const room = setup.budget - setup.interiorCost;
  let contract = market.contract;
  if (contract === "매매" && market.salePrice > room) contract = market.jeonse <= room ? "전세" : "월세";
  if (contract === "전세" && market.jeonse > room) contract = "월세";
  const upfront = contract === "매매" ? market.salePrice : contract === "전세" ? market.jeonse : market.deposit;
  const areaRent = market.monthlyRent;
  const previous = setup.areaRent || areaRent;
  const monthlySales = Math.max(16, Math.round(setup.monthlySales * (previous > 0 ? areaRent / previous : 1)));
  return {
    ...setup,
    contract,
    deposit: market.deposit,
    jeonse: market.jeonse,
    salePrice: market.salePrice,
    upfront,
    areaRent,
    monthlyRent: contract === "월세" ? areaRent : 0,
    monthlySales,
    cash: setup.budget - setup.interiorCost - upfront,
    weeklyRent: Math.max(8, Math.round((areaRent * 7) / 30)),
    dailySales: Math.max(12, Math.round(monthlySales / 26)),
  };
}

export function applyShopVoice(setup: PlaySetup, voice: ShopVoice): PlaySetup {
  return {
    ...setup,
    shopName: voice.shopName,
    menuName: voice.offerName,
    hours: voice.hours,
    seats: voice.capacity,
    voice,
  };
}

export function savePlaySetup(setup: PlaySetup) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(KEY, JSON.stringify(setup));
}

export function loadPlaySetup(): PlaySetup | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlaySetup;
    if (!parsed || typeof parsed.shopName !== "string" || typeof parsed.cash !== "number" || typeof parsed.place !== "string") return null;
    const withVoice = !parsed.voice || typeof parsed.voice.openButton !== "string" || !Array.isArray(parsed.voice.events)
      ? applyShopVoice(
          { ...parsed, largeName: parsed.largeName || "", industry: parsed.industry || "" },
          localShopVoice(parsed.largeName || "", parsed.industry || "", hash(`${parsed.place}|${parsed.dong}|${parsed.industry}|${parsed.budget}`)),
        )
      : parsed;
    return withContract(withMonths({ ...withVoice, interiorCost: typeof withVoice.interiorCost === "number" ? withVoice.interiorCost : 0 }));
  } catch {
    return null;
  }
}

export function freshWeek(setup: PlaySetup): PlayDay {
  const paid = setup.contract === "매매" ? `매매가 ${formatMan(setup.salePrice)}` : setup.contract === "전세" ? `전세 보증금 ${formatMan(setup.jeonse)}` : `월세 보증금 ${formatMan(setup.deposit)}`;
  const opened = setup.cash >= 0;
  return {
    month: 1,
    cash: setup.cash,
    stock: 2,
    regulars: 0,
    price: "fair",
    notes: [
      `${monthLabel(1)}부터 영업합니다. 최대 5년입니다.`,
      `인테리어 ${formatMan(setup.interiorCost)}과 ${paid}을 빼고 ${formatMan(setup.cash)}으로 시작합니다.`,
      setup.contract === "월세" ? `앞으로 매달 월세 ${formatMan(setup.monthlyRent)}을 냅니다.` : setup.contract === "전세" ? "전세 보증금은 이번에 한 번만 냅니다." : "매매대금은 이번에 한 번만 냅니다.",
      opened ? "" : "계약금이 예산을 넘어 가게를 열지 못했습니다.",
      `${setup.shopName}. ${setup.voice.readyLine}`,
    ].filter(Boolean),
    over: !opened,
    broke: !opened,
  };
}

export function stockCost(setup: PlaySetup): number {
  return Math.max(8, Math.round(setup.monthlySales * 0.35));
}

export function promoCost(setup: PlaySetup): number {
  return Math.max(6, Math.round(setup.monthlySales * 0.22));
}

export function monthLabel(month: number): string {
  const cursor = START_MONTH - 1 + Math.max(0, month - 1);
  const year = START_YEAR + Math.floor(cursor / 12);
  const monthOfYear = (cursor % 12) + 1;
  return `${year}년 ${monthOfYear}월`;
}

export function operatingYear(month: number): number {
  return Math.min(5, Math.max(1, Math.ceil(month / 12)));
}

export function setPlayPrice(setup: PlaySetup, current: PlayDay, price: PriceLevel): PlayDay {
  if (current.over || current.price === price) return current;
  const voice = setup.voice;
  const label = price === "slim" ? voice.priceLow : price === "hearty" ? voice.priceHigh : voice.priceMid;
  return { ...current, price, notes: [`${voice.priceGroup}을 ${label} 맞췄습니다.`, ...current.notes] };
}

export function playDay(setup: PlaySetup, current: PlayDay, action: DayAction): PlayDay {
  if (current.over) return current;
  const notes: string[] = [];
  const voice = setup.voice;
  const label = monthLabel(current.month);
  let { cash, stock, regulars } = current;
  if (action === "stock") {
    const cost = stockCost(setup);
    if (cash < cost) return note(current, `${voice.stockNoun}값 ${cost.toLocaleString("ko-KR")}만원이 부족합니다.`);
    cash -= cost;
    stock += 2;
    notes.push(`${voice.stockDone} ${cost.toLocaleString("ko-KR")}만원, ${voice.stockNoun} ${stock}${voice.stockUnit}.`);
  } else if (action === "promo") {
    const cost = promoCost(setup);
    if (cash < cost) return note(current, `홍보비 ${cost.toLocaleString("ko-KR")}만원이 부족합니다.`);
    cash -= cost;
    regulars += 1;
    notes.push(`${voice.promoDone} ${voice.regularNoun} ${regulars}곳.`);
  } else if (stock <= 0) {
    notes.push(voice.emptyLine);
  } else {
    stock -= 1;
    const event = monthEvent(setup, current.month);
    const priceMul = current.price === "slim" ? 0.8 : current.price === "hearty" ? 1.25 : 1;
    const demand = current.price === "slim" ? 1.15 : current.price === "hearty" ? 0.82 : 1;
    const sales = Math.max(0, Math.round(setup.monthlySales * priceMul * demand * (1 + regulars * 0.08) * event.factor));
    cash += sales;
    if (sales >= setup.monthlySales && regulars < 8) regulars += 1;
    notes.push(event.line);
    notes.push(`${voice.salesDone} ${sales.toLocaleString("ko-KR")}만원.`);
  }
  const rentBase = setup.areaRent || setup.monthlyRent;
  const upkeep = Math.max(2, Math.round(rentBase * 0.1));
  cash -= upkeep;
  notes.push(`공과금 ${upkeep.toLocaleString("ko-KR")}만원.`);
  if (setup.monthlyRent > 0) {
    cash -= setup.monthlyRent;
    notes.push(`이번 달 월세 ${formatMan(setup.monthlyRent)}을 냈습니다.`);
  }
  const broke = cash < 0;
  const last = current.month >= MONTHS;
  return {
    month: broke || last ? current.month : current.month + 1,
    cash,
    stock,
    regulars,
    price: current.price,
    notes: [label, ...notes, ...current.notes],
    over: broke || last,
    broke,
  };
}

export function endingLine(setup: PlaySetup, current: PlayDay): string {
  const where = setup.dong ? `${setup.place} ${setup.dong}` : setup.place;
  const shop = topic(setup.shopName);
  const when = monthLabel(current.month);
  const regular = setup.voice.regularNoun;
  if (current.broke && current.month < MONTHS) {
    return `${where} ${shop} ${when}에 통장이 바닥나 가게를 닫았습니다. 5년이 되기 전입니다.`;
  }
  if (current.broke) return `${where} ${shop} 5년째인 ${when}에 통장이 바닥나 가게를 닫았습니다.`;
  return `${where} ${shop} ${monthLabel(1)}부터 ${when}까지 5년을 영업했습니다. ${regular} ${current.regulars}곳이 남았고, 계속 문을 엽니다.`;
}

function topic(name: string): string {
  const last = name.charCodeAt(name.length - 1);
  const batchim = last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 !== 0;
  return `${name}${batchim ? "은" : "는"}`;
}

function note(current: PlayDay, line: string): PlayDay {
  return { ...current, notes: [line, ...current.notes] };
}

function withContract(setup: PlaySetup): PlaySetup {
  const contract = setup.contract === "매매" || setup.contract === "전세" || setup.contract === "월세" ? setup.contract : "월세";
  const areaRent = typeof setup.areaRent === "number" ? setup.areaRent : setup.monthlyRent;
  return {
    ...setup,
    contract,
    deposit: typeof setup.deposit === "number" ? setup.deposit : 0,
    jeonse: typeof setup.jeonse === "number" ? setup.jeonse : 0,
    salePrice: typeof setup.salePrice === "number" ? setup.salePrice : 0,
    upfront: typeof setup.upfront === "number" ? setup.upfront : 0,
    areaRent,
  };
}

function withMonths(setup: PlaySetup): PlaySetup {
  const monthlyRent = typeof setup.monthlyRent === "number"
    ? setup.monthlyRent
    : Math.max(8, Math.round((((setup.weeklyRent || 8) * 30) / 7)));
  const base = Math.max(16, Math.round(monthlyRent * 2.25));
  const monthlySales = typeof setup.monthlySales === "number"
    ? setup.monthlySales
    : Math.max(base, Math.round((setup.dailySales || 12) * 8));
  return { ...setup, monthlyRent, monthlySales };
}

function monthEvent(setup: PlaySetup, month: number): { factor: number; line: string } {
  const factors = [1, 0.7, 1.25, 0.85, 1.1, 0.75, 1.15];
  const index = (hash(`${setup.shopName}|${month}`) + month) % factors.length;
  const line = setup.voice.events[index] || setup.voice.events[0] || "이달은 평온합니다.";
  return { factor: factors[index], line };
}

type VoiceBase = Omit<ShopVoice, "shopName" | "offerName"> & { stems: string[]; tails: string[]; offers: string[] };

export function localShopVoice(largeName: string, industry: string, seed: number): ShopVoice {
  const base = voiceBase(largeName, industry);
  const shopName = `${base.stems[seed % base.stems.length]}${base.tails[Math.floor(seed / 7) % base.tails.length]}`.slice(0, 12);
  const offerName = base.offers[seed % base.offers.length];
  return {
    shopName,
    offerName,
    offerLabel: base.offerLabel,
    hours: base.hours,
    placeNoun: base.placeNoun,
    capacityLabel: base.capacityLabel,
    capacity: base.capacity,
    stockNoun: base.stockNoun,
    stockUnit: base.stockUnit,
    regularNoun: base.regularNoun,
    openButton: base.openButton,
    stockButton: base.stockButton,
    promoButton: base.promoButton,
    priceGroup: base.priceGroup,
    priceLow: base.priceLow,
    priceMid: base.priceMid,
    priceHigh: base.priceHigh,
    readyLine: base.readyLine,
    emptyLine: base.emptyLine,
    stockDone: base.stockDone,
    promoDone: base.promoDone,
    salesDone: base.salesDone,
    events: base.events,
  };
}

function voiceBase(largeName: string, industry: string): VoiceBase {
  const key = knownLarge(largeName) || guessLarge(industry);
  if (key === "음식") return foodVoice(industry);
  return VOICES[key] ?? VOICES["소매"];
}

function knownLarge(name: string): string {
  return VOICES[name] || name === "음식" ? name : "";
}

function guessLarge(industry: string): string {
  if (/부동산/.test(industry)) return "부동산";
  if (/교육|학원|강의/.test(industry)) return "교육";
  if (/병원|의원|보건/.test(industry)) return "보건의료";
  if (/숙박/.test(industry)) return "숙박";
  if (/수리|미용|이용|세탁|세차|장례/.test(industry)) return "수리·개인";
  if (/스포츠|오락|도서관|유원/.test(industry)) return "예술·스포츠";
  if (/임대|시설|청소|여행|조경|방제/.test(industry)) return "시설관리·임대";
  if (/광고|법무|회계|디자인|컨설팅|인쇄|사진|수의|세무/.test(industry)) return "과학·기술";
  if (/식|주점|카페|빵|커피/.test(industry)) return "음식";
  return "소매";
}

function foodVoice(industry: string): VoiceBase {
  const bar = /주점|호프/.test(industry);
  const cafe = /커피|카페|비알|제과|빵/.test(industry);
  const chinese = industry.includes("중식");
  const japanese = industry.includes("일식");
  return {
    stems: ["온기", "골목", "오늘", "이웃", "부뚜막"],
    tails: bar ? ["포차", "선술집"] : cafe ? ["다방", "카페"] : chinese ? ["반점", "루"] : japanese ? ["초밥", "우동"] : ["밥상", "식당"],
    offers: bar ? ["모둠전", "치킨"] : cafe ? ["핸드드립", "소금빵"] : chinese ? ["짜장면", "짬뽕"] : japanese ? ["초밥 세트", "우동"] : ["된장백반", "제육정식", "김치찌개"],
    offerLabel: "대표 메뉴",
    hours: bar ? "17:00–24:00" : cafe ? "08:00–20:00" : "11:00–21:00",
    placeNoun: "가게",
    capacityLabel: "좌석",
    capacity: 18,
    stockNoun: "재료",
    stockUnit: "일치",
    regularNoun: "단골",
    openButton: "문 열기",
    stockButton: "재료 들이기",
    promoButton: "골목 홍보",
    priceGroup: "가격",
    priceLow: "박하게",
    priceMid: "그대로",
    priceHigh: "푸짐하게",
    readyLine: "문을 열 준비를 마쳤습니다. 재료는 이틀치입니다.",
    emptyLine: "재료가 없어 문을 열지 못했습니다.",
    stockDone: "재료를 들였습니다.",
    promoDone: "골목에 전단을 돌렸습니다.",
    salesDone: "손님을 받고 매출이 들어왔습니다.",
    events: [
      "골목이 평온합니다.",
      "비가 와서 발걸음이 줄었습니다.",
      "근처 행사가 끝나 손님이 몰렸습니다.",
      "옆 가게가 할인 전단을 돌렸습니다.",
      "식사 시간이 길게 이어졌습니다.",
      "한낮이 한산했습니다.",
      "동네 모임 뒤 몇 팀이 들어왔습니다.",
    ],
  };
}

const VOICES: Record<string, VoiceBase> = {
  소매: {
    stems: ["골목", "이웃", "오늘", "첫집", "느린"],
    tails: ["상점", "마트", "가게"],
    offers: ["생활 상품", "동네 인기 상품", "기본 상품"],
    offerLabel: "주력 상품",
    hours: "10:00–21:00",
    placeNoun: "가게",
    capacityLabel: "진열",
    capacity: 12,
    stockNoun: "상품",
    stockUnit: "세트",
    regularNoun: "단골",
    openButton: "가게 열기",
    stockButton: "상품 채우기",
    promoButton: "전단 돌리기",
    priceGroup: "가격",
    priceLow: "싸게",
    priceMid: "그대로",
    priceHigh: "마진 있게",
    readyLine: "진열을 끝내고 상품을 이틀치 채워 두었습니다.",
    emptyLine: "팔 상품이 없어 가게를 열지 못했습니다.",
    stockDone: "상품을 채웠습니다.",
    promoDone: "골목에 전단을 돌렸습니다.",
    salesDone: "계산을 마치고 매출이 들어왔습니다.",
    events: ["골목이 평온합니다.", "비가 와 발걸음이 줄었습니다.", "근처 장날이 겹쳤습니다.", "옆 가게가 세일을 했습니다.", "퇴근 시간에 손님이 늘었습니다.", "한낮이 한산했습니다.", "동네 모임 뒤 몇 팀이 들렀습니다."],
  },
  "수리·개인": {
    stems: ["골목", "이웃", "오늘", "첫집", "정든"],
    tails: ["수리", "공방", "살롱"],
    offers: ["기본 수리", "출장 점검", "간단 손질"],
    offerLabel: "대표 작업",
    hours: "10:00–19:00",
    placeNoun: "가게",
    capacityLabel: "작업 자리",
    capacity: 4,
    stockNoun: "부품",
    stockUnit: "세트",
    regularNoun: "재방문",
    openButton: "접수 열기",
    stockButton: "부품 채우기",
    promoButton: "전단 돌리기",
    priceGroup: "요금",
    priceLow: "낮게",
    priceMid: "그대로",
    priceHigh: "넉넉히",
    readyLine: "작업 자리를 정리하고 부품을 이틀치 채워 두었습니다.",
    emptyLine: "부품이 없어 접수를 열지 못했습니다.",
    stockDone: "부품을 채웠습니다.",
    promoDone: "골목에 전단을 돌렸습니다.",
    salesDone: "작업을 마치고 요금이 들어왔습니다.",
    events: ["고장 문의가 몰렸습니다.", "부품이 늦어 접수가 줄었습니다.", "비 온 뒤 수리가 늘었습니다.", "같은 골목 업체가 전단을 돌렸습니다.", "오전 접수가 한산했습니다.", "단골 재방문이 있었습니다.", "주말 급수리가 들어왔습니다."],
  },
  "과학·기술": {
    stems: ["골목", "오늘", "첫집", "느린", "정든"],
    tails: ["작업실", "사무소", "스튜디오"],
    offers: ["소규모 의뢰", "단기 자문", "기본 제작"],
    offerLabel: "대표 의뢰",
    hours: "09:00–18:00",
    placeNoun: "사무소",
    capacityLabel: "상담 자리",
    capacity: 4,
    stockNoun: "작업 자료",
    stockUnit: "건",
    regularNoun: "재의뢰",
    openButton: "상담 열기",
    stockButton: "자료 정리",
    promoButton: "소개 돌리기",
    priceGroup: "수수료",
    priceLow: "낮게",
    priceMid: "그대로",
    priceHigh: "높게",
    readyLine: "상담 자리를 정리하고 작업 자료를 이틀치 준비했습니다.",
    emptyLine: "보여줄 자료가 없어 상담을 열지 못했습니다.",
    stockDone: "작업 자료를 정리했습니다.",
    promoDone: "주변에 소개를 돌렸습니다.",
    salesDone: "의뢰를 마치고 수수료가 들어왔습니다.",
    events: ["의뢰 문의가 들어왔습니다.", "제안 마감이 겹쳤습니다.", "미팅이 취소됐습니다.", "소개로 새 의뢰가 왔습니다.", "오전 통화가 한산했습니다.", "기존 거래처가 추가를 물었습니다.", "근처 행사 뒤 명함이 늘었습니다."],
  },
  교육: {
    stems: ["골목", "이웃", "오늘", "첫집", "느린"],
    tails: ["학원", "교실", "공부방"],
    offers: ["기초 강좌", "주중 수업", "단기 특강"],
    offerLabel: "대표 강좌",
    hours: "13:00–21:00",
    placeNoun: "학원",
    capacityLabel: "수강 자리",
    capacity: 12,
    stockNoun: "교재",
    stockUnit: "세트",
    regularNoun: "재수강",
    openButton: "수업 열기",
    stockButton: "교재 채우기",
    promoButton: "수강 홍보",
    priceGroup: "수강료",
    priceLow: "낮게",
    priceMid: "그대로",
    priceHigh: "높게",
    readyLine: "교실을 정리하고 교재를 이틀치 준비했습니다.",
    emptyLine: "교재가 없어 수업을 열지 못했습니다.",
    stockDone: "교재를 채웠습니다.",
    promoDone: "수강 안내를 돌렸습니다.",
    salesDone: "수업을 마치고 수강료가 들어왔습니다.",
    events: ["학기 시작이라 상담이 늘었습니다.", "시험 기간이라 문의가 줄었습니다.", "같은 골목 학원이 할인했습니다.", "학부모 모임이 있었습니다.", "비로 등원 발걸음이 줄었습니다.", "수강 후기가 퍼졌습니다.", "방학이라 한산했습니다."],
  },
  보건의료: {
    stems: ["골목", "이웃", "오늘", "첫집", "정든"],
    tails: ["의원", "클리닉", "보건"],
    offers: ["기본 진료", "예약 상담", "정기 방문"],
    offerLabel: "대표 진료",
    hours: "09:00–18:00",
    placeNoun: "의원",
    capacityLabel: "진료 자리",
    capacity: 6,
    stockNoun: "진료 소모품",
    stockUnit: "세트",
    regularNoun: "재방문",
    openButton: "접수 열기",
    stockButton: "소모품 채우기",
    promoButton: "안내문 돌리기",
    priceGroup: "진료비",
    priceLow: "낮게",
    priceMid: "그대로",
    priceHigh: "높게",
    readyLine: "접수 자리를 정리하고 소모품을 이틀치 채워 두었습니다.",
    emptyLine: "소모품이 없어 접수를 열지 못했습니다.",
    stockDone: "진료 소모품을 채웠습니다.",
    promoDone: "주변에 안내문을 돌렸습니다.",
    salesDone: "접수를 마치고 진료비가 들어왔습니다.",
    events: ["예약이 가득 찼습니다.", "비로 방문이 줄었습니다.", "근처 행사가 끝나 접수가 늘었습니다.", "대기 이야기가 퍼졌습니다.", "오전 접수가 한산했습니다.", "정기 방문이 이어졌습니다.", "문의가 평소보다 늘었습니다."],
  },
  부동산: {
    stems: ["골목", "이웃", "오늘", "첫집", "정든"],
    tails: ["공인", "중개", "부동산"],
    offers: ["전세 매물", "월세 매물", "상가 임대"],
    offerLabel: "주력 매물",
    hours: "09:00–18:00",
    placeNoun: "사무소",
    capacityLabel: "상담 자리",
    capacity: 4,
    stockNoun: "매물 자료",
    stockUnit: "건",
    regularNoun: "재상담",
    openButton: "상담 열기",
    stockButton: "매물 정리",
    promoButton: "매물 광고",
    priceGroup: "중개 보수",
    priceLow: "낮게",
    priceMid: "그대로",
    priceHigh: "높게",
    readyLine: "상담 자리를 정리하고 매물 자료를 이틀치 올려 두었습니다.",
    emptyLine: "보여줄 매물이 없어 상담을 열지 못했습니다.",
    stockDone: "매물 자료를 정리했습니다.",
    promoDone: "매물 광고를 돌렸습니다.",
    salesDone: "상담을 마치고 중개 보수가 들어왔습니다.",
    events: ["전세 문의가 몰렸습니다.", "집주인이 매물을 거뒀습니다.", "주말 방문이 늘었습니다.", "근처 입주가 시작됐습니다.", "시세 이야기가 퍼졌습니다.", "비가 와 현장 방문이 줄었습니다.", "계약 직전 변심이 나왔습니다."],
  },
  숙박: {
    stems: ["골목", "이웃", "오늘", "첫집", "느린"],
    tails: ["여관", "민박", "스테이"],
    offers: ["1인실", "2인실", "주말 객실"],
    offerLabel: "대표 객실",
    hours: "15:00–22:00",
    placeNoun: "숙소",
    capacityLabel: "객실",
    capacity: 8,
    stockNoun: "객실 비품",
    stockUnit: "세트",
    regularNoun: "재방문",
    openButton: "체크인 열기",
    stockButton: "비품 채우기",
    promoButton: "숙소 홍보",
    priceGroup: "숙박비",
    priceLow: "낮게",
    priceMid: "그대로",
    priceHigh: "높게",
    readyLine: "객실을 정리하고 비품을 이틀치 채워 두었습니다.",
    emptyLine: "비품이 없어 체크인을 열지 못했습니다.",
    stockDone: "객실 비품을 채웠습니다.",
    promoDone: "숙소 안내를 돌렸습니다.",
    salesDone: "체크인을 마치고 숙박비가 들어왔습니다.",
    events: ["연휴 예약이 들어왔습니다.", "비가 와 당일 예약이 줄었습니다.", "근처 행사가 끝나 방이 찼습니다.", "옆 숙소가 할인을 냈습니다.", "체크인이 한산했습니다.", "재방문 예약이 있었습니다.", "주말 손님이 늘었습니다."],
  },
  "시설관리·임대": {
    stems: ["골목", "이웃", "오늘", "첫집", "정든"],
    tails: ["관리", "대여", "서비스"],
    offers: ["정기 관리", "단기 대여", "현장 출동"],
    offerLabel: "대표 서비스",
    hours: "09:00–18:00",
    placeNoun: "사무실",
    capacityLabel: "접수 자리",
    capacity: 4,
    stockNoun: "작업 자재",
    stockUnit: "세트",
    regularNoun: "재계약",
    openButton: "접수 열기",
    stockButton: "자재 채우기",
    promoButton: "현장 홍보",
    priceGroup: "이용료",
    priceLow: "낮게",
    priceMid: "그대로",
    priceHigh: "높게",
    readyLine: "접수 자리를 정리하고 작업 자재를 이틀치 채워 두었습니다.",
    emptyLine: "작업 자재가 없어 접수를 열지 못했습니다.",
    stockDone: "작업 자재를 채웠습니다.",
    promoDone: "주변에 안내를 돌렸습니다.",
    salesDone: "현장 일을 마치고 이용료가 들어왔습니다.",
    events: ["현장 요청이 몰렸습니다.", "날씨가 나빠 일정이 밀렸습니다.", "입주 일정이 겹쳤습니다.", "같은 업체가 전단을 돌렸습니다.", "오전 요청이 한산했습니다.", "정기 계약이 이어졌습니다.", "급한 호출이 들어왔습니다."],
  },
  "예술·스포츠": {
    stems: ["골목", "이웃", "오늘", "첫집", "느린"],
    tails: ["클럽", "장", "홀"],
    offers: ["일일 이용", "기초 강습", "주말 회원"],
    offerLabel: "대표 이용",
    hours: "10:00–21:00",
    placeNoun: "시설",
    capacityLabel: "이용 자리",
    capacity: 16,
    stockNoun: "이용권",
    stockUnit: "장",
    regularNoun: "회원",
    openButton: "시설 열기",
    stockButton: "이용권 채우기",
    promoButton: "회원 홍보",
    priceGroup: "이용료",
    priceLow: "낮게",
    priceMid: "그대로",
    priceHigh: "높게",
    readyLine: "시설을 정리하고 이용권을 이틀치 준비했습니다.",
    emptyLine: "이용권이 없어 시설을 열지 못했습니다.",
    stockDone: "이용권을 채웠습니다.",
    promoDone: "회원 안내를 돌렸습니다.",
    salesDone: "이용을 마치고 이용료가 들어왔습니다.",
    events: ["주말 이용이 늘었습니다.", "비가 와 방문이 줄었습니다.", "근처 행사가 끝나 사람이 몰렸습니다.", "옆 시설이 할인을 냈습니다.", "평일 낮이 한산했습니다.", "회원 재방문이 있었습니다.", "모임 예약이 들어왔습니다."],
  },
};

function hash(text: string): number {
  let n = 0;
  for (let i = 0; i < text.length; i += 1) n = (n * 33 + text.charCodeAt(i)) >>> 0;
  return n;
}

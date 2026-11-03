import { DEPOSIT_MONTHS, DISTRICTS, INTERIOR_RATIO, RUNWAY_MONTHS, type District, type IndustryProfile, type Traffic } from "@/lib/catalog";
import { industryById, type Industry } from "@/lib/industries";

export type SimulationInput = {
  industryId: string;
  districtId: string | null;
  place: string;
  dongScope: boolean;
  budget: number;
  pyeong: number;
};

export type MoneySplit = {
  interior: number;
  deposit: number;
  runway: number;
  gap: number;
  marketRent: number;
};

export type Scenario = {
  label: string;
  sales: number;
  profit: number;
};

export type AreaFit = {
  district: District;
  marketRent: number;
  score: number;
  gap: number;
};

export type Simulation = {
  industry: Industry;
  area: AreaFit | null;
  place: string;
  dongScope: boolean;
  planned: boolean;
  alternatives: AreaFit[];
  recommended: boolean;
  split: MoneySplit;
  interiorParts: { label: string; amount: number }[];
  sales: IndustryProfile["sales"];
  burden: "여유" | "주의" | "큼";
  burdenRatio: number;
  competition: "한산" | "보통" | "붐빔";
  trafficLabel: string;
  scenarios: Scenario[];
  openWeeks: number;
};

const TRAFFIC_LABEL: Record<Traffic, string> = {
  high: "많음",
  mid: "보통",
  low: "한산",
};

export function simulate(input: SimulationInput): Simulation {
  const industry = industryById(input.industryId);
  const pyeong = clamp(finite(input.pyeong, 15), 5, 80);
  const budget = clamp(finite(input.budget, 5000), 500, 50000);
  const ranked = rankAreas(industry, budget, pyeong);
  const chosen = input.districtId === "recommend" ? ranked[0] : ranked.find((item) => item.district.id === input.districtId) ?? null;
  if (!chosen) return unplanned(industry, budget, input.place, input.dongScope);

  const alternatives = ranked.filter((item) => item.district.id !== chosen.district.id).slice(0, 2);
  const split = splitMoney(budget, chosen.marketRent);
  const sales = industry.profile ? scaleSales(industry.profile.sales, chosen.district.traffic) : { low: 0, mid: 0, high: 0 };
  const burdenRatio = sales.mid === 0 ? 0 : Math.round((chosen.marketRent / sales.mid) * 100);
  const saturation = saturationOf(industry, chosen.district);
  const recommended = input.districtId === "recommend";

  return {
    industry,
    area: chosen,
    place: recommended ? `${chosen.district.sido} ${chosen.district.name}` : input.place,
    dongScope: recommended ? false : input.dongScope,
    planned: true,
    alternatives,
    recommended,
    split,
    interiorParts: industry.profile ? interiorParts(industry.profile, split.interior) : [],
    sales,
    burden: burdenRatio >= 18 ? "큼" : burdenRatio >= 12 ? "주의" : "여유",
    burdenRatio,
    competition: saturation == null ? "보통" : saturation >= 70 ? "붐빔" : saturation >= 50 ? "보통" : "한산",
    trafficLabel: TRAFFIC_LABEL[chosen.district.traffic],
    scenarios: industry.profile ? scenarios(industry.profile, chosen.marketRent, sales) : [],
    openWeeks: industry.profile ? industry.profile.weeks.permit + industry.profile.weeks.build + industry.profile.weeks.ready : 0,
  };
}

function unplanned(industry: Industry, budget: number, place: string, dongScope: boolean): Simulation {
  const interior = Math.round(budget * INTERIOR_RATIO);
  return {
    industry,
    area: null,
    place,
    dongScope,
    planned: false,
    alternatives: [],
    recommended: false,
    split: { interior, deposit: 0, runway: 0, marketRent: 0, gap: 0 },
    interiorParts: industry.profile ? interiorParts(industry.profile, interior) : [],
    sales: industry.profile?.sales ?? { low: 0, mid: 0, high: 0 },
    burden: "여유",
    burdenRatio: 0,
    competition: "보통",
    trafficLabel: "",
    scenarios: [],
    openWeeks: industry.profile ? industry.profile.weeks.permit + industry.profile.weeks.build + industry.profile.weeks.ready : 0,
  };
}

export function formatManHangul(man: number): string {
  if (!Number.isFinite(man) || man <= 0) return "";
  const rounded = Math.round(man);
  const jo = Math.floor(rounded / 100_000_000);
  const eok = Math.floor((rounded % 100_000_000) / 10_000);
  const rest = rounded % 10_000;
  const parts = [
    jo ? `${readKorean(jo)}조` : "",
    eok ? `${readKorean(eok)}억` : "",
    rest ? `${readKorean(rest)}만` : "",
  ].filter(Boolean);
  return parts.length ? `${parts.join(" ")} 원` : "";
}

function readKorean(value: number): string {
  const digits = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
  const units = ["", "십", "백", "천"];
  return String(value)
    .split("")
    .map((char, index, chars) => {
      const digit = Number(char);
      if (digit === 0) return "";
      const unit = units[chars.length - 1 - index];
      return `${digit === 1 && unit ? "" : digits[digit]}${unit}`;
    })
    .join("");
}

export function formatMan(man: number): string {
  const sign = man < 0 ? "-" : "";
  const abs = Math.abs(Math.round(man));
  if (abs >= 10000) {
    const eok = Math.floor(abs / 10000);
    const rest = abs % 10000;
    return rest ? `${sign}${eok}억 ${rest.toLocaleString("ko-KR")}만원` : `${sign}${eok}억`;
  }
  return `${sign}${abs.toLocaleString("ko-KR")}만원`;
}

function rankAreas(industry: Industry, budget: number, pyeong: number): AreaFit[] {
  return DISTRICTS.map((district) => {
    const marketRent = district.rentPerPyeong * pyeong;
    const gap = moneyGap(budget, marketRent);
    const rentFit = gap >= 0 ? 40 : Math.max(0, 40 + (gap / budget) * 40);
    const traffic = district.traffic === "high" ? 30 : district.traffic === "mid" ? 20 : 10;
    const saturation = saturationOf(industry, district);
    const room = saturation == null ? 0 : Math.max(0, 30 - saturation * 0.3);
    return { district, marketRent, gap, score: rentFit + traffic + room };
  }).sort((a, b) => b.score - a.score);
}

/** 희망편을 쓸 수 없는 예산. 월세 기준이 있으면 보증금과 3개월 운영비보다 적고, 없으면 1,000만원 미만이다. */
export function hopeOutOfReach(budget: number, split: MoneySplit, planned: boolean): boolean {
  const lease = split.deposit + split.runway;
  if (planned && lease > 0) return budget < lease;
  return budget < 1000;
}

function splitMoney(budget: number, marketRent: number): MoneySplit {
  const interior = Math.round(budget * INTERIOR_RATIO);
  const deposit = marketRent * DEPOSIT_MONTHS;
  const runway = marketRent * RUNWAY_MONTHS;
  return { interior, deposit, runway, marketRent, gap: moneyGap(budget, marketRent) };
}

function moneyGap(budget: number, marketRent: number): number {
  const interior = Math.round(budget * INTERIOR_RATIO);
  return budget - interior - marketRent * DEPOSIT_MONTHS - marketRent * RUNWAY_MONTHS;
}

function scaleSales(sales: IndustryProfile["sales"], traffic: Traffic): IndustryProfile["sales"] {
  const factor = traffic === "high" ? 1.15 : traffic === "low" ? 0.85 : 1;
  return {
    low: Math.round(sales.low * factor),
    mid: Math.round(sales.mid * factor),
    high: Math.round(sales.high * factor),
  };
}

function interiorParts(profile: IndustryProfile, interior: number): { label: string; amount: number }[] {
  const parts = [
    ["공사", profile.interior.construction],
    ["주방·작업", profile.interior.kitchen],
    ["홀", profile.interior.hall],
    ["간판", profile.interior.sign],
    ["예비비", profile.interior.reserve],
  ] as const;
  return parts.map(([label, ratio]) => ({ label, amount: Math.round((interior * ratio) / 100) }));
}

function scenarios(profile: IndustryProfile, rent: number, sales: IndustryProfile["sales"]): Scenario[] {
  return [
    { label: "보수", sales: sales.low },
    { label: "기준", sales: sales.mid },
    { label: "여유", sales: sales.high },
  ].map((item) => ({
    ...item,
    profit: item.sales - rent - profile.labor - Math.round(item.sales * profile.variableRatio),
  }));
}

function saturationOf(industry: Industry, district: District): number | null {
  if (industry.group === "food") return district.foodSaturation;
  if (industry.group === "service") return district.serviceSaturation;
  if (industry.group === "retail") return Math.round((district.foodSaturation + district.serviceSaturation) / 2);
  return null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function finite(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.round(value) : fallback;
}

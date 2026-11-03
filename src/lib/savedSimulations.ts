import type { OpeningDraft, OpeningEnding, ResidentPopulation, StoreCount } from "@/lib/enrich";
import { formatMan, type Simulation } from "@/lib/simulate";

export type SavedSimulation = {
  id: string;
  savedAt: number;
  industryId: string;
  siName: string;
  guCode: string;
  dongCode: string;
  budget: string;
  pyeong: string;
  ending: OpeningEnding;
  residentLabel: string;
  result: Simulation;
  stores: StoreCount | null;
  residents: ResidentPopulation | null;
  plan: OpeningDraft | null;
};

const KEY = "shop-simulation-saves";
const LIMIT = 20;

export function savedSimulationId(item: Pick<SavedSimulation, "industryId" | "siName" | "guCode" | "dongCode" | "budget" | "pyeong" | "ending">): string {
  return [item.industryId, item.siName, item.guCode, item.dongCode, item.budget, item.pyeong, item.ending].join("|");
}

export function savedSimulationLabel(item: SavedSimulation): string {
  const when = new Date(item.savedAt);
  const stamp = `${when.getMonth() + 1}/${when.getDate()} ${String(when.getHours()).padStart(2, "0")}:${String(when.getMinutes()).padStart(2, "0")}`;
  const place = item.residentLabel ? `${item.result.place} ${item.residentLabel}` : item.result.place;
  const tone = item.ending === "hope" ? "희망편" : "절망편";
  return `${stamp} · ${item.result.industry.label} · ${place} · ${formatMan(Number(item.budget))} · ${item.pyeong}평 · ${tone}`;
}

export function loadSaved(): SavedSimulation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSaved).slice(0, LIMIT);
  } catch {
    return [];
  }
}

export function writeSaved(items: SavedSimulation[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, LIMIT)));
  } catch {
    /* 용량이 가득 차면 이번 저장만 건너뛴다. */
  }
}

export function clearSaved() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

export function upsertSaved(items: SavedSimulation[], next: SavedSimulation): SavedSimulation[] {
  return [next, ...items.filter((item) => item.id !== next.id)].slice(0, LIMIT);
}

export function sameSnapshot(a: SavedSimulation, b: SavedSimulation): boolean {
  return JSON.stringify(body(a)) === JSON.stringify(body(b));
}

function body(item: SavedSimulation) {
  return {
    industryId: item.industryId,
    siName: item.siName,
    guCode: item.guCode,
    dongCode: item.dongCode,
    budget: item.budget,
    pyeong: item.pyeong,
    ending: item.ending,
    residentLabel: item.residentLabel,
    result: item.result,
    stores: item.stores,
    residents: item.residents,
    plan: item.plan,
  };
}

function isSaved(value: unknown): value is SavedSimulation {
  if (!value || typeof value !== "object") return false;
  const item = value as SavedSimulation;
  return typeof item.id === "string" && typeof item.savedAt === "number" && (item.ending === "hope" || item.ending === "despair") && typeof item.result?.industry?.label === "string" && typeof item.result?.place === "string";
}

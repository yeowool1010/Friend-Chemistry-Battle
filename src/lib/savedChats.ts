import type { OpeningDraft, ResidentPopulation, StoreCount } from "@/lib/enrich";
import { formatMan, type Simulation } from "@/lib/simulate";

export type ChatChoice = { id: string; label: string };

export type ChatStep = "large" | "middle" | "si" | "gu" | "dong" | "before" | "budget" | "scenario" | "during" | "forecast" | "later" | "done";

export type ChatDraft = {
  largeCode: string;
  industryId: string;
  siName: string;
  guCode: string;
  dongCode: string;
  budget: number | null;
  result: Simulation | null;
  stores: StoreCount | null;
  residents: ResidentPopulation | null;
  residentLabel: string;
  plan: OpeningDraft | null;
};

type TextMessage = { id: string; role: "bot" | "user"; kind: "text"; text: string; pending?: boolean };
type ChoiceMessage = { id: string; role: "bot"; kind: "choices"; prompt: string; choices: ChatChoice[]; selectedId: string | null };
type BudgetMessage = { id: string; role: "bot"; kind: "budget"; prompt: string; value: string };
type BeforeMessage = {
  id: string;
  role: "bot";
  kind: "before";
  result: Simulation;
  stores: StoreCount | null;
  residents: ResidentPopulation | null;
  residentLabel: string;
  showMoney: boolean;
  area: string;
};
type DuringMessage = { id: string; role: "bot"; kind: "during"; result: Simulation; plan: OpeningDraft };
type LaterMessage = {
  id: string;
  role: "bot";
  kind: "later";
  result: Simulation;
  plan: OpeningDraft;
  stores?: StoreCount | null;
  residents?: ResidentPopulation | null;
};

export type ChatMessage = TextMessage | ChoiceMessage | BudgetMessage | BeforeMessage | DuringMessage | LaterMessage;

export type SavedChat = {
  id: string;
  savedAt: number;
  label: string;
  step: ChatStep;
  draft: ChatDraft;
  messages: ChatMessage[];
};

const KEY = "shop-chat-saves";
const LIMIT = 20;

export function emptyChatDraft(): ChatDraft {
  return {
    largeCode: "",
    industryId: "",
    siName: "",
    guCode: "",
    dongCode: "",
    budget: null,
    result: null,
    stores: null,
    residents: null,
    residentLabel: "",
    plan: null,
  };
}

export function chatLabel(draft: ChatDraft, savedAt: number): string {
  const when = new Date(savedAt);
  const stamp = `${when.getMonth() + 1}/${when.getDate()} ${String(when.getHours()).padStart(2, "0")}:${String(when.getMinutes()).padStart(2, "0")}`;
  const parts = [draft.result?.industry.label, draft.result?.place || draft.siName, draft.residentLabel, draft.budget == null ? "" : formatMan(draft.budget)].filter(Boolean);
  return `${stamp} · ${parts.join(" · ") || "대화"}`;
}

export function loadChats(): SavedChat[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedChat).slice(0, LIMIT);
  } catch {
    return [];
  }
}

export function writeChats(items: SavedChat[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, LIMIT)));
  } catch {
    /* 용량이 가득 차면 이번 저장만 건너뛴다. */
  }
}

export function rememberChat(items: SavedChat[], next: SavedChat): SavedChat[] {
  return [next, ...items].slice(0, LIMIT);
}

function isSavedChat(value: unknown): value is SavedChat {
  if (!value || typeof value !== "object") return false;
  const item = value as SavedChat;
  return typeof item.id === "string" && typeof item.savedAt === "number" && typeof item.step === "string" && Array.isArray(item.messages) && !!item.draft;
}

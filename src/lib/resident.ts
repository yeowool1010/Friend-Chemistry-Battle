import { readServerEnv } from "@/lib/serverEnv";

export type ResidentPopulation = {
  population: number;
  households: number;
  perHousehold: number;
  month: string;
  partial: boolean;
};

const ENDPOINT = "https://apis.data.go.kr/1741000/stdgPpltnHhStus/selectStdgPpltnHhStus";

type PopRow = {
  stdgCd?: string;
  admmCd?: string;
  totNmprCnt?: string;
  hhCnt?: string;
};

type Page = {
  rows: PopRow[];
  partial: boolean;
};

type DongSums = {
  byCode: Map<string, { population: number; households: number }>;
  partial: boolean;
};

const guCache = new Map<string, ResidentPopulation>();
const dongCache = new Map<string, DongSums | "empty">();

export async function loadResidentPopulation(signguCds: string[], dongCode?: string): Promise<ResidentPopulation | null> {
  const key = readServerEnv("DATA_GO_KR_SERVICE_KEY");
  if (!key) return null;
  const months = [previousMonth(1), previousMonth(2)];
  if (dongCode) return loadDong(key, dongCode, months);
  return loadGus(key, signguCds, months);
}

async function loadGus(serviceKey: string, signguCds: string[], months: string[]): Promise<ResidentPopulation | null> {
  const targets = [...new Set(signguCds.map(adminCode).filter(Boolean))];
  if (targets.length === 0) return null;

  for (const month of months) {
    const cacheKey = `${month}:${targets.slice().sort().join(",")}`;
    const saved = guCache.get(cacheKey);
    if (saved) return saved;

    const rows = await Promise.all(targets.map((code) => loadGu(serviceKey, code, month)));
    if (rows.every((row) => row === null)) continue;

    let population = 0;
    let households = 0;
    let partial = false;
    let hits = 0;
    for (const row of rows) {
      if (!row) {
        partial = true;
        continue;
      }
      hits += 1;
      population += row.population;
      households += row.households;
      partial = partial || row.partial;
    }
    if (hits === 0) continue;
    const loaded = pack(population, households, month, partial);
    guCache.set(cacheKey, loaded);
    return loaded;
  }
  return null;
}

async function loadGu(serviceKey: string, code: string, month: string): Promise<{ population: number; households: number; partial: boolean } | null> {
  const page = await fetchPages(serviceKey, { stdgCd: code, lv: "6" }, month);
  if (page === "fail" || page === "empty" || page.rows.length === 0) return null;
  const row = page.rows[0];
  return { population: countOf(row.totNmprCnt), households: countOf(row.hhCnt), partial: page.partial };
}

async function loadDong(serviceKey: string, dongCode: string, months: string[]): Promise<ResidentPopulation | null> {
  const parent = adminCode(dongCode.slice(0, 5));
  if (!parent) return null;

  for (const month of months) {
    const table = await loadDongTable(serviceKey, parent, month);
    if (table === null) continue;
    if (table === "empty") continue;
    const row = table.byCode.get(dongCode);
    if (!row) {
      if (table.partial) continue;
      return pack(0, 0, month, false);
    }
    return pack(row.population, row.households, month, table.partial);
  }
  return null;
}

async function loadDongTable(serviceKey: string, parent: string, month: string): Promise<DongSums | "empty" | null> {
  const cacheKey = `${parent}:${month}`;
  const saved = dongCache.get(cacheKey);
  if (saved) return saved;

  const legal = await fetchPages(serviceKey, { stdgCd: parent, lv: "3" }, month);
  if (legal === "fail") return null;
  if (legal === "empty" || legal.rows.length === 0) {
    dongCache.set(cacheKey, "empty");
    return "empty";
  }

  const pages = await mapPool(legal.rows, 3, (row) => (row.stdgCd ? fetchPages(serviceKey, { stdgCd: row.stdgCd, lv: "4" }, month) : Promise.resolve("fail" as const)));
  const byCode = new Map<string, { population: number; households: number }>();
  let partial = legal.partial;
  for (const page of pages) {
    if (page === "fail") {
      partial = true;
      continue;
    }
    if (page === "empty") continue;
    partial = partial || page.partial;
    for (const row of page.rows) {
      const id = row.admmCd ?? "";
      if (!id) continue;
      const current = byCode.get(id) ?? { population: 0, households: 0 };
      current.population += countOf(row.totNmprCnt);
      current.households += countOf(row.hhCnt);
      byCode.set(id, current);
    }
  }

  const table = { byCode, partial };
  if (!partial) dongCache.set(cacheKey, table);
  return table;
}

async function fetchPages(serviceKey: string, params: Record<string, string>, month: string): Promise<Page | "empty" | "fail"> {
  const rows: PopRow[] = [];
  let total = 0;

  for (let page = 1; page <= 20; page += 1) {
    const url = new URL(ENDPOINT);
    url.searchParams.set("serviceKey", serviceKey);
    url.searchParams.set("type", "JSON");
    url.searchParams.set("srchFrYm", month);
    url.searchParams.set("srchToYm", month);
    url.searchParams.set("numOfRows", "1000");
    url.searchParams.set("pageNo", String(page));
    for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);

    const body = await fetchJson(url);
    if (!body) return page === 1 ? "fail" : { rows, partial: true };
    const head = body.Response?.head;
    if (head?.resultCode === "3") return page === 1 ? "empty" : { rows, partial: false };
    if (head?.resultCode !== "0") return page === 1 ? "fail" : { rows, partial: true };
    total = Number(head.totalCount ?? 0);
    const item = body.Response?.items && typeof body.Response.items === "object" ? body.Response.items.item : undefined;
    const list = !item ? [] : Array.isArray(item) ? item : [item];
    rows.push(...list);
    if (rows.length >= total || list.length === 0) return { rows, partial: rows.length < total };
  }

  return { rows, partial: rows.length < total };
}

async function fetchJson(url: URL): Promise<{ Response?: { head?: { resultCode?: string; totalCount?: string }; items?: { item?: PopRow | PopRow[] } | "" } } | null> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
      const body = (await response.json()) as {
        OpenAPI_ServiceResponse?: unknown;
        Response?: { head?: { resultCode?: string; totalCount?: string }; items?: { item?: PopRow | PopRow[] } | "" };
      };
      if (response.ok && body.Response && !body.OpenAPI_ServiceResponse) return body;
    } catch {
      // 초당 호출 제한이나 일시 오류는 간격을 두고 다시 받는다.
    }
    await delay(400 * (attempt + 1));
  }
  return null;
}

async function mapPool<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return results;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pack(population: number, households: number, month: string, partial: boolean): ResidentPopulation {
  const perHousehold = households > 0 ? Math.round((population / households) * 100) / 100 : 0;
  return { population, households, perHousehold, month, partial };
}

function countOf(value: string | undefined): number {
  const count = Number(value ?? 0);
  return Number.isFinite(count) ? count : 0;
}

function adminCode(signguCd: string): string {
  const digits = signguCd.replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(0, 10);
  if (digits.length === 5) return `${digits}00000`;
  return "";
}

function previousMonth(offset: number): string {
  const [yearText, monthText] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit" }).format(new Date()).split("-");
  const date = new Date(Number(yearText), Number(monthText) - 1 - offset, 1);
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;
}

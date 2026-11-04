type StoreSnapshot = {
  count: number;
  month: string;
  dongs: { name: string; count: number }[];
  focus: string | null;
  partial: boolean;
};

export type LiveCompetition = {
  label: "한산" | "보통" | "붐빔";
  varied: boolean;
  count: number;
  median: number;
  ratio: number | null;
  densestName: string;
  densestCount: number;
  densestRatio: number | null;
  month: string;
  partial: boolean;
  emptyDongs: number;
};

/** 같은 업종이 있는 행정동 중앙값 대비. 0.7배 이하는 한산, 2배 이상은 붐빔. */
export function judgeCompetition(stores: StoreSnapshot): LiveCompetition | null {
  if (stores.dongs.length === 0) return null;
  const active = stores.dongs.filter((dong) => dong.count > 0);
  const median = medianOf((active.length > 0 ? active : stores.dongs).map((dong) => dong.count));
  const densest = active[0] ?? stores.dongs[0];
  const focus = stores.focus ? stores.dongs.find((dong) => dong.name === stores.focus) : null;
  const count = focus ? focus.count : stores.count;
  const ratio = focus ? versusMedian(focus.count, median) : null;
  const densestRatio = versusMedian(densest.count, median);

  return {
    label: crowdLabel(ratio ?? densestRatio, focus ? focus.count : densest.count),
    varied: !focus,
    count,
    median,
    ratio,
    densestName: densest.name,
    densestCount: densest.count,
    densestRatio,
    month: stores.month,
    partial: stores.partial,
    emptyDongs: stores.dongs.length - active.length,
  };
}

export type StoreFacts = {
  storeCount: number | null;
  storeMedian: number | null;
  storeRatio: number | null;
  districtStores: number | null;
  focusStores: number | null;
  distribution: string;
};

/** 차트에 나온 점포 분포. 선택 동이 0곳이어도 시군구 합계가 있으면 그 합계를 매출 기준으로 쓴다. */
export function describeStores(stores: StoreSnapshot | null): StoreFacts {
  if (!stores) {
    return { storeCount: null, storeMedian: null, storeRatio: null, districtStores: null, focusStores: null, distribution: "" };
  }
  const competition = judgeCompetition(stores);
  const focus = stores.focus ? stores.dongs.find((dong) => dong.name === stores.focus) : null;
  const focusStores = stores.focus ? (focus?.count ?? 0) : null;
  const basis = focusStores != null && focusStores > 0 ? focusStores : stores.count;
  const ranked = stores.dongs.filter((dong) => dong.count > 0).slice(0, 8);
  return {
    storeCount: basis,
    storeMedian: competition?.median ?? null,
    storeRatio: competition?.ratio ?? competition?.densestRatio ?? null,
    districtStores: stores.count,
    focusStores,
    distribution: ranked.map((dong) => `${dong.name} ${dong.count}곳`).join(", "),
  };
}

export function competitionDetail(live: LiveCompetition): string {
  const when = live.month ? `${live.month.slice(0, 4)}년 ${Number(live.month.slice(4))}월 상가정보` : "상가정보";
  const partial = live.partial ? " · 일부 업소" : "";
  const empty = live.emptyDongs > 0 ? ` · 점포 없는 행정동 ${live.emptyDongs.toLocaleString("ko-KR")}곳` : "";
  const median = live.median.toLocaleString("ko-KR");
  if (live.varied) {
    const crowded = live.densestRatio === null ? "다른 행정동에는 같은 업종이 없습니다" : `중앙값의 ${formatRatio(live.densestRatio)}배`;
    return `점포 있는 행정동 중앙값 ${median}곳 · 최다 ${live.densestName} ${live.densestCount.toLocaleString("ko-KR")}곳, 포화도 ${crowded} · ${when}${empty}${partial}`;
  }
  const saturation = live.ratio === null ? "다른 행정동에는 같은 업종이 없습니다" : `중앙값의 ${formatRatio(live.ratio)}배`;
  return `포화도 ${saturation} · 이 동 ${live.count.toLocaleString("ko-KR")}곳 · 행정동 중앙값 ${median}곳 · ${when}${empty}${partial}`;
}

function crowdLabel(ratio: number | null, count: number): LiveCompetition["label"] {
  if (ratio === null) return count > 0 ? "붐빔" : "한산";
  if (ratio >= 2) return "붐빔";
  if (ratio <= 0.7) return "한산";
  return "보통";
}

function versusMedian(count: number, median: number): number | null {
  if (median <= 0) return count > 0 ? null : 0;
  return count / median;
}

function formatRatio(ratio: number): string {
  return (Math.round(ratio * 10) / 10).toLocaleString("ko-KR", { maximumFractionDigits: 1 });
}

function medianOf(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

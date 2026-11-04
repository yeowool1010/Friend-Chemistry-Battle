"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cardClass, primaryButton, secondaryButton } from "@/components/buttons";
import { DEPOSIT_MONTHS, PLANNING_NOTE } from "@/lib/catalog";
import { competitionDetail, describeStores, judgeCompetition } from "@/lib/competition";
import { draftOpening, draftOutcome, enrichSimulation, loadAreaResidents, type OpeningDraft, type OpeningEnding, type ResidentPopulation, type StoreCount } from "@/lib/enrich";
import { INDUSTRY_GROUPS } from "@/lib/industries";
import { dongsInSigngu, planningDistrictId, REGIONS } from "@/lib/regions";
import { clearSaved, loadSaved, sameSnapshot, savedSimulationId, savedSimulationLabel, upsertSaved, writeSaved, type SavedSimulation } from "@/lib/savedSimulations";
import { applyShopMarket, applyShopVoice, buildPlaySetup, savePlaySetup } from "@/lib/play";
import { type ChatDraft } from "@/lib/savedChats";
import { draftShopMarket, draftShopVoice } from "@/lib/shopVoice";
import { formatMan, formatManHangul, hopeOutOfReach, simulate, type Simulation } from "@/lib/simulate";

export function Simulator() {
  const [largeCode, setLargeCode] = useState("I2");
  const [industryId, setIndustryId] = useState("I201");
  const [siName, setSiName] = useState("인천");
  const [guCode, setGuCode] = useState("28200");
  const [dongCode, setDongCode] = useState("");
  const [residentLabel, setResidentLabel] = useState("");
  const [budget, setBudget] = useState("5000");
  const [pyeong, setPyeong] = useState("15");
  const [result, setResult] = useState<Simulation | null>(null);
  const [stores, setStores] = useState<StoreCount | null>(null);
  const [residents, setResidents] = useState<ResidentPopulation | null>(null);
  const [residentPending, setResidentPending] = useState(false);
  const [ending, setEnding] = useState<OpeningEnding>("hope");
  const [shownEnding, setShownEnding] = useState<OpeningEnding>("hope");
  const [plan, setPlan] = useState<OpeningDraft | null>(null);
  const [planPending, setPlanPending] = useState(false);
  const [outcomePending, setOutcomePending] = useState(false);
  const [pending, setPending] = useState(false);
  const [saves, setSaves] = useState<SavedSimulation[]>([]);
  const [pickedSave, setPickedSave] = useState("");
  const [saveNote, setSaveNote] = useState("");
  const [playPending, setPlayPending] = useState(false);
  const router = useRouter();
  const runId = useRef(0);
  const basisRef = useRef("");
  const captured = useRef<Pick<SavedSimulation, "industryId" | "siName" | "guCode" | "dongCode" | "budget" | "pyeong" | "ending" | "residentLabel"> | null>(null);
  const recommending = siName === "recommend";
  const si = REGIONS.find((item) => item.name === siName);
  const gu = si?.gus.find((item) => item.code === guCode) ?? si?.gus[0];
  const large = INDUSTRY_GROUPS.find((item) => item.code === largeCode) ?? INDUSTRY_GROUPS[0];
  const industry = large.industries.find((item) => item.id === industryId) ?? large.industries[0];

  useEffect(() => {
    setSaves(loadSaved());
  }, []);

  const canSave = Boolean(result && plan && !pending && !planPending && !outcomePending && !residentPending);

  function keepResult() {
    const basis = captured.current ?? {
      industryId,
      siName,
      guCode: recommending ? "" : (gu?.code ?? guCode),
      dongCode: recommending ? "" : dongCode,
      budget: String(Number(budget.replace(/,/g, ""))),
      pyeong: String(Number(pyeong)),
      ending: shownEnding,
      residentLabel,
    };
    if (!result || !plan || !canSave) return;
    const next: SavedSimulation = {
      ...basis,
      id: savedSimulationId(basis),
      savedAt: Date.now(),
      result,
      stores,
      residents,
      plan,
    };
    setSaves((current) => {
      const previous = current.find((item) => item.id === next.id);
      if (previous && sameSnapshot(previous, next)) return current;
      const stored = upsertSaved(current, next);
      writeSaved(stored);
      return stored;
    });
    setPickedSave(next.id);
    setSaveNote("창업 중, 창업 후, 창업결과를 이 브라우저에 저장했습니다.");
  }

  function chooseLarge(code: string) {
    const next = INDUSTRY_GROUPS.find((item) => item.code === code);
    setLargeCode(code);
    setIndustryId(next?.industries[0]?.id ?? "");
  }

  function chooseSi(value: string) {
    setSiName(value);
    if (value === "recommend") return;
    const next = REGIONS.find((item) => item.name === value);
    setGuCode(next?.gus[0]?.code ?? "");
    setDongCode("");
  }

  function chooseGu(code: string) {
    setGuCode(code);
    setDongCode("");
  }

  function rollRandom() {
    const group = pick(INDUSTRY_GROUPS);
    const middle = pick(group.industries);
    const region = pick(REGIONS);
    const nextGu = pick(region.gus);
    const nextDong = pick(["", ...nextGu.dongs.map((item) => item.code)]);
    const nextEnding = pick(["hope", "despair"] as const);
    const nextBudget = String(500 + Math.floor(Math.random() * 496) * 100);
    const nextPyeong = String(5 + Math.floor(Math.random() * 76));
    setLargeCode(group.code);
    setIndustryId(middle.id);
    setSiName(region.name);
    setGuCode(nextGu.code);
    setDongCode(nextDong);
    setBudget(nextBudget);
    setPyeong(nextPyeong);
    setEnding(nextEnding);
    run({
      industryId: middle.id,
      siName: region.name,
      guCode: nextGu.code,
      dongCode: nextDong,
      budget: nextBudget,
      pyeong: nextPyeong,
      ending: nextEnding,
    });
  }

  function run(source?: { industryId: string; siName: string; guCode: string; dongCode: string; budget: string; pyeong: string; ending: OpeningEnding }) {
    const chosenIndustry = source?.industryId ?? industryId;
    const chosenSi = source?.siName ?? siName;
    const chosenGu = source?.guCode ?? guCode;
    const chosenDong = source?.dongCode ?? dongCode;
    const chosenBudget = source?.budget ?? budget;
    const chosenPyeong = source?.pyeong ?? pyeong;
    const chosenEnding = source?.ending ?? ending;
    const chosenRecommend = chosenSi === "recommend";
    const id = runId.current + 1;
    runId.current = id;
    const budgetValue = Number(chosenBudget.replace(/,/g, ""));
    const pyeongValue = Number(chosenPyeong);
    const savedGu = chosenRecommend ? "" : chosenGu;
    const savedDong = chosenRecommend ? "" : chosenDong;
    const selectedSi = REGIONS.find((item) => item.name === chosenSi);
    const selectedGu = selectedSi?.gus.find((item) => item.code === chosenGu) ?? selectedSi?.gus[0];
    const selectedDong = selectedGu?.dongs.find((dong) => dong.code === chosenDong);
    captured.current = {
      industryId: chosenIndustry,
      siName: chosenSi,
      guCode: savedGu,
      dongCode: savedDong,
      budget: String(budgetValue),
      pyeong: String(pyeongValue),
      ending: chosenEnding,
      residentLabel: chosenRecommend ? "" : (selectedDong?.name ?? ""),
    };
    const key = [chosenIndustry, chosenSi, savedGu, savedDong, budgetValue, pyeongValue].join("|");
    if (basisRef.current === key && plan && result) {
      const previousEnding = shownEnding;
      setShownEnding(chosenEnding);
      setSaveNote("");
      setOutcomePending(true);
      const facts = describeStores(stores);
      void draftOutcome({
        ending: chosenEnding,
        hopeImpossible: chosenEnding === "hope" && hopeOutOfReach(budgetValue, result.split, result.planned),
        industry: `${result.industry.largeName} ${result.industry.label}`,
        place: result.place,
        scope: residentLabel || "시군구 전체",
        budget: budgetValue,
        pyeong: pyeongValue,
        interior: result.split.interior,
        deposit: result.split.deposit,
        runway: result.split.runway,
        rent: result.planned ? result.split.marketRent : null,
        gap: result.split.gap,
        storeCount: facts.storeCount,
        districtStores: facts.districtStores,
        focusStores: facts.focusStores,
        distribution: facts.distribution,
        population: residents?.population ?? null,
        households: residents?.households ?? null,
        salesMid: plan.sales.mid > 0 ? plan.sales.mid : null,
      })
        .then((outcome) => {
          if (id !== runId.current) return;
          if (!outcome) {
            if (captured.current) captured.current.ending = previousEnding;
            setShownEnding(previousEnding);
            return;
          }
          setPlan((current) => (current ? { ...current, outcome } : current));
        })
        .finally(() => {
          if (id === runId.current) setOutcomePending(false);
        });
      return;
    }
    basisRef.current = key;
    setPickedSave("");
    setSaveNote("");
    const place = selectedSi && selectedGu ? `${selectedSi.name} ${selectedGu.name}` : "";
    const next = simulate({
      industryId: chosenIndustry,
      districtId: chosenRecommend || !selectedGu ? "recommend" : planningDistrictId(selectedGu.code),
      place,
      dongScope: false,
      budget: budgetValue,
      pyeong: pyeongValue,
    });
    setResult(next);
    setStores(null);
    setResidents(null);
    setResidentPending(true);
    setShownEnding(chosenEnding);
    setPlan(null);
    setPlanPending(true);
    setOutcomePending(true);
    setPending(true);
    const signguCds = chosenRecommend || !selectedGu ? (next.area?.district.signguCds ?? []) : [selectedGu.code];
    const pickedDong = chosenRecommend ? undefined : selectedDong;
    setResidentLabel(pickedDong?.name ?? "");
    const peopleTask = loadAreaResidents(signguCds, pickedDong?.code)
      .then((population) => {
        if (id === runId.current) setResidents(population);
        return population;
      })
      .finally(() => {
        if (id === runId.current) setResidentPending(false);
      });
    const storeTask = enrichSimulation({
      signguCds,
      indsLclsCd: next.industry.indsLclsCd,
      indsMclsCd: next.industry.indsMclsCd,
      dongName: pickedDong?.name,
      peerDongs: dongsInSigngu(signguCds),
    })
      .then((enrichment) => {
        if (id === runId.current) setStores(enrichment.stores);
        return enrichment.stores;
      })
      .finally(() => {
        if (id === runId.current) setPending(false);
      });
    void Promise.all([storeTask, peopleTask])
      .then(([stores, population]) => {
        const facts = describeStores(stores);
        return draftOpening({
          industry: `${next.industry.largeName} ${next.industry.label}`,
          place: next.place,
          budget: budgetValue,
          pyeong: pyeongValue,
          interior: next.split.interior,
          rent: next.planned ? next.split.marketRent : null,
          storeCount: facts.storeCount,
          storeMedian: facts.storeMedian,
          storeRatio: facts.storeRatio,
          districtStores: facts.districtStores,
          focusStores: facts.focusStores,
          distribution: facts.distribution,
          population: population?.population ?? null,
          households: population?.households ?? null,
          scope: pickedDong?.name || "시군구 전체",
        }).then((draft) => ({ draft, population, facts }));
      })
      .then((loaded) => {
        if (id !== runId.current) return null;
        if (!loaded?.draft) {
          setPlan(null);
          return null;
        }
        setPlan(loaded.draft);
        setPlanPending(false);
        return draftOutcome({
          ending: chosenEnding,
          hopeImpossible: chosenEnding === "hope" && hopeOutOfReach(budgetValue, next.split, next.planned),
          industry: `${next.industry.largeName} ${next.industry.label}`,
          place: next.place,
          scope: pickedDong?.name || "시군구 전체",
          budget: budgetValue,
          pyeong: pyeongValue,
          interior: next.split.interior,
          deposit: next.split.deposit,
          runway: next.split.runway,
          rent: next.planned ? next.split.marketRent : null,
          gap: next.split.gap,
          storeCount: loaded.facts.storeCount,
          districtStores: loaded.facts.districtStores,
          focusStores: loaded.facts.focusStores,
          distribution: loaded.facts.distribution,
          population: loaded.population?.population ?? null,
          households: loaded.population?.households ?? null,
          salesMid: loaded.draft.sales.mid > 0 ? loaded.draft.sales.mid : null,
        });
      })
      .then((outcome) => {
        if (id !== runId.current || outcome === null) return;
        setPlan((current) => (current ? { ...current, outcome } : current));
      })
      .finally(() => {
        if (id === runId.current) {
          setPlanPending(false);
          setOutcomePending(false);
        }
      });
  }

  function viewSaved(id: string) {
    const item = saves.find((entry) => entry.id === id);
    if (!item) {
      setPickedSave("");
      return;
    }
    runId.current += 1;
    captured.current = {
      industryId: item.industryId,
      siName: item.siName,
      guCode: item.guCode,
      dongCode: item.dongCode,
      budget: item.budget,
      pyeong: item.pyeong,
      ending: item.ending,
      residentLabel: item.residentLabel,
    };
    basisRef.current = [item.industryId, item.siName, item.guCode, item.dongCode, Number(item.budget), Number(item.pyeong)].join("|");
    setPickedSave(id);
    setLargeCode(item.result.industry.largeCode);
    setIndustryId(item.industryId);
    setSiName(item.siName);
    setGuCode(item.guCode);
    setDongCode(item.dongCode);
    setBudget(item.budget);
    setPyeong(item.pyeong);
    setEnding(item.ending);
    setShownEnding(item.ending);
    setResidentLabel(item.residentLabel);
    setResult(item.result);
    setStores(item.stores);
    setResidents(item.residents);
    setPlan(item.plan);
    setPending(false);
    setPlanPending(false);
    setOutcomePending(false);
    setResidentPending(false);
  }

  function currentDraft(): ChatDraft | null {
    const budgetValue = Number(budget.replace(/,/g, ""));
    const pyeongValue = Number(pyeong);
    if (!Number.isFinite(budgetValue) || budgetValue <= 0) return null;
    const chosenRecommend = siName === "recommend";
    const selectedDong = gu?.dongs.find((dong) => dong.code === dongCode);
    const place = si && gu ? `${si.name} ${gu.name}` : "";
    const savedGu = chosenRecommend ? "" : (gu?.code ?? "");
    const savedDong = chosenRecommend ? "" : dongCode;
    const key = [industryId, siName, savedGu, savedDong, budgetValue, Number.isFinite(pyeongValue) ? pyeongValue : 15].join("|");
    const same = basisRef.current === key && result != null;
    const next = same
      ? result
      : simulate({
          industryId,
          districtId: chosenRecommend || !gu ? "recommend" : planningDistrictId(gu.code),
          place,
          dongScope: false,
          budget: budgetValue,
          pyeong: Number.isFinite(pyeongValue) ? pyeongValue : 15,
        });
    return {
      largeCode,
      industryId,
      siName,
      guCode: savedGu,
      dongCode: savedDong,
      budget: budgetValue,
      result: next,
      stores: same ? stores : null,
      residents: same ? residents : null,
      residentLabel: chosenRecommend ? "" : (selectedDong?.name ?? ""),
      plan: same ? plan : null,
      pyeong: Number.isFinite(pyeongValue) ? pyeongValue : 15,
    };
  }

  async function startPlay() {
    const draft = currentDraft();
    const setup = draft ? buildPlaySetup(draft) : null;
    if (!setup || playPending) return;
    setPlayPending(true);
    try {
      const asked = {
        largeName: setup.largeName,
        industry: setup.industry,
        place: setup.place,
        dong: setup.dong,
        budget: setup.budget,
        pyeong: setup.pyeong,
      };
      const [voice, market] = await Promise.all([
        draftShopVoice(asked),
        draftShopMarket({ ...asked, anchorRent: setup.areaRent, interior: setup.interiorCost }),
      ]);
      const withVoice = voice ? applyShopVoice(setup, voice) : setup;
      savePlaySetup(market ? applyShopMarket(withVoice, market) : withVoice);
      router.push("/play");
    } catch {
      savePlaySetup(setup);
      router.push("/play");
    } finally {
      setPlayPending(false);
    }
  }

  function removeSaved() {
    clearSaved();
    setSaves([]);
    setPickedSave("");
  }

  return (
    <main className="flex flex-col gap-8 pb-16">
      <section className="max-w-xl">
        <p className="text-sm font-semibold text-b">소상공인 창업</p>
        <h1 className="mt-2 font-display text-5xl leading-tight">가게를 열기 전에 계산부터</h1>
        <p className="mt-4 text-lg leading-8">업종, 지역, 예산을 넣으면 자금이 어떻게 나뉘고 무엇을 준비해야 하는지 안내합니다.</p>
      </section>

      <form
        className={`${cardClass} flex flex-col gap-4 p-5 sm:p-6`}
        onSubmit={(event) => {
          event.preventDefault();
          run();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-semibold">
            대분류
            <select className={fieldClass} value={large.code} onChange={(event) => chooseLarge(event.target.value)}>
              {INDUSTRY_GROUPS.map((group) => (
                <option key={group.code} value={group.code}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold">
            중분류
            <select className={fieldClass} value={industry?.id ?? ""} onChange={(event) => setIndustryId(event.target.value)}>
              {large.industries.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm font-semibold">
            시·도
            <select className={fieldClass} value={siName} onChange={(event) => chooseSi(event.target.value)}>
              <option value="recommend">예산에 맞는 곳 추천</option>
              {REGIONS.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold">
            시·군·구
            {recommending ? (
              <select className={fieldClass} disabled value="">
                <option value="">추천 결과로 정해집니다</option>
              </select>
            ) : (
              <select className={fieldClass} value={gu?.code ?? ""} onChange={(event) => chooseGu(event.target.value)}>
                {si?.gus.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
            )}
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold">
            읍·면·동
            {recommending ? (
              <select className={fieldClass} disabled value="">
                <option value="">추천 결과로 정해집니다</option>
              </select>
            ) : (
              <select className={fieldClass} value={gu?.dongs.some((dong) => dong.code === dongCode) ? dongCode : ""} onChange={(event) => setDongCode(event.target.value)}>
                <option value="">전체</option>
                {gu?.dongs.map((dong) => (
                  <option key={dong.code} value={dong.code}>
                    {dong.name}
                  </option>
                ))}
              </select>
            )}
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-semibold">
          총예산 (만원)
          <input className={fieldClass} inputMode="numeric" min={500} value={budget} onChange={(event) => setBudget(event.target.value)} />
          <span className="text-sm font-normal text-muted">{formatManHangul(Number(budget.replace(/,/g, "")))}</span>
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold">
          예상 평수
          <input className={fieldClass} inputMode="numeric" min={5} value={pyeong} onChange={(event) => setPyeong(event.target.value)} />
        </label>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold">창업결과</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["hope", "despair"] as const).map((tone) => (
              <label key={tone} className={`flex h-12 cursor-pointer items-center justify-center border-2 border-ink text-sm font-semibold ${ending === tone ? "bg-ink text-paper" : "bg-paper"}`}>
                <input className="sr-only" type="radio" name="ending" value={tone} checked={ending === tone} onChange={() => setEnding(tone)} />
                {tone === "hope" ? "희망편" : "절망편"}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-wrap gap-3">
          <button type="submit" className={primaryButton}>
            이 조건으로 시뮬레이션
          </button>
          <button type="button" className={secondaryButton} onClick={rollRandom}>
            랜덤 창업 시뮬레이션
          </button>
          <button type="button" className={primaryButton} onClick={startPlay} disabled={playPending || !Number.isFinite(Number(budget.replace(/,/g, ""))) || Number(budget.replace(/,/g, "")) <= 0}>
            {playPending ? "지역 시세와 업종을 맞추는 중" : "이 조건으로 창업 시작하기"}
          </button>
        </div>
        <div className="flex flex-col gap-3 border-t-2 border-ink pt-4 sm:flex-row sm:items-end">
          <label className="flex min-w-0 flex-1 flex-col gap-2 text-sm font-semibold">
            저장한 계산
            <select className={fieldClass} value={saves.some((item) => item.id === pickedSave) ? pickedSave : ""} onChange={(event) => viewSaved(event.target.value)}>
              <option value="">계산을 고르면 그 결과를 봅니다</option>
              {saves.map((item) => (
                <option key={item.id} value={item.id}>
                  {savedSimulationLabel(item)}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className={secondaryButton} disabled={saves.length === 0} onClick={removeSaved}>
            로컬 데이터 삭제
          </button>
        </div>
        <p className="text-sm font-normal text-muted">저장은 이 결과 저장을 눌렀을 때만 이 브라우저에 남습니다. 같은 조건과 결말은 최신 결과로 바뀝니다.</p>
      </form>

      {result ? (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={secondaryButton} disabled={!canSave} onClick={keepResult}>
            이 결과 저장
          </button>
          <p className="text-sm text-muted">{saveNote || (canSave ? "창업 중, 창업 후, 창업결과를 저장합니다." : "창업 중, 창업 후, 창업결과가 정리된 뒤 저장할 수 있습니다.")}</p>
        </div>
      ) : null}
      {result ? <Result result={result} stores={stores} residents={residents} residentLabel={residentLabel} residentPending={residentPending} plan={plan} planPending={planPending} outcomePending={outcomePending} pending={pending} ending={shownEnding} /> : null}
    </main>
  );
}

function Result({
  result,
  stores,
  residents,
  residentLabel,
  residentPending,
  plan,
  planPending,
  outcomePending,
  pending,
  ending,
}: {
  result: Simulation;
  stores: StoreCount | null;
  residents: ResidentPopulation | null;
  residentLabel: string;
  residentPending: boolean;
  plan: OpeningDraft | null;
  planPending: boolean;
  outcomePending: boolean;
  pending: boolean;
  ending: OpeningEnding;
}) {
  const place = result.place;
  const note = baselineNote(result);
  const competition = stores ? judgeCompetition(stores) : null;
  const figures = plan ? figuresOf(plan, result.split.interior, result.planned ? result.split.marketRent : 0) : null;
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm leading-6 text-muted">{PLANNING_NOTE}</p>
      <section className="grid gap-3 sm:grid-cols-4">
        <Metric
          label="경쟁"
          value={competition ? (competition.varied ? "동별 차이" : competition.label) : "확인 안 됨"}
          detail={competition ? competitionDetail(competition) : undefined}
          pending={pending && !stores}
        />
        <Metric
          label="유동"
          value={residents ? `주민등록 ${residents.population.toLocaleString("ko-KR")}명` : residentPending ? "" : "확인 안 됨"}
          detail={
            residents
              ? `세대 ${residents.households.toLocaleString("ko-KR")} · 세대당 ${residents.perHousehold.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}명 · ${residents.month.slice(0, 4)}년 ${Number(residents.month.slice(4))}월${residentLabel ? ` · ${residentLabel}` : ""}${residents.partial ? " · 일부 통반" : ""}`
              : undefined
          }
          pending={residentPending && !residents}
        />
        <Metric
          label="임대 부담"
          value={figures && result.planned && plan && plan.sales.mid > 0 ? figures.burden : planPending ? "" : "기준 없음"}
          detail={figures && result.planned && plan && plan.sales.mid > 0 ? `대략 매출의 ${figures.burdenRatio}%` : undefined}
          pending={planPending && !plan}
        />
        <Metric label="인허가" value={plan ? `${plan.permits.length}건` : planPending ? "" : "확인 안 됨"} pending={planPending && !plan} />
      </section>

      <section className={`${cardClass} p-5 sm:p-6`}>
        <p className={`text-sm font-semibold ${ending === "hope" ? "text-b" : "text-a"}`}>창업결과 · {ending === "hope" ? "희망편" : "절망편"}</p>
        {outcomePending ? (
          <p className="mt-3 flex items-center gap-2 text-sm leading-6 text-muted" role="status">
            <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-muted border-t-ink" aria-hidden="true" />
            선택한 결말을 정리하는 중...
          </p>
        ) : plan?.outcome ? (
          <p className="mt-3 whitespace-pre-line text-sm leading-7">{plan.outcome}</p>
        ) : planPending ? (
          <p className="mt-3 flex items-center gap-2 text-sm leading-6 text-muted" role="status">
            <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-muted border-t-ink" aria-hidden="true" />
            선택한 결말을 정리하는 중...
          </p>
        ) : (
          <p className="mt-3 text-sm leading-7">창업결과를 정리하지 못했습니다. 다시 시뮬레이션해 주세요.</p>
        )}
      </section>

      <section className={`${cardClass} p-5 sm:p-6`}>
        <p className="text-sm font-semibold text-a">창업 전</p>
        <h2 className="mt-2 text-2xl font-semibold">
          {result.recommended ? "예산으로 본 후보" : "고른 지역"} · {place}
        </h2>
        {result.planned && result.area ? (
          <>
            <p className="mt-3 text-sm leading-7">
              {result.industry.label} {result.area.district.rentPerPyeong}만원/평 기준, {formatMan(result.split.marketRent)} 월세.
              {result.split.gap >= 0
                ? ` 인테리어와 보증금, 3개월 운영비를 빼면 ${formatMan(result.split.gap)}이 남습니다.`
                : ` 같은 항목을 채우려면 ${formatMan(Math.abs(result.split.gap))}이 더 필요합니다.`}
            </p>
            {note ? <p className="mt-2 text-sm leading-6 text-muted">{note}</p> : null}
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <Row term="인테리어" value={formatMan(result.split.interior)} />
              <Row term={`보증금 ${DEPOSIT_MONTHS}개월`} value={formatMan(result.split.deposit)} />
              <Row term="운영비 3개월" value={formatMan(result.split.runway)} />
              {plan && plan.sales.mid > 0 ? <Row term="대략 매출 구간" value={`${formatMan(plan.sales.low)} ~ ${formatMan(plan.sales.high)}`} /> : null}
            </dl>
          </>
        ) : (
          <p className="mt-3 text-sm leading-7">이 시군구는 월세 계획 기준이 없습니다. 경쟁과 포화도는 상가 점포 수로, 유동은 주민등록 인구로 조회합니다.</p>
        )}
        {pending && !stores ? (
          <p className="mt-4 flex items-center gap-2 text-sm leading-6 text-muted" role="status">
            <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-muted border-t-ink" aria-hidden="true" />
            실시간 점포 수 확인중...
          </p>
        ) : stores ? (
          <StoreChart stores={stores} place={place} industry={result.industry.label} />
        ) : (
          <p className="mt-4 text-sm leading-6 text-muted">상가 점포 수를 받지 못해 경쟁과 포화도를 계산하지 못했습니다.</p>
        )}
        {result.planned ? (
          <ul className="mt-4 flex flex-col gap-2 text-sm">
            {result.alternatives.map((item) => (
              <li key={item.district.id} className="border-2 border-ink bg-paper px-3 py-2">
                다른 후보 {item.district.sido} {item.district.name} · 월세 {formatMan(item.marketRent)} · {item.gap >= 0 ? "예산 안" : `${formatMan(Math.abs(item.gap))} 부족`}
              </li>
            ))}
          </ul>
        ) : null}
        {plan ? <p className="mt-4 text-sm leading-7">{plan.area}</p> : null}
        {planPending && !plan ? <p className="mt-4 text-sm text-muted">안내 문장을 정리하는 중</p> : null}
      </section>

      <section className={`${cardClass} p-5 sm:p-6`}>
        <p className="text-sm font-semibold text-b">창업 중</p>
        {plan && figures ? (
          <>
            <h2 className="mt-2 text-2xl font-semibold">오픈까지 약 {figures.weeks}주</h2>
            <p className="mt-3 text-sm leading-7">
              신고 {plan.weeks.permit}주, 공사 {plan.weeks.build}주, 집기와 오픈 준비 {plan.weeks.ready}주.
            </p>
            <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              {figures.parts.map((part) => (
                <li key={part.label} className="flex justify-between border-2 border-ink bg-paper px-3 py-2">
                  <span>{part.label}</span>
                  <span className="font-semibold">{formatMan(part.amount)}</span>
                </li>
              ))}
            </ul>
            {plan.equipment.length > 0 ? (
              <>
                <h3 className="mt-5 text-sm font-semibold">필수 집기</h3>
                <p className="mt-2 text-sm leading-7">{plan.equipment.join(" · ")}</p>
              </>
            ) : null}
            {plan.leaseChecks.length > 0 ? (
              <>
                <h3 className="mt-5 text-sm font-semibold">계약 전에 확인할 것</h3>
                <ul className="mt-2 list-disc pl-5 text-sm leading-7">
                  {plan.leaseChecks.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            ) : null}
            {plan.permits.length > 0 ? (
              <>
                <h3 className="mt-5 text-sm font-semibold">인허가</h3>
                <ul className="mt-2 list-disc pl-5 text-sm leading-7">
                  {plan.permits.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            ) : null}
            <p className="mt-4 text-sm leading-7">{plan.prepare}</p>
          </>
        ) : planPending ? (
          <p className="mt-3 flex items-center gap-2 text-sm leading-6 text-muted" role="status">
            <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-muted border-t-ink" aria-hidden="true" />
            점포 수와 주민등록 인구로 대략 계산 중...
          </p>
        ) : (
          <p className="mt-3 text-sm leading-7">창업 중 계획을 정리하지 못했습니다. 다시 시뮬레이션해 주세요.</p>
        )}
      </section>

      <section className={`${cardClass} p-5 sm:p-6`}>
        <p className="text-sm font-semibold text-gold">창업 후</p>
        {plan && figures ? (
          <>
            <h2 className="mt-2 text-2xl font-semibold">사람이 모이는 때 · {plan.peak}</h2>
            <p className="mt-3 text-sm leading-7">{plan.season}</p>
            {plan.sales.mid > 0 ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {figures.scenarios.map((item) => (
                  <article key={item.label} className="border-2 border-ink bg-paper p-3 text-sm">
                    <p className="font-semibold">{item.label}</p>
                    <p className="mt-2">매출 {formatMan(item.sales)}</p>
                    {result.planned ? <p className="mt-1">남는 돈 {formatMan(item.profit)}</p> : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-muted">
                {stores || residents ? "조회된 주민등록과 점포 분포는 있습니다. 매출 구간만 만들지 못했습니다." : "점포 수나 주민등록 인구가 없어 매출 구간은 비워 둡니다."}
              </p>
            )}
            {result.planned && plan.sales.mid > 0 ? <p className="mt-3 text-xs leading-5 text-muted">남는 돈은 대략 매출에서 월세, 인건비, 재료·변동비를 뺀 값입니다. 공식 카드 매출이 아닙니다.</p> : null}
            {!result.planned && plan.sales.mid > 0 ? <p className="mt-3 text-sm leading-6 text-muted">이 시군구는 월세 계획 기준이 없어 남는 돈은 계산하지 않습니다.</p> : null}
            <p className="mt-4 text-sm leading-7">{plan.operate}</p>
          </>
        ) : planPending ? (
          <p className="mt-3 flex items-center gap-2 text-sm leading-6 text-muted" role="status">
            <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-muted border-t-ink" aria-hidden="true" />
            점포 수와 주민등록 인구로 대략 계산 중...
          </p>
        ) : (
          <p className="mt-3 text-sm leading-7">창업 후 계획을 정리하지 못했습니다. 다시 시뮬레이션해 주세요.</p>
        )}
      </section>
    </div>
  );
}

function StoreChart({ stores, place, industry }: { stores: StoreCount; place: string; industry: string }) {
  const rows = stores.dongs.filter((dong) => dong.count > 0 || dong.name === stores.focus);
  const top = rows.slice(0, 10);
  const rest = rows.slice(10);
  const max = top[0]?.count || 1;
  const month = stores.month ? `${stores.month.slice(0, 4)}년 ${stores.month.slice(4)}월 기준` : "";
  return (
    <figure className="mt-4">
      <figcaption className="text-sm leading-6">
        {place} {industry} {stores.count.toLocaleString("ko-KR")}곳{month ? ` · ${month}` : ""}. 행정동 상위 10곳입니다.
        {stores.focus ? ` 선택한 곳은 ${stores.focus}입니다.` : ""}
        {stores.partial ? " 일부 업소만 받아 순서가 달라질 수 있습니다." : ""}
      </figcaption>
      <ol className="mt-3 flex flex-col gap-2">
        {top.map((dong) => {
          const picked = dong.name === stores.focus;
          return (
            <li key={dong.name} className="grid grid-cols-[7.5rem_minmax(0,1fr)_4.2rem] items-center gap-2 text-sm" aria-current={picked ? "true" : undefined}>
              <span className="flex min-w-0 items-center gap-1">
                <span className={`truncate ${picked ? "font-semibold text-a" : ""}`}>{dong.name}</span>
                {picked ? <span className="shrink-0 text-xs font-semibold text-a">선택</span> : null}
              </span>
              <span className={`h-3 border-2 bg-paper ${picked ? "border-a" : "border-ink"}`}>
                <span className={`block h-full ${picked ? "bg-a" : "bg-b"}`} style={{ width: `${Math.max(4, Math.round((dong.count / max) * 100))}%` }} />
              </span>
              <span className={`text-right font-semibold ${picked ? "text-a" : ""}`}>{dong.count.toLocaleString("ko-KR")}곳</span>
            </li>
          );
        })}
      </ol>
      {rest.length > 0 ? (
        <p className="mt-3 text-sm leading-6 text-muted">
          그 외{" "}
          {rest.map((dong, index) => {
            const picked = dong.name === stores.focus;
            const text = `${dong.name} ${dong.count.toLocaleString("ko-KR")}곳${picked ? " 선택" : ""}`;
            return (
              <span key={dong.name}>
                {index > 0 ? ", " : ""}
                <span className={picked ? "font-semibold text-a" : undefined}>{text}</span>
              </span>
            );
          })}
        </p>
      ) : null}
    </figure>
  );
}

function Metric({ label, value, detail, pending = false }: { label: string; value: string; detail?: string; pending?: boolean }) {
  return (
    <article className={`${cardClass} p-4`}>
      <p className="text-xs font-semibold text-muted">{label}</p>
      {pending ? (
        <p className="mt-2 flex items-center gap-2 text-sm text-muted" role="status">
          <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-muted border-t-ink" aria-hidden="true" />
          확인중...
        </p>
      ) : (
        <p className="mt-2 text-2xl font-semibold leading-tight">{value}</p>
      )}
      {detail && !pending ? <p className="mt-1 text-xs leading-5 text-muted">{detail}</p> : null}
    </article>
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-2 border-ink bg-paper px-3 py-2">
      <dt>{term}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

function figuresOf(plan: OpeningDraft, interior: number, rent: number) {
  const ratios = [plan.interior.construction, plan.interior.kitchen, plan.interior.hall, plan.interior.sign, plan.interior.reserve];
  const labels = ["공사", "주방·작업", "홀", "간판", "예비비"];
  const parts = labels.map((label, index) => ({ label, amount: Math.round((interior * ratios[index]) / 100) }));
  const scenarios = [
    { label: "보수", sales: plan.sales.low },
    { label: "기준", sales: plan.sales.mid },
    { label: "여유", sales: plan.sales.high },
  ].map((item) => ({
    ...item,
    profit: item.sales - rent - plan.labor - Math.round(item.sales * plan.variableRatio),
  }));
  const burdenRatio = plan.sales.mid > 0 && rent > 0 ? Math.round((rent / plan.sales.mid) * 100) : 0;
  return {
    parts,
    scenarios,
    weeks: plan.weeks.permit + plan.weeks.build + plan.weeks.ready,
    burdenRatio,
    burden: burdenRatio >= 18 ? "큼" : burdenRatio >= 12 ? "주의" : "여유",
  };
}

function baselineNote(result: Simulation): string | null {
  if (!result.planned || !result.area) return null;
  const broad = result.area.district.signguCds.length > 1;
  if (result.dongScope && broad) return `월세와 매출은 ${result.area.district.name} 계획 기준입니다.`;
  if (result.dongScope) return "월세와 매출은 구 전체 계획 기준입니다.";
  if (broad) return `월세와 매출은 ${result.area.district.name} 계획 기준입니다.`;
  return null;
}

const fieldClass = "h-12 border-2 border-ink bg-paper px-3 text-base font-normal outline-none";

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

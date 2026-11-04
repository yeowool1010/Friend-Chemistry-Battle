"use client";

import { useEffect, useRef, useState } from "react";
import { cardClass, secondaryButton } from "@/components/buttons";
import { DEPOSIT_MONTHS } from "@/lib/catalog";
import { competitionDetail, describeStores, judgeCompetition } from "@/lib/competition";
import { draftOpening, draftOutcome, enrichSimulation, loadAreaResidents, type OpeningDraft, type ResidentPopulation, type StoreCount } from "@/lib/enrich";
import { INDUSTRY_GROUPS, industryById } from "@/lib/industries";
import { dongsInSigngu, planningDistrictId, REGIONS } from "@/lib/regions";
import { chatLabel, emptyChatDraft, loadChats, rememberChat, writeChats, type ChatChoice, type ChatDraft, type ChatMessage, type ChatStep, type SavedChat } from "@/lib/savedChats";
import { formatMan, formatManHangul, hopeOutOfReach, simulate, type Simulation } from "@/lib/simulate";

const PYEONG = 15;
const YES_NO: ChatChoice[] = [
  { id: "yes", label: "네" },
  { id: "no", label: "아니오" },
];

export function Conversation() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [saves, setSaves] = useState<SavedChat[]>([]);
  const [picked, setPicked] = useState("");
  const [saveNote, setSaveNote] = useState("");
  const [step, setStep] = useState<ChatStep>("large");
  const draftRef = useRef<ChatDraft>(emptyChatDraft());
  const stepRef = useRef<ChatStep>("large");
  const generation = useRef(0);
  const answered = useRef(new Set<string>());
  const seq = useRef(0);
  const started = useRef(false);
  const topRef = useRef<HTMLDivElement>(null);

  function nextId() {
    seq.current += 1;
    return `c${seq.current}`;
  }

  function go(next: ChatStep) {
    stepRef.current = next;
    setStep(next);
  }

  function commit(next: ChatDraft) {
    draftRef.current = next;
  }

  function choice(prompt: string, choices: ChatChoice[]): ChatMessage {
    return { id: nextId(), role: "bot", kind: "choices", prompt, choices, selectedId: null };
  }

  function userLine(text: string): ChatMessage {
    return { id: nextId(), role: "user", kind: "text", text };
  }

  function shownDraft(picked: ChatDraft, list: ChatMessage[]): ChatDraft {
    const before = [...list].reverse().find((item) => item.kind === "before");
    if (!before || before.kind !== "before") return picked;
    return {
      ...picked,
      result: picked.result ?? before.result,
      stores: picked.stores ?? before.stores,
      residents: picked.residents ?? before.residents,
      residentLabel: picked.residentLabel || before.residentLabel,
    };
  }

  function begin() {
    generation.current += 1;
    answered.current = new Set();
    const fresh = emptyChatDraft();
    commit(fresh);
    go("large");
    setPicked("");
    setSaveNote("");
    setMessages([choice("대분류를 골라 주세요.", INDUSTRY_GROUPS.map((group) => ({ id: group.code, label: group.name })))]);
  }

  function openSaved(item: SavedChat) {
    generation.current += 1;
    commit(item.draft);
    go(item.step);
    answered.current = new Set(item.messages.filter((message) => message.kind === "choices" && message.selectedId).map((message) => message.id));
    setMessages(item.messages);
    setPicked(item.id);
    setSaveNote("");
  }

  function keep() {
    const savedAt = Date.now();
    const next: SavedChat = {
      id: `chat-${savedAt}`,
      savedAt,
      label: chatLabel(draftRef.current, savedAt),
      step: stepRef.current,
      draft: draftRef.current,
      messages,
    };
    setSaves((current) => {
      const stored = rememberChat(current, next);
      writeChats(stored);
      return stored;
    });
    setPicked(next.id);
    setSaveNote("이 대화를 이 브라우저에 저장했습니다.");
  }

  useEffect(() => {
    setSaves(loadChats());
    if (started.current) return;
    started.current = true;
    begin();
  }, []);

  useEffect(() => {
    topRef.current?.scrollIntoView({ block: "start" });
  }, [messages, step]);

  function onPick(messageId: string, choiceId: string) {
    if (answered.current.has(messageId)) return;
    const message = messages.find((item) => item.id === messageId);
    if (!message || message.kind !== "choices" || message.selectedId) return;
    const option = message.choices.find((item) => item.id === choiceId);
    if (!option) return;
    answered.current.add(messageId);
    const phase = stepRef.current;

    if (phase === "large") {
      const group = INDUSTRY_GROUPS.find((item) => item.code === choiceId);
      if (!group) return;
      commit({ ...emptyChatDraft(), largeCode: group.code });
      go("middle");
      setMessages((prev) => [
        ...markChoice(prev, messageId, choiceId),
        userLine(option.label),
        choice("중분류를 골라 주세요.", group.industries.map((item) => ({ id: item.id, label: item.label }))),
      ]);
      return;
    }

    if (phase === "middle") {
      const group = INDUSTRY_GROUPS.find((item) => item.code === draftRef.current.largeCode);
      const industry = group?.industries.find((item) => item.id === choiceId);
      if (!industry) return;
      commit({ ...draftRef.current, industryId: industry.id });
      go("si");
      setMessages((prev) => [
        ...markChoice(prev, messageId, choiceId),
        userLine(option.label),
        choice("시·도를 골라 주세요.", REGIONS.map((item) => ({ id: item.name, label: item.name }))),
      ]);
      return;
    }

    if (phase === "si") {
      const region = REGIONS.find((item) => item.name === choiceId);
      if (!region) return;
      commit({ ...draftRef.current, siName: region.name, guCode: "", dongCode: "" });
      go("gu");
      setMessages((prev) => [
        ...markChoice(prev, messageId, choiceId),
        userLine(option.label),
        choice("시·군·구를 골라 주세요.", region.gus.map((item) => ({ id: item.code, label: item.name }))),
      ]);
      return;
    }

    if (phase === "gu") {
      const region = REGIONS.find((item) => item.name === draftRef.current.siName);
      const gu = region?.gus.find((item) => item.code === choiceId);
      if (!gu) return;
      commit({ ...draftRef.current, guCode: gu.code, dongCode: "" });
      go("dong");
      setMessages((prev) => [
        ...markChoice(prev, messageId, choiceId),
        userLine(option.label),
        choice("읍·면·동을 골라 주세요.", [{ id: "", label: "전체" }, ...gu.dongs.map((item) => ({ id: item.code, label: item.name }))]),
      ]);
      return;
    }

    if (phase === "dong") {
      const region = REGIONS.find((item) => item.name === draftRef.current.siName);
      const gu = region?.gus.find((item) => item.code === draftRef.current.guCode);
      const dong = gu?.dongs.find((item) => item.code === choiceId);
      const picked = { ...draftRef.current, dongCode: choiceId, residentLabel: dong?.name ?? "" };
      commit(picked);
      go("before");
      setMessages((prev) => [...markChoice(prev, messageId, choiceId), userLine(option.label)]);
      void showBefore(generation.current, picked);
      return;
    }

    if (phase === "scenario") {
      setMessages((prev) => [...markChoice(prev, messageId, choiceId), userLine(option.label)]);
      if (choiceId === "no") {
        go("done");
        setMessages((prev) => [...prev, { id: nextId(), role: "bot", kind: "text", text: "여기서 안내를 마칩니다." }]);
        return;
      }
      go("during");
      void showDuring(generation.current, shownDraft(draftRef.current, messages));
      return;
    }

    if (phase === "forecast") {
      setMessages((prev) => [...markChoice(prev, messageId, choiceId), userLine(option.label)]);
      if (choiceId === "no") {
        go("done");
        setMessages((prev) => [...prev, { id: nextId(), role: "bot", kind: "text", text: "창업 중까지만 안내합니다." }]);
        return;
      }
      go("later");
      void showLater(generation.current, shownDraft(draftRef.current, messages));
    }
  }

  function submitBudget(messageId: string, raw: string) {
    if (answered.current.has(messageId) || stepRef.current !== "budget") return;
    const budget = Number(raw.replace(/,/g, ""));
    if (!Number.isFinite(budget) || budget <= 0) return;
    answered.current.add(messageId);
    const current = draftRef.current;
    const result = buildResult(current, budget);
    const hangul = formatManHangul(budget);
    commit({ ...current, budget, result });
    go("scenario");
    setMessages((prev) => [
      ...prev.map((item) => {
        if (item.id === messageId && item.kind === "budget") return { ...item, value: String(budget) };
        if (item.kind === "before") return { ...item, result, showMoney: true };
        return item;
      }),
      userLine(hangul ? `${formatMan(budget)} · ${hangul}` : formatMan(budget)),
      choice("오픈 시나리오를 안내해드릴까요?", YES_NO),
    ]);
  }

  async function showBefore(gen: number, picked: ChatDraft) {
    const statusId = nextId();
    setMessages((prev) => [...prev, { id: statusId, role: "bot", kind: "text", text: "창업 전 해당 지역 선택한 업종 기준 분포도와 예산 계산중입니다", pending: true }]);
    const located = locate(picked);
    let stores: StoreCount | null = null;
    let residents: ResidentPopulation | null = null;
    try {
      const [enrichment, population] = await Promise.all([
        enrichSimulation({
          signguCds: located.gu ? [located.gu.code] : [],
          indsLclsCd: located.industry.indsLclsCd,
          indsMclsCd: located.industry.indsMclsCd,
          dongName: located.dong?.name,
          peerDongs: dongsInSigngu(located.gu ? [located.gu.code] : []),
        }),
        loadAreaResidents(located.gu ? [located.gu.code] : [], located.dong?.code),
      ]);
      stores = enrichment.stores;
      residents = population;
    } catch {
      stores = null;
      residents = null;
    }
    if (generation.current !== gen) return;
    const result = buildResult(picked, picked.budget ?? 5000);
    const next = { ...picked, result, stores, residents, residentLabel: located.dong?.name ?? "" };
    commit(next);
    go("budget");
    setMessages((prev) => [
      ...prev.map((item) => (item.id === statusId && item.kind === "text" ? { ...item, pending: false } : item)),
      {
        id: nextId(),
        role: "bot",
        kind: "before",
        result,
        stores,
        residents,
        residentLabel: located.dong?.name ?? "",
        showMoney: false,
        area: "",
      },
      { id: nextId(), role: "bot", kind: "budget", prompt: "총예산을 입력해 주세요. 단위는 만원입니다.", value: "" },
    ]);
  }

  async function showDuring(gen: number, picked: ChatDraft) {
    const statusId = nextId();
    setMessages((prev) => [...prev, { id: statusId, role: "bot", kind: "text", text: "창업 중 시나리오를 정리하는 중입니다", pending: true }]);
    const located = locate(picked);
    const result = picked.result ?? buildResult(picked, picked.budget ?? 5000);
    const facts = describeStores(picked.stores);
    const plan = await draftOpening({
      industry: `${located.industry.largeName} ${located.industry.label}`,
      place: result.place,
      budget: picked.budget ?? 5000,
      pyeong: PYEONG,
      interior: result.split.interior,
      rent: result.planned ? result.split.marketRent : null,
      storeCount: facts.storeCount,
      storeMedian: facts.storeMedian,
      storeRatio: facts.storeRatio,
      districtStores: facts.districtStores,
      focusStores: facts.focusStores,
      distribution: facts.distribution,
      population: picked.residents?.population ?? null,
      households: picked.residents?.households ?? null,
      scope: picked.residentLabel || "시군구 전체",
    });
    if (generation.current !== gen) return;
    if (!plan) {
      go("done");
      setMessages((prev) => [
        ...prev.map((item) => (item.id === statusId && item.kind === "text" ? { ...item, pending: false, text: "창업 중 계획을 정리하지 못했습니다." } : item)),
      ]);
      return;
    }
    commit({ ...draftRef.current, result, plan });
    go("forecast");
    setMessages((prev) => [
      ...prev.flatMap((item): ChatMessage[] => {
        if (item.id === statusId) return [];
        if (item.kind === "before") return [{ ...item, area: plan.area }];
        return [item];
      }),
      { id: nextId(), role: "bot", kind: "during", result, plan },
      choice("창업 결과를 예상해드릴까요?", YES_NO),
    ]);
  }

  async function showLater(gen: number, picked: ChatDraft) {
    const statusId = nextId();
    setMessages((prev) => [...prev, { id: statusId, role: "bot", kind: "text", text: "창업 후와 창업결과를 정리하는 중입니다", pending: true }]);
    const located = locate(picked);
    const result = picked.result ?? buildResult(picked, picked.budget ?? 5000);
    const plan = picked.plan;
    if (!plan) {
      go("done");
      setMessages((prev) => prev.map((item) => (item.id === statusId && item.kind === "text" ? { ...item, pending: false, text: "창업 후와 창업결과를 정리하지 못했습니다." } : item)));
      return;
    }
    const facts = describeStores(picked.stores);
    const outcome = await draftOutcome({
      ending: "hope",
      hopeImpossible: hopeOutOfReach(picked.budget ?? 5000, result.split, result.planned),
      industry: `${located.industry.largeName} ${located.industry.label}`,
      place: result.place,
      scope: picked.residentLabel || "시군구 전체",
      budget: picked.budget ?? 5000,
      pyeong: PYEONG,
      interior: result.split.interior,
      deposit: result.split.deposit,
      runway: result.split.runway,
      rent: result.planned ? result.split.marketRent : null,
      gap: result.split.gap,
      storeCount: facts.storeCount,
      districtStores: facts.districtStores,
      focusStores: facts.focusStores,
      distribution: facts.distribution,
      population: picked.residents?.population ?? null,
      households: picked.residents?.households ?? null,
      salesMid: plan.sales.mid > 0 ? plan.sales.mid : null,
    });
    if (generation.current !== gen) return;
    const nextPlan = { ...plan, outcome: outcome ?? "" };
    commit({ ...draftRef.current, result, plan: nextPlan });
    go("done");
    setMessages((prev) => [
      ...prev.filter((item) => item.id !== statusId),
      { id: nextId(), role: "bot", kind: "later", result, plan: nextPlan, stores: picked.stores, residents: picked.residents },
    ]);
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <section className="flex min-w-0 flex-col gap-4" aria-live="polite">
        <div>
          <p className="text-sm font-semibold text-b">대화모드</p>
          <h1 className="mt-2 font-display text-4xl leading-tight">보기를 고르며 계산</h1>
        </div>
        <div className={`${cardClass} flex flex-col gap-4 p-4 sm:p-5`}>
          <div ref={topRef} />
          {[...messages].reverse().map((message) => (
            <MessageView key={message.id} message={message} onPick={onPick} onBudget={submitBudget} />
          ))}
        </div>
      </section>
      <aside className="flex flex-col gap-3 lg:sticky lg:top-6">
        <button type="button" className={secondaryButton} onClick={keep} disabled={messages.length === 0}>
          이 내용을 저장
        </button>
        <button type="button" className={secondaryButton} onClick={begin}>
          새 대화
        </button>
        {saveNote ? <p className="text-sm text-muted">{saveNote}</p> : <p className="text-sm text-muted">중간에도 이 브라우저에 남길 수 있습니다.</p>}
        <div className={`${cardClass} flex flex-col gap-2 p-3`}>
          <p className="text-sm font-semibold">저장한 내용</p>
          {saves.length === 0 ? <p className="text-sm text-muted">아직 없습니다.</p> : null}
          <ul className="flex max-h-[28rem] flex-col gap-2 overflow-y-auto">
            {saves.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`w-full border-2 border-ink px-3 py-2 text-left text-sm leading-5 ${picked === item.id ? "bg-ink text-paper" : "bg-paper"}`}
                  onClick={() => openSaved(item)}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}

function markChoice(messages: ChatMessage[], messageId: string, choiceId: string): ChatMessage[] {
  return messages.map((item) => (item.id === messageId && item.kind === "choices" ? { ...item, selectedId: choiceId } : item));
}

function locate(picked: ChatDraft) {
  const industry = industryById(picked.industryId);
  const si = REGIONS.find((item) => item.name === picked.siName);
  const gu = si?.gus.find((item) => item.code === picked.guCode);
  const dong = gu?.dongs.find((item) => item.code === picked.dongCode);
  return { industry, si, gu, dong };
}

function buildResult(picked: ChatDraft, budget: number): Simulation {
  const located = locate(picked);
  const place = located.si && located.gu ? `${located.si.name} ${located.gu.name}` : "";
  return simulate({
    industryId: picked.industryId || "I201",
    districtId: planningDistrictId(located.gu?.code ?? "") ?? "none",
    place,
    dongScope: false,
    budget,
    pyeong: PYEONG,
  });
}

function MessageView({ message, onPick, onBudget }: { message: ChatMessage; onPick: (messageId: string, choiceId: string) => void; onBudget: (messageId: string, raw: string) => void }) {
  if (message.kind === "text" && message.role === "user") {
    return (
      <p className="ml-auto max-w-[80%] border-2 border-ink bg-ink px-3 py-2 text-sm font-semibold text-paper">{message.text}</p>
    );
  }
  if (message.kind === "text") {
    return (
      <p className="max-w-[90%] border-2 border-ink bg-paper px-3 py-2 text-sm leading-6">
        {message.pending ? (
          <span className="flex items-center gap-2" role="status">
            <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-muted border-t-ink" aria-hidden="true" />
            {message.text}
          </span>
        ) : (
          message.text
        )}
      </p>
    );
  }
  if (message.kind === "choices") {
    const locked = message.selectedId !== null;
    return (
      <div className="max-w-full border-2 border-ink bg-paper px-3 py-3">
        <p className="text-sm font-semibold">{message.prompt}</p>
        <div className="mt-3 flex max-h-72 flex-wrap gap-2 overflow-y-auto">
          {message.choices.map((option) => {
            const selected = message.selectedId === option.id;
            return (
              <button
                key={option.id || option.label}
                type="button"
                disabled={locked}
                className={`border-2 border-ink px-3 py-2 text-sm font-semibold ${selected ? "bg-ink text-paper" : "bg-card"} disabled:cursor-default ${locked && !selected ? "opacity-40" : ""}`}
                onClick={() => onPick(message.id, option.id)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  if (message.kind === "budget") return <BudgetField message={message} onBudget={onBudget} />;
  if (message.kind === "before") return <BeforeCard message={message} />;
  if (message.kind === "during") return <DuringCard result={message.result} plan={message.plan} />;
  return <LaterCard result={message.result} plan={message.plan} stores={message.stores} residents={message.residents} />;
}

function BudgetField({ message, onBudget }: { message: Extract<ChatMessage, { kind: "budget" }>; onBudget: (messageId: string, raw: string) => void }) {
  const [value, setValue] = useState(message.value);
  const locked = message.value !== "";
  const shown = locked ? message.value : value;
  const hangul = formatManHangul(Number(shown.replace(/,/g, "")));
  return (
    <form
      className="max-w-full border-2 border-ink bg-paper px-3 py-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!locked) onBudget(message.id, value);
      }}
    >
      <p className="text-sm font-semibold">{message.prompt}</p>
      <label className="mt-3 flex flex-col gap-2 text-sm">
        총예산 (만원)
        <input
          className="h-12 border-2 border-ink bg-card px-3 text-base outline-none disabled:opacity-60"
          inputMode="numeric"
          value={shown}
          disabled={locked}
          onChange={(event) => setValue(event.target.value.replace(/[^\d]/g, ""))}
        />
        <span className="text-sm text-muted">{hangul || "숫자를 입력하면 한글로 보여 줍니다."}</span>
      </label>
      {locked ? null : (
        <button type="submit" className={`${secondaryButton} mt-3`} disabled={!hangul}>
          이 예산으로
        </button>
      )}
    </form>
  );
}

function BeforeCard({ message }: { message: Extract<ChatMessage, { kind: "before" }> }) {
  const { result, stores, residents, residentLabel, showMoney, area } = message;
  const competition = stores ? judgeCompetition(stores) : null;
  return (
    <section className={`${cardClass} p-4 sm:p-5`}>
      <p className="text-sm font-semibold text-a">창업 전</p>
      <h2 className="mt-2 text-2xl font-semibold">고른 지역 · {result.place}</h2>
      {residentLabel ? <p className="mt-1 text-sm text-muted">{residentLabel}</p> : null}
      {showMoney && result.planned && result.area ? (
        <>
          <p className="mt-3 text-sm leading-7">
            {result.industry.label} {result.area.district.rentPerPyeong}만원/평, 예상 {PYEONG}평, 월세 {formatMan(result.split.marketRent)}.
            {result.split.gap >= 0
              ? ` 인테리어와 보증금, 3개월 운영비를 빼면 ${formatMan(result.split.gap)}이 남습니다.`
              : ` 같은 항목을 채우려면 ${formatMan(Math.abs(result.split.gap))}이 더 필요합니다.`}
          </p>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <Row term="인테리어" value={formatMan(result.split.interior)} />
            <Row term={`보증금 ${DEPOSIT_MONTHS}개월`} value={formatMan(result.split.deposit)} />
            <Row term="운영비 3개월" value={formatMan(result.split.runway)} />
          </dl>
        </>
      ) : null}
      {showMoney && !result.planned ? <p className="mt-3 text-sm leading-7">이 시군구는 월세 계획 기준이 없습니다. 예상 평수는 {PYEONG}평입니다.</p> : null}
      {residents ? (
        <p className="mt-3 text-sm leading-6">
          주민등록 {residents.population.toLocaleString("ko-KR")}명 · 세대 {residents.households.toLocaleString("ko-KR")} · {residents.month.slice(0, 4)}년 {Number(residents.month.slice(4))}월
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted">주민등록 인구는 확인하지 못했습니다.</p>
      )}
      {competition ? <p className="mt-2 text-sm leading-6 text-muted">{competitionDetail(competition)}</p> : null}
      {stores ? <StoreChart stores={stores} place={result.place} industry={result.industry.label} /> : <p className="mt-3 text-sm text-muted">상가 점포 수를 받지 못했습니다.</p>}
      {showMoney && result.planned
        ? result.alternatives.map((item) => (
            <p key={item.district.id} className="mt-2 border-2 border-ink bg-paper px-3 py-2 text-sm">
              다른 후보 {item.district.sido} {item.district.name} · 월세 {formatMan(item.marketRent)} · {item.gap >= 0 ? "예산 안" : `${formatMan(Math.abs(item.gap))} 부족`}
            </p>
          ))
        : null}
      {area ? <p className="mt-4 text-sm leading-7">{area}</p> : null}
    </section>
  );
}

function DuringCard({ result, plan }: { result: Simulation; plan: OpeningDraft }) {
  const figures = figuresOf(plan, result.split.interior, result.planned ? result.split.marketRent : 0);
  return (
    <section className={`${cardClass} p-4 sm:p-5`}>
      <p className="text-sm font-semibold text-b">창업 중</p>
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
      {plan.equipment.length > 0 ? <p className="mt-4 text-sm leading-7">필수 집기 · {plan.equipment.join(" · ")}</p> : null}
      {plan.permits.length > 0 ? <p className="mt-3 text-sm leading-7">인허가 · {plan.permits.join(" · ")}</p> : null}
      <p className="mt-4 text-sm leading-7">{plan.prepare}</p>
    </section>
  );
}

function LaterCard({
  result,
  plan,
  stores,
  residents,
}: {
  result: Simulation;
  plan: OpeningDraft;
  stores?: StoreCount | null;
  residents?: ResidentPopulation | null;
}) {
  const figures = figuresOf(plan, result.split.interior, result.planned ? result.split.marketRent : 0);
  const known = [
    residents ? `주민등록 ${residents.population.toLocaleString("ko-KR")}명` : "",
    stores ? `같은 업종 ${stores.count.toLocaleString("ko-KR")}곳` : "",
  ].filter(Boolean);
  return (
    <div className="flex flex-col gap-4">
      <section className={`${cardClass} p-4 sm:p-5`}>
        <p className="text-sm font-semibold text-gold">창업 후</p>
        <h2 className="mt-2 text-2xl font-semibold">사람이 모이는 때 · {plan.peak}</h2>
        {known.length > 0 ? <p className="mt-3 text-sm leading-6">{known.join(" · ")}을 기준으로 잡았습니다.</p> : null}
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
          <p className="mt-4 text-sm text-muted">
            {known.length > 0 ? "조회된 주민등록과 점포 분포는 있습니다. 매출 구간만 만들지 못했습니다." : "점포 수나 주민등록 인구가 없어 매출 구간은 비워 둡니다."}
          </p>
        )}
        <p className="mt-4 text-sm leading-7">{plan.operate}</p>
      </section>
      <section className={`${cardClass} p-4 sm:p-5`}>
        <p className="text-sm font-semibold text-b">창업결과</p>
        {plan.outcome ? <p className="mt-3 whitespace-pre-line text-sm leading-7">{plan.outcome}</p> : <p className="mt-3 text-sm leading-7">창업결과를 정리하지 못했습니다.</p>}
      </section>
    </div>
  );
}

function StoreChart({ stores, place, industry }: { stores: StoreCount; place: string; industry: string }) {
  const rows = stores.dongs.filter((dong) => dong.count > 0 || dong.name === stores.focus);
  const top = rows.slice(0, 10);
  const rest = rows.slice(10);
  const max = top[0]?.count || 1;
  return (
    <figure className="mt-4">
      <figcaption className="text-sm leading-6">
        {place} {industry} {stores.count.toLocaleString("ko-KR")}곳. 행정동 상위 10곳입니다.
        {stores.focus ? ` 선택한 곳은 ${stores.focus}입니다.` : ""}
      </figcaption>
      <ol className="mt-3 flex flex-col gap-2">
        {top.map((dong) => {
          const picked = dong.name === stores.focus;
          return (
            <li key={dong.name} className="grid grid-cols-[7.5rem_minmax(0,1fr)_4.2rem] items-center gap-2 text-sm">
              <span className={`truncate ${picked ? "font-semibold text-a" : ""}`}>{dong.name}</span>
              <span className={`h-3 border-2 bg-paper ${picked ? "border-a" : "border-ink"}`}>
                <span className={`block h-full ${picked ? "bg-a" : "bg-b"}`} style={{ width: `${Math.max(4, Math.round((dong.count / max) * 100))}%` }} />
              </span>
              <span className={`text-right font-semibold ${picked ? "text-a" : ""}`}>{dong.count.toLocaleString("ko-KR")}곳</span>
            </li>
          );
        })}
      </ol>
      {rest.length > 0 ? <p className="mt-3 text-sm leading-6 text-muted">그 외 {rest.map((dong) => `${dong.name} ${dong.count.toLocaleString("ko-KR")}곳`).join(", ")}</p> : null}
    </figure>
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
  return { parts, scenarios, weeks: plan.weeks.permit + plan.weeks.build + plan.weeks.ready };
}

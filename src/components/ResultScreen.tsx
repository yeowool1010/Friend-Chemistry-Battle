"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Meter } from "@/components/Meter";
import { cardClass, primaryButton, secondaryButton } from "@/components/buttons";
import { useSession } from "@/components/SessionProvider";
import type { AiAnalysis } from "@/lib/ai/types";
import { requestChemistryAnalysis } from "@/lib/ai/requestChemistryAnalysis";
import { CHEMISTRY_SUMMARY, calculateChemistry } from "@/lib/chemistry";
import { withAnd } from "@/lib/korean";
import { resolveBattlePair, type ResolvedPair } from "@/lib/sampleData";

type StoredAnalysis = {
  key: string;
  status: "ready" | "error";
  analysis: AiAnalysis | null;
} | null;

export function ResultScreen() {
  const router = useRouter();
  const { session, hydrated, reset, startTest } = useSession();
  const pair = useMemo(() => (hydrated ? resolveBattlePair(session) : null), [hydrated, session]);
  const chemistry =
    pair?.me.scores && pair.partner.scores ? calculateChemistry(pair.me.scores, pair.partner.scores) : null;

  const pairKey =
    pair?.me.scores && pair.partner.scores
      ? `${pair.kind}|${pair.me.name}|${pair.partner.name}|${JSON.stringify(pair.me.scores)}|${JSON.stringify(pair.partner.scores)}`
      : "";
  const [result, setResult] = useState<StoredAnalysis>(null);
  const status = result?.key === pairKey ? result.status : "loading";
  const analysis = result?.key === pairKey ? result.analysis : null;

  useEffect(() => {
    if (!pair?.me.scores || !pair.partner.scores || !pairKey) return;

    let cancelled = false;
    const key = pairKey;
    const personA = { name: pair.me.name, scores: pair.me.scores };
    const personB = { name: pair.partner.name, scores: pair.partner.scores };

    requestChemistryAnalysis({ personA, personB })
      .then((next) => {
        if (!cancelled) setResult({ key, status: "ready", analysis: next });
      })
      .catch(() => {
        if (!cancelled) setResult({ key, status: "error", analysis: null });
      });

    return () => {
      cancelled = true;
    };
  }, [pair, pairKey]);

  if (!hydrated || !pair || !chemistry || !pair.me.scores || !pair.partner.scores) {
    return <p className="text-muted">결과를 불러오는 중</p>;
  }

  const meScores = pair.me.scores;
  const partnerScores = pair.partner.scores;

  return (
    <main className="flex flex-col gap-6 pb-12">
      <PairNotice pair={pair} />

      <section className={`${cardClass} px-5 py-8 sm:px-8`}>
        <p className="text-center text-xs font-semibold tracking-[0.22em] text-muted">CHEMISTRY</p>
        <p className="mt-2 text-center font-display text-8xl leading-none">{chemistry.overall}</p>
        <p className="mx-auto mt-3 w-fit -rotate-3 border-[3px] border-a px-4 py-1 text-sm font-semibold text-a">
          {chemistry.grade.label}
        </p>
        <h1 className="mt-5 text-balance text-center text-2xl font-semibold">{chemistry.grade.headline}</h1>
        <p className="mx-auto mt-3 max-w-lg text-balance text-center text-sm leading-6 text-muted">{CHEMISTRY_SUMMARY}</p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <PersonChip name={pair.me.name} tone="a" source={pair.kind === "user" ? "내 테스트" : "샘플"} />
          <PersonChip name={pair.partner.name} tone="b" source="샘플" />
        </div>
      </section>

      <section className="grid gap-4">
        <h2 className="font-display text-3xl">성향 맞대결</h2>
        {chemistry.dimensions.map((dimension) => (
          <article key={dimension.key} className={`${cardClass} p-4 sm:p-5`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-xl font-semibold">{dimension.label}</h3>
              <p className="text-sm text-muted">
                {dimension.mode === "similar" ? "비슷할수록" : "간격이 좋을수록"} · 케미 {dimension.score}
              </p>
            </div>
            <p className="mt-1 text-sm text-muted">{dimension.description}</p>
            <div className="mt-4 grid gap-3">
              <ScoreLine name={pair.me.name} value={meScores[dimension.key]} tone="a" />
              <ScoreLine name={pair.partner.name} value={partnerScores[dimension.key]} tone="b" />
            </div>
            <p className="mt-3 text-sm leading-6">{dimension.comment}</p>
          </article>
        ))}
      </section>

      <AnalysisCard
        pairLabel={`${withAnd(pair.me.name)} ${pair.partner.name}`}
        status={status}
        analysis={analysis}
        onRetry={() => {
          if (!pair.me.scores || !pair.partner.scores) return;
          const key = pairKey;
          setResult(null);
          requestChemistryAnalysis({
            personA: { name: pair.me.name, scores: pair.me.scores },
            personB: { name: pair.partner.name, scores: pair.partner.scores },
          })
            .then((next) => setResult({ key, status: "ready", analysis: next }))
            .catch(() => setResult({ key, status: "error", analysis: null }));
        }}
      />

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className={primaryButton}
          onClick={() => {
            reset();
            router.push("/");
          }}
        >
          처음으로
        </button>
        {session.me.name ? (
          <button
            type="button"
            className={secondaryButton}
            onClick={() => {
              startTest(session.me.name);
              router.push("/test");
            }}
          >
            테스트 다시 하기
          </button>
        ) : null}
      </div>
    </main>
  );
}

function PairNotice({ pair }: { pair: ResolvedPair }) {
  if (pair.kind === "fallback") {
    return (
      <p className="border-2 border-ink bg-soft px-4 py-3 text-sm leading-6">
        저장된 내 점수가 없어 민지와 준호 샘플로 결과를 보여 준다.
      </p>
    );
  }
  if (pair.kind === "sample") {
    return <p className="text-sm text-muted">민지와 준호의 샘플 점수로 계산한 결과다.</p>;
  }
  return <p className="text-sm text-muted">{pair.me.name}의 테스트와 준호 샘플 점수를 맞댔다.</p>;
}

function PersonChip({ name, tone, source }: { name: string; tone: "a" | "b"; source: string }) {
  return (
    <div className={tone === "a" ? "border-2 border-a bg-paper px-4 py-3" : "border-2 border-b bg-paper px-4 py-3"}>
      <p className="text-xs font-semibold tracking-wide text-muted">{source}</p>
      <p className="text-2xl font-semibold">{name}</p>
    </div>
  );
}

function ScoreLine({ name, value, tone }: { name: string; value: number; tone: "a" | "b" }) {
  return (
    <div className="grid grid-cols-[minmax(0,4.5rem)_minmax(0,1fr)_2rem] items-center gap-3 text-sm">
      <span className={tone === "a" ? "truncate font-semibold text-a" : "truncate font-semibold text-b"}>{name}</span>
      <Meter value={value} tone={tone} />
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}

function AnalysisCard({
  pairLabel,
  status,
  analysis,
  onRetry,
}: {
  pairLabel: string;
  status: "loading" | "ready" | "error";
  analysis: AiAnalysis | null;
  onRetry: () => void;
}) {
  return (
    <section className="border-2 border-dashed border-ink bg-card p-5 sm:p-6" aria-live="polite">
      <p className="text-xs font-semibold tracking-[0.18em] text-gold">AI 분석 · 임시 데이터</p>
      <h2 className="mt-2 text-2xl font-semibold">{pairLabel} 이야기</h2>
      {status === "loading" ? <p className="mt-4 text-sm leading-6 text-muted">점수에 맞는 임시 문장을 고르는 중</p> : null}
      {status === "error" ? (
        <div className="mt-4">
          <p className="text-sm leading-6">임시 분석을 만들지 못했다.</p>
          <button type="button" className={`${secondaryButton} mt-3`} onClick={onRetry}>
            다시 시도
          </button>
        </div>
      ) : null}
      {status === "ready" && analysis ? <AnalysisBody analysis={analysis} /> : null}
    </section>
  );
}

function AnalysisBody({ analysis }: { analysis: AiAnalysis }) {
  return (
    <div className="mt-4 space-y-4 text-sm leading-7">
      <p>{analysis.summary}</p>
      <div>
        <h3 className="font-semibold">잘 맞는 지점</h3>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          {analysis.strengths.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="font-semibold">살펴볼 지점</h3>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          {analysis.watchouts.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <p className="border-2 border-ink bg-paper px-4 py-3 font-semibold">{analysis.nextMove}</p>
      <p className="text-xs text-muted">외부 모델을 호출하지 않았다. aiService의 {analysis.providerId} 구현이 고른 문장이다.</p>
    </div>
  );
}

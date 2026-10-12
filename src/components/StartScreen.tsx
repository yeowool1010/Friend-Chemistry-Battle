"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Meter } from "@/components/Meter";
import { cardClass, primaryButton, secondaryButton } from "@/components/buttons";
import { useSession } from "@/components/SessionProvider";
import { SAMPLE_PROFILES } from "@/lib/sampleData";
import { TRAITS } from "@/lib/types";

export function StartScreen() {
  const router = useRouter();
  const { session, hydrated, startTest, showSamplePair } = useSession();
  const [name, setName] = useState("");

  const trimmed = name.trim();
  const canContinue = hydrated && session.me.name && (session.me.scores || Object.keys(session.me.answers).length > 0);

  function beginTest() {
    if (!trimmed) return;
    startTest(trimmed);
    router.push("/test");
  }

  function openSampleResult() {
    showSamplePair();
    router.push("/result");
  }

  return (
    <main className="flex flex-col gap-8 pb-10">
      <section className="max-w-2xl">
        <p className="text-sm font-semibold text-a">두 사람의 점수, 하나의 케미</p>
        <h1 className="mt-2 font-display text-5xl leading-[1.05] sm:text-7xl">친구 케미 배틀</h1>
        <p className="mt-4 max-w-xl text-lg leading-8">
          같은 여덟 문항을 고르면 에너지, 공감, 계획, 솔직, 모험, 유머로 점수가 갈린다. 그 점수로 둘이 어디서 맞고 어디서 부딪히는지 계산한다.
        </p>
      </section>

      <section className={`${cardClass} p-5 sm:p-6`}>
        <label htmlFor="player-name" className="text-sm font-semibold">
          내 이름
        </label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            id="player-name"
            value={name}
            maxLength={12}
            autoComplete="nickname"
            placeholder="최대 12자"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") beginTest();
            }}
            className="h-12 flex-1 border-2 border-ink bg-paper px-4 text-base outline-none focus:bg-card"
          />
          <button type="button" className={primaryButton} disabled={!hydrated || trimmed.length === 0} onClick={beginTest}>
            테스트 시작
          </button>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted">
          상대는 샘플 데이터인 준호로 고정되어 있다. 점수는 이 브라우저 탭에만 남고, AI 문장은 외부 모델 없이 임시 데이터로 보여 준다.
        </p>
        {canContinue ? (
          <p className="mt-3 text-sm">
            <button
              type="button"
              className="font-semibold underline decoration-2 underline-offset-4"
              onClick={() => router.push(session.me.scores ? "/result" : "/test")}
            >
              {session.me.name}의 {session.me.scores ? "결과" : "테스트"} 이어서 보기
            </button>
          </p>
        ) : null}
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="font-display text-3xl">샘플로 풀어 둔 두 사람</h2>
          <button type="button" className={secondaryButton} disabled={!hydrated} onClick={openSampleResult}>
            샘플 결과 보기
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {SAMPLE_PROFILES.map((profile, index) => {
            const scores = profile.participant.scores;
            if (!scores) return null;
            const tone = index === 0 ? "a" : "b";
            return (
              <article key={profile.participant.id} className={`${cardClass} p-4`}>
                <p className={tone === "a" ? "text-sm font-semibold text-a" : "text-sm font-semibold text-b"}>
                  {tone === "a" ? "PLAYER A" : "PLAYER B"}
                </p>
                <h3 className="mt-1 text-2xl font-semibold">{profile.participant.name}</h3>
                <p className="mt-1 text-sm leading-6 text-muted">{profile.blurb}</p>
                <ul className="mt-4 space-y-2">
                  {TRAITS.map((trait) => (
                    <li key={trait.key} className="grid grid-cols-[3.5rem_1fr_2rem] items-center gap-2 text-xs">
                      <span>{trait.label}</span>
                      <Meter value={scores[trait.key]} tone={tone} />
                      <span className="text-right font-semibold">{scores[trait.key]}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

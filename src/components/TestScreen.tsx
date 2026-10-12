"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cardClass, primaryButton, secondaryButton } from "@/components/buttons";
import { useSession } from "@/components/SessionProvider";
import { QUESTIONS } from "@/lib/questions";
import { isComplete } from "@/lib/scoring";

export function TestScreen() {
  const router = useRouter();
  const { session, hydrated, chooseAnswer, fillMinjiAnswers, submitTest } = useSession();
  const [index, setIndex] = useState(0);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!hydrated) return;
    if (!session.me.name) router.replace("/");
  }, [hydrated, router, session.me.name]);

  if (!hydrated || !session.me.name) {
    return <p className="text-muted">테스트를 준비하는 중</p>;
  }

  const question = QUESTIONS[index];
  const selected = session.me.answers[question.id];
  const complete = isComplete(session.me.answers);
  const progress = ((index + 1) / QUESTIONS.length) * 100;

  function submit() {
    const ok = submitTest();
    if (!ok) {
      setNotice("아직 고르지 않은 문항이 있다.");
      return;
    }
    router.push("/waiting");
  }

  return (
    <main className="flex flex-col gap-6 pb-10">
      <div>
        <p className="text-sm font-semibold text-a">{session.me.name}의 테스트</p>
        <div className="mt-3 flex items-center justify-between text-sm">
          <p>
            {index + 1} / {QUESTIONS.length}
          </p>
          <button
            type="button"
            className="font-semibold underline decoration-2 underline-offset-4"
            onClick={() => {
              fillMinjiAnswers();
              setNotice("민지 샘플 선택지를 채워 두었다. 고쳐도 된다.");
            }}
          >
            민지 샘플 답안 채우기
          </button>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-soft"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={QUESTIONS.length}
          aria-valuenow={index + 1}
        >
          <div className="h-full bg-ink" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <section className={`${cardClass} p-5 sm:p-6`}>
        <h1 className="text-2xl font-semibold leading-snug sm:text-3xl">{question.prompt}</h1>
        <div className="mt-5 grid gap-3">
          {question.choices.map((choice, choiceIndex) => {
            const active = selected === choiceIndex;
            return (
              <button
                key={choice.text}
                type="button"
                aria-pressed={active}
                onClick={() => chooseAnswer(question.id, choiceIndex)}
                className={`border-2 px-4 py-3 text-left text-sm leading-6 transition sm:text-base ${
                  active ? "border-ink bg-ink text-paper shadow-[4px_4px_0_#d63c30]" : "border-ink bg-paper hover:bg-soft"
                }`}
              >
                <span className="mr-2 font-display">{choiceIndex + 1}</span>
                {choice.text}
              </button>
            );
          })}
        </div>
      </section>

      {notice ? <p className="text-sm text-muted">{notice}</p> : null}

      <div className="flex flex-wrap gap-3">
        <button type="button" className={secondaryButton} disabled={index === 0} onClick={() => setIndex((current) => current - 1)}>
          이전
        </button>
        {index < QUESTIONS.length - 1 ? (
          <button
            type="button"
            className={primaryButton}
            disabled={selected === undefined}
            onClick={() => setIndex((current) => current + 1)}
          >
            다음
          </button>
        ) : (
          <button type="button" className={primaryButton} disabled={selected === undefined} onClick={submit}>
            답안 제출
          </button>
        )}
        {complete && index < QUESTIONS.length - 1 ? (
          <button type="button" className={secondaryButton} onClick={submit}>
            이 답안으로 제출
          </button>
        ) : null}
      </div>
    </main>
  );
}

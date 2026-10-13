"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cardClass, primaryButton, secondaryButton } from "@/components/buttons";
import { useSession } from "@/components/SessionProvider";
import { capture } from "@/lib/analytics";
import { submitGuestAnswer } from "@/lib/battles/actions";
import { QUESTIONS, choiceMark } from "@/lib/questions";
import { isComplete } from "@/lib/scoring";

export function TestScreen() {
  const router = useRouter();
  const { session, hydrated, startTest, chooseAnswer, fillMinjiAnswers, submitTest, rememberBattle } = useSession();
  const [index, setIndex] = useState(0);
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!hydrated) return;
    if (session.role === "guest" && !session.me.name) router.replace(session.battleId ? `/c/${session.battleId}` : "/");
  }, [hydrated, router, session.battleId, session.me.name, session.role]);

  if (!hydrated) {
    return <p className="text-muted">테스트를 준비하는 중</p>;
  }

  if (!session.me.name) {
    if (session.role === "guest") {
      return <p className="text-muted">초대장을 불러오는 중</p>;
    }
    const trimmed = name.trim();
    function beginTest() {
      if (!trimmed) return;
      capture("test_started", { role: "host" });
      startTest(trimmed);
    }
    return (
      <main className="flex max-w-xl flex-col gap-6 pb-12">
        <section className={`${cardClass} p-5 sm:p-6`}>
          <h1 className="font-display text-4xl">뭐라고 부를까?</h1>
          <p className="mt-3 text-sm leading-6 text-muted">결과랑 친구에게 가는 링크에 이 이름이 올라간다.</p>
          <label htmlFor="player-name" className="mt-5 block text-sm font-semibold">
            닉네임
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
                if (event.key === "Enter" && trimmed) beginTest();
              }}
              className="h-12 flex-1 border-2 border-ink bg-paper px-4 text-base outline-none focus:bg-card"
            />
            <button type="button" className={primaryButton} disabled={trimmed.length === 0} onClick={beginTest}>
              테스트 시작
            </button>
          </div>
        </section>
      </main>
    );
  }

  const question = QUESTIONS[index];
  const selected = session.me.answers[question.id];
  const complete = isComplete(session.me.answers);
  const progress = ((index + 1) / QUESTIONS.length) * 100;

  async function submit() {
    const next = submitTest();
    if (!next) {
      setNotice("아직 고르지 않은 문항이 있다.");
      return;
    }
    if (next.role === "guest" && next.battleId) {
      setPending(true);
      const result = await submitGuestAnswer({ battleId: next.battleId, name: next.me.name, answers: next.me.answers });
      if (!result.ok) {
        setPending(false);
        setNotice(result.message);
        return;
      }
      rememberBattle(next.battleId, "guest", result.token);
      capture("test_completed", { role: "guest" });
      router.push(`/c/${next.battleId}`);
      return;
    }
    capture("test_completed", { role: "host" });
    router.push("/profile");
  }

  return (
    <>
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
                <span className="mr-2 font-display">{choiceMark(choiceIndex)}</span>
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
          <button type="button" className={primaryButton} disabled={selected === undefined || pending} onClick={submit}>
            {pending ? "케미를 계산하는 중" : session.role === "guest" ? "케미 결과 보기" : "내 결과 보기"}
          </button>
        )}
        {complete && index < QUESTIONS.length - 1 ? (
          <button type="button" className={secondaryButton} disabled={pending} onClick={submit}>
            이 답안으로 제출
          </button>
        ) : null}
      </div>
    </main>
    {pending && session.role === "guest" ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="status" aria-live="polite">
        <span className="h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white" />
        <span className="sr-only">케미를 계산하는 중</span>
      </div>
    ) : null}
    </>
  );
}

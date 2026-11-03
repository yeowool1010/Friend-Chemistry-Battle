"use client";

import { useEffect, useRef, useState } from "react";
import { primaryButton } from "@/components/buttons";
import { askQuestion, type AskResult } from "@/lib/ask";

const examples = [
  "월세가 부담인지 어떻게 봐?",
  "한식 가게 계약 전에 뭘 확인해야 해?",
  "같은 업종이 많으면 어떻게 판단해?",
  "인테리어 예산은 어떻게 나눠?",
];

type Turn = {
  id: number;
  query: string;
  result: AskResult | null;
};

export function AskScreen() {
  const [query, setQuery] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState(false);
  const nextId = useRef(1);

  const latestId = turns.at(-1)?.id;
  const latestReady = turns.at(-1)?.result !== undefined && turns.at(-1)?.result !== null;

  useEffect(() => {
    if (!latestId) return;
    document.getElementById(`turn-${latestId}`)?.scrollIntoView({ block: "start", behavior: "auto" });
  }, [latestId, latestReady]);

  function run(nextQuery = query) {
    const text = nextQuery.trim();
    if (!text || pending) return;
    const id = nextId.current;
    nextId.current += 1;
    setQuery("");
    setTurns((current) => [...current, { id, query: text, result: null }]);
    setPending(true);
    void askQuestion(text)
      .then((result) => {
        setTurns((current) => current.map((turn) => (turn.id === id ? { ...turn, result } : turn)));
      })
      .finally(() => setPending(false));
  }

  return (
    <main className="flex flex-col gap-6 pb-56">
      <div className="flex flex-col gap-8" role="log" aria-live="polite">
        {turns.length === 0 ? (
          <section>
            <p className="text-sm font-semibold text-b">자료 질문</p>
            <h1 className="mt-2 font-display text-4xl leading-tight">질문을 올리면 바로 답합니다</h1>
            <p className="mt-3 text-base leading-7">창업 준비, 예산, 상권, 계약처럼 가게를 열 때 궁금한 점을 물어 보세요.</p>
            <div className="mt-5 flex flex-col gap-2">
              {examples.map((example) => (
                <button
                  key={example}
                  type="button"
                  className="border-2 border-ink bg-card px-4 py-3 text-left text-sm leading-6 hover:-translate-y-0.5"
                  onClick={() => run(example)}
                >
                  {example}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {turns.map((turn) => (
          <article key={turn.id} id={`turn-${turn.id}`} className="flex scroll-mt-4 flex-col gap-3">
            <div className="flex justify-end">
              <p className="max-w-[85%] border-2 border-ink bg-ink px-4 py-3 text-sm leading-7 text-paper">{turn.query}</p>
            </div>
            <div className="mr-6 sm:mr-12">
              {turn.result ? <Answer result={turn.result} /> : <p className="text-sm text-muted">답을 정리하는 중</p>}
            </div>
          </article>
        ))}
      </div>

      <form
        className="fixed inset-x-0 bottom-0 z-10 border-t-2 border-ink bg-paper"
        onSubmit={(event) => {
          event.preventDefault();
          run();
        }}
      >
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-4 py-3 sm:px-6">
          <label className="flex flex-col gap-2 text-sm font-semibold">
            이어서 질문
            <textarea
              className="min-h-16 border-2 border-ink bg-paper px-3 py-2 text-base font-normal leading-7 outline-none"
              value={query}
              maxLength={500}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
                event.preventDefault();
                run();
              }}
            />
          </label>
          <div>
            <button type="submit" className={primaryButton} disabled={pending || query.trim().length === 0}>
              보내기
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}

function Answer({ result }: { result: AskResult }) {
  return <p className="border-2 border-ink bg-card px-4 py-3 text-sm leading-7">{result.answer}</p>;
}

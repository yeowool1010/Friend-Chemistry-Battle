"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { cardClass, primaryButton, secondaryButton } from "@/components/buttons";
import { useSession } from "@/components/SessionProvider";

export function WaitingScreen() {
  const router = useRouter();
  const { session, hydrated } = useSession();

  useEffect(() => {
    if (!hydrated) return;
    if (!session.me.name) router.replace("/");
  }, [hydrated, router, session.me.name]);

  if (!hydrated || !session.me.name) {
    return <p className="text-muted">대기 화면을 준비하는 중</p>;
  }

  const mineReady = session.me.scores !== null;
  const partnerReady = session.partner.scores !== null;

  return (
    <main className="flex flex-col gap-6 pb-10">
      <section>
        <p className="text-sm font-semibold text-b">상대방 대기</p>
        <h1 className="mt-2 font-display text-5xl leading-none sm:text-6xl">응답을 맞추는 중</h1>
        <p className="mt-4 max-w-xl leading-7">
          둘 다 여덟 문항을 끝내야 케미를 연다. 지금은 상대 자리에 준호의 샘플 응답이 이미 도착해 있다.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Ticket
          kicker="나"
          name={session.me.name}
          tone="a"
          ready={mineReady}
          status={mineReady ? "테스트 완료" : "아직 제출 전"}
          detail={mineReady ? "여섯 가지 점수를 결과 화면에서 맞댄다." : "문항을 끝내야 비교가 시작된다."}
        />
        <Ticket
          kicker="상대 · 샘플"
          name={session.partner.name}
          tone="b"
          ready={partnerReady}
          status={partnerReady ? "샘플 응답 도착" : "응답 기다리는 중"}
          detail="이번 단계에서는 저장된 친구 대신 준호 샘플을 쓴다."
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="button" className={primaryButton} disabled={!mineReady || !partnerReady} onClick={() => router.push("/result")}>
          케미 결과 보기
        </button>
        {!mineReady ? (
          <button type="button" className={secondaryButton} onClick={() => router.push("/test")}>
            테스트로 돌아가기
          </button>
        ) : null}
      </div>
    </main>
  );
}

function Ticket({
  kicker,
  name,
  tone,
  ready,
  status,
  detail,
}: {
  kicker: string;
  name: string;
  tone: "a" | "b";
  ready: boolean;
  status: string;
  detail: string;
}) {
  return (
    <article className={`${cardClass} p-5`}>
      <p className={tone === "a" ? "text-sm font-semibold text-a" : "text-sm font-semibold text-b"}>{kicker}</p>
      <h2 className="mt-2 text-3xl font-semibold">{name}</h2>
      <p className={`mt-4 inline-flex border-2 border-ink px-3 py-1 text-sm font-semibold ${ready ? "bg-ink text-paper" : "bg-paper"}`}>
        {status}
      </p>
      <p className="mt-4 text-sm leading-6 text-muted">{detail}</p>
    </article>
  );
}

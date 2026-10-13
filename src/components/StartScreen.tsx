"use client";

import { useRouter } from "next/navigation";
import { cardClass, primaryButton } from "@/components/buttons";
import { useSession } from "@/components/SessionProvider";

export function StartScreen() {
  const router = useRouter();
  const { session, hydrated } = useSession();
  const canContinue = hydrated && session.me.name && (session.me.scores || Object.keys(session.me.answers).length > 0);

  function continueMine() {
    if (session.battleId) {
      router.push(`/c/${session.battleId}`);
      return;
    }
    router.push(session.me.scores ? "/profile" : "/test");
  }

  return (
    <main className="flex flex-col gap-8 pb-12">
      <section className="max-w-xl">
        <h1 className="font-display text-5xl leading-[1.15] sm:text-6xl">
          친구랑 나,
          <br />
          사실 얼마나 잘 맞을까?
        </h1>
        <p className="mt-5 text-lg leading-8">
          AI가 두 사람의 성격을 비교해서
          <br />
          누가 사고치고 누가 수습하는지 알려드립니다.
        </p>
        <button type="button" className={`${primaryButton} mt-6`} onClick={() => router.push("/test")}>
          친구 케미 테스트 시작
        </button>
        {canContinue ? (
          <p className="mt-3 text-sm">
            <button type="button" className="font-semibold underline decoration-2 underline-offset-4" onClick={continueMine}>
              {session.me.name}의 {session.me.scores ? "결과" : "테스트"} 이어서 보기
            </button>
          </p>
        ) : null}
      </section>

      <article className={`${cardClass} max-w-md rotate-[-1.5deg] p-5 sm:p-6`}>
        <p className="font-display text-3xl">민수 ❤️ 지영</p>
        <p className="mt-3 text-2xl font-semibold text-a">케미 92%</p>
        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <p className="border-2 border-ink bg-paper px-3 py-2">사고 담당 : 민수</p>
          <p className="border-2 border-ink bg-paper px-3 py-2">수습 담당 : 지영</p>
        </div>
        <h2 className="mt-4 font-semibold">둘이 밥 먹으면</h2>
        <p className="mt-1 text-sm leading-7">
          한 명은 메뉴를 세 번 바꾸고
          <br />
          한 명은 이미 계산을 끝냅니다.
        </p>
      </article>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Meter } from "@/components/Meter";
import { cardClass, primaryButton } from "@/components/buttons";
import { useSession } from "@/components/SessionProvider";
import { createBattleInvite } from "@/lib/battles/actions";
import { describePersona } from "@/lib/persona";
import { TRAITS } from "@/lib/types";

export function ProfileScreen() {
  const router = useRouter();
  const { session, hydrated, rememberBattle } = useSession();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!hydrated) return;
    if (!session.me.name) router.replace("/");
    else if (!session.me.scores) router.replace("/test");
  }, [hydrated, router, session.me.name, session.me.scores]);

  if (!hydrated || !session.me.name || !session.me.scores) {
    return <p className="text-muted">내 결과를 불러오는 중</p>;
  }

  const scores = session.me.scores;
  const persona = describePersona(scores);

  async function invite() {
    setPending(true);
    setNotice("");
    const result = await createBattleInvite({ name: session.me.name, answers: session.me.answers });
    setPending(false);
    if (!result.ok) {
      setNotice(result.message);
      return;
    }
    rememberBattle(result.id, "host", result.token);
    router.push(`/c/${result.id}`);
  }

  return (
    <main className="flex flex-col gap-6 pb-12">
      <section className={`${cardClass} px-5 py-8 sm:px-8`}>
        <p className="text-sm font-semibold text-a">당신은</p>
        <h1 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">🔥 “{persona.title}”</h1>
        <p className="mt-4 text-lg">{persona.line}</p>
        <p className="mt-2 max-w-lg text-sm leading-7 text-muted">{persona.reason}</p>
        <button type="button" className={`${primaryButton} mt-6`} disabled={pending} onClick={invite}>
          {pending ? "링크를 만드는 중" : "친구와 케미 확인하기"}
        </button>
        {notice ? <p className="mt-3 text-sm text-a">{notice}</p> : null}
      </section>

      <section className="grid gap-3">
        {TRAITS.map((trait) => (
          <article key={trait.key} className={`${cardClass} grid grid-cols-[4.5rem_1fr_2rem] items-center gap-3 p-4 text-sm`}>
            <span className="font-semibold">{trait.label}</span>
            <Meter value={scores[trait.key]} tone="a" />
            <span className="text-right font-semibold">{scores[trait.key]}</span>
          </article>
        ))}
      </section>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Meter } from "@/components/Meter";
import { cardClass, primaryButton, secondaryButton } from "@/components/buttons";
import { useSession } from "@/components/SessionProvider";
import { loadBattle, remixBattle, type PublicBattle } from "@/lib/battles/actions";
import { CHEMISTRY_DISCLAIMER, calculateChemistry, styleLabel } from "@/lib/chemistry";
import { withAnd } from "@/lib/korean";

export function BattleScreen() {
  const params = useParams<{ id?: string; code?: string }>();
  const battleId = typeof params.code === "string" ? params.code : typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const { session, hydrated, joinTest, rememberBattle } = useSession();
  const [battle, setBattle] = useState<PublicBattle | null>(null);
  const [notice, setNotice] = useState("");
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);

  const isHost = hydrated && session.role === "host" && session.battleId === battleId;

  useEffect(() => {
    if (!battleId) return;
    let cancelled = false;
    let finished = false;

    async function refresh() {
      const result = await loadBattle(battleId);
      if (cancelled) return;
      if (!result.ok) {
        setNotice(result.message);
        return;
      }
      if (result.battle.status === "done") finished = true;
      setBattle(result.battle);
      setNotice("");
    }

    void refresh();
    const timer = window.setInterval(() => {
      if (!finished && document.visibilityState === "visible") void refresh();
    }, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [battleId]);

  if (!battle) {
    return <p className="text-muted">{notice || "초대장을 불러오는 중"}</p>;
  }

  if (battle.status === "done") {
    return (
      <ChemistryResult
        battle={battle}
        canRemix={hydrated && session.battleId === battleId && Boolean(session.inviteToken)}
        pending={pending}
        notice={notice}
        onRemix={async () => {
          if (!session.inviteToken) {
            router.push("/");
            return;
          }
          setPending(true);
          const result = await remixBattle({ battleId, token: session.inviteToken });
          setPending(false);
          if (!result.ok) {
            setNotice(result.message);
            return;
          }
          rememberBattle(result.id, "host", result.token);
          router.push(`/c/${result.id}`);
        }}
        onStart={() => router.push("/")}
      />
    );
  }

  if (isHost) {
    return <HostWaiting hostName={battle.hostName} battleId={battleId} />;
  }

  function begin() {
    const trimmed = name.trim();
    if (!trimmed) return;
    joinTest(trimmed, battleId);
    router.push("/test");
  }

  return (
    <main className="flex flex-col gap-6 pb-12">
      <section className={`${cardClass} p-5 sm:p-6`}>
        <p className="text-sm font-semibold text-b">친구 초대</p>
        <h1 className="mt-2 text-3xl font-semibold leading-snug">
          {battle.hostName}님이
          <br />
          당신과의 케미를 궁금해합니다.
        </h1>
        <p className="mt-4 text-sm leading-7">
          {battle.hostName}의 답변은 이미 완료되었습니다.
          <br />
          당신도 테스트하면 두 사람의 결과가 공개됩니다.
        </p>
        <label htmlFor="guest-name" className="mt-5 block text-sm font-semibold">
          닉네임
        </label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            id="guest-name"
            value={name}
            maxLength={12}
            autoComplete="nickname"
            placeholder="최대 12자"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") begin();
            }}
            className="h-12 flex-1 border-2 border-ink bg-paper px-4 text-base outline-none focus:bg-card"
          />
          <button type="button" className={primaryButton} disabled={name.trim().length === 0} onClick={begin}>
            케미 확인하기
          </button>
        </div>
      </section>
    </main>
  );
}

function HostWaiting({ hostName, battleId }: { hostName: string; battleId: string }) {
  const [copied, setCopied] = useState(false);
  const link = typeof window === "undefined" ? `/c/${battleId}` : `${window.location.origin}/c/${battleId}`;

  async function share() {
    const text = `나 테스트했는데\n우리 둘 케미 몇 점인지 해볼래? ㅋㅋ\n\n${link}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "친구 케미 배틀", text });
      } catch {
        return;
      }
      return;
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
  }

  return (
    <main className="flex flex-col gap-6 pb-12">
      <section className={`${cardClass} p-5 sm:p-6`}>
        <p className="text-sm font-semibold text-a">친구를 기다리는 중</p>
        <h1 className="mt-2 text-3xl font-semibold">{hostName}의 초대</h1>
        <p className="mt-4 whitespace-pre-line border-2 border-ink bg-paper px-4 py-3 text-sm leading-7">{`나 테스트했는데\n우리 둘 케미 몇 점인지 해볼래? ㅋㅋ\n\n${link}`}</p>
        <button type="button" className={`${primaryButton} mt-4`} onClick={share}>
          {copied ? "문구를 복사했다" : "이 문구로 보내기"}
        </button>
        <p className="mt-4 text-sm leading-6 text-muted">
          카톡에 링크를 붙이면 아래 사진이 같이 보여요. 사진이 안 뜨면 링크를 한 번 눌러 미리보기를 불러와 주세요.
        </p>
        <Image
          src="/main.png"
          alt="카톡 미리보기. 친구랑 나, 사실 얼마나 잘 맞을까?"
          width={558}
          height={345}
          className="mt-3 h-auto w-full border-2 border-ink"
        />
      </section>
    </main>
  );
}

function ChemistryResult({
  battle,
  canRemix,
  pending,
  notice,
  onRemix,
  onStart,
}: {
  battle: Extract<PublicBattle, { status: "done" }>;
  canRemix: boolean;
  pending: boolean;
  notice: string;
  onRemix: () => void;
  onStart: () => void;
}) {
  const chemistry = calculateChemistry(battle.hostScores, battle.guestScores);
  const analysis = battle.analysis;
  const [copied, setCopied] = useState(false);

  async function share() {
    const link = `${window.location.origin}/c/${battle.id}`;
    const text = [
      `우리 둘의 우정 케미는 ${chemistry.overall}점`,
      analysis ? `🔥 사고치는 사람: ${analysis.troubleMaker}` : "",
      analysis ? `🧯 수습하는 사람: ${analysis.fixer}` : "",
      analysis ? `둘이 여행 가면\n${analysis.travel}` : "",
      analysis?.meal ? `둘이 밥 먹으면\n${analysis.meal}` : "",
      link,
    ]
      .filter(Boolean)
      .join("\n");

    if (navigator.share) {
      try {
        await navigator.share({ title: `${withAnd(battle.hostName)} ${battle.guestName} 케미`, text, url: link });
      } catch {
        return;
      }
      return;
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
  }

  return (
    <main className="flex flex-col gap-6 pb-12">
      <section className={`${cardClass} px-5 py-8 sm:px-8`}>
        <p className="text-center text-xs font-semibold tracking-[0.22em] text-muted">CHEMISTRY</p>
        <p className="mt-3 text-center text-lg font-semibold">우리 둘의 우정 케미는 {chemistry.overall}점</p>
        <p className="mx-auto mt-3 w-fit -rotate-3 border-[3px] border-a px-4 py-1 text-sm font-semibold text-a">{chemistry.grade.label}</p>
        <h1 className="mt-5 text-balance text-center text-2xl font-semibold">{chemistry.grade.headline}</h1>
        <p className="mt-3 text-center text-sm text-muted">
          {styleLabel(chemistry.style)} · 조화 {chemistry.similarity} · 보완 {chemistry.complement}
        </p>
        <p className="mt-2 text-center text-xs text-muted">{CHEMISTRY_DISCLAIMER}</p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <PersonChip name={battle.hostName} tone="a" />
          <PersonChip name={battle.guestName} tone="b" />
        </div>
      </section>

      {analysis ? (
        <section className="border-2 border-dashed border-ink bg-card p-5 sm:p-6">
          <p className="text-xl font-semibold leading-8">{analysis.headline}</p>
          <p className="mt-3 text-sm leading-7">{analysis.summary}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <RoleChip emoji="🔥" label="사고치는 사람" name={analysis.troubleMaker} />
            <RoleChip emoji="🧯" label="수습하는 사람" name={analysis.fixer} />
          </div>
          <h2 className="mt-4 font-semibold">둘이 여행 가면</h2>
          <p className="mt-1 border-2 border-ink bg-paper px-4 py-3 text-sm leading-7">{analysis.travel}</p>
          {analysis.meal ? (
            <>
              <h2 className="mt-4 font-semibold">둘이 밥 먹으면</h2>
              <p className="mt-1 border-2 border-ink bg-paper px-4 py-3 text-sm leading-7">{analysis.meal}</p>
            </>
          ) : null}
        </section>
      ) : (
        <p className="text-sm text-muted">점수는 계산됐고, 문장은 아직 도착하지 않았다.</p>
      )}

      <section className="grid gap-4">
        <h2 className="font-display text-3xl">성향 맞대결</h2>
        {chemistry.dimensions.map((dimension) => (
          <article key={dimension.key} className={`${cardClass} p-4 sm:p-5`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-xl font-semibold">{dimension.label}</h3>
              <p className="text-sm text-muted">차이 {dimension.gap}</p>
            </div>
            <div className="mt-4 grid gap-3">
              <ScoreLine name={battle.hostName} value={battle.hostScores[dimension.key]} tone="a" />
              <ScoreLine name={battle.guestName} value={battle.guestScores[dimension.key]} tone="b" />
            </div>
            <p className="mt-3 text-sm leading-6">{dimension.comment}</p>
          </article>
        ))}
      </section>

      <div className="flex flex-wrap gap-3">
        <button type="button" className={primaryButton} disabled={pending} onClick={canRemix ? onRemix : onStart}>
          {pending ? "새 링크를 만드는 중" : "이번엔 다른 친구랑 해보기"}
        </button>
        <button type="button" className={secondaryButton} onClick={share}>
          {copied ? "공유 문구를 복사했다" : "SNS 공유"}
        </button>
      </div>
      <p className="text-sm leading-6 text-muted">카톡에 링크를 붙이면 초대 사진이 같이 보여요.</p>
      {notice ? <p className="text-sm text-a">{notice}</p> : null}
    </main>
  );
}

function PersonChip({ name, tone }: { name: string; tone: "a" | "b" }) {
  return (
    <div className={tone === "a" ? "border-2 border-a bg-paper px-4 py-3" : "border-2 border-b bg-paper px-4 py-3"}>
      <p className="text-xs font-semibold tracking-wide text-muted">{tone === "a" ? "초대한 사람" : "초대받은 사람"}</p>
      <p className="text-2xl font-semibold">{name}</p>
    </div>
  );
}

function RoleChip({ emoji, label, name }: { emoji: string; label: string; name: string }) {
  return (
    <div className="border-2 border-ink bg-paper px-4 py-3">
      <p className="text-xs font-semibold text-muted">
        {emoji} {label}
      </p>
      <p className="text-lg font-semibold">{name}</p>
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

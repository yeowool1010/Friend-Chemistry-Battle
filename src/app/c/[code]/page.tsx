import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { BattleScreen } from "@/components/BattleScreen";
import { withSubject } from "@/lib/korean";
import { readBattle } from "@/lib/supabase/battles";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const battle = await readBattle(code).catch(() => null);
  const name = battle?.host_name ?? "친구";
  const title = `${withSubject(name)} 당신과의 친구 케미를 확인하고 싶어 합니다.`;

  return {
    title: `${name}의 케미 초대`,
    description: "우리 둘은 몇 점?",
    openGraph: {
      title,
      description: "우리 둘은 몇 점?",
    },
  };
}

async function DynamicMarker() {
  await connection();
  return null;
}

export default function ChallengePage() {
  return (
    <>
      <Suspense fallback={<p className="text-muted">초대장을 불러오는 중</p>}>
        <BattleScreen />
      </Suspense>
      <Suspense>
        <DynamicMarker />
      </Suspense>
    </>
  );
}

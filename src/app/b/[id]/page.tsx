import { Suspense } from "react";
import type { Metadata } from "next";
import { BattleScreen } from "@/components/BattleScreen";

export const metadata: Metadata = {
  title: { absolute: "케미 · 친구 케미 배틀" },
};

export default function BattlePage() {
  return (
    <Suspense fallback={<p className="text-muted">초대장을 불러오는 중</p>}>
      <BattleScreen />
    </Suspense>
  );
}

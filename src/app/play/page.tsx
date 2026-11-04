import type { Metadata } from "next";
import { ShopGame } from "@/components/ShopGame";

export const metadata: Metadata = {
  title: { absolute: "창업 게임" },
  description: "대화에서 고른 지역과 예산으로 일주일 가게를 운영한다.",
};

export default function PlayPage() {
  return <ShopGame />;
}

import type { Metadata } from "next";
import { Simulator } from "@/components/Simulator";

export const metadata: Metadata = {
  title: { absolute: "가게 시뮬" },
  description: "업종, 지역, 예산으로 창업 전중후를 계산한다.",
};

export default function HomePage() {
  return <Simulator />;
}

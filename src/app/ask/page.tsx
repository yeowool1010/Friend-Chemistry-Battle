import type { Metadata } from "next";
import { AskScreen } from "@/components/AskScreen";

export const metadata: Metadata = {
  title: { absolute: "자료 질문 · 가게 시뮬" },
  description: "창업 준비 질문에 바로 답한다.",
};

export default function AskPage() {
  return <AskScreen />;
}

import type { Metadata } from "next";
import { Conversation } from "@/components/Conversation";

export const metadata: Metadata = {
  title: { absolute: "대화모드" },
  description: "업종과 지역, 예산을 대화로 고르며 창업 전중후를 계산한다.",
};

export default function ChatPage() {
  return <Conversation />;
}

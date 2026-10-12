import type { Metadata } from "next";
import { WaitingScreen } from "@/components/WaitingScreen";

export const metadata: Metadata = {
  title: "대기",
};

export default function WaitingPage() {
  return <WaitingScreen />;
}

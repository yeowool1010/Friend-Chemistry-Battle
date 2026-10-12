import type { Metadata } from "next";
import { StartScreen } from "@/components/StartScreen";

export const metadata: Metadata = {
  title: "시작",
};

export default function HomePage() {
  return <StartScreen />;
}

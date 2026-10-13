import type { Metadata } from "next";
import { StartScreen } from "@/components/StartScreen";

export const metadata: Metadata = {
  title: { absolute: "친구 케미 배틀" },
};

export default function HomePage() {
  return <StartScreen />;
}

import type { Metadata } from "next";
import { TestScreen } from "@/components/TestScreen";

export const metadata: Metadata = {
  title: { absolute: "테스트 · 친구 케미 배틀" },
};

export default function TestPage() {
  return <TestScreen />;
}

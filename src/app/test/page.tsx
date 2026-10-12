import type { Metadata } from "next";
import { TestScreen } from "@/components/TestScreen";

export const metadata: Metadata = {
  title: "테스트",
};

export default function TestPage() {
  return <TestScreen />;
}

import type { Metadata } from "next";
import { ResultScreen } from "@/components/ResultScreen";

export const metadata: Metadata = {
  title: "결과",
};

export default function ResultPage() {
  return <ResultScreen />;
}

import type { Metadata } from "next";
import { ProfileScreen } from "@/components/ProfileScreen";

export const metadata: Metadata = {
  title: { absolute: "내 결과 · 친구 케미 배틀" },
};

export default function ProfilePage() {
  return <ProfileScreen />;
}

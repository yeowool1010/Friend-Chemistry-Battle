import type { Metadata } from "next";
import { ProfileScreen } from "@/components/ProfileScreen";

export const metadata: Metadata = {
  title: "내 결과",
};

export default function ProfilePage() {
  return <ProfileScreen />;
}

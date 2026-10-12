import type { Metadata } from "next";
import { Black_Han_Sans, IBM_Plex_Sans_KR } from "next/font/google";
import { SessionProvider } from "@/components/SessionProvider";
import "./globals.css";

const display = Black_Han_Sans({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-black-han",
});

const body = IBM_Plex_Sans_KR({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-plex",
});

export const metadata: Metadata = {
  title: {
    default: "친구 케미 배틀",
    template: "%s · 친구 케미 배틀",
  },
  description: "두 사람의 테스트 점수로 케미를 계산한다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}

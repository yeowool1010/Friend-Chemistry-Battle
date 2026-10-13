import { Suspense } from "react";
import type { Metadata } from "next";
import { Black_Han_Sans, IBM_Plex_Sans_KR } from "next/font/google";
import { AppHeader } from "@/components/AppHeader";
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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "친구 케미 배틀",
    template: "%s · 친구 케미 배틀",
  },
  description: "두 사람의 테스트 점수로 케미를 계산한다.",
  openGraph: {
    images: [
      {
        url: "/main.png",
        width: 558,
        height: 345,
        alt: "친구랑 나, 사실 얼마나 잘 맞을까?",
      },
    ],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full">
        <SessionProvider>
          <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-4 py-6 sm:px-6">
            <Suspense fallback={<p className="mb-8 h-16 border-b-2 border-ink" />}>
              <AppHeader />
            </Suspense>
            <div className="flex-1">{children}</div>
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}

"use server";

import { readServerEnv } from "@/lib/serverEnv";

/** 브라우저 번들에 넣지 않는다. 카톡 버튼을 누를 때 서버가 읽어서 전달한다. */
export async function readKakaoJavaScriptKey(): Promise<string | null> {
  return readServerEnv("KAKAO_JAVASCRIPT_KEY") ?? null;
}

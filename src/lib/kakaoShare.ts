import { readKakaoJavaScriptKey } from "@/lib/kakao/key";

const KAKAO_SDK = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";

interface KakaoLink {
  mobileWebUrl: string;
  webUrl: string;
}

interface KakaoSdk {
  init: (key: string) => void;
  isInitialized: () => boolean;
  Share: {
    sendDefault: (settings: {
      objectType: "feed";
      content: { title: string; description: string; imageUrl: string; link: KakaoLink };
      buttons: Array<{ title: string; link: KakaoLink }>;
    }) => void;
  };
}

declare global {
  interface Window {
    Kakao?: KakaoSdk;
  }
}

export function loadKakao(key: string | null): Promise<void> {
  if (!key) {
    return Promise.reject(new Error("KAKAO_JAVASCRIPT_KEY를 넣은 뒤에 다시 배포해야 카톡 친구 목록이 열립니다."));
  }
  if (window.Kakao?.isInitialized()) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const ready = () => {
      if (!window.Kakao) {
        reject(new Error("카카오 공유를 불러오지 못했습니다."));
        return;
      }
      if (!window.Kakao.isInitialized()) window.Kakao.init(key);
      resolve();
    };

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${KAKAO_SDK}"]`);
    if (existing) {
      if (window.Kakao) ready();
      else existing.addEventListener("load", ready, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = KAKAO_SDK;
    script.async = true;
    script.onload = ready;
    script.onerror = () => reject(new Error("카카오 공유를 불러오지 못했습니다."));
    document.head.appendChild(script);
  });
}

export function preloadKakao() {
  void readKakaoJavaScriptKey()
    .then((key) => loadKakao(key))
    .catch(() => undefined);
}

export async function shareInviteOnKakao(input: { title: string; description: string; url: string; imageUrl: string }) {
  const key = await readKakaoJavaScriptKey();
  await loadKakao(key);
  const link = { mobileWebUrl: input.url, webUrl: input.url };
  try {
    window.Kakao?.Share.sendDefault({
      objectType: "feed",
      content: {
        title: input.title,
        description: input.description,
        imageUrl: input.imageUrl,
        link,
      },
      buttons: [{ title: "케미 확인하기", link }],
    });
  } catch {
    throw new Error(`카카오 앱의 Web 플랫폼에 ${window.location.origin} 을 등록해야 친구 목록이 열립니다.`);
  }
}

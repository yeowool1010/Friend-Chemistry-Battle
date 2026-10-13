import { readKakaoJavaScriptKey } from "@/lib/kakao/key";

const SHARER = "https://sharer.kakao.com/picker/link";

let cachedKey: Promise<string | null> | null = null;

function kakaoKey(): Promise<string | null> {
  cachedKey ??= readKakaoJavaScriptKey();
  return cachedKey;
}

export function preloadKakao() {
  void kakaoKey().catch(() => undefined);
}

function kakaoAgent() {
  const nav = navigator;
  return [
    "sdk/2.7.4",
    "os/javascript",
    "sdk_type/javascript",
    `lang/${nav.language}`,
    `device/${nav.platform.replace(/ /g, "_")}`,
    `origin/${encodeURIComponent(window.location.origin)}`,
  ].join(" ");
}

function postShare(popup: Window, key: string, input: { title: string; description: string; url: string; imageUrl: string }) {
  const doc = popup.document;
  const link = { mobile_web_url: input.url, web_url: input.url };
  const fields: Record<string, string> = {
    app_key: key,
    ka: kakaoAgent(),
    validation_action: "default",
    validation_params: JSON.stringify({
      link_ver: "4.0",
      template_object: {
        object_type: "feed",
        content: {
          title: input.title,
          description: input.description,
          image_url: input.imageUrl,
          link,
        },
        buttons: [{ title: "케미 확인하기", link }],
      },
    }),
  };

  const form = doc.createElement("form");
  form.method = "post";
  form.action = SHARER;
  form.acceptCharset = "utf-8";
  for (const [name, value] of Object.entries(fields)) {
    const field = doc.createElement("input");
    field.type = "hidden";
    field.name = name;
    field.value = value;
    form.appendChild(field);
  }
  doc.body.appendChild(form);
  form.submit();
}

export async function shareInviteOnKakao(input: { title: string; description: string; url: string; imageUrl: string }) {
  const popup = window.open("about:blank", `kakaoShare${Date.now()}`);
  if (!popup) throw new Error("브라우저가 카톡 창을 막았습니다. 팝업을 허용한 뒤 다시 눌러 주세요.");

  try {
    const key = await kakaoKey();
    if (!key) throw new Error("KAKAO_JAVASCRIPT_KEY를 넣은 뒤에 다시 배포해야 카톡 친구 목록이 열립니다.");
    if (popup.closed) throw new Error("카톡 창이 닫혀 있습니다. 다시 눌러 주세요.");
    try {
      postShare(popup, key, input);
    } catch {
      throw new Error("카톡 창으로 초대를 넘기지 못했습니다. 다시 눌러 주세요.");
    }
  } catch (error) {
    popup.close();
    throw error;
  }
}

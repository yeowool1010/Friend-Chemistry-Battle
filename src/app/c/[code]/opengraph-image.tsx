import { ImageResponse } from "next/og";
import { withSubject } from "@/lib/korean";
import { readBattle } from "@/lib/supabase/battles";

export const alt = "친구 케미 초대";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const fontData = fetch("https://cdn.jsdelivr.net/fontsource/fonts/ibm-plex-sans-kr@5.2.8/korean-700-normal.woff").then(async (response) => {
  if (!response.ok) throw new Error("OG 글꼴을 불러오지 못했습니다.");
  return response.arrayBuffer();
});

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const battle = await readBattle(code).catch(() => null);
  const name = battle?.host_name ?? "친구";
  const font = await fontData;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        background: "#f3ecdf",
        color: "#1c1612",
        padding: "72px",
        fontFamily: "Plex",
      }}
    >
      <div style={{ fontSize: 28, letterSpacing: 4, color: "#d63c30" }}>FRIEND CHEMISTRY</div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 28, fontSize: 64, lineHeight: 1.25, fontWeight: 700 }}>
        <div>{`${withSubject(name)} 당신과의`}</div>
        <div>친구 케미를 확인하고 싶어 합니다.</div>
      </div>
      <div style={{ marginTop: 36, fontSize: 36 }}>우리 둘은 몇 점?</div>
    </div>,
    {
      ...size,
      fonts: [{ name: "Plex", data: font, weight: 700, style: "normal" }],
    },
  );
}

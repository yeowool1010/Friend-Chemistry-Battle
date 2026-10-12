import type { AiAnalysis, AiAnalysisRequest, AiService } from "@/lib/ai/types";
import { withAnd } from "@/lib/korean";

const MODEL = "gemini-2.5-flash";

export const geminiAiService: AiService = {
  id: "gemini",
  async analyze(request) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY가 없습니다.");
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: buildPrompt(request) }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                summary: { type: "STRING" },
                strengths: { type: "ARRAY", items: { type: "STRING" } },
                watchouts: { type: "ARRAY", items: { type: "STRING" } },
                nextMove: { type: "STRING" },
              },
              required: ["summary", "strengths", "watchouts", "nextMove"],
            },
          },
        }),
      },
    );

    const body = (await response.json()) as GeminiResponse;
    if (!response.ok) {
      throw new Error(readableGeminiError(body));
    }

    const text = body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    return { ...parseAnalysis(text), providerId: "gemini", storageError: null };
  },
};

function buildPrompt(request: AiAnalysisRequest): string {
  const dimensions = request.dimensions
    .map(
      (dimension) =>
        `- ${dimension.label}: ${request.personA.name} ${dimension.left}, ${request.personB.name} ${dimension.right}, 케미 ${dimension.score}, ${dimension.comment}`,
    )
    .join("\n");

  return [
    "두 친구의 케미를 한국어로 설명한다.",
    "아래 점수는 이미 계산된 값이다. 점수를 바꾸거나 새로운 점수를 만들지 않는다.",
    "summary는 2~3문장, strengths는 2개, watchouts는 1개, nextMove는 다음에 같이 할 행동 한 문장이다.",
    "",
    `${withAnd(request.personA.name)} ${request.personB.name}`,
    `종합 ${request.overall}점, ${request.gradeLabel}. ${request.gradeHeadline}`,
    dimensions,
  ].join("\n");
}

function parseAnalysis(text: string): Omit<AiAnalysis, "providerId" | "storageError"> {
  const parsed = JSON.parse(text) as Partial<AiAnalysis>;
  const summary = requireText(parsed.summary, "summary");
  const strengths = requireList(parsed.strengths, "strengths");
  const watchouts = requireList(parsed.watchouts, "watchouts");
  const nextMove = requireText(parsed.nextMove, "nextMove");
  return { summary, strengths, watchouts, nextMove };
}

function requireText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Gemini 응답에 ${field} 값이 없습니다.`);
  }
  return value.trim();
}

function requireList(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== "string" || item.trim().length === 0)) {
    throw new Error(`Gemini 응답에 ${field} 값이 없습니다.`);
  }
  return value.map((item) => item.trim());
}

function readableGeminiError(body: GeminiResponse): string {
  const message = body.error?.message ?? "Gemini 호출에 실패했습니다.";
  if (message.includes("API key not valid")) {
    return "Google이 API 키를 거부했습니다. AI Studio에서 AIza로 시작하는 키를 넣어 주세요. 프로젝트 번호는 키가 아닙니다.";
  }
  return message;
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message?: string };
}

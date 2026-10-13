import type { AiAnalysis, AiAnalysisRequest, AiService } from "@/lib/ai/types";

const MODELS = ["gemini-3.1-flash-lite", "gemini-3-flash-preview"];

export const geminiAiService: AiService = {
  id: "gemini",
  async analyze(request) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY가 없습니다.");
    }

    const names = request.personA.name === request.personB.name ? [request.personA.name] : [request.personA.name, request.personB.name];
    let lastError = "Gemini 호출에 실패했습니다.";

    for (const model of MODELS) {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const outcome = await requestModel(apiKey, model, request, names);
        if (outcome.ok) return outcome.analysis;
        lastError = outcome.message;
        if (!outcome.nextModel) throw new Error(lastError);
        if (!outcome.sameModel || attempt === 1) break;
        await delay(700);
      }
    }

    throw new Error(lastError);
  },
};

async function requestModel(
  apiKey: string,
  model: string,
  request: AiAnalysisRequest,
  names: string[],
): Promise<{ ok: true; analysis: AiAnalysis } | { ok: false; sameModel: boolean; nextModel: boolean; message: string }> {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: buildPrompt(request, names) }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              headline: { type: "STRING" },
              troubleMaker: { type: "STRING", enum: names },
              fixer: { type: "STRING", enum: names },
              travel: { type: "STRING" },
              meal: { type: "STRING" },
              summary: { type: "STRING" },
            },
            required: ["headline", "troubleMaker", "fixer", "travel", "meal", "summary"],
          },
        },
      }),
      signal: AbortSignal.timeout(20000),
    });

    const body = (await response.json()) as GeminiResponse;
    if (!response.ok) {
      const quota = isQuotaError(body);
      return {
        ok: false,
        sameModel: !quota && (response.status === 503 || response.status === 404),
        nextModel: quota || response.status === 404 || response.status === 429 || response.status === 503,
        message: readableGeminiError(body),
      };
    }

    const text = body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    if (!text) {
      return { ok: false, sameModel: true, nextModel: true, message: "Gemini 응답이 비어 있습니다." };
    }

    return { ok: true, analysis: { ...parseCopy(text, names), providerId: model, storageError: null } };
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return {
      ok: false,
      sameModel: true,
      nextModel: true,
      message: timedOut ? "Gemini 응답이 지연되고 있습니다." : "Gemini 호출에 실패했습니다.",
    };
  }
}

function buildPrompt(request: AiAnalysisRequest, names: string[]): string {
  const roles =
    names.length === 2
      ? `troubleMaker와 fixer는 ${names[0]}, ${names[1]} 중에서 서로 다른 이름이어야 한다.`
      : "이름이 하나면 두 역할 모두 그 이름이다.";

  return [
    "두 친구의 성향을 바탕으로 친구끼리 공유하고 웃을 수 있는 결과를 작성해.",
    "조건:",
    "- 진지한 심리 분석처럼 말하지 않는다.",
    "- 20대~30대 인터넷 밈 말투를 살짝 사용한다.",
    "- 누군가를 공격하지 않는다.",
    "- 민감한 성격 평가를 하지 않는다.",
    "- 문장은 짧게 작성한다.",
    "chemistry와 type은 서버가 이미 정한 값이다. 점수를 다시 계산하거나 출력에 점수를 넣지 않는다.",
    "성향 키는 spontaneous 즉흥성, planning 계획성, emotional 감정성, extrovert 외향성, realistic 현실성이다.",
    "headline은 한줄요약이다.",
    "troubleMaker는 사고치는 사람의 이름, fixer는 수습하는 사람의 이름이다.",
    roles,
    "travel은 둘이 여행 갔을 때 한 장면이다.",
    "meal은 둘이 밥 먹을 때 한 장면이다. 술, 음주, 술자리는 쓰지 않는다.",
    "summary는 친구 관계 총평이다.",
    "모두 한국어로 쓴다.",
    JSON.stringify({
      personA: { name: request.personA.name, ...request.personA.scores },
      personB: { name: request.personB.name, ...request.personB.scores },
      chemistry: request.chemistry,
      type: request.type,
      similarity: request.similarity,
      complement: request.complement,
    }),
  ].join("\n");
}

function parseCopy(text: string, names: string[]): Omit<AiAnalysis, "providerId" | "storageError"> {
  const parsed = JSON.parse(text) as Partial<AiAnalysis>;
  const headline = requireText(parsed.headline, "headline");
  const troubleMaker = requireName(parsed.troubleMaker, names, "troubleMaker");
  const fixer = requireName(parsed.fixer, names, "fixer");
  const travel = requireText(parsed.travel, "travel");
  const meal = requireText(parsed.meal, "meal");
  const summary = requireText(parsed.summary, "summary");
  if (names.length === 2 && troubleMaker === fixer) {
    throw new Error("Gemini가 두 역할을 한 사람에게 몰았습니다.");
  }
  return { headline, troubleMaker, fixer, travel, meal, summary };
}

function requireText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Gemini 응답에 ${field} 값이 없습니다.`);
  }
  return value.trim();
}

function requireName(value: unknown, names: string[], field: string): string {
  const name = requireText(value, field);
  if (!names.includes(name)) {
    throw new Error(`Gemini 응답의 ${field}가 두 사람 이름이 아닙니다.`);
  }
  return name;
}

function readableGeminiError(body: GeminiResponse): string {
  const message = body.error?.message ?? "Gemini 호출에 실패했습니다.";
  if (message.includes("API key not valid")) return "Google이 API 키를 거부했습니다.";
  if (message.includes("high demand")) return "Gemini가 지금 혼잡합니다. 잠시 뒤 다시 시도해 주세요.";
  if (isQuotaError(body)) return "Gemini 무료 사용량에 도달했습니다. 잠시 뒤에 다시 시도해 주세요.";
  return message;
}

function isQuotaError(body: GeminiResponse): boolean {
  const message = body.error?.message ?? "";
  return message.includes("Quota exceeded") || message.includes("RESOURCE_EXHAUSTED");
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message?: string };
}

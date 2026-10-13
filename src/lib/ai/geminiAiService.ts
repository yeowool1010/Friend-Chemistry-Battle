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
              summary: { type: "STRING" },
            },
            required: ["headline", "troubleMaker", "fixer", "travel", "summary"],
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
  const personA: Record<string, string | number> = { name: request.personA.name };
  const personB: Record<string, string | number> = { name: request.personB.name };
  for (const dimension of request.dimensions) {
    personA[dimension.key] = dimension.left;
    personB[dimension.key] = dimension.right;
  }

  const roles =
    names.length === 2
      ? `troubleMaker와 fixer는 ${names[0]}, ${names[1]} 중에서 서로 다른 이름이어야 한다.`
      : "이름이 하나면 두 역할 모두 그 이름이다.";

  return [
    "친구 케미의 문장만 쓴다.",
    "score와 type은 서버가 이미 정한 값이다. 점수를 다시 계산하거나 출력에 점수를 넣지 않는다.",
    "성향 키는 energy 에너지, empathy 공감, planning 계획, candor 솔직, adventure 모험, humor 유머다.",
    "headline은 둘의 역할을 한 줄로 짓는다.",
    "troubleMaker는 판을 흔드는 사람의 이름, fixer는 그 뒤를 정리하는 사람의 이름이다.",
    roles,
    "travel은 같이 여행할 때 벌어지는 한 장면이다.",
    "summary는 이 우정을 한 문장으로 붙인다.",
    "모두 한국어로 쓴다.",
    JSON.stringify({
      score: request.overall,
      type: request.gradeLabel,
      personA,
      personB,
    }),
  ].join("\n");
}

function parseCopy(text: string, names: string[]): Omit<AiAnalysis, "providerId" | "storageError"> {
  const parsed = JSON.parse(text) as Partial<AiAnalysis>;
  const headline = requireText(parsed.headline, "headline");
  const troubleMaker = requireName(parsed.troubleMaker, names, "troubleMaker");
  const fixer = requireName(parsed.fixer, names, "fixer");
  const travel = requireText(parsed.travel, "travel");
  const summary = requireText(parsed.summary, "summary");
  if (names.length === 2 && troubleMaker === fixer) {
    throw new Error("Gemini가 두 역할을 한 사람에게 몰았습니다.");
  }
  return { headline, troubleMaker, fixer, travel, summary };
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

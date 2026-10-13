import type { AiAnalysis, AiAnalysisRequest, AiService } from "@/lib/ai/types";
import { readServerEnv } from "@/lib/serverEnv";

const DEFAULT_MODEL = "gpt-6-astra";

export const openaiAiService: AiService = {
  id: "openai",
  async analyze(request) {
    const apiKey = readServerEnv("OPENAI_API_KEY");
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY가 없습니다.");
    }

    const model = readServerEnv("OPENAI_MODEL") || DEFAULT_MODEL;
    const names = uniqueNames(request.personA.name, request.personB.name);
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: [
          { role: "system", content: systemPrompt(names) },
          { role: "user", content: JSON.stringify(buildPayload(request)) },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "chemistry_copy",
            strict: true,
            description: "이미 계산된 케미 점수를 바탕으로 한 한국어 문장. 점수는 포함하지 않는다.",
            schema: copySchema(names),
          },
        },
      }),
      signal: AbortSignal.timeout(25000),
    });

    const body = (await response.json()) as OpenAiResponse;
    if (!response.ok) {
      throw new Error(readableOpenAiError(body));
    }

    const text = readOutputText(body);
    return { ...parseCopy(text, names), providerId: model, storageError: null };
  },
};

function systemPrompt(names: string[]): string {
  const pair =
    names.length === 2
      ? `troubleMaker와 fixer는 ${names[0]}, ${names[1]} 중에서 서로 다른 이름이어야 한다.`
      : "이름이 하나면 두 역할 모두 그 이름이다.";
  return [
    "두 친구의 성향을 바탕으로 친구끼리 공유하고 웃을 수 있는 결과를 작성해.",
    "진지한 심리 분석처럼 말하지 않는다.",
    "20대~30대 인터넷 밈 말투를 살짝 사용한다.",
    "누군가를 공격하지 않는다.",
    "민감한 성격 평가를 하지 않는다.",
    "문장은 짧게 작성한다.",
    "chemistry와 type은 서버가 이미 정한 값이다. 점수를 다시 계산하거나 출력에 점수를 넣지 않는다.",
    "성향 키는 spontaneous 즉흥성, planning 계획성, emotional 감정성, extrovert 외향성, realistic 현실성이다.",
    "headline은 한줄요약이다.",
    "troubleMaker는 사고치는 사람의 이름, fixer는 수습하는 사람의 이름이다.",
    pair,
    "travel은 둘이 여행 갔을 때 한 장면이다.",
    "meal은 둘이 밥 먹을 때 한 장면이다. 술, 음주, 술자리는 쓰지 않는다.",
    "summary는 친구 관계 총평이다.",
    "모두 한국어로 쓴다.",
  ].join("\n");
}

function buildPayload(request: AiAnalysisRequest) {
  return {
    personA: { name: request.personA.name, ...request.personA.scores },
    personB: { name: request.personB.name, ...request.personB.scores },
    chemistry: request.chemistry,
    type: request.type,
    similarity: request.similarity,
    complement: request.complement,
  };
}

function copySchema(names: string[]) {
  const person = { type: "string", enum: names };
  return {
    type: "object",
    properties: {
      headline: { type: "string" },
      troubleMaker: person,
      fixer: person,
      travel: { type: "string" },
      meal: { type: "string" },
      summary: { type: "string" },
    },
    required: ["headline", "troubleMaker", "fixer", "travel", "meal", "summary"],
    additionalProperties: false,
  };
}

function uniqueNames(left: string, right: string): string[] {
  return left === right ? [left] : [left, right];
}

function readOutputText(body: OpenAiResponse): string {
  if (typeof body.output_text === "string" && body.output_text.trim()) {
    return body.output_text;
  }

  const parts = body.output?.flatMap((item) => item.content ?? []) ?? [];
  const refusal = parts.find((part) => part.type === "refusal")?.refusal;
  if (refusal) {
    throw new Error("OpenAI가 이 문장을 쓰지 않았습니다.");
  }

  const text = parts
    .filter((part) => part.type === "output_text")
    .map((part) => part.text ?? "")
    .join("");
  if (!text.trim()) {
    throw new Error("OpenAI 응답이 비어 있습니다.");
  }
  return text;
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
    throw new Error("OpenAI가 두 역할을 한 사람에게 몰았습니다.");
  }

  return { headline, troubleMaker, fixer, travel, meal, summary };
}

function requireText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`OpenAI 응답에 ${field} 값이 없습니다.`);
  }
  return value.trim();
}

function requireName(value: unknown, names: string[], field: string): string {
  const name = requireText(value, field);
  if (!names.includes(name)) {
    throw new Error(`OpenAI 응답의 ${field}가 두 사람 이름이 아닙니다.`);
  }
  return name;
}

function readableOpenAiError(body: OpenAiResponse): string {
  const message = body.error?.message ?? "OpenAI 호출에 실패했습니다.";
  if (message.includes("API key") || message.includes("Incorrect API key")) {
    return "OpenAI가 API 키를 거부했습니다.";
  }
  if (message.includes("quota") || message.includes("rate limit") || message.includes("Rate limit")) {
    return "OpenAI 사용량에 도달했습니다. 잠시 뒤에 다시 시도해 주세요.";
  }
  if (message.includes("model")) {
    return "OpenAI 모델을 찾지 못했습니다. OPENAI_MODEL을 확인해 주세요.";
  }
  return message;
}

interface OpenAiResponse {
  output_text?: string;
  output?: Array<{
    content?: Array<{ type?: string; text?: string; refusal?: string }>;
  }>;
  error?: { message?: string };
}

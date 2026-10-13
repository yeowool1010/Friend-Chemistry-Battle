import type { AiAnalysis, AiAnalysisRequest, AiService } from "@/lib/ai/types";

const DEFAULT_MODEL = "gpt-6-astra";

export const openaiAiService: AiService = {
  id: "openai",
  async analyze(request) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY가 없습니다.");
    }

    const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;
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
    "친구 케미의 문장만 쓴다.",
    "score와 type은 서버가 이미 정한 값이다. 점수를 다시 계산하거나 출력에 점수를 넣지 않는다.",
    "성향 키는 energy 에너지, empathy 공감, planning 계획, candor 솔직, adventure 모험, humor 유머다.",
    "headline은 둘의 역할을 한 줄로 짓는다.",
    "troubleMaker는 판을 흔드는 사람의 이름, fixer는 그 뒤를 정리하는 사람의 이름이다.",
    pair,
    "travel은 같이 여행할 때 벌어지는 한 장면이다.",
    "summary는 이 우정을 한 문장으로 붙인다.",
    "모두 한국어로 쓴다.",
  ].join("\n");
}

function buildPayload(request: AiAnalysisRequest) {
  const personA: Record<string, string | number> = { name: request.personA.name };
  const personB: Record<string, string | number> = { name: request.personB.name };
  for (const dimension of request.dimensions) {
    personA[dimension.key] = dimension.left;
    personB[dimension.key] = dimension.right;
  }

  return {
    score: request.overall,
    type: request.gradeLabel,
    personA,
    personB,
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
      summary: { type: "string" },
    },
    required: ["headline", "troubleMaker", "fixer", "travel", "summary"],
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
  const summary = requireText(parsed.summary, "summary");

  if (names.length === 2 && troubleMaker === fixer) {
    throw new Error("OpenAI가 두 역할을 한 사람에게 몰았습니다.");
  }

  return { headline, troubleMaker, fixer, travel, summary };
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

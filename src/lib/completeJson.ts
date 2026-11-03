import { readServerEnv } from "./serverEnv";

const GEMINI_MODELS = ["gemini-3.1-flash-lite", "gemini-3-flash-preview"];

type JsonSchema = {
  type: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  enum?: string[];
};

type JsonRequest = {
  prompt: string;
  schemaName: string;
  temperature: number;
  maxOutputTokens: number;
  schema: JsonSchema;
};

/** Gemini 용량이 없으면 다른 모델, 그다음 OpenAI에 같은 JSON을 요청한다. */
export async function completeJson(input: JsonRequest): Promise<string | null> {
  const geminiKey = readServerEnv("GEMINI_API_KEY");
  if (geminiKey) {
    for (const model of GEMINI_MODELS) {
      const outcome = await askGemini(geminiKey, model, input);
      if (outcome.kind === "text") return outcome.text;
      if (outcome.kind === "stop") return null;
    }
  }
  return askOpenAi(input);
}

async function askGemini(apiKey: string, model: string, input: JsonRequest): Promise<{ kind: "text"; text: string } | { kind: "switch" } | { kind: "stop" }> {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: input.prompt }] }],
        generationConfig: {
          temperature: input.temperature,
          maxOutputTokens: input.maxOutputTokens,
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: "application/json",
          responseSchema: input.schema,
        },
      }),
      signal: AbortSignal.timeout(25000),
    });
    const body = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
      error?: { message?: string; status?: string };
    };
    if (!response.ok) {
      return capacityFailure(response.status, body.error?.message, body.error?.status) ? { kind: "switch" } : { kind: "stop" };
    }
    const text = body.candidates?.[0]?.content?.parts?.filter((part) => !part.thought).map((part) => part.text ?? "").join("") ?? "";
    return parsed(text) ? { kind: "text", text } : { kind: "switch" };
  } catch {
    return { kind: "switch" };
  }
}

async function askOpenAi(input: JsonRequest): Promise<string | null> {
  const apiKey = readServerEnv("OPENAI_API_KEY");
  if (!apiKey) return null;
  const model = readServerEnv("OPENAI_MODEL") || "gpt-6-astra";
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        input: [{ role: "user", content: input.prompt }],
        text: {
          format: {
            type: "json_schema",
            name: input.schemaName,
            strict: true,
            schema: toOpenAiSchema(input.schema),
          },
        },
      }),
      signal: AbortSignal.timeout(25000),
    });
    const body = (await response.json()) as {
      output_text?: string;
      output?: { content?: { type?: string; text?: string }[] }[];
    };
    if (!response.ok) return null;
    const text = body.output_text?.trim()
      || body.output?.flatMap((item) => item.content ?? []).filter((part) => part.type === "output_text").map((part) => part.text ?? "").join("")
      || "";
    return parsed(text) ? text : null;
  } catch {
    return null;
  }
}

function capacityFailure(status: number, message?: string, errorStatus?: string): boolean {
  if (status === 404 || status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504) return true;
  const text = `${message ?? ""} ${errorStatus ?? ""}`.toLowerCase();
  return text.includes("unavailable") || text.includes("high demand") || text.includes("overloaded") || text.includes("resource_exhausted") || text.includes("quota") || text.includes("rate limit");
}

function parsed(text: string): boolean {
  if (!text.trim()) return false;
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

function toOpenAiSchema(schema: JsonSchema): Record<string, unknown> {
  if (schema.type === "OBJECT") {
    const properties: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(schema.properties ?? {})) properties[key] = toOpenAiSchema(value);
    return { type: "object", properties, required: schema.required ?? Object.keys(properties), additionalProperties: false };
  }
  if (schema.type === "ARRAY") return { type: "array", items: schema.items ? toOpenAiSchema(schema.items) : { type: "string" } };
  if (schema.type === "INTEGER") return { type: "integer" };
  if (schema.enum) return { type: "string", enum: schema.enum };
  return { type: "string" };
}

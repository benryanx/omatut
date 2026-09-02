import type { Capture } from "./capture.ts";
import type { DesktopContext } from "./omarchy.ts";

export interface TutorAnswer {
  answer: string;
  steps: string[];
  shortcut: string | null;
  targetLabel: string | null;
  targetX: number | null;
  targetY: number | null;
  confidence: "high" | "medium" | "low";
  needsMoreContext: boolean;
}

const answerSchema = {
  type: "object", additionalProperties: false,
  properties: {
    answer: { type: "string" },
    steps: { type: "array", items: { type: "string" }, maxItems: 6 },
    shortcut: { type: ["string", "null"] },
    targetLabel: { type: ["string", "null"] },
    targetX: { type: ["integer", "null"], minimum: 0, maximum: 1000 },
    targetY: { type: ["integer", "null"], minimum: 0, maximum: 1000 },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    needsMoreContext: { type: "boolean" },
  },
  required: ["answer", "steps", "shortcut", "targetLabel", "targetX", "targetY", "confidence", "needsMoreContext"],
};

export class OpenAITutor {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;

  constructor(
    apiKey: string,
    model = process.env.OMATUT_MODEL || "gpt-5.6-luna",
    fetchImpl: typeof fetch = fetch,
  ) {
    if (!apiKey) throw new Error("Add an OpenAI API key in Settings first.");
    this.apiKey = apiKey;
    this.model = model;
    this.fetchImpl = fetchImpl;
  }

  async ask(question: string, capture: Capture, context: DesktopContext): Promise<TutorAnswer> {
    const trimmed = question.trim();
    if (!trimmed) throw new Error("Ask a question about the selected region.");
    if (trimmed.length > 2_000) throw new Error("Keep the question under 2,000 characters.");
    const response = await this.fetchImpl("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        store: false,
        reasoning: { effort: "low" },
        instructions: "You are OmaTut, a concise and friendly screen guide for Omarchy Linux. Use the screenshot and live system context. Prefer the user's installed keybindings over remembered defaults. Find the exact UI element that best answers the question. targetX and targetY use a normalized 0-1000 coordinate system across the supplied image; point to the center of the target. Use null coordinates only when there is no honest visual target. Explain one safe next action at a time. Never claim to have clicked, changed, or verified something you cannot observe. Do not suggest destructive recovery, direct pacman -Syu, or editing package-owned /usr/share/omarchy files. If the target is ambiguous, say what additional region is needed. Return no Markdown in individual fields.",
        input: [{ role: "user", content: [
          { type: "input_text", text: `Question: ${trimmed}\n\nLive Omarchy context:\n${JSON.stringify(context)}` },
          { type: "input_image", image_url: `data:${capture.mime};base64,${capture.bytes.toString("base64")}`, detail: "original" },
        ] }],
        text: { format: { type: "json_schema", name: "omatut_answer", strict: true, schema: answerSchema } },
      }),
    });
    const raw = await response.text();
    if (!response.ok) throw new Error(`OpenAI request failed (${response.status}): ${safeApiError(raw)}`);
    const output = extractOutputText(JSON.parse(raw) as Record<string, unknown>);
    if (!output) throw new Error("OpenAI returned no tutor answer.");
    return JSON.parse(output) as TutorAnswer;
  }
}

export function extractOutputText(response: Record<string, unknown>): string | null {
  if (typeof response.output_text === "string") return response.output_text;
  const output = Array.isArray(response.output) ? response.output : [];
  for (const item of output) {
    const content = Array.isArray((item as { content?: unknown }).content) ? (item as { content: unknown[] }).content : [];
    for (const part of content) if (typeof (part as { text?: unknown }).text === "string") return (part as { text: string }).text;
  }
  return null;
}

function safeApiError(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: unknown } };
    return typeof parsed.error?.message === "string" ? parsed.error.message : "The provider rejected the request.";
  } catch { return "The provider rejected the request."; }
}

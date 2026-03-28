import type {
  OpeningGenerationResponse,
  OpeningPromptEnvelope,
} from "../shared/types.js";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";

function normalizeGeneratedText(text: string): string {
  return text
    .replace(/^```(?:text)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .replace(/^\s*Opening[:\s-]+/i, "")
    .trim();
}

export async function generateOpeningScript(promptEnvelope: OpeningPromptEnvelope): Promise<OpeningGenerationResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      prompt: promptEnvelope.prompt
      ,
      input: [],
      reasoning: {
        summary: "auto"
      },
      store: true,
      include: ["reasoning.encrypted_content", "web_search_call.action.sources"]
    })
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`OpenAI request failed (${response.status}): ${detail || response.statusText}`);
  }

  const payload = (await response.json()) as {
    output_text?: string;
    output?: Array<{
      content?: Array<{ type?: string; text?: string | null }>;
    }>;
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const generated =
    payload.output_text ??
    payload.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text" || item.type === "text")?.text ??
    payload.choices?.[0]?.message?.content ??
    "";
  if (!generated.trim()) {
    throw new Error("OpenAI returned an empty opening script.");
  }

  return { openingText: normalizeGeneratedText(generated) };
}
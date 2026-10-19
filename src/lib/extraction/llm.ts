import { env } from "../env";

/*
 * Free / low-cost LLM providers, all spoken to through the OpenAI-compatible
 * chat-completions API so adding a provider is configuration, not code:
 *
 *   groq        free tier, fast Llama/GPT-OSS models          (cloud, untrusted)
 *   gemini      Google AI Studio free tier                     (cloud, untrusted:
 *               free-tier prompts may be used to improve Google products)
 *   openrouter  ":free" community models                       (cloud, untrusted)
 *   ollama      self-hosted open models, data never leaves     (trusted)
 *   custom      any OpenAI-compatible endpoint, e.g. an Indian-hosted model
 *
 * "Untrusted" providers only ever receive PII-redacted text and never images.
 * Providers are tried in LLM_PROVIDERS order; on failure the next one is used.
 */

export type ProviderId = "groq" | "gemini" | "openrouter" | "ollama" | "custom";

export type Provider = {
  id: ProviderId;
  label: string;
  baseUrl: string;
  apiKey?: string;
  model: string;
  visionModel?: string;
  trusted: boolean;
};

export function configuredProviders(): Provider[] {
  const e = env();
  const trusted = new Set(e.LLM_TRUSTED_PROVIDERS.split(",").map((s) => s.trim().toLowerCase()));
  const all: Record<ProviderId, Provider | null> = {
    groq: e.GROQ_API_KEY
      ? { id: "groq", label: "Groq", baseUrl: "https://api.groq.com/openai/v1", apiKey: e.GROQ_API_KEY, model: e.GROQ_MODEL, trusted: false }
      : null,
    gemini: e.GEMINI_API_KEY
      ? {
          id: "gemini",
          label: "Google Gemini",
          baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
          apiKey: e.GEMINI_API_KEY,
          model: e.GEMINI_MODEL,
          trusted: false,
        }
      : null,
    openrouter: e.OPENROUTER_API_KEY
      ? { id: "openrouter", label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", apiKey: e.OPENROUTER_API_KEY, model: e.OPENROUTER_MODEL, trusted: false }
      : null,
    ollama: e.OLLAMA_BASE_URL
      ? {
          id: "ollama",
          label: "Ollama (self-hosted)",
          baseUrl: `${e.OLLAMA_BASE_URL.replace(/\/+$/, "")}/v1`,
          model: e.OLLAMA_MODEL,
          visionModel: e.OLLAMA_VISION_MODEL,
          trusted: false,
        }
      : null,
    custom:
      e.CUSTOM_LLM_BASE_URL && e.CUSTOM_LLM_MODEL
        ? {
            id: "custom",
            label: "Custom",
            baseUrl: e.CUSTOM_LLM_BASE_URL.replace(/\/+$/, ""),
            apiKey: e.CUSTOM_LLM_API_KEY,
            model: e.CUSTOM_LLM_MODEL,
            visionModel: e.CUSTOM_LLM_VISION_MODEL,
            trusted: false,
          }
        : null,
  };
  const order = e.LLM_PROVIDERS.split(",").map((s) => s.trim().toLowerCase()) as ProviderId[];
  const out: Provider[] = [];
  for (const id of order) {
    const p = all[id];
    if (p && !out.some((o) => o.id === id)) out.push({ ...p, trusted: trusted.has(id) });
  }
  return out;
}

export class LLMError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | ({ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } })[];
};

/** Parse a JSON object out of model output (tolerates code fences / chatter). */
export function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const body = fenced ? fenced[1] : trimmed;
    const start = body.indexOf("{");
    const end = body.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(body.slice(start, end + 1));
    throw new LLMError("Model did not return JSON");
  }
}

export async function chatJSON(
  provider: Provider,
  messages: ChatMessage[],
  opts: { model?: string; maxTokens?: number; jsonMode?: boolean } = {},
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env().LLM_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (provider.apiKey) headers.Authorization = `Bearer ${provider.apiKey}`;
    if (provider.id === "openrouter") {
      headers["HTTP-Referer"] = env().APP_URL;
      headers["X-Title"] = env().APP_NAME;
    }
    const body: Record<string, unknown> = {
      model: opts.model ?? provider.model,
      messages,
      temperature: 0,
      max_tokens: opts.maxTokens ?? 4096,
    };
    if (opts.jsonMode !== false) body.response_format = { type: "json_object" };
    const res = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = (await res.text().catch(() => "")).slice(0, 300);
      throw new LLMError(`${provider.label} returned HTTP ${res.status}: ${text}`, res.status);
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new LLMError(`${provider.label} returned an empty response`);
    return extractJson(content);
  } catch (err) {
    if (err instanceof LLMError) throw err;
    if ((err as Error).name === "AbortError") throw new LLMError(`${provider.label} timed out`);
    throw new LLMError(`${provider.label} request failed: ${(err as Error).message}`);
  } finally {
    clearTimeout(timer);
  }
}

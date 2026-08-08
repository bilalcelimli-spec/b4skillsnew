/**
 * src/lib/ai/provider.ts
 *
 * Unified AIProvider abstraction.
 * Primary: Claude (Anthropic), Fallback: GPT-4o (OpenAI).
 * All AI calls in the codebase should route through this interface.
 */

export interface GenerateOptions {
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Temperature (0–1). Defaults to 0.7 */
  temperature?: number;
  /** System prompt (optional) */
  system?: string;
  /** JSON mode — instruct the model to output valid JSON */
  jsonMode?: boolean;
}

export interface AIProvider {
  generate(prompt: string, opts?: GenerateOptions): Promise<string>;
  /** Provider name for logging / monitoring */
  readonly name: string;
}

// ─── Anthropic (Claude) ──────────────────────────────────────────────────────

class AnthropicProvider implements AIProvider {
  readonly name = "claude";

  async generate(prompt: string, opts: GenerateOptions = {}): Promise<string> {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: opts.maxTokens ?? 2048,
      temperature: opts.temperature ?? 0.7,
      system: opts.system,
      messages: [
        {
          role: "user",
          content: opts.jsonMode
            ? `${prompt}\n\nRespond with valid JSON only. No markdown fences.`
            : prompt,
        },
      ],
    });
    const block = response.content[0];
    if (block.type !== "text") throw new Error("Unexpected content type from Anthropic");
    return block.text;
  }
}

// ─── OpenAI (GPT-4o) ─────────────────────────────────────────────────────────

class OpenAIProvider implements AIProvider {
  readonly name = "gpt-4o";

  async generate(prompt: string, opts: GenerateOptions = {}): Promise<string> {
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const messages: any[] = [];
    if (opts.system) messages.push({ role: "system", content: opts.system });
    messages.push({ role: "user", content: prompt });

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: opts.maxTokens ?? 2048,
      temperature: opts.temperature ?? 0.7,
      response_format: opts.jsonMode ? { type: "json_object" } : { type: "text" },
      messages,
    });
    return response.choices[0]?.message?.content ?? "";
  }
}

// ─── Factory with primary + fallback ────────────────────────────────────────

class FallbackProvider implements AIProvider {
  readonly name: string;

  constructor(
    private readonly primary: AIProvider,
    private readonly fallback: AIProvider,
  ) {
    this.name = `${primary.name}→${fallback.name}`;
  }

  async generate(prompt: string, opts?: GenerateOptions): Promise<string> {
    try {
      return await this.primary.generate(prompt, opts);
    } catch (err: any) {
      console.warn(`[ai/provider] ${this.primary.name} failed — falling back to ${this.fallback.name}:`, err.message);
      return this.fallback.generate(prompt, opts);
    }
  }
}

// ─── Singleton export ────────────────────────────────────────────────────────

let _provider: AIProvider | null = null;

/** Returns the shared AI provider (primary: Claude, fallback: GPT-4o). */
export function getAIProvider(): AIProvider {
  if (_provider) return _provider;
  const hasClaude = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  if (hasClaude && hasOpenAI) {
    _provider = new FallbackProvider(new AnthropicProvider(), new OpenAIProvider());
  } else if (hasClaude) {
    _provider = new AnthropicProvider();
  } else if (hasOpenAI) {
    _provider = new OpenAIProvider();
  } else {
    throw new Error(
      "No AI provider configured — set ANTHROPIC_API_KEY or OPENAI_API_KEY",
    );
  }
  return _provider;
}

/** Convenience wrapper for one-off generation calls. */
export async function generate(
  prompt: string,
  opts?: GenerateOptions,
): Promise<string> {
  return getAIProvider().generate(prompt, opts);
}

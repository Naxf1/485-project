import { z } from 'zod';
import { AGENT_TIMEOUT_MS } from '../lib/constants';
import type { LlmClient, LlmMessage, LlmStep } from './llm';
import { TOOL_DEFINITIONS } from './tool-definitions';

export const DEFAULT_GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai';

export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export interface GeminiLlmOptions {
  apiKey: string;
  model: string;
  /** Defaults to the OpenAI-compatible Gemini endpoint. */
  baseUrl?: string;
  /** Defaults to `AGENT_TIMEOUT_MS` so a hung request never outlives the run (NFR-02). */
  timeoutMs?: number;
  /** Injected in tests; defaults to the global fetch. */
  fetchImpl?: FetchLike;
}

interface ProviderToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

type ProviderMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: ProviderToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string };

const ProviderResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().nullish(),
          tool_calls: z
            .array(
              z.object({
                id: z.string().optional(),
                type: z.string().optional(),
                function: z.object({
                  name: z.string().min(1),
                  arguments: z.string(),
                }),
              }),
            )
            .nullish(),
        }),
      }),
    )
    .min(1),
});

const ToolCallContentSchema = z.object({
  kind: z.literal('tool_call'),
  name: z.string().min(1),
  args: z.record(z.unknown()),
});

const readToolCallContent = (content: string): z.infer<typeof ToolCallContentSchema> | null => {
  try {
    const parsed = ToolCallContentSchema.safeParse(JSON.parse(content));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

/**
 * Rebuild the provider conversation from our own message list. Tool call ids are
 * generated from position, so the assistant request and its result always agree.
 */
const toProviderMessages = (messages: readonly LlmMessage[]): ProviderMessage[] => {
  const out: ProviderMessage[] = [];
  const pendingIds: string[] = [];
  let callCount = 0;

  for (const message of messages) {
    if (message.role === 'system' || message.role === 'user') {
      out.push({ role: message.role, content: message.content });
      continue;
    }

    if (message.role === 'assistant') {
      const call = readToolCallContent(message.content);
      if (!call) {
        out.push({ role: 'assistant', content: message.content });
        continue;
      }

      const id = `call_${callCount}`;
      callCount += 1;
      pendingIds.push(id);
      out.push({
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id,
            type: 'function',
            function: { name: call.name, arguments: JSON.stringify(call.args) },
          },
        ],
      });
      continue;
    }

    const id = pendingIds.shift() ?? `call_${callCount}`;
    out.push({ role: 'tool', tool_call_id: id, content: message.content });
  }

  return out;
};

const stripCodeFence = (text: string): string => {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return (fenced?.[1] ?? trimmed).trim();
};

const readErrorDetail = async (response: Response): Promise<string> => {
  try {
    const text = await response.text();
    return text.replace(/\s+/g, ' ').slice(0, 200);
  } catch {
    return '';
  }
};

/**
 * Real model access through Gemini's OpenAI-compatible endpoint (FR-19).
 * The adapter only translates between our `LlmClient` contract and the provider
 * payload: it never decides a category, a priority or a duplicate itself.
 */
export class GeminiLlm implements LlmClient {
  readonly model: string;
  private readonly apiKey: string;
  private readonly endpoint: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: FetchLike;

  constructor(options: GeminiLlmOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.endpoint = `${options.baseUrl ?? DEFAULT_GEMINI_BASE_URL}/chat/completions`;
    this.timeoutMs = options.timeoutMs ?? AGENT_TIMEOUT_MS;
    this.fetchImpl = options.fetchImpl ?? ((url, init) => fetch(url, init));
  }

  async next(messages: readonly LlmMessage[]): Promise<LlmStep> {
    const response = await this.post({
      model: this.model,
      messages: toProviderMessages(messages),
      tools: TOOL_DEFINITIONS,
      tool_choice: 'auto',
      temperature: 0,
    });

    if (!response.ok) {
      const detail = await readErrorDetail(response);
      throw new Error(`LLM_HTTP_${response.status}${detail ? `: ${detail}` : ''}`);
    }

    const body: unknown = await response.json();
    const parsed = ProviderResponseSchema.safeParse(body);
    if (!parsed.success) throw new Error('LLM_BAD_RESPONSE');

    const message = parsed.data.choices[0]?.message;
    const toolCall = message?.tool_calls?.[0];

    if (toolCall) {
      let args: unknown;
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch {
        throw new Error('LLM_INVALID_TOOL_ARGS');
      }

      const argsRecord = z.record(z.unknown()).safeParse(args);
      if (!argsRecord.success) throw new Error('LLM_INVALID_TOOL_ARGS');

      return { kind: 'tool_call', name: toolCall.function.name, args: argsRecord.data };
    }

    const text = stripCodeFence(message?.content ?? '');
    if (!text) throw new Error('LLM_EMPTY_RESPONSE');

    return { kind: 'final', text };
  }

  private async post(body: Record<string, unknown>): Promise<Response> {
    try {
      return await this.fetchImpl(this.endpoint, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      const name = error instanceof Error ? error.name : '';
      if (name === 'AbortError' || name === 'TimeoutError') throw new Error('LLM_TIMEOUT');
      throw error instanceof Error ? error : new Error(String(error));
    }
  }
}

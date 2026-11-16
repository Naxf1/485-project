import type { ToolName } from './tools/index';

export type LlmMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string }
  | { role: 'tool'; name: ToolName; content: string };

export type LlmStep =
  | { kind: 'tool_call'; name: string; args: Record<string, unknown> }
  | { kind: 'final'; text: string };

export interface LlmClient {
  next(messages: readonly LlmMessage[]): Promise<LlmStep>;
}

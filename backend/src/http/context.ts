import type { LlmClient } from '../agent/llm';
import type { Repos } from '../repositories/types';

export interface AppContext {
  repos: Repos;
  llm: LlmClient;
  secret: string;
  now: () => Date;
  agentTimeoutMs: number;
}

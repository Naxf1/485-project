import { z } from 'zod';
import { AGENT_TIMEOUT_MS, CATEGORIES, MAX_REPLY_LENGTH, MAX_TOOL_CALLS, PRIORITIES } from '../lib/constants';
import type { Category } from '../lib/constants';
import { findDuplicate } from '../domain/duplicate';
import { stripInstructions } from '../domain/injection';
import type { AgentOutcome, AgentRunRecord, Suggestion, Ticket } from '../domain/types';
import type { Repos } from '../repositories/types';
import type { LlmClient, LlmMessage } from './llm';
import { SYSTEM_PROMPT } from './prompt';
import { executeTool, isToolName } from './tools/index';
import type { ToolName } from './tools/index';

const SuggestionDraftSchema = z.object({
  category: z.enum(CATEGORIES),
  priority: z.enum(PRIORITIES),
  possibleDuplicateOf: z.string().nullable().optional(),
  suggestedTechnician: z.string().nullable().optional(),
  draftReply: z.string().min(1).max(MAX_REPLY_LENGTH),
  reason: z.string().min(1).max(240),
  needsHuman: z.boolean().optional(),
});

type SuggestionDraft = z.infer<typeof SuggestionDraftSchema>;

export interface TriageDeps {
  repos: Repos;
  llm: LlmClient;
  now: Date;
  /** Hard deadline for the whole run; defaults to `AGENT_TIMEOUT_MS` (NFR-02). */
  timeoutMs?: number;
}

export interface TriageResult {
  suggestion: Suggestion;
  run: AgentRunRecord;
}

const FALLBACK_REPLY = 'A supervisor will review this ticket.';

/**
 * Reject when `promise` has not settled within `ms`. The timer is always cleared so a
 * slow model never keeps the process alive after the run.
 */
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error('agent timeout')), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}


function fallbackSuggestion(
  ticket: Ticket,
  outcome: AgentOutcome,
  error: string | null,
): Suggestion {
  const detail =
    outcome === 'limit'
      ? `agent limit: stopped after ${MAX_TOOL_CALLS} tool calls`
      : `agent error: ${error ?? 'unknown'}`;

  return {
    ticketId: ticket.id,
    category: 'Other',
    priority: 'Medium',
    possibleDuplicateOf: null,
    suggestedTechnician: null,
    draftReply: FALLBACK_REPLY,
    reason: detail.slice(0, 240),
    needsHuman: true,
  };
}

async function finalize(
  draft: SuggestionDraft,
  ticket: Ticket,
  deps: TriageDeps,
): Promise<Suggestion> {
  const candidates = (await deps.repos.tickets.list()).filter((entry) => entry.id !== ticket.id);
  const possibleDuplicateOf = findDuplicate(
    { building: ticket.building, room: ticket.room, category: draft.category },
    candidates,
    deps.now,
  );

  let suggestedTechnician: string | null = null;
  let technicianRejected = false;

  if (draft.suggestedTechnician) {
    const technician = await deps.repos.technicians.findById(draft.suggestedTechnician);
    if (technician && technician.available && technician.skills.includes(draft.category)) {
      suggestedTechnician = technician.id;
    } else {
      technicianRejected = true;
    }
  }

  const { suspicious } = stripInstructions(`${ticket.title}. ${ticket.description}`);

  return {
    ticketId: ticket.id,
    category: draft.category as Category,
    priority: draft.priority,
    possibleDuplicateOf,
    suggestedTechnician,
    draftReply: draft.draftReply.slice(0, MAX_REPLY_LENGTH),
    reason: draft.reason.slice(0, 240),
    needsHuman: draft.needsHuman === true || technicianRejected || suspicious,
  };
}

/**
 * Triage one ticket (FR-03, FR-04, FR-10, FR-11, FR-17).
 * The agent returns a suggestion only: it never writes a ticket, an assignment or a message.
 */
export async function runTriage(ticket: Ticket, deps: TriageDeps): Promise<TriageResult> {
  const startedAt = Date.now();
  const timeoutMs = deps.timeoutMs ?? AGENT_TIMEOUT_MS;
  const deadline = startedAt + timeoutMs;

  const messages: LlmMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: JSON.stringify({
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        building: ticket.building,
        room: ticket.room,
      }),
    },
  ];

  let toolCalls = 0;
  let outcome: AgentOutcome = 'ok';
  let error: string | null = null;
  let suggestion: Suggestion | null = null;

  try {
    for (;;) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        outcome = 'error';
        error = 'agent timeout';
        break;
      }

      const step = await withTimeout(deps.llm.next(messages), remaining);

      if (step.kind === 'tool_call') {
        if (toolCalls >= MAX_TOOL_CALLS) {
          outcome = 'limit';
          error = `tool limit ${MAX_TOOL_CALLS} reached`;
          break;
        }

        const result = await executeTool(step.name, step.args, { repos: deps.repos, now: deps.now });
        toolCalls += 1;

        if (!result.ok || !isToolName(step.name)) {
          outcome = 'error';
          error = `${step.name}: ${result.error ?? 'not an allowed tool'}`;
          break;
        }

        messages.push({ role: 'assistant', content: JSON.stringify(step) });
        messages.push({
          role: 'tool',
          name: step.name as ToolName,
          content: JSON.stringify(result.data),
        });
        continue;
      }

      const parsed = SuggestionDraftSchema.safeParse(JSON.parse(step.text));
      if (!parsed.success) {
        outcome = 'error';
        error = 'invalid model output';
        break;
      }

      suggestion = await finalize(parsed.data, ticket, deps);
      break;
    }
  } catch (caught) {
    outcome = 'error';
    error = caught instanceof Error ? caught.message : String(caught);
  }

  const run: AgentRunRecord = {
    ticketId: ticket.id,
    toolCalls,
    outcome,
    durationMs: Date.now() - startedAt,
    error,
    createdAt: deps.now.toISOString(),
  };

  await deps.repos.runs.record(run);

  return {
    suggestion: suggestion ?? fallbackSuggestion(ticket, outcome, error),
    run,
  };
}

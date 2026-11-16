import { MAX_REPLY_LENGTH } from '../lib/constants';
import { stripInstructions } from '../domain/injection';
import { suggestPriority } from '../domain/priority';
import { classifyCategory } from './classifier';
import type { LlmClient, LlmMessage, LlmStep } from './llm';
import type { ToolName } from './tools/index';

export type FakeMode = 'normal' | 'always-tool' | 'throw' | 'bad-json';

export interface FakeLlmOptions {
  mode?: FakeMode;
  variationSeed?: number;
}

interface PromptTicket {
  id: string;
  title: string;
  description: string;
  building: string;
  room: string;
}

type ToolMessage = Extract<LlmMessage, { role: 'tool' }>;

const readTicket = (messages: readonly LlmMessage[]): PromptTicket => {
  const userMessage = messages.find((message) => message.role === 'user');
  if (!userMessage) throw new Error('PROMPT_MISSING_TICKET');
  return JSON.parse(userMessage.content) as PromptTicket;
};

const toolMessages = (messages: readonly LlmMessage[]): ToolMessage[] =>
  messages.filter((message): message is ToolMessage => message.role === 'tool');

const toolResult = (messages: readonly LlmMessage[], name: ToolName): unknown => {
  const message = toolMessages(messages).find((entry) => entry.name === name);
  return message ? JSON.parse(message.content) : null;
};

const noiseFromSeed = (seed: number): number => ((seed * 2654435761) % 1000) / 1000;

const REASON_TEMPLATES: readonly ((category: string, priority: string, duplicates: number) => string)[] =
  [
    (category, priority, duplicates) =>
      `${category} problem with ${priority.toLowerCase()} priority` +
      (duplicates > 0 ? `; ${duplicates} similar ticket(s) in this room.` : '.'),
    (category, priority, duplicates) =>
      `Looks like ${category.toLowerCase()} work at ${priority.toLowerCase()} priority` +
      (duplicates > 0 ? `, same room reported ${duplicates} time(s) recently.` : '.'),
    (category, priority, duplicates) =>
      `${priority} priority ${category.toLowerCase()} issue` +
      (duplicates > 0 ? `; possible repeat of an earlier report.` : '.'),
  ];

/**
 * Deterministic stand-in for a provider model. It follows the same contract as a real
 * `LlmClient`: request tools, read the results, then return one JSON suggestion.
 * `variationSeed` only changes wording and tie-breaking, never a clear decision.
 */
export class FakeLlm implements LlmClient {
  private readonly mode: FakeMode;
  private readonly noise: number;

  constructor(options: FakeLlmOptions = {}) {
    this.mode = options.mode ?? 'normal';
    this.noise = noiseFromSeed(options.variationSeed ?? 0);
  }

  async next(messages: readonly LlmMessage[]): Promise<LlmStep> {
    if (this.mode === 'throw') {
      throw new Error('LLM_UNAVAILABLE');
    }

    if (this.mode === 'bad-json') {
      return { kind: 'final', text: 'This looks like an HVAC problem to me.' };
    }

    const ticket = readTicket(messages);

    if (this.mode === 'always-tool') {
      return {
        kind: 'tool_call',
        name: 'search_tickets',
        args: { building: ticket.building, room: ticket.room, category: 'Other', hoursBack: 48 },
      };
    }

    const { text, suspicious } = stripInstructions(`${ticket.title}. ${ticket.description}`);
    const category = classifyCategory(text, this.noise);
    const priority = suggestPriority(text);

    const has = (name: ToolName): boolean =>
      toolMessages(messages).some((message) => message.name === name);

    if (!has('search_tickets')) {
      return {
        kind: 'tool_call',
        name: 'search_tickets',
        args: { building: ticket.building, room: ticket.room, category, hoursBack: 48 },
      };
    }

    if (!has('get_ticket_history')) {
      return {
        kind: 'tool_call',
        name: 'get_ticket_history',
        args: { building: ticket.building, room: ticket.room },
      };
    }

    if (!has('list_technicians')) {
      return { kind: 'tool_call', name: 'list_technicians', args: { category } };
    }

    if (!has('draft_reply')) {
      return {
        kind: 'tool_call',
        name: 'draft_reply',
        args: { ticketId: ticket.id, category, priority },
      };
    }

    const search = toolResult(messages, 'search_tickets') as { ids?: string[] } | null;
    const technicians = toolResult(messages, 'list_technicians') as {
      technicians?: { id: string; name: string }[];
    } | null;
    const reply = toolResult(messages, 'draft_reply') as { text?: string } | null;

    const ids = search?.ids ?? [];
    const technician = technicians?.technicians?.[0] ?? null;
    const template = REASON_TEMPLATES[Math.floor(this.noise * REASON_TEMPLATES.length) % REASON_TEMPLATES.length];
    const reason = (template ?? REASON_TEMPLATES[0])?.(category, priority, ids.length) ?? 'Triaged.';

    return {
      kind: 'final',
      text: JSON.stringify({
        category,
        priority,
        possibleDuplicateOf: ids[0] ?? null,
        suggestedTechnician: technician?.id ?? null,
        draftReply: (reply?.text ?? 'A supervisor will review this ticket.').slice(
          0,
          MAX_REPLY_LENGTH,
        ),
        reason: reason.slice(0, 240),
        needsHuman: suspicious || category === 'Other' || technician === null,
      }),
    };
  }
}

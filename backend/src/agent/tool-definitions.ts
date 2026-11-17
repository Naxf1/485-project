import { CATEGORIES, PRIORITIES } from '../lib/constants';

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

const object = (
  properties: Record<string, unknown>,
  required: readonly string[],
): Record<string, unknown> => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
});

/**
 * JSON Schema descriptions of the four read-only tools, in the shape a provider
 * expects for function calling. The names must match `TOOL_NAMES` exactly.
 */
export const TOOL_DEFINITIONS: readonly ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'search_tickets',
      description:
        'Find tickets in the same building, room and category created in the last hoursBack hours.',
      parameters: object(
        {
          building: { type: 'string', description: 'Building name, for example Building 6.' },
          room: { type: 'string', description: 'Room code, for example 2A-15.' },
          category: { type: 'string', enum: [...CATEGORIES] },
          hoursBack: { type: 'integer', minimum: 1, maximum: 720, default: 48 },
        },
        ['building', 'room', 'category'],
      ),
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_ticket_history',
      description: 'List every earlier ticket in one building and room with its status.',
      parameters: object(
        {
          building: { type: 'string' },
          room: { type: 'string' },
        },
        ['building', 'room'],
      ),
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_technicians',
      description: 'List technicians whose skills include the chosen category.',
      parameters: object({ category: { type: 'string', enum: [...CATEGORIES] } }, ['category']),
    },
  },
  {
    type: 'function',
    function: {
      name: 'draft_reply',
      description: 'Draft a short reply to the reporter. The reply is never sent automatically.',
      parameters: object(
        {
          ticketId: { type: 'string' },
          category: { type: 'string', enum: [...CATEGORIES] },
          priority: { type: 'string', enum: [...PRIORITIES] },
        },
        ['ticketId', 'category', 'priority'],
      ),
    },
  },
];

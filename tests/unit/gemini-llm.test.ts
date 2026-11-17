import { describe, expect, it } from 'vitest';
import { GeminiLlm } from '../../backend/src/agent/gemini-llm';
import type { FetchLike } from '../../backend/src/agent/gemini-llm';
import { TOOL_NAMES } from '../../backend/src/agent/tools/index';
import type { LlmMessage } from '../../backend/src/agent/llm';

const KEY = 'test-key-123';
const MODEL = 'gemini-test-flash';

interface Recorded {
  url: string;
  init: RequestInit;
}

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const recorder = (
  responses: Response[],
): { calls: Recorded[]; fetchImpl: FetchLike } => {
  const calls: Recorded[] = [];
  const fetchImpl: FetchLike = async (url, init) => {
    calls.push({ url, init });
    const next = responses.shift();
    if (!next) throw new Error('no stubbed response left');
    return next;
  };
  return { calls, fetchImpl };
};

const toolCallBody = (name: string, args: Record<string, unknown>): unknown => ({
  choices: [
    {
      message: {
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: 'gemini-call-1',
            type: 'function',
            function: { name, arguments: JSON.stringify(args) },
          },
        ],
      },
    },
  ],
});

const finalBody = (text: string): unknown => ({
  choices: [{ message: { role: 'assistant', content: text } }],
});

const requestBody = (call: Recorded | undefined): Record<string, unknown> =>
  JSON.parse(String(call?.init.body)) as Record<string, unknown>;

const ticketMessages: LlmMessage[] = [
  { role: 'system', content: 'You triage campus maintenance tickets.' },
  { role: 'user', content: '{"id":"T-1050","title":"AC not cooling"}' },
];

const afterOneTool: LlmMessage[] = [
  ...ticketMessages,
  {
    role: 'assistant',
    content: JSON.stringify({
      kind: 'tool_call',
      name: 'search_tickets',
      args: { building: 'Building 6', room: '2A-15', category: 'HVAC', hoursBack: 48 },
    }),
  },
  { role: 'tool', name: 'search_tickets', content: '{"ids":["T-1038"]}' },
];

describe('GeminiLlm — request shape', () => {
  it('posts to the OpenAI-compatible Gemini endpoint with the bearer key', async () => {
    const { calls, fetchImpl } = recorder([jsonResponse(finalBody('{"category":"HVAC"}'))]);
    const llm = new GeminiLlm({ apiKey: KEY, model: MODEL, fetchImpl });

    await llm.next(ticketMessages);

    expect(calls[0]?.url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    );
    expect(calls[0]?.init.method).toBe('POST');
    const headers = calls[0]?.init.headers as Record<string, string>;
    expect(headers.authorization).toBe(`Bearer ${KEY}`);
    expect(headers['content-type']).toBe('application/json');
  });

  it('sends the model, temperature and all four read-only tools', async () => {
    const { calls, fetchImpl } = recorder([jsonResponse(finalBody('{}'))]);
    const llm = new GeminiLlm({ apiKey: KEY, model: MODEL, fetchImpl });

    await llm.next(ticketMessages);
    const body = requestBody(calls[0]);

    expect(body.model).toBe(MODEL);
    expect(body.temperature).toBe(0);
    const tools = body.tools as { function: { name: string } }[];
    expect(tools.map((tool) => tool.function.name).sort()).toEqual([...TOOL_NAMES].sort());
  });

  it('passes system and user messages through unchanged', async () => {
    const { calls, fetchImpl } = recorder([jsonResponse(finalBody('{}'))]);
    const llm = new GeminiLlm({ apiKey: KEY, model: MODEL, fetchImpl });

    await llm.next(ticketMessages);
    const messages = requestBody(calls[0]).messages as { role: string; content: string }[];

    expect(messages).toEqual([
      { role: 'system', content: 'You triage campus maintenance tickets.' },
      { role: 'user', content: '{"id":"T-1050","title":"AC not cooling"}' },
    ]);
  });

  it('honours a custom base url', async () => {
    const { calls, fetchImpl } = recorder([jsonResponse(finalBody('{}'))]);
    const llm = new GeminiLlm({
      apiKey: KEY,
      model: MODEL,
      baseUrl: 'http://localhost:8080/v1',
      fetchImpl,
    });

    await llm.next(ticketMessages);

    expect(calls[0]?.url).toBe('http://localhost:8080/v1/chat/completions');
  });
});

describe('GeminiLlm — tool round trip', () => {
  it('returns a tool_call step for a function call response', async () => {
    const { fetchImpl } = recorder([
      jsonResponse(toolCallBody('search_tickets', { building: 'Building 6', room: '2A-15' })),
    ]);
    const llm = new GeminiLlm({ apiKey: KEY, model: MODEL, fetchImpl });

    const step = await llm.next(ticketMessages);

    expect(step).toEqual({
      kind: 'tool_call',
      name: 'search_tickets',
      args: { building: 'Building 6', room: '2A-15' },
    });
  });

  it('replays earlier tool calls and results with matching ids', async () => {
    const { calls, fetchImpl } = recorder([jsonResponse(finalBody('{}'))]);
    const llm = new GeminiLlm({ apiKey: KEY, model: MODEL, fetchImpl });

    await llm.next(afterOneTool);
    const messages = requestBody(calls[0]).messages as Record<string, unknown>[];

    expect(messages[2]).toEqual({
      role: 'assistant',
      content: null,
      tool_calls: [
        {
          id: 'call_0',
          type: 'function',
          function: {
            name: 'search_tickets',
            arguments: JSON.stringify({
              building: 'Building 6',
              room: '2A-15',
              category: 'HVAC',
              hoursBack: 48,
            }),
          },
        },
      ],
    });
    expect(messages[3]).toEqual({
      role: 'tool',
      tool_call_id: 'call_0',
      content: '{"ids":["T-1038"]}',
    });
  });

  it('keeps the thought signature that Gemini attaches to a tool call', async () => {
    const { fetchImpl } = recorder([
      jsonResponse({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: 'gemini-call-1',
                  type: 'function',
                  function: {
                    name: 'search_tickets',
                    arguments: JSON.stringify({ building: 'Building 6' }),
                  },
                  extra_content: { google: { thought_signature: 'sig-123' } },
                },
              ],
            },
          },
        ],
      }),
    ]);
    const llm = new GeminiLlm({ apiKey: KEY, model: MODEL, fetchImpl });

    const step = await llm.next(ticketMessages);

    expect(step).toEqual({
      kind: 'tool_call',
      name: 'search_tickets',
      args: { building: 'Building 6' },
      signature: 'sig-123',
    });
  });

  it('replays the thought signature so Gemini accepts the follow-up call', async () => {
    const { calls, fetchImpl } = recorder([jsonResponse(finalBody('{}'))]);
    const llm = new GeminiLlm({ apiKey: KEY, model: MODEL, fetchImpl });

    await llm.next([
      ...ticketMessages,
      {
        role: 'assistant',
        content: JSON.stringify({
          kind: 'tool_call',
          name: 'search_tickets',
          args: { building: 'Building 6' },
          signature: 'sig-123',
        }),
      },
      { role: 'tool', name: 'search_tickets', content: '{"ids":[]}' },
    ]);

    const messages = requestBody(calls[0]).messages as Record<string, unknown>[];
    expect(messages[2]).toMatchObject({
      role: 'assistant',
      tool_calls: [
        {
          id: 'call_0',
          function: { name: 'search_tickets' },
          extra_content: { google: { thought_signature: 'sig-123' } },
        },
      ],
    });
  });
});

describe('GeminiLlm — final answer', () => {
  it('returns a final step from the message content', async () => {
    const payload = '{"category":"HVAC","priority":"High"}';
    const { fetchImpl } = recorder([jsonResponse(finalBody(payload))]);
    const llm = new GeminiLlm({ apiKey: KEY, model: MODEL, fetchImpl });

    const step = await llm.next(ticketMessages);

    expect(step).toEqual({ kind: 'final', text: payload });
  });

  it('strips a markdown code fence around the JSON', async () => {
    const { fetchImpl } = recorder([
      jsonResponse(finalBody('```json\n{"category":"HVAC"}\n```')),
    ]);
    const llm = new GeminiLlm({ apiKey: KEY, model: MODEL, fetchImpl });

    const step = await llm.next(ticketMessages);

    expect(step).toEqual({ kind: 'final', text: '{"category":"HVAC"}' });
  });

  it('rejects a response with no content and no tool call', async () => {
    const { fetchImpl } = recorder([jsonResponse({ choices: [{ message: { content: '' } }] })]);
    const llm = new GeminiLlm({ apiKey: KEY, model: MODEL, fetchImpl });

    await expect(llm.next(ticketMessages)).rejects.toThrow('LLM_EMPTY_RESPONSE');
  });
});

describe('GeminiLlm — failures', () => {
  it('reports a rate limit without leaking the key', async () => {
    const { fetchImpl } = recorder([jsonResponse({ error: 'quota' }, 429)]);
    const llm = new GeminiLlm({ apiKey: KEY, model: MODEL, fetchImpl });

    const failure = llm.next(ticketMessages);

    await expect(failure).rejects.toThrow('LLM_HTTP_429');
    await expect(failure).rejects.not.toThrow(KEY);
  });

  it('reports an unauthorized key', async () => {
    const { fetchImpl } = recorder([jsonResponse({ error: 'bad key' }, 401)]);
    const llm = new GeminiLlm({ apiKey: KEY, model: MODEL, fetchImpl });

    await expect(llm.next(ticketMessages)).rejects.toThrow('LLM_HTTP_401');
  });

  it('rejects malformed tool arguments', async () => {
    const { fetchImpl } = recorder([
      jsonResponse({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                { id: 'x', type: 'function', function: { name: 'search_tickets', arguments: '{oops' } },
              ],
            },
          },
        ],
      }),
    ]);
    const llm = new GeminiLlm({ apiKey: KEY, model: MODEL, fetchImpl });

    await expect(llm.next(ticketMessages)).rejects.toThrow('LLM_INVALID_TOOL_ARGS');
  });

  it('rejects a response that does not match the provider schema', async () => {
    const { fetchImpl } = recorder([jsonResponse({ unexpected: true })]);
    const llm = new GeminiLlm({ apiKey: KEY, model: MODEL, fetchImpl });

    await expect(llm.next(ticketMessages)).rejects.toThrow('LLM_BAD_RESPONSE');
  });

  it('maps an aborted request to LLM_TIMEOUT', async () => {
    const fetchImpl: FetchLike = async () => {
      throw Object.assign(new Error('This operation was aborted'), { name: 'AbortError' });
    };
    const llm = new GeminiLlm({ apiKey: KEY, model: MODEL, timeoutMs: 50, fetchImpl });

    await expect(llm.next(ticketMessages)).rejects.toThrow('LLM_TIMEOUT');
  });
});

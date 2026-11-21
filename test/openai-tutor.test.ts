import { describe, expect, it, vi } from 'vitest';
import { fallbackHint, streamTutorReply, TUTOR_FALLBACK_HINTS, tutorInstructions } from '../src/lib/ai/openai-tutor';

const clientWith = (events: unknown[]) => {
  const create = vi.fn(async () => (async function* () { yield* events; })());
  return { client: { responses: { create } } as any, create };
};

describe('OpenAI tutor', () => {
  it('streams text deltas and never stores the conversation', async () => {
    const { client, create } = clientWith([
      { type: 'response.created' },
      { type: 'response.output_text.delta', delta: 'Look at ' },
      { type: 'response.output_text.delta', delta: 'the verb.' },
      { type: 'response.completed' },
    ]);
    const out: string[] = [];
    await streamTutorReply(client, { message: 'why?', history: [{ role: 'assistant', content: 'Hi' }], context: { cefrLevel: 'B1' } }, d => out.push(d));
    expect(out.join('')).toBe('Look at the verb.');
    const req = (create.mock.calls[0] as any)[0];
    expect(req).toMatchObject({ store: false, stream: true, max_output_tokens: 256 });
    expect(req.input).toEqual([{ role: 'assistant', content: 'Hi' }, { role: 'user', content: 'why?' }]);
    expect(req.instructions).toContain('B1');
  });

  it('throws on a failed stream so the route can fall back', async () => {
    const { client } = clientWith([{ type: 'response.failed' }]);
    await expect(streamTutorReply(client, { message: 'x', history: [], context: {} }, () => {})).rejects.toThrow();
  });

  it('treats student text as data and has static hints', () => {
    expect(tutorInstructions({})).toMatch(/untrusted/);
    expect(TUTOR_FALLBACK_HINTS).toContain(fallbackHint(() => 0.99));
  });
});

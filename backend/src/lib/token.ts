import { createHmac, timingSafeEqual } from 'node:crypto';

export interface TokenPayload {
  sub: string;
  exp: number;
}

const TOKEN_TTL_HOURS = 12;

const signature = (payload: string, secret: string): string =>
  createHmac('sha256', secret).update(payload).digest('base64url');

export function signToken(
  userId: string,
  secret: string,
  now: Date,
  ttlHours = TOKEN_TTL_HOURS,
): string {
  const payload = Buffer.from(
    JSON.stringify({ sub: userId, exp: now.getTime() + ttlHours * 3_600_000 }),
    'utf8',
  ).toString('base64url');

  return `${payload}.${signature(payload, secret)}`;
}

export function verifyToken(token: string, secret: string, now: Date): TokenPayload | null {
  const [payload, provided] = token.split('.');
  if (!payload || !provided) return null;

  const expected = signature(payload, secret);
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as TokenPayload;
    if (typeof parsed.sub !== 'string' || typeof parsed.exp !== 'number') return null;
    if (parsed.exp <= now.getTime()) return null;
    return parsed;
  } catch {
    return null;
  }
}

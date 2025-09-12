import { randomBytes, createHash } from 'crypto';

export function genSlug(len = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const b = randomBytes(len);
  return Array.from(b).map(x => chars[x % chars.length]).join('');
}

export function genToken(len = 24) {
  return randomBytes(len).toString('base64url');
}

export function sha256(input: string) {
  return createHash('sha256').update(input).digest('hex');
}

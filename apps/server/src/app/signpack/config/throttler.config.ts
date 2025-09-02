import { registerAs } from '@nestjs/config';

export default registerAs('throttler', () => {
  const ttlMs = Number(process.env.RATE_TTL_MS || 60_000);
  const limit = Number(process.env.RATE_LIMIT || 60);
  return { ttlMs, limit };
});


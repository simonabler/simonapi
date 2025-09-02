import crypto from 'crypto';

// ENV hints
// DATA_DIR=/data/signpacks
// TOKEN_LENGTH=32
// FILE_MAX_BYTES=26214400
// PURGE_CRON=0 * * * *
// TYPEORM_DB=./signpacks.sqlite or TYPEORM_URL=postgres://user:pass@host:5432/db

export function randomToken(len: number): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(len);
  let tok = '';
  for (let i = 0; i < len; i++) tok += alphabet[bytes[i] % alphabet.length];
  return tok;
}


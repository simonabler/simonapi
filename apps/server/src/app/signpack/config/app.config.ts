import { registerAs } from '@nestjs/config';
import * as path from 'path';

export default registerAs('signpack', () => {
  const dataDir = process.env.DATA_DIR || path.resolve('./data/signpacks');
  const tokenLength = Number(process.env.TOKEN_LENGTH || 32);
  const fileMaxBytes = Number(process.env.FILE_MAX_BYTES || 25 * 1024 * 1024);
  const purgeCron = process.env.PURGE_CRON || '0 * * * *';
  return { dataDir, tokenLength, fileMaxBytes, purgeCron };
});


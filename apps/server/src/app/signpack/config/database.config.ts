import { registerAs } from '@nestjs/config';

export default registerAs('database', () => {
  return {
    url: process.env.TYPEORM_URL,
    sqlitePath: process.env.TYPEORM_DB ?? './signpacks.sqlite',
  };
});


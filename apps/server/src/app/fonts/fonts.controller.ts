import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';
import { ApiExcludeController } from '@nestjs/swagger';

const FONTS_DIR = join(__dirname, '..', 'assets', 'fonts');

const MIME: Record<string, string> = {
  css:   'text/css; charset=utf-8',
  woff2: 'font/woff2',
  woff:  'font/woff',
};

/** Served at /fonts/* — no API key required, CORS * inherited from global config. */
@ApiExcludeController()
@Controller('fonts')
export class FontsController {

  /** GET /fonts/abler-stack.css */
  @Get('abler-stack.css')
  serveStack(@Res() res: Response) {
    return this.sendFile(res, 'abler-stack.css');
  }

  /** GET /fonts/files/:filename  (woff2 / woff) */
  @Get('files/:filename')
  serveFile(@Param('filename') filename: string, @Res() res: Response) {
    // Prevent path traversal
    if (filename.includes('..') || filename.includes('/')) {
      throw new NotFoundException();
    }
    return this.sendFile(res, join('files', filename));
  }

  private sendFile(res: Response, relativePath: string) {
    const absolute = join(FONTS_DIR, relativePath);

    if (!existsSync(absolute)) {
      throw new NotFoundException(`Font not found: ${relativePath}`);
    }

    const ext = relativePath.split('.').pop() ?? '';
    const mime = MIME[ext] ?? 'application/octet-stream';

    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.sendFile(absolute);
  }
}

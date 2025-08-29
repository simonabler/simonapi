import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { UtilityService } from './utility.service';
import { IdQueryDto } from './dto/id-query.dto';
import { SlugifyDto } from './dto/slugify.dto';
import { HashDto } from './dto/hash.dto';
import { MarkdownDto } from './dto/markdown.dto';
import { ApiBody, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';


@ApiTags('utils')
@Controller('utils')
export class UtilityController {
  constructor(private readonly util: UtilityService) {}


  /**
  * Echo & Request-Info
  */
  @Get('echo')
  @ApiOperation({ summary: 'Echo & Request-Info (IP, Method, URL, Headers, Timestamp)' })
  @ApiOkResponse({
    description: 'Request-Informationen',
    schema: {
      type: 'object',
      properties: {
        ip: { type: 'string', example: '::1' },
        method: { type: 'string', example: 'GET' },
        url: { type: 'string', example: '/api/utils/echo' },
        headers: { type: 'object', additionalProperties: true },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  echo(@Req() req: Request) {
    return this.util.echo(req);
  }


  /**
  * UUID/ULID Generator
  */
  @Get('id')
  @ApiOperation({ summary: 'UUID/ULID Generator' })
  @ApiOkResponse({
    description: 'Generierte IDs',
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['uuid', 'ulid'] },
        count: { type: 'integer', example: 1 },
        ids: { type: 'array', items: { type: 'string' }, example: ['01J7ZWD1D3V7M3M6K3K8M2Z6RH'] },
      },
    },
  })
  generateId(@Query() query: IdQueryDto) {
    return this.util.generateIds(query);
  }


  /**
  * Slugify
  */
  @Post('slugify')
  @ApiOperation({ summary: 'Slugify/Transliteration – Text zu URL-Slug' })
  @ApiBody({
    description: 'Text und Optionen',
    type: SlugifyDto,
    examples: {
      basic: { summary: 'Einfach', value: { text: 'Äpfel & Öl – groß!' } },
      custom: { summary: 'Benutzerdefiniert', value: { text: 'Hello World', lower: true, strict: true, delimiter: '_' } },
    },
  })
  @ApiOkResponse({ description: 'Slug-Ergebnis', schema: { type: 'object', properties: { input: { type: 'string' }, slug: { type: 'string', example: 'aepfel-oel-gross' } } } })
  slugify(@Body() body: SlugifyDto) {
    return this.util.slugify(body);
  }


  /**
  * Hashing
  */
  @Post('hash')
  @ApiOperation({ summary: 'Hashing-Service – md5 / sha256 / bcrypt' })
  @ApiQuery({ name: 'algo', required: false, description: 'Hash-Algorithmus', enum: ['md5', 'sha256', 'bcrypt'], example: 'sha256' })
  @ApiBody({
    description: 'Zu hashende Daten (für bcrypt optional saltRounds)',
    type: HashDto,
    examples: {
      sha256: { summary: 'SHA256', value: { data: 'hello' } },
      bcrypt: { summary: 'bcrypt', value: { data: 'secret', saltRounds: 10 } },
    },
  })
  @ApiOkResponse({
    description: 'Hash-Ergebnis',
    schema: {
      oneOf: [
        { type: 'object', properties: { algo: { type: 'string', enum: ['md5','sha256'] }, format: { type: 'string', example: 'hex' }, hash: { type: 'string' } } },
        { type: 'object', properties: { algo: { type: 'string', enum: ['bcrypt'] }, saltRounds: { type: 'integer' }, hash: { type: 'string' } } },
      ],
    },
  })
  hash(@Query('algo') algo: 'md5' | 'sha256' | 'bcrypt' = 'sha256', @Body() body: HashDto) {
    return this.util.hash(algo, body);
  }


  /**
  * Markdown → HTML (sanitized)
  */
  @Post('md2html')
  @ApiOperation({ summary: 'Markdown → HTML (sanitized)' })
  @ApiBody({ description: 'Markdown-Quelltext', type: MarkdownDto, examples: { basic: { value: { markdown: '# Titel\n\n- Punkt' } } } })
  @ApiOkResponse({ description: 'Sanitizer-Ausgabe', schema: { type: 'object', properties: { html: { type: 'string', example: '<h1>Titel</h1>\n<ul>...</ul>' } } } })
  md2html(@Body() body: MarkdownDto) {
    return this.util.md2html(body);
  }
}

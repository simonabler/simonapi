import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { UtilityService } from './utility.service';
import { IdQueryDto } from './dto/id-query.dto';
import { SlugifyDto } from './dto/slugify.dto';
import { HashDto } from './dto/hash.dto';
import { MarkdownDto } from './dto/markdown.dto';


@Controller('utils')
export class UtilityController {
  constructor(private readonly util: UtilityService) {}


  /**
  * Echo & Request-Info
  */
  @Get('echo')
  echo(@Req() req: Request) {
    return this.util.echo(req);
  }


  /**
  * UUID/ULID Generator
  */
  @Get('id')
  generateId(@Query() query: IdQueryDto) {
    return this.util.generateIds(query);
  }


  /**
  * Slugify
  */
  @Post('slugify')
  slugify(@Body() body: SlugifyDto) {
    return this.util.slugify(body);
  }


  /**
  * Hashing
  */
  @Post('hash')
  hash(@Query('algo') algo: 'md5' | 'sha256' | 'bcrypt' = 'sha256', @Body() body: HashDto) {
    return this.util.hash(algo, body);
  }


  /**
  * Markdown → HTML (sanitized)
  */
  @Post('md2html')
  md2html(@Body() body: MarkdownDto) {
    return this.util.md2html(body);
  }
}
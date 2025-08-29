import { BadRequestException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ulid } from 'ulid';
import slugifyLib from 'slugify';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import sanitizeHtml from 'sanitize-html';
import { Marked, marked } from 'marked';
import { IdQueryDto } from './dto/id-query.dto';
import { SlugifyDto } from './dto/slugify.dto';
import { HashDto } from './dto/hash.dto';
import { MarkdownDto } from './dto/markdown.dto';


@Injectable()
export class UtilityService {
  echo(req: Request) {
    return {
      ip: req.ip,
      method: req.method,
      url: req.originalUrl || req.url,
      headers: req.headers,
      timestamp: new Date().toISOString(),
    };
  }


  generateIds({ type = 'uuid', count = 1 }: IdQueryDto) {
    if (count < 1 || count > 1000) {
      throw new BadRequestException('count must be between 1 and 1000');
    }
    const gen = type === 'ulid' ? ulid : uuidv4;
    const ids = Array.from({ length: count }, () => gen());
    return { type, count, ids };
  }


  slugify({ text, lower = true, strict = true, delimiter = '-' }: SlugifyDto) {
    const slug = slugifyLib(text, {
      lower,
      strict,
      remove: /[\u2000-\u206F\u2E00-\u2E7F'"!@#$%^&*()_+=`~.,?<>{}\[\]|/\\:;]+/g,
      replacement: delimiter,
      trim: true,
    });
    return { input: text, slug };
  }


  hash(algo: 'md5' | 'sha256' | 'bcrypt', { data, saltRounds = 10 }: HashDto) {
    if (!data?.length) throw new BadRequestException('data must be non-empty');


    switch (algo) {
      case 'md5':
      case 'sha256': {
        const h = crypto.createHash(algo).update(data, 'utf8').digest('hex');
        return { algo, format: 'hex', hash: h };
      }
      case 'bcrypt': {
        if (saltRounds < 4 || saltRounds > 15) {
          throw new BadRequestException('saltRounds must be between 4 and 15');
        }
        const salt = bcrypt.genSaltSync(saltRounds);
        const h = bcrypt.hashSync(data, salt);
        return { algo, saltRounds, hash: h };
      }
      default:
        throw new BadRequestException('Unsupported algo');
    }
  }


  md2html({ markdown }: MarkdownDto) {
    if (typeof markdown !== 'string') {
      throw new BadRequestException('markdown must be a string');
    }
    const parser = new Marked();
    const rawHtml = parser.parse(markdown) as string;
    const safeHtml = sanitizeHtml(rawHtml, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'img', 'pre', 'code']),
      allowedAttributes: {
        a: ['href', 'name', 'target', 'rel'],
        img: ['src', 'alt', 'title'],
        '*': ['id', 'class'],
      },
      allowedSchemes: ['http', 'https', 'mailto'],
      transformTags: {
        a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
      },
    });
    return { html: safeHtml };
  }
}
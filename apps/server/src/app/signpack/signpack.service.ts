import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Signpack } from './entities/signpack.entity';
import { randomToken } from '../common/token.util';
import * as fs from 'fs';
import * as path from 'path';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import archiver from 'archiver';

export type UploadFile = {
  buffer: Buffer;
  originalname?: string;
  mimetype?: string;
  size?: number;
};

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function getDataDir(): string {
  const p = process.env.DATA_DIR || path.resolve('./data/signpacks');
  ensureDir(p);
  return p;
}

@Injectable()
export class SignpackService {
  constructor(
    @InjectRepository(Signpack) private readonly repo: Repository<Signpack>,
    private readonly http: HttpService,
  ) {}

  private tokenLength(): number {
    return Number(process.env.TOKEN_LENGTH || 32);
  }

  private buildPackDir(id: string): string {
    const dir = path.join(getDataDir(), id);
    ensureDir(dir);
    return dir;
  }

  private uniqueName(base: string): string {
    const ext = path.extname(base || '') || '';
    const stem = path.basename(base || 'file', ext).replace(/[^A-Za-z0-9._-]+/g, '-');
    const ts = Date.now();
    return `${stem || 'file'}-${ts}${ext}`;
  }

  async createFromBuffer(file: UploadFile, expiresInMinutes?: number): Promise<Signpack> {
    if (!file?.buffer?.length) throw new BadRequestException('No file provided');
    const sp = new Signpack();
    sp.accessToken = randomToken(this.tokenLength());
    sp.status = 'UPLOADED';
    sp.expiresAt = expiresInMinutes ? new Date(Date.now() + expiresInMinutes * 60_000) : null;

    // Save original
    const idTemp = 'tmp-' + randomToken(8);
    const dir = this.buildPackDir(idTemp);
    const originalName = file.originalname || 'upload.bin';
    const savedName = this.uniqueName(originalName);
    const abs = path.join(dir, savedName);
    fs.writeFileSync(abs, file.buffer);

    sp.originalName = originalName;
    sp.originalPath = abs;
    sp.originalMime = file.mimetype;
    sp.originalSize = file.size ?? file.buffer.length;

    // Persist to get a real UUID as id
    const created = await this.repo.save(sp);

    // Move folder from tmp to real id folder if needed
    const realDir = this.buildPackDir(created.id);
    if (dir !== realDir) {
      const newPath = path.join(realDir, path.basename(abs));
      fs.renameSync(abs, newPath);
      try { fs.rmdirSync(dir); } catch {}
      created.originalPath = newPath;
      await this.repo.save(created);
    }

    return created;
  }

  private isExpired(sp: Signpack): boolean {
    return !!sp.expiresAt && sp.expiresAt.getTime() < Date.now();
  }

  async findById(id: string): Promise<Signpack> {
    const sp = await this.repo.findOne({ where: { id } });
    if (!sp || sp.destroyedAt) throw new NotFoundException('Signpack not found');
    if (this.isExpired(sp) && sp.status !== 'DELETED') {
      sp.status = 'EXPIRED';
      await this.repo.save(sp);
    }
    return sp;
  }

  private assertToken(sp: Signpack, token?: string) {
    if (!token || token !== sp.accessToken) throw new ForbiddenException('Invalid token');
  }

  async uploadSignedFromBuffer(id: string, token: string, file: UploadFile): Promise<Signpack> {
    const sp = await this.findById(id);
    this.assertToken(sp, token);
    if (!file?.buffer?.length) throw new BadRequestException('No file provided');
    const dir = this.buildPackDir(sp.id);
    const savedName = this.uniqueName(file.originalname || 'signed.bin');
    const abs = path.join(dir, savedName);
    fs.writeFileSync(abs, file.buffer);
    sp.signedName = file.originalname || savedName;
    sp.signedPath = abs;
    sp.signedMime = file.mimetype;
    sp.signedSize = file.size ?? file.buffer.length;
    sp.status = 'SIGNED';
    return this.repo.save(sp);
  }

  async uploadSignedFromRemote(id: string, token: string, remoteUrl: string): Promise<Signpack> {
    const sp = await this.findById(id);
    this.assertToken(sp, token);
    if (!remoteUrl) throw new BadRequestException('remoteUrl required');
    const resp = await firstValueFrom(
      this.http.get(remoteUrl, { responseType: 'stream', validateStatus: () => true }),
    );
    if (resp.status >= 400) throw new BadRequestException(`Fetch failed: ${resp.status}`);
    const dir = this.buildPackDir(sp.id);
    const urlName = path.basename(new URL(remoteUrl).pathname) || 'remote.bin';
    const savedName = this.uniqueName(urlName);
    const abs = path.join(dir, savedName);
    const out = fs.createWriteStream(abs);
    await new Promise<void>((resolve, reject) => {
      resp.data.pipe(out);
      out.on('finish', resolve);
      out.on('error', reject);
      resp.data.on('error', reject);
    });
    const stat = fs.statSync(abs);
    sp.signedName = urlName;
    sp.signedPath = abs;
    sp.signedSize = stat.size;
    sp.status = 'SIGNED';
    return this.repo.save(sp);
  }

  streamFile(absPath: string) {
    if (!absPath || !fs.existsSync(absPath)) throw new NotFoundException('File not found');
    return fs.createReadStream(absPath);
  }

  async destroy(id: string, token: string): Promise<void> {
    const sp = await this.findById(id);
    this.assertToken(sp, token);
    const toDelete = [sp.originalPath, sp.signedPath].filter(Boolean) as string[];
    for (const p of toDelete) {
      try { fs.unlinkSync(p); } catch {}
    }
    sp.destroyedAt = new Date();
    sp.status = 'DELETED';
    await this.repo.save(sp);
  }

  async purgeExpired(): Promise<number> {
    const now = new Date();
    const all = await this.repo.find();
    let purged = 0;
    for (const sp of all) {
      if (sp.destroyedAt) continue;
      if (sp.expiresAt && sp.expiresAt < now) {
        try {
          const toDelete = [sp.originalPath, sp.signedPath].filter(Boolean) as string[];
          for (const p of toDelete) {
            try { fs.unlinkSync(p); } catch {}
          }
          sp.destroyedAt = new Date();
          sp.status = 'EXPIRED';
          await this.repo.save(sp);
          purged++;
        } catch {}
      }
    }
    return purged;
  }

  streamBundleZip(sp: Signpack) {
    const archive = archiver('zip', { zlib: { level: 9 } });
    if (sp.originalPath && fs.existsSync(sp.originalPath)) {
      archive.file(sp.originalPath, { name: sp.originalName || 'original.bin' });
    }
    if (sp.signedPath && fs.existsSync(sp.signedPath)) {
      archive.file(sp.signedPath, { name: sp.signedName || 'signed.bin' });
    }
    archive.finalize();
    return archive;
  }
}


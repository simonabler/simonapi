import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Signpack } from './entities/signpack.entity';
import { SignpackService } from './signpack.service';
import { HttpModule } from '@nestjs/axios';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('SignpackService', () => {
  let service: SignpackService;
  let repo: jest.Mocked<Repository<Signpack>>;
  const tmpDir = path.join(os.tmpdir(), 'signpack-spec-' + Date.now());

  beforeAll(() => {
    process.env.DATA_DIR = tmpDir;
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterAll(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        SignpackService,
        {
          provide: getRepositoryToken(Signpack),
          useValue: {
            save: jest.fn(async (sp: Signpack) => {
              // emulate id assignment on first save
              if (!sp.id) (sp as any).id = '11111111-1111-1111-1111-111111111111';
              return sp;
            }),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(SignpackService);
    repo = module.get(getRepositoryToken(Signpack));
  });

  it('createFromBuffer stores original and sets UPLOADED', async () => {
    const buf = Buffer.from('hello');
    const sp = await service.createFromBuffer({ buffer: buf, originalname: 'hello.txt', mimetype: 'text/plain' }, 10);
    expect(sp.id).toBeDefined();
    expect(sp.status).toBe('UPLOADED');
    expect(fs.existsSync(sp.originalPath)).toBe(true);
    expect(path.dirname(sp.originalPath)).toMatch(sp.id);
  });

  it('uploadSignedFromBuffer sets SIGNED and filled fields', async () => {
    const nowSp: Signpack = {
      id: '22222222-2222-2222-2222-222222222222',
      accessToken: 'tok',
      originalName: 'o.bin',
      originalPath: path.join(tmpDir, 'x'),
      status: 'UPLOADED',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
    (repo.findOne as any).mockResolvedValue(nowSp);
    const sp = await service.uploadSignedFromBuffer(nowSp.id, 'tok', { buffer: Buffer.from('signed'), originalname: 's.bin' });
    expect(sp.status).toBe('SIGNED');
    expect(sp.signedPath).toBeDefined();
    expect(sp.signedName).toBe('s.bin');
    expect(fs.existsSync(sp.signedPath!)).toBe(true);
  });

  it('findById marks expired as EXPIRED', async () => {
    const exp = new Date(Date.now() - 60_000);
    const nowSp: Signpack = {
      id: '33333333-3333-3333-3333-333333333333',
      accessToken: 'tok',
      originalName: 'o.bin',
      originalPath: path.join(tmpDir, 'x'),
      expiresAt: exp,
      status: 'UPLOADED',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
    (repo.findOne as any).mockResolvedValue(nowSp);
    const sp = await service.findById(nowSp.id);
    expect(sp.status).toBe('EXPIRED');
  });

  it('destroy deletes files and marks DELETED', async () => {
    const p1 = path.join(tmpDir, 'a');
    const p2 = path.join(tmpDir, 'b');
    fs.writeFileSync(p1, '1');
    fs.writeFileSync(p2, '2');
    const nowSp: Signpack = {
      id: '44444444-4444-4444-4444-444444444444',
      accessToken: 'tok',
      originalName: 'o.bin',
      originalPath: p1,
      signedName: 's.bin',
      signedPath: p2,
      status: 'UPLOADED',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
    (repo.findOne as any).mockResolvedValue(nowSp);
    const spyUnlink = jest.spyOn(fs, 'unlinkSync');
    await service.destroy(nowSp.id, 'tok');
    expect(spyUnlink).toHaveBeenCalled();
    expect(nowSp.status).toBe('DELETED');
  });
});


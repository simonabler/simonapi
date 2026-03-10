import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash } from 'crypto';

import { ApiKeyService, TIER_LIMITS } from './api-key.service';
import { ApiKeyGuard } from './api-key.guard';
import { ApiKeyEntity, ApiKeyTier } from './entities/api-key.entity';
import { REQUIRES_TIER_KEY } from './api-key.decorator';

// ── helpers ──────────────────────────────────────────────────────────────────

function sha256(s: string) {
  return createHash('sha256').update(s).digest('hex');
}

function makeEntity(overrides: Partial<ApiKeyEntity> = {}): ApiKeyEntity {
  return {
    id: 'uuid-1',
    label: 'test',
    prefix: 'sk_pro_aBcD',
    keyHash: sha256('sk_pro_aBcDEFGHIJKLMNOPQRSTUVWXYZ12345678'),
    tier: 'pro',
    active: true,
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as ApiKeyEntity;
}

function mockRepo(entity: ApiKeyEntity | null = makeEntity()) {
  return {
    findOneBy: jest.fn().mockResolvedValue(entity),
    find: jest.fn().mockResolvedValue(entity ? [entity] : []),
    save: jest.fn().mockImplementation((e: any) => Promise.resolve(e)),
    create: jest.fn().mockImplementation((e: any) => e),
    update: jest.fn().mockResolvedValue(undefined),
  } as unknown as Repository<ApiKeyEntity>;
}

function makeContext(overrides: { minTier?: ApiKeyTier | undefined; header?: string } = {}) {
  const req: any = { headers: {} };
  if (overrides.header !== undefined) req.headers['x-api-key'] = overrides.header;

  const ctx = {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;

  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(overrides.minTier),
  } as unknown as Reflector;

  return { ctx, req, reflector };
}

// ── ApiKeyService ─────────────────────────────────────────────────────────────

describe('ApiKeyService', () => {
  let svc: ApiKeyService;
  let repo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    repo = mockRepo();
    const mod = await Test.createTestingModule({
      providers: [
        ApiKeyService,
        { provide: getRepositoryToken(ApiKeyEntity), useValue: repo },
      ],
    }).compile();
    svc = mod.get(ApiKeyService);
  });

  // ── validate ────────────────────────────────────────────────────────────

  describe('validate()', () => {
    it('returns null for empty string', async () => {
      expect(await svc.validate('')).toBeNull();
    });

    it('returns null for string not starting with sk_', async () => {
      expect(await svc.validate('abc123')).toBeNull();
    });

    it('returns null when repo returns no record', async () => {
      (repo.findOneBy as jest.Mock).mockResolvedValue(null);
      expect(await svc.validate('sk_pro_ABCDEFGHIJKLMNOPQRSTUVWXYZ123456')).toBeNull();
    });

    it('returns null when hash does not match', async () => {
      const entity = makeEntity({ keyHash: sha256('different_key') });
      (repo.findOneBy as jest.Mock).mockResolvedValue(entity);
      expect(await svc.validate('sk_pro_aBcDEFGHIJKLMNOPQRSTUVWXYZ12345678')).toBeNull();
    });

    it('returns resolved key on valid match', async () => {
      const rawKey = 'sk_pro_aBcDEFGHIJKLMNOPQRSTUVWXYZ12345678';
      const entity = makeEntity({ keyHash: sha256(rawKey) });
      (repo.findOneBy as jest.Mock).mockResolvedValue(entity);

      const result = await svc.validate(rawKey);
      expect(result).toMatchObject({ id: 'uuid-1', tier: 'pro', label: 'test' });
    });

    it('returns null for expired key', async () => {
      const rawKey = 'sk_pro_aBcDEFGHIJKLMNOPQRSTUVWXYZ12345678';
      const entity = makeEntity({
        keyHash: sha256(rawKey),
        expiresAt: new Date(Date.now() - 1000), // 1 second in the past
      });
      (repo.findOneBy as jest.Mock).mockResolvedValue(entity);

      expect(await svc.validate(rawKey)).toBeNull();
    });

    it('accepts key with future expiry', async () => {
      const rawKey = 'sk_pro_aBcDEFGHIJKLMNOPQRSTUVWXYZ12345678';
      const entity = makeEntity({
        keyHash: sha256(rawKey),
        expiresAt: new Date(Date.now() + 100_000),
      });
      (repo.findOneBy as jest.Mock).mockResolvedValue(entity);

      expect(await svc.validate(rawKey)).not.toBeNull();
    });

    it('returns null for inactive key (repo returns null due to active:true filter)', async () => {
      (repo.findOneBy as jest.Mock).mockResolvedValue(null);
      expect(await svc.validate('sk_pro_aBcDEFGHIJKLMNOPQRSTUVWXYZ12345678')).toBeNull();
    });

    it('validates free tier key', async () => {
      const rawKey = 'sk_free_ABCDEFGHIJKLMNOPQRSTUVWXYZ123456';
      const entity = makeEntity({ keyHash: sha256(rawKey), tier: 'free', prefix: 'sk_free_ABCD' });
      (repo.findOneBy as jest.Mock).mockResolvedValue(entity);

      const result = await svc.validate(rawKey);
      expect(result?.tier).toBe('free');
    });

    it('validates industrial tier key', async () => {
      const rawKey = 'sk_ind_ABCDEFGHIJKLMNOPQRSTUVWXYZ123456';
      const entity = makeEntity({ keyHash: sha256(rawKey), tier: 'industrial', prefix: 'sk_ind_ABCD' });
      (repo.findOneBy as jest.Mock).mockResolvedValue(entity);

      const result = await svc.validate(rawKey);
      expect(result?.tier).toBe('industrial');
    });
  });

  // ── create ───────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('returns a raw key that starts with the tier prefix', async () => {
      const { rawKey } = await svc.create('test-label', 'pro');
      expect(rawKey).toMatch(/^sk_pro_/);
    });

    it('returns a raw key with at least 39 characters', async () => {
      const { rawKey } = await svc.create('test-label', 'industrial');
      expect(rawKey.length).toBeGreaterThanOrEqual(39);
    });

    it('saves entity with hashed key, not raw key', async () => {
      const { rawKey } = await svc.create('test-label', 'pro');
      const saved = (repo.save as jest.Mock).mock.calls[0][0];
      expect(saved.keyHash).not.toBe(rawKey);
      expect(saved.keyHash).toBe(sha256(rawKey));
    });

    it('sets active=true on new key', async () => {
      await svc.create('label', 'free');
      const saved = (repo.save as jest.Mock).mock.calls[0][0];
      expect(saved.active).toBe(true);
    });

    it('sets expiry when provided', async () => {
      const exp = new Date(Date.now() + 86_400_000);
      await svc.create('label', 'pro', exp);
      const saved = (repo.save as jest.Mock).mock.calls[0][0];
      expect(saved.expiresAt).toEqual(exp);
    });

    it('sets expiresAt to null when not provided', async () => {
      await svc.create('label', 'pro');
      const saved = (repo.save as jest.Mock).mock.calls[0][0];
      expect(saved.expiresAt).toBeNull();
    });

    it('creates industrial key with sk_ind_ prefix', async () => {
      const { rawKey } = await svc.create('label', 'industrial');
      expect(rawKey).toMatch(/^sk_ind_/);
    });

    it('creates free key with sk_free_ prefix', async () => {
      const { rawKey } = await svc.create('label', 'free');
      expect(rawKey).toMatch(/^sk_free_/);
    });
  });

  // ── revoke ───────────────────────────────────────────────────────────────

  describe('revoke()', () => {
    it('calls repo.update with active: false', async () => {
      await svc.revoke('uuid-1');
      expect(repo.update).toHaveBeenCalledWith('uuid-1', { active: false });
    });
  });

  // ── list ─────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('strips keyHash from returned entries', async () => {
      const result = await svc.list();
      expect(result[0]).not.toHaveProperty('keyHash');
    });

    it('returns other fields intact', async () => {
      const result = await svc.list();
      expect(result[0]).toMatchObject({ id: 'uuid-1', tier: 'pro', label: 'test' });
    });
  });
});

// ── TIER_LIMITS ───────────────────────────────────────────────────────────────

describe('TIER_LIMITS', () => {
  it('free tier has perMinute=10', () => {
    expect(TIER_LIMITS.free.perMinute).toBe(10);
  });

  it('pro tier has perMinute=100 and perDay=10000', () => {
    expect(TIER_LIMITS.pro.perMinute).toBe(100);
    expect(TIER_LIMITS.pro.perDay).toBe(10_000);
  });

  it('industrial tier has perMinute=1000 and no perDay limit', () => {
    expect(TIER_LIMITS.industrial.perMinute).toBe(1000);
    expect(TIER_LIMITS.industrial.perDay).toBeNull();
  });
});

// ── ApiKeyGuard ───────────────────────────────────────────────────────────────

describe('ApiKeyGuard', () => {
  let svc: ApiKeyService;
  let guard: ApiKeyGuard;

  beforeEach(async () => {
    const repo = mockRepo();
    const mod = await Test.createTestingModule({
      providers: [
        ApiKeyService,
        ApiKeyGuard,
        Reflector,
        { provide: getRepositoryToken(ApiKeyEntity), useValue: repo },
      ],
    }).compile();

    svc = mod.get(ApiKeyService);
    guard = mod.get(ApiKeyGuard);
  });

  it('allows request when no @RequiresTier is set', async () => {
    const { ctx, reflector } = makeContext({ minTier: undefined });
    const g = new ApiKeyGuard(reflector, svc);
    expect(await g.canActivate(ctx)).toBe(true);
  });

  it('throws UnauthorizedException when header is missing and tier is required', async () => {
    const { ctx, reflector } = makeContext({ minTier: 'pro' });
    const g = new ApiKeyGuard(reflector, svc);
    await expect(g.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException for invalid key', async () => {
    jest.spyOn(svc, 'validate').mockResolvedValue(null);
    const { ctx, reflector } = makeContext({ minTier: 'pro', header: 'sk_pro_invalid' });
    const g = new ApiKeyGuard(reflector, svc);
    await expect(g.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('throws ForbiddenException when key tier is too low (free key, pro required)', async () => {
    jest.spyOn(svc, 'validate').mockResolvedValue({ id: 'x', label: 'y', tier: 'free' });
    const { ctx, reflector } = makeContext({ minTier: 'pro', header: 'sk_free_something' });
    const g = new ApiKeyGuard(reflector, svc);
    await expect(g.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('allows pro key for pro-required endpoint', async () => {
    jest.spyOn(svc, 'validate').mockResolvedValue({ id: 'x', label: 'y', tier: 'pro' });
    const { ctx, reflector } = makeContext({ minTier: 'pro', header: 'sk_pro_valid' });
    const g = new ApiKeyGuard(reflector, svc);
    expect(await g.canActivate(ctx)).toBe(true);
  });

  it('allows industrial key for pro-required endpoint', async () => {
    jest.spyOn(svc, 'validate').mockResolvedValue({ id: 'x', label: 'y', tier: 'industrial' });
    const { ctx, reflector } = makeContext({ minTier: 'pro', header: 'sk_ind_valid' });
    const g = new ApiKeyGuard(reflector, svc);
    expect(await g.canActivate(ctx)).toBe(true);
  });

  it('throws ForbiddenException when pro key used for industrial-required endpoint', async () => {
    jest.spyOn(svc, 'validate').mockResolvedValue({ id: 'x', label: 'y', tier: 'pro' });
    const { ctx, reflector } = makeContext({ minTier: 'industrial', header: 'sk_pro_valid' });
    const g = new ApiKeyGuard(reflector, svc);
    await expect(g.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('attaches resolved key to request on success', async () => {
    jest.spyOn(svc, 'validate').mockResolvedValue({ id: 'id-1', label: 'lbl', tier: 'pro' });
    const { ctx, req, reflector } = makeContext({ minTier: 'pro', header: 'sk_pro_valid' });
    const g = new ApiKeyGuard(reflector, svc);
    await g.canActivate(ctx);
    expect(req['__resolvedApiKey']).toMatchObject({ id: 'id-1', tier: 'pro' });
  });

  it('throws UnauthorizedException on DB error during validation', async () => {
    jest.spyOn(svc, 'validate').mockRejectedValue(new Error('DB down'));
    const { ctx, reflector } = makeContext({ minTier: 'pro', header: 'sk_pro_valid' });
    const g = new ApiKeyGuard(reflector, svc);
    await expect(g.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });
});

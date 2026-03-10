import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { of, throwError } from 'rxjs';
import { CryptoPageComponent } from './crypto-page.component';
import { CryptoApiService } from './crypto.service';
import {
  TotpSetupResult, TotpVerifyResult, TotpGenerateResult,
  CryptoHashResult, HmacResult,
  Ed25519KeypairResult, Ed25519SignResult, Ed25519VerifyResult,
  JwtKeypairResult, JwtEncodeResult, JwtDecodeResult, JwtVerifyResult,
} from './models';

// ---------------------------------------------------------------------------
// Stubs / fixtures
// ---------------------------------------------------------------------------

const TOTP_SETUP: TotpSetupResult = {
  secret: 'JBSWY3DPEHPK3PXP', otpauthUri: 'otpauth://totp/App:user', qrCode: '<svg/>',
  qrFormat: 'svg', algorithm: 'SHA1', digits: 6, period: 30,
};
const TOTP_VERIFY_OK:   TotpVerifyResult    = { valid: true,  delta: 0 };
const TOTP_VERIFY_FAIL: TotpVerifyResult    = { valid: false, delta: null };
const TOTP_GENERATE:    TotpGenerateResult  = { token: '123456', validFor: 18 };
const HASH_RESULT:      CryptoHashResult    = { algo: 'sha256', format: 'hex', hash: 'abc123' };
const HMAC_RESULT:      HmacResult          = { algorithm: 'sha256', encoding: 'hex', hmac: 'dead' };
const ED_KP:            Ed25519KeypairResult = {
  publicKey: '-----BEGIN PUBLIC KEY-----\nPUB\n-----END PUBLIC KEY-----\n',
  privateKey: '-----BEGIN PRIVATE KEY-----\nPRIV\n-----END PRIVATE KEY-----\n',
  publicKeyHex: 'aabb', privateKeyHex: 'ccdd',
};
const ED_SIGN:   Ed25519SignResult   = { signature: 'sigsig', encoding: 'hex' };
const ED_VERIFY: Ed25519VerifyResult = { valid: true };
const JWT_KP:     JwtKeypairResult   = { algorithm: 'RS256', publicKey: 'PUB', privateKey: 'PRIV' };
const JWT_ENC:    JwtEncodeResult    = { token: 'eyJ.payload.sig', expiresAt: '2099-01-01T00:00:00.000Z' };
const JWT_DEC:    JwtDecodeResult    = {
  header: { alg: 'HS256', typ: 'JWT' }, payload: { sub: '1' }, signature: 'sig',
  expired: false, expiresAt: '2099-01-01T00:00:00.000Z',
};
const JWT_VER: JwtVerifyResult = { valid: true, payload: { sub: '1' }, expired: false };

function mockApi(overrides: Partial<Record<keyof CryptoApiService, unknown>> = {}): Partial<CryptoApiService> {
  return {
    totpSetup$:      jest.fn().mockReturnValue(of(TOTP_SETUP)),
    totpVerify$:     jest.fn().mockReturnValue(of(TOTP_VERIFY_OK)),
    totpGenerate$:   jest.fn().mockReturnValue(of(TOTP_GENERATE)),
    hash$:           jest.fn().mockReturnValue(of(HASH_RESULT)),
    hmac$:           jest.fn().mockReturnValue(of(HMAC_RESULT)),
    ed25519Keypair$: jest.fn().mockReturnValue(of(ED_KP)),
    ed25519Sign$:    jest.fn().mockReturnValue(of(ED_SIGN)),
    ed25519Verify$:  jest.fn().mockReturnValue(of(ED_VERIFY)),
    jwtKeypair$:     jest.fn().mockReturnValue(of(JWT_KP)),
    jwtEncode$:      jest.fn().mockReturnValue(of(JWT_ENC)),
    jwtDecode$:      jest.fn().mockReturnValue(of(JWT_DEC)),
    jwtVerify$:      jest.fn().mockReturnValue(of(JWT_VER)),
    ...overrides,
  };
}

async function create(apiOverrides: Partial<Record<keyof CryptoApiService, unknown>> = {}) {
  const api = mockApi(apiOverrides);
  await TestBed.configureTestingModule({
    imports: [CryptoPageComponent, ReactiveFormsModule, CommonModule],
    providers: [{ provide: CryptoApiService, useValue: api }],
  }).compileComponents();

  const fixture = TestBed.createComponent(CryptoPageComponent);
  const comp    = fixture.componentInstance;
  fixture.detectChanges();
  return { fixture, comp, api };
}

// ---------------------------------------------------------------------------
// Tab navigation
// ---------------------------------------------------------------------------

describe('CryptoPageComponent — tab navigation', () => {
  it('starts on mainTab=totp', async () => {
    const { comp } = await create();
    expect(comp.mainTab).toBe('totp');
  });

  it('switches mainTab when set', async () => {
    const { comp } = await create();
    comp.mainTab = 'hash';
    expect(comp.mainTab).toBe('hash');
  });

  it('starts on totpTab=setup', async () => {
    const { comp } = await create();
    expect(comp.totpTab).toBe('setup');
  });

  it('starts on hashTab=hash', async () => {
    const { comp } = await create();
    expect(comp.hashTab).toBe('hash');
  });

  it('starts on ed25519Tab=keypair', async () => {
    const { comp } = await create();
    expect(comp.ed25519Tab).toBe('keypair');
  });

  it('starts on jwtTab=keypair', async () => {
    const { comp } = await create();
    expect(comp.jwtTab).toBe('keypair');
  });
});

// ---------------------------------------------------------------------------
// TOTP Setup
// ---------------------------------------------------------------------------

describe('CryptoPageComponent — TOTP Setup', () => {
  it('form is valid with default values', async () => {
    const { comp } = await create();
    expect(comp.totpSetupForm.valid).toBe(true);
  });

  it('form is invalid when accountName is empty', async () => {
    const { comp } = await create();
    comp.totpSetupForm.get('accountName')!.setValue('');
    expect(comp.totpSetupForm.invalid).toBe(true);
  });

  it('submitTotpSetup calls api.totpSetup$', async () => {
    const { comp, api } = await create();
    comp.submitTotpSetup();
    expect(api.totpSetup$).toHaveBeenCalledWith(expect.objectContaining({ accountName: 'simon@example.com' }));
  });

  it('totpSetupResult is set on success', fakeAsync(async () => {
    const { comp } = await create();
    comp.submitTotpSetup();
    tick();
    expect(comp.totpSetupResult).toEqual(TOTP_SETUP);
  }));

  it('loading is false after response', fakeAsync(async () => {
    const { comp } = await create();
    comp.submitTotpSetup();
    tick();
    expect(comp.loading()).toBe(false);
  }));

  it('totpSetupError is set on API error', fakeAsync(async () => {
    const { comp } = await create({ totpSetup$: jest.fn().mockReturnValue(throwError(() => ({ error: { message: 'bad secret' } }))) });
    comp.submitTotpSetup();
    tick();
    expect(comp.totpSetupError).toBe('bad secret');
    expect(comp.totpSetupResult).toBeNull();
  }));

  it('does not call API when form is invalid', async () => {
    const { comp, api } = await create();
    comp.totpSetupForm.get('accountName')!.setValue('');
    comp.submitTotpSetup();
    expect(api.totpSetup$).not.toHaveBeenCalled();
  });

  it('clears previous result before new request', fakeAsync(async () => {
    const { comp } = await create();
    comp.totpSetupResult = TOTP_SETUP;
    comp.submitTotpSetup();
    expect(comp.totpSetupResult).toBeNull();
    tick();
  }));
});

// ---------------------------------------------------------------------------
// TOTP Verify
// ---------------------------------------------------------------------------

describe('CryptoPageComponent — TOTP Verify', () => {
  it('form is invalid with empty secret', async () => {
    const { comp } = await create();
    comp.totpVerifyForm.setValue({ secret: '', token: '123456', window: 1 });
    expect(comp.totpVerifyForm.invalid).toBe(true);
  });

  it('form is invalid with 5-char token', async () => {
    const { comp } = await create();
    comp.totpVerifyForm.setValue({ secret: 'ABC', token: '12345', window: 1 });
    expect(comp.totpVerifyForm.invalid).toBe(true);
  });

  it('form is valid with proper values', async () => {
    const { comp } = await create();
    comp.totpVerifyForm.setValue({ secret: 'JBSWY3DP', token: '123456', window: 1 });
    expect(comp.totpVerifyForm.valid).toBe(true);
  });

  it('calls totpVerify$ with form values', async () => {
    const { comp, api } = await create();
    comp.totpVerifyForm.setValue({ secret: 'JBSWY3DP', token: '654321', window: 1 });
    comp.submitTotpVerify();
    expect(api.totpVerify$).toHaveBeenCalledWith({ secret: 'JBSWY3DP', token: '654321', window: 1 });
  });

  it('totpVerifyResult.valid=true on success', fakeAsync(async () => {
    const { comp } = await create();
    comp.totpVerifyForm.setValue({ secret: 'JBSWY3DP', token: '123456', window: 1 });
    comp.submitTotpVerify();
    tick();
    expect(comp.totpVerifyResult?.valid).toBe(true);
  }));

  it('totpVerifyResult.valid=false on invalid token response', fakeAsync(async () => {
    const { comp } = await create({ totpVerify$: jest.fn().mockReturnValue(of(TOTP_VERIFY_FAIL)) });
    comp.totpVerifyForm.setValue({ secret: 'JBSWY3DP', token: '000000', window: 1 });
    comp.submitTotpVerify();
    tick();
    expect(comp.totpVerifyResult?.valid).toBe(false);
  }));
});

// ---------------------------------------------------------------------------
// TOTP Generate
// ---------------------------------------------------------------------------

describe('CryptoPageComponent — TOTP Generate', () => {
  it('form is invalid with empty secret', async () => {
    const { comp } = await create();
    comp.totpGenerateForm.get('secret')!.setValue('');
    expect(comp.totpGenerateForm.invalid).toBe(true);
  });

  it('calls totpGenerate$ with form values', async () => {
    const { comp, api } = await create();
    comp.totpGenerateForm.setValue({ secret: 'JBSWY3DP', period: 30, digits: 6 });
    comp.submitTotpGenerate();
    expect(api.totpGenerate$).toHaveBeenCalledWith({ secret: 'JBSWY3DP', period: 30, digits: 6 });
  });

  it('totpGenerateResult is populated on success', fakeAsync(async () => {
    const { comp } = await create();
    comp.totpGenerateForm.get('secret')!.setValue('JBSWY3DP');
    comp.submitTotpGenerate();
    tick();
    expect(comp.totpGenerateResult).toEqual(TOTP_GENERATE);
  }));
});

// ---------------------------------------------------------------------------
// Hash
// ---------------------------------------------------------------------------

describe('CryptoPageComponent — Hash', () => {
  it('showSaltRounds is false for sha256', async () => {
    const { comp } = await create();
    comp.hashForm.get('algo')!.setValue('sha256');
    expect(comp.showSaltRounds).toBe(false);
  });

  it('showSaltRounds is true for bcrypt', async () => {
    const { comp } = await create();
    comp.hashForm.get('algo')!.setValue('bcrypt');
    expect(comp.showSaltRounds).toBe(true);
  });

  it('calls hash$ with form values', async () => {
    const { comp, api } = await create();
    comp.hashForm.setValue({ data: 'hello', algo: 'sha256', saltRounds: 10 });
    comp.submitHash();
    expect(api.hash$).toHaveBeenCalledWith(expect.objectContaining({ data: 'hello', algo: 'sha256' }));
  });

  it('hashResult is set on success', fakeAsync(async () => {
    const { comp } = await create();
    comp.submitHash();
    tick();
    expect(comp.hashResult).toEqual(HASH_RESULT);
  }));

  it('hashError is set on API error', fakeAsync(async () => {
    const { comp } = await create({ hash$: jest.fn().mockReturnValue(throwError(() => ({ error: { message: 'unsupported' } }))) });
    comp.submitHash();
    tick();
    expect(comp.hashError).toBe('unsupported');
  }));

  it('does not call API when data is empty', async () => {
    const { comp, api } = await create();
    comp.hashForm.get('data')!.setValue('');
    comp.submitHash();
    expect(api.hash$).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// HMAC
// ---------------------------------------------------------------------------

describe('CryptoPageComponent — HMAC', () => {
  it('form is valid with default values', async () => {
    const { comp } = await create();
    expect(comp.hmacForm.valid).toBe(true);
  });

  it('form is invalid when key is empty', async () => {
    const { comp } = await create();
    comp.hmacForm.get('key')!.setValue('');
    expect(comp.hmacForm.invalid).toBe(true);
  });

  it('calls hmac$ with form values', async () => {
    const { comp, api } = await create();
    comp.hmacForm.setValue({ data: 'msg', key: 'k', algorithm: 'sha256', encoding: 'hex' });
    comp.submitHmac();
    expect(api.hmac$).toHaveBeenCalledWith({ data: 'msg', key: 'k', algorithm: 'sha256', encoding: 'hex' });
  });

  it('hmacResult is set on success', fakeAsync(async () => {
    const { comp } = await create();
    comp.submitHmac();
    tick();
    expect(comp.hmacResult).toEqual(HMAC_RESULT);
  }));
});

// ---------------------------------------------------------------------------
// Ed25519 Keypair
// ---------------------------------------------------------------------------

describe('CryptoPageComponent — Ed25519 Keypair', () => {
  it('calls ed25519Keypair$ on generateEd25519Keypair()', async () => {
    const { comp, api } = await create();
    comp.generateEd25519Keypair();
    expect(api.ed25519Keypair$).toHaveBeenCalled();
  });

  it('ed25519KeypairResult is set on success', fakeAsync(async () => {
    const { comp } = await create();
    comp.generateEd25519Keypair();
    tick();
    expect(comp.ed25519KeypairResult).toEqual(ED_KP);
  }));

  it('ed25519KeypairError is set on failure', fakeAsync(async () => {
    const { comp } = await create({ ed25519Keypair$: jest.fn().mockReturnValue(throwError(() => ({ error: { message: 'keypair error' } }))) });
    comp.generateEd25519Keypair();
    tick();
    expect(comp.ed25519KeypairError).toBe('keypair error');
  }));
});

// ---------------------------------------------------------------------------
// Ed25519 Sign
// ---------------------------------------------------------------------------

describe('CryptoPageComponent — Ed25519 Sign', () => {
  it('form is invalid when privateKey is empty', async () => {
    const { comp } = await create();
    comp.ed25519SignForm.get('privateKey')!.setValue('');
    expect(comp.ed25519SignForm.invalid).toBe(true);
  });

  it('does not call API when form is invalid', async () => {
    const { comp, api } = await create();
    comp.ed25519SignForm.get('privateKey')!.setValue('');
    comp.submitEd25519Sign();
    expect(api.ed25519Sign$).not.toHaveBeenCalled();
  });

  it('calls ed25519Sign$ with form values', async () => {
    const { comp, api } = await create();
    comp.ed25519SignForm.setValue({ message: 'hello', privateKey: 'PRIV', encoding: 'hex' });
    comp.submitEd25519Sign();
    expect(api.ed25519Sign$).toHaveBeenCalledWith({ message: 'hello', privateKey: 'PRIV', encoding: 'hex' });
  });

  it('ed25519SignResult is set on success', fakeAsync(async () => {
    const { comp } = await create();
    comp.ed25519SignForm.setValue({ message: 'hello', privateKey: 'PRIV', encoding: 'hex' });
    comp.submitEd25519Sign();
    tick();
    expect(comp.ed25519SignResult).toEqual(ED_SIGN);
  }));
});

// ---------------------------------------------------------------------------
// Ed25519 Verify
// ---------------------------------------------------------------------------

describe('CryptoPageComponent — Ed25519 Verify', () => {
  it('form is invalid when signature is empty', async () => {
    const { comp } = await create();
    comp.ed25519VerifyForm.setValue({ message: 'data', signature: '', publicKey: 'PUB', encoding: 'hex' });
    expect(comp.ed25519VerifyForm.invalid).toBe(true);
  });

  it('calls ed25519Verify$ with form values', async () => {
    const { comp, api } = await create();
    comp.ed25519VerifyForm.setValue({ message: 'data', signature: 'sig', publicKey: 'PUB', encoding: 'hex' });
    comp.submitEd25519Verify();
    expect(api.ed25519Verify$).toHaveBeenCalledWith({ message: 'data', signature: 'sig', publicKey: 'PUB', encoding: 'hex' });
  });

  it('ed25519VerifyResult.valid=true on success', fakeAsync(async () => {
    const { comp } = await create();
    comp.ed25519VerifyForm.setValue({ message: 'data', signature: 'sig', publicKey: 'PUB', encoding: 'hex' });
    comp.submitEd25519Verify();
    tick();
    expect(comp.ed25519VerifyResult?.valid).toBe(true);
  }));

  it('ed25519VerifyResult.valid=false on invalid signature', fakeAsync(async () => {
    const { comp } = await create({ ed25519Verify$: jest.fn().mockReturnValue(of({ valid: false })) });
    comp.ed25519VerifyForm.setValue({ message: 'data', signature: 'bad', publicKey: 'PUB', encoding: 'hex' });
    comp.submitEd25519Verify();
    tick();
    expect(comp.ed25519VerifyResult?.valid).toBe(false);
  }));
});

// ---------------------------------------------------------------------------
// JWT Keypair
// ---------------------------------------------------------------------------

describe('CryptoPageComponent — JWT Keypair', () => {
  it('default jwtKeypairAlgo is RS256', async () => {
    const { comp } = await create();
    expect(comp.jwtKeypairAlgo).toBe('RS256');
  });

  it('calls jwtKeypair$ with current algo', async () => {
    const { comp, api } = await create();
    comp.jwtKeypairAlgo = 'ES256';
    comp.generateJwtKeypair();
    expect(api.jwtKeypair$).toHaveBeenCalledWith({ algorithm: 'ES256' });
  });

  it('jwtKeypairResult is set on success', fakeAsync(async () => {
    const { comp } = await create();
    comp.generateJwtKeypair();
    tick();
    expect(comp.jwtKeypairResult).toEqual(JWT_KP);
  }));

  it('jwtKeypairError is set on failure', fakeAsync(async () => {
    const { comp } = await create({ jwtKeypair$: jest.fn().mockReturnValue(throwError(() => ({ error: { message: 'algo unsupported' } }))) });
    comp.generateJwtKeypair();
    tick();
    expect(comp.jwtKeypairError).toBe('algo unsupported');
  }));
});

// ---------------------------------------------------------------------------
// JWT Encode
// ---------------------------------------------------------------------------

describe('CryptoPageComponent — JWT Encode', () => {
  it('jwtEncodeIsSymmetric is true for HS256', async () => {
    const { comp } = await create();
    comp.jwtEncodeForm.get('algorithm')!.setValue('HS256');
    expect(comp.jwtEncodeIsSymmetric).toBe(true);
  });

  it('jwtEncodeIsSymmetric is false for RS256', async () => {
    const { comp } = await create();
    comp.jwtEncodeForm.get('algorithm')!.setValue('RS256');
    expect(comp.jwtEncodeIsSymmetric).toBe(false);
  });

  it('jwtPayloadError set on invalid JSON', async () => {
    const { comp } = await create();
    comp.jwtEncodeForm.get('payload')!.setValue('not json');
    comp.submitJwtEncode();
    expect(comp.jwtPayloadError).toBe('Invalid JSON payload');
  });

  it('does not call API on invalid JSON', async () => {
    const { comp, api } = await create();
    comp.jwtEncodeForm.get('payload')!.setValue('{bad json}');
    comp.submitJwtEncode();
    expect(api.jwtEncode$).not.toHaveBeenCalled();
  });

  it('calls jwtEncode$ with parsed payload for HS256', async () => {
    const { comp, api } = await create();
    comp.jwtEncodeForm.patchValue({ payload: '{"sub":"1"}', algorithm: 'HS256', secret: 'mysecret' });
    comp.submitJwtEncode();
    expect(api.jwtEncode$).toHaveBeenCalledWith(expect.objectContaining({
      payload: { sub: '1' }, algorithm: 'HS256', secret: 'mysecret',
    }));
  });

  it('passes privateKey (not secret) for RS256', async () => {
    const { comp, api } = await create();
    comp.jwtEncodeForm.patchValue({ payload: '{"sub":"1"}', algorithm: 'RS256', privateKey: 'PRIV', secret: 'should-be-ignored' });
    comp.submitJwtEncode();
    const call = (api.jwtEncode$ as jest.Mock).mock.calls[0][0];
    expect(call.privateKey).toBe('PRIV');
    expect(call.secret).toBeUndefined();
  });

  it('jwtEncodeResult is set on success', fakeAsync(async () => {
    const { comp } = await create();
    comp.submitJwtEncode();
    tick();
    expect(comp.jwtEncodeResult).toEqual(JWT_ENC);
  }));
});

// ---------------------------------------------------------------------------
// JWT Decode
// ---------------------------------------------------------------------------

describe('CryptoPageComponent — JWT Decode', () => {
  it('form is invalid when token is empty', async () => {
    const { comp } = await create();
    comp.jwtDecodeForm.get('token')!.setValue('');
    expect(comp.jwtDecodeForm.invalid).toBe(true);
  });

  it('calls jwtDecode$ with token', async () => {
    const { comp, api } = await create();
    comp.jwtDecodeForm.get('token')!.setValue('eyJ.payload.sig');
    comp.submitJwtDecode();
    expect(api.jwtDecode$).toHaveBeenCalledWith({ token: 'eyJ.payload.sig' });
  });

  it('jwtDecodeResult is set on success', fakeAsync(async () => {
    const { comp } = await create();
    comp.jwtDecodeForm.get('token')!.setValue('eyJ.payload.sig');
    comp.submitJwtDecode();
    tick();
    expect(comp.jwtDecodeResult).toEqual(JWT_DEC);
  }));

  it('jwtDecodeError is set on API error', fakeAsync(async () => {
    const { comp } = await create({ jwtDecode$: jest.fn().mockReturnValue(throwError(() => ({ error: { message: 'malformed' } }))) });
    comp.jwtDecodeForm.get('token')!.setValue('bad');
    comp.submitJwtDecode();
    tick();
    expect(comp.jwtDecodeError).toBe('malformed');
  }));
});

// ---------------------------------------------------------------------------
// JWT Verify
// ---------------------------------------------------------------------------

describe('CryptoPageComponent — JWT Verify', () => {
  it('jwtVerifyIsSymmetric is true for HS256', async () => {
    const { comp } = await create();
    comp.jwtVerifyForm.get('algorithm')!.setValue('HS256');
    expect(comp.jwtVerifyIsSymmetric).toBe(true);
  });

  it('jwtVerifyIsSymmetric is false for RS256', async () => {
    const { comp } = await create();
    comp.jwtVerifyForm.get('algorithm')!.setValue('RS256');
    expect(comp.jwtVerifyIsSymmetric).toBe(false);
  });

  it('calls jwtVerify$ with secret for HS256', async () => {
    const { comp, api } = await create();
    comp.jwtVerifyForm.patchValue({ token: 'eyJ', algorithm: 'HS256', secret: 'sec' });
    comp.submitJwtVerify();
    const call = (api.jwtVerify$ as jest.Mock).mock.calls[0][0];
    expect(call.secret).toBe('sec');
    expect(call.publicKey).toBeUndefined();
  });

  it('calls jwtVerify$ with publicKey for RS256', async () => {
    const { comp, api } = await create();
    comp.jwtVerifyForm.patchValue({ token: 'eyJ', algorithm: 'RS256', publicKey: 'PUB', secret: 'ignored' });
    comp.submitJwtVerify();
    const call = (api.jwtVerify$ as jest.Mock).mock.calls[0][0];
    expect(call.publicKey).toBe('PUB');
    expect(call.secret).toBeUndefined();
  });

  it('jwtVerifyResult.valid=true on success', fakeAsync(async () => {
    const { comp } = await create();
    comp.jwtVerifyForm.patchValue({ token: 'eyJ', algorithm: 'HS256', secret: 'sec' });
    comp.submitJwtVerify();
    tick();
    expect(comp.jwtVerifyResult?.valid).toBe(true);
  }));

  it('jwtVerifyError is set on error', fakeAsync(async () => {
    const { comp } = await create({ jwtVerify$: jest.fn().mockReturnValue(throwError(() => ({ error: { message: 'invalid sig' } }))) });
    comp.jwtVerifyForm.patchValue({ token: 'eyJ', algorithm: 'HS256', secret: 'sec' });
    comp.submitJwtVerify();
    tick();
    expect(comp.jwtVerifyError).toBe('invalid sig');
  }));
});

// ---------------------------------------------------------------------------
// Loading state & cleanup
// ---------------------------------------------------------------------------

describe('CryptoPageComponent — loading & cleanup', () => {
  it('loading is false initially', async () => {
    const { comp } = await create();
    expect(comp.loading()).toBe(false);
  });

  it('copiedKey starts as null', async () => {
    const { comp } = await create();
    expect(comp.copiedKey()).toBeNull();
  });

  it('ngOnDestroy completes destroy$ without error', async () => {
    const { comp } = await create();
    expect(() => comp.ngOnDestroy()).not.toThrow();
  });

  it('totpCountdown returns a number between 1 and 30', async () => {
    const { comp } = await create();
    comp.totpSetupResult = TOTP_SETUP;
    const c = comp.totpCountdown();
    expect(c).toBeGreaterThanOrEqual(1);
    expect(c).toBeLessThanOrEqual(30);
  });
});

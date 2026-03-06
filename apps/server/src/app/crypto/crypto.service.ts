import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { BadRequestException, Injectable } from '@nestjs/common';
import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from 'otplib';
import * as jwt from 'jsonwebtoken';
import { QrService } from '../qr/qr.service';
import { TotpSetupDto, TotpVerifyDto, TotpGenerateDto } from './dto/totp.dto';
import { CryptoHashDto, HmacDto } from './dto/hash.dto';
import { Ed25519SignDto, Ed25519VerifyDto } from './dto/ed25519.dto';
import { JwtEncodeDto, JwtDecodeDto, JwtVerifyDto, JwtKeypairDto } from './dto/jwt.dto';
import { QrDataType } from '../qr/types';

@Injectable()
export class CryptoService {
  private readonly totp: TOTP;

  constructor(private readonly qr: QrService) {
    this.totp = new TOTP({
      crypto: new NobleCryptoPlugin(),
      base32: new ScureBase32Plugin(),
    });
  }

  // ---------------------------------------------------------------------------
  // TOTP
  // ---------------------------------------------------------------------------

  async totpSetup(dto: TotpSetupDto) {
    const {
      issuer = 'Simon API Hub',
      accountName,
      algorithm = 'SHA1',
      digits = 6,
      period = 30,
      qrFormat = 'svg',
    } = dto;

    const secret = this.totp.generateSecret();

    // Create a configured instance for this specific setup
    const totpInstance = new TOTP({
      crypto: new NobleCryptoPlugin(),
      base32: new ScureBase32Plugin(),
      algorithm: algorithm.toLowerCase() as 'sha1' | 'sha256' | 'sha512',
      digits,
      period,
      issuer,
      label: accountName,
    });

    const otpauthUri = await totpInstance.toURI({ secret });

    const qrResult = await this.qr.generate({
      type: QrDataType.URL,
      payload: { url: otpauthUri },
      format: qrFormat,
      size: 256,
      margin: 2,
      ecc: 'M',
    });

    const qrCode = qrFormat === 'svg'
      ? qrResult.body.toString('utf-8')
      : (qrResult.body as Buffer).toString('base64');

    return { secret, otpauthUri, qrCode, qrFormat, algorithm, digits, period };
  }

  async totpVerify(dto: TotpVerifyDto) {
    const { secret, token, window = 1 } = dto;
    try {
      const result = await this.totp.verify(token, { secret, epochTolerance: window * 30 });
      if (!result || !result.valid) return { valid: false, delta: null };
      return { valid: true, delta: result.delta ?? 0 };
    } catch {
      throw new BadRequestException('Invalid secret or token format');
    }
  }

  async totpGenerate(dto: TotpGenerateDto) {
    const { secret, period = 30, digits = 6 } = dto;
    try {
      const token = await this.totp.generate({ secret, period, digits });
      const remaining = period - (Math.floor(Date.now() / 1000) % period);
      return { token, validFor: remaining };
    } catch {
      throw new BadRequestException('Invalid secret format');
    }
  }

  // ---------------------------------------------------------------------------
  // Hash
  // ---------------------------------------------------------------------------

  hash(dto: CryptoHashDto) {
    const { data, algo, saltRounds = 10 } = dto;
    if (!data?.length) throw new BadRequestException('data must be non-empty');

    switch (algo) {
      case 'md5':
      case 'sha256':
      case 'sha512': {
        const h = crypto.createHash(algo).update(data, 'utf8').digest('hex');
        return { algo, format: 'hex', hash: h };
      }
      case 'bcrypt': {
        if (saltRounds < 4 || saltRounds > 15)
          throw new BadRequestException('saltRounds must be between 4 and 15');
        const salt = bcrypt.genSaltSync(saltRounds);
        const h = bcrypt.hashSync(data, salt);
        return { algo, saltRounds, hash: h };
      }
      default:
        throw new BadRequestException('Unsupported algorithm');
    }
  }

  // ---------------------------------------------------------------------------
  // HMAC
  // ---------------------------------------------------------------------------

  hmac(dto: HmacDto) {
    const { data, key, algorithm = 'sha256', encoding = 'hex' } = dto;
    try {
      const hmacVal = crypto
        .createHmac(algorithm, key)
        .update(data, 'utf8')
        .digest(encoding as 'hex' | 'base64');
      return { algorithm, encoding, hmac: hmacVal };
    } catch (e: any) {
      throw new BadRequestException(e.message ?? 'HMAC computation failed');
    }
  }

  // ---------------------------------------------------------------------------
  // Ed25519
  // ---------------------------------------------------------------------------

  ed25519Keypair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding:  { type: 'spki',  format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const pubDer  = crypto.createPublicKey(publicKey).export({ type: 'spki',  format: 'der' });
    const privDer = crypto.createPrivateKey(privateKey).export({ type: 'pkcs8', format: 'der' });
    return {
      publicKey,
      privateKey,
      publicKeyHex:  (pubDer as Buffer).toString('hex'),
      privateKeyHex: (privDer as Buffer).toString('hex'),
    };
  }

  ed25519Sign(dto: Ed25519SignDto) {
    const { message, privateKey, encoding = 'hex' } = dto;
    try {
      const key = crypto.createPrivateKey(privateKey);
      const sig = crypto.sign(null, Buffer.from(message, 'utf8'), key);
      return { signature: sig.toString(encoding as BufferEncoding), encoding };
    } catch (e: any) {
      throw new BadRequestException(e.message ?? 'Signing failed');
    }
  }

  ed25519Verify(dto: Ed25519VerifyDto) {
    const { message, signature, publicKey, encoding = 'hex' } = dto;
    try {
      const key = crypto.createPublicKey(publicKey);
      const sigBuf = Buffer.from(signature, encoding as BufferEncoding);
      const valid = crypto.verify(null, Buffer.from(message, 'utf8'), key, sigBuf);
      return { valid };
    } catch (e: any) {
      throw new BadRequestException(e.message ?? 'Verification failed');
    }
  }

  // ---------------------------------------------------------------------------
  // JWT keypair
  // ---------------------------------------------------------------------------

  jwtKeypair(dto: JwtKeypairDto) {
    const { algorithm } = dto;

    if (algorithm === 'RS256') {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding:  { type: 'spki',  format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      return { algorithm, publicKey, privateKey };
    }
    if (algorithm === 'ES256') {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
        namedCurve: 'P-256',
        publicKeyEncoding:  { type: 'spki',  format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      return { algorithm, publicKey, privateKey };
    }
    throw new BadRequestException(`Unsupported algorithm for JWT keypair: ${algorithm}. Supported: RS256, ES256`);
  }

  // ---------------------------------------------------------------------------
  // JWT encode / decode / verify
  // ---------------------------------------------------------------------------

  jwtEncode(dto: JwtEncodeDto) {
    const { payload, algorithm, secret, privateKey, expiresIn } = dto;
    const isSymmetric = algorithm === 'HS256' || algorithm === 'HS512';

    if (isSymmetric && !secret)
      throw new BadRequestException(`algorithm ${algorithm} requires 'secret'`);
    if (!isSymmetric && !privateKey)
      throw new BadRequestException(`algorithm ${algorithm} requires 'privateKey'`);

    const signingKey = isSymmetric ? secret! : privateKey!;
    const options: jwt.SignOptions = {
      algorithm: algorithm as jwt.Algorithm,
      ...(expiresIn ? { expiresIn: expiresIn as any } : {}),
    };

    try {
      const token = jwt.sign(payload, signingKey, options);
      const decoded = jwt.decode(token) as Record<string, unknown>;
      const expiresAt = decoded?.exp
        ? new Date((decoded.exp as number) * 1000).toISOString()
        : null;
      return { token, expiresAt };
    } catch (e: any) {
      throw new BadRequestException(e.message ?? 'JWT signing failed');
    }
  }

  jwtDecode(dto: JwtDecodeDto) {
    const { token } = dto;
    try {
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded) throw new BadRequestException('Invalid JWT structure');

      const payload = decoded.payload as Record<string, unknown>;
      const exp = payload?.exp as number | undefined;
      const expired  = exp ? Date.now() / 1000 > exp : false;
      const expiresAt = exp ? new Date(exp * 1000).toISOString() : null;
      const rawParts = token.split('.');

      return { header: decoded.header, payload, signature: rawParts[2] ?? '', expired, expiresAt };
    } catch (e: any) {
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException(e.message ?? 'JWT decode failed');
    }
  }

  jwtVerify(dto: JwtVerifyDto) {
    const { token, algorithm, secret, publicKey } = dto;
    const isSymmetric = algorithm === 'HS256' || algorithm === 'HS512';

    if (isSymmetric && !secret)
      throw new BadRequestException(`algorithm ${algorithm} requires 'secret'`);
    if (!isSymmetric && !publicKey)
      throw new BadRequestException(`algorithm ${algorithm} requires 'publicKey'`);

    const verifyKey = isSymmetric ? secret! : publicKey!;
    try {
      const payload = jwt.verify(token, verifyKey, {
        algorithms: [algorithm as jwt.Algorithm],
      }) as Record<string, unknown>;
      const exp = payload?.exp as number | undefined;
      return { valid: true, payload, expired: false, expiresAt: exp ? new Date(exp * 1000).toISOString() : null };
    } catch (e: any) {
      if (e instanceof jwt.TokenExpiredError)
        return { valid: false, payload: null, expired: true, error: 'Token has expired' };
      return { valid: false, payload: null, expired: false, error: e.message ?? 'Verification failed' };
    }
  }
}

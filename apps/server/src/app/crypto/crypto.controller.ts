import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CryptoService } from './crypto.service';
import { TotpSetupDto, TotpVerifyDto, TotpGenerateDto } from './dto/totp.dto';
import { CryptoHashDto, HmacDto } from './dto/hash.dto';
import { Ed25519SignDto, Ed25519VerifyDto } from './dto/ed25519.dto';
import { JwtEncodeDto, JwtDecodeDto, JwtVerifyDto, JwtKeypairDto } from './dto/jwt.dto';

@ApiTags('crypto')
@Controller('crypto')
export class CryptoController {
  constructor(private readonly svc: CryptoService) {}

  // ---------------------------------------------------------------------------
  // TOTP / 2FA
  // ---------------------------------------------------------------------------

  @Post('totp/setup')
  @ApiOperation({
    summary: 'Generate a new TOTP secret + provisioning QR code',
    description:
      'Creates a cryptographically secure Base32 secret, builds the `otpauth://` URI and ' +
      'returns a QR code ready to be scanned by Google Authenticator, Authy, 1Password etc.\n\n' +
      '> ⚠️ **The secret is returned only once** — the caller must store it securely.',
  })
  @ApiResponse({ status: 201, description: 'Secret, otpauth URI and QR code' })
  @HttpCode(HttpStatus.CREATED)
  totpSetup(@Body() dto: TotpSetupDto) {
    return this.svc.totpSetup(dto);
  }

  @Post('totp/verify')
  @ApiOperation({
    summary: 'Verify a TOTP token against a known secret',
    description: 'Accepts ±`window` time windows (default 1 = ±30 s drift tolerance). Returns `delta` indicating which window matched.',
  })
  @ApiResponse({ status: 200, description: '{ valid, delta }' })
  @HttpCode(HttpStatus.OK)
  totpVerify(@Body() dto: TotpVerifyDto) {
    return this.svc.totpVerify(dto);
  }

  @Post('totp/generate')
  @ApiOperation({
    summary: 'Generate the current TOTP token for a secret',
    description: 'Useful for automated tests and demos. Returns the token and remaining seconds in the current window.',
  })
  @ApiResponse({ status: 200, description: '{ token, validFor }' })
  @HttpCode(HttpStatus.OK)
  totpGenerate(@Body() dto: TotpGenerateDto) {
    return this.svc.totpGenerate(dto);
  }

  // ---------------------------------------------------------------------------
  // Hash (replaces POST /api/utils/hash — also adds SHA-512)
  // ---------------------------------------------------------------------------

  @Post('hash')
  @ApiOperation({
    summary: 'Hash data — MD5 / SHA-256 / SHA-512 / bcrypt',
    description: 'Supersedes `POST /api/utils/hash`. Same response format, additional SHA-512 support.',
  })
  @ApiResponse({ status: 200, description: '{ algo, format, hash }' })
  @HttpCode(HttpStatus.OK)
  hash(@Body() dto: CryptoHashDto) {
    return this.svc.hash(dto);
  }

  // ---------------------------------------------------------------------------
  // HMAC
  // ---------------------------------------------------------------------------

  @Post('hmac')
  @ApiOperation({ summary: 'Compute HMAC — SHA-1 / SHA-256 / SHA-512 / MD5' })
  @ApiResponse({ status: 200, description: '{ algorithm, encoding, hmac }' })
  @HttpCode(HttpStatus.OK)
  hmac(@Body() dto: HmacDto) {
    return this.svc.hmac(dto);
  }

  // ---------------------------------------------------------------------------
  // Ed25519
  // ---------------------------------------------------------------------------

  @Post('ed25519/keypair')
  @ApiOperation({ summary: 'Generate a new Ed25519 key pair (PEM + hex)' })
  @ApiResponse({ status: 201, description: '{ publicKey, privateKey, publicKeyHex, privateKeyHex }' })
  @HttpCode(HttpStatus.CREATED)
  ed25519Keypair() {
    return this.svc.ed25519Keypair();
  }

  @Post('ed25519/sign')
  @ApiOperation({ summary: 'Sign a message with an Ed25519 private key' })
  @ApiResponse({ status: 200, description: '{ signature, encoding }' })
  @HttpCode(HttpStatus.OK)
  ed25519Sign(@Body() dto: Ed25519SignDto) {
    return this.svc.ed25519Sign(dto);
  }

  @Post('ed25519/verify')
  @ApiOperation({ summary: 'Verify an Ed25519 signature' })
  @ApiResponse({ status: 200, description: '{ valid }' })
  @HttpCode(HttpStatus.OK)
  ed25519Verify(@Body() dto: Ed25519VerifyDto) {
    return this.svc.ed25519Verify(dto);
  }

  // ---------------------------------------------------------------------------
  // JWT
  // ---------------------------------------------------------------------------

  @Post('jwt/keypair')
  @ApiOperation({
    summary: 'Generate a key pair for asymmetric JWT signing (RS256 / ES256 / EdDSA)',
    description: 'RS256 → RSA-2048, ES256 → ECDSA P-256, EdDSA → Ed25519',
  })
  @ApiResponse({ status: 201, description: '{ algorithm, publicKey, privateKey }' })
  @HttpCode(HttpStatus.CREATED)
  jwtKeypair(@Body() dto: JwtKeypairDto) {
    return this.svc.jwtKeypair(dto);
  }

  @Post('jwt/encode')
  @ApiOperation({
    summary: 'Create a JWT — HS256 / HS512 / RS256 / ES256 / EdDSA',
    description:
      'Symmetric (HS256/HS512): provide `secret`.\n\n' +
      'Asymmetric (RS256/ES256/EdDSA): provide `privateKey` in PEM format.\n\n' +
      'Use `POST /api/crypto/jwt/keypair` to generate a key pair.',
  })
  @ApiResponse({ status: 201, description: '{ token, expiresAt }' })
  @HttpCode(HttpStatus.CREATED)
  jwtEncode(@Body() dto: JwtEncodeDto) {
    return this.svc.jwtEncode(dto);
  }

  @Post('jwt/decode')
  @ApiOperation({
    summary: 'Decode a JWT without verification (structure inspection only)',
    description: 'Returns header, payload, signature and expiry status. **Does not verify the signature.**',
  })
  @ApiResponse({ status: 200, description: '{ header, payload, signature, expired, expiresAt }' })
  @HttpCode(HttpStatus.OK)
  jwtDecode(@Body() dto: JwtDecodeDto) {
    return this.svc.jwtDecode(dto);
  }

  @Post('jwt/verify')
  @ApiOperation({
    summary: 'Verify a JWT signature and expiry',
    description:
      'Symmetric (HS256/HS512): provide `secret`.\n\n' +
      'Asymmetric (RS256/ES256/EdDSA): provide `publicKey` in PEM format.',
  })
  @ApiResponse({ status: 200, description: '{ valid, payload, expired, error? }' })
  @HttpCode(HttpStatus.OK)
  jwtVerify(@Body() dto: JwtVerifyDto) {
    return this.svc.jwtVerify(dto);
  }
}

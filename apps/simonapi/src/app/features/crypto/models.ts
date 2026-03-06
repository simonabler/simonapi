// TOTP
export interface TotpSetupRequest  { issuer?: string; accountName: string; algorithm?: 'SHA1'|'SHA256'|'SHA512'; digits?: 6|8; period?: 30|60; qrFormat?: 'svg'|'png'; }
export interface TotpSetupResult   { secret: string; otpauthUri: string; qrCode: string; qrFormat: string; algorithm: string; digits: number; period: number; }
export interface TotpVerifyRequest { secret: string; token: string; window?: number; }
export interface TotpVerifyResult  { valid: boolean; delta: number | null; }
export interface TotpGenerateRequest { secret: string; period?: 30|60; digits?: 6|8; }
export interface TotpGenerateResult  { token: string; validFor: number; }

// Hash & HMAC
export interface CryptoHashRequest  { data: string; algo: 'md5'|'sha256'|'sha512'|'bcrypt'; saltRounds?: number; }
export interface CryptoHashResult   { algo: string; format?: string; saltRounds?: number; hash: string; }
export interface HmacRequest        { data: string; key: string; algorithm?: string; encoding?: string; }
export interface HmacResult         { algorithm: string; encoding: string; hmac: string; }

// Ed25519
export interface Ed25519KeypairResult { publicKey: string; privateKey: string; publicKeyHex: string; privateKeyHex: string; }
export interface Ed25519SignRequest   { message: string; privateKey: string; encoding?: string; }
export interface Ed25519SignResult    { signature: string; encoding: string; }
export interface Ed25519VerifyRequest { message: string; signature: string; publicKey: string; encoding?: string; }
export interface Ed25519VerifyResult  { valid: boolean; }

// JWT
export interface JwtKeypairRequest  { algorithm: 'RS256'|'ES256'|'EdDSA'; }
export interface JwtKeypairResult   { algorithm: string; publicKey: string; privateKey: string; }
export interface JwtEncodeRequest   { payload: Record<string,unknown>; algorithm: string; secret?: string; privateKey?: string; expiresIn?: string; }
export interface JwtEncodeResult    { token: string; expiresAt: string | null; }
export interface JwtDecodeRequest   { token: string; }
export interface JwtDecodeResult    { header: Record<string,unknown>; payload: Record<string,unknown>; signature: string; expired: boolean; expiresAt: string | null; }
export interface JwtVerifyRequest   { token: string; algorithm: string; secret?: string; publicKey?: string; }
export interface JwtVerifyResult    { valid: boolean; payload: Record<string,unknown> | null; expired: boolean; error?: string; expiresAt?: string | null; }

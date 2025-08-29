import { IsEnum, IsObject, IsOptional, IsIn, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QrDataType, QrFormat } from '../types';


export class GenerateQrDto {
  @ApiProperty({
    description: 'Datentyp, der in den QR-Code encodiert wird',
    enum: QrDataType,
    enumName: 'QrDataType',
    example: 'url',
  })
  @IsEnum(QrDataType)
  type!: QrDataType;


  @ApiProperty({
    description:
      'Daten-Payload – Struktur hängt von `type` ab. Beispiele:\n' +
      '- url: { url: string }\n' +
      '- text: { text: string }\n' +
      '- email: { to: string; subject?: string; body?: string }\n' +
      '- phone: { number: string }\n' +
      '- sms: { number: string; message?: string }\n' +
      '- vcard: { firstName?, lastName?, organization?, title?, phone?, email?, website?, address?, note? }\n' +
      '- wifi: { ssid: string; password?; hidden?; encryption?: "WEP" | "WPA" | "nopass" }',
    example: { url: 'https://example.com' },
  })
  @IsObject()
  payload!: Record<string, any>; // wird service-seitig validiert


  @ApiPropertyOptional({
    description: 'Ausgabeformat',
    enum: ['png', 'svg'],
    default: 'svg',
  })
  @IsOptional()
  @IsIn(['png', 'svg'])
  format?: QrFormat = 'svg';


  @ApiPropertyOptional({
    description: 'Kantenlänge in Pixel (PNG/SVG)',
    minimum: 64,
    maximum: 4096,
    default: 512,
  })
  @IsOptional()
  @IsInt()
  @Min(64)
  @Max(4096)
  size?: number = 512;


  @ApiPropertyOptional({
    description: 'Rand (in Modulen / „Kästchen“)',
    minimum: 0,
    maximum: 20,
    default: 2,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  margin?: number = 2;


  @ApiPropertyOptional({
    description: 'Fehlerkorrektur-Level (L<M<Q<H)',
    enum: ['L', 'M', 'Q', 'H'],
    default: 'M',
  })
  @IsOptional()
  @IsIn(['L', 'M', 'Q', 'H'])
  ecc?: 'L' | 'M' | 'Q' | 'H' = 'M';
}

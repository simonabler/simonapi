export type QrFormat = 'png' | 'svg';
export type QrDataType = 'url' | 'text' | 'email' | 'phone' | 'sms' | 'vcard' | 'wifi';


export interface GenerateRequest {
  type: QrDataType;
  payload: Record<string, any>;
  format?: QrFormat;
  size?: number;
  margin?: number;
  ecc?: 'L' | 'M' | 'Q' | 'H';
}


export interface QrPreset {
  id: string; name: string; type: QrDataType; payload: Record<string, any>;
  createdAt: string; updatedAt: string;
}
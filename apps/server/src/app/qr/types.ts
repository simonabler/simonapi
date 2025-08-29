export type QrFormat = 'png' | 'svg';
export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';


export enum QrDataType {
URL = 'url',
TEXT = 'text',
EMAIL = 'email',
PHONE = 'phone',
SMS = 'sms',
VCARD = 'vcard',
WIFI = 'wifi',
}


export interface UrlPayload { url: string }
export interface TextPayload { text: string }
export interface EmailPayload { to: string; subject?: string; body?: string }
export interface PhonePayload { number: string }
export interface SmsPayload { number: string; message?: string }
export interface VCardPayload {
firstName?: string; lastName?: string; organization?: string; title?: string;
phone?: string; email?: string; website?: string; address?: string; note?: string;
}
export interface WifiPayload {
ssid: string; password?: string; hidden?: boolean; encryption?: 'WEP' | 'WPA' | 'nopass';
}


export type QrPayload =
| UrlPayload | TextPayload | EmailPayload | PhonePayload | SmsPayload | VCardPayload | WifiPayload;


export interface GenerateOptions {
format?: QrFormat; // default svg
size?: number; // px, default 512
margin?: number; // modules border, default 2
ecc?: ErrorCorrectionLevel; // default M
}


export interface QrPreset {
id: string;
name: string;
type: QrDataType;
payload: QrPayload;
createdAt: string;
updatedAt: string;
}
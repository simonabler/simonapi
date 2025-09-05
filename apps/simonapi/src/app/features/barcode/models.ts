export type StandardBarcodeType =
  | 'code128'
  | 'ean13'
  | 'ean8'
  | 'upca'
  | 'code39'
  | 'itf14'
  | 'pdf417'
  | 'datamatrix';

export interface BarcodeRequest {
  type: StandardBarcodeType;
  text: string;
  includetext?: boolean;
  scale?: number;
  height?: number;
}


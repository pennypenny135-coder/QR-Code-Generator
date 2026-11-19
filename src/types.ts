export type Symbology = 'QR' | 'CODE128' | 'EAN13' | 'EAN8' | 'UPC' | 'CODE39';
export type Ecl = 'L' | 'M' | 'Q' | 'H';
export type NameSource = 'value' | 'label' | 'serial';
export type ExportFormat = 'png' | 'svg' | 'both';

export const SYMBOLOGIES: { id: Symbology; label: string; hint: string }[] = [
  { id: 'QR', label: 'QR Code', hint: '任何文字／網址／中文，容量視 ECL 而定' },
  { id: 'CODE128', label: 'Code 128', hint: '僅 ASCII（英數字及符號），不支援中文' },
  { id: 'EAN13', label: 'EAN-13', hint: '12 或 13 位數字（12 位會自動補校驗碼）' },
  { id: 'EAN8', label: 'EAN-8', hint: '7 或 8 位數字（7 位會自動補校驗碼）' },
  { id: 'UPC', label: 'UPC-A', hint: '11 或 12 位數字（11 位會自動補校驗碼）' },
  { id: 'CODE39', label: 'Code 39', hint: '0-9 A-Z 空格 - . $ / + %（小寫自動轉大寫）' },
];

export interface Item {
  id: string;
  value: string;
  label: string;
  /** 個別覆寫碼種（混合模式），未設定則跟隨整批碼種 */
  type?: Symbology;
}

export interface QrSettings {
  ecl: Ecl;
  size: number;
  margin: number;
  fg: string;
  bg: string;
}

export interface BarSettings {
  showText: boolean;
  barWidth: number;
  height: number;
  margin: number;
  fontSize: number;
  fg: string;
  bg: string;
  pngScale: number;
}

export interface NamingSettings {
  source: NameSource;
  prefix: string;
  suffix: string;
  serialStart: number;
  serialPad: number;
}

export interface Settings {
  symbology: Symbology;
  qr: QrSettings;
  bar: BarSettings;
  naming: NamingSettings;
  exportFormat: ExportFormat;
  skipEmpty: boolean;
  includeReport: boolean;
}

export interface RenderResult {
  ok: boolean;
  type: Symbology;
  /** 實際編碼內容（例如已補校驗碼／已轉大寫） */
  text: string;
  errors: string[];
  warnings: string[];
  qr?: { n: number; data: Uint8Array };
  barSvg?: string;
  barW?: number;
  barH?: number;
}

export interface Row {
  index: number;
  item: Item;
  type: Symbology;
  res: RenderResult;
  name: string;
  errors: string[];
  warnings: string[];
}

export const MAX_ITEMS = 5000;

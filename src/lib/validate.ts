import type { Symbology } from '../types';

export interface Validation {
  errors: string[];
  warnings: string[];
  /** 實際用嚟編碼嘅內容 */
  text: string;
}

/** GTIN 校驗碼（EAN-13 / EAN-8 / UPC-A 通用：由右至左，權重 3,1,3,1…） */
export function gtinCheckDigit(digitsWithoutCheck: string): number {
  let sum = 0;
  const len = digitsWithoutCheck.length;
  for (let i = len - 1; i >= 0; i--) {
    const w = (len - 1 - i) % 2 === 0 ? 3 : 1;
    sum += Number(digitsWithoutCheck[i]) * w;
  }
  return (10 - (sum % 10)) % 10;
}

function uniqueChars(s: string, re: RegExp, max = 4): string {
  const set: string[] = [];
  for (const ch of s) {
    if (re.test(ch) && !set.includes(ch)) {
      set.push(ch);
      if (set.length >= max) break;
    }
  }
  return set.map((c) => (c === ' ' ? '「空格」' : c < ' ' ? `U+${c.charCodeAt(0).toString(16).padStart(4, '0')}` : c)).join(' ');
}

function validateGtin(value: string, name: string, bodyLen: number): Validation {
  const errors: string[] = [];
  const warnings: string[] = [];
  let text = value;
  if (!/^\d+$/.test(value)) {
    const bad = uniqueChars(value, /\D/);
    errors.push(`${name} 只可包含數字 0-9（發現不支援字元：${bad}）`);
  } else if (value.length !== bodyLen && value.length !== bodyLen + 1) {
    errors.push(`${name} 需要 ${bodyLen} 或 ${bodyLen + 1} 位數字（目前 ${value.length} 位）`);
  } else if (value.length === bodyLen) {
    const c = gtinCheckDigit(value);
    text = value + c;
    warnings.push(`已自動補上校驗碼 ${c} → ${text}`);
  } else {
    const expect = gtinCheckDigit(value.slice(0, bodyLen));
    if (Number(value[bodyLen]) !== expect) {
      errors.push(`${name} 校驗碼錯誤（最後一位應為 ${expect}，或只輸入前 ${bodyLen} 位由系統補上）`);
    }
  }
  return { errors, warnings, text };
}

export function validateValue(value: string, type: Symbology): Validation {
  if (value.trim() === '') return { errors: ['內容為空白'], warnings: [], text: value };
  const errors: string[] = [];
  const warnings: string[] = [];
  let text = value;

  switch (type) {
    case 'QR': {
      const bytes = new TextEncoder().encode(value).length;
      if (bytes > 1000) warnings.push(`內容較長（${bytes} bytes），QR 會非常密集，建議放大尺寸或降低 ECL`);
      break;
    }
    case 'CODE128': {
      if (/[^\x00-\x7F]/.test(value)) {
        errors.push(`Code 128 只支援 ASCII 字元，不支援中文／全形／特殊符號（${uniqueChars(value, /[^\x00-\x7F]/)}）。請改用 QR Code`);
      } else if (/[\x00-\x1F\x7F]/.test(value)) {
        errors.push(`含有不可見控制字元（${uniqueChars(value, /[\x00-\x1F\x7F]/)}）`);
      }
      if (value.length > 48) warnings.push(`內容較長（${value.length} 字元），條碼會非常闊，列印後可能難以掃描`);
      break;
    }
    case 'EAN13': {
      const r = validateGtin(value, 'EAN-13', 12);
      return r;
    }
    case 'EAN8': {
      const r = validateGtin(value, 'EAN-8', 7);
      return r;
    }
    case 'UPC': {
      const r = validateGtin(value, 'UPC-A', 11);
      return r;
    }
    case 'CODE39': {
      const upper = value.toUpperCase();
      if (/[^0-9A-Z\-. $/+%]/.test(upper)) {
        errors.push(`Code 39 不支援以下字元：${uniqueChars(upper, /[^0-9A-Z\-. $/+%]/)}（只支援 0-9 A-Z 空格 - . $ / + %）`);
      }
      if (upper !== value) {
        text = upper;
        warnings.push('小寫字母已轉為大寫');
      }
      if (value.length > 30) warnings.push(`內容較長（${value.length} 字元），條碼會非常闊`);
      break;
    }
  }
  return { errors, warnings, text };
}

/* ---------- 對比度 ---------- */

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export interface ColorIssue {
  level: 'error' | 'warn';
  msg: string;
}

export function colorIssues(fg: string, bg: string): ColorIssue[] {
  const out: ColorIssue[] = [];
  const ratio = contrastRatio(fg, bg);
  if (ratio < 3) {
    out.push({ level: 'error', msg: `前景／背景對比度只有 ${ratio.toFixed(1)}:1，非常容易掃唔到（建議 ≥ 4.5:1）` });
  } else if (ratio < 4.5) {
    out.push({ level: 'warn', msg: `前景／背景對比度 ${ratio.toFixed(1)}:1 偏低，建議 ≥ 4.5:1` });
  }
  if (luminance(fg) > luminance(bg)) {
    out.push({ level: 'warn', msg: '前景比背景淺（反色碼），不少掃碼器唔支援，建議深色碼＋淺色底' });
  }
  return out;
}

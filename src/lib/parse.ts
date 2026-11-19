import Papa from 'papaparse';
import { MAX_ITEMS } from '../types';

export interface RawEntry {
  value: string;
  label: string;
}

/** 逐行文字 → 清單。永遠 trim；skipEmpty=false 時保留中間空行（會被標示為錯誤） */
export function parseLines(text: string, skipEmpty: boolean): RawEntry[] {
  const lines = text.split(/\r\n|\n|\r/).map((l) => l.trim());
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines.filter((l) => !skipEmpty || l !== '').map((value) => ({ value, label: '' }));
}

export interface SequenceOptions {
  prefix: string;
  suffix: string;
  start: number;
  end: number;
  step: number;
  pad: number;
}

export function genSequence(o: SequenceOptions): { entries: RawEntry[]; error?: string } {
  const { start, end, step, pad } = o;
  if (![start, end, step].every(Number.isInteger)) return { entries: [], error: '起始、結束、間隔必須為整數' };
  if (step < 1) return { entries: [], error: '間隔必須 ≥ 1' };
  if (end < start) return { entries: [], error: '結束數字不可細過起始數字' };
  if (Math.abs(end) > Number.MAX_SAFE_INTEGER) return { entries: [], error: '數字過大' };
  const count = Math.floor((end - start) / step) + 1;
  if (count > MAX_ITEMS) return { entries: [], error: `一次最多產生 ${MAX_ITEMS} 筆（目前 ${count} 筆）` };
  const entries: RawEntry[] = [];
  for (let n = start; n <= end; n += step) {
    const num = n < 0 ? '-' + String(-n).padStart(pad, '0') : String(n).padStart(pad, '0');
    entries.push({ value: `${o.prefix}${num}${o.suffix}`, label: '' });
  }
  return { entries };
}

/* ---------- 檔案匯入 ---------- */

export interface FileTable {
  rows: string[][];
  sheets: string[];
  sheet: string;
  encoding: string;
}

function decodeBuffer(buf: ArrayBuffer): { text: string; encoding: string } {
  try {
    const t = new TextDecoder('utf-8', { fatal: true }).decode(buf);
    return { text: t.replace(/^\uFEFF/, ''), encoding: 'UTF-8' };
  } catch {
    try {
      return { text: new TextDecoder('big5').decode(buf), encoding: 'Big5（自動偵測）' };
    } catch {
      return { text: new TextDecoder('utf-8').decode(buf), encoding: 'UTF-8（有損）' };
    }
  }
}

function trimRows(rows: string[][]): string[][] {
  const out = rows.map((r) => r.map((c) => String(c ?? '').trim()));
  while (out.length && out[out.length - 1].every((c) => c === '')) out.pop();
  return out;
}

export async function readFileTable(file: File, sheetName?: string): Promise<FileTable> {
  const buf = await file.arrayBuffer();
  const ext = (file.name.split('.').pop() || '').toLowerCase();

  if (['xlsx', 'xls', 'xlsm', 'xlsb', 'ods'].includes(ext)) {
    const XLSX = await import('xlsx');
    const wb = XLSX.read(buf, { type: 'array' });
    const sheet = sheetName && wb.SheetNames.includes(sheetName) ? sheetName : wb.SheetNames[0];
    const ws = wb.Sheets[sheet];
    const data = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: '' });
    const rows = data.map((r) => r.map((c) => (typeof c === 'number' ? String(c) : String(c ?? ''))));
    return { rows: trimRows(rows), sheets: wb.SheetNames, sheet, encoding: 'Excel' };
  }

  const { text, encoding } = decodeBuffer(buf);
  if (ext === 'csv' || ext === 'tsv') {
    const parsed = Papa.parse<string[]>(text, { skipEmptyLines: false, delimiter: ext === 'tsv' ? '\t' : undefined });
    return { rows: trimRows(parsed.data), sheets: [], sheet: '', encoding };
  }
  // TXT：每行一個值（網址可能含逗號，所以唔拆欄）
  const rows = text.split(/\r\n|\n|\r/).map((l) => [l]);
  return { rows: trimRows(rows), sheets: [], sheet: '', encoding };
}

export function colName(i: number): string {
  let s = '';
  let n = i;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

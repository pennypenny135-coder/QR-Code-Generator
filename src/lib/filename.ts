import type { Item, NamingSettings } from '../types';

// eslint-disable-next-line no-control-regex
const ILLEGAL = /[\/\\:*?"<>|\u0000-\u001f\u007f]/g;
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

/** 過濾檔名非法字元（/ \ : * ? " < > |），並處理結尾點／空格、Windows 保留字、過長 */
export function sanitizeFilename(name: string): string {
  let s = name.replace(ILLEGAL, '_').replace(/\s+/g, ' ').trim();
  s = s.replace(/^\.+/, '_').replace(/[. ]+$/, '');
  if (s.length > 120) s = s.slice(0, 120).trim();
  if (!s) s = 'code';
  if (RESERVED.test(s)) s = `_${s}`;
  return s;
}

/** 為整個清單計算唯一檔名（不含副檔名）；重名自動加 (1), (2)… */
export function buildNames(items: Item[], n: NamingSettings): string[] {
  const used = new Set<string>();
  return items.map((item, i) => {
    let base: string;
    if (n.source === 'serial') base = String(n.serialStart + i).padStart(Math.max(0, n.serialPad), '0');
    else if (n.source === 'label') base = item.label.trim() || item.value;
    else base = item.value;
    const name = sanitizeFilename(`${n.prefix}${base}${n.suffix}`);
    let candidate = name;
    let k = 0;
    while (used.has(candidate.toLowerCase())) {
      k++;
      candidate = `${name}(${k})`;
    }
    used.add(candidate.toLowerCase());
    return candidate;
  });
}

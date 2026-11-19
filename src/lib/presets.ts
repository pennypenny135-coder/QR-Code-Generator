import type { Settings } from '../types';

export const DEFAULT_SETTINGS: Settings = {
  symbology: 'QR',
  qr: { ecl: 'M', size: 512, margin: 4, fg: '#000000', bg: '#ffffff' },
  bar: { showText: true, barWidth: 2, height: 100, margin: 12, fontSize: 18, fg: '#000000', bg: '#ffffff', pngScale: 3 },
  naming: { source: 'value', prefix: '', suffix: '', serialStart: 1, serialPad: 4 },
  exportFormat: 'png',
  skipEmpty: true,
  includeReport: true,
};

export interface Preset {
  name: string;
  settings: Settings;
  savedAt: number;
}

const PRESET_KEY = 'codegen.presets.v1';
const CURRENT_KEY = 'codegen.settings.v1';

/** 以預設值為骨架合併，忽略型別唔符嘅欄位（防止舊／壞資料） */
function merge<T>(def: T, raw: unknown): T {
  if (def === null || typeof def !== 'object') {
    return typeof raw === typeof def ? (raw as T) : def;
  }
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(def as object)) {
    out[k] = merge((def as Record<string, unknown>)[k], src[k]);
  }
  return out as T;
}

export function mergeSettings(raw: unknown): Settings {
  return merge(DEFAULT_SETTINGS, raw);
}

export function loadPresets(): Preset[] {
  try {
    const arr = JSON.parse(localStorage.getItem(PRESET_KEY) || '[]');
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((p) => p && typeof p.name === 'string')
      .map((p) => ({ name: p.name, savedAt: Number(p.savedAt) || 0, settings: mergeSettings(p.settings) }));
  } catch {
    return [];
  }
}

export function savePresets(list: Preset[]) {
  try {
    localStorage.setItem(PRESET_KEY, JSON.stringify(list));
  } catch {
    /* 私隱模式或容量已滿 */
  }
}

export function loadCurrent(): Settings {
  try {
    const raw = localStorage.getItem(CURRENT_KEY);
    return raw ? mergeSettings(JSON.parse(raw)) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveCurrent(s: Settings) {
  try {
    localStorage.setItem(CURRENT_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

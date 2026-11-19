import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Item, RenderResult, Row, Settings } from './types';
import { MAX_ITEMS } from './types';
import { generate } from './lib/render';
import { buildNames } from './lib/filename';
import { loadCurrent, saveCurrent } from './lib/presets';
import { buildZip, downloadBlob, downloadSingle, zipFilename } from './lib/exporter';
import type { RawEntry } from './lib/parse';
import InputPanel, { type AddMode } from './components/InputPanel';
import SettingsPanel from './components/SettingsPanel';
import PresetPanel from './components/PresetPanel';
import PreviewPanel, { type Filter, type View } from './components/PreviewPanel';
import ExportPanel from './components/ExportPanel';

let uidCounter = 0;
const uid = () => `i${++uidCounter}_${Date.now().toString(36)}`;

export default function App() {
  const [settings, setSettings] = useState<Settings>(() => loadCurrent());
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [view, setView] = useState<View>('grid');
  const [notice, setNotice] = useState('');
  const [progress, setProgress] = useState<{ pct: number; label: string } | null>(null);
  const [exportError, setExportError] = useState('');
  const cache = useRef<{ key: string; map: Map<string, RenderResult> }>({ key: '', map: new Map() });

  useEffect(() => saveCurrent(settings), [settings]);

  const flash = useCallback((m: string) => {
    setNotice(m);
    window.setTimeout(() => setNotice(''), 4000);
  }, []);

  /* ---------- 計算每筆結果（有快取，編輯單行唔會重算全部） ---------- */
  const rows: Row[] = useMemo(() => {
    const key = JSON.stringify({ q: settings.qr, b: settings.bar });
    if (cache.current.key !== key || cache.current.map.size > 20000) cache.current = { key, map: new Map() };
    const map = cache.current.map;

    const names = buildNames(items, settings.naming);
    const seen = new Map<string, number>();

    return items.map((item, index) => {
      const type = item.type ?? settings.symbology;
      const ck = `${type}\u0000${item.value}`;
      let res = map.get(ck);
      if (!res) {
        res = generate(item.value, type, settings);
        map.set(ck, res);
      }
      const warnings = [...res.warnings];
      if (res.ok) {
        const dk = `${type}\u0000${res.text}`;
        const first = seen.get(dk);
        if (first !== undefined) warnings.push(`內容重複（與 #${first + 1} 相同）`);
        else seen.set(dk, index);
      }
      return { index, item, type, res, name: names[index], errors: res.errors, warnings };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, settings.symbology, settings.qr, settings.bar, settings.naming]);

  const counts = useMemo(() => {
    const error = rows.filter((r) => r.errors.length > 0).length;
    const warn = rows.filter((r) => r.errors.length === 0 && r.warnings.length > 0).length;
    return { total: rows.length, error, ok: rows.length - error, warn };
  }, [rows]);

  const usesQR = rows.length ? rows.some((r) => r.type === 'QR') : settings.symbology === 'QR';
  const usesBar = rows.length ? rows.some((r) => r.type !== 'QR') : settings.symbology !== 'QR';
  const hasOverrides = items.some((i) => i.type);

  const sampleName = useMemo(
    () => buildNames([{ id: 'x', value: 'AB/C:001', label: '客戶名' }], settings.naming)[0],
    [settings.naming],
  );

  /* ---------- 清單操作 ---------- */
  const addEntries = (entries: RawEntry[], mode: AddMode) => {
    const fresh: Item[] = entries.map((e) => ({ id: uid(), value: e.value, label: e.label }));
    let list = mode === 'replace' ? fresh : [...items, ...fresh];
    if (list.length > MAX_ITEMS) {
      flash(`一次最多處理 ${MAX_ITEMS} 筆，已截斷多出嘅 ${list.length - MAX_ITEMS} 筆`);
      list = list.slice(0, MAX_ITEMS);
    } else {
      flash(`${mode === 'replace' ? '已取代清單' : '已加入'}：${fresh.length} 筆`);
    }
    setItems(list);
    setFilter('all');
  };

  const changeItem = (id: string, patch: Partial<Item>) =>
    setItems((l) => l.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const removeItem = (id: string) => setItems((l) => l.filter((i) => i.id !== id));
  const removeErrors = () => {
    const bad = new Set(rows.filter((r) => r.errors.length).map((r) => r.item.id));
    setItems((l) => l.filter((i) => !bad.has(i.id)));
    flash(`已移除 ${bad.size} 筆錯誤項目`);
  };
  const dedupe = () => {
    const seen = new Set<string>();
    const dup = new Set<string>();
    rows.forEach((r) => {
      const k = `${r.type}\u0000${r.item.value}`;
      if (seen.has(k)) dup.add(r.item.id);
      else seen.add(k);
    });
    setItems((l) => l.filter((i) => !dup.has(i.id)));
    flash(dup.size ? `已移除 ${dup.size} 筆重複內容` : '冇發現重複內容');
  };
  const clearAll = () => {
    if (items.length === 0 || window.confirm(`確定清空全部 ${items.length} 筆？`)) setItems([]);
  };

  /* ---------- 下載 ---------- */
  const onDownload = async (row: Row, fmt: 'png' | 'svg') => {
    try {
      await downloadSingle(row, fmt, settings);
    } catch (e) {
      flash(`下載失敗：${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const onExport = async () => {
    setExportError('');
    setProgress({ pct: 0, label: '準備中…' });
    try {
      const blob = await buildZip(rows, settings, (pct, label) => setProgress({ pct, label }));
      downloadBlob(blob, zipFilename());
      setProgress({ pct: 100, label: `完成 · ZIP 大小 ${(blob.size / 1024 / 1024).toFixed(2)} MB` });
      window.setTimeout(() => setProgress(null), 5000);
    } catch (e) {
      setProgress(null);
      setExportError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-lg text-white">▦</div>
          <div>
            <h1 className="text-lg font-bold leading-tight">QR Code / Barcode 批量產生器</h1>
            <p className="text-xs text-slate-500">貼上、匯入或流水號 → 即時預覽 → ZIP 一鍵下載（PNG / SVG）</p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
            🔒 100% 本機處理 · 資料不會離開你嘅瀏覽器
          </span>
        </div>
      </header>

      {notice && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">{notice}</div>
      )}

      <main className="mx-auto grid max-w-[1500px] gap-4 px-4 py-4 lg:grid-cols-[400px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <InputPanel
            skipEmpty={settings.skipEmpty}
            onSkipEmpty={(v) => setSettings({ ...settings, skipEmpty: v })}
            onAdd={addEntries}
            count={items.length}
          />
          <SettingsPanel s={settings} onChange={setSettings} usesQR={usesQR} usesBar={usesBar} sampleName={sampleName} />
          <PresetPanel settings={settings} onLoad={setSettings} />
        </aside>

        <div className="min-w-0 space-y-4">
          <ExportPanel
            rows={rows}
            settings={settings}
            onChange={setSettings}
            counts={counts}
            progress={progress}
            onExport={onExport}
            exportError={exportError}
          />
          <PreviewPanel
            rows={rows}
            settings={settings}
            filter={filter}
            onFilter={setFilter}
            view={view}
            onView={setView}
            onChange={changeItem}
            onRemove={removeItem}
            onRemoveErrors={removeErrors}
            onDedupe={dedupe}
            onResetTypes={() => setItems((l) => l.map((i) => ({ ...i, type: undefined })))}
            onClear={clearAll}
            onDownload={onDownload}
            counts={counts}
            hasOverrides={hasOverrides}
          />
        </div>
      </main>

      <footer className="mx-auto max-w-[1500px] px-4 pb-8 text-center text-xs text-slate-400">
        所有碼生成、預覽、命名及 ZIP 打包均在瀏覽器內完成，不使用任何後端或外部 API。列印前請務必用實際掃碼器測試。
      </footer>
    </div>
  );
}

import { useMemo } from 'react';
import type { ExportFormat, Row, Settings } from '../types';
import { SYMBOLOGIES } from '../types';
import { Check, Segmented, btnPrimary } from './ui';

interface Props {
  rows: Row[];
  settings: Settings;
  onChange: (s: Settings) => void;
  counts: { total: number; ok: number; warn: number; error: number };
  progress: { pct: number; label: string } | null;
  onExport: () => void;
  exportError: string;
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className={`text-xl font-semibold tabular-nums ${tone ?? 'text-slate-800'}`}>{value}</div>
    </div>
  );
}

export default function ExportPanel({ rows, settings: s, onChange, counts, progress, onExport, exportError }: Props) {
  const perItem = s.exportFormat === 'both' ? 2 : 1;
  const files = counts.ok * perItem;
  const busy = progress !== null && progress.pct < 100;

  const reasons = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) =>
      r.errors.forEach((e) => {
        const k = e.replace(/（[^）]*）/g, '').replace(/\d+/g, 'N');
        m.set(k, (m.get(k) ?? 0) + 1);
      }),
    );
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [rows]);

  const typesUsed = useMemo(() => {
    const set = new Set(rows.map((r) => r.type));
    return [...set].map((t) => SYMBOLOGIES.find((x) => x.id === t)!.label).join('、');
  }, [rows]);

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="總筆數" value={counts.total} />
        <Stat label="可產生" value={counts.ok} tone="text-emerald-600" />
        <Stat label="格式警告" value={counts.warn} tone={counts.warn ? 'text-amber-600' : undefined} />
        <Stat label="錯誤／跳過" value={counts.error} tone={counts.error ? 'text-red-600' : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="space-y-2">
          <div className="text-xs font-medium text-slate-600">匯出格式</div>
          <div className="max-w-sm">
            <Segmented<ExportFormat>
              value={s.exportFormat}
              onChange={(v) => onChange({ ...s, exportFormat: v })}
              options={[
                { id: 'png', label: 'PNG（高解像度）' },
                { id: 'svg', label: 'SVG（向量）' },
                { id: 'both', label: 'PNG + SVG' },
              ]}
            />
          </div>
          <Check checked={s.includeReport} onChange={(v) => onChange({ ...s, includeReport: v })}>
            ZIP 內附 <code className="rounded bg-slate-100 px-1 text-xs">_report.csv</code>（列出每筆狀態及跳過原因）
          </Check>
        </div>
        <div className="space-y-1.5 lg:min-w-[260px]">
          <button className={`${btnPrimary} w-full !py-2.5`} disabled={counts.ok === 0 || busy} onClick={onExport}>
            {busy ? '打包中…' : `⬇ 打包下載 ZIP（${files} 個檔案）`}
          </button>
          <p className="text-center text-[11px] text-slate-400">
            {counts.ok > 0 ? `${counts.ok} 筆 × ${perItem} 種格式${typesUsed ? ' · ' + typesUsed : ''}` : '冇可匯出嘅項目'}
          </p>
        </div>
      </div>

      {progress && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-500">
            <span>{progress.label}</span>
            <span className="tabular-nums">{progress.pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-indigo-600 transition-[width] duration-150" style={{ width: `${progress.pct}%` }} />
          </div>
        </div>
      )}

      {exportError && <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">匯出失敗：{exportError}</p>}

      {counts.error > 0 && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          <div className="font-medium">⚠ 有 {counts.error} 筆會被跳過（唔會匯出）：</div>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-red-600">
            {reasons.map(([k, n]) => (
              <li key={k}>
                {k} × {n}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

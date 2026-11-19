import { useEffect, useState } from 'react';
import type { Item, Row, Settings, Symbology } from '../types';
import { SYMBOLOGIES } from '../types';
import { pngDimensions, qrSvg } from '../lib/render';
import { Badge, btnGhost } from './ui';

export type Filter = 'all' | 'ok' | 'warn' | 'error';
export type View = 'grid' | 'list';

interface Props {
  rows: Row[];
  settings: Settings;
  filter: Filter;
  onFilter: (f: Filter) => void;
  view: View;
  onView: (v: View) => void;
  onChange: (id: string, patch: Partial<Item>) => void;
  onRemove: (id: string) => void;
  onRemoveErrors: () => void;
  onDedupe: () => void;
  onResetTypes: () => void;
  onClear: () => void;
  onDownload: (row: Row, fmt: 'png' | 'svg') => void;
  counts: { total: number; ok: number; warn: number; error: number };
  hasOverrides: boolean;
}

const PAGE = 48;

export default function PreviewPanel(p: Props) {
  const [limit, setLimit] = useState(PAGE);
  useEffect(() => setLimit(PAGE), [p.filter, p.view]);

  const filtered = p.rows.filter((r) => {
    if (p.filter === 'ok') return r.errors.length === 0;
    if (p.filter === 'warn') return r.errors.length === 0 && r.warnings.length > 0;
    if (p.filter === 'error') return r.errors.length > 0;
    return true;
  });
  const shown = filtered.slice(0, limit);

  const tabs: { id: Filter; label: string; n: number }[] = [
    { id: 'all', label: '全部', n: p.counts.total },
    { id: 'ok', label: '可產生', n: p.counts.ok },
    { id: 'warn', label: '警告', n: p.counts.warn },
    { id: 'error', label: '錯誤／跳過', n: p.counts.error },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex overflow-hidden rounded-md border border-slate-300 bg-white">
          {tabs.map((t, i) => (
            <button
              key={t.id}
              onClick={() => p.onFilter(t.id)}
              className={`px-3 py-1.5 text-xs font-medium transition ${i > 0 ? 'border-l border-slate-300' : ''} ${
                p.filter === t.id ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t.label} <span className="opacity-70">{t.n}</span>
            </button>
          ))}
        </div>
        <div className="inline-flex overflow-hidden rounded-md border border-slate-300 bg-white">
          {(['grid', 'list'] as View[]).map((v, i) => (
            <button
              key={v}
              onClick={() => p.onView(v)}
              className={`px-3 py-1.5 text-xs font-medium ${i > 0 ? 'border-l border-slate-300' : ''} ${
                p.view === v ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {v === 'grid' ? '格仔' : '清單'}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap gap-1.5">
          {p.counts.error > 0 && (
            <button className={`${btnGhost} !px-2 !py-1 !text-xs`} onClick={p.onRemoveErrors}>
              移除錯誤項目
            </button>
          )}
          <button className={`${btnGhost} !px-2 !py-1 !text-xs`} onClick={p.onDedupe}>
            移除重複內容
          </button>
          {p.hasOverrides && (
            <button className={`${btnGhost} !px-2 !py-1 !text-xs`} onClick={p.onResetTypes}>
              重設個別碼種
            </button>
          )}
          <button className={`${btnGhost} !px-2 !py-1 !text-xs !text-red-600`} onClick={p.onClear}>
            清空
          </button>
        </div>
      </div>

      {p.rows.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <div className="text-4xl">▦</div>
          <p className="mt-2 text-sm font-medium text-slate-700">未有內容</p>
          <p className="mt-1 text-xs text-slate-400">喺左邊貼上文字、匯入 CSV／Excel，或用流水號產生清單，預覽會即時出現</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-400">呢個分類冇項目</div>
      ) : (
        <div className={p.view === 'grid' ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3' : 'space-y-2'}>
          {shown.map((r) => (
            <Card key={r.item.id} row={r} {...p} />
          ))}
        </div>
      )}

      {filtered.length > limit && (
        <div className="flex justify-center gap-2 pt-1">
          <button className={btnGhost} onClick={() => setLimit(limit + PAGE)}>
            顯示更多（{shown.length} / {filtered.length}）
          </button>
          <button className={btnGhost} onClick={() => setLimit(filtered.length)}>
            全部顯示
          </button>
        </div>
      )}
    </div>
  );
}

function Card({ row, settings, view, onChange, onRemove, onDownload }: Props & { row: Row }) {
  const { res, item } = row;
  const hasError = row.errors.length > 0;
  const svg = res.qr ? qrSvg(res.qr, settings.qr) : res.barSvg;
  const list = view === 'list';

  return (
    <div
      className={`rounded-lg border bg-white p-3 shadow-sm ${list ? 'flex gap-3' : 'flex flex-col gap-2'} ${
        hasError ? 'border-red-300 bg-red-50/30' : row.warnings.length ? 'border-amber-300' : 'border-slate-200'
      }`}
    >
      <div
        className={`svgbox flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-50 ring-1 ring-slate-100 ${
          list ? 'h-28 w-40' : 'h-36 w-full'
        }`}
      >
        {svg && !hasError ? (
          <div className="flex h-full w-full items-center justify-center p-2" dangerouslySetInnerHTML={{ __html: svg }} />
        ) : (
          <div className="px-3 text-center text-xs text-red-500">
            <div className="text-2xl">⛔</div>無法產生
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-500">#{row.index + 1}</span>
          <select
            value={item.type ?? ''}
            onChange={(e) => onChange(item.id, { type: (e.target.value || undefined) as Symbology | undefined })}
            className={`min-w-0 flex-1 rounded border px-1 py-0.5 text-[11px] ${
              item.type ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-500'
            }`}
            title="個別碼種（混合模式）"
          >
            <option value="">跟隨整批（{SYMBOLOGIES.find((x) => x.id === settings.symbology)!.label}）</option>
            {SYMBOLOGIES.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => onRemove(item.id)}
            className="rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
            title="移除此項目"
            aria-label="移除"
          >
            ✕
          </button>
        </div>

        <input
          value={item.value}
          onChange={(e) => onChange(item.id, { value: e.target.value })}
          onBlur={(e) => {
            const t = e.target.value.trim();
            if (t !== item.value) onChange(item.id, { value: t });
          }}
          className={`w-full rounded border px-2 py-1 font-mono text-xs outline-none focus:ring-2 ${
            hasError ? 'border-red-300 focus:ring-red-100' : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-100'
          }`}
          placeholder="（空白）"
          spellCheck={false}
          title="可直接修正內容"
        />

        <div className="truncate text-[11px] text-slate-500" title={row.name}>
          {hasError ? (
            <span className="text-slate-400">不會匯出</span>
          ) : (
            <>
              📄 <span className="font-mono">{row.name}</span>
              <span className="text-slate-400"> · {pngDimensions(res, settings)}</span>
            </>
          )}
          {item.label && <span className="ml-1 text-emerald-600">〔{item.label}〕</span>}
        </div>

        {(row.errors.length > 0 || row.warnings.length > 0) && (
          <ul className="space-y-0.5">
            {row.errors.map((m, i) => (
              <li key={'e' + i} className="text-[11px] leading-snug text-red-600">
                ✖ {m}
              </li>
            ))}
            {row.warnings.map((m, i) => (
              <li key={'w' + i} className="text-[11px] leading-snug text-amber-700">
                ⚠ {m}
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center gap-1.5 pt-0.5">
          {hasError ? <Badge tone="red">錯誤</Badge> : row.warnings.length ? <Badge tone="amber">警告</Badge> : <Badge tone="green">OK</Badge>}
          <div className="ml-auto flex gap-1">
            <button disabled={hasError} onClick={() => onDownload(row, 'png')} className={`${btnGhost} !px-2 !py-0.5 !text-[11px]`}>
              PNG
            </button>
            <button disabled={hasError} onClick={() => onDownload(row, 'svg')} className={`${btnGhost} !px-2 !py-0.5 !text-[11px]`}>
              SVG
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import type { Ecl, NameSource, Settings, Symbology } from '../types';
import { SYMBOLOGIES } from '../types';
import { colorIssues } from '../lib/validate';
import { ColorField, Check, Field, NumInput, Section, Segmented, inputCls } from './ui';

interface Props {
  s: Settings;
  onChange: (s: Settings) => void;
  usesQR: boolean;
  usesBar: boolean;
  sampleName: string;
}

function ColorWarnings({ fg, bg }: { fg: string; bg: string }) {
  const issues = colorIssues(fg, bg);
  if (!issues.length) return null;
  return (
    <ul className="space-y-1">
      {issues.map((i, k) => (
        <li
          key={k}
          className={`rounded-md px-2.5 py-1.5 text-xs ${i.level === 'error' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}
        >
          ⚠ {i.msg}
        </li>
      ))}
    </ul>
  );
}

export default function SettingsPanel({ s, onChange, usesQR, usesBar, sampleName }: Props) {
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => onChange({ ...s, [k]: v });
  const setQr = (p: Partial<Settings['qr']>) => onChange({ ...s, qr: { ...s.qr, ...p } });
  const setBar = (p: Partial<Settings['bar']>) => onChange({ ...s, bar: { ...s.bar, ...p } });
  const setNaming = (p: Partial<Settings['naming']>) => onChange({ ...s, naming: { ...s.naming, ...p } });
  const sym = SYMBOLOGIES.find((x) => x.id === s.symbology)!;

  return (
    <>
      <Section title="② 碼種（整批統一）">
        <Field label="碼種" hint={sym.hint}>
          <select className={inputCls} value={s.symbology} onChange={(e) => set('symbology', e.target.value as Symbology)}>
            {SYMBOLOGIES.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </select>
        </Field>
        <p className="text-[11px] text-slate-400">需要混合碼種？喺右邊預覽每一筆都可以個別改碼種。</p>
      </Section>

      <Section title="QR Code 樣式" dim={!usesQR}>
        <Field label="錯誤修正等級（ECL）" hint="L 7% · M 15% · Q 25% · H 30%；愈高愈耐髒，但圖案愈密">
          <Segmented<Ecl>
            value={s.qr.ecl}
            onChange={(v) => setQr({ ecl: v })}
            options={(['L', 'M', 'Q', 'H'] as Ecl[]).map((x) => ({ id: x, label: x }))}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="尺寸（px）" hint="PNG 實際輸出尺寸">
            <NumInput value={s.qr.size} onChange={(v) => setQr({ size: v })} min={64} max={4096} step={32} />
          </Field>
          <Field label="邊距（模組）" hint="標準為 4">
            <NumInput value={s.qr.margin} onChange={(v) => setQr({ margin: v })} min={0} max={20} />
          </Field>
          <ColorField label="前景色" value={s.qr.fg} onChange={(v) => setQr({ fg: v })} />
          <ColorField label="背景色" value={s.qr.bg} onChange={(v) => setQr({ bg: v })} />
        </div>
        {s.qr.margin < 2 && (
          <p className="rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">⚠ 邊距少於 2 個模組，部分掃碼器可能讀唔到</p>
        )}
        <ColorWarnings fg={s.qr.fg} bg={s.qr.bg} />
      </Section>

      <Section title="一維條碼樣式" dim={!usesBar}>
        <Check checked={s.bar.showText} onChange={(v) => setBar({ showText: v })}>
          顯示下方文字
        </Check>
        <div className="grid grid-cols-2 gap-3">
          <Field label="線條粗細" hint="每個最窄條嘅 px 寬度">
            <NumInput value={s.bar.barWidth} onChange={(v) => setBar({ barWidth: v })} min={1} max={10} step={0.5} />
          </Field>
          <Field label="高度（px）">
            <NumInput value={s.bar.height} onChange={(v) => setBar({ height: v })} min={10} max={600} step={5} />
          </Field>
          <Field label="邊距（px）" hint="左右留白，建議 ≥ 10">
            <NumInput value={s.bar.margin} onChange={(v) => setBar({ margin: v })} min={0} max={100} />
          </Field>
          <Field label="文字大小">
            <NumInput value={s.bar.fontSize} onChange={(v) => setBar({ fontSize: v })} min={8} max={60} />
          </Field>
          <ColorField label="線條顏色" value={s.bar.fg} onChange={(v) => setBar({ fg: v })} />
          <ColorField label="背景色" value={s.bar.bg} onChange={(v) => setBar({ bg: v })} />
          <Field label="PNG 倍率" hint="PNG 解像度 = SVG 尺寸 × 倍率">
            <NumInput value={s.bar.pngScale} onChange={(v) => setBar({ pngScale: v })} min={1} max={10} />
          </Field>
        </div>
        {s.bar.margin < 8 && (
          <p className="rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">⚠ 左右留白太細，條碼掃描器需要足夠安靜區</p>
        )}
        <ColorWarnings fg={s.bar.fg} bg={s.bar.bg} />
      </Section>

      <Section title="③ 檔名規則">
        <Field label="檔名來源">
          <Segmented<NameSource>
            value={s.naming.source}
            onChange={(v) => setNaming({ source: v })}
            options={[
              { id: 'value', label: '編碼內容' },
              { id: 'label', label: '指定欄位' },
              { id: 'serial', label: '流水號' },
            ]}
          />
        </Field>
        {s.naming.source === 'label' && (
          <p className="text-[11px] text-slate-400">使用匯入檔案時揀選嘅「檔名／標籤」欄；冇標籤嘅項目會退回使用編碼內容。</p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="前綴">
            <input className={inputCls} value={s.naming.prefix} onChange={(e) => setNaming({ prefix: e.target.value })} />
          </Field>
          <Field label="後綴">
            <input className={inputCls} value={s.naming.suffix} onChange={(e) => setNaming({ suffix: e.target.value })} />
          </Field>
          {s.naming.source === 'serial' && (
            <>
              <Field label="流水號起始">
                <NumInput value={s.naming.serialStart} onChange={(v) => setNaming({ serialStart: v })} min={0} max={999999999} />
              </Field>
              <Field label="補零位數">
                <NumInput value={s.naming.serialPad} onChange={(v) => setNaming({ serialPad: v })} min={0} max={12} />
              </Field>
            </>
          )}
        </div>
        <p className="text-[11px] text-slate-400">
          非法字元 <code className="rounded bg-slate-100 px-1">/ \ : * ? " &lt; &gt; |</code> 會自動換成 _；重名自動加 (1)、(2)。
          <br />
          例：<span className="font-mono text-slate-600">{sampleName || '—'}</span>
        </p>
      </Section>
    </>
  );
}

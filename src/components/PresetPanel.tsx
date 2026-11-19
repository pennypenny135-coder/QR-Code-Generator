import { useState } from 'react';
import type { Settings } from '../types';
import { loadPresets, mergeSettings, savePresets, DEFAULT_SETTINGS, type Preset } from '../lib/presets';
import { Section, btnGhost, btnPrimary, inputCls } from './ui';

interface Props {
  settings: Settings;
  onLoad: (s: Settings) => void;
}

export default function PresetPanel({ settings, onLoad }: Props) {
  const [presets, setPresets] = useState<Preset[]>(() => loadPresets());
  const [name, setName] = useState('');
  const [sel, setSel] = useState('');
  const [msg, setMsg] = useState('');

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(''), 2500);
  };

  const persist = (list: Preset[]) => {
    setPresets(list);
    savePresets(list);
  };

  function save() {
    const n = name.trim();
    if (!n) return flash('請先輸入 Preset 名稱');
    const others = presets.filter((p) => p.name !== n);
    persist([...others, { name: n, settings: mergeSettings(settings), savedAt: Date.now() }]);
    setSel(n);
    flash(presets.some((p) => p.name === n) ? `已更新「${n}」` : `已儲存「${n}」`);
  }

  return (
    <Section title="常用設定 Preset" right={<span className="text-[11px] text-slate-400">存於本機 localStorage</span>}>
      <div className="flex gap-2">
        <input className={inputCls} placeholder="Preset 名稱，例如：倉存標籤" value={name} onChange={(e) => setName(e.target.value)} />
        <button className={btnPrimary} onClick={save}>
          儲存
        </button>
      </div>
      <div className="flex gap-2">
        <select
          className={inputCls}
          value={sel}
          onChange={(e) => {
            setSel(e.target.value);
            setName(e.target.value);
          }}
        >
          <option value="">— 揀選已儲存嘅 Preset —</option>
          {presets.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
        <button
          className={btnGhost}
          disabled={!sel}
          onClick={() => {
            const p = presets.find((x) => x.name === sel);
            if (p) {
              onLoad(p.settings);
              flash(`已載入「${p.name}」`);
            }
          }}
        >
          載入
        </button>
        <button
          className={btnGhost}
          disabled={!sel}
          onClick={() => {
            persist(presets.filter((p) => p.name !== sel));
            setSel('');
            flash('已刪除');
          }}
        >
          刪除
        </button>
      </div>
      <div className="flex items-center justify-between text-xs">
        <button
          className="text-slate-500 hover:text-indigo-600 hover:underline"
          onClick={() => {
            onLoad(DEFAULT_SETTINGS);
            flash('已還原預設設定');
          }}
        >
          還原預設設定
        </button>
        <span className="text-emerald-600">{msg}</span>
      </div>
      <p className="text-[11px] text-slate-400">Preset 包含碼種、尺寸、顏色、檔名規則及匯出格式。</p>
    </Section>
  );
}

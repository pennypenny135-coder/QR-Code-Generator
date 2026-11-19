import { useMemo, useRef, useState } from 'react';
import { colName, genSequence, parseLines, readFileTable, type FileTable, type RawEntry } from '../lib/parse';
import { Check, Field, NumInput, Section, btnGhost, btnPrimary, inputCls } from './ui';

export type AddMode = 'replace' | 'append';

interface Props {
  skipEmpty: boolean;
  onSkipEmpty: (v: boolean) => void;
  onAdd: (entries: RawEntry[], mode: AddMode) => void;
  count: number;
}

const TABS = [
  { id: 'text', label: '貼上文字' },
  { id: 'file', label: '匯入檔案' },
  { id: 'seq', label: '流水號' },
] as const;

const SAMPLE = `https://example.com/event/checkin?id=001
https://example.com/event/checkin?id=002

4901234567894
INV-2024-0001
中文內容 測試`;

export default function InputPanel({ skipEmpty, onSkipEmpty, onAdd, count }: Props) {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('text');

  return (
    <Section title="① 輸入內容" right={<span className="text-xs text-slate-500">目前清單 {count} 筆</span>}>
      <Check checked={skipEmpty} onChange={onSkipEmpty}>
        自動忽略空行
        <span className="text-xs text-slate-400">（取消＝保留並標示為錯誤）</span>
      </Check>

      <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition ${
              tab === t.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'text' && <TextTab skipEmpty={skipEmpty} onAdd={onAdd} />}
      {tab === 'file' && <FileTab skipEmpty={skipEmpty} onAdd={onAdd} />}
      {tab === 'seq' && <SeqTab onAdd={onAdd} />}
    </Section>
  );
}

function ActionButtons({ disabled, onAdd, build }: { disabled?: boolean; onAdd: Props['onAdd']; build: () => RawEntry[] }) {
  return (
    <div className="flex gap-2">
      <button className={`${btnPrimary} flex-1`} disabled={disabled} onClick={() => onAdd(build(), 'replace')}>
        取代清單
      </button>
      <button className={`${btnGhost} flex-1`} disabled={disabled} onClick={() => onAdd(build(), 'append')}>
        加到清單尾
      </button>
    </div>
  );
}

function TextTab({ skipEmpty, onAdd }: { skipEmpty: boolean; onAdd: Props['onAdd'] }) {
  const [text, setText] = useState('');
  const stats = useMemo(() => {
    const all = text.split(/\r\n|\n|\r/);
    const filled = all.filter((l) => l.trim() !== '').length;
    return { filled, empty: text.trim() === '' ? 0 : all.length - filled };
  }, [text]);

  return (
    <div className="space-y-3">
      <textarea
        className={`${inputCls} h-44 resize-y font-mono text-xs leading-5`}
        placeholder={'每行一條：網址、編號、名單…\n（支援中文及特殊字元）'}
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
      />
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          {stats.filled} 行有內容{stats.empty > 0 && `，${stats.empty} 行空白${skipEmpty ? '（將忽略）' : '（將保留）'}`}
        </span>
        <button className="text-indigo-600 hover:underline" onClick={() => setText(SAMPLE)}>
          載入範例
        </button>
      </div>
      <ActionButtons disabled={stats.filled === 0} onAdd={onAdd} build={() => parseLines(text, skipEmpty)} />
    </div>
  );
}

function FileTab({ skipEmpty, onAdd }: { skipEmpty: boolean; onAdd: Props['onAdd'] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [table, setTable] = useState<FileTable | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasHeader, setHasHeader] = useState(true);
  const [valueCol, setValueCol] = useState(0);
  const [labelCol, setLabelCol] = useState(-1);
  const [drag, setDrag] = useState(false);

  async function load(f: File, sheet?: string) {
    setLoading(true);
    setError('');
    try {
      const t = await readFileTable(f, sheet);
      if (t.rows.length === 0) throw new Error('檔案冇任何內容');
      setFile(f);
      setTable(t);
      if (!sheet) {
        setValueCol(0);
        setLabelCol(-1);
        const isTxt = /\.txt$/i.test(f.name);
        setHasHeader(!isTxt && (t.rows[0]?.length ?? 0) > 1);
      }
    } catch (e) {
      setError(`讀取失敗：${e instanceof Error ? e.message : String(e)}`);
      setTable(null);
    } finally {
      setLoading(false);
    }
  }

  const cols = table ? Math.max(...table.rows.slice(0, 200).map((r) => r.length), 1) : 0;
  const colLabel = (i: number) => {
    const h = hasHeader && table?.rows[0]?.[i];
    return `${colName(i)}${h ? `：${h}` : ''}`;
  };
  const dataRows = table ? (hasHeader ? table.rows.slice(1) : table.rows) : [];

  const build = (): RawEntry[] =>
    dataRows
      .map((r) => ({ value: (r[valueCol] ?? '').trim(), label: labelCol >= 0 ? (r[labelCol] ?? '').trim() : '' }))
      .filter((e) => !skipEmpty || e.value !== '');

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void load(f);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-lg border-2 border-dashed px-4 py-5 text-center text-sm transition ${
          drag ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
        }`}
      >
        <div className="font-medium text-slate-700">{file ? file.name : '按此選擇或拖放檔案'}</div>
        <div className="mt-1 text-xs text-slate-400">支援 .csv .tsv .txt .xlsx .xls .ods（只在本機讀取）</div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.tsv,.txt,.xlsx,.xls,.xlsm,.ods"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void load(f);
            e.target.value = '';
          }}
        />
      </div>

      {loading && <p className="text-xs text-slate-500">讀取中…</p>}
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      {table && file && (
        <>
          <p className="text-xs text-slate-500">
            共 {table.rows.length} 列 × {cols} 欄 · 編碼：{table.encoding}
          </p>
          {table.sheets.length > 1 && (
            <Field label="工作表">
              <select className={inputCls} value={table.sheet} onChange={(e) => void load(file, e.target.value)}>
                {table.sheets.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
          )}
          <Check checked={hasHeader} onChange={setHasHeader}>
            第一列係標題
          </Check>
          <div className="grid grid-cols-2 gap-3">
            <Field label="編碼內容（Value）">
              <select className={inputCls} value={valueCol} onChange={(e) => setValueCol(Number(e.target.value))}>
                {Array.from({ length: cols }, (_, i) => (
                  <option key={i} value={i}>
                    {colLabel(i)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="檔名／標籤（Label）">
              <select className={inputCls} value={labelCol} onChange={(e) => setLabelCol(Number(e.target.value))}>
                <option value={-1}>（不使用）</option>
                {Array.from({ length: cols }, (_, i) => (
                  <option key={i} value={i}>
                    {colLabel(i)}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="max-h-36 overflow-auto rounded-md border border-slate-200">
            <table className="w-full text-[11px]">
              <tbody>
                {table.rows.slice(0, 6).map((r, ri) => (
                  <tr key={ri} className={ri === 0 && hasHeader ? 'bg-slate-100 font-semibold' : 'border-t border-slate-100'}>
                    {Array.from({ length: cols }, (_, ci) => (
                      <td
                        key={ci}
                        className={`max-w-[140px] truncate whitespace-nowrap px-2 py-1 ${
                          ci === valueCol ? 'bg-indigo-50 text-indigo-800' : ci === labelCol ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600'
                        }`}
                      >
                        {r[ci] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-400">藍色＝編碼內容，綠色＝檔名／標籤。Excel 內過長數字或前導 0 請先設為文字格式。</p>
          <ActionButtons disabled={dataRows.length === 0} onAdd={onAdd} build={build} />
        </>
      )}
    </div>
  );
}

function SeqTab({ onAdd }: { onAdd: Props['onAdd'] }) {
  const [prefix, setPrefix] = useState('INV-');
  const [suffix, setSuffix] = useState('');
  const [start, setStart] = useState(1001);
  const [end, setEnd] = useState(1100);
  const [step, setStep] = useState(1);
  const [pad, setPad] = useState(0);

  const result = useMemo(() => genSequence({ prefix, suffix, start, end, step, pad }), [prefix, suffix, start, end, step, pad]);
  const e = result.entries;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="前綴">
          <input className={inputCls} value={prefix} onChange={(ev) => setPrefix(ev.target.value)} />
        </Field>
        <Field label="後綴">
          <input className={inputCls} value={suffix} onChange={(ev) => setSuffix(ev.target.value)} />
        </Field>
        <Field label="起始">
          <NumInput value={start} onChange={setStart} min={-999999999999999} max={999999999999999} />
        </Field>
        <Field label="結束">
          <NumInput value={end} onChange={setEnd} min={-999999999999999} max={999999999999999} />
        </Field>
        <Field label="間隔">
          <NumInput value={step} onChange={setStep} min={1} max={1000000} />
        </Field>
        <Field label="補零位數" hint="0＝唔補零">
          <NumInput value={pad} onChange={setPad} min={0} max={20} />
        </Field>
      </div>
      {result.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{result.error}</p>
      ) : (
        <p className="rounded-md bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600">
          共 {e.length} 筆：{e.slice(0, 3).map((x) => x.value).join('、')}
          {e.length > 4 && ' … '}
          {e.length > 3 && e[e.length - 1].value}
        </p>
      )}
      <ActionButtons disabled={!!result.error || e.length === 0} onAdd={onAdd} build={() => e} />
    </div>
  );
}

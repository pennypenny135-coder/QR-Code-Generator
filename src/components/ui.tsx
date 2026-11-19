import { useEffect, useState, type ReactNode } from 'react';

export function Section({
  title,
  right,
  children,
  dim,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
  dim?: boolean;
}) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${dim ? 'opacity-70' : ''}`}>
      <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        {right}
      </header>
      <div className="space-y-3 p-4">{children}</div>
    </section>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}

export const inputCls =
  'w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50';

export const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300';
export const btnGhost =
  'inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';

export function NumInput({
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  const [text, setText] = useState(String(value));
  const [focus, setFocus] = useState(false);
  useEffect(() => {
    if (!focus) setText(String(value));
  }, [value, focus]);
  return (
    <input
      type="number"
      className={inputCls}
      value={text}
      min={min}
      max={max}
      step={step}
      onFocus={() => setFocus(true)}
      onChange={(e) => {
        setText(e.target.value);
        const n = Number(e.target.value);
        if (e.target.value !== '' && Number.isFinite(n) && n >= min && n <= max) onChange(n);
      }}
      onBlur={() => {
        setFocus(false);
        const n = Number(text);
        const v = text === '' || !Number.isFinite(n) ? value : Math.min(max, Math.max(min, n));
        onChange(v);
        setText(String(v));
      }}
    />
  );
}

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
        />
        <span className="font-mono text-xs uppercase text-slate-500">{value}</span>
      </div>
    </Field>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex w-full overflow-hidden rounded-md border border-slate-300">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`flex-1 px-2 py-1.5 text-xs font-medium transition ${
            value === o.id ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
          } ${o.id !== options[0].id ? 'border-l border-slate-300' : ''}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
      />
      {children}
    </label>
  );
}

export function Badge({ tone, children, title }: { tone: 'red' | 'amber' | 'green' | 'slate' | 'indigo'; children: ReactNode; title?: string }) {
  const map = {
    red: 'bg-red-50 text-red-700 ring-red-200',
    amber: 'bg-amber-50 text-amber-800 ring-amber-200',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    slate: 'bg-slate-100 text-slate-600 ring-slate-200',
    indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  };
  return (
    <span title={title} className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${map[tone]}`}>
      {children}
    </span>
  );
}

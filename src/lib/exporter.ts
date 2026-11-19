import JSZip from 'jszip';
import type { Row, Settings } from '../types';
import { resultPng, resultSvgFile } from './render';

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function downloadSingle(row: Row, fmt: 'png' | 'svg', s: Settings) {
  if (fmt === 'png') {
    downloadBlob(await resultPng(row.res, s), `${row.name}.png`);
  } else {
    downloadBlob(new Blob([resultSvgFile(row.res, s)], { type: 'image/svg+xml' }), `${row.name}.svg`);
  }
}

function csvCell(v: string) {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function buildReport(rows: Row[], s: Settings): string {
  const head = ['序號', '內容', '碼種', '檔名', '狀態', '說明'];
  const lines = [head.join(',')];
  for (const r of rows) {
    const status = r.errors.length ? '已跳過' : r.warnings.length ? '已產生（有警告）' : '已產生';
    const msg = [...r.errors, ...r.warnings].join('；');
    const file = r.errors.length ? '' : s.exportFormat === 'both' ? `png/${r.name}.png ; svg/${r.name}.svg` : `${r.name}.${s.exportFormat}`;
    lines.push([String(r.index + 1), r.item.value, r.type, file, status, msg].map(csvCell).join(','));
  }
  return '\uFEFF' + lines.join('\r\n');
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

/** 打包成 ZIP。onProgress(0-100, 說明) */
export async function buildZip(
  rows: Row[],
  s: Settings,
  onProgress: (pct: number, label: string) => void,
): Promise<Blob> {
  const valid = rows.filter((r) => r.res.ok && r.errors.length === 0);
  const zip = new JSZip();
  const wantPng = s.exportFormat === 'png' || s.exportFormat === 'both';
  const wantSvg = s.exportFormat === 'svg' || s.exportFormat === 'both';
  const both = wantPng && wantSvg;
  const total = valid.length * ((wantPng ? 1 : 0) + (wantSvg ? 1 : 0));
  let done = 0;

  for (const r of valid) {
    if (wantPng) {
      const blob = await resultPng(r.res, s);
      zip.file(`${both ? 'png/' : ''}${r.name}.png`, blob);
      done++;
    }
    if (wantSvg) {
      zip.file(`${both ? 'svg/' : ''}${r.name}.svg`, resultSvgFile(r.res, s));
      done++;
    }
    if (done % 5 === 0 || done === total) {
      onProgress(Math.round((done / total) * 60), `產生圖檔 ${done} / ${total}`);
      await tick();
    }
  }
  if (s.includeReport) zip.file('_report.csv', buildReport(rows, s));

  const blob = await zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
    (m) => onProgress(60 + Math.round(m.percent * 0.4), `壓縮打包 ${Math.round(m.percent)}%`),
  );
  onProgress(100, '完成');
  return blob;
}

export function zipFilename(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `codes_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.zip`;
}

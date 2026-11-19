import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import type { BarSettings, QrSettings, RenderResult, Settings, Symbology } from '../types';
import { validateValue } from './validate';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** 驗證 + 產生碼資料（QR 矩陣 / 條碼 SVG）。唔會 throw，錯誤放喺 errors。 */
export function generate(value: string, type: Symbology, s: Settings): RenderResult {
  const v = validateValue(value, type);
  const base: RenderResult = { ok: false, type, text: v.text, errors: [...v.errors], warnings: [...v.warnings] };
  if (v.errors.length) return base;

  try {
    if (type === 'QR') {
      const qr = QRCode.create(v.text, { errorCorrectionLevel: s.qr.ecl });
      const n = qr.modules.size;
      const total = n + s.qr.margin * 2;
      if (s.qr.size / total < 3) {
        base.warnings.push(`尺寸過細：每個模組只有 ${(s.qr.size / total).toFixed(1)}px，建議放大尺寸`);
      }
      return { ...base, ok: true, qr: { n, data: Uint8Array.from(qr.modules.data) } };
    }
    const bar = barcodeSvg(v.text, type, s.bar);
    return { ...base, ok: true, barSvg: bar.svg, barW: bar.w, barH: bar.h };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (type === 'QR') {
      base.errors.push(`內容過長，超出 QR Code 容量上限（ECL ${s.qr.ecl}）。可降低 ECL 或縮短內容`);
    } else {
      base.errors.push(`無法產生 ${type}：${msg.replace(/^Error:\s*/, '')}`);
    }
    return base;
  }
}

function barcodeSvg(text: string, type: Symbology, b: BarSettings) {
  const el = document.createElementNS(SVG_NS, 'svg');
  JsBarcode(el, text, {
    format: type,
    width: b.barWidth,
    height: b.height,
    displayValue: b.showText,
    fontSize: b.fontSize,
    margin: b.margin,
    lineColor: b.fg,
    background: b.bg,
    textMargin: 2,
  });
  const w = parseFloat(el.getAttribute('width') || '0');
  const h = parseFloat(el.getAttribute('height') || '0');
  el.setAttribute('viewBox', `0 0 ${w} ${h}`);
  el.removeAttribute('style');
  const svg = new XMLSerializer().serializeToString(el);
  return { svg, w, h };
}

export function qrSvg(qr: { n: number; data: Uint8Array }, s: QrSettings): string {
  const { n, data } = qr;
  const m = s.margin;
  const N = n + m * 2;
  let d = '';
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (data[r * n + c]) {
        const start = c;
        while (c < n && data[r * n + c]) c++;
        d += `M${start + m} ${r + m}h${c - start}v1h-${c - start}z`;
      } else c++;
    }
  }
  return (
    `<svg xmlns="${SVG_NS}" viewBox="0 0 ${N} ${N}" width="${s.size}" height="${s.size}" shape-rendering="crispEdges">` +
    `<rect width="${N}" height="${N}" fill="${s.bg}"/><path d="${d}" fill="${s.fg}"/></svg>`
  );
}

export function resultSvg(res: RenderResult, s: Settings): string {
  if (res.qr) return qrSvg(res.qr, s.qr);
  return res.barSvg || '';
}

/** 匯出用 SVG（含 XML 宣告） */
export function resultSvgFile(res: RenderResult, s: Settings): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n${resultSvg(res, s)}`;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('無法建立 PNG'))), 'image/png');
  });
}

function qrPng(qr: { n: number; data: Uint8Array }, s: QrSettings): Promise<Blob> {
  const { n, data } = qr;
  const m = s.margin;
  const N = n + m * 2;
  const size = s.size;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = s.bg;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = s.fg;
  for (let r = 0; r < n; r++) {
    const y0 = Math.round(((r + m) * size) / N);
    const y1 = Math.round(((r + m + 1) * size) / N);
    for (let c = 0; c < n; c++) {
      if (!data[r * n + c]) continue;
      const x0 = Math.round(((c + m) * size) / N);
      const x1 = Math.round(((c + m + 1) * size) / N);
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    }
  }
  return canvasToBlob(canvas);
}

async function barPng(svg: string, w: number, h: number, scale: number, bg: string): Promise<Blob> {
  const W = Math.max(1, Math.round(w * scale));
  const H = Math.max(1, Math.round(h * scale));
  // 只改根元素嘅 width/height，令瀏覽器以目標解像度重新向量渲染
  const sized = svg.replace(/<svg[^>]*>/, (tag) =>
    tag.replace(/(\s)width="[^"]*"/, `$1width="${W}"`).replace(/(\s)height="[^"]*"/, `$1height="${H}"`),
  );
  const url = URL.createObjectURL(new Blob([sized], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('SVG 轉 PNG 失敗'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(img, 0, 0, W, H);
    return await canvasToBlob(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function resultPng(res: RenderResult, s: Settings): Promise<Blob> {
  if (res.qr) return qrPng(res.qr, s.qr);
  return barPng(res.barSvg!, res.barW!, res.barH!, s.bar.pngScale, s.bar.bg);
}

/** 預計 PNG 輸出像素 */
export function pngDimensions(res: RenderResult, s: Settings): string {
  if (res.qr) return `${s.qr.size}×${s.qr.size}px`;
  if (res.barW && res.barH) return `${Math.round(res.barW * s.bar.pngScale)}×${Math.round(res.barH * s.bar.pngScale)}px`;
  return '';
}

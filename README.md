# QR Code / Barcode 批量產生器

100% 純前端（Pure Client-side）嘅 QR Code / 一維條碼批量產生器。
所有碼生成、預覽、命名、PNG/SVG 轉換同 ZIP 打包都喺瀏覽器內完成，**冇後端、冇外部 API、冇追蹤**。你輸入或匯入嘅網址、編號、名單唔會傳送到任何第三方。

## 功能

- **輸入**：逐行貼上（可選忽略／保留空行）、匯入 CSV / TSV / TXT / Excel（xlsx、xls、ods；可揀「編碼內容」欄同「檔名／標籤」欄、揀工作表）、流水號規則（前綴、起訖、間隔、補零、後綴）。
- **碼種**：QR Code（ECL L/M/Q/H、尺寸、邊距、前景／背景色）、Code 128、EAN-13、EAN-8、UPC-A、Code 39（顯示文字、線條粗細、高度、邊距、顏色、PNG 倍率）。
- **混合模式**：整批統一碼種，亦可喺預覽每一筆個別改碼種。
- **驗證與提示**：空白行、中文／全形字元（Code 128 / Code 39 唔支援）、EAN/UPC 位數同校驗碼、QR 容量超限、尺寸過細、顏色對比度過低／反色、重複內容，全部喺預覽卡片同統計列清楚標示；錯誤項目唔會匯出並列出原因。
- **檔名**：來源可揀編碼內容 / 指定欄位 / 流水號，加前後綴；自動過濾 `/ \ : * ? " < > |` 同控制字元、處理 Windows 保留名；重名自動加 `(1)`、`(2)`。
- **匯出**：PNG（高解像度）、SVG（向量）或兩者；以 `jszip` 打包 ZIP 並顯示進度；每張亦可單獨下載 PNG/SVG；ZIP 可附 `_report.csv`（每筆狀態、檔名、跳過原因）。
- **Preset**：碼種、尺寸、顏色、檔名規則、匯出格式可命名儲存於 `localStorage`；目前設定亦會自動記住。輸入內容本身**不會**被儲存。

## 使用套件

| 套件 | 用途 |
| --- | --- |
| `react` / `react-dom` | UI |
| `vite` + `@vitejs/plugin-react` + `vite-plugin-singlefile` | 建置（輸出單一 `dist/index.html`） |
| `tailwindcss` (v4) | 樣式 |
| `qrcode` | 只用嚟計算 QR 矩陣；SVG / PNG 由本專案自行繪製，以精準控制顏色、邊距、尺寸 |
| `jsbarcode` | 一維條碼 SVG 產生 |
| `jszip` | 瀏覽器內 ZIP 打包 |
| `papaparse` | CSV 解析 |
| `xlsx` (SheetJS) | Excel 解析（動態載入，只喺匯入 Excel 時先執行） |

## 本地啟動 / Build

```bash
npm install
npm run dev       # 開發模式，按終端機顯示嘅網址開啟
npm run build     # 產生 dist/index.html（單一檔案，可直接開啟或放上任何靜態主機）
npm run preview   # 預覽 build 結果
```

## 專案結構

```
src/
  App.tsx                 主畫面、狀態、清單操作
  types.ts                型別、碼種清單、常數
  lib/
    validate.ts           各碼種格式驗證、GTIN 校驗碼、顏色對比度
    render.ts             產生 QR 矩陣 / 條碼 SVG；SVG 與 PNG 輸出
    filename.ts           檔名過濾與重名處理
    parse.ts              逐行解析、CSV/Excel/TXT 匯入（自動偵測 UTF-8 / Big5）、流水號
    presets.ts            預設值、localStorage 讀寫
    exporter.ts           ZIP 打包、單張下載、report.csv
  components/             InputPanel / SettingsPanel / PresetPanel / PreviewPanel / ExportPanel / ui
```

## 注意事項

- 一次最多處理 5000 筆。
- Code 128 / Code 39 為 ASCII 協議，中文內容請用 QR Code（以 UTF-8 編碼，大部分掃碼器可正確讀取）。
- EAN-13 / EAN-8 / UPC-A：輸入少一位會自動補校驗碼；輸入完整位數但校驗碼錯誤會標示為錯誤，唔會靜靜雞修改。
- Excel 內過長數字（如 13 位條碼）或帶前導 0 嘅編號，請先將儲存格設為「文字」，避免被 Excel 轉成科學記號或截走 0。
- 以 SVG 轉 PNG 時，一維條碼文字使用瀏覽器內建 monospace 字型。
- 流水號檔名按清單順序編號（包括被跳過嘅項目），方便同原清單對照。
- 列印大量標籤前，請務必用實際掃碼器抽樣測試。

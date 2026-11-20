import type {
  Asset,
  BrailleMatrix,
  Crop,
  StudioDocument,
} from "../../../shared/document";
import { luminance, tone } from "../../mapping/lib/tone";
import { binarize, modeStats } from "./binarize";
import { applyEdits } from "./edits";

function hexRgb(hex: string): [number, number, number] {
  const v = hex.replace("#", "");
  return [
    parseInt(v.slice(0, 2), 16),
    parseInt(v.slice(2, 4), 16),
    parseInt(v.slice(4, 6), 16),
  ];
}

// 采样裁剪区并检测透明像素；透明区域合成到铺底色（明确补齐，不留空洞）
function sampleCrop(
  asset: Asset,
  crop: Crop,
  w: number,
  h: number,
  background: string,
): { rgb: Uint8ClampedArray; transparent: number } {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(
    asset.image,
    crop.x * asset.width,
    crop.y * asset.height,
    crop.width * asset.width,
    crop.height * asset.height,
    0,
    0,
    w,
    h,
  );
  const data = g.getImageData(0, 0, w, h).data;
  const [br, bg, bb] = hexRgb(background);
  const rgb = new Uint8ClampedArray(w * h * 3);
  let transparent = 0;
  for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
    const a = data[i + 3]!;
    if (a >= 250) {
      rgb[j] = data[i]!;
      rgb[j + 1] = data[i + 1]!;
      rgb[j + 2] = data[i + 2]!;
    } else {
      transparent++;
      const k = a / 255;
      rgb[j] = Math.round(data[i]! * k + br * (1 - k));
      rgb[j + 1] = Math.round(data[i + 1]! * k + bg * (1 - k));
      rgb[j + 2] = Math.round(data[i + 2]! * k + bb * (1 - k));
    }
  }
  return { rgb, transparent };
}

// 由裁剪图 + 设置 + 手改点构建确认点阵；奇数宽度与不足一组的行数显式补齐
export function buildMatrix(doc: StudioDocument): BrailleMatrix | null {
  if (!doc.asset) return null;
  const s = doc.braille.settings;
  const crop = doc.crop;
  const asset = doc.asset;
  const rawColumns = Math.max(8, Math.min(320, Math.round(s.dotColumns)));
  const padRight = rawColumns % 2 === 0 ? 0 : 1;
  const wPx = asset.width * crop.width;
  const hPx = asset.height * crop.height;
  const rawRows = Math.max(1, Math.round((rawColumns * hPx) / wPx));
  if (!Number.isFinite(rawRows) || rawRows > 480) {
    throw new Error("裁剪区域过于狭长，请缩小范围或降低点阵密度");
  }
  const padBottom = (4 - (rawRows % 4)) % 4;
  const dotColumns = rawColumns + padRight;
  const dotRows = rawRows + padBottom;
  const { rgb, transparent } = sampleCrop(
    asset,
    crop,
    rawColumns,
    rawRows,
    doc.settings.background,
  );
  const n = dotColumns * dotRows;
  const tones = new Float32Array(n);
  const colors = new Uint8ClampedArray(n * 3);
  for (let y = 0; y < rawRows; y++) {
    for (let x = 0; x < rawColumns; x++) {
      const si = (y * rawColumns + x) * 3;
      const di = y * dotColumns + x;
      const r = rgb[si]!;
      const g = rgb[si + 1]!;
      const b = rgb[si + 2]!;
      tones[di] = tone(luminance(r, g, b), 1, 1, s.invert);
      colors[di * 3] = r;
      colors[di * 3 + 1] = g;
      colors[di * 3 + 2] = b;
    }
  }
  // 两种制版模式都算出点位损失，供选择时对比
  const outline = binarize(tones, dotColumns, rawColumns, rawRows, "outline", s.threshold);
  const gray = binarize(tones, dotColumns, rawColumns, rawRows, "gray", s.threshold);
  const compare = {
    outline: modeStats(tones, outline, dotColumns, rawColumns, rawRows),
    gray: modeStats(tones, gray, dotColumns, rawColumns, rawRows),
  };
  const dots = s.mode === "outline" ? outline : gray;
  const edited = new Uint8Array(n);
  const { conflicts, outsideEdits } = applyEdits(
    dots,
    edited,
    doc.braille.edits,
    crop,
    dotColumns,
    rawColumns,
    rawRows,
  );
  const stats = modeStats(tones, dots, dotColumns, rawColumns, rawRows);
  return {
    dotColumns,
    dotRows,
    rawColumns,
    rawRows,
    padRight,
    padBottom,
    cellColumns: dotColumns / 2,
    cellRows: dotRows / 4,
    transparent,
    dots,
    tones,
    colors,
    edited,
    conflicts,
    outsideEdits,
    stats,
    compare,
    revision: doc.revision,
  };
}

import type { BrailleMode, ModeStats } from "../../../shared/document";

// 4×4 Bayer 有序抖动矩阵，用于“保留灰阶”模式
const BAYER: readonly (readonly number[])[] = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

// 只对采样区（未补齐区域）成点，补齐行列恒为空白
export function binarize(
  tones: Float32Array,
  dotColumns: number,
  rawColumns: number,
  rawRows: number,
  mode: BrailleMode,
  threshold: number,
): Uint8Array {
  const dots = new Uint8Array(tones.length);
  for (let y = 0; y < rawRows; y++) {
    for (let x = 0; x < rawColumns; x++) {
      const i = y * dotColumns + x;
      const t = tones[i]!;
      if (mode === "outline") {
        dots[i] = t >= threshold ? 1 : 0;
      } else {
        const cut = threshold - 0.5 + (BAYER[y & 3]![x & 3]! + 0.5) / 16;
        dots[i] = t >= cut ? 1 : 0;
      }
    }
  }
  return dots;
}

// 点位损失统计：丢失（灰度过半却空白）、溢出（灰度未过半却凸起）、平均灰阶误差
export function modeStats(
  tones: Float32Array,
  dots: Uint8Array,
  dotColumns: number,
  rawColumns: number,
  rawRows: number,
): ModeStats {
  let on = 0;
  let missing = 0;
  let extra = 0;
  let err = 0;
  for (let y = 0; y < rawRows; y++) {
    for (let x = 0; x < rawColumns; x++) {
      const i = y * dotColumns + x;
      const t = tones[i]!;
      const d = dots[i]!;
      on += d;
      if (t >= 0.5 && !d) missing++;
      else if (t < 0.5 && d) extra++;
      err += Math.abs(t - d);
    }
  }
  const n = Math.max(1, rawColumns * rawRows);
  return { on, missing, extra, loss: err / n };
}

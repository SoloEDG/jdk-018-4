import { brailleText, cellBits } from "./src/features/braille/lib/braille";
import { binarize, modeStats } from "./src/features/braille/lib/binarize";
import { computeLayout } from "./src/features/braille/lib/pagination";
import { applyEdits, dotToAnchor, editToDot } from "./src/features/braille/lib/edits";
import { tone } from "./src/features/mapping/lib/tone";
import type { BrailleMatrix, BrailleSettings } from "./src/shared/document";

let failed = 0;
function eq(actual: unknown, expect: unknown, name: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expect);
  if (a === e) console.log(`ok   ${name}`);
  else {
    failed++;
    console.log(`FAIL ${name}: got ${a}, want ${e}`);
  }
}

function makeMatrix(dots: number[], dotColumns: number, dotRows: number): BrailleMatrix {
  return {
    dotColumns,
    dotRows,
    rawColumns: dotColumns,
    rawRows: dotRows,
    padRight: 0,
    padBottom: 0,
    cellColumns: dotColumns / 2,
    cellRows: dotRows / 4,
    transparent: 0,
    dots: Uint8Array.from(dots),
    tones: new Float32Array(dots.length),
    colors: new Uint8ClampedArray(dots.length * 3),
    edited: new Uint8Array(dots.length),
    conflicts: [],
    outsideEdits: 0,
    stats: { on: 0, missing: 0, extra: 0, loss: 0 },
    compare: {
      outline: { on: 0, missing: 0, extra: 0, loss: 0 },
      gray: { on: 0, missing: 0, extra: 0, loss: 0 },
    },
    revision: 0,
  };
}

// 0) tone() 契约：输入 0..255 亮度，输出 0..1 灰度（buildMatrix 依赖此区间）
{
  const mid = tone(128, 1, 1, false);
  eq(mid > 0 && mid < 1, true, "tone() returns 0..1 range");
  eq(tone(255, 1, 1, false), 1, "tone(255) = 1");
  eq(tone(255, 1, 1, true), 0, "tone inverted");
}

// 1) 盲文点位 → Unicode：单点 1/8、全点、真实 2×4 组合
{
  const dot1 = makeMatrix([1, 0, 0, 0, 0, 0, 0, 0], 2, 4);
  eq(brailleText(dot1), "⠁", "dot1 -> U+2801");
  const dot8 = makeMatrix([0, 0, 0, 0, 0, 0, 0, 1], 2, 4);
  eq(brailleText(dot8), "⢀", "dot8 -> U+2880");
  const full = makeMatrix([1, 1, 1, 1, 1, 1, 1, 1], 2, 4);
  eq(brailleText(full), "⣿", "full cell -> U+28FF");
  // 两个单元一行：左全空、右仅点 7（左列第 4 行）
  const two = makeMatrix([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0], 4, 4);
  eq(brailleText(two), "⠀⡀", "empty + dot7 cell");
  eq(cellBits(two.dots, 4, 1, 0), 0x40, "cellBits dot7");
}

// 2) 二值化：轮廓阈值、灰阶抖动、补齐区恒空白
{
  const tones = Float32Array.from([0.4, 0.6, 0, 0, 0.49, 0.51, 0, 0]);
  const out = binarize(tones, 4, 2, 2, "outline", 0.5);
  eq(Array.from(out), [0, 1, 0, 0, 0, 1, 0, 0], "outline threshold, padding blank");
  // 灰阶：0.5 灰在 4×4 抖动下约一半成点
  const t2 = new Float32Array(16).fill(0.5);
  const d2 = binarize(t2, 4, 4, 4, "gray", 0.5);
  const on = d2.reduce((a, b) => a + b, 0);
  eq(on === 7 || on === 8 || on === 9, true, `gray dither ~half on (got ${on})`);
  // 抖动阈值平移：threshold 0.8 时 0.5 灰只剩最低档抖动点
  const d3 = binarize(t2, 4, 4, 4, "gray", 0.8);
  eq(d3.reduce((a, b) => a + b, 0), 3, "gray high threshold leaves few dots");
  // 反转后灰度 1 在补齐区外成点、补齐区仍空白
  const t4 = new Float32Array(8).fill(1);
  const d4 = binarize(t4, 4, 2, 2, "gray", 0.5);
  eq(Array.from(d4), [1, 1, 0, 0, 1, 1, 0, 0], "padded dots stay blank");
}

// 3) 点位损失统计
{
  const tones = Float32Array.from([0.8, 0.2, 0.6, 0.4]);
  const dots = Uint8Array.from([1, 1, 0, 0]);
  const s = modeStats(tones, dots, 2, 2, 2);
  eq(
    [s.on, s.missing, s.extra, Math.abs(s.loss - 0.5) < 1e-6],
    [2, 1, 1, true],
    "modeStats counts",
  );
}

// 4) 锚点往返：点 → 原图坐标 → 点
{
  const crop = { x: 0.1, y: 0.2, width: 0.5, height: 0.5 };
  const a = dotToAnchor(crop, 10, 20, 100, 80);
  const p = editToDot({ ...a, on: true }, crop, 100, 80);
  eq(p, { x: 10, y: 20 }, "anchor round-trip");
  // 裁剪外的锚点返回 null
  const outside = editToDot({ ix: 0.01, iy: 0.5, on: true }, crop, 100, 80);
  eq(outside, null, "outside crop -> null");
}

// 5) 手改应用：同向合并、异向冲突不覆盖、密度变化后落点冲突
{
  const crop = { x: 0, y: 0, width: 1, height: 1 };
  // 高密度 100×80 下两个不同位置的改动
  const e1 = { ...dotToAnchor(crop, 10, 10, 100, 80), on: true };
  const e2 = { ...dotToAnchor(crop, 11, 10, 100, 80), on: false };
  const dots = new Uint8Array(100 * 80);
  const edited = new Uint8Array(100 * 80);
  let r = applyEdits(dots, edited, [e1, e2], crop, 100, 100, 80);
  eq(r.conflicts.length, 0, "high density: no conflict");
  eq([dots[10 * 100 + 10], dots[10 * 100 + 11]], [1, 0], "edits applied");
  // 密度降到 50×40：两个锚点落到同一点且方向相反 → 冲突，自动值保留
  const dots2 = new Uint8Array(50 * 40);
  const edited2 = new Uint8Array(50 * 40);
  const r2 = applyEdits(dots2, edited2, [e1, e2], crop, 50, 50, 40);
  eq(r2.conflicts.length, 1, "density change: conflict detected");
  const ci = r2.conflicts[0]!.y * 50 + r2.conflicts[0]!.x;
  eq([dots2[ci], edited2[ci]], [0, 0], "conflict keeps auto value, not overwritten");
  // 同向合并不算冲突
  const e3 = { ...dotToAnchor(crop, 10, 10, 100, 80), on: true };
  const e4 = { ...dotToAnchor(crop, 11, 10, 100, 80), on: true };
  const dots3 = new Uint8Array(50 * 40);
  const r3 = applyEdits(dots3, new Uint8Array(50 * 40), [e3, e4], crop, 50, 50, 40);
  eq(r3.conflicts.length, 0, "same-direction merge is not a conflict");
  // 裁剪外改动计数
  const r4 = applyEdits(new Uint8Array(4), new Uint8Array(4), [{ ix: 2, iy: 2, on: true }], crop, 2, 2, 2);
  eq(r4.outsideEdits, 1, "outside edits counted");
}

// 6) 印刷分页：物理尺寸、整单元分页
{
  const settings: BrailleSettings = {
    dotColumns: 96,
    mode: "gray",
    threshold: 0.5,
    invert: false,
    color: true,
    paper: "A4",
    dotPitch: 2.5,
  };
  const m = makeMatrix(new Array(96 * 72).fill(0), 96, 72); // 48×18 单元
  const lay = computeLayout(m, settings);
  eq([lay.cellsX, lay.cellsY], [30, 26], "A4 capacity 30×26 cells");
  eq(lay.pages.length, 2, "48×18 cells -> 2 pages");
  eq([lay.pages[0]!.cellsW, lay.pages[1]!.cellsW], [30, 18], "page split on cell boundary");
  eq(lay.cellPitchX, 6, "cell pitch 6mm at 2.5mm dot pitch");
  eq(lay.linePitch, 10, "line pitch 10mm");
  // 点距变化 → 物理布局变化（与缩放无关，由毫米决定）
  const lay2 = computeLayout(m, { ...settings, dotPitch: 3 });
  eq(Math.abs(lay2.cellPitchX - 7.2) < 1e-9, true, "dot pitch scales physical layout");
  // 小纸大矩阵 → 多页且不剩半单元
  const m2 = makeMatrix(new Array(240 * 200).fill(0), 240, 200); // 120×50 单元
  const lay3 = computeLayout(m2, { ...settings, paper: "A5" });
  const whole = lay3.pages.every(
    (p) => Number.isInteger(p.cellsW) && Number.isInteger(p.cellsH) && p.cellsW > 0 && p.cellsH > 0,
  );
  eq(whole, true, "A5 pagination keeps whole cells");
  eq(
    lay3.pages.reduce((a, p) => a + (p.tileX === 0 ? p.cellsH : 0), 0),
    50,
    "row tiles cover all cell rows",
  );
}

console.log(failed ? `\n${failed} FAILED` : "\nall passed");
process.exit(failed ? 1 : 0);

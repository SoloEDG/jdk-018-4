import type { BrailleConflict, Crop, DotEdit } from "../../../shared/document";

// 手改点以原图归一化坐标锚定；换算到当前密度下的点阵采样区（不含补齐区）
export function editToDot(
  edit: DotEdit,
  crop: Crop,
  rawColumns: number,
  rawRows: number,
): { x: number; y: number } | null {
  const fx = (edit.ix - crop.x) / crop.width;
  const fy = (edit.iy - crop.y) / crop.height;
  if (fx < 0 || fx >= 1 || fy < 0 || fy >= 1) return null;
  return {
    x: Math.min(rawColumns - 1, Math.floor(fx * rawColumns)),
    y: Math.min(rawRows - 1, Math.floor(fy * rawRows)),
  };
}

// 点位 → 原图采样位置（点中心），新增手改时以此锚定
export function dotToAnchor(
  crop: Crop,
  x: number,
  y: number,
  rawColumns: number,
  rawRows: number,
): { ix: number; iy: number } {
  return {
    ix: crop.x + ((x + 0.5) / rawColumns) * crop.width,
    iy: crop.y + ((y + 0.5) / rawRows) * crop.height,
  };
}

// 把手改点应用到自动点阵：同点同向合并；同点异向标记冲突并保留自动值，绝不随机覆盖
export function applyEdits(
  dots: Uint8Array,
  edited: Uint8Array,
  edits: DotEdit[],
  crop: Crop,
  dotColumns: number,
  rawColumns: number,
  rawRows: number,
): { conflicts: BrailleConflict[]; outsideEdits: number } {
  const conflicts: BrailleConflict[] = [];
  let outsideEdits = 0;
  const groups = new Map<number, DotEdit[]>();
  for (const e of edits) {
    const p = editToDot(e, crop, rawColumns, rawRows);
    if (!p) {
      outsideEdits++;
      continue;
    }
    const idx = p.y * dotColumns + p.x;
    const list = groups.get(idx);
    if (list) list.push(e);
    else groups.set(idx, [e]);
  }
  for (const [idx, list] of groups) {
    const first = list[0]!;
    if (list.every((e) => e.on === first.on)) {
      dots[idx] = first.on ? 1 : 0;
      edited[idx] = 1;
    } else {
      conflicts.push({ x: idx % dotColumns, y: Math.floor(idx / dotColumns) });
    }
  }
  conflicts.sort((a, b) => a.y - b.y || a.x - b.x);
  return { conflicts, outsideEdits };
}

import type { BrailleMatrix } from "../../../shared/document";
import type { PrintLayout, PrintPage } from "./pagination";

// 屏幕预览：凸点可借颜色/灰度表达明暗
export function drawScreen(
  canvas: HTMLCanvasElement,
  matrix: BrailleMatrix,
  color: boolean,
  background: string,
) {
  const pitch = 8;
  canvas.width = matrix.dotColumns * pitch;
  canvas.height = matrix.dotRows * pitch;
  const g = canvas.getContext("2d")!;
  g.fillStyle = background;
  g.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < matrix.dotRows; y++) {
    for (let x = 0; x < matrix.dotColumns; x++) {
      const i = y * matrix.dotColumns + x;
      if (!matrix.dots[i]) continue;
      if (color) {
        const j = i * 3;
        g.fillStyle = `rgb(${matrix.colors[j]!},${matrix.colors[j + 1]!},${matrix.colors[j + 2]!})`;
      } else {
        g.fillStyle = "#e9eceb";
      }
      g.beginPath();
      g.arc(x * pitch + pitch / 2, y * pitch + pitch / 2, 3.1, 0, Math.PI * 2);
      g.fill();
    }
  }
}

// 放大的逐点修整视图：补齐区域、单元网格、手改标记与冲突点都明确画出
export function drawEditor(
  canvas: HTMLCanvasElement,
  matrix: BrailleMatrix,
  hover: { x: number; y: number } | null,
) {
  const pitch = 10;
  const w = matrix.dotColumns;
  const h = matrix.dotRows;
  canvas.width = w * pitch;
  canvas.height = h * pitch;
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#0e1013";
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = "rgba(216,164,74,0.10)";
  if (matrix.padRight) {
    g.fillRect(matrix.rawColumns * pitch, 0, matrix.padRight * pitch, h * pitch);
  }
  if (matrix.padBottom) {
    g.fillRect(0, matrix.rawRows * pitch, w * pitch, matrix.padBottom * pitch);
  }
  g.lineWidth = 1;
  g.strokeStyle = "rgba(255,255,255,0.05)";
  g.beginPath();
  for (let x = 1; x < w; x++) {
    g.moveTo(x * pitch + 0.5, 0);
    g.lineTo(x * pitch + 0.5, canvas.height);
  }
  for (let y = 1; y < h; y++) {
    g.moveTo(0, y * pitch + 0.5);
    g.lineTo(canvas.width, y * pitch + 0.5);
  }
  g.stroke();
  g.strokeStyle = "rgba(255,255,255,0.14)";
  g.beginPath();
  for (let x = 2; x < w; x += 2) {
    g.moveTo(x * pitch + 0.5, 0);
    g.lineTo(x * pitch + 0.5, canvas.height);
  }
  for (let y = 4; y < h; y += 4) {
    g.moveTo(0, y * pitch + 0.5);
    g.lineTo(canvas.width, y * pitch + 0.5);
  }
  g.stroke();
  const conflictSet = new Set(matrix.conflicts.map((c) => c.y * w + c.x));
  for (let y = 0; y < matrix.rawRows; y++) {
    for (let x = 0; x < matrix.rawColumns; x++) {
      const i = y * w + x;
      const cx = x * pitch + pitch / 2;
      const cy = y * pitch + pitch / 2;
      if (conflictSet.has(i)) {
        g.fillStyle = "#ff8a7a";
        g.beginPath();
        g.arc(cx, cy, 3.6, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = "#ffd2cb";
        g.stroke();
      } else if (matrix.dots[i]) {
        g.fillStyle = "#d4eb98";
        g.beginPath();
        g.arc(cx, cy, 3.2, 0, Math.PI * 2);
        g.fill();
      } else {
        g.strokeStyle = "#3d434c";
        g.beginPath();
        g.arc(cx, cy, 2.7, 0, Math.PI * 2);
        g.stroke();
      }
      if (matrix.edited[i]) {
        g.fillStyle = "#ffffff";
        g.beginPath();
        g.arc(cx, cy, 1, 0, Math.PI * 2);
        g.fill();
      }
    }
  }
  if (hover) {
    g.strokeStyle = "#ffffff";
    g.beginPath();
    g.arc(hover.x * pitch + pitch / 2, hover.y * pitch + pitch / 2, 4.4, 0, Math.PI * 2);
    g.stroke();
  }
}

const MM_PX = 96 / 25.4;
export { MM_PX };

// 印刷页预览：画布尺寸由毫米决定（96 DPI），缩放只改 CSS 显示尺寸
export function drawPrintPage(
  canvas: HTMLCanvasElement,
  matrix: BrailleMatrix,
  layout: PrintLayout,
  page: PrintPage,
) {
  canvas.width = Math.round(layout.paper.w * MM_PX);
  canvas.height = Math.round(layout.paper.h * MM_PX);
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.strokeStyle = "#c9c9c9";
  g.setLineDash([4, 4]);
  g.strokeRect(
    layout.margin * MM_PX,
    layout.margin * MM_PX,
    (layout.paper.w - layout.margin * 2) * MM_PX,
    (layout.paper.h - layout.margin * 2) * MM_PX,
  );
  g.setLineDash([]);
  const r = layout.dotRadius * MM_PX;
  for (let cy = 0; cy < page.cellsH; cy++) {
    for (let cx = 0; cx < page.cellsW; cx++) {
      const gx = page.cellX + cx;
      const gy = page.cellY + cy;
      for (let dy = 0; dy < 4; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          if (!matrix.dots[(gy * 4 + dy) * matrix.dotColumns + gx * 2 + dx]) continue;
          const px = (layout.margin + cx * layout.cellPitchX + dx * layout.dotPitch) * MM_PX;
          const py = (layout.margin + cy * layout.linePitch + dy * layout.dotPitch) * MM_PX;
          g.fillStyle = "#161616";
          g.beginPath();
          g.arc(px, py, r, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = "rgba(255,255,255,0.3)";
          g.beginPath();
          g.arc(px - r * 0.3, py - r * 0.3, r * 0.35, 0, Math.PI * 2);
          g.fill();
        }
      }
    }
  }
}

// 印刷正式文件：SVG 全部使用毫米单位，物理点距固定
export function printPageSvg(
  matrix: BrailleMatrix,
  layout: PrintLayout,
  page: PrintPage,
): string {
  const dots: string[] = [];
  for (let cy = 0; cy < page.cellsH; cy++) {
    for (let cx = 0; cx < page.cellsW; cx++) {
      const gx = page.cellX + cx;
      const gy = page.cellY + cy;
      for (let dy = 0; dy < 4; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          if (!matrix.dots[(gy * 4 + dy) * matrix.dotColumns + gx * 2 + dx]) continue;
          const px = layout.margin + cx * layout.cellPitchX + dx * layout.dotPitch;
          const py = layout.margin + cy * layout.linePitch + dy * layout.dotPitch;
          dots.push(
            `<circle cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" r="${layout.dotRadius.toFixed(2)}" fill="#000000"/>`,
          );
        }
      }
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.paper.w}mm" height="${layout.paper.h}mm" viewBox="0 0 ${layout.paper.w} ${layout.paper.h}">` +
    `<rect width="100%" height="100%" fill="#ffffff"/>` +
    dots.join("") +
    `</svg>`
  );
}

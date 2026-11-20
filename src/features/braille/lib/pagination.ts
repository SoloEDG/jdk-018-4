import type { BrailleMatrix, BrailleSettings, PaperId } from "../../../shared/document";

export interface PaperSpec {
  id: PaperId;
  name: string;
  w: number;
  h: number;
}
export const papers: PaperSpec[] = [
  { id: "A4", name: "A4 · 210×297 mm", w: 210, h: 297 },
  { id: "A5", name: "A5 · 148×210 mm", w: 148, h: 210 },
  { id: "Letter", name: "Letter · 216×279 mm", w: 215.9, h: 279.4 },
];

export interface PrintPage {
  index: number;
  tileX: number;
  tileY: number;
  cellX: number;
  cellY: number;
  cellsW: number;
  cellsH: number;
}
export interface PrintLayout {
  paper: PaperSpec;
  margin: number;
  dotPitch: number;
  dotRadius: number;
  cellPitchX: number;
  linePitch: number;
  cellsX: number;
  cellsY: number;
  pages: PrintPage[];
}

// 物理排版：点距/单元距/行距均为毫米，与屏幕缩放无关；
// 纸张放不下时按整单元分页，绝不拆开一个盲文单元
export function computeLayout(
  matrix: BrailleMatrix,
  settings: BrailleSettings,
): PrintLayout {
  const paper = papers.find((p) => p.id === settings.paper) ?? papers[0]!;
  const margin = 15;
  const dotPitch = settings.dotPitch;
  const dotRadius = dotPitch * 0.3;
  const cellPitchX = dotPitch * 2.4;
  const linePitch = dotPitch * 4;
  const printableW = paper.w - margin * 2;
  const printableH = paper.h - margin * 2;
  const cellsX = Math.max(1, Math.floor((printableW - dotPitch) / cellPitchX) + 1);
  const cellsY = Math.max(1, Math.floor((printableH - 3 * dotPitch) / linePitch) + 1);
  const pagesX = Math.ceil(matrix.cellColumns / cellsX);
  const pagesY = Math.ceil(matrix.cellRows / cellsY);
  const pages: PrintPage[] = [];
  for (let ty = 0; ty < pagesY; ty++) {
    for (let tx = 0; tx < pagesX; tx++) {
      pages.push({
        index: pages.length,
        tileX: tx,
        tileY: ty,
        cellX: tx * cellsX,
        cellY: ty * cellsY,
        cellsW: Math.min(cellsX, matrix.cellColumns - tx * cellsX),
        cellsH: Math.min(cellsY, matrix.cellRows - ty * cellsY),
      });
    }
  }
  return {
    paper,
    margin,
    dotPitch,
    dotRadius,
    cellPitchX,
    linePitch,
    cellsX,
    cellsY,
    pages,
  };
}

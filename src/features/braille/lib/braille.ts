import type { BrailleMatrix } from "../../../shared/document";

// 标准 8 点盲文编号：左列 1/2/3/7，右列 4/5/6/8
const BIT: readonly (readonly number[])[] = [
  [0x01, 0x08],
  [0x02, 0x10],
  [0x04, 0x20],
  [0x40, 0x80],
];

export function cellBits(
  dots: Uint8Array,
  dotColumns: number,
  cx: number,
  cy: number,
): number {
  let bits = 0;
  for (let dy = 0; dy < 4; dy++) {
    for (let dx = 0; dx < 2; dx++) {
      if (dots[(cy * 4 + dy) * dotColumns + cx * 2 + dx]) {
        bits |= BIT[dy]![dx]!;
      }
    }
  }
  return bits;
}

// 把确认点阵按真实点位组合成盲文 Unicode 字符文本
export function brailleText(matrix: BrailleMatrix): string {
  const lines: string[] = [];
  for (let cy = 0; cy < matrix.cellRows; cy++) {
    let line = "";
    for (let cx = 0; cx < matrix.cellColumns; cx++) {
      line += String.fromCharCode(
        0x2800 + cellBits(matrix.dots, matrix.dotColumns, cx, cy),
      );
    }
    lines.push(line);
  }
  return lines.join("\n");
}

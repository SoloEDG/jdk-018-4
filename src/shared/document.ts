export interface Crop {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Asset {
  name: string;
  url: string;
  width: number;
  height: number;
  image: HTMLImageElement;
}
export interface Settings {
  columns: number;
  charset: string;
  custom: string;
  contrast: number;
  gamma: number;
  invert: boolean;
  color: boolean;
  background: string;
}
export interface Cell {
  glyph: string;
  color: string;
}
export interface Grid {
  columns: number;
  rows: number;
  cells: Cell[];
  revision: number;
}
export type BrailleMode = "outline" | "gray";
export type PaperId = "A4" | "A5" | "Letter";
export interface BrailleSettings {
  dotColumns: number;
  mode: BrailleMode;
  threshold: number;
  invert: boolean;
  color: boolean;
  paper: PaperId;
  dotPitch: number;
}
export interface DotEdit {
  ix: number;
  iy: number;
  on: boolean;
}
export interface BrailleConflict {
  x: number;
  y: number;
}
export interface ModeStats {
  on: number;
  missing: number;
  extra: number;
  loss: number;
}
export interface BrailleMatrix {
  dotColumns: number;
  dotRows: number;
  rawColumns: number;
  rawRows: number;
  padRight: number;
  padBottom: number;
  cellColumns: number;
  cellRows: number;
  transparent: number;
  dots: Uint8Array;
  tones: Float32Array;
  colors: Uint8ClampedArray;
  edited: Uint8Array;
  conflicts: BrailleConflict[];
  outsideEdits: number;
  stats: ModeStats;
  compare: Record<BrailleMode, ModeStats>;
  revision: number;
}
export interface BrailleDoc {
  settings: BrailleSettings;
  edits: DotEdit[];
  matrix: BrailleMatrix | null;
}
export interface StudioDocument {
  asset: Asset | null;
  crop: Crop;
  settings: Settings;
  grid: Grid | null;
  braille: BrailleDoc;
  revision: number;
}

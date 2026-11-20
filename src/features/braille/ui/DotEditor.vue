<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import type { BrailleMatrix } from "../../../shared/document";
import { useStudio } from "../../../shared/useStudio";
import { dotToAnchor } from "../lib/edits";
import { drawEditor } from "../lib/render";
const props = defineProps<{
  matrix: BrailleMatrix;
  zoom: number;
  tool: "toggle" | "on" | "off";
}>();
const emit = defineEmits<{ paint: [x: number, y: number, on: boolean] }>();
const { doc } = useStudio();
const canvas = ref<HTMLCanvasElement>();
const hover = ref<{ x: number; y: number } | null>(null);
let painting = false;
let paintState = true;
function dotAt(e: PointerEvent): { x: number; y: number } | null {
  const el = canvas.value;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const x = Math.floor(((e.clientX - r.left) / r.width) * props.matrix.dotColumns);
  const y = Math.floor(((e.clientY - r.top) / r.height) * props.matrix.dotRows);
  if (x < 0 || y < 0 || x >= props.matrix.rawColumns || y >= props.matrix.rawRows) {
    return null;
  }
  return { x, y };
}
function down(e: PointerEvent) {
  const p = dotAt(e);
  if (!p) return;
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  painting = true;
  const i = p.y * props.matrix.dotColumns + p.x;
  paintState =
    props.tool === "on" ? true : props.tool === "off" ? false : !props.matrix.dots[i];
  emit("paint", p.x, p.y, paintState);
}
function move(e: PointerEvent) {
  const p = dotAt(e);
  hover.value = p;
  if (painting && p) emit("paint", p.x, p.y, paintState);
}
function up() {
  painting = false;
}
function draw() {
  if (canvas.value) drawEditor(canvas.value, props.matrix, hover.value);
}
onMounted(draw);
watch(() => [props.matrix, hover.value], draw);
function anchorText() {
  const h = hover.value;
  if (!h) return "点击或拖动逐点修整 · 手改锚定原图采样位置";
  const a = dotToAnchor(
    doc.crop,
    h.x,
    h.y,
    props.matrix.rawColumns,
    props.matrix.rawRows,
  );
  return `点 (${h.x}, ${h.y}) · 单元 (${Math.floor(h.x / 2)}, ${Math.floor(h.y / 4)}) · 锚定原图 (${(a.ix * 100).toFixed(1)}%, ${(a.iy * 100).toFixed(1)}%)`;
}
</script>
<template>
  <div class="dot-editor">
    <canvas
      ref="canvas"
      @pointerdown="down"
      @pointermove="move"
      @pointerup="up"
      @pointercancel="up"
      @pointerleave="hover = null"
      :style="{
        width: (matrix.dotColumns * 10 * zoom) / 100 + 'px',
        height: (matrix.dotRows * 10 * zoom) / 100 + 'px',
      }"
    />
    <div class="editor-status mono">{{ anchorText() }}</div>
  </div>
</template>

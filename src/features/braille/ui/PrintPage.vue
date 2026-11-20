<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import type { BrailleMatrix } from "../../../shared/document";
import type { PrintLayout, PrintPage as Page } from "../lib/pagination";
import { drawPrintPage, MM_PX } from "../lib/render";
const props = defineProps<{
  matrix: BrailleMatrix;
  layout: PrintLayout;
  page: Page;
  zoom: number;
}>();
const canvas = ref<HTMLCanvasElement>();
function draw() {
  if (canvas.value) drawPrintPage(canvas.value, props.matrix, props.layout, props.page);
}
onMounted(draw);
watch(() => [props.matrix, props.layout], draw);
</script>
<template>
  <figure class="print-page">
    <canvas
      ref="canvas"
      aria-label="盲文印刷页预览"
      :style="{
        width: (layout.paper.w * MM_PX * zoom) / 100 + 'px',
        height: (layout.paper.h * MM_PX * zoom) / 100 + 'px',
      }"
    />
    <figcaption>
      第 {{ page.index + 1 }} / {{ layout.pages.length }} 页 ·
      {{ layout.paper.name }} · 单元 {{ page.cellsW }}×{{ page.cellsH }}
    </figcaption>
  </figure>
</template>

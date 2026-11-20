<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import type { BrailleMatrix } from "../../../shared/document";
import { drawScreen } from "../lib/render";
const props = defineProps<{
  matrix: BrailleMatrix;
  color: boolean;
  background: string;
  zoom: number;
}>();
const canvas = ref<HTMLCanvasElement>();
function draw() {
  if (canvas.value) {
    drawScreen(canvas.value, props.matrix, props.color, props.background);
  }
}
onMounted(draw);
watch(() => [props.matrix, props.color, props.background], draw);
</script>
<template>
  <canvas
    ref="canvas"
    aria-label="盲文屏幕预览"
    :style="{
      width: (matrix.dotColumns * 8 * zoom) / 100 + 'px',
      height: (matrix.dotRows * 8 * zoom) / 100 + 'px',
    }"
  />
</template>

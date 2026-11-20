<script setup lang="ts">
import { ArrowUpRight, Copy, Download } from "lucide-vue-next";
import { useBraille } from "../model/useBraille";
const b = useBraille();
</script>
<template>
  <section class="export-bar">
    <div>
      <span class="eyebrow">BRAILLE OUTPUT</span>
      <h3>同一份确认点阵，三种交付</h3>
      <small v-if="b.lockedReason.value" class="lock-note"
        >🔒 {{ b.lockedReason.value }} — 已禁止生成正式文件</small
      >
      <small v-else>盲文文本、彩色画面与印刷分页均来自当前确认点阵。</small>
    </div>
    <div class="export-actions">
      <button
        class="secondary"
        :disabled="!!b.lockedReason.value"
        @click="b.copyText"
      >
        <Copy :size="15" /> 复制盲文</button
      ><button
        class="secondary"
        :disabled="!!b.lockedReason.value"
        @click="b.saveText"
      >
        文本 <ArrowUpRight :size="15" /></button
      ><button
        class="secondary"
        :disabled="!!b.lockedReason.value"
        @click="b.savePng"
      >
        屏幕 PNG</button
      ><button
        class="primary"
        :disabled="!!b.lockedReason.value"
        @click="b.saveSvg"
      >
        <Download :size="16" /> 印刷 SVG（{{ b.layout.value?.pages.length ?? 0 }}
        页）
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Asterisk, LockKeyhole, ArrowUpRight, Type, Grip } from "lucide-vue-next";
import { useWorkspace } from "./useWorkspace";
import { SourcePanel } from "../features/source";
import { CropPanel } from "../features/crop";
import { MappingPanel } from "../features/mapping";
import { PreviewPanel } from "../features/preview";
import { ExportPanel } from "../features/export";
import { BraillePanel, BrailleStage, BrailleExport } from "../features/braille";
const w = useWorkspace();
const mode = ref<"ascii" | "braille">("ascii");
</script>
<template>
  <div class="app">
    <header>
      <a class="brand" href="./"
        ><span class="brand-mark"><Asterisk :size="27" /></span> GLYPH<span
          class="brand-sub"
          >/ ASCII STUDIO</span
        ></a
      >
      <div class="header-right">
        <span><LockKeyhole :size="12" /> 本地处理 · 无需上传</span
        ><span class="version">V.1.0 <ArrowUpRight :size="12" /></span>
      </div>
    </header>
    <div class="intro">
      <div>
        <div class="eyebrow"><span /> THE ART OF LESS</div>
        <h1>让图像，用字符说话<span>。</span></h1>
        <p>把细腻光影，转译成有温度的 ASCII 艺术。</p>
      </div>
      <div class="intro-code">
        . : - = + * # % @<small>PIXELS → CHARACTERS → ART</small>
      </div>
    </div>
    <div class="mode-bar">
      <div class="tabs">
        <button :class="{ active: mode === 'ascii' }" @click="mode = 'ascii'">
          <Type :size="14" /> 字符 ASCII</button
        ><button :class="{ active: mode === 'braille' }" @click="mode = 'braille'">
          <Grip :size="14" /> 盲文点阵制版
        </button>
      </div>
      <small>{{
        mode === "ascii"
          ? "像素 → 字符 → 艺术"
          : "真实点位 · 逐点修整 · 屏幕与凸点印刷双预览"
      }}</small>
    </div>
    <div class="editor">
      <aside>
        <SourcePanel /><CropPanel />
        <MappingPanel v-if="mode === 'ascii'" />
        <BraillePanel v-else />
      </aside>
      <div class="result">
        <template v-if="mode === 'ascii'"><PreviewPanel /><ExportPanel /></template>
        <template v-else><BrailleStage /><BrailleExport /></template>
      </div>
    </div>
    <footer>
      <span role="status">{{ w.notice.value }}</span
      ><span>CRAFTED IN CHARACTERS <b>✳</b></span>
    </footer>
  </div>
</template>

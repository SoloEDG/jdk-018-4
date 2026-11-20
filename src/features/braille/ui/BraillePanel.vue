<script setup lang="ts">
import { Grip } from "lucide-vue-next";
import { useStudio } from "../../../shared/useStudio";
import { useBraille } from "../model/useBraille";
import { papers } from "../lib/pagination";
import type { BrailleMode } from "../../../shared/document";
const { invalidate } = useStudio();
const b = useBraille();
const s = b.doc.braille.settings;
const fmt = (n: number) => n.toLocaleString();
const pct = (t: number) => (t * 100).toFixed(1) + "%";
function setMode(mode: BrailleMode) {
  s.mode = mode;
  invalidate();
}
</script>
<template>
  <section class="panel">
    <div class="section-title">
      <span>04 / BRAILLE PLATE</span><Grip :size="15" />
    </div>
    <label class="field"
      >点阵密度 <b>{{ s.dotColumns }} 点/行</b
      ><input
        aria-label="点阵密度"
        type="range"
        min="24"
        max="240"
        step="1"
        v-model.number="s.dotColumns"
        @input="invalidate"
    /></label>
    <div class="range-ends"><span>疏朗</span><span>精细</span></div>
    <div class="field">制版模式 <b>点位损失对比</b></div>
    <div class="mode-compare">
      <button
        type="button"
        class="mode-card"
        :class="{ active: s.mode === 'outline' }"
        @click="setMode('outline')"
      >
        <b>保留轮廓</b>
        <span v-if="b.matrix.value"
          >凸点 {{ fmt(b.matrix.value.compare.outline.on) }} · 丢失
          {{ fmt(b.matrix.value.compare.outline.missing) }} · 误差
          {{ pct(b.matrix.value.compare.outline.loss) }}</span
        >
        <span v-else>硬阈值成点，轮廓清晰</span>
      </button>
      <button
        type="button"
        class="mode-card"
        :class="{ active: s.mode === 'gray' }"
        @click="setMode('gray')"
      >
        <b>保留灰阶</b>
        <span v-if="b.matrix.value"
          >凸点 {{ fmt(b.matrix.value.compare.gray.on) }} · 丢失
          {{ fmt(b.matrix.value.compare.gray.missing) }} · 误差
          {{ pct(b.matrix.value.compare.gray.loss) }}</span
        >
        <span v-else>有序抖动，灰度过渡</span>
      </button>
    </div>
    <label class="field"
      >成点阈值 <b>{{ s.threshold.toFixed(2) }}</b
      ><input
        aria-label="成点阈值"
        type="range"
        min="0.2"
        max="0.8"
        step="0.01"
        v-model.number="s.threshold"
        @input="invalidate"
    /></label>
    <label class="toggle-row"
      ><span>反转明暗</span
      ><input
        aria-label="反转明暗"
        type="checkbox"
        v-model="s.invert"
        @change="invalidate"
    /></label>
    <label class="toggle-row"
      ><span>屏幕预览彩色</span
      ><input aria-label="屏幕预览彩色" type="checkbox" v-model="s.color"
    /></label>
    <label class="field"
      >印刷纸张
      <select aria-label="印刷纸张" v-model="s.paper">
        <option v-for="p in papers" :key="p.id" :value="p.id">
          {{ p.name }}
        </option>
      </select></label
    >
    <label class="field"
      >物理点距 <b>{{ s.dotPitch.toFixed(1) }} mm</b
      ><input
        aria-label="物理点距"
        type="range"
        min="2.2"
        max="3"
        step="0.1"
        v-model.number="s.dotPitch"
    /></label>
    <div class="pad-info" v-if="b.matrix.value">
      <div>
        点阵 {{ b.matrix.value.rawColumns }}×{{ b.matrix.value.rawRows }} →
        {{ b.matrix.value.dotColumns }}×{{ b.matrix.value.dotRows
        }}<template v-if="b.matrix.value.padRight || b.matrix.value.padBottom"
          >（已补齐：右 {{ b.matrix.value.padRight }} 列 · 下
          {{ b.matrix.value.padBottom }} 行空白）</template
        ><template v-else>（行列成组，无需补齐）</template>
      </div>
      <div>
        单元 {{ b.matrix.value.cellColumns }}×{{ b.matrix.value.cellRows }} =
        {{ fmt(b.matrix.value.cellColumns * b.matrix.value.cellRows) }} 字
        <template v-if="b.matrix.value.transparent"
          >· 透明 {{ fmt(b.matrix.value.transparent) }} 点已铺底</template
        >
      </div>
    </div>
    <div class="edit-info" v-if="b.doc.braille.edits.length">
      <span
        >手改 {{ b.doc.braille.edits.length }} 点<template
          v-if="b.matrix.value?.outsideEdits"
        >
          · {{ b.matrix.value.outsideEdits }} 处在裁剪外</template
        ></span
      >
      <span>
        <button
          v-if="b.matrix.value?.outsideEdits"
          class="mini"
          @click="b.pruneOutside"
        >
          清理裁剪外</button
        ><button class="mini" @click="b.clearEdits">全部清除</button>
      </span>
    </div>
  </section>
</template>

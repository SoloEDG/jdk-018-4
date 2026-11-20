<script setup lang="ts">
import { computed } from "vue";
import {
  AlertTriangle,
  Code2,
  Minus,
  Monitor,
  PencilRuler,
  Plus,
  Printer,
} from "lucide-vue-next";
import { useBraille } from "../model/useBraille";
import { brailleText } from "../lib/braille";
import DotEditor from "./DotEditor.vue";
import ScreenPreview from "./ScreenPreview.vue";
import PrintPage from "./PrintPage.vue";
const b = useBraille();
const text = computed(() => (b.matrix.value ? brailleText(b.matrix.value) : ""));
const status = computed(() => {
  if (b.busy.value) return "生成中";
  if (b.stale.value) return "待重新生成";
  if (b.conflictCount.value) return `冲突 ${b.conflictCount.value} 处`;
  return "已确认";
});
const labels = {
  edit: "DOT EDITOR",
  screen: "SCREEN PREVIEW",
  text: "BRAILLE TEXT",
  print: "PRINT PAGES",
};
const fmt = (n: number) => n.toLocaleString();
</script>
<template>
  <main class="workspace">
    <div class="preview-toolbar">
      <div class="tabs">
        <button
          :class="{ active: b.tab.value === 'edit' }"
          @click="b.tab.value = 'edit'"
        >
          <PencilRuler :size="14" /> 点阵修整</button
        ><button
          :class="{ active: b.tab.value === 'screen' }"
          @click="b.tab.value = 'screen'"
        >
          <Monitor :size="14" /> 屏幕画面</button
        ><button
          :class="{ active: b.tab.value === 'text' }"
          @click="b.tab.value = 'text'"
        >
          <Code2 :size="14" /> 盲文文本</button
        ><button
          :class="{ active: b.tab.value === 'print' }"
          @click="b.tab.value = 'print'"
        >
          <Printer :size="14" /> 印刷分页
        </button>
      </div>
      <div class="zoom">
        <button
          aria-label="缩小"
          @click="b.zoom.value = Math.max(25, b.zoom.value - 25)"
        >
          <Minus :size="14" /></button
        ><span>{{ b.zoom.value }}%</span
        ><button
          aria-label="放大"
          @click="b.zoom.value = Math.min(400, b.zoom.value + 25)"
        >
          <Plus :size="14" />
        </button>
      </div>
    </div>
    <div v-if="b.conflictCount.value" class="conflict-bar">
      <AlertTriangle :size="14" />
      <span
        >密度调整后 {{ b.conflictCount.value }} 处手改重叠为冲突，未做随机覆盖；解决前禁止导出正式文件。</span
      >
      <button @click="b.resolveConflicts(true)">全部置凸</button>
      <button @click="b.resolveConflicts(false)">全部置空</button>
      <button @click="b.dropConflicts">清除冲突改动</button>
    </div>
    <div class="art-stage">
      <div class="stage-label">BRAILLE / {{ labels[b.tab.value] }} <span>●</span></div>
      <div class="art-scroll">
        <template v-if="b.matrix.value">
          <DotEditor
            v-if="b.tab.value === 'edit'"
            :matrix="b.matrix.value"
            :zoom="b.zoom.value"
            :tool="b.tool.value"
            @paint="b.paintDot"
          />
          <ScreenPreview
            v-else-if="b.tab.value === 'screen'"
            :matrix="b.matrix.value"
            :color="b.doc.braille.settings.color"
            :background="b.doc.settings.background"
            :zoom="b.zoom.value"
          />
          <pre
            v-else-if="b.tab.value === 'text'"
            class="braille-text"
            data-testid="braille-text"
            :style="{
              fontSize: (16 * b.zoom.value) / 100 + 'px',
              lineHeight: (17 * b.zoom.value) / 100 + 'px',
            }"
            >{{ text }}</pre
          >
          <div v-else class="print-pages">
            <template v-if="b.layout.value">
              <PrintPage
                v-for="p in b.layout.value.pages"
                :key="p.index"
                :matrix="b.matrix.value"
                :layout="b.layout.value"
                :page="p"
                :zoom="b.zoom.value"
              />
              <div class="print-note">
                物理点距 {{ b.layout.value.dotPitch.toFixed(1) }} mm · 单元
                {{ b.layout.value.cellPitchX.toFixed(1) }}×{{
                  b.layout.value.linePitch.toFixed(1)
                }}
                mm · 每页 {{ b.layout.value.cellsX }}×{{ b.layout.value.cellsY }}
                单元 · 缩放不改变物理尺寸 · 分页不拆开任何盲文单元
              </div>
            </template>
          </div>
        </template>
        <span v-else>正在准备盲文点阵…</span>
      </div>
      <div class="stage-corner">
        {{ b.matrix.value?.cellColumns }}×{{ b.matrix.value?.cellRows }} 单元 ·
        {{ b.matrix.value?.dotColumns }}×{{ b.matrix.value?.dotRows }} 点
      </div>
    </div>
    <div class="preview-bottom">
      <span class="mono"
        ><i class="status-dot" />{{ status }}
        <span class="muted" v-if="b.matrix.value">
          / {{ fmt(b.matrix.value.stats.on) }} 凸点 · 丢失
          {{ fmt(b.matrix.value.stats.missing) }} · 手改
          {{ b.doc.braille.edits.length }}</span
        ></span
      >
      <div class="tool-row" v-if="b.tab.value === 'edit'">
        <button
          :class="{ active: b.tool.value === 'toggle' }"
          @click="b.tool.value = 'toggle'"
        >
          切换</button
        ><button
          :class="{ active: b.tool.value === 'on' }"
          @click="b.tool.value = 'on'"
        >
          置凸</button
        ><button
          :class="{ active: b.tool.value === 'off' }"
          @click="b.tool.value = 'off'"
        >
          擦除
        </button>
      </div>
    </div>
  </main>
</template>

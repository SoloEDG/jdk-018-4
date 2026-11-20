import { computed, ref } from "vue";
import { useStudio } from "../../../shared/useStudio";
import { brailleText } from "../lib/braille";
import { dotToAnchor, editToDot } from "../lib/edits";
import { computeLayout } from "../lib/pagination";
import { drawScreen, printPageSvg } from "../lib/render";
import { download } from "../../export/lib/download";

const tab = ref<"edit" | "screen" | "text" | "print">("edit");
const zoom = ref(100);
const tool = ref<"toggle" | "on" | "off">("toggle");

export function useBraille() {
  const { doc, busy, notice, invalidate } = useStudio();
  const matrix = computed(() => doc.braille.matrix);
  const layout = computed(() =>
    matrix.value ? computeLayout(matrix.value, doc.braille.settings) : null,
  );
  const stale = computed(
    () => !matrix.value || matrix.value.revision !== doc.revision,
  );
  const conflictCount = computed(() => matrix.value?.conflicts.length ?? 0);
  const lockedReason = computed(() => {
    if (!matrix.value) return "点阵尚未生成";
    if (busy.value || stale.value) return "点阵更新中";
    if (conflictCount.value) return `存在 ${conflictCount.value} 处点位冲突`;
    return "";
  });

  // 存在冲突或点阵未确认时，禁止生成正式文件
  function guard(): boolean {
    if (lockedReason.value) {
      notice.value = `已阻止生成正式文件：${lockedReason.value}`;
      return false;
    }
    return true;
  }

  // 逐点修整：锚定原图采样位置；同一点的旧改动被本次明确操作取代
  function paintDot(x: number, y: number, on: boolean) {
    const m = matrix.value;
    if (!m || x >= m.rawColumns || y >= m.rawRows) return;
    const kept = doc.braille.edits.filter((e) => {
      const p = editToDot(e, doc.crop, m.rawColumns, m.rawRows);
      return !p || p.x !== x || p.y !== y;
    });
    kept.push({ ...dotToAnchor(doc.crop, x, y, m.rawColumns, m.rawRows), on });
    doc.braille.edits = kept;
    invalidate();
  }

  // 冲突由用户明确选择解决，不做随机覆盖
  function resolveConflicts(on: boolean) {
    const m = matrix.value;
    if (!m || !m.conflicts.length) return;
    const keys = new Set(m.conflicts.map((c) => c.y * m.dotColumns + c.x));
    const kept = doc.braille.edits.filter((e) => {
      const p = editToDot(e, doc.crop, m.rawColumns, m.rawRows);
      return !p || !keys.has(p.y * m.dotColumns + p.x);
    });
    for (const c of m.conflicts) {
      kept.push({
        ...dotToAnchor(doc.crop, c.x, c.y, m.rawColumns, m.rawRows),
        on,
      });
    }
    doc.braille.edits = kept;
    invalidate();
    notice.value = on ? "冲突已全部置为凸点" : "冲突已全部置为空白";
  }

  function dropConflicts() {
    const m = matrix.value;
    if (!m || !m.conflicts.length) return;
    const keys = new Set(m.conflicts.map((c) => c.y * m.dotColumns + c.x));
    doc.braille.edits = doc.braille.edits.filter((e) => {
      const p = editToDot(e, doc.crop, m.rawColumns, m.rawRows);
      return !p || !keys.has(p.y * m.dotColumns + p.x);
    });
    invalidate();
    notice.value = "已清除冲突改动，恢复自动点位";
  }

  function clearEdits() {
    if (!doc.braille.edits.length) return;
    doc.braille.edits = [];
    invalidate();
    notice.value = "已清除全部手改点";
  }

  function pruneOutside() {
    const m = matrix.value;
    if (!m) return;
    doc.braille.edits = doc.braille.edits.filter((e) =>
      editToDot(e, doc.crop, m.rawColumns, m.rawRows),
    );
    invalidate();
    notice.value = "已清理裁剪区域外的手改点";
  }

  function fileName(ext: string, page?: number) {
    const base = (doc.asset?.name ?? "braille")
      .replace(/\.[^.]+$/, "")
      .replace(/[^\p{L}\p{N}_-]/gu, "_");
    return `${base}-braille${page != null ? `-p${page}` : ""}.${ext}`;
  }

  async function copyText() {
    if (!guard()) return;
    try {
      await navigator.clipboard.writeText(brailleText(matrix.value!));
      notice.value = "盲文文本已复制";
    } catch {
      notice.value = "无法访问剪贴板，请使用文本导出";
    }
  }

  function saveText() {
    if (!guard()) return;
    download(
      new Blob([brailleText(matrix.value!)], { type: "text/plain;charset=utf-8" }),
      fileName("txt"),
    );
    notice.value = "盲文文本已导出";
  }

  function savePng() {
    if (!guard()) return;
    const c = document.createElement("canvas");
    drawScreen(c, matrix.value!, doc.braille.settings.color, doc.settings.background);
    c.toBlob((b) => {
      if (b) download(b, fileName("png"));
    }, "image/png");
    notice.value = "屏幕画面 PNG 已导出";
  }

  function saveSvg() {
    if (!guard()) return;
    const lay = layout.value!;
    lay.pages.forEach((p, i) => {
      setTimeout(() => {
        download(
          new Blob([printPageSvg(matrix.value!, lay, p)], { type: "image/svg+xml" }),
          fileName("svg", p.index + 1),
        );
      }, i * 300);
    });
    notice.value =
      lay.pages.length > 1
        ? `印刷分页共 ${lay.pages.length} 页，逐页导出 SVG（物理点距 ${doc.braille.settings.dotPitch.toFixed(1)} mm）`
        : "印刷 SVG 已导出";
  }

  return {
    doc,
    busy,
    tab,
    zoom,
    tool,
    matrix,
    layout,
    stale,
    conflictCount,
    lockedReason,
    paintDot,
    resolveConflicts,
    dropConflicts,
    clearEdits,
    pruneOutside,
    copyText,
    saveText,
    savePng,
    saveSvg,
  };
}

import { reactive, ref, provide, watch } from "vue";
import { createDocument } from "../shared/defaults";
import { studioKey } from "../shared/context";
import { generate } from "../features/mapping";
import { buildMatrix } from "../features/braille";
export function useWorkspace() {
  const doc = reactive(createDocument());
  const busy = ref(false),
    notice = ref("所有处理均在你的浏览器中完成");
  let timer: ReturnType<typeof setTimeout>;
  function invalidate() {
    doc.revision++;
    busy.value = true;
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        doc.grid = generate(doc);
      } catch (e) {
        notice.value = e instanceof Error ? e.message : "生成失败";
      }
      try {
        doc.braille.matrix = buildMatrix(doc);
      } catch (e) {
        notice.value = e instanceof Error ? e.message : "点阵生成失败";
      } finally {
        busy.value = false;
      }
    }, 60);
  }
  watch(() => doc.settings.background, invalidate);
  watch(() => doc.asset, () => {
    doc.braille.edits = [];
  });
  provide(studioKey, { doc, busy, notice, invalidate });
  return { doc, busy, notice };
}

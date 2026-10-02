<template>
  <!-- 點欄位才出現的浮動輸入板：依欄位型別只開一種面板，放在欄位旁邊不蓋住欄位 -->
  <template v-if="field">
    <FloatOperatorPad
      v-if="kind === 'operator'"
      :anchor="anchor"
      :avoid="avoid"
      :operators="operators"
      close-on-outside
      @button-clicked="onButton"
    />
    <FloatNumPad
      v-else
      :anchor="anchor"
      :avoid="avoid"
      :decimal="decimal"
      backspace
      :operators="kind === 'expression' ? operators : []"
      close-on-outside
      @button-clicked="onButton"
    />
  </template>
</template>

<script>
import FloatNumPad from "@/components/FloatNumPad.vue";
import FloatOperatorPad from "@/components/FloatOperatorPad.vue";

// 欄位元素要加上 data-pad-field，點其他欄位才不會被當成「點外面」而收起
// 送出的按鍵：數字 "0"～"9"、"."、"←"、"clear" 與運算符號；關閉時送出 close
export default {
  name: "FieldPad",
  components: { FloatNumPad, FloatOperatorPad },
  props: {
    // 目前作答的欄位元素；null 表示收起
    field: { type: Object, default: null },
    // number：數字板；operator：運算符號板；expression：算式（數字＋少數符號）
    kind: { type: String, default: "number" },
    decimal: { type: Boolean, default: false },
    operators: { type: Array, default: () => ["+", "-", "×", "÷"] },
  },
  emits: ["press", "close"],
  data() {
    return { anchor: null, avoid: [] };
  },
  watch: {
    field: {
      handler() {
        this.measure();
      },
      immediate: true,
    },
    kind() {
      this.measure();
    },
  },
  mounted() {
    window.addEventListener("resize", this.measure);
    window.addEventListener("scroll", this.measure, true);
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.measure);
    window.removeEventListener("scroll", this.measure, true);
  },
  methods: {
    measure() {
      if (!this.field?.getBoundingClientRect) {
        this.anchor = null;
        return;
      }
      const rect = (el) => {
        const r = el.getBoundingClientRect();
        return { top: r.top, left: r.left, bottom: r.bottom, right: r.right };
      };
      this.anchor = rect(this.field);
      // 其他作答欄位：輸入板盡量不要蓋住，學生才點得到下一格
      const fields = [...document.querySelectorAll("[data-pad-field]")]
        .filter((el) => el !== this.field && el.offsetParent)
        .map(rect);
      // 右側功能區的按鈕（送出答案等）更不能蓋住
      const sidebar = [...document.querySelectorAll(".SideBar button")]
        .filter((el) => el.offsetParent)
        .map((el) => ({ ...rect(el), weight: 1000 }));
      this.avoid = [...fields, ...sidebar];
    },
    onButton(label) {
      if (label === "關閉") {
        this.$emit("close");
      } else if (label === "清除") {
        this.$emit("press", "clear");
      } else {
        this.$emit("press", String(label));
      }
    },
  },
};
</script>

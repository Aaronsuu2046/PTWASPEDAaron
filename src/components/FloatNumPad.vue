<template>
  <Teleport to="body">
    <div
      ref="numpad"
      class="floating-num-pad"
      :class="{
        'floating-num-pad--anchored': anchor,
        'floating-num-pad--with-ops': operators.length,
      }"
      :style="{ top: adjustedTop, left: adjustedLeft }"
    >
      <button
        v-for="button in buttons"
        :key="button.label"
        :class="getButtonClass(button)"
        :style="button.style"
        :aria-label="button.label === '←' ? '刪除' : String(button.label)"
        @click="handleClick(button.label)"
      >
        {{ button.label }}
      </button>
    </div>
  </Teleport>
</template>

<script>
import {
  placeNearAnchor,
  clampToViewport,
  listenOutside,
} from "./floatPadPosition.js";

export default {
  name: "FloatNumPad",
  props: {
    // 舊用法：{ top, left } 指定位置
    componentConfig: {
      type: Object,
      default: () => ({}),
    },
    // 選填：欄位位置 { top, left, bottom, right }（視窗座標）；有給就放在欄位旁邊、不蓋住欄位
    anchor: { type: Object, default: null },
    // 選填：盡量不要蓋住的其他欄位位置 [{ top, left, bottom, right }]
    avoid: { type: Array, default: () => [] },
    // 選填：是否顯示小數點（預設顯示，維持既有行為）
    decimal: { type: Boolean, default: true },
    // 選填：是否顯示刪除一個字的「←」鍵
    backspace: { type: Boolean, default: false },
    // 選填：額外的運算符號欄（例如算式欄位需要 +、−、=）
    operators: { type: Array, default: () => [] },
    // 選填：點到面板與欄位以外的地方時送出「關閉」
    closeOnOutside: { type: Boolean, default: false },
    // 點到符合這個選擇器的元素（例如其他欄位）不算外面
    keepOpenSelector: { type: String, default: "[data-pad-field]" },
  },
  emits: ["buttonClicked"],
  data() {
    return {
      adjustedTop: "0px",
      adjustedLeft: "0px",
      stopOutside: null,
    };
  },
  computed: {
    // 使用物件陣列來描述每個按鈕，並設定其標籤和類型
    buttons() {
      const list = [
        { label: 1, type: "number" },
        { label: 2, type: "number" },
        { label: 3, type: "number" },
        { label: "清除", type: "clear" },
        { label: 4, type: "number" },
        { label: 5, type: "number" },
        { label: 6, type: "number" },
        { label: 7, type: "number" },
        { label: 8, type: "number" },
        { label: 9, type: "number" },
        { label: "關閉", type: "close" },
      ];
      // 最後一列：0 依同列其他按鍵決定寬度
      const extras = [];
      if (this.decimal) extras.push({ label: ".", type: "number" });
      if (this.backspace) extras.push({ label: "←", type: "backspace" });
      list.push({ label: 0, type: "number", span: 3 - extras.length });
      list.push(...extras);
      this.operators.forEach((op, i) => {
        list.push({
          label: op,
          type: "operator",
          style: { gridColumn: 5, gridRow: i + 1 },
        });
      });
      return list;
    },
  },
  watch: {
    componentConfig: {
      handler() {
        this.adjustPosition();
      },
      deep: true,
    },
    anchor: {
      handler() {
        this.adjustPosition();
      },
      deep: true,
    },
  },
  mounted() {
    this.adjustPosition();
    window.addEventListener("resize", this.adjustPosition);
    if (this.closeOnOutside) {
      this.stopOutside = listenOutside(
        () => this.$refs.numpad,
        this.keepOpenSelector,
        () => this.$emit("buttonClicked", "關閉")
      );
    }
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.adjustPosition);
    if (this.stopOutside) this.stopOutside();
  },
  methods: {
    handleClick(label) {
      this.$emit("buttonClicked", label);
    },
    adjustPosition() {
      this.$nextTick(() => {
        const numpad = this.$refs.numpad;
        if (!numpad) return;
        const { width, height } = numpad.getBoundingClientRect();
        const pos = this.anchor
          ? placeNearAnchor(width, height, this.anchor, this.avoid)
          : clampToViewport(
              width,
              height,
              parseFloat(this.componentConfig.top),
              parseFloat(this.componentConfig.left)
            );
        this.adjustedTop = `${pos.top}px`;
        this.adjustedLeft = `${pos.left}px`;
      });
    },
    getButtonClass(button) {
      if (button.type === "clear") return "button-clear";
      if (button.type === "close") return "button-close";
      if (button.type === "backspace") return "button-number button-back";
      if (button.type === "operator") return "button-number button-op";
      if (button.label === 0) {
        if (button.span === 3) return "button-number button-zero-full";
        if (button.span === 2) return "button-number button-zero";
      }
      return "button-number";
    },
  },
};
</script>

<style scoped lang="scss">
.floating-num-pad {
  position: absolute;
  display: grid;
  width: fit-content;
  height: fit-content;
  background-color: #9b8c7c;
  grid-template-columns: repeat(4, 1fr);
  padding: 0.5rem;
  justify-content: center;
  align-items: center;
  gap: $gap--tiny;
  border-radius: $border-radius;
  z-index: 1000;

  // 依欄位定位時用視窗座標
  &--anchored {
    position: fixed;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
  }

  &--with-ops {
    grid-template-columns: repeat(5, 1fr);
  }
}

button {
  border: none;
  @extend .button-basic;
}

.button-number {
  width: 4rem;
  height: 4rem;
  background-color: $sub-color;
  font-size: 2rem;
}

.button-back {
  background-color: #ffcc80;
}

.button-op {
  background-color: #e1bee7;
}

.button-clear {
  width: 4rem;
  height: 8.5rem;
  background-color: $warning-color;
  font-size: 1rem;
  grid-row-start: 1;
  grid-row-end: 3;
  grid-column-start: 4;
  grid-column-end: 5;
}

.button-close {
  width: 4rem;
  height: 8.5rem;
  font-size: 1rem;
  background-color: $error-color;
  color: white;
  grid-row-start: 3;
  grid-row-end: 5;
  grid-column-start: 4;
  grid-column-end: 5;
}

.button-zero {
  width: 8.5rem;
  grid-column-start: 1;
  grid-column-end: 3;
}

.button-zero-full {
  width: 13rem;
  grid-column-start: 1;
  grid-column-end: 4;
}
</style>

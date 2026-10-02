<template>
  <Teleport to="body">
    <div
      ref="operatorPad"
      class="floating-operator-pad"
      :class="{ 'floating-operator-pad--anchored': anchor }"
      :style="{ top: adjustedTop, left: adjustedLeft }"
    >
      <button
        v-for="button in buttons"
        :key="button.label"
        :class="getButtonClass(button.label)"
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
  name: "FloatOperatorPad",
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
    // 選填：要顯示的運算符號（預設 +、-、×、÷）
    operators: { type: Array, default: () => ["+", "-", "×", "÷"] },
    // 選填：點到面板與欄位以外的地方時送出「關閉」
    closeOnOutside: { type: Boolean, default: false },
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
    buttons() {
      return [
        ...this.operators.map((label) => ({ label, type: "operator" })),
        { label: "關閉", type: "close" },
      ];
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
        () => this.$refs.operatorPad,
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
        const operatorPad = this.$refs.operatorPad;
        if (!operatorPad) return;
        const { width, height } = operatorPad.getBoundingClientRect();
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
    getButtonClass(label) {
      if (label === "關閉") return "button-close";
      return "button-operator";
    },
  },
};
</script>

<style scoped lang="scss">
.floating-operator-pad {
  position: absolute;
  display: grid;
  width: fit-content;
  height: fit-content;
  background-color: #9b8c7c;
  grid-template-columns: repeat(2, 1fr);
  padding: 0.5rem;
  justify-content: center;
  align-items: center;
  gap: $gap--tiny;
  border-radius: $border-radius;
  z-index: 1000;

  &--anchored {
    position: fixed;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
  }
}

button {
  border: none;
  @extend .button-basic;
}

.button-operator {
  width: 4rem;
  height: 4rem;
  background-color: $sub-color;
  font-size: 2rem;
}

.button-close {
  width: 8.5rem;
  height: 4rem;
  font-size: 1rem;
  background-color: $error-color;
  color: white;
  grid-column-start: 1;
  grid-column-end: 3;
}
</style>

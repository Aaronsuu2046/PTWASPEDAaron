<template>
  <Teleport to="body">
    <div
      ref="numpad"
      class="floating-num-pad"
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
export default {
  name: "FloatNumPad",
  props: {
    componentConfig: {
      type: Object,
      required: true,
    },
  },
  emits: ["buttonClicked"],
  data() {
    return {
      // 使用物件陣列來描述每個按鈕，並設定其標籤和類型
      buttons: [
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
        { label: 0, type: "number" },
        { label: ".", type: "number" },
      ],
      adjustedTop: "0px",
      adjustedLeft: "0px",
    };
  },
  watch: {
    componentConfig: {
      handler() {
        this.adjustPosition();
      },
      deep: true,
    },
  },
  mounted() {
    this.adjustPosition();
    window.addEventListener("resize", this.adjustPosition);
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.adjustPosition);
  },
  methods: {
    handleClick(label) {
      this.$emit("buttonClicked", label);
    },
    adjustPosition() {
      this.$nextTick(() => {
        const numpad = this.$refs.numpad;
        if (!numpad) return;
        const numpadRect = numpad.getBoundingClientRect();
        const numpadWidth = numpadRect.width;
        const numpadHeight = numpadRect.height;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let top = parseFloat(this.componentConfig.top);
        let left = parseFloat(this.componentConfig.left);

        if (top + numpadHeight > viewportHeight) {
          top = viewportHeight - numpadHeight;
        }
        if (top < 0) {
          top = 0;
        }

        if (left + numpadWidth > viewportWidth) {
          left = viewportWidth - numpadWidth;
        }
        if (left < 0) {
          left = 0;
        }

        this.adjustedTop = `${top}px`;
        this.adjustedLeft = `${left}px`;
      });
    },
    getButtonClass(label) {
      if (label === "清除") return "button-clear";
      if (label === "關閉") return "button-close";
      if (label === 0) return "button-number button-zero";
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
</style>

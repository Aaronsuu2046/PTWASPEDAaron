<template>
  <Teleport to="body">
    <div
      ref="operatorPad"
      class="floating-operator-pad"
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
  name: "FloatOperatorPad",
  props: {
    componentConfig: {
      type: Object,
      required: true,
    },
  },
  emits: ["buttonClicked"],
  data() {
    return {
      buttons: [
        { label: "+", type: "operator" },
        { label: "-", type: "operator" },
        { label: "×", type: "operator" },
        { label: "÷", type: "operator" },
        { label: "關閉", type: "close" },
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
        const operatorPad = this.$refs.operatorPad;
        if (!operatorPad) return;
        const padRect = operatorPad.getBoundingClientRect();
        const padWidth = padRect.width;
        const padHeight = padRect.height;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let top = parseFloat(this.componentConfig.top);
        let left = parseFloat(this.componentConfig.left);

        if (top + padHeight > viewportHeight) {
          top = viewportHeight - padHeight;
        }
        if (top < 0) {
          top = 0;
        }

        if (left + padWidth > viewportWidth) {
          left = viewportWidth - padWidth;
        }
        if (left < 0) {
          left = 0;
        }

        this.adjustedTop = `${top}px`;
        this.adjustedLeft = `${left}px`;
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

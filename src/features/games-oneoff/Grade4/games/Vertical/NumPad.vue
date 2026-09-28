<template>
  <div class="numpad">
    <button
      v-for="key in KEYS"
      :key="key"
      type="button"
      class="numpad__key"
      :class="{
        'numpad__key--fn': key === '←',
        'numpad__key--wide': key === '0',
      }"
      :disabled="disabled"
      :aria-label="key === '←' ? '刪除' : key"
      @pointerdown="startDrag($event, key)"
      @pointermove="onDrag"
      @pointerup="endDrag"
      @pointercancel="drag = null"
      @click="onClick(key)"
    >
      {{ key }}
    </button>
    <div
      v-if="drag && drag.moved"
      class="numpad__key numpad__key--ghost"
      :style="{ left: `${drag.x}px`, top: `${drag.y}px` }"
    >
      {{ drag.key }}
    </div>
  </div>
</template>

<script>
const KEYS = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "0", "←"];
const DRAG_THRESHOLD = 8;

// 數字按鍵：點一下送出 press(key)；也可以把數字拖到有 data-cell 的格子，送出 drop(key, cellId)
export default {
  name: "NumPad",
  props: {
    disabled: { type: Boolean, default: false },
  },
  emits: ["press", "drop"],
  data() {
    return { KEYS, drag: null, suppress: false };
  },
  methods: {
    onClick(key) {
      if (this.suppress) {
        this.suppress = false;
        return;
      }
      this.$emit("press", key);
    },
    startDrag(event, key) {
      if (this.disabled || key === "←") return;
      if (event.button !== undefined && event.button !== 0) return;
      this.suppress = false;
      this.drag = {
        key,
        startX: event.clientX,
        startY: event.clientY,
        x: event.clientX,
        y: event.clientY,
        moved: false,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    onDrag(event) {
      if (!this.drag) return;
      this.drag.x = event.clientX;
      this.drag.y = event.clientY;
      if (
        Math.hypot(
          event.clientX - this.drag.startX,
          event.clientY - this.drag.startY
        ) > DRAG_THRESHOLD
      ) {
        this.drag.moved = true;
      }
    },
    endDrag(event) {
      if (!this.drag) return;
      if (this.drag.moved) {
        this.suppress = true;
        const target = document
          .elementFromPoint(event.clientX, event.clientY)
          ?.closest("[data-cell]");
        if (target) this.$emit("drop", this.drag.key, target.dataset.cell);
      }
      this.drag = null;
    },
  },
};
</script>

<style scoped lang="scss">
.numpad {
  display: grid;
  grid-template-columns: repeat(3, 3.3rem);
  gap: 0.4rem;

  &__key {
    height: 3.1rem;
    font-size: 1.7rem;
    font-weight: $font-bold;
    color: #ffffff;
    background-color: #42a5f5;
    border: none;
    border-radius: 12px;
    box-shadow: 0 3px 0 #1976d2;
    cursor: pointer;
    touch-action: none;
    user-select: none;

    &--wide {
      grid-column: span 2;
    }

    &--fn {
      background-color: #ffa726;
      box-shadow: 0 3px 0 #ef6c00;
    }

    &:disabled {
      opacity: 0.5;
      cursor: default;
    }

    &--ghost {
      position: fixed;
      z-index: 100;
      width: 3.3rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transform: translate(-50%, -50%);
      pointer-events: none;
      opacity: 0.9;
    }
  }
}

@media (max-width: 1100px) {
  .numpad {
    grid-template-columns: repeat(3, 2.9rem);

    &__key {
      height: 2.7rem;
      font-size: 1.5rem;
    }
  }
}
</style>

<template>
  <!-- 兩條線段的卡片；點選或拖曳由父元件處理 -->
  <div
    class="line-card"
    :class="{
      'line-card--small': small,
      'line-card--selected': selected,
      'line-card--wrong': wrong,
      'line-card--dragging': dragging,
    }"
    :data-card="card.id"
    role="button"
    :aria-label="`線段圖 ${card.id}`"
  >
    <svg viewBox="0 0 160 110" class="line-card__svg">
      <g v-for="(line, i) in card.lines" :key="i">
        <line
          :x1="line.seg[0]"
          :y1="line.seg[1]"
          :x2="line.seg[2]"
          :y2="line.seg[3]"
          class="line-card__line"
          :class="`line-card__line--${i}`"
        />
        <text
          v-if="line.name"
          :x="labelPos(line.seg).x"
          :y="labelPos(line.seg).y"
          class="line-card__label"
          :class="`line-card__label--${i}`"
        >
          {{ line.name }}
        </text>
      </g>
    </svg>
  </div>
</template>

<script>
// card: { id, lines: [{ name, seg: [x1, y1, x2, y2] }, ...] }，座標以 160×110 為準
export default {
  name: "LineCard",
  props: {
    card: { type: Object, required: true },
    small: { type: Boolean, default: false },
    selected: { type: Boolean, default: false },
    wrong: { type: Boolean, default: false },
    dragging: { type: Boolean, default: false },
  },
  methods: {
    // 名稱放在線段起點外側
    labelPos(seg) {
      const dx = seg[0] - seg[2];
      const dy = seg[1] - seg[3];
      const len = Math.hypot(dx, dy);
      return {
        x: Math.min(152, Math.max(8, seg[0] + (dx / len) * 9)),
        y: Math.min(106, Math.max(12, seg[1] + (dy / len) * 9 + 5)),
      };
    },
  },
};
</script>

<style scoped lang="scss">
.line-card {
  width: 9.5rem;
  height: 6.6rem;
  flex-shrink: 0;
  background-color: #ffffff;
  border: 3px solid #b0bec5;
  border-radius: 12px;
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.12);
  cursor: grab;
  touch-action: none;
  user-select: none;

  &--small {
    width: 8rem;
    height: 5.55rem;
  }

  &--selected {
    border-color: #1e88e5;
    box-shadow: 0 0 0 4px #90caf9;
  }

  &--wrong {
    border-color: #e53935;
    box-shadow: 0 0 0 4px #ffcdd2;
  }

  &--dragging {
    opacity: 0.3;
  }

  &__svg {
    display: block;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  &__line {
    stroke-width: 5;
    stroke-linecap: round;

    &--0 {
      stroke: #1e88e5;
    }

    &--1 {
      stroke: #e53935;
    }
  }

  &__label {
    font-size: 16px;
    font-weight: bold;
    text-anchor: middle;

    &--0 {
      fill: #1565c0;
    }

    &--1 {
      fill: #c62828;
    }
  }
}

// 平板寬度時縮小卡片，讓四張卡片排得下
@media (max-width: 1100px) {
  .line-card {
    width: 8rem;
    height: 5.55rem;

    &--small {
      width: 6.8rem;
      height: 4.7rem;
    }
  }
}
</style>

<template>
  <!-- 三角形圖卡；點選或拖曳由父元件處理 -->
  <div
    class="tri-card"
    :class="{
      'tri-card--small': small,
      'tri-card--selected': selected,
      'tri-card--wrong': wrong,
      'tri-card--dragging': dragging,
    }"
    :data-card="card.id"
    role="button"
    :aria-label="`三角形圖卡 ${card.id}`"
  >
    <svg viewBox="0 0 160 110" class="tri-card__svg">
      <polygon
        :points="card.points.map((p) => p.join(',')).join(' ')"
        :fill="card.color"
        stroke="#37474f"
        stroke-width="3.5"
        stroke-linejoin="round"
      />
    </svg>
  </div>
</template>

<script>
// card: { id, points: [[x, y] × 3], color }，座標以 160×110 為準
export default {
  name: "TriangleCard",
  props: {
    card: { type: Object, required: true },
    small: { type: Boolean, default: false },
    selected: { type: Boolean, default: false },
    wrong: { type: Boolean, default: false },
    dragging: { type: Boolean, default: false },
  },
};
</script>

<style scoped lang="scss">
.tri-card {
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

  // 分類框裡用小卡，一列放兩張
  &--small {
    width: 7rem;
    height: 4.85rem;
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
    opacity: 0.35;
  }

  &__svg {
    width: 100%;
    height: 100%;
    display: block;
  }
}

@media (max-width: 1100px) {
  .tri-card {
    width: 8rem;
    height: 5.55rem;

    &--small {
      width: 5rem;
      height: 3.5rem;
    }
  }
}
</style>

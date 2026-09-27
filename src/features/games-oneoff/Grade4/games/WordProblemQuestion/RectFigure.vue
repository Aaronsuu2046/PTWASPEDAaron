<template>
  <svg
    class="rect-figure"
    :viewBox="`0 0 ${VIEW_W} ${VIEW_H}`"
    role="img"
    :aria-label="ariaLabel"
  >
    <rect
      :x="x"
      :y="y"
      :width="w"
      :height="h"
      class="rect-figure__shape"
      :class="{ 'rect-figure__shape--square': isSquare }"
    />
    <!-- 長標在下方，寬標在右側 -->
    <text :x="x + w / 2" :y="y + h + 34" class="rect-figure__label">
      {{ figure.length }} {{ figure.unit }}
    </text>
    <text
      :x="x + w + 14"
      :y="y + h / 2 + 10"
      class="rect-figure__label rect-figure__label--side"
    >
      {{ isSquare ? figure.length : figure.width }} {{ figure.unit }}
    </text>
  </svg>
</template>

<script>
// 應用題的長方形／正方形示意圖；比例依長寬縮放，但限制在可讀範圍內
export default {
  name: "RectFigure",
  props: {
    // { shape: "rect" | "square", length, width?, unit }
    figure: { type: Object, required: true },
  },
  data() {
    return { VIEW_W: 330, VIEW_H: 210, MAX_W: 170, MAX_H: 125 };
  },
  computed: {
    isSquare() {
      return this.figure.shape === "square";
    },
    ratio() {
      if (this.isSquare) return 1;
      const r = Number(this.figure.length) / Number(this.figure.width);
      return Math.min(2.4, Math.max(1.2, r));
    },
    w() {
      return Math.min(this.MAX_W, this.MAX_H * this.ratio);
    },
    h() {
      return this.w / this.ratio;
    },
    x() {
      return 20;
    },
    y() {
      return (this.VIEW_H - 40 - this.h) / 2 + 4;
    },
    ariaLabel() {
      return this.isSquare
        ? `正方形，邊長 ${this.figure.length} ${this.figure.unit}`
        : `長方形，長 ${this.figure.length} ${this.figure.unit}，寬 ${this.figure.width} ${this.figure.unit}`;
    },
  },
};
</script>

<style scoped lang="scss">
.rect-figure {
  display: block;
  width: 100%;
  height: auto;

  &__shape {
    fill: #b3e5fc;
    stroke: #0277bd;
    stroke-width: 4;

    &--square {
      fill: #c8e6c9;
      stroke: #2e7d32;
    }
  }

  &__label {
    font-size: 28px;
    font-weight: bold;
    text-anchor: middle;
    fill: #333333;

    &--side {
      text-anchor: start;
    }
  }
}
</style>

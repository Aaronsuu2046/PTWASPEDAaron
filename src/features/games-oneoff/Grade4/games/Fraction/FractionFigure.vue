<template>
  <!-- 塗色圖形：每個完整的「1」畫一個圖形，假分數／帶分數會有好幾個 -->
  <svg
    class="fraction-figure"
    :viewBox="`0 0 ${layout.w} ${layout.h}`"
    role="img"
    :aria-label="`塗色 ${total} 份，每個圖形分成 ${den} 份`"
  >
    <g
      v-for="(unit, u) in units"
      :key="u"
      :transform="`translate(${unit.x} ${unit.y})`"
    >
      <!-- 圓形：切成 den 片扇形 -->
      <template v-if="shape === 'circle'">
        <path
          v-for="k in den"
          :key="k"
          :d="wedge(k - 1)"
          class="fraction-figure__part"
          :class="{ 'fraction-figure__part--on': k <= unit.filled }"
        />
      </template>
      <!-- 方格：排成幾行幾列 -->
      <template v-else-if="shape === 'grid'">
        <rect
          v-for="k in den"
          :key="k"
          :x="((k - 1) % grid.cols) * CELL"
          :y="Math.floor((k - 1) / grid.cols) * CELL"
          :width="CELL"
          :height="CELL"
          class="fraction-figure__part"
          :class="{ 'fraction-figure__part--on': k <= unit.filled }"
        />
      </template>
      <!-- 長條：橫向切成 den 格 -->
      <template v-else>
        <rect
          v-for="k in den"
          :key="k"
          :x="((k - 1) * BAR_W) / den"
          y="0"
          :width="BAR_W / den"
          :height="BAR_H"
          class="fraction-figure__part"
          :class="{ 'fraction-figure__part--on': k <= unit.filled }"
        />
      </template>
    </g>
  </svg>
</template>

<script>
const R = 34;
const CELL = 22;
const BAR_W = 200;
const BAR_H = 26;
const GAP = 10;

// 方格的行列：盡量接近正方形（9 → 3×3、10 → 2×5）
function gridOf(den) {
  let rows = Math.floor(Math.sqrt(den));
  while (den % rows) rows -= 1;
  return { rows, cols: den / rows };
}

// 分數的塗色圖：shape "circle" | "bar" | "grid"，whole 又 num/den
// 一個圖形代表 1，從第一個圖形依序塗滿，最後一個圖形塗剩下的份數
export default {
  name: "FractionFigure",
  props: {
    shape: { type: String, default: "circle" },
    whole: { type: Number, default: 0 },
    num: { type: Number, required: true },
    den: { type: Number, required: true },
  },
  data() {
    return { CELL, BAR_W, BAR_H };
  },
  computed: {
    total() {
      return this.whole * this.den + this.num;
    },
    count() {
      return Math.max(1, Math.ceil(this.total / this.den));
    },
    grid() {
      return gridOf(this.den);
    },
    // 單一圖形的大小
    unitSize() {
      if (this.shape === "circle") return { w: R * 2, h: R * 2 };
      if (this.shape === "grid")
        return { w: this.grid.cols * CELL, h: this.grid.rows * CELL };
      return { w: BAR_W, h: BAR_H };
    },
    // 長條上下排，圓形和方格左右排
    stacked() {
      return this.shape === "bar";
    },
    layout() {
      const { w, h } = this.unitSize;
      const pad = 4;
      return this.stacked
        ? {
            w: w + pad * 2,
            h: this.count * h + (this.count - 1) * GAP + pad * 2,
          }
        : {
            w: this.count * w + (this.count - 1) * GAP + pad * 2,
            h: h + pad * 2,
          };
    },
    units() {
      const { w, h } = this.unitSize;
      return Array.from({ length: this.count }, (_, u) => ({
        x: 4 + (this.stacked ? 0 : u * (w + GAP)),
        y: 4 + (this.stacked ? u * (h + GAP) : 0),
        filled: Math.min(this.den, Math.max(0, this.total - u * this.den)),
      }));
    },
  },
  methods: {
    // 第 k 片扇形（從正上方順時針）
    wedge(k) {
      const a0 = (k / this.den) * Math.PI * 2 - Math.PI / 2;
      const a1 = ((k + 1) / this.den) * Math.PI * 2 - Math.PI / 2;
      const p = (a) => `${R + R * Math.cos(a)} ${R + R * Math.sin(a)}`;
      const large = 1 / this.den > 0.5 ? 1 : 0;
      return `M ${R} ${R} L ${p(a0)} A ${R} ${R} 0 ${large} 1 ${p(a1)} Z`;
    },
  },
};
</script>

<style scoped lang="scss">
.fraction-figure {
  display: block;
  max-width: 100%;
  max-height: 100%;

  &__part {
    fill: #ffffff;
    stroke: #37474f;
    stroke-width: 2;
    stroke-linejoin: round;

    &--on {
      fill: #ffb74d;
    }
  }
}
</style>

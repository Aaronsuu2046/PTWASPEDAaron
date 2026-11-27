<template>
  <!-- num 塊「1/den 塊太陽餅」平均排開（不先分組，讓學生自己用畫筆圈）；
       每排的塊數是 den 的倍數，圈一組時不會跨到下一排 -->
  <svg
    class="sun-cake-pieces"
    :viewBox="`0 0 ${width} ${height}`"
    role="img"
    :aria-label="`${num} 塊 ${den} 分之 1 塊的太陽餅`"
  >
    <g
      v-for="k in num"
      :key="k"
      :transform="`translate(${pieceX(k)} ${pieceY(k)})`"
    >
      <path :d="piecePath" class="sun-cake-pieces__cake" />
    </g>
  </svg>
</template>

<script>
const R = 46;
const GAP_X = 26;
const GAP_Y = 30;
const PAD = 16;
const MAX_PER_ROW = 12;

// 假分數化為整數的輔助圖：一塊太陽餅切成 den 份，每份是一個扇形（den = 2 時是半圓）
// 扇形尖端朝左、弧朝右，和腳本示意圖的半塊太陽餅一樣
export default {
  name: "SunCakePieces",
  props: {
    num: { type: Number, required: true },
    den: { type: Number, required: true },
  },
  computed: {
    angle() {
      return (2 * Math.PI) / this.den;
    },
    // 扇形的外框：寬是半徑，高是弦長（角度超過 180° 時用直徑）
    cellW() {
      return R;
    },
    cellH() {
      return this.angle >= Math.PI ? 2 * R : 2 * R * Math.sin(this.angle / 2);
    },
    perRow() {
      const groups = Math.max(1, Math.floor(MAX_PER_ROW / this.den));
      return Math.min(this.num, groups * this.den);
    },
    rows() {
      return Math.ceil(this.num / this.perRow);
    },
    width() {
      return this.perRow * this.cellW + (this.perRow - 1) * GAP_X + PAD * 2;
    },
    height() {
      return this.rows * this.cellH + (this.rows - 1) * GAP_Y + PAD * 2;
    },
    arc() {
      const half = this.angle / 2;
      const cy = this.cellH / 2;
      const x = R * Math.cos(half);
      const dy = R * Math.sin(half);
      const large = this.angle > Math.PI ? 1 : 0;
      return { cy, x, y1: cy - dy, y2: cy + dy, large };
    },
    // 尖端在 (0, 中線)，弧從上到下
    piecePath() {
      const { cy, x, y1, y2, large } = this.arc;
      return `M 0 ${cy} L ${x} ${y1} A ${R} ${R} 0 ${large} 1 ${x} ${y2} Z`;
    },
  },
  methods: {
    pieceX(k) {
      return PAD + ((k - 1) % this.perRow) * (this.cellW + GAP_X);
    },
    pieceY(k) {
      return PAD + Math.floor((k - 1) / this.perRow) * (this.cellH + GAP_Y);
    },
  },
};
</script>

<style scoped lang="scss">
.sun-cake-pieces {
  display: block;
  max-width: 100%;
  max-height: 100%;

  &__cake {
    fill: #ffc928;
    stroke: #5d4037;
    stroke-width: 2.5;
    stroke-linejoin: round;
  }
}
</style>

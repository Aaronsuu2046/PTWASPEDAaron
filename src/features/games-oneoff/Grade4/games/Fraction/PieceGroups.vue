<template>
  <!-- num 張「1/den」小卡，每 den 張排成一組（一組就是 1 個整數），組與組之間留空隙 -->
  <svg
    class="piece-groups"
    :viewBox="`0 0 ${width} ${height}`"
    role="img"
    :aria-label="`${num} 個 ${den} 分之 1，每 ${den} 個一組`"
  >
    <g
      v-for="g in groups"
      :key="g"
      :transform="`translate(${groupX(g)} ${groupY(g)})`"
    >
      <g
        v-for="k in den"
        :key="k"
        :transform="`translate(${(k - 1) * TILE} 0)`"
      >
        <rect :width="TILE" :height="TILE" rx="4" class="piece-groups__tile" />
        <text :x="TILE / 2" :y="TILE * 0.42" class="piece-groups__num">1</text>
        <line
          :x1="TILE * 0.3"
          :x2="TILE * 0.7"
          :y1="TILE * 0.52"
          :y2="TILE * 0.52"
          class="piece-groups__bar"
        />
        <text :x="TILE / 2" :y="TILE * 0.86" class="piece-groups__num">
          {{ den }}
        </text>
      </g>
    </g>
  </svg>
</template>

<script>
const TILE = 44;
const GAP_X = 34;
const GAP_Y = 30;
const PAD = 14;

// 假分數化為整數的輔助圖：num 是 den 的倍數，共 num/den 組
// 一排放幾組依每組長度決定，整體盡量不要太寬
export default {
  name: "PieceGroups",
  props: {
    num: { type: Number, required: true },
    den: { type: Number, required: true },
  },
  data() {
    return { TILE };
  },
  computed: {
    groups() {
      return Math.ceil(this.num / this.den);
    },
    groupWidth() {
      return this.den * TILE;
    },
    // 一排最多約 18 張小卡寬
    perRow() {
      return Math.max(
        1,
        Math.min(
          this.groups,
          Math.floor((18 * TILE) / (this.groupWidth + GAP_X))
        )
      );
    },
    rows() {
      return Math.ceil(this.groups / this.perRow);
    },
    width() {
      return (
        this.perRow * this.groupWidth + (this.perRow - 1) * GAP_X + PAD * 2
      );
    },
    height() {
      return this.rows * TILE + (this.rows - 1) * GAP_Y + PAD * 2;
    },
  },
  methods: {
    groupX(g) {
      return PAD + ((g - 1) % this.perRow) * (this.groupWidth + GAP_X);
    },
    groupY(g) {
      return PAD + Math.floor((g - 1) / this.perRow) * (TILE + GAP_Y);
    },
  },
};
</script>

<style scoped lang="scss">
.piece-groups {
  display: block;
  max-width: 100%;
  max-height: 100%;

  &__tile {
    fill: #ffe0b2;
    stroke: #e65100;
    stroke-width: 2;
  }

  &__num {
    font-size: 15px;
    font-weight: 700;
    text-anchor: middle;
    fill: #4e342e;
  }

  &__bar {
    stroke: #4e342e;
    stroke-width: 2;
  }
}
</style>

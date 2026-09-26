<template>
  <svg
    class="candy-groups"
    :viewBox="`0 0 ${width} ${HEIGHT}`"
    role="img"
    :aria-label="ariaLabel"
  >
    <!-- 平分後的每一份，用虛線框起來 -->
    <rect
      v-for="box in groupBoxes"
      :key="`box-${box.x}`"
      :x="box.x"
      y="4"
      :width="box.width"
      :height="HEIGHT - 8"
      rx="12"
      class="candy-groups__box"
    />
    <g
      v-for="candy in candies"
      :key="candy.index"
      :transform="`translate(${candy.x} ${HEIGHT / 2})`"
      class="candy-groups__candy"
      :class="{ 'candy-groups__candy--colored': candy.colored }"
    >
      <path d="M -17 0 L -26 -9 L -26 9 Z" />
      <path d="M 17 0 L 26 -9 L 26 9 Z" />
      <ellipse rx="15" ry="11" />
    </g>
  </svg>
</template>

<script>
const CANDY_WIDTH = 56;
const GROUP_GAP = 18;
const SIDE_PAD = 10;

export default {
  name: "CandyGroups",
  props: {
    total: { type: Number, required: true },
    colored: { type: Number, default: 0 },
    // 平分成幾份；0 表示不分組
    groups: { type: Number, default: 0 },
  },
  data() {
    return { HEIGHT: 64 };
  },
  computed: {
    perGroup() {
      return this.groups > 0 ? this.total / this.groups : this.total;
    },
    groupCount() {
      return this.groups > 0 ? this.groups : 1;
    },
    candies() {
      return Array.from({ length: this.total }, (_, index) => {
        const group = Math.floor(index / this.perGroup);
        const x = SIDE_PAD + group * GROUP_GAP + (index + 0.5) * CANDY_WIDTH;
        return { index, x, colored: index < this.colored };
      });
    },
    groupBoxes() {
      if (this.groups <= 0) return [];
      return Array.from({ length: this.groups }, (_, group) => ({
        x:
          SIDE_PAD +
          group * GROUP_GAP +
          group * this.perGroup * CANDY_WIDTH -
          GROUP_GAP / 3,
        width: this.perGroup * CANDY_WIDTH + (GROUP_GAP * 2) / 3,
      }));
    },
    width() {
      return (
        SIDE_PAD * 2 +
        this.total * CANDY_WIDTH +
        (this.groupCount - 1) * GROUP_GAP
      );
    },
    ariaLabel() {
      const grouped = this.groups > 0 ? `，平分成 ${this.groups} 份` : "";
      return `${this.total} 顆糖果，塗色 ${this.colored} 顆${grouped}`;
    },
  },
};
</script>

<style scoped lang="scss">
.candy-groups {
  display: block;
  width: 100%;
  height: 100%;

  &__box {
    fill: none;
    stroke: #555555;
    stroke-width: 2;
    stroke-dasharray: 6 5;
  }

  &__candy {
    fill: #ffffff;
    stroke: #555555;
    stroke-width: 2;

    &--colored {
      fill: #f06292;
      stroke: #ad1457;
    }
  }
}
</style>

<template>
  <svg
    class="tile-figure"
    :viewBox="`0 0 ${VIEW_W} ${VIEW_H}`"
    role="img"
    :aria-label="`磁磚圖，每一小格是 1 ${figure.cellUnit}，藍色是完好的磁磚`"
  >
    <g v-for="(row, r) in figure.grid" :key="`r-${r}`">
      <g
        v-for="(cell, c) in row"
        :key="`c-${r}-${c}`"
        :transform="`translate(${x0 + c * size} ${y0 + r * size})`"
      >
        <rect
          :width="size"
          :height="size"
          class="tile-figure__cell"
          :class="{ 'tile-figure__cell--good': cell }"
        />
        <template v-if="!cell">
          <line
            :x1="size * 0.25"
            :y1="size * 0.25"
            :x2="size * 0.75"
            :y2="size * 0.75"
            class="tile-figure__cross"
          />
          <line
            :x1="size * 0.75"
            :y1="size * 0.25"
            :x2="size * 0.25"
            :y2="size * 0.75"
            class="tile-figure__cross"
          />
        </template>
      </g>
    </g>
    <text :x="VIEW_W / 2" :y="VIEW_H - 10" class="tile-figure__legend">
      1 格 = 1 {{ figure.cellUnit }}
    </text>
  </svg>
</template>

<script>
// 磁磚格子圖：grid 以 1 表示完好的磁磚（藍色）、0 表示破掉的磁磚（打叉）
export default {
  name: "TileFigure",
  props: {
    // { shape: "tiles", grid: [[1, 0, ...], ...], cellUnit }
    figure: { type: Object, required: true },
  },
  data() {
    return { VIEW_W: 300, VIEW_H: 250, MAX_GRID_H: 200 };
  },
  computed: {
    rows() {
      return this.figure.grid.length;
    },
    cols() {
      return this.figure.grid[0].length;
    },
    size() {
      return Math.min(
        (this.VIEW_W - 20) / this.cols,
        this.MAX_GRID_H / this.rows
      );
    },
    x0() {
      return (this.VIEW_W - this.cols * this.size) / 2;
    },
    y0() {
      return (this.MAX_GRID_H - this.rows * this.size) / 2 + 4;
    },
  },
};
</script>

<style scoped lang="scss">
.tile-figure {
  display: block;
  width: 100%;
  height: auto;

  &__cell {
    fill: #f1f3f5;
    stroke: #78909c;
    stroke-width: 2;

    &--good {
      fill: #74c0fc;
    }
  }

  &__cross {
    stroke: #adb5bd;
    stroke-width: 3;
  }

  &__legend {
    font-size: 24px;
    font-weight: bold;
    text-anchor: middle;
    fill: #1c7ed6;
  }
}
</style>

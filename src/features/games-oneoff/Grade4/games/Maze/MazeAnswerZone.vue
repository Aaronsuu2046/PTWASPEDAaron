<template>
  <!-- 答案區：一整格的彩色牌子，上面是 >、< 或 = -->
  <g
    class="maze-zone"
    :class="{
      'maze-zone--hit': state === 'hit',
      'maze-zone--wrong': state === 'wrong',
    }"
    :transform="`translate(${x} ${y})`"
    :data-zone="symbol"
    :data-x="x"
    :data-y="y"
  >
    <rect
      x="0.06"
      y="0.06"
      width="0.88"
      height="0.88"
      rx="0.2"
      :fill="color"
      stroke="#ffffff"
      stroke-width="0.07"
    />
    <text
      x="0.5"
      y="0.53"
      font-size="0.72"
      font-weight="700"
      text-anchor="middle"
      dominant-baseline="middle"
      fill="#ffffff"
    >
      {{ symbol }}
    </text>
  </g>
</template>

<script>
const COLORS = { ">": "#ef6c00", "<": "#2e7d32", "=": "#c2185b" };

// symbol：>、<、=；x、y：所在格子；state：hit（走到正確）／wrong（走錯）
export default {
  name: "MazeAnswerZone",
  props: {
    symbol: { type: String, required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    state: { type: String, default: "" },
  },
  computed: {
    color() {
      return COLORS[this.symbol] || "#546e7a";
    },
  },
};
</script>

<style scoped>
.maze-zone--hit rect {
  stroke: #ffeb3b;
  stroke-width: 0.14;
}

.maze-zone--wrong rect {
  fill: #9e9e9e;
  stroke: #e53935;
  stroke-width: 0.14;
}
</style>

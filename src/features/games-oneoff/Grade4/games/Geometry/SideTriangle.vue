<template>
  <!-- 依資料畫三角形，等長的邊在中點畫一條短記號 -->
  <svg class="side-triangle" viewBox="0 0 200 170">
    <polygon
      :points="figure.points.map((p) => p.join(',')).join(' ')"
      :fill="figure.color || '#e3f2fd'"
      stroke="#37474f"
      stroke-width="4"
      stroke-linejoin="round"
    />
    <line
      v-for="tick in ticks"
      :key="tick.key"
      :x1="tick.x1"
      :y1="tick.y1"
      :x2="tick.x2"
      :y2="tick.y2"
      class="side-triangle__tick"
    />
  </svg>
</template>

<script>
const TICK = 9;

// figure：{ points: [[x, y] × 3], equal: [邊索引], color }，邊 i 為 points[i] → points[i + 1]
export default {
  name: "SideTriangle",
  props: {
    figure: { type: Object, required: true },
  },
  computed: {
    ticks() {
      const P = this.figure.points;
      return (this.figure.equal || []).map((i) => {
        const [ax, ay] = P[i];
        const [bx, by] = P[(i + 1) % 3];
        const mx = (ax + bx) / 2;
        const my = (ay + by) / 2;
        const len = Math.hypot(bx - ax, by - ay);
        const nx = -(by - ay) / len;
        const ny = (bx - ax) / len;
        return {
          key: i,
          x1: mx - nx * TICK,
          y1: my - ny * TICK,
          x2: mx + nx * TICK,
          y2: my + ny * TICK,
        };
      });
    },
  },
};
</script>

<style scoped>
.side-triangle {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
}

.side-triangle__tick {
  stroke: #d32f2f;
  stroke-width: 4;
  stroke-linecap: round;
}
</style>

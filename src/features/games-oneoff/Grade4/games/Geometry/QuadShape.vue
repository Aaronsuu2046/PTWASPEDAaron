<template>
  <svg viewBox="0 0 140 100" class="quad-shape" role="img" :aria-label="name">
    <polygon :points="points" class="quad-shape__body" />
    <!-- 直角記號 -->
    <path
      v-for="(mark, i) in rightMarks"
      :key="`r-${i}`"
      :d="mark"
      class="quad-shape__mark"
    />
    <!-- 等長記號（短線，數量代表哪幾組邊一樣長） -->
    <line
      v-for="(tick, i) in ticks"
      :key="`t-${i}`"
      :x1="tick[0]"
      :y1="tick[1]"
      :x2="tick[2]"
      :y2="tick[3]"
      class="quad-shape__mark"
    />
    <!-- 平行記號（小箭頭） -->
    <path
      v-for="(arrow, i) in arrows"
      :key="`a-${i}`"
      :d="arrow"
      class="quad-shape__arrow"
    />
    <line
      v-if="diagonal"
      :x1="verts[0][0]"
      :y1="verts[0][1]"
      :x2="verts[2][0]"
      :y2="verts[2][1]"
      class="quad-shape__diagonal"
    />
  </svg>
</template>

<script>
// 五種四邊形；頂點依順時針排列
const SHAPES = {
  square: {
    name: "正方形",
    verts: [
      [40, 15],
      [100, 15],
      [100, 75],
      [40, 75],
    ],
    right: true,
    equal: [1, 1, 1, 1],
  },
  rectangle: {
    name: "長方形",
    verts: [
      [15, 22],
      [125, 22],
      [125, 78],
      [15, 78],
    ],
    right: true,
    equal: [2, 1, 2, 1],
  },
  rhombus: {
    name: "菱形",
    verts: [
      [70, 8],
      [118, 50],
      [70, 92],
      [22, 50],
    ],
    equal: [1, 1, 1, 1],
  },
  trapezoid: {
    name: "梯形",
    verts: [
      [45, 20],
      [100, 20],
      [130, 80],
      [10, 80],
    ],
    parallel: [1, 0, 1, 0],
  },
  parallelogram: {
    name: "平行四邊形",
    verts: [
      [40, 20],
      [132, 20],
      [100, 80],
      [8, 80],
    ],
    parallel: [1, 2, 1, 2],
  },
};

function unit(ax, ay, bx, by) {
  const len = Math.hypot(bx - ax, by - ay);
  return [(bx - ax) / len, (by - ay) / len];
}

// 以一致風格重繪的四邊形，標示直角、等長邊與平行邊；diagonal 時畫一條對角線
export default {
  name: "QuadShape",
  props: {
    shape: { type: String, required: true },
    diagonal: { type: Boolean, default: false },
  },
  computed: {
    info() {
      return SHAPES[this.shape];
    },
    name() {
      return this.info.name;
    },
    verts() {
      return this.info.verts;
    },
    points() {
      return this.verts.map((v) => v.join(",")).join(" ");
    },
    edges() {
      return this.verts.map((v, i) => [v, this.verts[(i + 1) % 4]]);
    },
    rightMarks() {
      if (!this.info.right) return [];
      const k = 8;
      return this.verts.map((v, i) => {
        const prev = this.verts[(i + 3) % 4];
        const next = this.verts[(i + 1) % 4];
        const [ux, uy] = unit(v[0], v[1], prev[0], prev[1]);
        const [wx, wy] = unit(v[0], v[1], next[0], next[1]);
        return `M ${v[0] + ux * k} ${v[1] + uy * k} L ${v[0] + (ux + wx) * k} ${
          v[1] + (uy + wy) * k
        } L ${v[0] + wx * k} ${v[1] + wy * k}`;
      });
    },
    ticks() {
      const list = [];
      (this.info.equal || []).forEach((count, i) => {
        const [a, b] = this.edges[i];
        const [ux, uy] = unit(a[0], a[1], b[0], b[1]);
        const mx = (a[0] + b[0]) / 2;
        const my = (a[1] + b[1]) / 2;
        for (let t = 0; t < count; t += 1) {
          const off = (t - (count - 1) / 2) * 5;
          const cx = mx + ux * off;
          const cy = my + uy * off;
          list.push([cx - uy * 5, cy + ux * 5, cx + uy * 5, cy - ux * 5]);
        }
      });
      return list;
    },
    arrows() {
      const list = [];
      (this.info.parallel || []).forEach((count, i) => {
        if (!count) return;
        const [a, b] = this.edges[i];
        // 箭頭一律朝向右方或下方，讓一組平行邊的箭頭方向一致
        let [ux, uy] = unit(a[0], a[1], b[0], b[1]);
        if (ux < -1e-6 || (Math.abs(ux) < 1e-6 && uy < 0)) {
          ux = -ux;
          uy = -uy;
        }
        const mx = (a[0] + b[0]) / 2;
        const my = (a[1] + b[1]) / 2;
        for (let t = 0; t < count; t += 1) {
          const cx = mx + ux * (t * 6 - (count - 1) * 3);
          const cy = my + uy * (t * 6 - (count - 1) * 3);
          const bx = cx - ux * 6;
          const by = cy - uy * 6;
          list.push(
            `M ${bx - uy * 4} ${by + ux * 4} L ${cx} ${cy} L ${bx + uy * 4} ${
              by - ux * 4
            }`
          );
        }
      });
      return list;
    },
  },
};
</script>

<style scoped lang="scss">
.quad-shape {
  display: block;
  width: 100%;
  height: 100%;

  &__body {
    fill: #e3f2fd;
    stroke: #1565c0;
    stroke-width: 3.5;
    stroke-linejoin: round;
  }

  &__mark {
    fill: none;
    stroke: #e65100;
    stroke-width: 2.2;
  }

  &__arrow {
    fill: none;
    stroke: #2e7d32;
    stroke-width: 2.4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  &__diagonal {
    stroke: #e53935;
    stroke-width: 3.5;
    stroke-linecap: round;
  }
}
</style>

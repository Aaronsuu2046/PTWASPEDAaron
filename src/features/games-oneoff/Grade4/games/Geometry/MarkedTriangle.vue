<template>
  <!-- 依頂點座標畫三角形；marks 時由幾何算出直角記號與等長刻痕，畫面與資料一定一致 -->
  <g class="marked-triangle">
    <polygon
      :points="vertices.map((p) => p.join(',')).join(' ')"
      :fill="color"
      stroke="#37474f"
      stroke-width="3.5"
      stroke-linejoin="round"
    />
    <template v-if="marks">
      <path
        v-for="(d, i) in rightMarks"
        :key="`r${i}`"
        :d="d"
        class="marked-triangle__right"
      />
      <line
        v-for="(t, i) in ticks"
        :key="`t${i}`"
        v-bind="t"
        class="marked-triangle__tick"
      />
    </template>
  </g>
</template>

<script>
const RIGHT_SIZE = 11;
const TICK = 7;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const len = (v) => Math.hypot(v[0], v[1]);
const unit = (v) => [v[0] / len(v), v[1] / len(v)];

export default {
  name: "MarkedTriangle",
  props: {
    vertices: { type: Array, required: true },
    color: { type: String, default: "#e3f2fd" },
    marks: { type: Boolean, default: true },
  },
  computed: {
    sides() {
      const P = this.vertices;
      return P.map((p, i) => len(sub(P[(i + 1) % 3], p)));
    },
    // 角度接近 90° 的頂點畫小方框
    rightMarks() {
      const P = this.vertices;
      return P.flatMap((v, i) => {
        const a = unit(sub(P[(i + 1) % 3], v));
        const b = unit(sub(P[(i + 2) % 3], v));
        const cos = a[0] * b[0] + a[1] * b[1];
        if (Math.abs(cos) > 0.01) return [];
        const p1 = [v[0] + a[0] * RIGHT_SIZE, v[1] + a[1] * RIGHT_SIZE];
        const p3 = [v[0] + b[0] * RIGHT_SIZE, v[1] + b[1] * RIGHT_SIZE];
        const p2 = [p1[0] + b[0] * RIGHT_SIZE, p1[1] + b[1] * RIGHT_SIZE];
        return [`M${p1.join(" ")} L${p2.join(" ")} L${p3.join(" ")}`];
      });
    },
    // 和另一邊等長（差距 1% 內）的邊，在中點畫一條刻痕
    ticks() {
      const P = this.vertices;
      const S = this.sides;
      return S.flatMap((s, i) => {
        const same = S.some(
          (t, j) => j !== i && Math.abs(t - s) / Math.max(t, s) < 0.01
        );
        if (!same) return [];
        const a = P[i];
        const b = P[(i + 1) % 3];
        const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const d = unit(sub(b, a));
        const n = [-d[1], d[0]];
        return [
          {
            x1: m[0] - n[0] * TICK,
            y1: m[1] - n[1] * TICK,
            x2: m[0] + n[0] * TICK,
            y2: m[1] + n[1] * TICK,
          },
        ];
      });
    },
  },
};
</script>

<style scoped>
.marked-triangle__right {
  fill: none;
  stroke: #e53935;
  stroke-width: 2.5;
}

.marked-triangle__tick {
  stroke: #e53935;
  stroke-width: 3;
  stroke-linecap: round;
}
</style>

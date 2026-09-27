<template>
  <svg
    class="composite-figure"
    :viewBox="`0 0 ${VIEW_W} ${VIEW_H}`"
    role="img"
    :aria-label="figure.label || '複合圖形'"
  >
    <rect
      v-for="(piece, i) in figure.pieces"
      :key="`p-${i}`"
      :x="px(piece.x)"
      :y="py(piece.y)"
      :width="piece.w * scale"
      :height="piece.h * scale"
      class="composite-figure__piece"
      :class="`composite-figure__piece--${piece.color || 'blue'}`"
    />
    <!-- 尺寸標示：side 為 bottom / top / left / right，from、to 為該邊上的座標 -->
    <g v-for="(dim, i) in dims" :key="`d-${i}`">
      <line
        :x1="dim.x1"
        :y1="dim.y1"
        :x2="dim.x2"
        :y2="dim.y2"
        class="composite-figure__dim-line"
      />
      <line
        v-for="(tick, t) in dim.ticks"
        :key="`t-${t}`"
        :x1="tick.x1"
        :y1="tick.y1"
        :x2="tick.x2"
        :y2="tick.y2"
        class="composite-figure__dim-line"
      />
      <text
        :x="dim.tx"
        :y="dim.ty"
        class="composite-figure__label"
        :text-anchor="dim.anchor"
      >
        {{ dim.label }} {{ figure.unit }}
      </text>
    </g>
  </svg>
</template>

<script>
const GAP = 16;
const TICK = 7;

// 由多塊長方形拼成的圖形（依實際尺寸等比例繪製），可標示各邊分段的長度
// figure: { pieces: [{ x, y, w, h, color }], dims: [{ side, from, to, label }], unit }
// color：blue、yellow、white（white 代表挖空的部分）
export default {
  name: "CompositeFigure",
  props: {
    figure: { type: Object, required: true },
  },
  data() {
    return {
      VIEW_W: 360,
      VIEW_H: 250,
      PAD_L: 130,
      PAD_R: 45,
      PAD_T: 15,
      PAD_B: 60,
    };
  },
  computed: {
    bounds() {
      const pieces = this.figure.pieces;
      return {
        w: Math.max(...pieces.map((p) => p.x + p.w)),
        h: Math.max(...pieces.map((p) => p.y + p.h)),
      };
    },
    availW() {
      return this.VIEW_W - this.PAD_L - this.PAD_R;
    },
    availH() {
      return this.VIEW_H - this.PAD_T - this.PAD_B;
    },
    scale() {
      return Math.min(this.availW / this.bounds.w, this.availH / this.bounds.h);
    },
    // 圖形置中於扣掉標示空間後的區域
    originX() {
      return this.PAD_L + (this.availW - this.bounds.w * this.scale) / 2;
    },
    originY() {
      return this.PAD_T + (this.availH - this.bounds.h * this.scale) / 2;
    },
    dims() {
      const left = this.px(0);
      const right = this.px(this.bounds.w);
      const top = this.py(0);
      const bottom = this.py(this.bounds.h);
      return (this.figure.dims || []).map((dim) => {
        const horizontal = dim.side === "bottom" || dim.side === "top";
        if (horizontal) {
          const y = dim.side === "bottom" ? bottom + GAP : top - GAP;
          const x1 = this.px(dim.from);
          const x2 = this.px(dim.to);
          return {
            label: dim.label,
            x1,
            y1: y,
            x2,
            y2: y,
            ticks: [x1, x2].map((x) => ({
              x1: x,
              y1: y - TICK,
              x2: x,
              y2: y + TICK,
            })),
            tx: (x1 + x2) / 2,
            ty: dim.side === "bottom" ? y + 28 : y - 12,
            anchor: "middle",
          };
        }
        const x = dim.side === "left" ? left - GAP : right + GAP;
        const y1 = this.py(dim.from);
        const y2 = this.py(dim.to);
        return {
          label: dim.label,
          x1: x,
          y1,
          x2: x,
          y2,
          ticks: [y1, y2].map((y) => ({
            x1: x - TICK,
            y1: y,
            x2: x + TICK,
            y2: y,
          })),
          tx: dim.side === "left" ? x - 12 : x + 12,
          ty: (y1 + y2) / 2 + 9,
          anchor: dim.side === "left" ? "end" : "start",
        };
      });
    },
  },
  methods: {
    px(x) {
      return this.originX + x * this.scale;
    },
    py(y) {
      return this.originY + y * this.scale;
    },
  },
};
</script>

<style scoped lang="scss">
.composite-figure {
  display: block;
  width: 100%;
  height: auto;

  &__piece {
    stroke: #37474f;
    stroke-width: 3;

    &--blue {
      fill: #b3e5fc;
    }

    &--yellow {
      fill: #fff3bf;
    }

    &--white {
      fill: #ffffff;
      stroke-dasharray: 8 5;
    }
  }

  &__dim-line {
    stroke: #d6336c;
    stroke-width: 2;
  }

  &__label {
    font-size: 22px;
    font-weight: bold;
    fill: #c2255c;
  }
}
</style>

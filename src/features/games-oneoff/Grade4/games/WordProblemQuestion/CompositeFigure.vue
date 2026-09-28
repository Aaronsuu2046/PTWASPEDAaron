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
    <!-- 尺寸標示：side 標在外框（bottom / top / left / right，from、to 為該邊上的座標）；
         或用 at: [x1, y1, x2, y2] 標任一條邊，pos 指定標在線段的哪一側 -->
    <g v-for="(dim, i) in dims" :key="`d-${i}`">
      <line
        :x1="dim.x1"
        :y1="dim.y1"
        :x2="dim.x2"
        :y2="dim.y2"
        class="composite-figure__dim-line"
      />
      <!-- 選填 guideTo：從內部邊（例如挖空處）拉虛線對齊到外側的尺寸線 -->
      <line
        v-for="(guide, g) in dim.guides"
        :key="`g-${g}`"
        :x1="guide.x1"
        :y1="guide.y1"
        :x2="guide.x2"
        :y2="guide.y2"
        class="composite-figure__guide"
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
// figure: { pieces: [{ x, y, w, h, color }], dims: [{ side, from, to, label } | { at, pos, label }], unit }
// color：blue、yellow、purple、orange、green、white（white 代表挖空的部分）
export default {
  name: "CompositeFigure",
  props: {
    figure: { type: Object, required: true },
  },
  data() {
    return { VIEW_W: 430, VIEW_H: 275 };
  },
  computed: {
    bounds() {
      const pieces = this.figure.pieces;
      return {
        w: Math.max(...pieces.map((p) => p.x + p.w)),
        h: Math.max(...pieces.map((p) => p.y + p.h)),
      };
    },
    // 只在外框有標示的那一側留空間，讓圖形盡量放大
    outerSides() {
      const { w, h } = this.bounds;
      const sides = new Set();
      (this.figure.dims || []).forEach((dim) => {
        if (!dim.at) {
          sides.add(dim.side);
          return;
        }
        const [ax, ay] = dim.at;
        const onEdge = {
          left: ax === 0,
          right: ax === w,
          top: ay === 0,
          bottom: ay === h,
        }[dim.pos];
        if (onEdge) sides.add(dim.pos);
      });
      return sides;
    },
    PAD_L() {
      return this.outerSides.has("left") ? 125 : 12;
    },
    PAD_R() {
      return this.outerSides.has("right") ? 125 : 12;
    },
    PAD_T() {
      return this.outerSides.has("top") ? 56 : 12;
    },
    PAD_B() {
      return this.outerSides.has("bottom") ? 60 : 12;
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
        if (dim.at) return this.segmentDim(dim);
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
    // 任一條水平或垂直邊的尺寸標示，pos 為標示放在線段的哪一側
    segmentDim(dim) {
      const [ax, ay, bx, by] = dim.at;
      const horizontal = ay === by;
      const offset = { top: -GAP, bottom: GAP, left: -GAP, right: GAP }[
        dim.pos
      ];
      const hasGuide = dim.guideTo !== undefined;
      if (horizontal) {
        const y = this.py(ay) + offset;
        const x1 = this.px(ax);
        const x2 = this.px(bx);
        const gy = hasGuide ? this.py(dim.guideTo) : y;
        return {
          label: dim.label,
          guides: hasGuide
            ? [x1, x2].map((x) => ({ x1: x, y1: gy, x2: x, y2: y }))
            : [],
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
          ty: dim.pos === "bottom" ? y + 28 : y - 12,
          anchor: "middle",
        };
      }
      const x = this.px(ax) + offset;
      const y1 = this.py(ay);
      const y2 = this.py(by);
      const gx = hasGuide ? this.px(dim.guideTo) : x;
      return {
        label: dim.label,
        guides: hasGuide
          ? [y1, y2].map((y) => ({ x1: gx, y1: y, x2: x, y2: y }))
          : [],
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
        tx: dim.pos === "left" ? x - 12 : x + 12,
        ty: (y1 + y2) / 2 + 9,
        anchor: dim.pos === "left" ? "end" : "start",
      };
    },
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

    &--purple {
      fill: #d0bfff;
    }

    &--orange {
      fill: #ffd8a8;
    }

    &--green {
      fill: #c3fae8;
    }

    &--white {
      fill: #ffffff;
      stroke-dasharray: 8 5;
    }
  }

  &__guide {
    stroke: #d6336c;
    stroke-width: 1.5;
    stroke-dasharray: 4 4;
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

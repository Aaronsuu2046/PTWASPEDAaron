<template>
  <svg
    ref="svg"
    class="grid-draw"
    :class="{ 'grid-draw--readonly': readonly }"
    :viewBox="viewBox"
    preserveAspectRatio="xMidYMid meet"
    @pointerdown="onDown"
    @pointermove="onMove"
    @pointerup="onUp"
    @pointercancel="cancel"
  >
    <!-- 方格紙：每格代表 1cm -->
    <rect
      :x="MARGIN / 2"
      :y="MARGIN / 2"
      :width="width - MARGIN"
      :height="height - MARGIN"
      rx="12"
      class="grid-draw__paper"
    />
    <line
      v-for="x in cols"
      :key="`v${x}`"
      :x1="px(x - 1)"
      :y1="py(0)"
      :x2="px(x - 1)"
      :y2="py(rows - 1)"
      class="grid-draw__grid"
    />
    <line
      v-for="y in rows"
      :key="`h${y}`"
      :x1="px(0)"
      :y1="py(y - 1)"
      :x2="px(cols - 1)"
      :y2="py(y - 1)"
      class="grid-draw__grid"
    />

    <polygon
      v-if="fill"
      :points="fill.map(([x, y]) => `${px(x)},${py(y)}`).join(' ')"
      class="grid-draw__fill"
    />

    <line
      v-for="(seg, i) in dashed"
      :key="`d${i}`"
      v-bind="segAttrs(seg)"
      class="grid-draw__seg grid-draw__seg--dashed"
    />
    <line
      v-for="(seg, i) in given"
      :key="`g${i}`"
      v-bind="segAttrs(seg)"
      class="grid-draw__seg grid-draw__seg--given"
    />
    <line
      v-for="(seg, i) in segments"
      :key="`s${i}`"
      v-bind="segAttrs(seg)"
      class="grid-draw__seg grid-draw__seg--student"
      :class="{ 'grid-draw__seg--done': fill }"
    />
    <line
      v-if="drag && drag.moved"
      :x1="px(drag.from[0])"
      :y1="py(drag.from[1])"
      :x2="px(drag.cur[0])"
      :y2="py(drag.cur[1])"
      class="grid-draw__seg grid-draw__seg--drawing"
    />

    <!-- 格點 -->
    <g v-if="!readonly">
      <template v-for="y in rows" :key="`r${y}`">
        <circle
          v-for="x in cols"
          :key="`p${x}-${y}`"
          :cx="px(x - 1)"
          :cy="py(y - 1)"
          r="4.5"
          class="grid-draw__dot"
        />
      </template>
    </g>
    <circle
      v-for="(pt, i) in givenEnds"
      :key="`e${i}`"
      :cx="px(pt[0])"
      :cy="py(pt[1])"
      r="7"
      class="grid-draw__end"
    />
    <circle
      v-if="selected"
      :cx="px(selected[0])"
      :cy="py(selected[1])"
      r="13"
      class="grid-draw__selected"
    />

    <text
      v-for="label in labels"
      :key="label.text"
      :x="px(label.at[0]) + labelOffset(label.at)[0]"
      :y="py(label.at[1]) + labelOffset(label.at)[1]"
      class="grid-draw__label"
    >
      {{ label.text }}
    </text>
  </svg>
</template>

<script>
const SPACING = 56;
const MARGIN = 34;
const HIT = 0.32; // 點擊格點的判定半徑（以格為單位）
const SEG_HIT = 0.22; // 點擊線段擦掉的判定距離
const DRAG_THRESHOLD = 0.3;

const same = (a, b) => a[0] === b[0] && a[1] === b[1];
const sameSeg = ([a, b], [c, d]) =>
  (same(a, c) && same(b, d)) || (same(a, d) && same(b, c));

// 方格紙畫線：點一個格點再點另一個格點就連線（會接著從新的點繼續畫），
// 也可以從格點拖到格點；點一下自己畫的線可以擦掉。
// 父元件用 ref 取得 segments，或呼叫 undo() / clear()
export default {
  name: "GridDraw",
  props: {
    cols: { type: Number, default: 11 },
    rows: { type: Number, default: 8 },
    // 題目給的線段（不能擦掉）
    given: { type: Array, default: () => [] },
    // 頂點名稱 [{ at: [x, y], text }]
    labels: { type: Array, default: () => [] },
    // 虛線（提示圖用）
    dashed: { type: Array, default: () => [] },
    // 答對時塗色的四邊形頂點
    fill: { type: Array, default: null },
    readonly: { type: Boolean, default: false },
    // 只顯示圖形附近的格子（提示圖用）
    crop: { type: Boolean, default: false },
  },
  emits: ["change"],
  data() {
    return {
      MARGIN,
      segments: [],
      history: [],
      selected: null,
      drag: null,
    };
  },
  computed: {
    width() {
      return MARGIN * 2 + (this.cols - 1) * SPACING;
    },
    height() {
      return MARGIN * 2 + (this.rows - 1) * SPACING;
    },
    viewBox() {
      if (!this.crop) return `0 0 ${this.width} ${this.height}`;
      const pts = [...this.given, ...this.dashed].flat();
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      const x0 = Math.max(0, Math.min(...xs) - 1);
      const x1 = Math.min(this.cols - 1, Math.max(...xs) + 1);
      const y0 = Math.max(0, Math.min(...ys) - 1);
      const y1 = Math.min(this.rows - 1, Math.max(...ys) + 1);
      return [
        this.px(x0) - MARGIN / 2,
        this.py(y0) - MARGIN / 2,
        (x1 - x0) * SPACING + MARGIN,
        (y1 - y0) * SPACING + MARGIN,
      ].join(" ");
    },
    givenEnds() {
      return this.given.flat();
    },
    center() {
      const pts = this.givenEnds;
      if (!pts.length) return [0, 0];
      return [
        pts.reduce((s, p) => s + p[0], 0) / pts.length,
        pts.reduce((s, p) => s + p[1], 0) / pts.length,
      ];
    },
  },
  methods: {
    px(x) {
      return MARGIN + x * SPACING;
    },
    py(y) {
      return MARGIN + y * SPACING;
    },
    segAttrs([a, b]) {
      return {
        x1: this.px(a[0]),
        y1: this.py(a[1]),
        x2: this.px(b[0]),
        y2: this.py(b[1]),
      };
    },
    // 頂點名稱放在遠離圖形中心的一側
    labelOffset([x, y]) {
      const dx = x - this.center[0];
      const dy = y - this.center[1];
      const len = Math.hypot(dx, dy) || 1;
      return [(dx / len) * 22 - 8, (dy / len) * 22 + 9];
    },
    toGrid(event) {
      const svg = this.$refs.svg;
      const pt = svg.createSVGPoint();
      pt.x = event.clientX;
      pt.y = event.clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      return [(p.x - MARGIN) / SPACING, (p.y - MARGIN) / SPACING];
    },
    nearestPoint([gx, gy], radius = HIT) {
      const x = Math.round(gx);
      const y = Math.round(gy);
      if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return null;
      return Math.hypot(gx - x, gy - y) <= radius ? [x, y] : null;
    },
    segmentAt([gx, gy]) {
      return this.segments.findIndex(([a, b]) => {
        const vx = b[0] - a[0];
        const vy = b[1] - a[1];
        const t = Math.max(
          0,
          Math.min(
            1,
            ((gx - a[0]) * vx + (gy - a[1]) * vy) / (vx * vx + vy * vy)
          )
        );
        return Math.hypot(gx - a[0] - t * vx, gy - a[1] - t * vy) <= SEG_HIT;
      });
    },
    commit(next) {
      this.history.push(this.segments);
      this.segments = next;
      this.$emit("change");
    },
    addSegment(a, b) {
      if (same(a, b)) return;
      const seg = [a, b];
      if ([...this.segments, ...this.given].some((s) => sameSeg(s, seg)))
        return;
      this.commit([...this.segments, seg]);
    },
    onDown(event) {
      if (this.readonly || this.fill) return;
      if (event.button !== undefined && event.button !== 0) return;
      const g = this.toGrid(event);
      const point = this.nearestPoint(g);
      if (point) {
        this.drag = { from: point, cur: g, moved: false };
        this.$refs.svg.setPointerCapture?.(event.pointerId);
        return;
      }
      const index = this.segmentAt(g);
      if (index >= 0) {
        this.commit(this.segments.filter((_, i) => i !== index));
      }
      this.selected = null;
    },
    onMove(event) {
      if (!this.drag) return;
      const g = this.toGrid(event);
      this.drag.cur = g;
      const [fx, fy] = this.drag.from;
      if (
        !this.drag.moved &&
        Math.hypot(g[0] - fx, g[1] - fy) > DRAG_THRESHOLD
      ) {
        this.drag.moved = true;
        this.selected = null;
      }
    },
    onUp(event) {
      if (!this.drag) return;
      const { from, moved } = this.drag;
      if (moved) {
        const target = this.nearestPoint(this.toGrid(event), 0.5);
        if (target) this.addSegment(from, target);
      } else if (!this.selected) {
        this.selected = from;
      } else if (same(this.selected, from)) {
        this.selected = null;
      } else {
        this.addSegment(this.selected, from);
        this.selected = from;
      }
      this.cancel();
    },
    cancel() {
      this.drag = null;
    },
    undo() {
      if (!this.history.length) return;
      this.segments = this.history.pop();
      this.selected = null;
      this.$emit("change");
    },
    clear() {
      if (!this.segments.length) return;
      this.commit([]);
      this.selected = null;
    },
  },
};
</script>

<style scoped lang="scss">
.grid-draw {
  width: 100%;
  height: 100%;
  touch-action: none;
  user-select: none;
  cursor: pointer;

  &--readonly {
    cursor: default;
  }

  &__paper {
    fill: #ffffff;
    stroke: #b3e5fc;
    stroke-width: 2;
  }

  &__grid {
    stroke: #81d4fa;
    stroke-width: 1.5;
  }

  &__dot {
    fill: #90a4ae;
  }

  &__fill {
    fill: rgba(102, 187, 106, 0.35);
  }

  &__seg {
    stroke-linecap: round;

    &--given {
      stroke: #1565c0;
      stroke-width: 8;
    }

    &--student {
      stroke: #f57c00;
      stroke-width: 7;
    }

    &--done {
      stroke: #2e7d32;
    }

    &--drawing {
      stroke: #ffb74d;
      stroke-width: 6;
      stroke-dasharray: 10 8;
    }

    &--dashed {
      stroke: #f57c00;
      stroke-width: 6;
      stroke-dasharray: 12 9;
    }
  }

  &__end {
    fill: #1565c0;
  }

  &__selected {
    fill: rgba(255, 152, 0, 0.35);
    stroke: #ef6c00;
    stroke-width: 4;
  }

  &__label {
    font-size: 30px;
    font-weight: 700;
    fill: #0d47a1;
  }
}
</style>

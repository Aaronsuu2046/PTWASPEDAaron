<template>
  <!-- 三角板：拖曳移動，直角頂點為旋轉中心；只是輔助工具，不影響判分 -->
  <div
    ref="root"
    class="set-square"
    :class="{ 'set-square--snapped': snapped }"
    :style="{
      left: `${x}px`,
      top: `${y}px`,
      transform: `rotate(${angle}deg)`,
    }"
  >
    <svg
      class="set-square__svg"
      :width="size + 8"
      :height="size + 8"
      :viewBox="`-4 ${-size - 4} ${size + 8} ${size + 8}`"
      aria-label="三角板"
    >
      <polygon
        :points="`0,0 ${size},0 0,${-size}`"
        class="set-square__body"
        @pointerdown="startDrag"
        @pointermove="onDrag"
        @pointerup="endDrag"
        @pointercancel="endDrag"
      />
      <!-- 直角記號與刻度 -->
      <path d="M 0 -18 H 18 V 0" class="set-square__mark" />
      <line
        v-for="t in ticks"
        :key="`tx-${t}`"
        :x1="t"
        y1="0"
        :x2="t"
        :y2="t % 50 === 0 ? -10 : -6"
        class="set-square__tick"
      />
      <line
        v-for="t in ticks"
        :key="`ty-${t}`"
        x1="0"
        :y1="-t"
        :x2="t % 50 === 0 ? 10 : 6"
        :y2="-t"
        class="set-square__tick"
      />
    </svg>
  </div>
</template>

<script>
// 放在 position: relative 的容器裡；x、y 為直角頂點相對容器的位置
// 沒有拖動的點一下會發出 tap（帶 clientX、clientY），讓底下的圖形仍可點選
// 選填 snapSelector：放開時直角頂點靠近這些多邊形（SVG polygon）的頂點就吸附過去，
// 角度也接近該頂點的邊時就轉到讓三角板的邊和它平行；不傳就維持原本的自由拖放
const TAP_DISTANCE = 6;
const SNAP_DISTANCE = 26;
const SNAP_ANGLE = 20;
const SNAP_FLASH_MS = 700;
const wrap = (d) => ((d % 360) + 360) % 360;
const gap = (a, b) => Math.abs(((((a - b) % 360) + 540) % 360) - 180);

export default {
  name: "SetSquare",
  props: {
    startX: { type: Number, default: 40 },
    startY: { type: Number, default: 200 },
    size: { type: Number, default: 150 },
    snapSelector: { type: String, default: "" },
  },
  emits: ["tap", "snap"],
  data() {
    return {
      x: this.startX,
      y: this.startY,
      angle: 0,
      drag: null,
      snapped: false,
    };
  },
  computed: {
    ticks() {
      const list = [];
      for (let t = 10; t < this.size - 20; t += 10) list.push(t);
      return list;
    },
  },
  methods: {
    startDrag(event) {
      this.drag = {
        px: event.clientX,
        py: event.clientY,
        x: this.x,
        y: this.y,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    onDrag(event) {
      if (!this.drag) return;
      this.x = this.drag.x + event.clientX - this.drag.px;
      this.y = this.drag.y + event.clientY - this.drag.py;
    },
    endDrag(event) {
      if (!this.drag) return;
      const moved = Math.hypot(
        event.clientX - this.drag.px,
        event.clientY - this.drag.py
      );
      if (event.type === "pointerup" && moved < TAP_DISTANCE) {
        this.$emit("tap", { clientX: event.clientX, clientY: event.clientY });
      } else if (this.snapSelector) {
        this.trySnap();
      }
      this.drag = null;
    },
    // 目標頂點（容器座標）與從頂點出發的兩條邊的方向（螢幕角度，順時針、0° 向右）
    snapTargets() {
      // 範本最上面有註解，$el 會是註解節點，所以用 ref 取外框
      const box = this.$refs.root?.offsetParent;
      if (!box) return [];
      const rect = box.getBoundingClientRect();
      const ox = rect.left + box.clientLeft;
      const oy = rect.top + box.clientTop;
      const targets = [];
      box.querySelectorAll(this.snapSelector).forEach((poly) => {
        const ctm = poly.getScreenCTM?.();
        const pts = poly.points;
        if (!ctm || !pts || pts.numberOfItems < 3) return;
        const list = [];
        for (let i = 0; i < pts.numberOfItems; i += 1) {
          const p = pts.getItem(i).matrixTransform(ctm);
          list.push([p.x - ox, p.y - oy]);
        }
        list.forEach((v, i) => {
          const dir = (w) =>
            wrap((Math.atan2(w[1] - v[1], w[0] - v[0]) * 180) / Math.PI);
          targets.push({
            x: v[0],
            y: v[1],
            edges: [
              dir(list[(i + 1) % list.length]),
              dir(list[(i + list.length - 1) % list.length]),
            ],
          });
        });
      });
      return targets;
    },
    // 直角頂點吸到最近的頂點；三角板的底邊（angle）或另一邊（angle − 90°）
    // 若和該頂點某條邊只差一點點，就轉到平行
    trySnap() {
      let best = null;
      this.snapTargets().forEach((t) => {
        const d = Math.hypot(t.x - this.x, t.y - this.y);
        if (d <= SNAP_DISTANCE && (!best || d < best.d)) best = { ...t, d };
      });
      if (!best) return;
      this.x = best.x;
      this.y = best.y;
      const options = best.edges.flatMap((e) => [e, wrap(e + 90)]);
      const near = options
        .map((r) => ({ r, g: gap(r, this.angle) }))
        .sort((a, b) => a.g - b.g)[0];
      if (near && near.g <= SNAP_ANGLE) this.angle = Math.round(near.r);
      this.snapped = true;
      clearTimeout(this.flashTimer);
      this.flashTimer = setTimeout(() => {
        this.snapped = false;
      }, SNAP_FLASH_MS);
      this.$emit("snap", { x: this.x, y: this.y, angle: this.angle });
    },
    rotate(step) {
      this.angle = (this.angle + step + 360) % 360;
    },
    reset() {
      this.x = this.startX;
      this.y = this.startY;
      this.angle = 0;
    },
  },
  beforeUnmount() {
    clearTimeout(this.flashTimer);
  },
};
</script>

<style scoped lang="scss">
.set-square {
  position: absolute;
  width: 0;
  height: 0;
  transform-origin: 0 0;
  pointer-events: none;
  z-index: 5;

  &__svg {
    position: absolute;
    left: -4px;
    bottom: -4px;
    overflow: visible;
  }

  &__body {
    fill: rgba(255, 213, 79, 0.45);
    stroke: #f9a825;
    stroke-width: 3;
    cursor: grab;
    pointer-events: auto;
    touch-action: none;
  }

  // 剛吸附好：邊框變綠、亮一下
  &--snapped &__body {
    stroke: #43a047;
    filter: drop-shadow(0 0 6px rgba(67, 160, 71, 0.8));
  }

  &__mark {
    fill: none;
    stroke: #e65100;
    stroke-width: 2.5;
    pointer-events: none;
  }

  &__tick {
    stroke: #8d6e63;
    stroke-width: 1.5;
    pointer-events: none;
  }
}
</style>

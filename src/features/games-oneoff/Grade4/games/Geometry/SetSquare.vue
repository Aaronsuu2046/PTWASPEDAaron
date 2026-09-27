<template>
  <!-- 三角板：拖曳移動，直角頂點為旋轉中心；只是輔助工具，不影響判分 -->
  <div
    class="set-square"
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
export default {
  name: "SetSquare",
  props: {
    startX: { type: Number, default: 40 },
    startY: { type: Number, default: 200 },
    size: { type: Number, default: 150 },
  },
  data() {
    return {
      x: this.startX,
      y: this.startY,
      angle: 0,
      drag: null,
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
    endDrag() {
      this.drag = null;
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

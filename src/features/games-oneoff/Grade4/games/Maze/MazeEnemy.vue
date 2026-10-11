<template>
  <!-- 可愛的小幽靈：圓頭、波浪裙擺、大眼睛和腮紅，一格一格慢慢飄 -->
  <g
    class="maze-enemy"
    :style="{
      transform: `translate(${x}px, ${y}px)`,
      transitionDuration: `${moveMs}ms`,
    }"
    :data-enemy-x="x"
    :data-enemy-y="y"
  >
    <path
      d="M0.16 0.86 V0.48 a0.34 0.34 0 0 1 0.68 0 V0.86 l-0.11 -0.08 l-0.12 0.08 l-0.11 -0.08 l-0.11 0.08 l-0.12 -0.08 z"
      :fill="color"
      stroke="#ffffff"
      stroke-width="0.04"
    />
    <circle cx="0.38" cy="0.46" r="0.09" fill="#ffffff" />
    <circle cx="0.62" cy="0.46" r="0.09" fill="#ffffff" />
    <circle
      :cx="0.38 + look[0]"
      :cy="0.47 + look[1]"
      r="0.045"
      fill="#37474f"
    />
    <circle
      :cx="0.62 + look[0]"
      :cy="0.47 + look[1]"
      r="0.045"
      fill="#37474f"
    />
    <ellipse
      cx="0.3"
      cy="0.6"
      rx="0.05"
      ry="0.03"
      fill="#ff8a80"
      opacity="0.8"
    />
    <ellipse
      cx="0.7"
      cy="0.6"
      rx="0.05"
      ry="0.03"
      fill="#ff8a80"
      opacity="0.8"
    />
  </g>
</template>

<script>
const LOOK = {
  up: [0, -0.03],
  down: [0, 0.03],
  left: [-0.03, 0],
  right: [0.03, 0],
};

// x、y：所在格子；color：身體顏色；facing：眼睛看的方向
export default {
  name: "MazeEnemy",
  props: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    color: { type: String, default: "#f48fb1" },
    facing: { type: String, default: "down" },
    moveMs: { type: Number, default: 400 },
  },
  computed: {
    look() {
      return LOOK[this.facing] || LOOK.down;
    },
  },
};
</script>

<style scoped>
.maze-enemy {
  transition-property: transform;
  transition-timing-function: ease-in-out;
}
</style>

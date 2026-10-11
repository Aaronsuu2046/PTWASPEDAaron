<template>
  <!-- 角色：圓圓的小黃臉；位置用 transform 平滑移到下一格 -->
  <g
    class="maze-player"
    :style="{
      transform: `translate(${x}px, ${y}px)`,
      transitionDuration: `${moveMs}ms`,
    }"
    :data-player-x="x"
    :data-player-y="y"
  >
    <circle
      cx="0.5"
      cy="0.5"
      r="0.38"
      fill="#ffd54f"
      stroke="#f9a825"
      stroke-width="0.06"
    />
    <circle :cx="0.38 + eye[0]" :cy="0.42 + eye[1]" r="0.06" fill="#3e2723" />
    <circle :cx="0.62 + eye[0]" :cy="0.42 + eye[1]" r="0.06" fill="#3e2723" />
    <path
      d="M0.36 0.6 q0.14 0.12 0.28 0"
      stroke="#3e2723"
      stroke-width="0.05"
      fill="none"
      stroke-linecap="round"
    />
  </g>
</template>

<script>
const LOOK = {
  up: [0, -0.05],
  down: [0, 0.04],
  left: [-0.05, 0],
  right: [0.05, 0],
};

// x、y：所在格子（SVG 一格 = 1 單位）；facing：眼睛看的方向
export default {
  name: "MazePlayer",
  props: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    facing: { type: String, default: "down" },
    moveMs: { type: Number, default: 120 },
  },
  computed: {
    eye() {
      return LOOK[this.facing] || LOOK.down;
    },
  },
};
</script>

<style scoped>
.maze-player {
  transition-property: transform;
  transition-timing-function: linear;
}
</style>

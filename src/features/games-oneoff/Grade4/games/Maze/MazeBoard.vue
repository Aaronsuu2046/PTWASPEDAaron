<template>
  <!-- 迷宮格線、牆面與可行走區；一格 = 1 個單位，整張圖依容器等比例縮放 -->
  <svg
    class="maze-board"
    :viewBox="`0 0 ${width} ${height}`"
    preserveAspectRatio="xMidYMid meet"
    role="img"
    aria-label="迷宮"
  >
    <rect :width="width" :height="height" rx="0.4" fill="#e8eaf6" />
    <template v-for="(row, y) in tiles" :key="`r${y}`">
      <template v-for="(open, x) in row" :key="`c${x}-${y}`">
        <rect
          v-if="!open"
          :x="x + 0.04"
          :y="y + 0.04"
          width="0.92"
          height="0.92"
          rx="0.22"
          class="maze-board__wall"
        />
        <circle
          v-else
          :cx="x + 0.5"
          :cy="y + 0.5"
          r="0.06"
          class="maze-board__dot"
        />
      </template>
    </template>
    <!-- 起點、答案區、角色由父元件放進來 -->
    <slot />
  </svg>
</template>

<script>
// tiles[y][x]：true 表示通道
export default {
  name: "MazeBoard",
  props: {
    tiles: { type: Array, required: true },
  },
  computed: {
    width() {
      return this.tiles[0]?.length || 0;
    },
    height() {
      return this.tiles.length;
    },
  },
};
</script>

<style scoped>
.maze-board {
  display: block;
  width: 100%;
  height: 100%;
}

.maze-board__wall {
  fill: #5c6bc0;
  stroke: #3949ab;
  stroke-width: 0.06;
}

.maze-board__dot {
  fill: #c5cae9;
}
</style>

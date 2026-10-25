<template>
  <!-- 10×10 百格板：filled 裡的格子塗色 -->
  <svg
    class="hundred-grid"
    viewBox="0 0 304 304"
    role="img"
    :aria-label="`百格板，塗色 ${filled.length} 格`"
  >
    <rect
      x="2"
      y="2"
      width="300"
      height="300"
      rx="6"
      class="hundred-grid__paper"
    />
    <rect
      v-for="k in 100"
      :key="k"
      :x="2 + ((k - 1) % 10) * 30"
      :y="2 + Math.floor((k - 1) / 10) * 30"
      width="30"
      height="30"
      class="hundred-grid__cell"
      :class="{ 'hundred-grid__cell--on': on.has(k - 1) }"
      :style="on.has(k - 1) ? { fill: color } : null"
      :data-cell="k - 1"
    />
    <rect
      x="2"
      y="2"
      width="300"
      height="300"
      rx="6"
      class="hundred-grid__frame"
    />
  </svg>
</template>

<script>
export default {
  name: "HundredGrid",
  props: {
    // 塗色的格子編號 0～99
    filled: { type: Array, default: () => [] },
    color: { type: String, default: "#42a5f5" },
  },
  computed: {
    on() {
      return new Set(this.filled);
    },
  },
};
</script>

<style scoped lang="scss">
.hundred-grid {
  display: block;
  max-width: 100%;
  max-height: 100%;

  &__paper {
    fill: #ffffff;
  }

  &__cell {
    fill: #ffffff;
    stroke: #90a4ae;
    stroke-width: 1.5;

    &--on {
      stroke: #1565c0;
    }
  }

  &__frame {
    fill: none;
    stroke: #455a64;
    stroke-width: 4;
  }
}
</style>

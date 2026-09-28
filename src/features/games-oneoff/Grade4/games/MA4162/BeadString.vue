<template>
  <svg
    class="bead-string"
    :viewBox="`0 0 ${width} ${HEIGHT}`"
    role="img"
    :aria-label="`${total} 顆珠子，塗色 ${colored} 顆`"
  >
    <line
      :x1="SIDE_PAD / 2"
      :y1="HEIGHT / 2"
      :x2="width - SIDE_PAD / 2"
      :y2="HEIGHT / 2"
      class="bead-string__thread"
    />
    <circle
      v-for="bead in beads"
      :key="bead.index"
      :cx="bead.x"
      :cy="HEIGHT / 2"
      r="18"
      class="bead-string__bead"
      :class="{ 'bead-string__bead--colored': bead.colored }"
    />
  </svg>
</template>

<script>
const BEAD_WIDTH = 46;

export default {
  name: "BeadString",
  props: {
    total: { type: Number, required: true },
    colored: { type: Number, default: 0 },
  },
  data() {
    return { HEIGHT: 56, SIDE_PAD: 24 };
  },
  computed: {
    beads() {
      return Array.from({ length: this.total }, (_, index) => ({
        index,
        x: this.SIDE_PAD + (index + 0.5) * BEAD_WIDTH,
        colored: index < this.colored,
      }));
    },
    width() {
      return this.SIDE_PAD * 2 + this.total * BEAD_WIDTH;
    },
  },
};
</script>

<style scoped lang="scss">
.bead-string {
  display: block;
  width: 100%;
  height: 100%;

  &__thread {
    stroke: #8d6e63;
    stroke-width: 3;
  }

  &__bead {
    fill: #ffffff;
    stroke: #555555;
    stroke-width: 2.5;

    &--colored {
      fill: #42a5f5;
      stroke: #1565c0;
    }
  }
}
</style>

<template>
  <!-- 可以點擊塗色的圓形：count 個圓，每個切成 den 份；只是輔助，不列入作答 -->
  <svg
    class="tap-shapes"
    :viewBox="`0 0 ${cols * CELL} ${rows * CELL}`"
    role="img"
    :aria-label="`${count} 個圓，每個分成 ${den} 份，已塗 ${painted.length} 份`"
  >
    <g
      v-for="u in count"
      :key="u"
      :transform="`translate(${((u - 1) % cols) * CELL + CELL / 2} ${Math.floor((u - 1) / cols) * CELL + CELL / 2})`"
    >
      <path
        v-for="k in den"
        :key="k"
        :d="wedge(k - 1)"
        class="tap-shapes__part"
        :class="{ 'tap-shapes__part--on': isOn(u, k) }"
        :data-part="`${u}-${k}`"
        @click="toggle(u, k)"
      />
    </g>
  </svg>
</template>

<script>
const CELL = 120;
const R = 52;

// 點一塊塗色、再點一次取消；父元件可呼叫 clear() 全部擦掉
export default {
  name: "TapShapes",
  props: {
    count: { type: Number, required: true },
    den: { type: Number, required: true },
    // 一排最多幾個圓
    perRow: { type: Number, default: 4 },
    disabled: { type: Boolean, default: false },
  },
  emits: ["change"],
  data() {
    return { CELL, painted: [] };
  },
  computed: {
    cols() {
      return Math.min(this.count, this.perRow);
    },
    rows() {
      return Math.ceil(this.count / this.perRow);
    },
  },
  methods: {
    wedge(k) {
      if (this.den === 1)
        return `M ${-R} 0 A ${R} ${R} 0 1 1 ${R} 0 A ${R} ${R} 0 1 1 ${-R} 0 Z`;
      const a0 = (k / this.den) * Math.PI * 2 - Math.PI / 2;
      const a1 = ((k + 1) / this.den) * Math.PI * 2 - Math.PI / 2;
      const p = (a) => `${R * Math.cos(a)} ${R * Math.sin(a)}`;
      const large = 1 / this.den > 0.5 ? 1 : 0;
      return `M 0 0 L ${p(a0)} A ${R} ${R} 0 ${large} 1 ${p(a1)} Z`;
    },
    isOn(u, k) {
      return this.painted.includes(`${u}-${k}`);
    },
    toggle(u, k) {
      if (this.disabled) return;
      const id = `${u}-${k}`;
      this.painted = this.isOn(u, k)
        ? this.painted.filter((p) => p !== id)
        : [...this.painted, id];
      this.$emit("change", this.painted.length);
    },
    clear() {
      this.painted = [];
      this.$emit("change", 0);
    },
  },
};
</script>

<style scoped lang="scss">
.tap-shapes {
  display: block;
  max-width: 100%;
  max-height: 100%;

  &__part {
    fill: #ffffff;
    stroke: #37474f;
    stroke-width: 2.5;
    stroke-linejoin: round;
    cursor: pointer;
    transition: fill 0.15s;

    &:hover {
      fill: #fff3e0;
    }

    &--on,
    &--on:hover {
      fill: #ffb74d;
    }
  }
}
</style>

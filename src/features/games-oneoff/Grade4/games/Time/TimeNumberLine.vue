<template>
  <!-- 時間換算數線：每一段是 1 個大單位（＝factor 個小單位），最後一段是剩下的小單位 -->
  <svg
    class="time-line"
    :viewBox="`0 0 ${W} 112`"
    role="img"
    :aria-label="label"
  >
    <!-- 每一段 1 大單位 -->
    <g v-for="k in big" :key="`seg${k}`">
      <rect
        :x="x((k - 1) * factor) + 2"
        y="34"
        :width="x(factor) - x(0) - 4"
        height="20"
        rx="6"
        class="time-line__seg"
        :class="`time-line__seg--${k % 2}`"
      />
      <text :x="x((k - 0.5) * factor)" y="26" class="time-line__top">
        1 {{ bigUnit }}
      </text>
    </g>
    <!-- 剩下的小單位 -->
    <g v-if="small > 0 || mode === 'toBig'">
      <rect
        :x="x(big * factor) + 2"
        y="34"
        :width="Math.max(x(big * factor + small) - x(big * factor) - 4, 8)"
        height="20"
        rx="6"
        class="time-line__rest"
      />
      <text :x="x(big * factor + small / 2)" y="26" class="time-line__top">
        {{ mode === "toSmall" ? `${small} ${smallUnit}` : "？" }}
      </text>
    </g>

    <line :x1="x(0)" :x2="x(total)" y1="66" y2="66" class="time-line__axis" />
    <line
      v-for="k in big + 1"
      :key="`t${k}`"
      :x1="x((k - 1) * factor)"
      :x2="x((k - 1) * factor)"
      y1="58"
      y2="74"
      class="time-line__tick"
    />
    <line
      :x1="x(total)"
      :x2="x(total)"
      y1="56"
      y2="76"
      class="time-line__end"
    />

    <text :x="x(0)" y="94" class="time-line__num">0</text>
    <text v-if="big >= 1" :x="x(factor)" y="94" class="time-line__num">
      {{ factor }} {{ smallUnit }}
    </text>
    <text :x="x(total)" y="94" class="time-line__num time-line__num--end">
      {{ mode === "toBig" ? `${total} ${smallUnit}` : `？${smallUnit}` }}
    </text>
  </svg>
</template>

<script>
const W = 640;
const PAD = 40;

// 數線提示：toSmall（大單位＋小單位 → 小單位）的終點是「？」；toBig（小單位 → 大單位＋小單位）的剩餘段是「？」
export default {
  name: "TimeNumberLine",
  props: {
    mode: { type: String, required: true },
    factor: { type: Number, required: true },
    big: { type: Number, required: true },
    small: { type: Number, required: true },
    total: { type: Number, required: true },
    bigUnit: { type: String, required: true },
    smallUnit: { type: String, required: true },
  },
  data() {
    return { W };
  },
  computed: {
    label() {
      return `數線：每一段是 1 ${this.bigUnit}，也就是 ${this.factor} ${this.smallUnit}`;
    },
  },
  methods: {
    x(v) {
      // 剩餘段太短時也看得到：至少佔 1/4 段
      const scaleTotal = Math.max(
        this.total,
        this.big * this.factor + this.factor / 4
      );
      return PAD + (v / scaleTotal) * (W - PAD * 2);
    },
  },
};
</script>

<style scoped lang="scss">
.time-line {
  display: block;
  width: 100%;
  height: auto;

  &__seg {
    &--1 {
      fill: #90caf9;
    }

    &--0 {
      fill: #64b5f6;
    }
  }

  &__rest {
    fill: #ffcc80;
  }

  &__top {
    font-size: 16px;
    font-weight: 700;
    text-anchor: middle;
    fill: #0d47a1;
  }

  &__axis {
    stroke: #37474f;
    stroke-width: 3;
  }

  &__tick {
    stroke: #37474f;
    stroke-width: 2.5;
  }

  &__end {
    stroke: #e65100;
    stroke-width: 4;
  }

  &__num {
    font-size: 15px;
    font-weight: 700;
    text-anchor: middle;
    fill: #455a64;

    &--end {
      fill: #e65100;
    }
  }
}
</style>

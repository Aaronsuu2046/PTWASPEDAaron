<template>
  <!-- 跨日數線：每一個日期一段底色，午夜（日期交界）畫虛線並標新的日期；開始、結束標日期時刻（要求的那端標「？」） -->
  <svg
    class="day-line"
    :viewBox="`0 0 ${W} 104`"
    role="img"
    aria-label="跨日的時間數線"
  >
    <rect
      v-for="(band, k) in bands"
      :key="`b${k}`"
      :x="x(band.from)"
      y="44"
      :width="x(band.to) - x(band.from)"
      height="16"
      :class="`day-line__band day-line__band--${k % 2}`"
    />
    <line
      :x1="PAD - 10"
      :x2="W - PAD + 10"
      y1="52"
      y2="52"
      class="day-line__axis"
    />
    <g v-for="mid in midnights" :key="mid.offset">
      <line
        :x1="x(mid.offset)"
        :x2="x(mid.offset)"
        y1="34"
        y2="70"
        class="day-line__midnight"
      />
      <text :x="x(mid.offset)" y="88" class="day-line__date">
        {{ mid.month }}/{{ mid.day }}
      </text>
    </g>
    <line :x1="x(0)" :x2="x(0)" y1="30" y2="74" class="day-line__end" />
    <line
      :x1="x(end.offset)"
      :x2="x(end.offset)"
      y1="30"
      y2="74"
      class="day-line__end"
    />
    <text :x="x(0)" y="22" class="day-line__label">
      {{ unknown === "start" ? "？" : label(start) }}
    </text>
    <text :x="x(end.offset)" y="22" class="day-line__label">
      {{ unknown === "end" ? "？" : label(end) }}
    </text>
    <text :x="W / 2" y="102" class="day-line__note">
      虛線是午夜 12 時（換到下一天）
    </text>
  </svg>
</template>

<script>
const W = 660;
const PAD = 80;

// start、end：{ month, day, period, hour, offset }（offset：從開始算起第幾小時）
// midnights：中間每個午夜 [{ offset, month, day }]（日期由題庫依真實曆法算好）
// unknown 選填："start" 或 "end" 那端標「？」
export default {
  name: "DayTimeline",
  props: {
    start: { type: Object, required: true },
    end: { type: Object, required: true },
    midnights: { type: Array, default: () => [] },
    unknown: { type: String, default: "" },
  },
  data() {
    return { W, PAD };
  },
  computed: {
    bands() {
      const cuts = [0, ...this.midnights.map((m) => m.offset), this.end.offset];
      return cuts.slice(0, -1).map((from, k) => ({ from, to: cuts[k + 1] }));
    },
  },
  methods: {
    x(offset) {
      return PAD + (offset / (this.end.offset || 1)) * (W - PAD * 2);
    },
    label(t) {
      return `${t.month}/${t.day} ${t.period} ${t.hour} 時`;
    },
  },
};
</script>

<style scoped lang="scss">
.day-line {
  display: block;
  width: 100%;
  height: auto;

  &__band {
    &--0 {
      fill: #ffe0b2;
    }

    &--1 {
      fill: #c5e1a5;
    }
  }

  &__axis {
    stroke: #37474f;
    stroke-width: 3;
  }

  &__midnight {
    stroke: #3949ab;
    stroke-width: 2.5;
    stroke-dasharray: 5 4;
  }

  &__date {
    font-size: 14px;
    font-weight: 700;
    text-anchor: middle;
    fill: #3949ab;
  }

  &__end {
    stroke: #e65100;
    stroke-width: 4;
  }

  &__label {
    font-size: 15px;
    font-weight: 700;
    text-anchor: middle;
    fill: #e65100;
  }

  &__note {
    font-size: 12px;
    text-anchor: middle;
    fill: #5c6bc0;
  }
}
</style>

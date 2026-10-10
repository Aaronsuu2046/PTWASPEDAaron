<template>
  <!-- 時刻數線：開始、中間的整點（跨中午標「中午 12:00」）、結束；只標時刻，不標經過多久 -->
  <svg
    class="timeline"
    :viewBox="`0 0 ${W} 100`"
    role="img"
    :aria-label="`從 ${label(start)} 到 ${label(end)}`"
  >
    <rect
      :x="x(start.sec)"
      y="42"
      :width="x(end.sec) - x(start.sec)"
      height="14"
      rx="7"
      class="timeline__bar"
    />
    <line
      :x1="PAD - 10"
      :x2="W - PAD + 10"
      y1="49"
      y2="49"
      class="timeline__axis"
    />
    <!-- 每 5 分鐘的小刻度（含秒的題目） -->
    <template v-if="minorTicks.length">
      <line
        v-for="t in minorTicks"
        :key="`m${t}`"
        :x1="x(t)"
        :x2="x(t)"
        y1="44"
        y2="54"
        class="timeline__minor"
      />
    </template>
    <g v-for="(node, k) in nodes" :key="node.sec">
      <line
        :x1="x(node.sec)"
        :x2="x(node.sec)"
        y1="36"
        y2="62"
        class="timeline__tick"
        :class="`timeline__tick--${node.kind}`"
      />
      <text
        :x="x(node.sec)"
        :y="k % 2 ? 84 : 26"
        class="timeline__label"
        :class="`timeline__label--${node.kind}`"
      >
        {{ node.text }}
      </text>
    </g>
  </svg>
</template>

<script>
const W = 660;
const PAD = 70;
const pad2 = (n) => String(n).padStart(2, "0");

// start、end：{ period, h, m, s, sec }（sec 是一天中的第幾秒）；withSeconds：時刻顯示到秒
export default {
  name: "TimeTimeline",
  props: {
    start: { type: Object, required: true },
    end: { type: Object, required: true },
    withSeconds: { type: Boolean, default: false },
  },
  data() {
    return { W, PAD };
  },
  computed: {
    nodes() {
      const list = [
        { sec: this.start.sec, text: this.label(this.start), kind: "end" },
      ];
      if (!this.withSeconds) {
        // 中間的整點
        const first = Math.ceil((this.start.sec + 1) / 3600) * 3600;
        for (let t = first; t < this.end.sec; t += 3600) {
          const h24 = t / 3600;
          const text =
            h24 === 12 ? "中午 12:00" : `${h24 > 12 ? h24 - 12 : h24}:00`;
          list.push({ sec: t, text, kind: h24 === 12 ? "noon" : "hour" });
        }
      }
      list.push({ sec: this.end.sec, text: this.label(this.end), kind: "end" });
      return list;
    },
    minorTicks() {
      if (!this.withSeconds) return [];
      const ticks = [];
      const first = Math.ceil(this.start.sec / 300) * 300;
      for (let t = first; t < this.end.sec; t += 300)
        if (t !== this.start.sec) ticks.push(t);
      return ticks;
    },
  },
  methods: {
    x(sec) {
      const span = this.end.sec - this.start.sec || 1;
      return PAD + ((sec - this.start.sec) / span) * (W - PAD * 2);
    },
    label(t) {
      const base = `${t.period} ${t.h}:${pad2(t.m)}`;
      return this.withSeconds ? `${base}:${pad2(t.s)}` : base;
    },
  },
};
</script>

<style scoped lang="scss">
.timeline {
  display: block;
  width: 100%;
  height: auto;

  &__bar {
    fill: #ffe0b2;
  }

  &__axis {
    stroke: #37474f;
    stroke-width: 3;
  }

  &__minor {
    stroke: #90a4ae;
    stroke-width: 2;
  }

  &__tick {
    stroke: #37474f;
    stroke-width: 3;

    &--end {
      stroke: #e65100;
      stroke-width: 4;
    }

    &--noon {
      stroke: #1e88e5;
      stroke-width: 4;
    }
  }

  &__label {
    font-size: 15px;
    font-weight: 700;
    text-anchor: middle;
    fill: #455a64;

    &--end {
      font-size: 16px;
      fill: #e65100;
    }

    &--noon {
      fill: #1565c0;
    }
  }
}
</style>

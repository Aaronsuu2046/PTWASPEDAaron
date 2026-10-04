<template>
  <!-- 分數整數倍示意：cake 每人一盤 1/d 個蛋糕；rice 每包米標示重量 -->
  <svg
    class="times-figure"
    :viewBox="`0 0 ${width} 150`"
    role="img"
    :aria-label="label"
  >
    <g
      v-for="k in times"
      :key="k"
      :transform="`translate(${(k - 1) * CELL + CELL / 2} 0)`"
    >
      <template v-if="kind === 'cake'">
        <!-- 盤子上的一塊蛋糕（1/den 個） -->
        <ellipse cx="0" cy="104" rx="46" ry="16" class="times-figure__plate" />
        <circle cx="0" cy="70" r="38" class="times-figure__ghost" />
        <path :d="slice" class="times-figure__cake" />
        <path
          :d="slice"
          class="times-figure__cream"
          transform="translate(0 -4)"
        />
        <text x="0" y="140" class="times-figure__who">第 {{ k }} 人</text>
      </template>
      <template v-else>
        <!-- 一包米 -->
        <path
          d="M -36 30 Q -40 10 -24 10 L 24 10 Q 40 10 36 30 L 40 118 Q 0 130 -40 118 Z"
          class="times-figure__bag"
        />
        <path d="M -24 10 Q 0 -6 24 10" class="times-figure__tie" />
        <rect
          x="-28"
          y="54"
          width="56"
          height="48"
          rx="8"
          class="times-figure__tag"
        />
        <text x="0" y="74" class="times-figure__num">{{ num }}</text>
        <line x1="-14" x2="14" y1="80" y2="80" class="times-figure__bar" />
        <text x="0" y="97" class="times-figure__num">{{ den }}</text>
        <text x="0" y="145" class="times-figure__who">公斤</text>
      </template>
    </g>
  </svg>
</template>

<script>
const CELL = 110;

// 關卡 1、2 的操作示意圖：times 份，每份 num/den
export default {
  name: "TimesFigure",
  props: {
    kind: { type: String, required: true },
    num: { type: Number, required: true },
    den: { type: Number, required: true },
    times: { type: Number, required: true },
  },
  data() {
    return { CELL };
  },
  computed: {
    width() {
      return this.times * CELL;
    },
    label() {
      return this.kind === "cake"
        ? `${this.times} 個人，每人一塊 ${this.den} 分之 1 個蛋糕`
        : `${this.times} 包米，每包 ${this.den} 分之 ${this.num} 公斤`;
    },
    // 從正上方開始的一片扇形（1/den 個圓）
    slice() {
      const r = 38;
      const cy = 70;
      const a1 = (2 * Math.PI) / this.den - Math.PI / 2;
      const x1 = r * Math.cos(a1);
      const y1 = cy + r * Math.sin(a1);
      const large = this.den <= 2 ? 1 : 0;
      return `M 0 ${cy} L 0 ${cy - r} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
    },
  },
};
</script>

<style scoped lang="scss">
.times-figure {
  display: block;
  max-width: 100%;
  max-height: 100%;

  &__plate {
    fill: #eceff1;
    stroke: #90a4ae;
    stroke-width: 3;
  }

  &__ghost {
    fill: none;
    stroke: #bcaaa4;
    stroke-width: 2;
    stroke-dasharray: 5 4;
  }

  &__cake {
    fill: #ffcc80;
    stroke: #8d6e63;
    stroke-width: 2.5;
    stroke-linejoin: round;
  }

  &__cream {
    fill: #f8bbd0;
    stroke: #ec407a;
    stroke-width: 2;
    stroke-linejoin: round;
    opacity: 0.85;
  }

  &__bag {
    fill: #fff8e1;
    stroke: #a1887f;
    stroke-width: 3;
    stroke-linejoin: round;
  }

  &__tie {
    fill: none;
    stroke: #8d6e63;
    stroke-width: 4;
  }

  &__tag {
    fill: #ffffff;
    stroke: #66bb6a;
    stroke-width: 2.5;
  }

  &__num {
    font-size: 17px;
    font-weight: 700;
    text-anchor: middle;
    fill: #0d47a1;
  }

  &__bar {
    stroke: #0d47a1;
    stroke-width: 2.5;
  }

  &__who {
    font-size: 15px;
    font-weight: 700;
    text-anchor: middle;
    fill: #5d4037;
  }
}
</style>

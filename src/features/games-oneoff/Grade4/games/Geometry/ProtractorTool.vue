<template>
  <!-- 半圓量角器：放在父層 <svg> 裡，以中心點為原點 (0,0)、0° 線在 x 軸、刻度在上方 -->
  <!-- 數字和實體量角器一樣沿著圓弧排；0 與 180 的中心落在 0° 線上，取代那一小段底線 -->
  <g class="protractor" :class="{ 'protractor--glass': glass }">
    <path :d="band(0, R)" class="protractor__body" />
    <path :d="band(OUTER_IN * R, R)" class="protractor__outer" />
    <path :d="band(INNER_IN * R, OUTER_IN * R)" class="protractor__inner" />
    <path
      :d="`M ${-OUTER_IN * R} ${strip} V 0 A ${OUTER_IN * R} ${
        OUTER_IN * R
      } 0 0 1 ${OUTER_IN * R} 0 V ${strip}`"
      class="protractor__divider"
    />

    <!-- 放射導線：由中心點對齊整十刻度往外，停在內圈刻度帶前，不壓到數字 -->
    <line
      v-for="g in guides"
      :key="`g${g.deg}`"
      x1="0"
      y1="0"
      :x2="g.x"
      :y2="g.y"
      class="protractor__guide"
    />

    <line
      v-for="t in ticks"
      :key="`t${t.deg}`"
      :x1="t.x1"
      :y1="t.y1"
      :x2="t.x2"
      :y2="t.y2"
      class="protractor__tick"
      :class="`protractor__tick--${t.size}`"
    />

    <g class="protractor__numbers">
      <text
        v-for="n in outerNumbers"
        :key="`o${n.deg}`"
        :x="n.x"
        :y="n.y"
        :transform="`rotate(${n.turn} ${n.x} ${n.y})`"
        class="protractor__num protractor__num--outer"
        :font-size="outerSize"
      >
        {{ n.label }}
      </text>
      <text
        v-for="n in innerNumbers"
        :key="`i${n.deg}`"
        :x="n.x"
        :y="n.y"
        :transform="`rotate(${n.turn} ${n.x} ${n.y})`"
        class="protractor__num protractor__num--inner"
        :font-size="innerSize"
      >
        {{ n.label }}
      </text>
    </g>

    <!-- 0° 線：中心點就是底邊和放射導線交會的地方 -->
    <path :d="baseLine" class="protractor__base" />
  </g>
</template>

<script>
import { OUTER_IN, INNER_IN, BASE_STRIP, polar } from "./protractor.js";

// 數字中心所在的半徑比例
const OUTER_NUM = 0.875;
const INNER_NUM = 0.71;
// 數字大小（半徑比例）；數字沿圓弧排，上限讓相鄰的三位數之間留得出空隙
const OUTER_SIZE = { base: 0.068, max: 0.075 };
const INNER_SIZE = { base: 0.058, max: 0.062 };

export default {
  name: "ProtractorTool",
  props: {
    // 外半徑（父層 SVG 單位）
    r: { type: Number, default: 250 },
    // 半透明：疊在題目圖上時看得到底下的線
    glass: { type: Boolean, default: false },
    // 數字放大倍率：量角器畫得比較小時用
    fontScale: { type: Number, default: 1 },
  },
  data() {
    return { OUTER_IN, INNER_IN };
  },
  computed: {
    R() {
      return this.r;
    },
    ticks() {
      const R = this.R;
      const list = [];
      for (let deg = 0; deg <= 180; deg += 1) {
        const size = deg % 10 === 0 ? "long" : deg % 5 === 0 ? "mid" : "short";
        const len = { long: 0.09, mid: 0.06, short: 0.035 }[size] * R;
        const [x1, y1] = polar(deg, R);
        const [x2, y2] = polar(deg, R - len);
        list.push({ deg, size, x1, y1, x2, y2 });
        // 內圈刻度帶上緣也加整十刻度
        if (size === "long" && deg % 180 !== 0) {
          const [a, b] = polar(deg, OUTER_IN * R);
          const [c, e] = polar(deg, OUTER_IN * R - 0.05 * R);
          list.push({
            deg: `in${deg}`,
            size: "inner",
            x1: a,
            y1: b,
            x2: c,
            y2: e,
          });
        }
      }
      return list;
    },
    guides() {
      const list = [];
      for (let deg = 10; deg < 180; deg += 10) {
        const [x, y] = polar(deg, INNER_IN * this.R);
        list.push({ deg, x, y });
      }
      return list;
    },
    strip() {
      return BASE_STRIP * this.R;
    },
    // 0° 線：兩端數字的位置留空，由數字取代那一段
    baseLine() {
      const R = this.R;
      const holes = [
        [OUTER_NUM * R, this.outerSize * 0.6],
        [INNER_NUM * R, this.innerSize * 0.6],
      ]
        .flatMap(([x, half]) => [
          [x - half, x + half],
          [-x - half, -x + half],
        ])
        .sort((a, b) => a[0] - b[0]);
      let d = "";
      let from = -R;
      holes.forEach(([a, b]) => {
        d += `M ${from} 0 H ${a} `;
        from = b;
      });
      return `${d}M ${from} 0 H ${R}`;
    },
    outerSize() {
      return (
        this.R * Math.min(OUTER_SIZE.base * this.fontScale, OUTER_SIZE.max)
      );
    },
    innerSize() {
      return (
        this.R * Math.min(INNER_SIZE.base * this.fontScale, INNER_SIZE.max)
      );
    },
    // 外圈從左邊 0 開始，內圈從右邊 0 開始
    outerNumbers() {
      return this.ringNumbers(OUTER_NUM, this.outerSize, (deg) => 180 - deg);
    },
    innerNumbers() {
      return this.ringNumbers(INNER_NUM, this.innerSize, (deg) => deg);
    },
  },
  methods: {
    // 數字沿著圓弧轉向（字頭朝外），中心正對自己的刻度；
    // 0° 與 180° 的數字中心（0 的中間、180 的 8）剛好落在 0° 線上
    ringNumbers(radius, size, labelOf) {
      const r = radius * this.R;
      const list = [];
      for (let deg = 0; deg <= 180; deg += 10) {
        const [x, y] = polar(deg, r);
        list.push({ deg, label: labelOf(deg), x, y, turn: 90 - deg });
      }
      return list;
    },
    // 半徑 r1～r2 的上半圓環，兩端往下延伸到 0° 線下方的底邊
    band(r1, r2) {
      const h = this.strip;
      if (r1 === 0) {
        return `M ${-r2} ${h} V 0 A ${r2} ${r2} 0 0 1 ${r2} 0 V ${h} Z`;
      }
      return `M ${-r2} ${h} V 0 A ${r2} ${r2} 0 0 1 ${r2} 0 V ${h} H ${r1} V 0 A ${r1} ${r1} 0 0 0 ${-r1} 0 V ${h} Z`;
    },
  },
};
</script>

<style scoped lang="scss">
.protractor {
  &__body {
    fill: #fafafa;
    stroke: #546e7a;
    stroke-width: 3;
  }

  &__outer {
    fill: #e3f2fd;
  }

  &__inner {
    fill: #fff3e0;
  }

  &--glass &__body {
    fill: rgba(250, 250, 250, 0.35);
  }

  &--glass &__outer {
    fill: rgba(187, 222, 251, 0.55);
  }

  &--glass &__inner {
    fill: rgba(255, 224, 178, 0.55);
  }

  &__divider {
    fill: none;
    stroke: #90a4ae;
    stroke-width: 1.5;
  }

  &__tick {
    stroke: #37474f;
    stroke-width: 1;

    &--mid {
      stroke-width: 1.5;
    }

    &--long,
    &--inner {
      stroke-width: 2.2;
    }
  }

  &__num {
    text-anchor: middle;
    dominant-baseline: central;
    font-weight: 700;

    &--outer {
      fill: #0d47a1;
    }

    &--inner {
      fill: #d84315;
    }
  }

  &__base {
    stroke: #37474f;
    stroke-width: 3;
  }

  &__guide {
    stroke: #90a4ae;
    stroke-width: 1.2;
  }
}
</style>

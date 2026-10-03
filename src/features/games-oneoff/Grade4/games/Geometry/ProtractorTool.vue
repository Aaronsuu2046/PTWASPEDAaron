<template>
  <!-- 半圓量角器：放在父層 <svg> 裡，以中心點為原點 (0,0)、0° 線在 x 軸、刻度在上方 -->
  <!-- 數字和實體量角器一樣沿著圓弧排，0 與 180 的字尾和底邊切齊 -->
  <g class="protractor" :class="{ 'protractor--glass': glass }">
    <path :d="band(0, R)" class="protractor__body" />
    <path :d="band(OUTER_IN * R, R)" class="protractor__outer" />
    <path :d="band(INNER_IN * R, OUTER_IN * R)" class="protractor__inner" />
    <path
      :d="`M ${-OUTER_IN * R} 0 A ${OUTER_IN * R} ${OUTER_IN * R} 0 0 1 ${
        OUTER_IN * R
      } 0`"
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
        :text-anchor="n.anchor"
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
        :text-anchor="n.anchor"
        class="protractor__num protractor__num--inner"
        :font-size="innerSize"
      >
        {{ n.label }}
      </text>
    </g>

    <!-- 0° 線：中心點就是底邊和放射導線交會的地方 -->
    <line :x1="-R" y1="0" :x2="R" y2="0" class="protractor__base" />
  </g>
</template>

<script>
import { OUTER_IN, INNER_IN, polar } from "./protractor.js";

// 數字中心所在的半徑比例
const OUTER_NUM = 0.875;
const INNER_NUM = 0.71;
// 一個數字的字寬約為字級的 0.55 倍
const DIGIT_EM = 0.55;
// 兩端數字離 0° 線的距離、兩端數字和旁邊數字之間的空隙（半徑比例）
const END_LIFT = 0.01;
const END_GAP = 0.02;
// 數字大小（半徑比例）；字放大倍率再大也不超過上限，免得兩端擠在一起
const OUTER_SIZE = { base: 0.06, max: 0.062 };
const INNER_SIZE = { base: 0.05, max: 0.047 };

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
    // 數字沿著圓弧轉向（字頭朝外），正對自己的刻度
    // 0° 與 180° 兩端的數字和實體量角器一樣從底邊往上寫，字尾和底邊切齊；
    // 緊鄰兩端的數字（例如 170）若會碰到，就沿圓弧往上挪一點
    ringNumbers(radius, size, labelOf) {
      const R = this.R;
      const r = radius * R;
      const len = (label) => String(label).length * DIGIT_EM * size;
      const list = [];
      for (let deg = 0; deg <= 180; deg += 10) {
        const label = labelOf(deg);
        if (deg === 0 || deg === 180) {
          const x = deg === 0 ? r : -r;
          list.push({
            deg,
            label,
            x,
            y: -END_LIFT * R,
            turn: 90 - deg,
            anchor: deg === 0 ? "end" : "start",
          });
          continue;
        }
        let at = deg;
        if (deg === 10 || deg === 170) {
          const end = labelOf(deg === 10 ? 0 : 180);
          const need = END_LIFT * R + len(end) + END_GAP * R + len(label) / 2;
          const lift = (Math.asin(Math.min(need / r, 1)) * 180) / Math.PI;
          at = deg === 10 ? Math.max(10, lift) : Math.min(170, 180 - lift);
        }
        const [x, y] = polar(at, r);
        list.push({ deg, label, x, y, turn: 90 - at, anchor: "middle" });
      }
      return list;
    },
    // 半徑 r1～r2 的上半圓環
    band(r1, r2) {
      if (r1 === 0) {
        return `M ${-r2} 0 A ${r2} ${r2} 0 0 1 ${r2} 0 Z`;
      }
      return `M ${-r2} 0 A ${r2} ${r2} 0 0 1 ${r2} 0 L ${r1} 0 A ${r1} ${r1} 0 0 0 ${-r1} 0 Z`;
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

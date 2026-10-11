<template>
  <svg
    class="decimal-scene"
    viewBox="0 0 360 240"
    role="img"
    :aria-label="ariaLabel"
    font-family="sans-serif"
    font-weight="700"
  >
    <rect x="0" y="0" width="360" height="240" rx="18" fill="#f1f8ff" />

    <!-- 上半：物品圖卡 -->
    <g
      v-for="(card, k) in cards"
      :key="`card-${k}`"
      :transform="`translate(${card.x} 10)`"
    >
      <rect
        width="120"
        height="118"
        rx="14"
        fill="#ffffff"
        stroke="#bbdefb"
        stroke-width="3"
      />
      <g transform="translate(60 48)">
        <!-- 水果 -->
        <g v-if="FRUIT[card.icon]">
          <circle cx="-16" cy="6" r="17" :fill="FRUIT[card.icon].body" />
          <circle cx="16" cy="6" r="17" :fill="FRUIT[card.icon].body" />
          <circle cx="0" cy="-14" r="17" :fill="FRUIT[card.icon].body" />
          <circle
            v-if="card.icon === 'kiwi'"
            cx="0"
            cy="-14"
            r="9"
            fill="#c5e1a5"
          />
          <path
            d="M0 -31 q6 -8 14 -6"
            stroke="#558b2f"
            stroke-width="4"
            fill="none"
          />
        </g>
        <!-- 飲料壺 -->
        <g v-else-if="DRINK[card.icon]">
          <path
            d="M-24 -30 h44 l6 62 q0 6 -6 6 h-44 q-6 0 -6 -6 z"
            fill="#e3f2fd"
            stroke="#90a4ae"
            stroke-width="3"
          />
          <path
            d="M-27 -2 h50 l3 34 q0 6 -6 6 h-44 q-6 0 -6 -6 z"
            :fill="DRINK[card.icon]"
          />
          <path
            d="M20 -22 q16 4 14 22 q-2 12 -12 14"
            stroke="#90a4ae"
            stroke-width="4"
            fill="none"
          />
        </g>
        <!-- 膠帶捲 -->
        <g v-else-if="card.icon === 'tape'">
          <circle r="34" fill="#ffcc80" />
          <circle r="16" fill="#ffffff" stroke="#ffb74d" stroke-width="3" />
          <path d="M28 18 l26 10 v10 l-30 -12 z" fill="#ffe0b2" />
        </g>
        <!-- 緞帶 -->
        <g v-else-if="card.icon === 'ribbon'">
          <path d="M0 0 L-30 -22 L-30 22 Z" fill="#f06292" />
          <path d="M0 0 L30 -22 L30 22 Z" fill="#f06292" />
          <circle r="8" fill="#ad1457" />
          <path
            d="M-4 6 L-18 38 M4 6 L18 38"
            stroke="#ec407a"
            stroke-width="6"
            stroke-linecap="round"
          />
        </g>
        <!-- 麵粉袋／米袋 -->
        <g v-else-if="card.icon === 'flour' || card.icon === 'rice'">
          <path
            d="M-30 -24 q30 -16 60 0 l6 52 q-36 14 -72 0 z"
            :fill="card.icon === 'flour' ? '#fff8e1' : '#efebe9'"
            stroke="#a1887f"
            stroke-width="3"
          />
          <text
            y="12"
            font-size="22"
            text-anchor="middle"
            :fill="card.icon === 'flour' ? '#e65100' : '#5d4037'"
          >
            {{ card.icon === "flour" ? "麵粉" : "米" }}
          </text>
        </g>
        <!-- 牛奶瓶／沙拉油 -->
        <g v-else-if="card.icon === 'milk' || card.icon === 'oil'">
          <path
            d="M-10 -36 h20 v12 l12 14 v42 q0 6 -6 6 h-32 q-6 0 -6 -6 v-42 l12 -14 z"
            fill="#ffffff"
            stroke="#90a4ae"
            stroke-width="3"
          />
          <path
            d="M-20 0 h40 v32 q0 6 -6 6 h-28 q-6 0 -6 -6 z"
            :fill="card.icon === 'milk' ? '#e3f2fd' : '#fff176'"
          />
          <rect
            x="-10"
            y="-40"
            width="20"
            height="8"
            rx="2"
            :fill="card.icon === 'milk' ? '#42a5f5' : '#f9a825'"
          />
        </g>
      </g>
      <text x="60" y="110" font-size="20" text-anchor="middle" fill="#37474f">
        {{ card.label }}
      </text>
    </g>
    <text
      v-if="figure.kind === 'combine'"
      x="180"
      y="78"
      font-size="34"
      text-anchor="middle"
      fill="#e65100"
    >
      ＋
    </text>

    <!-- 下半：長條圖，長度依數量比例，問的那一段寫「？」 -->
    <g transform="translate(0 158)">
      <template v-for="(seg, k) in segments" :key="`seg-${k}`">
        <rect
          :x="seg.x"
          y="16"
          :width="seg.w"
          height="28"
          :fill="seg.fill"
          stroke="#455a64"
          stroke-width="2"
        />
        <text
          :x="seg.x + seg.w / 2"
          y="70"
          font-size="20"
          text-anchor="middle"
          :fill="seg.ask ? '#e65100' : '#37474f'"
        >
          {{ seg.text }}
        </text>
      </template>
      <!-- 全部的長度 -->
      <path
        :d="`M${BAR_X} 10 v-6 h${BAR_W} v6`"
        fill="none"
        stroke="#1565c0"
        stroke-width="2"
      />
      <text
        :x="BAR_X + BAR_W / 2"
        y="0"
        font-size="20"
        text-anchor="middle"
        :fill="totalAsk ? '#e65100' : '#1565c0'"
      >
        {{ totalText }}
      </text>
    </g>
  </svg>
</template>

<script>
const FRUIT = {
  orange: { body: "#ffa726" },
  tangerine: { body: "#fb8c00" },
  guava: { body: "#9ccc65" },
  kiwi: { body: "#8d6e63" },
};
const DRINK = {
  honey: "#ffca28",
  lemon: "#fff176",
  wintermelon: "#a1887f",
};
const BAR_X = 30;
const BAR_W = 300;
const MIN_W = 96;

// 小數應用題情境圖：figure {
//   shape: "decimal", kind: "combine" | "remove", unit,
//   combine：parts: [{ icon, label, value }, { icon, label, value }]，total 是「？」
//   remove：whole: { icon, label, value }，known: { label, value }，ask: 問的那一段名稱
// }
// 圖上只放題目給的數字，答案寫「？」
export default {
  name: "DecimalScene",
  props: {
    figure: { type: Object, required: true },
  },
  data() {
    return { FRUIT, DRINK, BAR_X, BAR_W };
  },
  computed: {
    unit() {
      return this.figure.unit;
    },
    cards() {
      if (this.figure.kind === "combine")
        return this.figure.parts.map((p, k) => ({
          ...p,
          x: k === 0 ? 40 : 200,
          label: p.label,
        }));
      return [{ ...this.figure.whole, x: 120 }];
    },
    totalAsk() {
      return this.figure.kind === "combine";
    },
    totalText() {
      if (this.figure.kind === "combine") return `共 ？ ${this.unit}`;
      const { whole } = this.figure;
      return `${whole.prefix || "原有"} ${whole.value} ${this.unit}`;
    },
    // 長條分兩段；寬度依數量比例，但每段至少 MIN_W 才放得下文字
    segments() {
      let first;
      let second;
      if (this.figure.kind === "combine") {
        const [a, b] = this.figure.parts;
        first = {
          value: Number(a.value),
          text: `${a.label} ${a.value}`,
          fill: "#ffe0b2",
        };
        second = {
          value: Number(b.value),
          text: `${b.label} ${b.value}`,
          fill: "#c8e6c9",
        };
      } else {
        const { whole, known } = this.figure;
        const knownV = Number(known.value);
        const restV = Number(whole.value) - knownV;
        first = {
          value: known.first ? knownV : restV,
          text: known.first
            ? `${known.label} ${known.value}`
            : `${this.figure.ask} ？`,
          ask: !known.first,
          fill: known.first ? "#cfd8dc" : "#fff3e0",
        };
        second = {
          value: known.first ? restV : knownV,
          text: known.first
            ? `${this.figure.ask} ？`
            : `${known.label} ${known.value}`,
          ask: known.first,
          fill: known.first ? "#fff3e0" : "#bbdefb",
        };
      }
      const total = first.value + second.value;
      let w1 = Math.round((BAR_W * first.value) / total);
      w1 = Math.min(Math.max(w1, MIN_W), BAR_W - MIN_W);
      return [
        { ...first, x: BAR_X, w: w1 },
        { ...second, x: BAR_X + w1, w: BAR_W - w1 },
      ];
    },
    ariaLabel() {
      return this.figure.kind === "combine"
        ? `${this.figure.parts.map((p) => p.label).join("和")}合起來`
        : `${this.figure.whole.label}的情境圖`;
    },
  },
};
</script>

<style scoped>
.decimal-scene {
  display: block;
  width: 100%;
  height: auto;
}
</style>

<template>
  <!-- 乘法表的一組圖案：每組固定數量，畫得清楚、可以一個一個數 -->
  <svg class="count-group" viewBox="0 0 100 100" role="img" :aria-label="label">
    <!-- 2 顆櫻桃 -->
    <template v-if="kind === 'cherries'">
      <path
        d="M50 14 Q40 36 30 62 M50 14 Q60 36 70 62"
        stroke="#558b2f"
        stroke-width="4"
        fill="none"
        stroke-linecap="round"
      />
      <path d="M50 14 q14 -8 24 2 q-12 6 -24 -2 z" fill="#7cb342" />
      <circle cx="30" cy="70" r="17" fill="#d32f2f" />
      <circle cx="70" cy="70" r="17" fill="#d32f2f" />
      <circle cx="24" cy="64" r="5" fill="#ff8a80" />
      <circle cx="64" cy="64" r="5" fill="#ff8a80" />
    </template>

    <!-- 1 朵花、5 片花瓣 -->
    <template v-else-if="kind === 'flower'">
      <ellipse
        v-for="i in 5"
        :key="i"
        cx="50"
        cy="27"
        rx="13"
        ry="21"
        fill="#f48fb1"
        stroke="#d81b60"
        stroke-width="2"
        :transform="`rotate(${(i - 1) * 72} 50 50)`"
      />
      <circle
        cx="50"
        cy="50"
        r="12"
        fill="#fdd835"
        stroke="#f9a825"
        stroke-width="2"
      />
    </template>

    <!-- 1 株、4 片葉子 -->
    <template v-else-if="kind === 'clover'">
      <path
        d="M50 52 Q52 76 44 96"
        stroke="#33691e"
        stroke-width="4"
        fill="none"
        stroke-linecap="round"
      />
      <path
        v-for="i in 4"
        :key="i"
        d="M50 48 C30 40 26 14 42 12 C48 11 50 18 50 22 C50 18 52 11 58 12 C74 14 70 40 50 48 Z"
        fill="#43a047"
        stroke="#1b5e20"
        stroke-width="2"
        :transform="`rotate(${(i - 1) * 90 + 45} 50 48) translate(0 2)`"
      />
      <circle cx="50" cy="48" r="4" fill="#1b5e20" />
    </template>

    <!-- 8 瓶牛奶：兩排各 4 瓶 -->
    <template v-else-if="kind === 'milk'">
      <!-- 8 盒牛奶：兩排各 4 盒，屋頂形紙盒 -->
      <rect x="2" y="4" width="96" height="92" rx="8" fill="#e3f2fd" />
      <g v-for="(p, i) in milkSpots" :key="i">
        <path
          :d="`M${p.x - 10} ${p.y - 9} L${p.x - 5} ${p.y - 18} L${p.x + 5} ${p.y - 18} L${p.x + 10} ${p.y - 9} Z`"
          fill="#bbdefb"
          stroke="#1e88e5"
          stroke-width="1.5"
          stroke-linejoin="round"
        />
        <rect
          :x="p.x - 10"
          :y="p.y - 9"
          width="20"
          height="26"
          rx="1.5"
          fill="#ffffff"
          stroke="#1e88e5"
          stroke-width="1.5"
        />
        <rect :x="p.x - 10" :y="p.y + 3" width="20" height="7" fill="#42a5f5" />
      </g>
    </template>
  </svg>
</template>

<script>
const LABELS = {
  cherries: "2 顆櫻桃",
  flower: "1 朵花有 5 片花瓣",
  clover: "1 株有 4 片葉子",
  milk: "8 盒牛奶",
};

export default {
  name: "CountGroup",
  props: {
    kind: { type: String, required: true },
  },
  computed: {
    label() {
      return LABELS[this.kind] || "一組圖案";
    },
    milkSpots() {
      const xs = [14, 38, 62, 86];
      return [28, 72].flatMap((y) => xs.map((x) => ({ x, y })));
    },
  },
};
</script>

<style scoped>
.count-group {
  display: block;
  width: 100%;
  height: 100%;
}
</style>

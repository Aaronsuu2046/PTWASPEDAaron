<template>
  <!-- 一份食物：容器（籠、盤、袋、箱）＋ per 個食物，畫成清楚可以數的樣子 -->
  <svg
    class="food-portion"
    viewBox="0 0 120 100"
    role="img"
    :aria-label="label"
  >
    <!-- 包子：蒸籠 -->
    <template v-if="kind === 'bun'">
      <ellipse cx="60" cy="74" rx="54" ry="18" fill="#a1683a" />
      <rect x="6" y="56" width="108" height="18" fill="#c68a4f" />
      <ellipse cx="60" cy="56" rx="54" ry="16" fill="#e0b07a" />
      <path d="M10 62 H110 M10 68 H110" stroke="#a1683a" stroke-width="1.6" />
      <g v-for="(p, i) in spots" :key="i">
        <circle :cx="p.x" :cy="p.y" r="11" fill="#fffaf0" stroke="#c9b79c" />
        <path
          :d="`M${p.x - 5} ${p.y - 2} q5 -6 10 0`"
          stroke="#c9b79c"
          stroke-width="1.6"
          fill="none"
        />
      </g>
    </template>

    <!-- 地瓜：盤子 -->
    <template v-else-if="kind === 'potato'">
      <ellipse cx="60" cy="68" rx="56" ry="22" fill="#e3f2fd" />
      <ellipse cx="60" cy="66" rx="44" ry="15" fill="#ffffff" />
      <ellipse
        cx="60"
        cy="68"
        rx="56"
        ry="22"
        fill="none"
        stroke="#90caf9"
        stroke-width="2"
      />
      <g v-for="(p, i) in spots" :key="i">
        <ellipse
          :cx="p.x"
          :cy="p.y"
          rx="22"
          ry="8"
          :transform="`rotate(-12 ${p.x} ${p.y})`"
          fill="#ad4b79"
          stroke="#7b2d55"
          stroke-width="1.5"
        />
        <circle :cx="p.x - 6" :cy="p.y - 1" r="1.4" fill="#7b2d55" />
        <circle :cx="p.x + 7" :cy="p.y + 1" r="1.4" fill="#7b2d55" />
      </g>
    </template>

    <!-- 甜椒、紅蘿蔔：透明袋子 -->
    <template v-else-if="kind === 'pepper' || kind === 'carrot'">
      <path
        d="M14 22 Q60 14 106 22 L100 94 Q60 100 20 94 Z"
        fill="#e1f5fe"
        stroke="#4fc3f7"
        stroke-width="2"
        opacity="0.9"
      />
      <path
        d="M48 14 L60 22 L72 14"
        stroke="#ef5350"
        stroke-width="4"
        fill="none"
      />
      <template v-if="kind === 'pepper'">
        <g v-for="(p, i) in spots" :key="i">
          <path
            :d="`M${p.x - 15} ${p.y - 12} q15 -8 30 0 q4 22 -6 30 q-9 5 -18 0 q-10 -8 -6 -30 z`"
            :fill="i % 2 ? '#fdd835' : '#e53935'"
            stroke="#8d1c1c"
            stroke-width="1.2"
          />
          <rect
            :x="p.x - 3"
            :y="p.y - 22"
            width="6"
            height="10"
            rx="2"
            fill="#43a047"
          />
        </g>
      </template>
      <template v-else>
        <g v-for="(p, i) in spots" :key="i">
          <path
            :d="`M${p.x - 7} ${p.y - 18} L${p.x + 7} ${p.y - 18} L${p.x} ${p.y + 24} Z`"
            fill="#fb8c00"
            stroke="#c25e00"
            stroke-width="1.2"
            stroke-linejoin="round"
          />
          <path
            :d="`M${p.x} ${p.y - 18} l-5 -9 M${p.x} ${p.y - 18} l0 -11 M${p.x} ${p.y - 18} l5 -9`"
            stroke="#2e7d32"
            stroke-width="3"
            stroke-linecap="round"
          />
        </g>
      </template>
    </template>

    <!-- 蘋果：木箱 -->
    <template v-else-if="kind === 'apple'">
      <rect x="6" y="40" width="108" height="54" rx="4" fill="#bc8a5f" />
      <path d="M6 58 H114 M6 76 H114" stroke="#8d6e63" stroke-width="2" />
      <g v-for="(p, i) in spots" :key="i">
        <circle :cx="p.x" :cy="p.y" r="12" fill="#e53935" stroke="#9a1b1b" />
        <circle :cx="p.x - 4" :cy="p.y - 4" r="3" fill="#ffcdd2" />
        <path
          :d="`M${p.x} ${p.y - 11} l2 -6`"
          stroke="#5d4037"
          stroke-width="2.4"
          stroke-linecap="round"
        />
        <ellipse
          :cx="p.x + 6"
          :cy="p.y - 15"
          rx="4.5"
          ry="2.4"
          fill="#43a047"
        />
      </g>
    </template>
  </svg>
</template>

<script>
// 每種食物的擺放位置（viewBox 120×100），數量固定，學生可以一個一個數
const SPOTS = {
  bun: [
    [30, 50],
    [60, 46],
    [90, 50],
    [45, 64],
    [75, 64],
  ],
  potato: [
    [60, 50],
    [44, 66],
    [76, 66],
  ],
  pepper: [
    [40, 60],
    [80, 60],
  ],
  carrot: [
    [30, 58],
    [50, 62],
    [70, 58],
    [90, 62],
  ],
  apple: [
    [30, 32],
    [60, 30],
    [90, 32],
    [30, 52],
    [60, 50],
    [90, 52],
  ],
};
const NAMES = {
  bun: "一籠包子",
  potato: "一盤地瓜",
  pepper: "一包甜椒",
  carrot: "一包紅蘿蔔",
  apple: "一箱蘋果",
};

export default {
  name: "FoodPortion",
  props: {
    kind: { type: String, required: true },
  },
  computed: {
    spots() {
      return (SPOTS[this.kind] || []).map(([x, y]) => ({ x, y }));
    },
    label() {
      return NAMES[this.kind] || "食物";
    },
  },
};
</script>

<style scoped>
.food-portion {
  display: block;
  width: 100%;
  height: 100%;
}
</style>

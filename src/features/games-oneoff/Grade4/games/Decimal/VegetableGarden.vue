<template>
  <!-- 百格菜園：平均分成 100 格，每種蔬菜占一塊長方形，標名稱和小圖示（不標數字） -->
  <svg
    class="garden"
    viewBox="0 0 304 304"
    role="img"
    aria-label="平均分成 100 格的菜園：地瓜、小黃瓜、胡蘿蔔、蔥、菠菜"
  >
    <g v-for="plot in PLOTS" :key="plot.name">
      <rect
        :x="2 + plot.c * C"
        :y="2 + plot.r * C"
        :width="plot.w * C"
        :height="plot.h * C"
        :fill="plot.color"
      />
    </g>
    <!-- 100 格的格線 -->
    <path :d="gridPath" class="garden__grid" />
    <!-- 各區的外框 -->
    <rect
      v-for="plot in PLOTS"
      :key="`b-${plot.name}`"
      :x="2 + plot.c * C"
      :y="2 + plot.r * C"
      :width="plot.w * C"
      :height="plot.h * C"
      class="garden__plot"
    />
    <!-- 名稱牌和小圖示 -->
    <g
      v-for="plot in PLOTS"
      :key="`l-${plot.name}`"
      :transform="`translate(${2 + (plot.c + plot.w / 2) * C} ${2 + (plot.r + plot.h / 2) * C})`"
    >
      <g :transform="`translate(0 ${plot.small ? -12 : -14})`">
        <use :href="`#${uid}-${plot.icon}`" />
      </g>
      <rect
        :x="-plot.name.length * 7 - 5"
        :y="plot.small ? 6 : 8"
        :width="plot.name.length * 14 + 10"
        height="19"
        rx="9"
        class="garden__tag"
      />
      <text :y="plot.small ? 20 : 22" class="garden__name">
        {{ plot.name }}
      </text>
    </g>

    <defs>
      <!-- 地瓜 -->
      <g :id="`${uid}-potato`">
        <path
          d="M -16 2 q 2 -12 16 -12 q 16 0 16 10 q 0 10 -16 10 q -14 0 -16 -8 z"
          fill="#ab47bc"
          class="garden__ink"
        />
        <path d="M -6 -4 l 2 2 M 4 2 l 2 2" class="garden__ink" />
      </g>
      <!-- 小黃瓜 -->
      <g :id="`${uid}-cucumber`">
        <path
          d="M -18 6 q 4 -16 34 -14 q 4 2 0 6 q -24 2 -30 14 q -6 2 -4 -6 z"
          fill="#43a047"
          class="garden__ink"
        />
        <circle cx="-2" cy="-2" r="1.4" fill="#c5e1a5" />
        <circle cx="8" cy="-5" r="1.4" fill="#c5e1a5" />
      </g>
      <!-- 胡蘿蔔 -->
      <g :id="`${uid}-carrot`">
        <path d="M -8 -6 l 16 0 l -8 22 z" fill="#fb8c00" class="garden__ink" />
        <path
          d="M 0 -6 q -6 -8 -8 -12 M 0 -6 q 0 -10 0 -14 M 0 -6 q 6 -8 8 -12"
          stroke="#2e7d32"
          stroke-width="3"
          fill="none"
          stroke-linecap="round"
        />
      </g>
      <!-- 蔥 -->
      <g :id="`${uid}-scallion`">
        <path
          d="M -4 -16 v 22 M 0 -18 v 24 M 4 -16 v 22"
          stroke="#43a047"
          stroke-width="3"
          stroke-linecap="round"
        />
        <rect
          x="-7"
          y="4"
          width="14"
          height="10"
          rx="3"
          fill="#ffffff"
          class="garden__ink"
        />
      </g>
      <!-- 菠菜 -->
      <g :id="`${uid}-spinach`">
        <path
          d="M 0 14 q -16 -4 -12 -20 q 10 -2 12 10 q 2 -12 12 -10 q 4 16 -12 20 z"
          fill="#2e7d32"
          class="garden__ink"
        />
        <path d="M 0 14 v -16" stroke="#a5d6a7" stroke-width="2" />
      </g>
    </defs>
  </svg>
</template>

<script>
const C = 30; // 一格的邊長
// 菜園分區（第 r 列第 c 行開始，寬 w 格、高 h 格）；格數：地瓜 30、小黃瓜 24、胡蘿蔔 28、蔥 6、菠菜 12
const PLOTS = [
  { name: "地瓜", icon: "potato", r: 0, c: 0, w: 10, h: 3, color: "#f3e5f5" },
  { name: "胡蘿蔔", icon: "carrot", r: 3, c: 0, w: 4, h: 7, color: "#ffe0b2" },
  {
    name: "小黃瓜",
    icon: "cucumber",
    r: 3,
    c: 4,
    w: 6,
    h: 4,
    color: "#dcedc8",
  },
  {
    name: "蔥",
    icon: "scallion",
    r: 7,
    c: 4,
    w: 2,
    h: 3,
    color: "#b3e5fc",
    small: true,
  },
  {
    name: "菠菜",
    icon: "spinach",
    r: 7,
    c: 6,
    w: 4,
    h: 3,
    color: "#fff9c4",
    small: true,
  },
];
let seq = 0;

export default {
  name: "VegetableGarden",
  data() {
    seq += 1;
    return { C, PLOTS, uid: `garden${seq}` };
  },
  computed: {
    gridPath() {
      let d = "";
      for (let k = 1; k < 10; k += 1)
        d += `M ${2 + k * C} 2 V 302 M 2 ${2 + k * C} H 302 `;
      return d;
    },
  },
};
</script>

<style scoped lang="scss">
.garden {
  display: block;
  max-width: 100%;
  max-height: 100%;

  &__grid {
    fill: none;
    stroke: rgba(93, 64, 55, 0.35);
    stroke-width: 1.2;
  }

  &__plot {
    fill: none;
    stroke: #6d4c41;
    stroke-width: 3.5;
  }

  &__tag {
    fill: rgba(255, 255, 255, 0.9);
    stroke: #8d6e63;
    stroke-width: 1.5;
  }

  &__name {
    font-size: 14px;
    font-weight: 700;
    text-anchor: middle;
    fill: #4e342e;
  }

  &__ink {
    stroke: #4e342e;
    stroke-width: 1.5;
    stroke-linejoin: round;
  }
}
</style>

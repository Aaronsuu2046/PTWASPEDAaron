<template>
  <!-- 一個容器：裝滿的位置畫東西，空的位置畫虛線圈，數量清楚可數 -->
  <svg
    class="container-figure"
    viewBox="0 0 220 160"
    role="img"
    :aria-label="`裝了 ${count} 個，可以裝 ${capacity} 個`"
  >
    <!-- 容器外形 -->
    <g v-if="theme === 'fish'">
      <path
        d="M 30 30 Q 110 14 190 30 L 200 146 Q 110 156 20 146 Z"
        fill="#e1f5fe"
        stroke="#0288d1"
        stroke-width="4"
        stroke-linejoin="round"
      />
      <path
        d="M 88 26 Q 110 2 132 26"
        fill="none"
        stroke="#0288d1"
        stroke-width="4"
      />
    </g>
    <g v-else-if="theme === 'dumpling'">
      <rect
        x="10"
        y="24"
        width="200"
        height="126"
        rx="30"
        fill="#d7a86e"
        stroke="#8d6e63"
        stroke-width="4"
      />
      <rect
        x="22"
        y="36"
        width="176"
        height="102"
        rx="22"
        fill="#fff8e1"
        stroke="#bcaaa4"
        stroke-width="3"
      />
    </g>
    <g v-else-if="theme === 'egg'">
      <path
        d="M 14 50 H 206 L 188 148 H 32 Z"
        fill="#ffe0b2"
        stroke="#a1887f"
        stroke-width="4"
        stroke-linejoin="round"
      />
      <path
        d="M 40 50 Q 110 -6 180 50"
        fill="none"
        stroke="#a1887f"
        stroke-width="5"
      />
      <path d="M 24 102 H 196" stroke="#bcaaa4" stroke-width="3" />
    </g>
    <g v-else-if="theme === 'apple'">
      <rect
        x="8"
        y="40"
        width="204"
        height="110"
        rx="6"
        fill="#d7a86e"
        stroke="#8d6e63"
        stroke-width="4"
      />
      <path
        d="M 8 40 L 22 22 H 198 L 212 40"
        fill="#e8c39e"
        stroke="#8d6e63"
        stroke-width="4"
        stroke-linejoin="round"
      />
    </g>
    <g v-else>
      <ellipse
        cx="110"
        cy="86"
        rx="104"
        ry="70"
        fill="#ffffff"
        stroke="#90a4ae"
        stroke-width="4"
      />
      <ellipse
        cx="110"
        cy="86"
        rx="84"
        ry="54"
        fill="none"
        stroke="#cfd8dc"
        stroke-width="3"
      />
    </g>

    <!-- 每個位置 -->
    <g
      v-for="(pos, k) in slots"
      :key="k"
      :transform="`translate(${pos[0]} ${pos[1]})`"
    >
      <template v-if="k < count">
        <g v-if="theme === 'fish'">
          <ellipse
            rx="17"
            ry="9"
            fill="#ff8a65"
            stroke="#d84315"
            stroke-width="2"
          />
          <path
            d="M 15 0 L 26 -8 L 26 8 Z"
            fill="#ff8a65"
            stroke="#d84315"
            stroke-width="2"
            stroke-linejoin="round"
          />
          <circle cx="-9" cy="-2" r="2.2" fill="#3e2723" />
        </g>
        <g v-else-if="theme === 'dumpling'">
          <path
            d="M -16 6 Q -16 -14 0 -14 Q 16 -14 16 6 Z"
            fill="#fff3c4"
            stroke="#8d6e63"
            stroke-width="2.5"
          />
          <path
            d="M -8 -12 Q -6 -4 -4 -12 M 0 -14 Q 2 -5 4 -13 M 7 -11 Q 9 -4 10 -9"
            fill="none"
            stroke="#8d6e63"
            stroke-width="1.8"
          />
        </g>
        <g v-else-if="theme === 'egg'">
          <ellipse
            rx="13"
            ry="17"
            fill="#fffde7"
            stroke="#bcaaa4"
            stroke-width="2.5"
          />
        </g>
        <g v-else-if="theme === 'apple'">
          <circle r="14" fill="#e53935" stroke="#b71c1c" stroke-width="2" />
          <path
            d="M 0 -13 V -19"
            stroke="#5d4037"
            stroke-width="3"
            stroke-linecap="round"
          />
          <path d="M 1 -16 Q 9 -21 11 -14 Q 4 -12 1 -16 Z" fill="#66bb6a" />
        </g>
        <g v-else>
          <circle r="15" fill="#ffcc80" stroke="#bf6c00" stroke-width="2" />
          <circle cx="-5" cy="-4" r="2.4" fill="#5d4037" />
          <circle cx="5" cy="-1" r="2.4" fill="#5d4037" />
          <circle cx="-1" cy="6" r="2.4" fill="#5d4037" />
        </g>
      </template>
      <circle v-else r="13" class="container-figure__empty" />
    </g>
  </svg>
</template>

<script>
// 各容器裡位置的排法（中心點座標）
const rowsOf = (cols, rowYs, x0, x1) =>
  rowYs.flatMap((y, r) => {
    const n = cols[r];
    return Array.from({ length: n }, (_, k) => [
      n === 1 ? (x0 + x1) / 2 : x0 + ((x1 - x0) * k) / (n - 1),
      y,
    ]);
  });

const SLOTS = {
  fish: rowsOf([2, 2, 2], [56, 88, 120], 72, 142),
  dumpling: rowsOf([4, 4], [70, 112], 52, 168),
  egg: rowsOf([4, 3], [78, 124], 52, 168),
  apple: rowsOf([5, 5], [70, 116], 36, 184),
  cookie: rowsOf([3, 3, 3], [52, 86, 120], 70, 150),
};

// 情境容器圖：theme（fish 魚袋／dumpling 蒸餃籠／egg 雞蛋籃／apple 蘋果箱／cookie 餅乾盤）
// capacity 一個容器可以裝幾個，count 已經裝了幾個
export default {
  name: "ContainerFigure",
  props: {
    theme: { type: String, required: true },
    capacity: { type: Number, required: true },
    count: { type: Number, required: true },
  },
  computed: {
    slots() {
      return (SLOTS[this.theme] || SLOTS.cookie).slice(0, this.capacity);
    },
  },
};
</script>

<style scoped lang="scss">
.container-figure {
  display: block;
  width: 100%;
  height: 100%;

  &__empty {
    fill: rgba(255, 255, 255, 0.6);
    stroke: #90a4ae;
    stroke-width: 2.5;
    stroke-dasharray: 5 4;
  }
}
</style>

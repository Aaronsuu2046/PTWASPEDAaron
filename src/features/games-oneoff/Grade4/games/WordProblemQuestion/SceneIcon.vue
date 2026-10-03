<template>
  <!-- 情境圖的小圖示：以 (0,0) 為中心；前半是東西，後半是裝東西的容器；big 放大一點 -->
  <g :transform="`scale(${big ? 1.6 : 1})`" class="scene-icon">
    <!-- 水壺 -->
    <g v-if="name === 'bottle'">
      <rect
        x="-9"
        y="-12"
        width="18"
        height="28"
        rx="6"
        fill="#4fc3f7"
        stroke="#0277bd"
        stroke-width="2.5"
      />
      <rect x="-5" y="-18" width="10" height="7" rx="2" fill="#0277bd" />
      <rect x="-9" y="-2" width="18" height="6" fill="#b3e5fc" />
    </g>
    <!-- 月餅 -->
    <g v-else-if="name === 'mooncake'">
      <circle r="15" fill="#ffb74d" stroke="#e65100" stroke-width="2.5" />
      <circle r="6" fill="#ffe0b2" stroke="#e65100" stroke-width="1.5" />
      <g fill="#ffe0b2" stroke="#e65100" stroke-width="1.2">
        <circle cy="-10" r="3" />
        <circle cy="10" r="3" />
        <circle cx="-10" r="3" />
        <circle cx="10" r="3" />
      </g>
    </g>
    <!-- 蓮霧 -->
    <g v-else-if="name === 'waxapple'">
      <path
        d="M 0 -15 C 12 -15, 15 2, 12 12 C 8 18, -8 18, -12 12 C -15 2, -12 -15, 0 -15 Z"
        fill="#e53935"
        stroke="#b71c1c"
        stroke-width="2"
      />
      <path
        d="M -6 -8 Q -2 -12 2 -10"
        stroke="#ffcdd2"
        stroke-width="2.5"
        fill="none"
        stroke-linecap="round"
      />
      <path
        d="M 0 -15 V -20"
        stroke="#5d4037"
        stroke-width="2.5"
        stroke-linecap="round"
      />
    </g>
    <!-- 紅茶（茶壺） -->
    <g v-else-if="name === 'tea'">
      <path
        d="M -13 -8 H 11 L 9 14 H -11 Z"
        fill="#a1887f"
        stroke="#5d4037"
        stroke-width="2.5"
        stroke-linejoin="round"
      />
      <path d="M -13 -2 H 11 L 9 14 H -11 Z" fill="#bf360c" opacity="0.75" />
      <path
        d="M 11 -4 Q 19 0 11 8"
        fill="none"
        stroke="#5d4037"
        stroke-width="2.5"
      />
    </g>
    <!-- 錢幣 -->
    <g v-else-if="name === 'coin'">
      <circle r="14" fill="#ffd54f" stroke="#f9a825" stroke-width="3" />
      <text y="5" class="scene-icon__coin">元</text>
    </g>
    <!-- 餅乾 -->
    <g v-else-if="name === 'cookie'">
      <circle r="14" fill="#ffcc80" stroke="#bf6c00" stroke-width="2.5" />
      <circle cx="-5" cy="-4" r="2.5" fill="#5d4037" />
      <circle cx="5" cy="-2" r="2.5" fill="#5d4037" />
      <circle cx="-1" cy="6" r="2.5" fill="#5d4037" />
    </g>
    <!-- 果凍 -->
    <g v-else-if="name === 'jelly'">
      <path
        d="M -12 -4 H 12 L 9 14 H -9 Z"
        fill="#f48fb1"
        stroke="#c2185b"
        stroke-width="2.5"
        stroke-linejoin="round"
      />
      <rect
        x="-13"
        y="-9"
        width="26"
        height="5"
        rx="2"
        fill="#ffffff"
        stroke="#c2185b"
        stroke-width="2"
      />
    </g>
    <!-- 彈珠 -->
    <g v-else-if="name === 'marble'">
      <circle r="13" fill="#64b5f6" stroke="#1565c0" stroke-width="2.5" />
      <path
        d="M -8 2 Q 0 -6 8 2"
        stroke="#fff176"
        stroke-width="3"
        fill="none"
      />
      <circle cx="-4" cy="-6" r="3" fill="#ffffff" opacity="0.8" />
    </g>

    <!-- ===== 容器 ===== -->
    <!-- 紙箱 -->
    <g v-else-if="name === 'box'">
      <rect
        x="-20"
        y="-14"
        width="40"
        height="30"
        rx="3"
        fill="#d7a86e"
        stroke="#8d6e63"
        stroke-width="2.5"
      />
      <path
        d="M -20 -14 L -14 -22 H 14 L 20 -14"
        fill="#e8c39e"
        stroke="#8d6e63"
        stroke-width="2.5"
        stroke-linejoin="round"
      />
      <rect x="-4" y="-14" width="8" height="30" fill="#bcaaa4" />
    </g>
    <!-- 月餅禮盒 -->
    <g v-else-if="name === 'giftbox'">
      <rect
        x="-20"
        y="-12"
        width="40"
        height="28"
        rx="4"
        fill="#ef5350"
        stroke="#b71c1c"
        stroke-width="2.5"
      />
      <rect x="-3" y="-12" width="6" height="28" fill="#ffd54f" />
      <path
        d="M 0 -12 C -10 -24, -16 -12, 0 -12 C 10 -24, 16 -12, 0 -12"
        fill="#ffd54f"
        stroke="#f9a825"
        stroke-width="2"
      />
    </g>
    <!-- 茶瓶 -->
    <g v-else-if="name === 'teabottle'">
      <path
        d="M -6 -22 H 6 V -14 C 14 -10, 14 -6, 14 0 V 18 H -14 V 0 C -14 -6, -14 -10, -6 -14 Z"
        fill="#ffccbc"
        stroke="#bf360c"
        stroke-width="2.5"
        stroke-linejoin="round"
      />
      <rect x="-14" y="2" width="28" height="16" fill="#bf360c" opacity="0.7" />
      <rect x="-7" y="-26" width="14" height="6" rx="2" fill="#5d4037" />
    </g>
    <!-- 繩子一段 -->
    <g v-else-if="name === 'segment'">
      <path
        d="M -20 0 Q -10 -8 0 0 T 20 0"
        fill="none"
        stroke="#a1887f"
        stroke-width="7"
        stroke-linecap="round"
      />
    </g>
    <!-- 袋子 -->
    <g v-else-if="name === 'bag'">
      <path
        d="M -16 -10 H 16 L 13 18 H -13 Z"
        fill="#e1f5fe"
        stroke="#0288d1"
        stroke-width="2.5"
        stroke-linejoin="round"
      />
      <path
        d="M -7 -10 Q 0 -22 7 -10"
        fill="none"
        stroke="#0288d1"
        stroke-width="2.5"
      />
    </g>
    <!-- 彈珠台 -->
    <g v-else-if="name === 'pinball'">
      <rect
        x="-16"
        y="-24"
        width="32"
        height="44"
        rx="5"
        fill="#7e57c2"
        stroke="#4527a0"
        stroke-width="2.5"
      />
      <rect x="-11" y="-18" width="22" height="26" rx="3" fill="#ede7f6" />
      <circle cx="-4" cy="-10" r="3" fill="#ff7043" />
      <circle cx="5" cy="-3" r="3" fill="#29b6f6" />
      <circle cx="-3" cy="3" r="3" fill="#66bb6a" />
      <rect x="-6" y="12" width="12" height="4" rx="2" fill="#ffd54f" />
    </g>
    <!-- 原子筆 -->
    <g v-else-if="name === 'pen'">
      <g transform="rotate(-35)">
        <rect
          x="-4"
          y="-22"
          width="8"
          height="34"
          rx="3"
          fill="#42a5f5"
          stroke="#1565c0"
          stroke-width="2"
        />
        <path
          d="M -4 12 L 0 22 L 4 12 Z"
          fill="#ffe0b2"
          stroke="#1565c0"
          stroke-width="2"
          stroke-linejoin="round"
        />
        <rect x="-4" y="-22" width="8" height="8" fill="#1565c0" />
      </g>
    </g>
    <!-- 學生 -->
    <g v-else-if="name === 'student'">
      <circle cy="-12" r="8" fill="#ffe0b2" stroke="#8d6e63" stroke-width="2" />
      <path
        d="M -14 18 C -14 2, 14 2, 14 18 Z"
        fill="#81c784"
        stroke="#388e3c"
        stroke-width="2"
      />
    </g>
  </g>
</template>

<script>
// 情境圖用的小圖示（只畫圖，不放數字）
export default {
  name: "SceneIcon",
  props: {
    name: { type: String, required: true },
    big: { type: Boolean, default: false },
  },
};
</script>

<style scoped lang="scss">
.scene-icon__coin {
  font-size: 13px;
  font-weight: 700;
  text-anchor: middle;
  fill: #e65100;
}
</style>

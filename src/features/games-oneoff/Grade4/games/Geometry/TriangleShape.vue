<template>
  <!-- 三角形／非三角形題卡圖形（100×100），全部為重新繪製，不含文字提示 -->
  <svg class="tri-shape" viewBox="0 0 100 100">
    <g v-if="shape === 'setSquareA'">
      <path
        d="M12 88 L88 88 L12 12 Z M26 76 L60 76 L26 42 Z"
        fill="#ffcc80"
        fill-rule="evenodd"
        stroke="#e65100"
        stroke-width="3"
        stroke-linejoin="round"
      />
    </g>
    <g v-else-if="shape === 'flag'">
      <line
        x1="26"
        y1="10"
        x2="26"
        y2="92"
        stroke="#6d4c41"
        stroke-width="5"
        stroke-linecap="round"
      />
      <polygon
        points="29,14 86,32 29,50"
        fill="#ef5350"
        stroke="#b71c1c"
        stroke-width="3"
        stroke-linejoin="round"
      />
    </g>
    <g v-else-if="shape === 'warningSign'">
      <polygon
        points="50,10 92,86 8,86"
        fill="#ffeb3b"
        stroke="#d32f2f"
        stroke-width="7"
        stroke-linejoin="round"
      />
      <rect x="46" y="36" width="8" height="28" rx="3" fill="#333" />
      <circle cx="50" cy="73" r="5" fill="#333" />
    </g>
    <g v-else-if="shape === 'setSquareB'">
      <path
        d="M14 86 L90 86 L14 16 Z M28 74 L60 74 L28 45 Z"
        fill="#90caf9"
        fill-rule="evenodd"
        stroke="#1565c0"
        stroke-width="3"
        stroke-linejoin="round"
      />
    </g>
    <polygon
      v-else-if="shape === 'yellowAcute'"
      points="30,86 86,80 52,14"
      fill="#ffee58"
      stroke="#f9a825"
      stroke-width="4"
      stroke-linejoin="round"
    />
    <polygon
      v-else-if="shape === 'greenIsosceles'"
      points="50,12 86,88 14,88"
      fill="#81c784"
      stroke="#2e7d32"
      stroke-width="4"
      stroke-linejoin="round"
    />
    <polygon
      v-else-if="shape === 'blueRight'"
      points="16,88 84,88 16,20"
      fill="#64b5f6"
      stroke="#1565c0"
      stroke-width="4"
      stroke-linejoin="round"
    />
    <polygon
      v-else-if="shape === 'purpleScalene'"
      points="10,78 90,88 66,16"
      fill="#ba68c8"
      stroke="#6a1b9a"
      stroke-width="4"
      stroke-linejoin="round"
    />
    <polygon
      v-else-if="shape === 'orangeIsosceles'"
      points="50,26 92,80 8,80"
      fill="#ffb74d"
      stroke="#e65100"
      stroke-width="4"
      stroke-linejoin="round"
    />

    <!-- 不是三角形 -->
    <g v-else-if="shape === 'pizza'">
      <path
        d="M50 92 L14 22 A78 78 0 0 1 86 22 Z"
        fill="#ffe082"
        stroke="#e65100"
        stroke-width="3"
        stroke-linejoin="round"
      />
      <path
        d="M14 22 A78 78 0 0 1 86 22"
        fill="none"
        stroke="#a1887f"
        stroke-width="9"
        stroke-linecap="round"
      />
      <circle cx="42" cy="44" r="6" fill="#e53935" />
      <circle cx="58" cy="58" r="6" fill="#e53935" />
      <circle cx="50" cy="32" r="5" fill="#e53935" />
    </g>
    <g v-else-if="shape === 'fan'">
      <path
        d="M50 88 L10 34 A60 60 0 0 1 90 34 Z"
        fill="#f48fb1"
        stroke="#ad1457"
        stroke-width="3"
        stroke-linejoin="round"
      />
      <g stroke="#ad1457" stroke-width="2">
        <line x1="50" y1="88" x2="30" y2="20" />
        <line x1="50" y1="88" x2="50" y2="14" />
        <line x1="50" y1="88" x2="70" y2="20" />
      </g>
      <rect x="44" y="82" width="12" height="12" rx="3" fill="#6d4c41" />
    </g>
    <g v-else-if="shape === 'shell'">
      <path
        d="M50 90 C30 90 12 70 12 48 C12 24 30 10 50 10 C70 10 88 24 88 48 C88 70 70 90 50 90 Z"
        fill="#ffccbc"
        stroke="#d84315"
        stroke-width="3"
      />
      <g stroke="#d84315" stroke-width="2.5" fill="none">
        <path d="M50 88 L50 12" />
        <path d="M50 88 Q30 50 26 18" />
        <path d="M50 88 Q70 50 74 18" />
        <path d="M50 88 Q18 60 14 40" />
        <path d="M50 88 Q82 60 86 40" />
      </g>
    </g>
    <path
      v-else-if="shape === 'heart'"
      d="M50 88 C20 66 8 48 8 32 C8 18 18 10 30 10 C40 10 46 16 50 24 C54 16 60 10 70 10 C82 10 92 18 92 32 C92 48 80 66 50 88 Z"
      fill="#ef5350"
      stroke="#b71c1c"
      stroke-width="3"
    />
    <path
      v-else-if="shape === 'wavyTriangle'"
      d="M50 12 Q47.0 23.2 58.0 26.8 Q69.0 30.4 66.0 41.6 Q63.0 52.8 74.0 56.4 Q85.0 60.0 82.0 71.2 Q79.0 82.4 90.0 86.0 Q82.0 78.0 74.0 86.0 Q66.0 94.0 58.0 86.0 Q50.0 78.0 42.0 86.0 Q34.0 94.0 26.0 86.0 Q18.0 78.0 10.0 86.0 Q21.0 82.4 18.0 71.2 Q15.0 60.0 26.0 56.4 Q37.0 52.8 34.0 41.6 Q31.0 30.4 42.0 26.8 Q53.0 23.2 50.0 12.0 Z"
      fill="#4dd0e1"
      stroke="#00838f"
      stroke-width="3"
      stroke-linejoin="round"
    />
    <path
      v-else-if="shape === 'concaveHeart'"
      d="M10 18 Q30 34 50 18 Q70 34 90 18 L50 90 Z"
      fill="#ff8a65"
      stroke="#bf360c"
      stroke-width="3"
      stroke-linejoin="round"
    />
    <g v-else-if="shape === 'watermelon'">
      <path
        d="M50 90 L8 20 A82 82 0 0 1 92 20 Z"
        fill="#66bb6a"
        stroke="#2e7d32"
        stroke-width="3"
        stroke-linejoin="round"
      />
      <path d="M50 82 L16 25 A72 72 0 0 1 84 25 Z" fill="#ef5350" />
      <g fill="#212121">
        <ellipse cx="38" cy="42" rx="3" ry="5" />
        <ellipse cx="62" cy="42" rx="3" ry="5" />
        <ellipse cx="50" cy="58" rx="3" ry="5" />
        <ellipse cx="50" cy="32" rx="3" ry="5" />
      </g>
    </g>
  </svg>
</template>

<script>
export default {
  name: "TriangleShape",
  props: {
    shape: { type: String, required: true },
  },
};
</script>

<style scoped>
.tri-shape {
  width: 100%;
  height: 100%;
  display: block;
}
</style>

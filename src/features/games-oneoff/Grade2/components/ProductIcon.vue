<template>
  <!-- 二年級商品圖（自己畫的 SVG，可縮放）：玩具車、機器人、手錶、公仔、鉛筆盒 -->
  <svg viewBox="0 0 120 100" class="product" :aria-label="label" role="img">
    <g v-if="type === 'toycar'">
      <path
        d="M14 62 L24 40 Q28 34 36 34 H74 Q82 34 88 42 L98 54 Q108 56 108 64 V72 H14 Z"
        fill="#e53935"
      />
      <path d="M32 42 H54 V54 H26 Z M60 42 H78 L86 54 H60 Z" fill="#bbdefb" />
      <circle cx="36" cy="74" r="11" fill="#37474f" />
      <circle cx="36" cy="74" r="5" fill="#cfd8dc" />
      <circle cx="88" cy="74" r="11" fill="#37474f" />
      <circle cx="88" cy="74" r="5" fill="#cfd8dc" />
      <rect x="98" y="58" width="8" height="5" rx="2" fill="#ffee58" />
    </g>
    <g v-else-if="type === 'robot'">
      <line x1="60" y1="6" x2="60" y2="16" stroke="#546e7a" stroke-width="4" />
      <circle cx="60" cy="6" r="5" fill="#ff7043" />
      <rect x="38" y="16" width="44" height="30" rx="8" fill="#90a4ae" />
      <circle cx="50" cy="30" r="6" fill="#ffffff" />
      <circle cx="70" cy="30" r="6" fill="#ffffff" />
      <circle cx="50" cy="30" r="3" fill="#1e88e5" />
      <circle cx="70" cy="30" r="3" fill="#1e88e5" />
      <rect x="32" y="50" width="56" height="36" rx="8" fill="#42a5f5" />
      <rect x="48" y="58" width="24" height="12" rx="3" fill="#ffee58" />
      <rect x="18" y="54" width="12" height="26" rx="6" fill="#90a4ae" />
      <rect x="90" y="54" width="12" height="26" rx="6" fill="#90a4ae" />
      <rect x="40" y="86" width="14" height="10" rx="3" fill="#546e7a" />
      <rect x="66" y="86" width="14" height="10" rx="3" fill="#546e7a" />
    </g>
    <g v-else-if="type === 'watch'">
      <rect x="46" y="4" width="28" height="92" rx="10" fill="#8d6e63" />
      <circle cx="60" cy="50" r="28" fill="#ffca28" />
      <circle cx="60" cy="50" r="22" fill="#ffffff" />
      <line
        x1="60"
        y1="50"
        x2="60"
        y2="35"
        stroke="#37474f"
        stroke-width="3"
        stroke-linecap="round"
      />
      <line
        x1="60"
        y1="50"
        x2="71"
        y2="55"
        stroke="#e53935"
        stroke-width="3"
        stroke-linecap="round"
      />
      <circle cx="60" cy="50" r="2.5" fill="#37474f" />
      <rect x="86" y="46" width="6" height="8" rx="2" fill="#ffb300" />
    </g>
    <g v-else-if="type === 'figure'">
      <rect x="36" y="88" width="48" height="8" rx="3" fill="#7e57c2" />
      <rect x="44" y="52" width="32" height="36" rx="10" fill="#ec407a" />
      <circle cx="60" cy="32" r="22" fill="#ffe0b2" />
      <path
        d="M38 30 Q40 8 60 10 Q80 8 82 30 Q72 18 60 20 Q48 18 38 30 Z"
        fill="#5d4037"
      />
      <circle cx="52" cy="34" r="3" fill="#37474f" />
      <circle cx="68" cy="34" r="3" fill="#37474f" />
      <path
        d="M53 42 Q60 47 67 42"
        stroke="#d84315"
        stroke-width="2.5"
        fill="none"
        stroke-linecap="round"
      />
      <circle cx="47" cy="40" r="3" fill="#f48fb1" />
      <circle cx="73" cy="40" r="3" fill="#f48fb1" />
    </g>
    <g v-else>
      <rect x="10" y="30" width="100" height="44" rx="18" fill="#26a69a" />
      <line
        x1="18"
        y1="40"
        x2="102"
        y2="40"
        stroke="#004d40"
        stroke-width="3"
        stroke-dasharray="4 3"
      />
      <rect x="86" y="34" width="14" height="10" rx="3" fill="#ffca28" />
      <rect x="22" y="50" width="30" height="8" rx="4" fill="#ffee58" />
      <polygon points="52,50 60,54 52,58" fill="#ffcc80" />
      <circle cx="78" cy="58" r="7" fill="#ff8a65" />
      <circle cx="78" cy="58" r="3" fill="#ffffff" />
    </g>
  </svg>
</template>

<script>
const LABELS = {
  toycar: "玩具車",
  robot: "機器人",
  watch: "手錶",
  figure: "公仔",
  pencilcase: "鉛筆盒",
};

export default {
  name: "ProductIcon",
  props: {
    type: { type: String, required: true },
  },
  computed: {
    label() {
      return LABELS[this.type] || "";
    },
  },
};
</script>

<style scoped>
.product {
  width: 100%;
  height: 100%;
}
</style>

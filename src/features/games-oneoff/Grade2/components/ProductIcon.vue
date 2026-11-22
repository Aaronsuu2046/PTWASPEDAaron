<template>
  <!-- 二年級商品圖（自己畫的 SVG，可縮放）：玩具車、機器人、手錶、公仔、鉛筆盒、筆記本、水壺、玩偶、衣服 -->
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
    <g v-else-if="type === 'notebook'">
      <rect x="30" y="8" width="64" height="84" rx="6" fill="#42a5f5" />
      <rect x="30" y="8" width="12" height="84" rx="4" fill="#1e88e5" />
      <rect x="50" y="22" width="36" height="16" rx="3" fill="#ffffff" />
      <line x1="54" y1="30" x2="82" y2="30" stroke="#90caf9" stroke-width="3" />
      <g fill="#cfd8dc">
        <circle cx="30" cy="20" r="3.5" />
        <circle cx="30" cy="36" r="3.5" />
        <circle cx="30" cy="52" r="3.5" />
        <circle cx="30" cy="68" r="3.5" />
        <circle cx="30" cy="84" r="3.5" />
      </g>
      <path d="M78 92 V70 L84 76 L90 70 V92 Z" fill="#ffca28" />
    </g>
    <g v-else-if="type === 'bottle'">
      <rect x="50" y="4" width="20" height="12" rx="3" fill="#ef6c00" />
      <rect x="46" y="14" width="28" height="8" rx="3" fill="#ffa726" />
      <path
        d="M44 22 H76 Q84 22 84 32 V88 Q84 96 76 96 H44 Q36 96 36 88 V32 Q36 22 44 22 Z"
        fill="#4dd0e1"
      />
      <rect x="36" y="46" width="48" height="26" fill="#00acc1" />
      <path d="M58 52 Q64 60 58 66 Q52 60 58 52 Z" fill="#e0f7fa" />
      <rect x="42" y="28" width="6" height="58" rx="3" fill="#b2ebf2" />
    </g>
    <g v-else-if="type === 'doll'">
      <circle cx="40" cy="20" r="11" fill="#a1887f" />
      <circle cx="80" cy="20" r="11" fill="#a1887f" />
      <circle cx="40" cy="20" r="5" fill="#ffccbc" />
      <circle cx="80" cy="20" r="5" fill="#ffccbc" />
      <ellipse cx="60" cy="72" rx="26" ry="24" fill="#a1887f" />
      <ellipse cx="60" cy="76" rx="15" ry="14" fill="#d7ccc8" />
      <circle cx="60" cy="36" r="24" fill="#a1887f" />
      <ellipse cx="60" cy="44" rx="11" ry="8" fill="#d7ccc8" />
      <circle cx="51" cy="32" r="3" fill="#3e2723" />
      <circle cx="69" cy="32" r="3" fill="#3e2723" />
      <ellipse cx="60" cy="41" rx="4" ry="3" fill="#3e2723" />
      <path d="M50 58 L60 64 L70 58 L70 66 L60 62 L50 66 Z" fill="#e53935" />
      <ellipse cx="38" cy="90" rx="10" ry="7" fill="#8d6e63" />
      <ellipse cx="82" cy="90" rx="10" ry="7" fill="#8d6e63" />
    </g>
    <g v-else-if="type === 'clothes'">
      <path
        d="M42 10 L22 20 L8 44 L24 54 L32 42 V94 H88 V42 L96 54 L112 44 L98 20 L78 10 Q70 22 60 22 Q50 22 42 10 Z"
        fill="#ec407a"
      />
      <path
        d="M42 10 Q50 22 60 22 Q70 22 78 10"
        fill="none"
        stroke="#ad1457"
        stroke-width="3"
      />
      <rect
        x="32"
        y="60"
        width="56"
        height="10"
        fill="#ffffff"
        opacity="0.85"
      />
      <circle cx="60" cy="40" r="8" fill="#ffeb3b" />
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
  notebook: "筆記本",
  bottle: "水壺",
  doll: "玩偶",
  clothes: "衣服",
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

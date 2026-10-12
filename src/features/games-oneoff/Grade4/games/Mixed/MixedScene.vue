<template>
  <svg
    class="mixed-scene"
    viewBox="0 0 280 200"
    role="img"
    :aria-label="ariaLabel"
    font-family="sans-serif"
    font-weight="700"
  >
    <rect x="0" y="0" width="280" height="200" rx="18" fill="#f1f8ff" />

    <!-- 公車：原有 a 位，上車 b 位，下車 c 位 -->
    <g v-if="scene.type === 'bus'">
      <rect x="12" y="150" width="256" height="10" fill="#b0bec5" />
      <rect x="52" y="60" width="176" height="86" rx="16" fill="#ffca28" />
      <rect x="52" y="122" width="176" height="10" fill="#f57f17" />
      <rect
        v-for="k in 4"
        :key="`win-${k}`"
        :x="62 + (k - 1) * 40"
        y="72"
        width="32"
        height="34"
        rx="5"
        fill="#e3f2fd"
      />
      <circle
        v-for="k in 4"
        :key="`head-${k}`"
        :cx="78 + (k - 1) * 40"
        cy="88"
        r="8"
        fill="#8d6e63"
      />
      <circle cx="88" cy="148" r="14" fill="#37474f" />
      <circle cx="192" cy="148" r="14" fill="#37474f" />
      <text x="140" y="44" font-size="20" text-anchor="middle" fill="#0d47a1">
        車上原有 {{ scene.a }} 位
      </text>
      <text x="58" y="188" font-size="17" text-anchor="middle" fill="#2e7d32">
        ⬆ 上車 {{ scene.b }}
      </text>
      <text x="222" y="188" font-size="17" text-anchor="middle" fill="#c62828">
        下車 {{ scene.c }} ⬇
      </text>
    </g>

    <!-- 購物：100 元買貼紙 a 元、筆記本 b 元 -->
    <g v-else-if="scene.type === 'shop'">
      <rect x="20" y="20" width="88" height="48" rx="8" fill="#a5d6a7" />
      <text x="64" y="52" font-size="22" text-anchor="middle" fill="#1b5e20">
        {{ scene.total }} 元
      </text>
      <g transform="translate(36 92)">
        <rect width="80" height="64" rx="10" fill="#f8bbd0" />
        <text x="40" y="42" font-size="30" text-anchor="middle">⭐</text>
        <text x="40" y="92" font-size="18" text-anchor="middle" fill="#ad1457">
          貼紙 {{ scene.a }} 元
        </text>
      </g>
      <g transform="translate(160 80)">
        <rect width="72" height="88" rx="6" fill="#90caf9" />
        <rect x="8" y="0" width="6" height="88" fill="#1e88e5" />
        <line
          x1="24"
          y1="28"
          x2="62"
          y2="28"
          stroke="#e3f2fd"
          stroke-width="4"
        />
        <line
          x1="24"
          y1="44"
          x2="62"
          y2="44"
          stroke="#e3f2fd"
          stroke-width="4"
        />
        <text x="36" y="110" font-size="18" text-anchor="middle" fill="#0d47a1">
          筆記本 {{ scene.b }} 元
        </text>
      </g>
      <text x="200" y="52" font-size="22" text-anchor="middle" fill="#e65100">
        剩多少元？
      </text>
    </g>

    <!-- 積木：共 total 塊，城堡用 a 塊、消防車用 b 塊 -->
    <g v-else-if="scene.type === 'blocks'">
      <text x="140" y="34" font-size="20" text-anchor="middle" fill="#0d47a1">
        積木共 {{ scene.total }} 塊
      </text>
      <g transform="translate(26 58)">
        <rect x="0" y="40" width="96" height="60" fill="#ef9a9a" />
        <rect x="0" y="22" width="22" height="22" fill="#e57373" />
        <rect x="37" y="22" width="22" height="22" fill="#e57373" />
        <rect x="74" y="22" width="22" height="22" fill="#e57373" />
        <rect x="36" y="66" width="24" height="34" rx="12" fill="#6d4c41" />
        <text x="48" y="128" font-size="17" text-anchor="middle" fill="#b71c1c">
          城堡 {{ scene.a }} 塊
        </text>
      </g>
      <g transform="translate(150 78)">
        <rect x="0" y="20" width="104" height="44" rx="8" fill="#e53935" />
        <rect x="64" y="0" width="40" height="30" rx="6" fill="#c62828" />
        <rect x="70" y="6" width="26" height="16" rx="3" fill="#e3f2fd" />
        <line
          x1="6"
          y1="12"
          x2="58"
          y2="12"
          stroke="#ffd54f"
          stroke-width="5"
        />
        <circle cx="24" cy="66" r="11" fill="#37474f" />
        <circle cx="82" cy="66" r="11" fill="#37474f" />
        <text x="52" y="108" font-size="17" text-anchor="middle" fill="#b71c1c">
          消防車 {{ scene.b }} 塊
        </text>
      </g>
    </g>

    <!-- 甜甜圈：巧克力 a 顆，草莓比巧克力少 b 顆 -->
    <g v-else-if="scene.type === 'donut'">
      <g v-for="(d, k) in DONUTS" :key="`donut-${k}`">
        <circle :cx="d.x" cy="86" r="34" fill="#ffcc80" />
        <circle :cx="d.x" cy="86" r="28" :fill="d.icing" />
        <circle :cx="d.x" cy="86" r="11" fill="#f1f8ff" />
        <text
          :x="d.x"
          y="150"
          font-size="18"
          text-anchor="middle"
          :fill="d.text"
        >
          {{ d.label }}
        </text>
        <text
          :x="d.x"
          y="176"
          font-size="18"
          text-anchor="middle"
          :fill="d.text"
        >
          {{ k === 0 ? `${scene.a} 顆` : `少 ${scene.b} 顆` }}
        </text>
      </g>
      <text x="140" y="34" font-size="20" text-anchor="middle" fill="#0d47a1">
        共做幾顆？
      </text>
    </g>

    <!-- 紅包：哥哥 a 元，弟弟比哥哥少 b 元 -->
    <g v-else-if="scene.type === 'redpacket'">
      <g v-for="(r, k) in PACKETS" :key="`packet-${k}`">
        <rect :x="r.x" y="46" width="66" height="94" rx="8" fill="#e53935" />
        <path
          :d="`M${r.x} 66 L${r.x + 33} 88 L${r.x + 66} 66`"
          fill="none"
          stroke="#b71c1c"
          stroke-width="4"
        />
        <circle :cx="r.x + 33" cy="92" r="12" fill="#ffd54f" />
        <text
          :x="r.x + 33"
          y="166"
          font-size="18"
          text-anchor="middle"
          fill="#4e342e"
        >
          {{ r.label }}
        </text>
        <text
          :x="r.x + 33"
          y="190"
          font-size="17"
          text-anchor="middle"
          :fill="k === 0 ? '#c62828' : '#6a1b9a'"
        >
          {{ k === 0 ? `${scene.a} 元` : `少 ${scene.b} 元` }}
        </text>
      </g>
      <text x="140" y="30" font-size="20" text-anchor="middle" fill="#0d47a1">
        兩人共多少元？
      </text>
    </g>
  </svg>
</template>

<script>
const DONUTS = [
  { x: 84, icing: "#6d4c41", label: "巧克力", text: "#4e342e" },
  { x: 196, icing: "#f48fb1", label: "草莓", text: "#ad1457" },
];
const PACKETS = [
  { x: 50, label: "哥哥" },
  { x: 164, label: "弟弟" },
];

// 併式應用題情境圖：scene { type: bus|shop|blocks|donut|redpacket, a, b, c?, total? }
export default {
  name: "MixedScene",
  props: {
    scene: { type: Object, required: true },
  },
  data() {
    return { DONUTS, PACKETS };
  },
  computed: {
    ariaLabel() {
      return {
        bus: "公車乘客上下車",
        shop: "買貼紙和筆記本",
        blocks: "用積木蓋城堡和消防車",
        donut: "巧克力和草莓甜甜圈",
        redpacket: "哥哥和弟弟的紅包",
      }[this.scene.type];
    },
  },
};
</script>

<style scoped>
.mixed-scene {
  display: block;
}
</style>

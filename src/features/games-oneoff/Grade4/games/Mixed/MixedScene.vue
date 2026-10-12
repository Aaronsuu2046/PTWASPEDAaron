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

    <!-- 奇異果：每盒 a 個，買 b 盒共 c 元 -->
    <g v-else-if="scene.type === 'kiwi'">
      <g
        v-for="k in Math.min(scene.b, 4)"
        :key="`box-${k}`"
        :transform="`translate(${22 + (k - 1) * 62} 46)`"
      >
        <rect
          width="54"
          height="42"
          rx="6"
          fill="#d7ccc8"
          stroke="#8d6e63"
          stroke-width="3"
        />
        <circle cx="15" cy="16" r="9" fill="#8d6e63" />
        <circle cx="39" cy="16" r="9" fill="#8d6e63" />
        <circle cx="15" cy="16" r="5" fill="#aed581" />
        <circle cx="39" cy="16" r="5" fill="#aed581" />
      </g>
      <text v-if="scene.b > 4" x="268" y="74" font-size="22" fill="#5d4037">
        …
      </text>
      <text x="140" y="30" font-size="18" text-anchor="middle" fill="#0d47a1">
        每盒 {{ scene.a }} 個，買 {{ scene.b }} 盒
      </text>
      <rect x="70" y="112" width="140" height="40" rx="10" fill="#a5d6a7" />
      <text x="140" y="139" font-size="20" text-anchor="middle" fill="#1b5e20">
        共 {{ scene.c }} 元
      </text>
      <text x="140" y="184" font-size="18" text-anchor="middle" fill="#e65100">
        平均每個多少元？
      </text>
    </g>

    <!-- 繩子：紅繩 a 公尺，綠繩是紅繩 b 倍，黃繩是綠繩 c 倍 -->
    <g v-else-if="scene.type === 'rope'">
      <g v-for="(r, k) in ROPES" :key="`rope-${k}`">
        <text x="16" :y="r.y + 6" font-size="17" :fill="r.text">
          {{ r.label }}
        </text>
        <line
          x1="66"
          :y1="r.y"
          :x2="66 + r.len"
          :y2="r.y"
          :stroke="r.color"
          stroke-width="9"
          stroke-linecap="round"
        />
        <text x="66" :y="r.y + 26" font-size="16" :fill="r.text">
          {{ ropeText(k) }}
        </text>
      </g>
    </g>

    <!-- 旗子：a 位學生每 b 人一組，c 隻旗子平分給各組 -->
    <g v-else-if="scene.type === 'flags'">
      <text x="140" y="30" font-size="18" text-anchor="middle" fill="#0d47a1">
        {{ scene.a }} 位學生，每 {{ scene.b }} 人一組
      </text>
      <g
        v-for="k in 4"
        :key="`grp-${k}`"
        :transform="`translate(${30 + (k - 1) * 58} 50)`"
      >
        <circle cx="10" cy="12" r="8" fill="#ffcc80" />
        <circle cx="28" cy="12" r="8" fill="#ffcc80" />
        <rect x="2" y="22" width="34" height="22" rx="8" fill="#64b5f6" />
      </g>
      <text x="262" y="80" font-size="22" fill="#5d4037">…</text>
      <g transform="translate(88 112)">
        <line x1="6" y1="0" x2="6" y2="44" stroke="#6d4c41" stroke-width="4" />
        <path d="M8 2 h26 l-8 9 l8 9 h-26 z" fill="#e53935" />
        <line
          x1="36"
          y1="0"
          x2="36"
          y2="44"
          stroke="#6d4c41"
          stroke-width="4"
        />
        <path d="M38 2 h26 l-8 9 l8 9 h-26 z" fill="#fdd835" />
      </g>
      <text x="200" y="140" font-size="18" text-anchor="middle" fill="#c62828">
        旗子 {{ scene.c }} 隻
      </text>
      <text x="140" y="188" font-size="18" text-anchor="middle" fill="#e65100">
        平分給各組，一組幾隻？
      </text>
    </g>

    <!-- 西瓜：每公斤 a 元，b 人合買 c 公斤 -->
    <g v-else-if="scene.type === 'watermelon'">
      <ellipse cx="86" cy="94" rx="58" ry="44" fill="#43a047" />
      <path
        v-for="k in 4"
        :key="`stripe-${k}`"
        :d="`M${44 + k * 16} 54 q-8 40 0 80`"
        stroke="#1b5e20"
        stroke-width="5"
        fill="none"
      />
      <text x="86" y="164" font-size="17" text-anchor="middle" fill="#1b5e20">
        每公斤 {{ scene.a }} 元
      </text>
      <text x="212" y="76" font-size="18" text-anchor="middle" fill="#0d47a1">
        {{ scene.b }} 人合買
      </text>
      <text x="212" y="106" font-size="18" text-anchor="middle" fill="#0d47a1">
        {{ scene.c }} 公斤
      </text>
      <circle
        v-for="k in Math.min(scene.b, 6)"
        :key="`man-${k}`"
        :cx="166 + (k - 1) * 18"
        cy="134"
        r="7"
        fill="#ffb74d"
      />
      <text x="140" y="192" font-size="18" text-anchor="middle" fill="#e65100">
        平均每人多少元？
      </text>
    </g>

    <!-- 雞蛋糕換起司燒：每個 a 元買 b 個，改買每個 c 元 -->
    <g v-else-if="scene.type === 'cake'">
      <g transform="translate(26 40)">
        <ellipse
          v-for="k in 3"
          :key="`egg-${k}`"
          :cx="18 + (k - 1) * 30"
          cy="30"
          rx="14"
          ry="18"
          fill="#ffca28"
          stroke="#f57f17"
          stroke-width="3"
        />
        <text x="48" y="78" font-size="17" text-anchor="middle" fill="#e65100">
          雞蛋糕
        </text>
        <text x="48" y="102" font-size="16" text-anchor="middle" fill="#4e342e">
          每個 {{ scene.a }} 元
        </text>
        <text x="48" y="124" font-size="16" text-anchor="middle" fill="#4e342e">
          買 {{ scene.b }} 個
        </text>
      </g>
      <text x="140" y="80" font-size="30" text-anchor="middle" fill="#7e57c2">
        ➜
      </text>
      <g transform="translate(176 40)">
        <circle
          v-for="k in 2"
          :key="`cheese-${k}`"
          :cx="22 + (k - 1) * 36"
          cy="30"
          r="17"
          fill="#fff59d"
          stroke="#fbc02d"
          stroke-width="3"
        />
        <text x="40" y="78" font-size="17" text-anchor="middle" fill="#f57f17">
          起司燒
        </text>
        <text x="40" y="102" font-size="16" text-anchor="middle" fill="#4e342e">
          每個 {{ scene.c }} 元
        </text>
        <text x="40" y="124" font-size="16" text-anchor="middle" fill="#e65100">
          可買幾個？
        </text>
      </g>
      <text x="140" y="190" font-size="17" text-anchor="middle" fill="#0d47a1">
        用一樣多的錢
      </text>
    </g>

    <!-- 筆記本 a 元、貼紙 b 元，買一本筆記本和 c 張貼紙 -->
    <g v-else-if="scene.type === 'stationery'">
      <g transform="translate(30 40)">
        <rect width="70" height="90" rx="6" fill="#90caf9" />
        <rect x="8" width="6" height="90" fill="#1e88e5" />
        <line
          x1="24"
          y1="30"
          x2="60"
          y2="30"
          stroke="#e3f2fd"
          stroke-width="4"
        />
        <line
          x1="24"
          y1="46"
          x2="60"
          y2="46"
          stroke="#e3f2fd"
          stroke-width="4"
        />
        <text x="35" y="118" font-size="16" text-anchor="middle" fill="#0d47a1">
          筆記本 {{ scene.a }} 元
        </text>
      </g>
      <text x="124" y="92" font-size="28" fill="#e65100">＋</text>
      <g transform="translate(160 44)">
        <rect
          v-for="k in 3"
          :key="`stk-${k}`"
          :x="(k - 1) * 30"
          :y="(k - 1) * 8"
          width="44"
          height="44"
          rx="8"
          fill="#f8bbd0"
          stroke="#ec407a"
          stroke-width="2"
        />
        <text x="82" y="54" font-size="26" text-anchor="middle">⭐</text>
        <text x="54" y="114" font-size="16" text-anchor="middle" fill="#ad1457">
          貼紙一張 {{ scene.b }} 元
        </text>
      </g>
      <text x="140" y="186" font-size="16" text-anchor="middle" fill="#e65100">
        買 1 本筆記本和 {{ scene.c }} 張貼紙，共多少元？
      </text>
    </g>

    <!-- 存錢：商品 a 元，每期存 b 元，存 c 期 -->
    <g v-else-if="scene.type === 'saving'">
      <rect
        x="160"
        y="36"
        width="96"
        height="70"
        rx="12"
        fill="#fff9c4"
        stroke="#fbc02d"
        stroke-width="3"
      />
      <text x="208" y="68" font-size="26" text-anchor="middle">🎁</text>
      <text x="208" y="96" font-size="16" text-anchor="middle" fill="#e65100">
        {{ scene.a }} 元
      </text>
      <g transform="translate(28 40)">
        <ellipse cx="50" cy="40" rx="46" ry="34" fill="#f48fb1" />
        <circle cx="86" cy="32" r="12" fill="#f06292" />
        <rect x="38" y="4" width="24" height="6" rx="3" fill="#ad1457" />
        <rect x="18" y="66" width="12" height="14" rx="3" fill="#f06292" />
        <rect x="68" y="66" width="12" height="14" rx="3" fill="#f06292" />
        <circle cx="70" cy="30" r="3" fill="#4e342e" />
      </g>
      <text x="78" y="148" font-size="16" text-anchor="middle" fill="#ad1457">
        每期存 {{ scene.b }} 元
      </text>
      <text x="78" y="170" font-size="16" text-anchor="middle" fill="#ad1457">
        存了 {{ scene.c }} 期
      </text>
      <text x="208" y="160" font-size="18" text-anchor="middle" fill="#e65100">
        還差多少元？
      </text>
    </g>

    <!-- 蝴蝶結：每個用 a 公分，原有 b 公分，做 c 個 -->
    <g v-else-if="scene.type === 'bow'">
      <text x="140" y="30" font-size="18" text-anchor="middle" fill="#0d47a1">
        緞帶原有 {{ scene.b }} 公分
      </text>
      <rect x="24" y="44" width="232" height="14" rx="7" fill="#f48fb1" />
      <g
        v-for="k in Math.min(scene.c, 4)"
        :key="`bow-${k}`"
        :transform="`translate(${46 + (k - 1) * 56} 100)`"
      >
        <path d="M0 0 L-20 -14 L-20 14 Z" fill="#ec407a" />
        <path d="M0 0 L20 -14 L20 14 Z" fill="#ec407a" />
        <circle r="6" fill="#ad1457" />
      </g>
      <text v-if="scene.c > 4" x="262" y="106" font-size="22" fill="#ad1457">
        …
      </text>
      <text x="140" y="150" font-size="17" text-anchor="middle" fill="#ad1457">
        每個用 {{ scene.a }} 公分，做 {{ scene.c }} 個
      </text>
      <text x="140" y="186" font-size="18" text-anchor="middle" fill="#e65100">
        還剩多少公分？
      </text>
    </g>

    <!-- 奇異果銷量：每盒 a 顆，上午 b 盒、下午 c 盒 -->
    <g v-else-if="scene.type === 'kiwisale'">
      <text x="140" y="30" font-size="18" text-anchor="middle" fill="#0d47a1">
        每盒 {{ scene.a }} 顆奇異果
      </text>
      <g
        v-for="(part, k) in [
          ['上午', scene.b, '#fff3e0'],
          ['下午', scene.c, '#e3f2fd'],
        ]"
        :key="`half-${k}`"
        :transform="`translate(${22 + k * 126} 44)`"
      >
        <rect width="110" height="108" rx="12" :fill="part[2]" />
        <text x="55" y="26" font-size="18" text-anchor="middle" fill="#4e342e">
          {{ part[0] }}
        </text>
        <rect
          x="22"
          y="38"
          width="66"
          height="34"
          rx="6"
          fill="#d7ccc8"
          stroke="#8d6e63"
          stroke-width="3"
        />
        <circle cx="44" cy="55" r="9" fill="#8d6e63" />
        <circle cx="66" cy="55" r="9" fill="#8d6e63" />
        <text x="55" y="96" font-size="17" text-anchor="middle" fill="#e65100">
          賣 {{ part[1] }} 盒
        </text>
      </g>
      <text x="140" y="186" font-size="18" text-anchor="middle" fill="#e65100">
        一共賣出幾顆？
      </text>
    </g>

    <!-- 衣服價差：上衣 a 元、背心 b 元，各買 c 件 -->
    <g v-else-if="scene.type === 'clothes'">
      <g transform="translate(40 40)">
        <path
          d="M20 0 L0 14 L10 30 L20 24 V84 H70 V24 L80 30 L90 14 L70 0 Q45 14 20 0 Z"
          fill="#4fc3f7"
        />
        <text x="45" y="112" font-size="16" text-anchor="middle" fill="#01579b">
          上衣 {{ scene.a }} 元
        </text>
      </g>
      <g transform="translate(160 40)">
        <path d="M22 0 L10 6 V84 H80 V6 L68 0 Q45 22 22 0 Z" fill="#ffb74d" />
        <text x="45" y="112" font-size="16" text-anchor="middle" fill="#e65100">
          背心 {{ scene.b }} 元
        </text>
      </g>
      <text x="140" y="186" font-size="17" text-anchor="middle" fill="#c62828">
        {{ scene.c }} 件上衣比 {{ scene.c }} 件背心貴多少元？
      </text>
    </g>
  </svg>
</template>

<script>
const DONUTS = [
  { x: 84, icing: "#6d4c41", label: "巧克力", text: "#4e342e" },
  { x: 196, icing: "#f48fb1", label: "草莓", text: "#ad1457" },
];
const ROPES = [
  { y: 30, len: 50, color: "#e53935", text: "#c62828", label: "紅繩" },
  { y: 90, len: 100, color: "#43a047", text: "#2e7d32", label: "綠繩" },
  { y: 150, len: 190, color: "#fdd835", text: "#f57f17", label: "黃繩" },
];
const PACKETS = [
  { x: 50, label: "哥哥" },
  { x: 164, label: "弟弟" },
];

// 併式應用題情境圖：scene { type, a, b, c?, total? }
// type：bus|shop|blocks|donut|redpacket（加減）、kiwi|rope|flags|watermelon|cake（乘除）、
// stationery|saving|bow|kiwisale|clothes（加減與乘）
export default {
  name: "MixedScene",
  props: {
    scene: { type: Object, required: true },
  },
  data() {
    return { DONUTS, PACKETS, ROPES };
  },
  computed: {
    ariaLabel() {
      return {
        bus: "公車乘客上下車",
        shop: "買貼紙和筆記本",
        blocks: "用積木蓋城堡和消防車",
        donut: "巧克力和草莓甜甜圈",
        redpacket: "哥哥和弟弟的紅包",
        kiwi: "一盒一盒的奇異果",
        rope: "紅繩、綠繩和黃繩",
        flags: "學生分組和旗子",
        watermelon: "合買西瓜",
        cake: "雞蛋糕和起司燒",
        stationery: "筆記本和貼紙",
        saving: "存錢買禮物",
        bow: "用緞帶做蝴蝶結",
        kiwisale: "上午和下午賣出的奇異果",
        clothes: "上衣和背心",
      }[this.scene.type];
    },
  },
  methods: {
    ropeText(k) {
      const { a, b, c } = this.scene;
      return [`${a} 公尺`, `是紅繩的 ${b} 倍`, `是綠繩的 ${c} 倍，長多少？`][k];
    },
  },
};
</script>

<style scoped>
.mixed-scene {
  display: block;
}
</style>

<template>
  <!-- 分數應用題情境圖（由上往下）：原有 a ↓（動作）b ↓ 結果 ？；只放題目給的數，不出現答案和運算符號 -->
  <svg
    class="fraction-scene"
    viewBox="0 0 200 344"
    role="img"
    :aria-label="label"
  >
    <!-- 上：原有 -->
    <rect x="4" y="4" width="192" height="100" rx="16" class="panel" />
    <text x="100" y="26" class="caption">{{ scene.start }}</text>
    <g transform="translate(54 66)">
      <g :transform="`scale(${many(a) ? 0.72 : 0.62})`">
        <use :href="`#${uid}-${scene.item}`" />
      </g>
      <g v-if="many(a)" transform="translate(12 6) scale(0.6)">
        <use :href="`#${uid}-${scene.item}`" />
      </g>
    </g>
    <g transform="translate(138 64)">
      <g v-for="(p, k) in parts(a)" :key="`a${k}`">
        <text v-if="p.t" :x="p.x" y="8" class="num">{{ p.t }}</text>
        <template v-else>
          <text :x="p.x" y="-4" class="num num--small">{{ p.n }}</text>
          <line :x1="p.x - 13" :x2="p.x + 13" y1="1" y2="1" class="bar" />
          <text :x="p.x" y="20" class="num num--small">{{ p.d }}</text>
        </template>
      </g>
      <text :x="unitX(a)" y="8" class="unit">{{ unit }}</text>
    </g>

    <path d="M 100 106 v 12 M 92 112 l 8 8 l 8 -8" class="arrow" />

    <!-- 中：倒進／用掉／吃掉／再買 -->
    <rect
      x="4"
      y="122"
      width="192"
      height="100"
      rx="16"
      class="panel"
      :class="scene.mode === 'sub' ? 'panel--out' : 'panel--in'"
    />
    <text x="100" y="144" class="caption caption--verb">{{ scene.verb }}</text>
    <g transform="translate(50 186) scale(0.55)">
      <use :href="`#${uid}-${scene.item}`" />
    </g>
    <path
      v-if="scene.mode === 'sub'"
      d="M 70 180 q 14 -6 18 -22 M 82 160 l 6 -3 l 3 7"
      class="arrow arrow--out"
    />
    <path
      v-else
      d="M 88 158 q -2 16 -18 22 M 70 172 l 0 8 l 8 1"
      class="arrow arrow--in"
    />
    <g transform="translate(138 182)">
      <g v-for="(p, k) in parts(b)" :key="`b${k}`">
        <text v-if="p.t" :x="p.x" y="8" class="num">{{ p.t }}</text>
        <template v-else>
          <text :x="p.x" y="-4" class="num num--small">{{ p.n }}</text>
          <line :x1="p.x - 13" :x2="p.x + 13" y1="1" y2="1" class="bar" />
          <text :x="p.x" y="20" class="num num--small">{{ p.d }}</text>
        </template>
      </g>
      <text :x="unitX(b)" y="8" class="unit">{{ unit }}</text>
    </g>

    <path d="M 100 224 v 12 M 92 230 l 8 8 l 8 -8" class="arrow" />

    <!-- 下：結果是多少？ -->
    <rect x="4" y="240" width="192" height="100" rx="16" class="panel" />
    <text x="100" y="262" class="caption">{{ scene.result }}</text>
    <rect x="62" y="272" width="64" height="58" rx="12" class="ask" />
    <text x="94" y="316" class="ask__mark">？</text>
    <text x="134" y="308" class="unit">{{ unit }}</text>

    <defs>
      <!-- 果汁：一壺橘子汁 -->
      <g :id="`${uid}-juice`">
        <path
          d="M -24 -30 h 40 l 4 10 v 44 q 0 10 -10 10 h -28 q -10 0 -10 -10 v -44 z"
          class="glass"
        />
        <path
          d="M -24 -8 h 44 v 32 q 0 10 -10 10 h -28 q -10 0 -10 -10 z"
          fill="#ffa726"
        />
        <path
          d="M 20 -16 q 18 0 18 18 q 0 16 -18 16"
          class="line"
          fill="none"
        />
        <circle cx="-8" cy="6" r="5" fill="#ffe0b2" />
      </g>
      <!-- 牛奶：牛奶盒 -->
      <g :id="`${uid}-milk`">
        <path d="M -20 -18 l 8 -16 h 24 l 8 16 z" fill="#e3f2fd" class="line" />
        <rect
          x="-20"
          y="-18"
          width="40"
          height="52"
          fill="#ffffff"
          class="line"
        />
        <rect x="-20" y="-2" width="40" height="18" fill="#42a5f5" />
        <text x="0" y="12" class="tag">牛奶</text>
      </g>
      <!-- 麵粉：一袋麵粉 -->
      <g :id="`${uid}-flour`">
        <path
          d="M -24 -26 q 24 -12 48 0 l 4 52 q -28 10 -56 0 z"
          fill="#fff8e1"
          class="line"
        />
        <path
          d="M -16 -32 l 4 8 l 4 -8 l 4 8 l 4 -8 l 4 8 l 4 -8"
          class="line"
          fill="none"
        />
        <text x="0" y="10" class="tag tag--dark">麵粉</text>
      </g>
      <!-- 綠豆：一碗綠豆 -->
      <g :id="`${uid}-bean`">
        <g fill="#66bb6a" stroke="#2e7d32" stroke-width="1.5">
          <ellipse cx="-14" cy="-6" rx="7" ry="5" />
          <ellipse cx="0" cy="-10" rx="7" ry="5" />
          <ellipse cx="14" cy="-6" rx="7" ry="5" />
          <ellipse cx="-6" cy="-1" rx="7" ry="5" />
          <ellipse cx="8" cy="-1" rx="7" ry="5" />
        </g>
        <path
          d="M -32 0 h 64 q -4 32 -32 32 q -28 0 -32 -32 z"
          fill="#ffcc80"
          class="line"
        />
      </g>
      <!-- 吐司：一條吐司 -->
      <g :id="`${uid}-toast`">
        <path
          d="M -34 -4 q -8 -22 12 -24 q 14 -10 28 0 q 20 2 12 24 v 26 h -52 z"
          fill="#ffcc80"
          class="line"
        />
        <path d="M -16 -26 v 48 M 0 -30 v 52 M 16 -26 v 48" class="line" />
      </g>
      <!-- 巧克力：一條巧克力 -->
      <g :id="`${uid}-chocolate`">
        <rect
          x="-34"
          y="-20"
          width="68"
          height="40"
          rx="5"
          fill="#795548"
          class="line"
        />
        <path
          d="M -17 -20 v 40 M 0 -20 v 40 M 17 -20 v 40 M -34 0 h 68"
          stroke="#4e342e"
          stroke-width="2"
        />
        <path
          d="M 10 -20 h 24 v 40 h -24 l 4 -10 l -4 -10 l 4 -10 z"
          fill="#e53935"
        />
      </g>
      <!-- 糖果：一盒糖果 -->
      <g :id="`${uid}-candy`">
        <rect
          x="-34"
          y="-8"
          width="68"
          height="34"
          rx="6"
          fill="#f48fb1"
          class="line"
        />
        <circle cx="-16" cy="-10" r="9" fill="#ffee58" class="line" />
        <circle cx="2" cy="-12" r="9" fill="#4fc3f7" class="line" />
        <circle cx="20" cy="-10" r="9" fill="#aed581" class="line" />
        <rect x="-34" y="-8" width="68" height="8" fill="#ec407a" />
      </g>
      <!-- 蘋果：一盒蘋果 -->
      <g :id="`${uid}-apple`">
        <circle cx="-16" cy="-10" r="11" fill="#e53935" class="line" />
        <circle cx="4" cy="-12" r="11" fill="#ef5350" class="line" />
        <circle cx="22" cy="-10" r="10" fill="#e53935" class="line" />
        <path d="M 4 -22 q 2 -8 8 -10" class="line" fill="none" />
        <rect
          x="-34"
          y="-4"
          width="68"
          height="30"
          rx="4"
          fill="#bcaaa4"
          class="line"
        />
        <path d="M -34 8 h 68" stroke="#8d6e63" stroke-width="2" />
      </g>
      <!-- 茶葉：一包茶葉 -->
      <g :id="`${uid}-tea`">
        <path d="M -24 -30 h 48 l 4 60 h -56 z" fill="#a5d6a7" class="line" />
        <rect x="-24" y="-30" width="48" height="8" fill="#2e7d32" />
        <path
          d="M -10 14 q 0 -22 20 -26 q 2 22 -20 26 z"
          fill="#43a047"
          class="line"
        />
        <path
          d="M -10 14 q 8 -10 16 -20"
          stroke="#1b5e20"
          stroke-width="2"
          fill="none"
        />
      </g>
    </defs>
  </svg>
</template>

<script>
let seq = 0;

// scene { item, start, verb, result, mode: "add" | "sub" }；a、b 是題目的數 { kind: "int", v } 或 { kind: "frac", w, n, d }
export default {
  name: "FractionScene",
  props: {
    scene: { type: Object, required: true },
    a: { type: Object, required: true },
    b: { type: Object, required: true },
    unit: { type: String, required: true },
  },
  data() {
    seq += 1;
    return { uid: `fscene${seq}` };
  },
  computed: {
    label() {
      const say = (x) =>
        x.kind === "int"
          ? `${x.v}`
          : `${x.w ? `${x.w} 又 ` : ""}${x.d} 分之 ${x.n}`;
      return `${this.scene.start} ${say(this.a)} ${this.unit}，${this.scene.verb} ${say(this.b)} ${this.unit}，${this.scene.result}多少${this.unit}？`;
    },
  },
  methods: {
    // 大於 1 的量多畫一個，讓圖看起來「不只一個」
    many(x) {
      return x.kind === "int" ? x.v > 1 : x.w > 0 || x.n > x.d;
    },
    // 數字排版：整數（可有可無）＋直式分數，整組置中
    parts(x) {
      if (x.kind === "int") return [{ t: String(x.v), x: -10 }];
      const ww = x.w ? String(x.w).length * 11 + 4 : 0;
      const total = ww + 28;
      const left = -total / 2 - 12;
      const out = [];
      if (x.w) out.push({ t: String(x.w), x: left + ww / 2 - 2 });
      out.push({ n: x.n, d: x.d, x: left + ww + 14 });
      return out;
    },
    unitX(x) {
      if (x.kind === "int") return 4;
      const ww = x.w ? String(x.w).length * 11 + 4 : 0;
      return (ww + 28) / 2 - 8;
    },
  },
};
</script>

<style scoped lang="scss">
.fraction-scene {
  display: block;
  max-width: 100%;
  max-height: 100%;
}

.panel {
  fill: #fffde7;
  stroke: #ffcc80;
  stroke-width: 3;

  &--in {
    fill: #e8f5e9;
    stroke: #81c784;
  }

  &--out {
    fill: #fce4ec;
    stroke: #f48fb1;
  }
}

.caption {
  font-size: 17px;
  font-weight: 700;
  text-anchor: middle;
  fill: #5d4037;

  &--verb {
    fill: #00695c;
  }
}

.num {
  font-size: 22px;
  font-weight: 700;
  text-anchor: middle;
  fill: #0d47a1;

  &--small {
    font-size: 16px;
  }
}

.bar {
  stroke: #0d47a1;
  stroke-width: 2.5;
}

.unit {
  font-size: 16px;
  font-weight: 700;
  fill: #4e342e;

  &--center {
    text-anchor: middle;
  }
}

.arrow {
  fill: none;
  stroke: #ff7043;
  stroke-width: 4;
  stroke-linecap: round;
  stroke-linejoin: round;

  &--in {
    stroke: #43a047;
  }

  &--out {
    stroke: #e91e63;
  }
}

.ask {
  fill: #ffffff;
  stroke: #90a4ae;
  stroke-width: 3;
  stroke-dasharray: 8 6;

  &__mark {
    font-size: 38px;
    font-weight: 700;
    text-anchor: middle;
    fill: #ff7043;
  }
}

.glass {
  fill: #ffffff;
  stroke: #546e7a;
  stroke-width: 2.5;
}

.line {
  stroke: #4e342e;
  stroke-width: 2.5;
  stroke-linejoin: round;
}

.tag {
  font-size: 11px;
  font-weight: 700;
  text-anchor: middle;
  fill: #ffffff;

  &--dark {
    font-size: 13px;
    fill: #6d4c41;
  }
}
</style>

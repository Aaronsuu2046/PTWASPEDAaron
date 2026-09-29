<template>
  <!-- 旋轉情境動畫：靜態背景＋會轉的物件（上面有不代表答案的星形標記） -->
  <svg
    class="scene"
    :class="`scene--${dir}`"
    viewBox="0 0 400 300"
    :aria-label="label"
  >
    <!-- 瓶蓋（從上往下看） -->
    <g v-if="scene === 'cap'">
      <rect width="400" height="300" fill="#e3f2fd" />
      <circle
        cx="200"
        cy="150"
        r="118"
        fill="#b3e5fc"
        stroke="#4fc3f7"
        stroke-width="6"
      />
      <g class="spin" :style="spinStyle(200, 150)">
        <circle
          cx="200"
          cy="150"
          r="88"
          :fill="color"
          stroke="#37474f"
          stroke-width="4"
        />
        <line
          v-for="k in 36"
          :key="k"
          :x1="200 + 80 * Math.cos((k * Math.PI) / 18)"
          :y1="150 + 80 * Math.sin((k * Math.PI) / 18)"
          :x2="200 + 88 * Math.cos((k * Math.PI) / 18)"
          :y2="150 + 88 * Math.sin((k * Math.PI) / 18)"
          stroke="#263238"
          stroke-width="3"
        />
        <circle cx="200" cy="150" r="55" fill="rgba(255,255,255,0.35)" />
        <path :d="star(200, 88, 16)" class="scene__mark" />
      </g>
      <text x="200" y="290" class="scene__note">從瓶子上面往下看</text>
    </g>

    <!-- 螺絲（從上往下看） -->
    <g v-else-if="scene === 'screw'">
      <rect width="400" height="300" fill="#d7ccc8" />
      <g stroke="#bcaaa4" stroke-width="4">
        <line x1="0" y1="60" x2="400" y2="70" />
        <line x1="0" y1="140" x2="400" y2="130" />
        <line x1="0" y1="230" x2="400" y2="240" />
      </g>
      <circle
        cx="200"
        cy="150"
        r="98"
        fill="none"
        stroke="#8d6e63"
        stroke-width="3"
        stroke-dasharray="6 8"
      />
      <g class="spin" :style="spinStyle(200, 150)">
        <circle
          cx="200"
          cy="150"
          r="80"
          fill="#cfd8dc"
          stroke="#546e7a"
          stroke-width="5"
        />
        <rect x="190" y="90" width="20" height="120" rx="4" fill="#546e7a" />
        <rect x="140" y="140" width="120" height="20" rx="4" fill="#546e7a" />
        <path :d="star(248, 104, 13)" class="scene__mark" />
      </g>
      <text x="200" y="290" class="scene__note">從螺絲上面往下看</text>
    </g>

    <!-- 扭蛋機 -->
    <g v-else-if="scene === 'capsule'">
      <rect width="400" height="300" fill="#fff8e1" />
      <circle
        cx="200"
        cy="82"
        r="72"
        fill="#e1f5fe"
        stroke="#90a4ae"
        stroke-width="5"
      />
      <circle cx="170" cy="70" r="18" fill="#ef5350" />
      <circle cx="215" cy="98" r="18" fill="#ffca28" />
      <circle cx="228" cy="58" r="16" fill="#66bb6a" />
      <rect
        x="120"
        y="150"
        width="160"
        height="135"
        rx="14"
        fill="#ec407a"
        stroke="#ad1457"
        stroke-width="5"
      />
      <rect x="150" y="250" width="44" height="26" rx="6" fill="#880e4f" />
      <g class="spin" :style="spinStyle(232, 205)">
        <circle
          cx="232"
          cy="205"
          r="34"
          fill="#ffffff"
          stroke="#ad1457"
          stroke-width="5"
        />
        <rect x="224" y="176" width="16" height="58" rx="6" fill="#ffb300" />
        <path :d="star(232, 184, 8)" class="scene__mark" />
      </g>
    </g>

    <!-- 時鐘 -->
    <g v-else-if="scene === 'clock'">
      <rect width="400" height="300" fill="#f3e5f5" />
      <circle
        cx="200"
        cy="150"
        r="120"
        fill="#ffffff"
        stroke="#7e57c2"
        stroke-width="8"
      />
      <text
        v-for="n in 12"
        :key="n"
        :x="200 + 96 * Math.sin((n * Math.PI) / 6)"
        :y="150 - 96 * Math.cos((n * Math.PI) / 6)"
        class="scene__clock-num"
      >
        {{ n }}
      </text>
      <line
        x1="200"
        y1="150"
        x2="200"
        y2="95"
        stroke="#37474f"
        stroke-width="8"
        stroke-linecap="round"
      />
      <g class="spin" :style="spinStyle(200, 150)">
        <line
          x1="200"
          y1="150"
          x2="200"
          y2="62"
          stroke="#e53935"
          stroke-width="6"
          stroke-linecap="round"
        />
        <path :d="star(200, 78, 8)" class="scene__mark" />
      </g>
      <circle cx="200" cy="150" r="8" fill="#37474f" />
    </g>

    <!-- 遊樂場旋轉椅（從上往下看） -->
    <g v-else-if="scene === 'ride'">
      <rect width="400" height="300" fill="#e8f5e9" />
      <g fill="#a5d6a7">
        <circle cx="40" cy="40" r="22" />
        <circle cx="365" cy="60" r="26" />
        <circle cx="50" cy="260" r="24" />
        <circle cx="360" cy="255" r="20" />
      </g>
      <circle
        cx="200"
        cy="150"
        r="125"
        fill="#fff59d"
        stroke="#fbc02d"
        stroke-width="5"
      />
      <g class="spin" :style="spinStyle(200, 150)">
        <circle cx="200" cy="150" r="30" fill="#ff7043" />
        <g
          v-for="(c, k) in ['#42a5f5', '#ab47bc', '#26a69a', '#ef5350']"
          :key="k"
        >
          <line
            x1="200"
            y1="150"
            :x2="200 + 90 * Math.cos((k * Math.PI) / 2)"
            :y2="150 + 90 * Math.sin((k * Math.PI) / 2)"
            stroke="#8d6e63"
            stroke-width="6"
          />
          <circle
            :cx="200 + 90 * Math.cos((k * Math.PI) / 2)"
            :cy="150 + 90 * Math.sin((k * Math.PI) / 2)"
            r="24"
            :fill="c"
            stroke="#37474f"
            stroke-width="3"
          />
        </g>
        <path :d="star(290, 150, 12)" class="scene__mark" />
      </g>
      <text x="200" y="292" class="scene__note">從上面往下看</text>
    </g>

    <!-- 摩天輪 -->
    <g v-else-if="scene === 'ferris'">
      <rect width="400" height="300" fill="#e1f5fe" />
      <rect y="262" width="400" height="38" fill="#81c784" />
      <path
        d="M 200 140 L 150 262 M 200 140 L 250 262"
        stroke="#5d4037"
        stroke-width="8"
      />
      <g class="spin" :style="spinStyle(200, 140)">
        <circle
          cx="200"
          cy="140"
          r="105"
          fill="none"
          stroke="#ec407a"
          stroke-width="6"
        />
        <line
          v-for="k in 8"
          :key="`s${k}`"
          x1="200"
          y1="140"
          :x2="200 + 105 * Math.cos((k * Math.PI) / 4)"
          :y2="140 + 105 * Math.sin((k * Math.PI) / 4)"
          stroke="#f48fb1"
          stroke-width="3"
        />
        <circle
          v-for="k in 8"
          :key="`c${k}`"
          :cx="200 + 105 * Math.cos((k * Math.PI) / 4)"
          :cy="140 + 105 * Math.sin((k * Math.PI) / 4)"
          r="15"
          :fill="k === 8 ? '#ffca28' : '#4fc3f7'"
          stroke="#37474f"
          stroke-width="3"
        />
        <path :d="star(305, 140, 9)" class="scene__mark" />
      </g>
      <circle cx="200" cy="140" r="10" fill="#5d4037" />
    </g>

    <!-- 風力發電機 -->
    <g v-else-if="scene === 'turbine'">
      <rect width="400" height="300" fill="#e0f7fa" />
      <rect y="265" width="400" height="35" fill="#9ccc65" />
      <path
        d="M 194 120 L 206 120 L 212 268 L 188 268 Z"
        fill="#eceff1"
        stroke="#90a4ae"
        stroke-width="3"
      />
      <g class="spin" :style="spinStyle(200, 115)">
        <path
          v-for="k in 3"
          :key="k"
          d="M 200 115 C 190 80 194 40 200 15 C 208 40 212 80 200 115 Z"
          fill="#ffffff"
          stroke="#78909c"
          stroke-width="3"
          :transform="`rotate(${k * 120} 200 115)`"
        />
        <path :d="star(200, 30, 9)" class="scene__mark" />
      </g>
      <circle cx="200" cy="115" r="10" fill="#607d8b" />
    </g>

    <!-- 颱風衛星雲圖 -->
    <g v-else-if="scene === 'typhoon'">
      <rect width="400" height="300" fill="#1a237e" />
      <path
        d="M 20 250 Q 90 200 150 240 L 170 300 L 0 300 Z M 300 0 Q 330 60 400 50 L 400 0 Z"
        fill="#558b2f"
      />
      <g class="spin" :style="spinStyle(200, 150)">
        <path
          v-for="k in 3"
          :key="k"
          d="M 200 150 C 240 130 260 90 240 50 C 230 30 205 20 185 25 C 215 40 225 80 200 110"
          fill="rgba(255,255,255,0.85)"
          :transform="`rotate(${k * 120} 200 150)`"
        />
        <path :d="star(250, 80, 10)" class="scene__mark" />
      </g>
      <circle
        cx="200"
        cy="150"
        r="14"
        fill="#1a237e"
        stroke="#ffffff"
        stroke-width="3"
      />
      <text x="200" y="292" class="scene__note scene__note--light">
        從太空往下看
      </text>
    </g>

    <!-- 電風扇 -->
    <g v-else-if="scene === 'fan'">
      <rect width="400" height="300" fill="#fce4ec" />
      <rect x="185" y="200" width="30" height="70" fill="#90a4ae" />
      <ellipse cx="200" cy="275" rx="80" ry="16" fill="#78909c" />
      <circle
        cx="200"
        cy="125"
        r="108"
        fill="#ffffff"
        stroke="#b0bec5"
        stroke-width="6"
      />
      <g class="spin" :style="spinStyle(200, 125)">
        <ellipse
          v-for="k in 3"
          :key="k"
          cx="200"
          cy="70"
          rx="30"
          ry="52"
          fill="#4fc3f7"
          stroke="#0288d1"
          stroke-width="3"
          :transform="`rotate(${k * 120} 200 125)`"
        />
        <path :d="star(200, 40, 10)" class="scene__mark" />
      </g>
      <circle cx="200" cy="125" r="16" fill="#0288d1" />
      <g fill="none" stroke="#cfd8dc" stroke-width="2">
        <circle cx="200" cy="125" r="60" />
        <circle cx="200" cy="125" r="90" />
      </g>
    </g>

    <!-- 削鉛筆機（從側面看） -->
    <g v-else-if="scene === 'sharpener'">
      <rect width="400" height="300" fill="#fffde7" />
      <rect y="250" width="400" height="50" fill="#bcaaa4" />
      <rect
        x="80"
        y="100"
        width="170"
        height="150"
        rx="18"
        fill="#ffb74d"
        stroke="#e65100"
        stroke-width="5"
      />
      <circle cx="120" cy="150" r="12" fill="#5d4037" />
      <polygon
        points="30,144 108,144 108,156 30,156"
        fill="#fdd835"
        stroke="#f57f17"
        stroke-width="2"
      />
      <polygon points="108,144 120,150 108,156" fill="#5d4037" />
      <g class="spin" :style="spinStyle(250, 150)">
        <line
          x1="250"
          y1="150"
          x2="330"
          y2="150"
          stroke="#546e7a"
          stroke-width="10"
          stroke-linecap="round"
        />
        <circle
          cx="330"
          cy="150"
          r="16"
          fill="#e53935"
          stroke="#b71c1c"
          stroke-width="3"
        />
        <path :d="star(300, 150, 8)" class="scene__mark" />
      </g>
      <circle cx="250" cy="150" r="12" fill="#546e7a" />
      <circle
        cx="250"
        cy="150"
        r="80"
        fill="none"
        stroke="#bdbdbd"
        stroke-width="2"
        stroke-dasharray="5 7"
      />
    </g>

    <!-- 腳踏車：車子向右前進，地面往左移 -->
    <g v-else-if="scene === 'bike'">
      <rect width="400" height="300" fill="#e3f2fd" />
      <rect y="240" width="400" height="60" fill="#a1887f" />
      <g class="slide" :style="slideStyle">
        <rect
          v-for="k in 10"
          :key="k"
          :x="(k - 1) * 80"
          y="262"
          width="40"
          height="8"
          fill="#ffffff"
        />
      </g>
      <g v-for="cx in [120, 290]" :key="cx">
        <g class="spin" :style="spinStyle(cx, 190)">
          <circle
            :cx="cx"
            cy="190"
            r="48"
            fill="none"
            stroke="#37474f"
            stroke-width="8"
          />
          <line
            v-for="k in 6"
            :key="k"
            :x1="cx"
            y1="190"
            :x2="cx + 44 * Math.cos((k * Math.PI) / 3)"
            :y2="190 + 44 * Math.sin((k * Math.PI) / 3)"
            stroke="#90a4ae"
            stroke-width="3"
          />
          <path :d="star(cx, 146, 8)" class="scene__mark" />
        </g>
      </g>
      <path
        d="M 120 190 L 180 120 L 270 120 L 290 190 M 180 120 L 205 190 L 270 120 M 205 190 L 120 190"
        fill="none"
        stroke="#e53935"
        stroke-width="7"
        stroke-linejoin="round"
      />
      <path
        d="M 170 105 L 195 105 M 262 100 L 285 92"
        stroke="#37474f"
        stroke-width="7"
        stroke-linecap="round"
      />
      <path
        d="M 330 80 L 370 80 M 358 68 L 372 80 L 358 92"
        fill="none"
        stroke="#1565c0"
        stroke-width="6"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <text x="350" y="60" class="scene__note">前進</text>
    </g>
  </svg>
</template>

<script>
// 每種情境的旋轉中心都在 SVG 座標裡；dir 決定動畫方向
export default {
  name: "SpinScene",
  props: {
    scene: { type: String, required: true },
    // cw：順時針；ccw：逆時針
    dir: { type: String, required: true },
    label: { type: String, default: "" },
    color: { type: String, default: "#ff8a65" },
    seconds: { type: Number, default: 3 },
  },
  computed: {
    slideStyle() {
      return { animationDuration: `${this.seconds / 2}s` };
    },
  },
  methods: {
    spinStyle(cx, cy) {
      return {
        transformOrigin: `${cx}px ${cy}px`,
        animationDuration: `${this.seconds}s`,
      };
    },
    // 五角星（辨識標記）
    star(cx, cy, r) {
      const pts = [];
      for (let k = 0; k < 10; k += 1) {
        const a = -Math.PI / 2 + (k * Math.PI) / 5;
        const rr = k % 2 === 0 ? r : r * 0.45;
        pts.push(`${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`);
      }
      return `M ${pts.join(" L ")} Z`;
    },
  },
};
</script>

<style scoped>
.scene {
  width: 100%;
  height: 100%;
  display: block;
}

.scene--cw .spin {
  animation-name: spin-cw;
}

.scene--ccw .spin {
  animation-name: spin-ccw;
}

.spin {
  transform-box: view-box;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

.slide {
  animation: slide-left linear infinite;
}

.scene__mark {
  fill: #ffeb3b;
  stroke: #f57f17;
  stroke-width: 2;
}

.scene__note {
  font-size: 18px;
  font-weight: 700;
  fill: #455a64;
  text-anchor: middle;
}

.scene__note--light {
  fill: #ffffff;
}

.scene__clock-num {
  font-size: 22px;
  font-weight: 700;
  fill: #37474f;
  text-anchor: middle;
  dominant-baseline: central;
}

@keyframes spin-cw {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes spin-ccw {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(-360deg);
  }
}

@keyframes slide-left {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-80px);
  }
}
</style>

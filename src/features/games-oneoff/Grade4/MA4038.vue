<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <div class="board">
        <svg
          class="board__svg"
          :viewBox="`0 0 ${W} ${H}`"
          preserveAspectRatio="xMidYMid meet"
        >
          <!-- 角弧（依實際角度比例） -->
          <g v-for="(seg, k) in figure.segments" :key="`s${k}`">
            <path
              v-if="!seg.outer"
              :d="sector(seg)"
              class="arc"
              :class="`arc--${seg.kind}`"
            />
            <path
              :d="arcLine(seg)"
              class="arc__line"
              :class="[
                `arc__line--${seg.kind}`,
                { 'arc__line--outer': seg.outer },
              ]"
            />
          </g>

          <!-- 平角：畫成一直線 -->
          <line v-if="figure.straight" v-bind="straightLine" class="ray" />
          <line
            v-for="deg in figure.rays"
            :key="`r${deg}`"
            :x1="V[0]"
            :y1="V[1]"
            v-bind="rayEnd(deg)"
            class="ray"
          />
          <!-- 直角方框 -->
          <path v-if="figure.right" :d="rightMark" class="right-mark" />
          <circle :cx="V[0]" :cy="V[1]" r="6" class="vertex" />

          <!-- 角的標示 -->
          <g v-for="(seg, k) in figure.segments" :key="`l${k}`">
            <template v-if="seg.kind === 'unknown'">
              <circle v-bind="labelAt(seg, 'c')" r="19" class="label__bubble" />
              <text v-bind="labelAt(seg)" class="label label--unknown">？</text>
            </template>
            <text
              v-else
              v-bind="labelAt(seg)"
              class="label"
              :class="`label--${seg.kind}`"
            >
              {{ seg.value }}°
            </text>
          </g>
        </svg>
        <p class="legend">
          <span class="legend__q">？</span>是要求的角
          <template v-if="figure.right">；<b>□</b> 是直角</template>
          <template v-if="figure.straight">；一條直線是平角</template>
        </p>
      </div>

      <div class="side">
        <div class="sheet">
          <div class="sheet__head">
            <p class="sheet__title">計算紙</p>
            <!-- 用寫好的算式畫直式，只是算算看，不計分 -->
            <button
              v-if="!solved"
              type="button"
              class="sheet__vertical"
              data-pad-avoid
              @click="toggleVertical"
            >
              {{ verticalOpen ? "收起直式" : "用直式算" }}
            </button>
          </div>
          <button
            v-for="(line, k) in lines"
            :key="k"
            type="button"
            class="sheet__line"
            :class="{
              'sheet__line--focus': padEl && focus === k,
              'sheet__line--empty': !line,
            }"
            :data-line="k"
            data-pad-field
            @click="openPad(k, $event)"
          >
            {{ line || (padEl && focus === k ? "" : "點這裡寫算式")
            }}<span v-if="padEl && focus === k" class="caret" />
          </button>
        </div>

        <div v-if="verticalOpen && !solved" class="vertical">
          <div class="vertical__steps">
            <button
              v-for="(_, k) in lines"
              :key="`vline-${k}`"
              type="button"
              class="vertical__step"
              :class="{ 'vertical__step--on': verticalLine === k }"
              data-pad-avoid
              @click="pickVerticalLine(k)"
            >
              第 {{ k + 1 }} 行
            </button>
          </div>
          <KeepAlive>
            <VerticalScratch
              v-if="verticalExpr"
              ref="vertical"
              :key="verticalExpr.sig"
              :a="verticalExpr.a"
              :op="verticalExpr.op"
              :b="verticalExpr.b"
              @focus="onVerticalFocus"
            />
          </KeepAlive>
          <p v-if="!verticalExpr" class="vertical__tip">
            先在第 {{ verticalLine + 1 }} 行寫好算式（例如
            90−30），這裡就會出現直式喔！
          </p>
        </div>

        <div class="answer">
          答：
          <button
            type="button"
            class="answer__slot"
            :class="{
              'answer__slot--focus': padEl && focus === 'answer',
              'answer__slot--right': solved,
            }"
            data-line="answer"
            data-pad-field
            @click="openPad('answer', $event)"
          >
            {{ answer || "？" }}
          </button>
          度
        </div>

        <!-- 點算式行開「數字＋＋−＝」板，點答案格只開數字板 -->
        <FieldPad
          :field="solved ? null : padEl"
          :kind="
            focus === 'answer' || focus === 'vertical' ? 'number' : 'expression'
          "
          :operators="OPS"
          @press="onPadKey"
          @close="closePad"
        />

        <p v-if="feedback" class="feedback">{{ feedback }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import FieldPad from "./games/Common/FieldPad.vue";
import VerticalScratch from "./games/Vertical/VerticalScratch.vue";

const W = 600;
const H = 340;
const RAY = 225;
const OPS = ["+", "−", "="];
const MAX_LINE = 16;

const rad = (d) => (d * Math.PI) / 180;
const polar = (v, deg, r) => [
  v[0] + r * Math.cos(rad(deg)),
  v[1] - r * Math.sin(rad(deg)),
];

// 依題目類型算出射線與角弧（角度以 0° 向右、逆時針）
function buildFigure(q) {
  const segs = [];
  let rays = [];
  const total =
    q.kind === "sum" ? q.total : q.kind === "diff" ? q.big : q.total;
  if (q.kind === "sum") {
    const [a, b] = q.parts;
    rays = [0, a, a + b];
    segs.push({ from: 0, to: a, value: a, kind: "known", r: 62 });
    segs.push({ from: a, to: a + b, value: b, kind: "known2", r: 62 });
    segs.push({ from: 0, to: a + b, kind: "unknown", r: 118, outer: true });
  } else if (q.kind === "rest") {
    rays = [0, q.known, q.total];
    segs.push({ from: 0, to: q.known, value: q.known, kind: "known", r: 70 });
    segs.push({ from: q.known, to: q.total, kind: "unknown", r: 96 });
  } else if (q.kind === "diff") {
    rays = [0, q.small, q.big];
    segs.push({ from: 0, to: q.big, value: q.big, kind: "total", r: 132 });
    segs.push({ from: 0, to: q.small, value: q.small, kind: "known", r: 62 });
    segs.push({ from: q.small, to: q.big, kind: "unknown", r: 92 });
  } else {
    const [a1, a2] = q.known;
    rays = [0, a1, q.total - a2, q.total];
    segs.push({ from: 0, to: a1, value: a1, kind: "known", r: 74 });
    segs.push({ from: a1, to: q.total - a2, kind: "unknown", r: 100 });
    segs.push({
      from: q.total - a2,
      to: q.total,
      value: a2,
      kind: "known2",
      r: 74,
    });
  }
  const straight = total === 180 && (q.kind === "rest" || q.kind === "middle");
  const right = total === 90 && (q.kind === "rest" || q.kind === "middle");
  // 平角的 0° 與 180° 由直線畫，不重複畫射線
  if (straight) rays = rays.filter((d) => d !== 0 && d !== 180);
  return { segs, rays, straight, right, total };
}

// 角的合成與分解：看圖用加減算出未知角；計算紙的算式會記錄下來，只驗證最後答案
// 「用直式算」：用計算紙某一行的前兩個數畫加減直式（不計分）
export default {
  name: "MA4038",
  components: { FieldPad, VerticalScratch },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      W,
      H,
      OPS,
      lines: ["", ""],
      answer: "",
      focus: null,
      padEl: null,
      feedback: "",
      solved: false,
      verticalOpen: false,
      verticalLine: 0,
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "下圖中的角是幾度？用算式記記看。";
    },
    figure() {
      const f = buildFigure(this.gameData);
      return { ...f, segments: f.segs };
    },
    // 直式要算的：這一行最前面的「數 ＋／− 數」
    verticalExpr() {
      const m = (this.lines[this.verticalLine] || "").match(
        /^(\d+)([+−])(\d+)/
      );
      if (!m) return null;
      const op = m[2] === "−" ? "-" : "+";
      return { a: m[1], op, b: m[3], sig: `${this.verticalLine}:${m[0]}` };
    },
    // 頂點位置：小角放左邊，大角放中間，讓射線都在畫面內
    V() {
      return this.figure.total <= 90 ? [150, 300] : [300, 295];
    },
    straightLine() {
      const [x1, y1] = polar(this.V, 180, RAY);
      const [x2, y2] = polar(this.V, 0, RAY);
      return { x1, y1, x2, y2 };
    },
    rightMark() {
      const s = 22;
      const [vx, vy] = this.V;
      return `M ${vx + s} ${vy} L ${vx + s} ${vy - s} L ${vx} ${vy - s}`;
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    rayEnd(deg) {
      const [x2, y2] = polar(this.V, deg, RAY);
      return { x2, y2 };
    },
    sector(seg) {
      const [x1, y1] = polar(this.V, seg.from, seg.r);
      const [x2, y2] = polar(this.V, seg.to, seg.r);
      const large = seg.to - seg.from > 180 ? 1 : 0;
      return `M ${this.V[0]} ${this.V[1]} L ${x1} ${y1} A ${seg.r} ${seg.r} 0 ${large} 0 ${x2} ${y2} Z`;
    },
    arcLine(seg) {
      const [x1, y1] = polar(this.V, seg.from, seg.r);
      const [x2, y2] = polar(this.V, seg.to, seg.r);
      return `M ${x1} ${y1} A ${seg.r} ${seg.r} 0 0 0 ${x2} ${y2}`;
    },
    // 標示放在角的中間方向、弧線外側
    labelAt(seg, kind) {
      const mid = (seg.from + seg.to) / 2;
      // 小角的標示往外放，避免壓到射線
      const span = seg.to - seg.from;
      const extra = span < 25 ? 40 : span < 35 ? 18 : 0;
      const r = seg.r + (seg.kind === "unknown" ? 26 : 24) + extra;
      const [x, y] = polar(this.V, mid, r);
      return kind === "c" ? { cx: x, cy: y } : { x, y };
    },

    // ---- 計算紙輸入 ----
    openPad(target, event) {
      if (this.solved) return;
      if (this.focus === "vertical") this.$refs.vertical?.blur();
      // 直式跟著目前寫的那一行
      if (typeof target === "number") this.verticalLine = target;
      this.focus = target;
      this.padEl = event.currentTarget;
    },
    closePad() {
      if (this.focus === "vertical") this.$refs.vertical?.blur();
      this.padEl = null;
    },
    toggleVertical() {
      if (this.focus === "vertical") this.closePad();
      this.verticalOpen = !this.verticalOpen;
    },
    pickVerticalLine(k) {
      if (this.focus === "vertical") this.closePad();
      this.verticalLine = k;
    },
    // 點了直式的格子：輸入板移到那一格
    onVerticalFocus() {
      this.focus = "vertical";
      this.syncVerticalPad();
    },
    syncVerticalPad() {
      this.$nextTick(() => {
        const id = this.$refs.vertical?.active;
        this.padEl = id
          ? this.$el.querySelector(`.vertical [data-cell="${id}"]`)
          : null;
      });
    },
    onPadKey(key) {
      if (this.focus === "vertical") {
        this.$refs.vertical?.input(key === "clear" ? "←" : key);
        this.syncVerticalPad();
        return;
      }
      this.press(key === "clear" ? "清除" : key);
    },
    press(key) {
      if (this.solved || this.focus === null) return;
      this.feedback = "";
      if (this.focus === "answer") {
        if (key === "←") this.answer = this.answer.slice(0, -1);
        else if (key === "清除") this.answer = "";
        else if (!OPS.includes(key) && this.answer.length < 3) {
          this.answer = (this.answer + key).replace(/^0+(?=\d)/, "");
        }
        return;
      }
      const k = this.focus;
      if (key === "←") this.lines[k] = this.lines[k].slice(0, -1);
      else if (key === "清除") this.lines[k] = "";
      else if (this.lines[k].length < MAX_LINE) this.lines[k] += key;
    },

    checkAnswer() {
      if (this.solved) return;
      if (this.focus === "vertical") this.closePad();
      if (!this.answer) {
        this.feedback = "算好了，把答案填在「答」的格子裡喔！";
        this.focus = "answer";
        return;
      }
      const q = this.gameData;
      const ok = Number(this.answer) === q.answer;
      const work = this.lines.filter(Boolean).join("；") || "（沒有寫算式）";
      this.$emit("add-record", [
        `${q.hint.replace(/-/g, "−")}=${q.answer}（${q.answer} 度）`,
        `算式：${work}；答 ${this.answer} 度`,
        ok ? "正確" : "錯誤",
      ]);
      if (ok) {
        this.feedback = "";
        this.solved = true;
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
      } else {
        const tips = {
          sum: "？是兩個角合起來的角，要用加法。",
          rest:
            q.total === 90
              ? "直角是 90°，用 90 減掉已知的角。"
              : "平角是 180°，用 180 減掉已知的角。",
          diff: "？是大角扣掉小角剩下的部分，要用減法。",
          middle: `${q.total === 90 ? "直角是 90°" : "平角是 180°"}，扣掉兩邊已知的角。`,
        };
        this.feedback = `不對喔！${tips[q.kind]}`;
        this.$emit("play-effect", "WrongSound");
      }
    },
  },
};
</script>

<style scoped lang="scss">
.outer-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: $gap--small;

  .title {
    @extend .container-basic;
    justify-content: center;
    background-color: $primary-color;
    padding: $padding--small $padding--medium;
    p {
      font-size: $text-large;
      font-weight: $font-bold;
      margin: 0;
    }
  }
}

.game-area {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 1rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small;
}

.board {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;

  &__svg {
    flex: 1;
    min-height: 0;
    width: 100%;
    background-color: #ffffff;
    border: 3px solid #b3e5fc;
    border-radius: 16px;
  }
}

.ray {
  stroke: #37474f;
  stroke-width: 5;
  stroke-linecap: round;
}

.vertex {
  fill: #37474f;
}

.right-mark {
  fill: none;
  stroke: #37474f;
  stroke-width: 3;
}

.arc {
  stroke: none;

  &--known {
    fill: rgba(66, 165, 245, 0.25);
  }

  &--known2 {
    fill: rgba(102, 187, 106, 0.28);
  }

  &--total {
    fill: none;
  }

  &--unknown {
    fill: rgba(255, 167, 38, 0.3);
  }

  &__line {
    fill: none;
    stroke-width: 3.5;

    &--known {
      stroke: #1e88e5;
    }

    &--known2 {
      stroke: #43a047;
    }

    &--total {
      stroke: #8e24aa;
      stroke-dasharray: 8 5;
    }

    &--unknown {
      stroke: #ef6c00;
    }

    &--outer {
      stroke-width: 4;
      stroke-dasharray: 9 6;
    }
  }
}

.label {
  font-size: 24px;
  font-weight: 700;
  text-anchor: middle;
  dominant-baseline: central;
  paint-order: stroke;
  stroke: #ffffff;
  stroke-width: 5px;

  &--known {
    fill: #0d47a1;
  }

  &--known2 {
    fill: #1b5e20;
  }

  &--total {
    fill: #6a1b9a;
  }

  &--unknown {
    fill: #ffffff;
    stroke: none;
    font-size: 22px;
  }

  &__bubble {
    fill: #fb8c00;
  }
}

.legend {
  margin: 0;
  font-size: 1.05rem;
  font-weight: $font-bold;
  color: #5d4037;

  &__q {
    display: inline-block;
    width: 1.6rem;
    height: 1.6rem;
    margin-right: 0.2rem;
    line-height: 1.6rem;
    text-align: center;
    color: #ffffff;
    background-color: #fb8c00;
    border-radius: 50%;
  }
}

.side {
  width: 18rem;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 0;
  overflow-y: auto;
}

.sheet {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.4rem 0.5rem;
  background-color: #fffde7;
  background-image: repeating-linear-gradient(
    transparent 0 2.6rem,
    #ffe0b2 2.6rem 2.7rem
  );
  border: 3px solid #ffcc80;
  border-radius: 12px;

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__title {
    margin: 0;
    font-size: 1.1rem;
    font-weight: $font-bold;
    color: #8d6e63;
  }

  &__vertical {
    padding: 0.15rem 0.7rem;
    font-size: 1.05rem;
    font-weight: $font-bold;
    color: #ffffff;
    background-color: #26a69a;
    border: none;
    border-radius: 10px;
    box-shadow: 0 3px 0 #00796b;
    cursor: pointer;
  }

  &__line {
    height: 2.6rem;
    padding: 0 0.5rem;
    text-align: left;
    font-size: 1.5rem;
    font-weight: $font-bold;
    color: #0d47a1;
    background-color: rgba(255, 255, 255, 0.7);
    border: 3px dashed #bcaaa4;
    border-radius: 10px;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;

    &--empty {
      font-size: 1.05rem;
      color: #a1887f;
    }

    &--focus {
      border-style: solid;
      border-color: #ffb300;
      background-color: #ffffff;
    }
  }
}

.vertical {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.4rem;
  background-color: #e0f2f1;
  border: 3px solid #80cbc4;
  border-radius: 12px;

  &__steps {
    display: flex;
    gap: 0.4rem;
  }

  &__step {
    flex: 1;
    padding: 0.15rem 0.4rem;
    font-size: 1rem;
    font-weight: $font-bold;
    color: #00695c;
    background-color: #ffffff;
    border: 2px solid #80cbc4;
    border-radius: 10px;
    cursor: pointer;

    &--on {
      color: #ffffff;
      background-color: #26a69a;
      border-color: #00796b;
    }
  }

  &__tip {
    margin: 0.3rem;
    font-size: 1.1rem;
    font-weight: $font-bold;
    line-height: 1.4;
    color: #00695c;
  }

  :deep(.vfill) {
    --cell: 2.3rem;
  }

  :deep(.vfill__cell) {
    font-size: 1.5rem;
  }

  :deep(.vfill__grid) {
    padding: 0.3rem 0.6rem;
    row-gap: 0.1rem;
  }
}

.caret {
  display: inline-block;
  width: 3px;
  height: 1.4rem;
  margin-left: 2px;
  vertical-align: middle;
  background-color: #ff6f00;
  animation: blink 1s steps(1) infinite;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

.answer {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 1.6rem;
  font-weight: $font-bold;
  color: #333333;

  &__slot {
    min-width: 5.5rem;
    height: 3.2rem;
    font-size: 2rem;
    font-weight: $font-bold;
    color: #0d47a1;
    background-color: #ffffff;
    border: 4px dashed #90a4ae;
    border-radius: 12px;
    cursor: pointer;

    &--focus {
      border-style: solid;
      border-color: #ffb300;
    }

    &--right {
      color: #1b5e20;
      background-color: #e8f5e9;
      border-color: #43a047;
    }
  }
}

.feedback {
  margin: 0;
  font-size: 1.1rem;
  font-weight: $font-bold;
  line-height: 1.4;
  color: #c62828;
}

@media (max-width: 1100px) {
  .side {
    width: 15.5rem;
    gap: 0.35rem;
  }

  .sheet__line {
    height: 2.3rem;
    font-size: 1.3rem;
  }

  .answer {
    font-size: 1.35rem;

    &__slot {
      height: 2.8rem;
      font-size: 1.7rem;
    }
  }

  .legend {
    font-size: 0.95rem;
  }

  .feedback {
    font-size: 0.95rem;
  }

  .vertical {
    :deep(.vfill) {
      --cell: 1.9rem;
    }

    :deep(.vfill__cell) {
      font-size: 1.3rem;
    }
  }
}
</style>

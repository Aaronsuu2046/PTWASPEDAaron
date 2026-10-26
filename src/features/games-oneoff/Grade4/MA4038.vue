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

          <!-- 平角：從頂點往兩邊的兩條反向射線（共線），再畫一條 180° 的角弧 -->
          <template v-if="figure.straight">
            <path :d="straightArc" class="arc__line arc__line--straight" />
            <line
              v-for="deg in [0, 180]"
              :key="`st${deg}`"
              :x1="V[0]"
              :y1="V[1]"
              v-bind="rayEnd(deg)"
              class="ray"
            />
          </template>
          <line
            v-for="deg in figure.rays"
            :key="`r${deg}`"
            :x1="V[0]"
            :y1="V[1]"
            v-bind="rayEnd(deg)"
            class="ray"
          />
          <!-- 直角記號：在 90° 角內、兩邊和射線平行的小正方形 -->
          <path v-if="figure.right" :d="rightMark" class="right-mark" />
          <circle :cx="V[0]" :cy="V[1]" r="6" class="vertex" />
          <text
            v-if="figure.straight"
            v-bind="straightLabel"
            class="label label--total"
          >
            180°
          </text>

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
          <template v-if="figure.right">
            ；<span class="legend__right" />是直角（90°）
          </template>
          <template v-if="figure.straight">
            ；兩條射線成一直線是平角（180°）
          </template>
        </p>
      </div>

      <div class="side">
        <!-- 算式：關卡 1～3 一列；關卡 4～5 分「先算」「再算」兩列，最後是答案欄 -->
        <div class="work">
          <div v-for="(row, r) in rows" :key="r" class="work__row">
            <span v-if="row.label" class="work__label">{{ row.label }}</span>
            <template v-for="(cell, c) in row.cells" :key="c">
              <span v-if="cell.text" class="work__text">{{ cell.text }}</span>
              <button
                v-else
                type="button"
                class="cell"
                :class="cellClass(cell)"
                :data-cell="cell.key"
                data-pad-field
                @click="openPad(cell, $event)"
              >
                {{ values[cell.key] || "" }}
              </button>
            </template>
          </div>
          <div class="work__row work__row--answer">
            <span class="work__label">答：</span>
            <button
              type="button"
              class="cell cell--answer"
              :class="cellClass(answerCell)"
              data-cell="answer"
              data-pad-field
              @click="openPad(answerCell, $event)"
            >
              {{ values.answer || "" }}
            </button>
            <span class="work__text">度</span>
          </div>
        </div>

        <FieldPad
          :field="solved ? null : padEl"
          :kind="focus && focus.op ? 'operator' : 'number'"
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

const W = 600;
const H = 340;
const RAY = 225;
const OPS = ["+", "−"];
const MAX_DIGITS = 3;

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

// 算式格子：固定數字直接顯示，其餘是要填的格子 { key, ans, op? }
// 關卡 1～3（比照 MA3075）：「已知數 □ □ ＝ □」一列；
// 關卡 4～5（比照 MA3125）：「先算：總角 □ 已知角 ＝ □」「再算：□ □ 已知角 ＝ □」
function buildRows(q) {
  const fix = (n) => ({ text: String(n) });
  const eq = { text: "＝" };
  if (q.kind === "middle") {
    const [k1, k2] = q.known;
    const first = q.total - k1;
    return [
      {
        label: "先算：",
        cells: [
          fix(q.total),
          { key: "op1", ans: "−", op: true },
          fix(k1),
          eq,
          { key: "r1", ans: first },
        ],
      },
      {
        label: "再算：",
        cells: [
          { key: "c2", ans: first },
          { key: "op2", ans: "−", op: true },
          fix(k2),
          eq,
          { key: "r2", ans: q.answer },
        ],
      },
    ];
  }
  const [a, op, b] =
    q.kind === "sum"
      ? [q.parts[0], "+", q.parts[1]]
      : q.kind === "rest"
        ? [q.total, "−", q.known]
        : [q.big, "−", q.small];
  return [
    {
      label: "",
      cells: [
        fix(a),
        { key: "op1", ans: op, op: true },
        { key: "b1", ans: b },
        eq,
        { key: "r1", ans: q.answer },
      ],
    },
  ];
}

// 角的合成與分解：看圖用加減算出未知角，把算式和答案填進格子；每一格都會檢查，
// 答錯只標出錯的或沒填的格子，全部正確才過關
export default {
  name: "MA4038",
  components: { FieldPad },
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
      values: {},
      wrong: {},
      checked: false,
      focus: null,
      padEl: null,
      feedback: "",
      solved: false,
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
    rows() {
      return buildRows(this.gameData);
    },
    answerCell() {
      return { key: "answer", ans: this.gameData.answer };
    },
    // 所有要填的格子（含答案欄）
    cells() {
      return [
        ...this.rows.flatMap((row) => row.cells.filter((c) => c.key)),
        this.answerCell,
      ];
    },
    // 頂點位置：小角放左邊，大角放中間，讓射線都在畫面內
    V() {
      return this.figure.total <= 90 ? [150, 300] : [300, 295];
    },
    // 平角的 180° 角弧（在最外圈，虛線）
    straightArc() {
      const r = 150;
      const [x1, y1] = polar(this.V, 0, r);
      const [x2, y2] = polar(this.V, 180, r);
      return `M ${x1} ${y1} A ${r} ${r} 0 0 0 ${x2} ${y2}`;
    },
    straightLabel() {
      const [x, y] = polar(this.V, 160, 172);
      return { x, y };
    },
    // 直角記號：小正方形，兩邊分別和 0°、90° 的射線平行
    rightMark() {
      const s = 30;
      const [vx, vy] = this.V;
      return `M ${vx} ${vy} L ${vx + s} ${vy} L ${vx + s} ${vy - s} L ${vx} ${vy - s} Z`;
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

    // ---- 填格子 ----
    norm(key) {
      return key === "-" ? "−" : key;
    },
    same(cell, value) {
      return cell.op
        ? value === cell.ans
        : value !== "" && Number(value) === cell.ans;
    },
    cellClass(cell) {
      return {
        "cell--op": cell.op,
        "cell--focus": this.padEl && this.focus?.key === cell.key,
        "cell--wrong": this.wrong[cell.key],
        "cell--right":
          (this.checked || this.solved) &&
          !this.wrong[cell.key] &&
          this.same(cell, this.values[cell.key] ?? ""),
      };
    },
    openPad(cell, event) {
      if (this.solved) return;
      this.focus = cell;
      this.padEl = event.currentTarget;
    },
    closePad() {
      this.padEl = null;
    },
    onPadKey(raw) {
      const cell = this.focus;
      if (this.solved || !cell) return;
      const key = this.norm(raw);
      const now = this.values[cell.key] || "";
      let next = now;
      if (key === "clear" || key === "清除") next = "";
      else if (key === "←") next = now.slice(0, -1);
      else if (cell.op) {
        if (OPS.includes(key)) next = key;
      } else if (/^\d$/.test(key) && now.length < MAX_DIGITS) {
        next = (now + key).replace(/^0+(?=\d)/, "");
      }
      if (next === now) return;
      this.values = { ...this.values, [cell.key]: next };
      // 改了哪一格就只清掉那一格的錯誤標示
      if (this.wrong[cell.key]) {
        const { [cell.key]: _drop, ...rest } = this.wrong;
        this.wrong = rest;
      }
      this.feedback = "";
      // 運算符號選好就收起
      if (cell.op && OPS.includes(next)) this.closePad();
    },
    // 學生寫的算式（沒填的格子記成 □）
    written() {
      const show = (cell) =>
        cell.text ?? (this.values[cell.key] ? this.values[cell.key] : "□");
      const lines = this.rows.map(
        (row) => row.label + row.cells.map(show).join(" ")
      );
      return `${lines.join("；")}；答 ${this.values.answer || "□"} 度`;
    },
    correctWork() {
      const show = (cell) => cell.text ?? String(cell.ans);
      const lines = this.rows.map(
        (row) => row.label + row.cells.map(show).join(" ")
      );
      return `${lines.join("；")}；答 ${this.gameData.answer} 度`;
    },
    describe() {
      const q = this.gameData;
      const name = q.total === 90 ? "直角" : "平角";
      if (q.kind === "sum")
        return `已知 ${q.parts[0]}° 和 ${q.parts[1]}°，求兩角合起來的角`;
      if (q.kind === "rest")
        return `${name} ${q.total}° 扣掉 ${q.known}°，求？`;
      if (q.kind === "diff") return `${q.big}° 扣掉 ${q.small}°，求？`;
      return `${name} ${q.total}° 扣掉兩邊 ${q.known[0]}° 和 ${q.known[1]}°，求中間的角`;
    },

    checkAnswer() {
      if (this.solved) return;
      this.closePad();
      const wrong = {};
      this.cells.forEach((cell) => {
        if (!this.same(cell, this.values[cell.key] ?? ""))
          wrong[cell.key] = true;
      });
      this.wrong = wrong;
      this.checked = true;
      const ok = Object.keys(wrong).length === 0;
      const q = this.gameData;
      this.$emit("add-record", [
        `${this.describe()}（${this.correctWork()}）`,
        this.written(),
        ok ? "正確" : "錯誤",
      ]);
      if (ok) {
        this.feedback = "";
        this.solved = true;
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
        return;
      }
      const empty = this.cells.some((c) => !(this.values[c.key] ?? ""));
      const tips = {
        sum: "？是兩個角合起來的角，要用加法。",
        rest:
          q.total === 90
            ? "直角是 90°，用 90 減掉已知的角。"
            : "平角是 180°，用 180 減掉已知的角。",
        diff: "？是大角扣掉小角剩下的部分，要用減法。",
        middle: `${q.total === 90 ? "直角是 90°" : "平角是 180°"}，先扣掉一邊的角，再扣掉另一邊的角。`,
      };
      this.feedback = `${empty ? "還有空格沒填喔！" : "紅色的格子不對喔！"}${tips[q.kind]}`;
      this.$emit("play-effect", "WrongSound");
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
  fill: rgba(255, 255, 255, 0.85);
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

    &--straight {
      stroke: #8e24aa;
      stroke-width: 3;
      stroke-dasharray: 8 6;
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

  &__right {
    display: inline-block;
    width: 1rem;
    height: 1rem;
    margin: 0 0.2rem;
    vertical-align: -0.1rem;
    border: 2px solid #37474f;
    background-color: #ffffff;
  }

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
  width: 21rem;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 0;
  overflow-y: auto;
}

.work {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.7rem 0.8rem;
  background-color: #ffffff;
  border: 3px solid #ffcc80;
  border-radius: 14px;

  &__row {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 1.7rem;
    font-weight: $font-bold;
    color: #0d47a1;
    white-space: nowrap;

    &--answer {
      margin-top: 0.2rem;
      padding-top: 0.5rem;
      border-top: 2px dashed #cfd8dc;
      color: #333333;
    }
  }

  &__label {
    font-size: 1.3rem;
    color: #5d4037;
  }
}

.cell {
  min-width: 3.6rem;
  height: 3rem;
  padding: 0 0.3rem;
  font-size: 1.7rem;
  font-weight: $font-bold;
  color: #1565c0;
  background-color: #fffde7;
  border: 3px dashed #ffb300;
  border-radius: 10px;
  cursor: pointer;

  &--op {
    min-width: 2.6rem;
    color: #ef6c00;
  }

  &--answer {
    min-width: 4.6rem;
  }

  &--focus {
    border: 4px solid #1e88e5;
    background-color: #e3f2fd;
  }

  &--right {
    color: #2e7d32;
    border: 3px solid #43a047;
    background-color: #e8f5e9;
  }

  &--wrong {
    color: #c62828;
    border: 4px solid #e53935;
    background-color: #ffebee;
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
    width: 17.5rem;
    gap: 0.35rem;
  }

  .work {
    padding: 0.5rem;

    &__row {
      font-size: 1.35rem;
    }

    &__label {
      font-size: 1.05rem;
    }
  }

  .cell {
    min-width: 2.9rem;
    height: 2.5rem;
    font-size: 1.35rem;

    &--op {
      min-width: 2.1rem;
    }

    &--answer {
      min-width: 3.8rem;
    }
  }

  .legend {
    font-size: 0.95rem;
  }

  .feedback {
    font-size: 0.95rem;
  }
}
</style>

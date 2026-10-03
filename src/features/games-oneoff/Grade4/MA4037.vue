<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <div class="board">
        <svg
          ref="svg"
          class="board__svg"
          :viewBox="`0 0 ${W} ${H}`"
          preserveAspectRatio="xMidYMid meet"
          @pointerdown="startDrag"
          @pointermove="onDrag"
          @pointerup="endDrag"
          @pointercancel="endDrag"
        >
          <!-- ===== 鐘面（關卡 1～4） ===== -->
          <template v-if="!isProtractor">
            <circle :cx="C[0]" :cy="C[1]" :r="FACE" class="clock__face" />
            <line
              v-for="k in 60"
              :key="`t${k}`"
              v-bind="tick(k)"
              class="clock__tick"
              :class="{ 'clock__tick--hour': k % 5 === 0 }"
            />
            <text
              v-for="n in 12"
              :key="`n${n}`"
              :x="C[0] + (FACE - 30) * Math.sin((n * Math.PI) / 6)"
              :y="C[1] - (FACE - 30) * Math.cos((n * Math.PI) / 6)"
              class="clock__num"
              :class="{ 'clock__num--start': n === gameData.start }"
            >
              {{ n }}
            </text>
            <path v-if="Math.abs(turn) > 0.5" :d="clockArc" class="turn__arc" />
            <polygon
              v-if="Math.abs(turn) > 8"
              :points="clockArrow"
              class="turn__arrow"
            />
            <line
              :x1="C[0]"
              :y1="C[1]"
              v-bind="startLine"
              class="turn__start"
            />
            <!-- 指定方向提示（在起點外側） -->
            <g class="dir-hint">
              <path :d="dirHint.path" />
              <polygon :points="dirHint.head" />
            </g>
            <!-- 指針：只由動畫轉動，學生直接選答案 -->
            <g class="hand hand--static">
              <line
                :x1="C[0]"
                :y1="C[1]"
                :x2="handEnd[0]"
                :y2="handEnd[1]"
                class="hand__line"
              />
              <circle
                :cx="handEnd[0]"
                :cy="handEnd[1]"
                r="13"
                class="hand__knob"
              />
            </g>
            <circle :cx="C[0]" :cy="C[1]" r="8" class="clock__center" />
          </template>

          <!-- ===== 量角器（關卡 5） ===== -->
          <template v-else>
            <g :transform="`translate(${P[0]} ${P[1]})`">
              <ProtractorTool :r="PR" :font-scale="1.15" />
              <line :x1="0" :y1="0" v-bind="protStart" class="turn__start" />
              <path
                v-if="lockedPhi !== null"
                :d="protArc(startPhi, lockedPhi, 58)"
                class="turn__arc turn__arc--first"
              />
              <path
                v-if="Math.abs(phi - (lockedPhi ?? startPhi)) > 0.5"
                :d="protArc(lockedPhi ?? startPhi, phi, 76)"
                class="turn__arc"
              />
              <line
                v-if="lockedPhi !== null"
                :x1="0"
                :y1="0"
                v-bind="protLine(lockedPhi, PR * 1.02)"
                class="turn__locked"
              />
            </g>
            <g data-drag="pointer" class="hand">
              <line
                :x1="P[0]"
                :y1="P[1]"
                :x2="pointerEnd[0]"
                :y2="pointerEnd[1]"
                class="hand__hit"
              />
              <line
                :x1="P[0]"
                :y1="P[1]"
                :x2="pointerEnd[0]"
                :y2="pointerEnd[1]"
                class="hand__line"
              />
              <circle
                :cx="pointerEnd[0]"
                :cy="pointerEnd[1]"
                r="13"
                class="hand__knob"
              />
            </g>
          </template>
        </svg>

        <div class="tools">
          <template v-if="isProtractor">
            <button
              type="button"
              class="tool-btn tool-btn--reset"
              @click="resetPointer"
            >
              指針回到起點
            </button>
            <span class="tools__how">拖動紅色指針，靠近整十度會對齊</span>
          </template>
          <template v-else-if="canPlay">
            <button type="button" class="tool-btn tool-btn--play" @click="play">
              ▶ 播放動畫
            </button>
            <span class="tools__how">看指針怎麼轉，再選出答案</span>
          </template>
          <span v-else class="tools__how">
            指針從 {{ gameData.start }} 開始{{
              DIR[gameData.dir]
            }}轉，想想看會停在哪裡
          </span>
        </div>
      </div>

      <div class="side">
        <p class="prompt">{{ gameData.text }}</p>

        <template v-if="isProtractor">
          <ol class="steps">
            <li
              v-for="(t, k) in gameData.turns"
              :key="k"
              :class="{
                steps__done: k < phase || solved,
                steps__now: k === phase && !solved,
              }"
            >
              第{{ k === 0 ? "一" : "二" }}次：{{ DIR[t.dir] }}轉 {{ t.deg }}°
            </li>
          </ol>
          <p class="side__tip">
            轉好了就按「送出答案」，{{
              phase === 0 ? "先記下第一次的位置" : "檢查最後停在哪裡"
            }}
          </p>
        </template>

        <div v-else class="options">
          <button
            v-for="(opt, k) in gameData.options"
            :key="opt"
            type="button"
            class="option"
            :class="{
              'option--picked': choice === k,
              'option--wrong': wrongChoice === k,
              'option--right': solved && choice === k,
            }"
            :data-option="LETTERS[k]"
            :disabled="solved"
            @click="pick(k)"
          >
            <span class="option__letter">{{ LETTERS[k] }}</span>
            <span class="option__text">{{ opt }}</span>
          </button>
        </div>

        <p
          v-if="feedback"
          class="feedback"
          :class="{ 'feedback--ok': feedbackOk }"
        >
          {{ feedback }}
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import ProtractorTool from "./games/Geometry/ProtractorTool.vue";

const W = 600;
const H = 380;
const C = [300, 190];
const FACE = 165;
const HAND = 130;
const P = [300, 350];
const PR = 240;
const DIR = { cw: "順時針", ccw: "逆時針" };
const LETTERS = ["A", "B", "C"];
const PLAY_MS = 1800;

const rad = (d) => (d * Math.PI) / 180;
// 鐘面角度：0° 在 12，順時針增加
const onClock = (deg, r) => [
  C[0] + r * Math.sin(rad(deg)),
  C[1] - r * Math.cos(rad(deg)),
];
// 量角器上的方向（數學角：0° 在右、逆時針）
const polar = (deg, r) => [r * Math.cos(rad(deg)), -r * Math.sin(rad(deg))];

// 旋轉角：關卡 1～4 看鐘面指針旋轉後選答案（三選一）；關卡 5 在量角器上做兩段旋轉
export default {
  name: "MA4037",
  components: { ProtractorTool },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    const start = this.gameData.ring === "內圈" ? 0 : 180;
    return {
      W,
      H,
      C,
      FACE,
      P,
      PR,
      DIR,
      LETTERS,
      // 鐘面：動畫中從起點算起的轉動量（順時針為正）
      turn: 0,
      timer: null,
      // 量角器：指針方向與第一次鎖定的位置
      startPhi: start,
      phi: start,
      lockedPhi: null,
      phase: 0,
      drag: null,
      choice: null,
      wrongChoice: null,
      feedback: "",
      feedbackOk: false,
      solved: false,
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "移動指針，再回答問題。";
    },
    isProtractor() {
      return this.gameData.kind === "protractor";
    },
    // 關卡 4 問「會停在哪個數字」，播放到終點會直接看到答案，所以不播放
    canPlay() {
      return !this.isProtractor && this.gameData.kind !== "end";
    },
    expectedTurn() {
      const q = this.gameData;
      return q.dir === "cw" ? q.turn : -q.turn;
    },
    startDeg() {
      return (this.gameData.start % 12) * 30;
    },
    handDeg() {
      return this.startDeg + this.turn;
    },
    handEnd() {
      return onClock(this.handDeg, HAND);
    },
    startLine() {
      const [x2, y2] = onClock(this.startDeg, FACE - 8);
      return { x2, y2 };
    },
    clockArc() {
      const r = 92;
      const a = this.startDeg;
      const t = Math.max(-359.5, Math.min(359.5, this.turn));
      const [x1, y1] = onClock(a, r);
      const [x2, y2] = onClock(a + t, r);
      const large = Math.abs(t) > 180 ? 1 : 0;
      const sweep = t > 0 ? 1 : 0;
      return `M ${x1} ${y1} A ${r} ${r} 0 ${large} ${sweep} ${x2} ${y2}`;
    },
    clockArrow() {
      const r = 92;
      const end = this.startDeg + Math.max(-359.5, Math.min(359.5, this.turn));
      const sign = this.turn > 0 ? 1 : -1;
      return this.arrowAt(onClock(end, r), onClock(end - sign * 7, r));
    },
    // 起點外側的方向提示小箭頭
    dirHint() {
      const r = FACE + 16;
      const sign = this.gameData.dir === "cw" ? 1 : -1;
      const a = this.startDeg - sign * 12;
      const b = this.startDeg + sign * 16;
      const [x1, y1] = onClock(a, r);
      const [x2, y2] = onClock(b, r);
      return {
        path: `M ${x1} ${y1} A ${r} ${r} 0 0 ${sign > 0 ? 1 : 0} ${x2} ${y2}`,
        head: this.arrowAt(onClock(b + sign * 3, r), onClock(b - sign * 4, r)),
      };
    },
    protStart() {
      const [x2, y2] = polar(this.startPhi, PR * 1.02);
      return { x2, y2 };
    },
    pointerEnd() {
      const [x, y] = polar(this.phi, PR * 1.06);
      return [P[0] + x, P[1] + y];
    },
    // 目前讀數（依題目指定的圈）
    reading() {
      return this.gameData.ring === "內圈" ? this.phi : 180 - this.phi;
    },
    lockedReading() {
      if (this.lockedPhi === null) return null;
      return this.gameData.ring === "內圈"
        ? this.lockedPhi
        : 180 - this.lockedPhi;
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  mounted() {
    if (this.canPlay) this.play();
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
    cancelAnimationFrame(this.timer);
  },
  methods: {
    tick(k) {
      const inner = k % 5 === 0 ? FACE - 16 : FACE - 9;
      const [x1, y1] = onClock(k * 6, FACE - 2);
      const [x2, y2] = onClock(k * 6, inner);
      return { x1, y1, x2, y2 };
    },
    arrowAt(tip, back) {
      const dx = tip[0] - back[0];
      const dy = tip[1] - back[1];
      const len = Math.hypot(dx, dy) || 1;
      const [ux, uy] = [dx / len, dy / len];
      const s = 10;
      const base = [tip[0] - ux * s * 1.4, tip[1] - uy * s * 1.4];
      return [
        tip,
        [base[0] - uy * s, base[1] + ux * s],
        [base[0] + uy * s, base[1] - ux * s],
      ]
        .map((p) => p.join(","))
        .join(" ");
    },
    protLine(deg, r) {
      const [x2, y2] = polar(deg, r);
      return { x2, y2 };
    },
    // 量角器上兩個方向之間的弧（走較短的那邊，最大 180°）
    protArc(from, to, r) {
      const [x1, y1] = polar(from, r);
      const [x2, y2] = polar(to, r);
      const sweep = to > from ? 0 : 1;
      return `M ${x1} ${y1} A ${r} ${r} 0 0 ${sweep} ${x2} ${y2}`;
    },

    // ---- 鐘面動畫：每次都從起點重新轉 ----
    play() {
      cancelAnimationFrame(this.timer);
      const target = this.expectedTurn;
      const begin = performance.now();
      this.turn = 0;
      const step = (now) => {
        const t = Math.min(1, (now - begin) / PLAY_MS);
        const ease = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        this.turn = target * ease;
        if (t < 1) this.timer = requestAnimationFrame(step);
      };
      this.timer = requestAnimationFrame(step);
    },
    pick(k) {
      if (this.solved) return;
      this.choice = k;
      this.wrongChoice = null;
      this.feedback = "";
    },

    // ---- 關卡 5：拖動量角器上的指針 ----
    toLocal(event) {
      const svg = this.$refs.svg;
      const pt = svg.createSVGPoint();
      pt.x = event.clientX;
      pt.y = event.clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      return [p.x, p.y];
    },
    startDrag(event) {
      if (this.solved) return;
      if (event.button !== undefined && event.button !== 0) return;
      const kind = event.target.closest?.("[data-drag]")?.dataset.drag;
      if (!kind) return;
      this.drag = { kind };
      this.feedback = "";
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    onDrag(event) {
      if (!this.drag) return;
      const p = this.toLocal(event);
      const deg = (Math.atan2(-(p[1] - P[1]), p[0] - P[0]) * 180) / Math.PI;
      // 只在上半圓；拖到下面時停在最近的一端
      this.phi = deg >= 0 ? deg : deg < -90 ? 180 : 0;
    },
    endDrag() {
      if (!this.drag) return;
      const near = Math.round(this.phi / 10) * 10;
      if (Math.abs(near - this.phi) <= 3) this.phi = near;
      this.drag = null;
    },
    resetPointer() {
      if (this.solved) return;
      this.phi = this.lockedPhi ?? this.startPhi;
      this.feedback = "";
    },

    // ---- 判分 ----
    finish(ok, expected, given, hint) {
      this.$emit("add-record", [expected, given, ok ? "正確" : "錯誤"]);
      if (ok) {
        this.feedback = "";
        this.solved = true;
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
      } else {
        this.feedbackOk = false;
        this.feedback = `不對喔！${hint}`;
        this.$emit("play-effect", "WrongSound");
      }
    },
    checkProtractor() {
      const q = this.gameData;
      const tol = q.tolerance ?? 2;
      const now = Math.round(this.reading);
      const moved = this.phi !== (this.lockedPhi ?? this.startPhi);
      if (!moved) {
        this.feedbackOk = false;
        this.feedback = "先拖動紅色指針轉轉看喔！";
        return;
      }
      if (this.phase === 0) {
        const t = q.turns[0];
        if (Math.abs(now - q.first) <= tol) {
          // 第一次轉對了：鎖定位置，接著做第二次
          this.lockedPhi = this.phi;
          this.phase = 1;
          this.feedbackOk = true;
          this.feedback = `第一次轉好了！指針停在${q.ring} ${now}°，接著${DIR[q.turns[1].dir]}轉 ${q.turns[1].deg}°。`;
          return;
        }
        this.finish(
          false,
          `第一次 ${DIR[t.dir]}轉 ${t.deg}°`,
          `停在${q.ring} ${now}°`,
          `從${q.ring} 0° 開始${DIR[t.dir]}轉 ${t.deg}°，看${q.ring}的數字。`
        );
        return;
      }
      const t = q.turns[1];
      const ok = Math.abs(now - q.answer) <= tol;
      this.finish(
        ok,
        `${q.text} 停在${q.ring} ${q.answer}°`,
        `停在${q.ring} ${now}°`,
        `從剛才的 ${this.lockedReading}° 再${DIR[t.dir]}轉 ${t.deg}°。`
      );
    },
    checkAnswer() {
      if (this.solved) return;
      if (this.isProtractor) {
        this.checkProtractor();
        return;
      }
      const q = this.gameData;
      if (this.choice === null) {
        this.feedbackOk = false;
        this.feedback = "請先選一個答案喔！";
        return;
      }
      const label = (k) => `${LETTERS[k]}. ${q.options[k]}`;
      const ok = LETTERS[this.choice] === q.answer;
      const hint =
        q.kind === "grids"
          ? "看指針從起點走到終點，數數看走過幾大格。"
          : q.kind === "end"
            ? `一大格是 30°，從 ${q.start} 開始${DIR[q.dir]}數 ${q.turn / 30} 大格。`
            : "一大格是 30°，數數看指針轉了幾大格。";
      this.finish(
        ok,
        `${q.text} ${label(LETTERS.indexOf(q.answer))}`,
        label(this.choice),
        hint
      );
      if (!ok) {
        // 標出選錯的選項，重新選擇後清除；能播放的題目再播一次給學生看
        this.wrongChoice = this.choice;
        if (this.canPlay) this.play();
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
  gap: 0.4rem;

  &__svg {
    flex: 1;
    min-height: 0;
    width: 100%;
    background-color: #ffffff;
    border: 3px solid #b3e5fc;
    border-radius: 16px;
    touch-action: none;
    user-select: none;
  }
}

.clock {
  &__face {
    fill: #fffde7;
    stroke: #7e57c2;
    stroke-width: 8;
  }

  &__tick {
    stroke: #90a4ae;
    stroke-width: 2;

    &--hour {
      stroke: #37474f;
      stroke-width: 4;
    }
  }

  &__num {
    font-size: 24px;
    font-weight: 700;
    fill: #37474f;
    text-anchor: middle;
    dominant-baseline: central;
    pointer-events: none;

    &--start {
      fill: #1565c0;
      font-size: 28px;
    }
  }

  &__center {
    fill: #37474f;
    stroke: #ffffff;
    stroke-width: 3;
    pointer-events: none;
  }
}

.turn {
  &__arc {
    fill: none;
    stroke: #fb8c00;
    stroke-width: 6;
    stroke-linecap: round;
    pointer-events: none;

    &--first {
      stroke: #8e24aa;
    }
  }

  &__arrow {
    fill: #fb8c00;
    pointer-events: none;
  }

  &__start {
    stroke: #1565c0;
    stroke-width: 4;
    stroke-dasharray: 10 7;
    pointer-events: none;
  }

  &__locked {
    stroke: #8e24aa;
    stroke-width: 4;
    stroke-dasharray: 6 5;
    pointer-events: none;
  }
}

.dir-hint {
  pointer-events: none;

  path {
    fill: none;
    stroke: #43a047;
    stroke-width: 6;
    stroke-linecap: round;
  }

  polygon {
    fill: #43a047;
  }
}

.hand {
  cursor: grab;

  &--static {
    cursor: default;
    pointer-events: none;
  }

  &__hit {
    stroke: transparent;
    stroke-width: 30;
    stroke-linecap: round;
  }

  &__line {
    stroke: #e53935;
    stroke-width: 8;
    stroke-linecap: round;
  }

  &__knob {
    fill: #ef9a9a;
    stroke: #c62828;
    stroke-width: 4;
  }
}

.tools {
  display: flex;
  align-items: center;
  gap: 0.6rem;

  &__how {
    flex: 1;
    min-width: 0;
    font-size: 1rem;
    font-weight: $font-bold;
    color: #6d4c41;
  }
}

.tool-btn {
  flex-shrink: 0;
  white-space: nowrap;
  padding: 0.45rem 0.9rem;
  font-size: 1.15rem;
  font-weight: $font-bold;
  color: #ffffff;
  border: none;
  border-radius: 12px;
  cursor: pointer;

  &--reset {
    background-color: #78909c;
    box-shadow: 0 3px 0 #455a64;
  }

  &--play {
    background-color: #7e57c2;
    box-shadow: 0 3px 0 #4527a0;
  }
}

.side {
  width: 17rem;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.7rem;
  min-height: 0;
  overflow-y: auto;

  &__tip {
    align-self: stretch;
    margin: 0;
    font-size: 1.1rem;
    font-weight: $font-bold;
    color: #0277bd;
  }
}

.prompt {
  align-self: stretch;
  margin: 0;
  font-size: 1.5rem;
  font-weight: $font-bold;
  line-height: 1.45;
  color: #333333;
}

.steps {
  align-self: stretch;
  margin: 0;
  padding: 0.4rem 0.6rem 0.4rem 1.8rem;
  font-size: 1.3rem;
  font-weight: $font-bold;
  line-height: 1.7;
  color: #6d4c41;
  background-color: #fffde7;
  border: 3px dashed #ffb300;
  border-radius: 12px;

  &__now {
    color: #e65100;
  }

  &__done {
    color: #2e7d32;

    &::after {
      content: " ✔";
    }
  }
}

.options {
  align-self: stretch;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.option {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.8rem;
  font-size: 1.6rem;
  font-weight: $font-bold;
  text-align: left;
  color: #ffffff;
  background-color: #26a69a;
  border: 4px solid transparent;
  border-radius: 16px;
  box-shadow: 0 5px 0 #00796b;
  cursor: pointer;

  &__letter {
    flex-shrink: 0;
    width: 2.4rem;
    height: 2.4rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #00796b;
    background-color: #ffffff;
    border-radius: 50%;
  }

  &--picked {
    background-color: #ff7043;
    box-shadow: 0 5px 0 #d84315;
  }

  &--picked &__letter {
    color: #d84315;
  }

  &--wrong {
    background-color: #ef9a9a;
    border-color: #c62828;
    box-shadow: 0 5px 0 #c62828;
  }

  &--wrong &__letter {
    color: #c62828;
  }

  &--right {
    background-color: #43a047;
    box-shadow: 0 5px 0 #1b5e20;
  }

  &:disabled {
    cursor: default;
  }
}

.feedback {
  align-self: stretch;
  margin: 0;
  font-size: 1.15rem;
  font-weight: $font-bold;
  line-height: 1.45;
  color: #c62828;

  &--ok {
    color: #2e7d32;
  }
}

@media (max-width: 1100px) {
  .side {
    width: 15rem;
    gap: 0.5rem;
  }

  .prompt {
    font-size: 1.25rem;
  }

  .steps {
    font-size: 1.1rem;
    line-height: 1.5;
  }

  .option {
    padding: 0.45rem 0.6rem;
    font-size: 1.3rem;
  }

  .option__letter {
    width: 2rem;
    height: 2rem;
  }

  .tool-btn {
    padding: 0.35rem 0.6rem;
    font-size: 1rem;
  }

  .tools__how {
    font-size: 0.85rem;
  }

  .feedback {
    font-size: 1rem;
  }
}
</style>

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
          :viewBox="`0 0 ${VIEW_W} ${VIEW_H}`"
          preserveAspectRatio="xMidYMid meet"
        >
          <g
            v-for="t in drawn"
            :key="t.id"
            class="tri"
            :class="[`tri--${t.id}`, { 'tri--selected': selected === t.id }]"
          >
            <polygon
              :points="t.points"
              class="tri__body"
              :data-tri="t.id"
              @pointerdown="startDrag($event, t.id)"
              @pointermove="onDrag"
              @pointerup="endDrag"
              @pointercancel="endDrag"
            />
            <line
              v-for="s in t.sides"
              v-show="s.focus"
              :key="`focus-${s.name}`"
              :x1="s.p[0]"
              :y1="s.p[1]"
              :x2="s.q[0]"
              :y2="s.q[1]"
              class="tri__focus-side"
            />
            <path :d="t.rightMark" class="tri__right" />
            <circle
              v-for="v in t.vertices.filter((x) => x.focus)"
              :key="`focus-${v.name}`"
              :cx="v.p[0]"
              :cy="v.p[1]"
              r="13"
              class="tri__focus-vertex"
            />
            <text
              v-for="v in t.vertices"
              :key="`label-${v.name}`"
              :x="v.label[0]"
              :y="v.label[1]"
              class="tri__letter"
              :class="{ 'tri__letter--focus': v.focus }"
            >
              {{ v.name }}
            </text>
            <text
              v-for="a in t.angleTexts"
              :key="`angle-${a.name}`"
              :x="a.p[0]"
              :y="a.p[1]"
              class="tri__angle"
            >
              {{ a.text }}
            </text>
            <text
              v-for="s in t.sides.filter((x) => x.text)"
              :key="`len-${s.name}`"
              :x="s.label[0]"
              :y="s.label[1]"
              class="tri__length"
            >
              {{ s.text }}
            </text>
            <text
              :x="t.nameAt[0]"
              :y="t.nameAt[1]"
              class="tri__name"
              pointer-events="none"
            >
              {{ t.title }}
            </text>
          </g>
        </svg>

        <div class="tools">
          <span class="tools__label">
            轉動<b :class="`tools__pick--${selected}`">{{
              selected === "abc" ? "三角形甲" : "三角形乙"
            }}</b>
          </span>
          <button
            type="button"
            class="tool"
            aria-label="向左轉"
            @click="rotate(-1)"
          >
            <svg class="tool__icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12a7 7 0 1 0 2.1-5" />
              <path d="M4 3v5h5" /></svg
            >左轉
          </button>
          <button
            type="button"
            class="tool"
            aria-label="向右轉"
            @click="rotate(1)"
          >
            右轉<svg
              class="tool__icon"
              viewBox="0 0 24 24"
              style="transform: scaleX(-1)"
              aria-hidden="true"
            >
              <path d="M5 12a7 7 0 1 0 2.1-5" />
              <path d="M4 3v5h5" />
            </svg>
          </button>
          <button type="button" class="tool tool--reset" @click="resetAll">
            還原
          </button>
        </div>
        <p class="how">
          拖動三角形可以移動，點一下選它再按左轉／右轉，疊在一起看看。
        </p>
      </div>

      <div class="side">
        <p class="prompt">{{ gameData.text }}</p>

        <template v-if="isChoice">
          <div
            class="slot"
            data-slot="answer"
            :class="{
              'slot--filled': choice,
              'slot--right': solved,
              'slot--hover': hoverSlot,
            }"
          >
            {{ choice || "？" }}
          </div>
          <p class="side__tip">點選或拖曳答案到框框裡</p>
          <div class="options">
            <button
              v-for="opt in gameData.options"
              :key="opt"
              type="button"
              class="option"
              :class="{ 'option--picked': choice === opt }"
              :data-option="opt"
              :disabled="solved"
              @pointerdown="startPick($event, opt)"
              @pointermove="onPick"
              @pointerup="endPick"
              @pointercancel="pick = null"
              @click="onOptionClick(opt)"
            >
              {{ opt }}
            </button>
          </div>
          <div
            v-if="pick && pick.moved"
            class="option option--ghost"
            :style="{ left: `${pick.x}px`, top: `${pick.y}px` }"
          >
            {{ pick.opt }}
          </div>
        </template>

        <template v-else>
          <div class="number">
            <button
              type="button"
              class="slot slot--number"
              data-cell="answer"
              data-pad-field
              aria-label="答案"
              :class="{
                'slot--filled': digits,
                'slot--right': solved,
                'slot--active': padEl,
              }"
              @click="openPad"
            >
              {{ digits || "？" }}
            </button>
            <span class="number__unit">{{ gameData.unit }}</span>
          </div>
          <FieldPad
            :field="solved ? null : padEl"
            @press="press"
            @close="padEl = null"
          />
        </template>

        <p v-if="feedback" class="feedback">{{ feedback }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import FieldPad from "./games/Common/FieldPad.vue";

const VIEW_W = 640;
const VIEW_H = 400;
const SCALE = 24; // 1 公分 = 24 單位，依 6：8：10 比例繪製
const ROTATE_STEP = 15;
const TAP_DISTANCE = 6;
const MAX_DIGITS = 3;

// 三角形甲 ABC：B 為直角，AB 向上 6 公分、BC 向右 8 公分（以公分為單位，y 向下）
const SHAPE = { A: [0, -6], B: [0, 0], C: [8, 0] };
const CENTROID = [8 / 3, -2];
// 初始位置與方向（兩個三角形方向不同）
const START = {
  abc: { x: 165, y: 205, angle: 0 },
  def: { x: 470, y: 195, angle: 120 },
};

const normalize = (value) => String(value).toUpperCase().replace(/[\s∠]/g, "");
// 邊是無方向線段：DE 與 ED 視為同一條
const sameSide = (a, b) =>
  normalize(a).split("").sort().join("") ===
  normalize(b).split("").sort().join("");

// 放開的位置是否在答案框上（用 elementsFromPoint，避免被其他覆蓋層擋住）
const overSlot = (event) =>
  document
    .elementsFromPoint(event.clientX, event.clientY)
    .some((el) => el.closest("[data-slot]"));

// 全等三角形：拖曳、旋轉三角形只是輔助觀察，不列入判分
export default {
  name: "MA4066",
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
      VIEW_W,
      VIEW_H,
      pose: {
        abc: { ...START.abc },
        def: { ...START.def },
      },
      selected: "def",
      drag: null,
      choice: "",
      digits: "",
      padEl: null,
      pick: null,
      hoverSlot: false,
      suppressClick: false,
      feedback: "",
      solved: false,
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "看圖回答問題。";
    },
    figure() {
      return (
        this.gameConfig?.Figure || {
          correspond: { A: "D", B: "E", C: "F" },
          angles: { A: 53, B: 90, C: 37, D: 53, E: 90, F: 37 },
          lengths: { AB: 6, BC: 8, AC: 10, DE: 6, EF: 8, DF: 10 },
        }
      );
    },
    isChoice() {
      return ["vertex", "side", "angle"].includes(this.gameData.kind);
    },
    // 題目問到的頂點或邊，在圖上加亮
    focus() {
      const { kind, subject } = this.gameData;
      if (kind === "side" || kind === "length") {
        return { side: subject };
      }
      return { vertex: subject };
    },
    drawn() {
      const { correspond, angles, lengths } = this.figure;
      const list = ["abc", "def"].map((id) => {
        const names =
          id === "abc"
            ? ["A", "B", "C"]
            : ["A", "B", "C"].map((n) => correspond[n]);
        const pose = this.pose[id];
        const rad = (pose.angle * Math.PI) / 180;
        const toWorld = ([cx, cy]) => {
          const lx = (cx - CENTROID[0]) * SCALE;
          const ly = (cy - CENTROID[1]) * SCALE;
          return [
            pose.x + lx * Math.cos(rad) - ly * Math.sin(rad),
            pose.y + lx * Math.sin(rad) + ly * Math.cos(rad),
          ];
        };
        const pts = ["A", "B", "C"].map((n) => toWorld(SHAPE[n]));
        const center = [pose.x, pose.y];
        const away = (p, dist) => {
          const dx = p[0] - center[0];
          const dy = p[1] - center[1];
          const len = Math.hypot(dx, dy) || 1;
          return [p[0] + (dx / len) * dist, p[1] + (dy / len) * dist];
        };
        const toward = (p, dist) => away(p, -dist);

        const vertices = names.map((name, i) => ({
          name,
          p: pts[i],
          label: away(pts[i], 24),
          focus: this.focus.vertex === name,
        }));

        const sideDefs = [
          [0, 1],
          [1, 2],
          [0, 2],
        ];
        const sides = sideDefs.map(([i, j]) => {
          const name = [names[i], names[j]].sort().join("");
          const mid = [
            (pts[i][0] + pts[j][0]) / 2,
            (pts[i][1] + pts[j][1]) / 2,
          ];
          return {
            name,
            p: pts[i],
            q: pts[j],
            label: away(mid, 26),
            // 邊長只標在三角形甲上，三角形乙要靠對應邊找
            text: id === "abc" ? `${lengths[name]} 公分` : "",
            focus: this.focus.side && sameSide(this.focus.side, name),
          };
        });

        // 直角記號（B／E 點）
        const [a, b, c] = pts;
        const unit = (from, to) => {
          const dx = to[0] - from[0];
          const dy = to[1] - from[1];
          const len = Math.hypot(dx, dy);
          return [dx / len, dy / len];
        };
        const ua = unit(b, a);
        const uc = unit(b, c);
        const m = 16;
        const p1 = [b[0] + ua[0] * m, b[1] + ua[1] * m];
        const p2 = [p1[0] + uc[0] * m, p1[1] + uc[1] * m];
        const p3 = [b[0] + uc[0] * m, b[1] + uc[1] * m];
        const rightMark = `M ${p1[0]} ${p1[1]} L ${p2[0]} ${p2[1]} L ${p3[0]} ${p3[1]}`;

        // 角度只標在三角形甲的兩個銳角內側
        const angleTexts =
          id === "abc"
            ? [
                {
                  name: names[0],
                  p: toward(a, 36),
                  text: `${angles[names[0]]}°`,
                },
                {
                  name: names[2],
                  p: toward(c, 46),
                  text: `${angles[names[2]]}°`,
                },
              ]
            : [];

        return {
          id,
          title: id === "abc" ? "甲" : "乙",
          points: pts.map((p) => p.join(",")).join(" "),
          vertices,
          sides,
          rightMark,
          angleTexts,
          nameAt: center,
        };
      });
      // 選到的三角形畫在最上層
      return list.sort(
        (p, q) => (p.id === this.selected) - (q.id === this.selected)
      );
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    // ---- 三角形：拖曳與旋轉 ----
    svgScale() {
      const ctm = this.$refs.svg?.getScreenCTM();
      return ctm ? ctm.a : 1;
    },
    startDrag(event, id) {
      this.selected = id;
      const pose = this.pose[id];
      this.drag = {
        id,
        px: event.clientX,
        py: event.clientY,
        x: pose.x,
        y: pose.y,
        scale: this.svgScale(),
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    onDrag(event) {
      if (!this.drag) return;
      const { id, px, py, x, y, scale } = this.drag;
      const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
      this.pose[id].x = clamp(
        x + (event.clientX - px) / scale,
        40,
        VIEW_W - 40
      );
      this.pose[id].y = clamp(
        y + (event.clientY - py) / scale,
        40,
        VIEW_H - 40
      );
    },
    endDrag(event) {
      if (!this.drag) return;
      const moved = Math.hypot(
        event.clientX - this.drag.px,
        event.clientY - this.drag.py
      );
      // 在原地點一下：拿到最上層，方便疊合觀察
      if (moved < TAP_DISTANCE) this.selected = this.drag.id;
      this.drag = null;
    },
    rotate(dir) {
      const pose = this.pose[this.selected];
      pose.angle = (pose.angle + dir * ROTATE_STEP + 360) % 360;
    },
    resetAll() {
      this.pose.abc = { ...START.abc };
      this.pose.def = { ...START.def };
    },

    // ---- 選項：點選或拖曳到答案框 ----
    onOptionClick(opt) {
      if (this.suppressClick) {
        this.suppressClick = false;
        return;
      }
      this.setChoice(opt);
    },
    setChoice(opt) {
      if (this.solved) return;
      this.choice = opt;
      this.feedback = "";
    },
    startPick(event, opt) {
      if (this.solved) return;
      if (event.button !== undefined && event.button !== 0) return;
      this.suppressClick = false;
      this.pick = {
        opt,
        sx: event.clientX,
        sy: event.clientY,
        x: event.clientX,
        y: event.clientY,
        moved: false,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    onPick(event) {
      if (!this.pick) return;
      this.pick.x = event.clientX;
      this.pick.y = event.clientY;
      if (
        Math.hypot(event.clientX - this.pick.sx, event.clientY - this.pick.sy) >
        TAP_DISTANCE
      ) {
        this.pick.moved = true;
      }
      this.hoverSlot = this.pick.moved && overSlot(event);
    },
    endPick(event) {
      if (!this.pick) return;
      if (this.pick.moved) {
        this.suppressClick = true;
        if (overSlot(event)) this.setChoice(this.pick.opt);
      }
      this.pick = null;
      this.hoverSlot = false;
    },

    // ---- 數字鍵盤 ----
    openPad(event) {
      if (this.solved) return;
      this.padEl = event.currentTarget;
    },
    press(key) {
      if (this.solved) return;
      this.feedback = "";
      if (key === "clear") {
        this.digits = "";
      } else if (key === "←") {
        this.digits = this.digits.slice(0, -1);
      } else if (this.digits.length < MAX_DIGITS) {
        this.digits = (this.digits + key).replace(/^0+(?=\d)/, "");
      }
    },

    // ---- 判分 ----
    hint() {
      const { kind, subject } = this.gameData;
      switch (kind) {
        case "vertex":
          return `把三角形乙轉一轉、疊到三角形甲上，看看點 ${subject} 會對到哪一點。`;
        case "side":
          return `疊在一起看看，邊 ${subject} 會和哪一條邊重疊？`;
        case "angle":
          return `疊在一起看看，∠${subject} 會和哪一個角重疊？`;
        case "degree":
          return "全等三角形的對應角一樣大，找找它在三角形甲的哪一個角。";
        default:
          return "全等三角形的對應邊一樣長，找找它在三角形甲的哪一條邊。";
      }
    },
    checkAnswer() {
      if (this.solved) return;
      const { kind, answer, unit } = this.gameData;
      const given = this.isChoice ? this.choice : this.digits;
      if (!given) {
        this.feedback = this.isChoice
          ? "請先選一個答案喔！"
          : "請先用數字鍵輸入答案喔！";
        return;
      }
      let ok;
      if (kind === "side") ok = sameSide(given, answer);
      else if (this.isChoice) ok = normalize(given) === normalize(answer);
      else ok = Number(given) === Number(answer);

      const suffix = unit ? ` ${unit}` : "";
      this.$emit("add-record", [
        `${this.gameData.text} ${answer}${suffix}`,
        `${given}${suffix}`,
        ok ? "正確" : "錯誤",
      ]);
      if (ok) {
        this.feedback = "";
        this.solved = true;
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
      } else {
        this.feedback = `不對喔！${this.hint()}`;
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
  align-items: center;
  gap: 0.3rem;

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

.tri {
  &__body {
    stroke-width: 4;
    stroke-linejoin: round;
    cursor: grab;
    touch-action: none;
  }

  &--abc &__body {
    fill: rgba(100, 181, 246, 0.7);
    stroke: #1565c0;
  }

  &--def &__body {
    fill: rgba(255, 183, 77, 0.7);
    stroke: #e65100;
  }

  &--selected &__body {
    stroke-dasharray: none;
    filter: drop-shadow(0 0 6px rgba(255, 193, 7, 0.9));
  }

  &__right {
    fill: none;
    stroke: #333333;
    stroke-width: 2.5;
    pointer-events: none;
  }

  &__focus-side {
    stroke: #d81b60;
    stroke-width: 9;
    stroke-linecap: round;
    pointer-events: none;
  }

  &__focus-vertex {
    fill: #ffeb3b;
    stroke: #d81b60;
    stroke-width: 4;
    pointer-events: none;
  }

  &__letter,
  &__angle,
  &__length,
  &__name {
    text-anchor: middle;
    dominant-baseline: central;
    font-weight: 700;
    pointer-events: none;
    paint-order: stroke;
    stroke: #ffffff;
    stroke-width: 5px;
    stroke-linejoin: round;
  }

  &__letter {
    font-size: 28px;
    fill: #0d47a1;

    &--focus {
      fill: #d81b60;
      font-size: 34px;
    }
  }

  &--def &__letter:not(.tri__letter--focus) {
    fill: #bf360c;
  }

  &__angle {
    font-size: 20px;
    fill: #4a148c;
  }

  &__length {
    font-size: 20px;
    fill: #1b5e20;
  }

  &__name {
    font-size: 26px;
    fill: #37474f;
    stroke-width: 4px;
  }
}

.tools {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &__label {
    font-size: 1.2rem;
    font-weight: $font-bold;
    color: #37474f;

    b {
      margin-left: 0.3rem;
    }
  }

  &__pick--abc {
    color: #1565c0;
  }

  &__pick--def {
    color: #e65100;
  }
}

.tool {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.45rem 1rem;
  font-size: 1.2rem;
  font-weight: $font-bold;
  color: #ffffff;
  background-color: #7e57c2;
  border: none;
  border-radius: 12px;
  box-shadow: 0 3px 0 #4527a0;
  cursor: pointer;

  &__icon {
    width: 1.3em;
    height: 1.3em;
    fill: none;
    stroke: currentColor;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  &--reset {
    background-color: #78909c;
    box-shadow: 0 3px 0 #455a64;
  }

  &:active {
    transform: translateY(2px);
    box-shadow: none;
  }
}

.how {
  margin: 0;
  font-size: 1.05rem;
  color: #6d4c41;
}

.side {
  width: 18rem;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.7rem;
  min-height: 0;
  overflow-y: auto;

  &__tip {
    margin: 0;
    font-size: 1.05rem;
    color: #6d4c41;
  }
}

.prompt {
  align-self: stretch;
  margin: 0;
  font-size: 1.6rem;
  font-weight: $font-bold;
  line-height: 1.45;
  color: #333333;
}

.slot {
  min-width: 7rem;
  height: 4rem;
  padding: 0 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.2rem;
  font-weight: $font-bold;
  color: #9e9e9e;
  background-color: #ffffff;
  border: 4px dashed #90a4ae;
  border-radius: 14px;

  &--filled {
    color: #0d47a1;
    border-style: solid;
    border-color: #42a5f5;
  }

  &--hover {
    background-color: #fff9c4;
    border-color: #ffb300;
  }

  &--right {
    color: #1b5e20;
    background-color: #e8f5e9;
    border-color: #43a047;
  }

  &--number {
    min-width: 6rem;
  }
}

.number {
  display: flex;
  align-items: center;
  gap: 0.6rem;

  &__unit {
    font-size: 1.8rem;
    font-weight: $font-bold;
    color: #333333;
  }
}

.options {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.7rem;
}

.option {
  min-width: 4.8rem;
  height: 4rem;
  padding: 0 0.8rem;
  font-size: 2rem;
  font-weight: $font-bold;
  color: #ffffff;
  background-color: #26a69a;
  border: none;
  border-radius: 14px;
  box-shadow: 0 4px 0 #00796b;
  cursor: pointer;
  touch-action: none;
  user-select: none;
  white-space: nowrap;

  &--picked {
    background-color: #ff7043;
    box-shadow: 0 4px 0 #d84315;
  }

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }

  &--ghost {
    position: fixed;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    transform: translate(-50%, -50%);
    pointer-events: none;
    opacity: 0.9;
  }
}

.feedback {
  align-self: stretch;
  margin: 0;
  font-size: 1.2rem;
  font-weight: $font-bold;
  line-height: 1.45;
  color: #c62828;
}

@media (max-width: 1100px) {
  .side {
    width: 15.5rem;
    gap: 0.5rem;
  }

  .prompt {
    font-size: 1.35rem;
  }

  .slot {
    height: 3.4rem;
    font-size: 1.9rem;
  }

  .option {
    min-width: 4.2rem;
    height: 3.4rem;
    font-size: 1.7rem;
  }

  .tool {
    padding: 0.35rem 0.7rem;
    font-size: 1.05rem;
  }

  .tools__label,
  .how {
    font-size: 0.95rem;
  }

  .feedback {
    font-size: 1.05rem;
    line-height: 1.35;
  }
}
// 答案框可以點：點了在旁邊出現數字板
.slot {
  cursor: pointer;

  &--active {
    border-style: solid;
    border-color: #ffb300;
    box-shadow: 0 0 0 4px #ffe082;
  }
}
</style>

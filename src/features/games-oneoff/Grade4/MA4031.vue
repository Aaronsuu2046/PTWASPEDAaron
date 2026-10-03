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
          :class="{ 'board__svg--pick': isPick }"
          :viewBox="`0 0 ${VIEW_W} ${VIEW_H}`"
          preserveAspectRatio="xMidYMid meet"
          @pointerdown="startMark"
          @pointermove="moveMark"
          @pointerup="endMark"
          @pointercancel="endMark"
        >
          <g :transform="`translate(${CX} ${CY})`">
            <ProtractorTool :r="R" />

            <g v-if="angleFigure" class="angle">
              <path :d="angleFigure.arc" class="angle__arc" />
              <line
                x1="0"
                y1="0"
                :x2="angleFigure.start[0]"
                :y2="angleFigure.start[1]"
                class="angle__ray angle__ray--start"
              />
              <line
                x1="0"
                y1="0"
                :x2="angleFigure.end[0]"
                :y2="angleFigure.end[1]"
                class="angle__ray angle__ray--end"
              />
              <circle cx="0" cy="0" r="6" class="angle__vertex" />
            </g>

            <g
              v-if="mark"
              class="mark"
              :class="{ 'mark--right': solved }"
              :transform="`translate(${mark.x} ${mark.y})`"
            >
              <circle r="15" class="mark__ring" />
              <circle r="4" class="mark__dot" />
            </g>
          </g>
        </svg>
        <p v-if="isPick" class="how">
          點一下量角器上的位置，會出現圓圈記號；也可以按住拖動記號。
        </p>
        <p v-else class="how">
          <span class="how__start">綠色</span>是起始邊，<span class="how__end"
            >紫色</span
          >是另一邊。
        </p>
      </div>

      <div class="side">
        <p class="prompt">{{ gameData.text }}</p>

        <template v-if="gameData.kind === 'ring'">
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

        <p v-if="angleFigure && isPick" class="side__tip">
          <span class="how__start">綠色</span>是起始邊，<span class="how__end"
            >紫色</span
          >是另一邊。
        </p>

        <p v-if="isPick" class="side__tip side__tip--big">
          {{ mark ? "選好了就按「送出答案」" : "在量角器上點一下" }}
        </p>

        <p v-if="feedback" class="feedback">{{ feedback }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import ProtractorTool from "./games/Geometry/ProtractorTool.vue";
import { polar, protractorPart } from "./games/Geometry/protractor.js";

const VIEW_W = 600;
const VIEW_H = 320;
const CX = 300;
const CY = 295;
const R = 250;
const TAP_DISTANCE = 6;
// 點到 0 刻度或指定刻度時，允許偏離的角度
const ZERO_TOLERANCE = 9;
const SPOT_TOLERANCE = 4;

const PART_NAMES = {
  center: "中心點",
  outer: "外圈刻度",
  inner: "內圈刻度",
  outerZero: "外圈刻度 0",
  innerZero: "內圈刻度 0",
  none: "量角器的其他地方",
};
const PART_HINTS = {
  center: "中心點在量角器底邊（0° 線）的正中間喔！",
  outerZero: "外圈刻度是最外面那一圈，0 在左邊的最下面。",
  innerZero: "內圈刻度在外圈的裡面，0 在右邊的最下面。",
};
// 0 刻度目標：在哪一圈、靠哪一端（極角 0° 在右、180° 在左）
const ZERO_TARGETS = {
  outerZero: { part: "outer", deg: 180 },
  innerZero: { part: "inner", deg: 0 },
};
const RING_PART = { 內圈: "inner", 外圈: "outer" };

// 量角器座標的極角（0° 在右、逆時針；底邊下方一點點算在 0° 或 180° 附近）
const polarDeg = (x, y) => {
  const deg = (Math.atan2(-y, x) * 180) / Math.PI;
  return deg < -90 ? deg + 360 : deg;
};
const SIDE_NAME = { right: "右", left: "左" };

// 放開的位置是否在答案框上（用 elementsFromPoint，避免被其他覆蓋層擋住）
const overSlot = (event) =>
  document
    .elementsFromPoint(event.clientX, event.clientY)
    .some((el) => el.closest("[data-slot]"));

// 認識量角器：關卡 1～3 點選部位（2、3 要點到 0 刻度），關卡 4 判斷讀哪一圈，關卡 5 在量角器上點出角度
export default {
  name: "MA4031",
  components: { ProtractorTool },
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
      CX,
      CY,
      R,
      mark: null,
      dragging: false,
      choice: "",
      pick: null,
      hoverSlot: false,
      suppressClick: false,
      feedback: "",
      solved: false,
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "在量角器上找找看。";
    },
    // 關卡 1～3 點部位、關卡 5 點刻度：都在量角器上放圓圈記號
    isPick() {
      return this.gameData.kind === "part" || this.gameData.kind === "spot";
    },
    // 起始邊沿 0° 線（向右或向左），另一邊依角度畫出
    angleFigure() {
      const { start, angle } = this.gameData;
      if (!start) return null;
      const startDeg = start === "right" ? 0 : 180;
      const endDeg = start === "right" ? angle : 180 - angle;
      const len = R * 1.12;
      const arcR = 46;
      const a = polar(startDeg, arcR);
      const b = polar(endDeg, arcR);
      // 從起始邊掃到另一邊：向右起算為逆時針（SVG sweep 0），向左起算為順時針
      const sweep = start === "right" ? 0 : 1;
      return {
        start: polar(startDeg, len),
        end: polar(endDeg, len),
        arc: `M 0 0 L ${a[0]} ${a[1]} A ${arcR} ${arcR} 0 0 ${sweep} ${b[0]} ${b[1]} Z`,
      };
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    // ---- 關卡 1～3、5：在量角器上放記號 ----
    toLocal(event) {
      const svg = this.$refs.svg;
      const pt = svg.createSVGPoint();
      pt.x = event.clientX;
      pt.y = event.clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      return { x: p.x - CX, y: p.y - CY };
    },
    startMark(event) {
      if (!this.isPick || this.solved) return;
      if (event.button !== undefined && event.button !== 0) return;
      this.mark = this.toLocal(event);
      this.dragging = true;
      this.feedback = "";
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    moveMark(event) {
      if (!this.dragging) return;
      const p = this.toLocal(event);
      this.mark = {
        x: Math.min(CX - 10, Math.max(10 - CX, p.x)),
        y: Math.min(VIEW_H - CY - 5, Math.max(10 - CY, p.y)),
      };
    },
    endMark() {
      this.dragging = false;
    },

    // ---- 關卡 4：選項點選或拖曳到答案框 ----
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

    // ---- 判分 ----
    judge() {
      const q = this.gameData;
      const side = SIDE_NAME[q.start];
      if (q.kind === "part") {
        if (!this.mark) return { empty: "先在量角器上點一下喔！" };
        const part = protractorPart(this.mark.x, this.mark.y, R);
        const zero = ZERO_TARGETS[q.target];
        if (!zero) {
          return {
            ok: part === q.target,
            expected: PART_NAMES[q.target],
            given: PART_NAMES[part],
            hint: `你點的是${PART_NAMES[part]}。${PART_HINTS[q.target]}`,
          };
        }
        // 0 刻度：要點在對的那一圈，而且在 0 的那一端
        const deg = polarDeg(this.mark.x, this.mark.y);
        const atZero = Math.abs(deg - zero.deg) <= ZERO_TOLERANCE;
        const ok = part === zero.part && atZero;
        const given =
          part === zero.part
            ? `${PART_NAMES[part]}（不是 0）`
            : PART_NAMES[part];
        return {
          ok,
          expected: PART_NAMES[q.target],
          given: ok ? PART_NAMES[q.target] : given,
          hint:
            part === zero.part
              ? `你點的是${PART_NAMES[part]}，但不是 0。${PART_HINTS[q.target]}`
              : `你點的是${PART_NAMES[part]}。${PART_HINTS[q.target]}`,
        };
      }
      if (q.kind === "ring") {
        if (!this.choice) return { empty: "請先選一個答案喔！" };
        return {
          ok: this.choice === q.answer,
          expected: q.answer,
          given: this.choice,
          hint: "看綠色的起始邊對準哪一邊的 0°：對準右邊的 0° 讀內圈，對準左邊的 0° 讀外圈。",
        };
      }
      // 關卡 5：點在指定那一圈的指定刻度附近
      if (!this.mark) return { empty: "先在量角器上點出刻度喔！" };
      const part = protractorPart(this.mark.x, this.mark.y, R);
      const expected = `${q.ring} ${q.answer}°`;
      if (part !== "inner" && part !== "outer") {
        return {
          ok: false,
          expected,
          given: PART_NAMES[part],
          hint: `要點在刻度上喔！起始邊對準${side}邊的 0°，沿著${q.ring}數到紫色的邊。`,
        };
      }
      const deg = polarDeg(this.mark.x, this.mark.y);
      const ring = part === "inner" ? "內圈" : "外圈";
      const reading = Math.round(part === "inner" ? deg : 180 - deg);
      const nearAnswer = (value) =>
        Math.abs(value - q.answer) <= SPOT_TOLERANCE;
      const ok = part === RING_PART[q.ring] && nearAnswer(reading);
      return {
        ok,
        expected,
        given: `${ring} ${reading}°`,
        hint:
          part !== RING_PART[q.ring]
            ? `你點到${ring}了！起始邊對準${side}邊的 0°，要讀${q.ring}的數字。`
            : `起始邊對準${side}邊的 0°，沿著${q.ring}數到紫色的邊。`,
      };
    },
    checkAnswer() {
      if (this.solved) return;
      const result = this.judge();
      if (result.empty) {
        this.feedback = result.empty;
        return;
      }
      this.$emit("add-record", [
        `${this.gameData.text} ${result.expected}`,
        result.given,
        result.ok ? "正確" : "錯誤",
      ]);
      if (result.ok) {
        this.feedback = "";
        this.solved = true;
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
      } else {
        this.feedback = `不對喔！${result.hint}`;
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

    &--pick {
      cursor: crosshair;
    }
  }
}

.angle {
  pointer-events: none;

  &__arc {
    fill: rgba(255, 152, 0, 0.45);
    stroke: #ef6c00;
    stroke-width: 2.5;
  }

  &__ray {
    stroke-width: 6;
    stroke-linecap: round;

    &--start {
      stroke: #2e7d32;
    }

    &--end {
      stroke: #8e24aa;
    }
  }

  &__vertex {
    fill: #37474f;
  }
}

.mark {
  pointer-events: none;

  &__ring {
    fill: rgba(255, 235, 59, 0.55);
    stroke: #d81b60;
    stroke-width: 4;
  }

  &__dot {
    fill: #d81b60;
  }

  &--right &__ring {
    fill: rgba(129, 199, 132, 0.6);
    stroke: #2e7d32;
  }

  &--right &__dot {
    fill: #2e7d32;
  }
}

.how {
  margin: 0;
  font-size: 1.1rem;
  font-weight: $font-bold;
  color: #6d4c41;

  &__start {
    color: #2e7d32;
  }

  &__end {
    color: #8e24aa;
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
    margin: 0;
    font-size: 1.05rem;
    color: #6d4c41;

    &--big {
      align-self: stretch;
      font-size: 1.3rem;
      font-weight: $font-bold;
      color: #0277bd;
    }
  }
}

.prompt {
  align-self: stretch;
  margin: 0;
  font-size: 1.7rem;
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
}

.options {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.7rem;
}

.option {
  min-width: 5.5rem;
  height: 4rem;
  padding: 0 0.9rem;
  font-size: 1.9rem;
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
    width: 15rem;
    gap: 0.5rem;
  }

  .prompt {
    font-size: 1.4rem;
  }

  .slot {
    height: 3.4rem;
    font-size: 1.9rem;
  }

  .option {
    min-width: 4.8rem;
    height: 3.4rem;
    font-size: 1.6rem;
  }

  .how {
    font-size: 0.95rem;
  }

  .feedback {
    font-size: 1.05rem;
    line-height: 1.35;
  }
}
</style>

<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <p class="hint-text">
        <FractionText :text="hintText" />
      </p>

      <div class="number-line">
        <svg
          ref="svg"
          class="number-line__svg"
          :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
          role="img"
          :aria-label="`0 到 ${range} 的分數數線，一格是 ${denominator} 分之 1`"
          @pointermove="onDrag"
          @pointerup="endDrag"
          @pointerleave="endDrag"
        >
          <line
            :x1="LEFT - 20"
            :y1="LINE_Y"
            :x2="RIGHT + 20"
            :y2="LINE_Y"
            class="number-line__axis"
          />
          <line
            v-for="tick in ticks"
            :key="tick.index"
            :x1="tick.x"
            :y1="LINE_Y - (tick.whole ? 22 : 14)"
            :x2="tick.x"
            :y2="LINE_Y + (tick.whole ? 22 : 14)"
            class="number-line__tick"
            :class="{ 'number-line__tick--whole': tick.whole }"
          />
          <text
            v-for="tick in wholeTicks"
            :key="`label-${tick.index}`"
            :x="tick.x"
            :y="LINE_Y + 62"
            class="number-line__label"
          >
            {{ tick.index / denominator }}
          </text>

          <!-- 填答題：在目標刻度上方標示箭頭 -->
          <path
            v-if="!isDuck"
            :d="`M ${targetX} ${LINE_Y - 30} l -12 -22 h 24 Z`"
            class="number-line__marker"
          />

          <!-- 拖曳題：小鴨停在刻度上 -->
          <g
            v-if="isDuck"
            class="duck"
            :class="{ 'duck--wrong': duckWrong, 'duck--dragging': dragging }"
            :transform="`translate(${tickX(duckIndex)} ${LINE_Y - 44})`"
            @pointerdown="startDrag"
          >
            <ellipse cx="0" cy="8" rx="30" ry="20" class="duck__body" />
            <circle cx="20" cy="-14" r="14" class="duck__body" />
            <path d="M 32 -16 l 14 4 l -14 5 Z" class="duck__beak" />
            <circle cx="24" cy="-17" r="2.6" class="duck__eye" />
            <path d="M 0 30 V 40" class="duck__leg" />
          </g>
        </svg>

        <!-- 填答題：分數空格放在目標刻度正下方 -->
        <div
          v-if="!isDuck"
          class="answer-box"
          :style="{ left: `${(targetX / WIDTH) * 100}%` }"
        >
          <template v-for="part in ['numerator', 'denominator']" :key="part">
            <span v-if="part === 'denominator'" class="answer-box__line"></span>
            <button
              type="button"
              class="blank"
              :class="{
                'blank--active': activeKey === part,
                'blank--wrong': wrongKeys.includes(part),
              }"
              @click="openNumPad(part, $event)"
            >
              {{ inputs[part] }}
            </button>
          </template>
        </div>
      </div>
    </div>

    <FloatNumPad
      v-if="activeKey"
      :component-config="numPadPosition"
      @button-clicked="onNumPadClick"
    />
  </div>
</template>

<script>
import { defineAsyncComponent } from "vue";
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import FractionText from "@/components/FractionText.vue";

const MAX_DIGITS = 2;

export default {
  name: "MA4166",
  components: {
    FractionText,
    FloatNumPad: defineAsyncComponent(
      () => import("@/components/FloatNumPad.vue")
    ),
  },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      WIDTH: 1000,
      HEIGHT: 200,
      LEFT: 60,
      RIGHT: 940,
      LINE_Y: 100,
      inputs: { numerator: "", denominator: "" },
      activeKey: "",
      wrongKeys: [],
      numPadPosition: { top: 0, left: 0 },
      duckIndex: 0,
      duckWrong: false,
      dragging: false,
      answered: false,
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "□裡的數是多少？填填看";
    },
    isDuck() {
      return this.gameData.mode === "duck";
    },
    denominator() {
      return this.gameData.denominator;
    },
    range() {
      return this.gameData.range;
    },
    target() {
      return this.gameData.target;
    },
    tickCount() {
      return this.denominator * this.range;
    },
    ticks() {
      return Array.from({ length: this.tickCount + 1 }, (_, index) => ({
        index,
        x: this.tickX(index),
        whole: index % this.denominator === 0,
      }));
    },
    wholeTicks() {
      return this.ticks.filter((tick) => tick.whole);
    },
    targetX() {
      return this.tickX(this.target);
    },
    unitFraction() {
      return `\\frac{1}{${this.denominator}}`;
    },
    hintText() {
      const scale =
        this.gameData.hint === "unit"
          ? `一格是 ${this.unitFraction}`
          : `這是一條以 ${this.unitFraction} 為刻度的分數數線`;
      if (!this.isDuck) return scale;
      return `${scale}，把小鴨移到 \\frac{${this.target}}{${this.denominator}}`;
    },
    answerText() {
      return `${this.target}/${this.denominator}`;
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    tickX(index) {
      return this.LEFT + ((this.RIGHT - this.LEFT) * index) / this.tickCount;
    },
    openNumPad(key, event) {
      const rect = event.currentTarget.getBoundingClientRect();
      this.activeKey = key;
      this.numPadPosition = {
        top: `${rect.top + window.scrollY}px`,
        left: `${rect.right + window.scrollX + 10}px`,
      };
    },
    onNumPadClick(label) {
      const key = this.activeKey;
      if (!key) return;
      if (label === "關閉") {
        this.activeKey = "";
        return;
      }
      this.wrongKeys = this.wrongKeys.filter((k) => k !== key);
      if (label === "清除") {
        this.inputs[key] = "";
        return;
      }
      if (label === "." || this.inputs[key].length >= MAX_DIGITS) return;
      this.inputs[key] += String(label);
    },
    // 小鴨拖曳：依指標位置換算成最近的刻度，永遠停在刻度上
    startDrag(event) {
      this.dragging = true;
      this.duckWrong = false;
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    onDrag(event) {
      if (!this.dragging) return;
      const rect = this.$refs.svg.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * this.WIDTH;
      const ratio = (x - this.LEFT) / (this.RIGHT - this.LEFT);
      const index = Math.round(ratio * this.tickCount);
      this.duckIndex = Math.min(this.tickCount, Math.max(0, index));
    },
    endDrag() {
      this.dragging = false;
    },
    checkAnswer() {
      if (this.answered) return;
      this.activeKey = "";
      let isCorrect;
      let userAnswer;
      if (this.isDuck) {
        // 以刻度編號判定，避免分數換算成小數後的浮點誤差
        isCorrect = this.duckIndex === this.target;
        this.duckWrong = !isCorrect;
        userAnswer = `${this.duckIndex}/${this.denominator}`;
      } else {
        const numerator = parseInt(this.inputs.numerator, 10);
        const denominator = parseInt(this.inputs.denominator, 10);
        this.wrongKeys = [];
        if (numerator !== this.target) this.wrongKeys.push("numerator");
        if (denominator !== this.denominator)
          this.wrongKeys.push("denominator");
        isCorrect = this.wrongKeys.length === 0;
        userAnswer = `${this.inputs.numerator || "空白"}/${
          this.inputs.denominator || "空白"
        }`;
      }
      this.$emit("add-record", [
        this.answerText,
        userAnswer,
        isCorrect ? "正確" : "錯誤",
      ]);
      if (isCorrect) {
        this.answered = true;
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
      } else {
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
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small;
}

.hint-text {
  margin: 0;
  font-size: 1.6rem;
  font-weight: $font-bold;
  text-align: center;

  // KaTeX 預設分數偏小，放大讓提示中的分數容易閱讀
  :deep(.katex) {
    font-size: 1.5em;
  }
}

.number-line {
  position: relative;
  width: 100%;
  max-width: 900px;
  padding-bottom: 7rem;

  &__svg {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
    touch-action: none;
  }

  &__axis {
    stroke: #333333;
    stroke-width: 4;
  }

  &__tick {
    stroke: #333333;
    stroke-width: 3;

    &--whole {
      stroke-width: 5;
    }
  }

  &__label {
    font-size: 40px;
    font-weight: bold;
    text-anchor: middle;
    fill: #222222;
  }

  &__marker {
    fill: #e53935;
  }
}

.answer-box {
  position: absolute;
  top: 58%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;

  &__line {
    display: block;
    width: 3.4rem;
    border-top: 0.25rem solid #000000;
  }
}

.blank {
  min-width: 2.8rem;
  height: 2.8rem;
  padding: 0 0.3rem;
  font-size: 1.6rem;
  font-weight: bold;
  color: #c62828;
  background-color: #ffffff;
  border: 3px solid #bdbdbd;
  border-radius: 6px;
  cursor: pointer;

  &--active {
    border-color: #1e88e5;
  }

  &--wrong {
    border-color: #e53935;
    background-color: #ffebee;
  }
}

.duck {
  cursor: grab;

  &--dragging {
    cursor: grabbing;
  }

  &__body {
    fill: #ffd54f;
    stroke: #f9a825;
    stroke-width: 3;
  }

  &__beak {
    fill: #fb8c00;
  }

  &__eye {
    fill: #222222;
  }

  &__leg {
    stroke: #fb8c00;
    stroke-width: 4;
  }

  &--wrong .duck__body {
    stroke: #e53935;
    stroke-width: 5;
  }
}
</style>

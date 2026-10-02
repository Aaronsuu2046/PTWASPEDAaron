<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <p class="hint-text">{{ hintText }}</p>

      <div class="number-line">
        <svg
          ref="svg"
          class="number-line__svg"
          :class="{ 'number-line__svg--mark': isMark }"
          :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
          role="img"
          :aria-label="`${startLabel} 到 ${endLabel} 的小數數線，每小格 0.1`"
          @pointerdown="startMark"
          @pointermove="moveMark"
          @pointerup="endMark"
          @pointercancel="endMark"
        >
          <!-- 數線與尾端箭頭 -->
          <line
            :x1="LEFT - 24"
            :y1="LINE_Y"
            :x2="RIGHT + 40"
            :y2="LINE_Y"
            class="number-line__axis"
          />
          <path
            :d="`M ${RIGHT + 58} ${LINE_Y} l -22 -12 v 24 Z`"
            class="number-line__arrow"
          />
          <line
            v-for="tick in ticks"
            :key="tick.value"
            :x1="tick.x"
            :y1="LINE_Y - (tick.whole ? 24 : tick.half ? 18 : 13)"
            :x2="tick.x"
            :y2="LINE_Y + (tick.whole ? 24 : tick.half ? 18 : 13)"
            class="number-line__tick"
            :class="{ 'number-line__tick--whole': tick.whole }"
          />
          <text
            v-for="tick in wholeTicks"
            :key="`label-${tick.value}`"
            :x="tick.x"
            :y="LINE_Y + 62"
            class="number-line__label"
          >
            {{ tick.value / 10 }}
          </text>
          <text
            v-if="isDuck"
            :x="RIGHT + 40"
            :y="LINE_Y - 32"
            class="number-line__unit"
          >
            (公分)
          </text>

          <!-- 讀數題：箭頭與 □ 指出要讀的刻度 -->
          <g
            v-if="isRead"
            :transform="`translate(${valueX(gameData.target)} ${LINE_Y - 30})`"
          >
            <path d="M 0 0 l -13 -24 h 26 Z" class="number-line__pointer" />
            <rect
              x="-22"
              y="-72"
              width="44"
              height="44"
              rx="6"
              class="number-line__box"
            />
          </g>

          <!-- 標示題：學生放上的紅旗 -->
          <g
            v-if="isMark && markValue !== null"
            class="flag"
            :class="{ 'flag--wrong': wrong, 'flag--correct': answered }"
            :transform="`translate(${valueX(markValue)} ${LINE_Y})`"
          >
            <line x1="0" y1="0" x2="0" y2="-78" class="flag__pole" />
            <path d="M 0 -78 l 40 13 l -40 13 Z" class="flag__cloth" />
            <!-- 答對後才顯示數值，避免學生拖到數字對了就交 -->
            <text v-if="answered" x="0" y="-88" class="flag__label">
              {{ markValue / 10 }}
            </text>
          </g>

          <!-- 小鴨題：紅點起點，答對後小鴨走到答案位置 -->
          <template v-if="isDuck">
            <circle
              :cx="valueX(gameData.origin)"
              :cy="LINE_Y"
              r="11"
              class="number-line__origin"
            />
            <g
              class="duck"
              :style="{
                transform: `translate(${valueX(duckValue)}px, ${
                  LINE_Y - 46
                }px)`,
              }"
            >
              <ellipse cx="0" cy="8" rx="28" ry="19" class="duck__body" />
              <circle
                :cx="duckFacing * 18"
                cy="-13"
                r="13"
                class="duck__body"
              />
              <path
                :d="`M ${duckFacing * 29} -15 l ${duckFacing * 13} 4 l ${
                  duckFacing * -13
                } 5 Z`"
                class="duck__beak"
              />
              <circle
                :cx="duckFacing * 22"
                cy="-16"
                r="2.5"
                class="duck__eye"
              />
            </g>
          </template>
        </svg>
      </div>

      <!-- 填答：讀數題與小鴨題 -->
      <template v-if="!isMark">
        <div class="answer-row">
          <span v-if="isRead" class="answer-row__label">□ =</span>
          <span v-else class="answer-row__label">答：</span>
          <button
            type="button"
            class="answer-box"
            :class="{
              'answer-box--active': padEl && !answered,
              'answer-box--wrong': wrong,
              'answer-box--correct': answered,
            }"
            data-pad-field
            aria-label="答案"
            @click="openPad"
          >
            {{ input }}
          </button>
          <span v-if="isDuck" class="answer-row__label">公分</span>
          <span v-if="isDuck && answered" class="equation">
            做法：{{ gameData.equation }}
          </span>
        </div>
        <!-- 點答案格才出現數字板（小數題有小數點） -->
        <FieldPad
          :field="answered ? null : padEl"
          decimal
          @press="(key) => press(key === 'clear' ? '清除' : key)"
          @close="padEl = null"
        />
      </template>
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import FieldPad from "./games/Common/FieldPad.vue";

const MAX_LENGTH = 4;
// 小鴨題答對後，讓小鴨走到答案並顯示做法，再進下一題
const DUCK_REVEAL_MS = 2500;

// 小數數線：數值一律以「十分之一」為單位的整數保存，避免浮點誤差
// mode：read 讀出箭頭所指的小數；mark 在數線上標出小數；duck 小鴨移動後的位置
export default {
  name: "MA4156",
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
      WIDTH: 1000,
      HEIGHT: 190,
      LEFT: 50,
      RIGHT: 890,
      LINE_Y: 105,
      padEl: null,
      input: "",
      markValue: null,
      dragging: false,
      duckValue: this.gameData.origin ?? 0,
      wrong: false,
      answered: false,
      revealTimer: null,
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "□表示的刻度各是多少？用小數填填看";
    },
    isRead() {
      return this.gameData.mode === "read";
    },
    isMark() {
      return this.gameData.mode === "mark";
    },
    isDuck() {
      return this.gameData.mode === "duck";
    },
    startLabel() {
      return this.gameData.start / 10;
    },
    endLabel() {
      return this.gameData.end / 10;
    },
    ticks() {
      const { start, end } = this.gameData;
      return Array.from({ length: end - start + 1 }, (_, i) => {
        const value = start + i;
        return {
          value,
          x: this.valueX(value),
          whole: value % 10 === 0,
          half: value % 10 === 5,
        };
      });
    },
    wholeTicks() {
      return this.ticks.filter((tick) => tick.whole);
    },
    hintText() {
      if (this.isRead) return "每一小格是 0.1，箭頭指的刻度是多少？";
      if (this.isMark)
        return `在數線上標出 ${this.gameData.answer}：點數線放上紅旗，可以拖曳調整`;
      return `${this.gameData.question}紅點在 ${this.gameData.origin / 10}。`;
    },
    duckFacing() {
      return this.gameData.target < (this.gameData.origin ?? 0) ? -1 : 1;
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
    clearTimeout(this.revealTimer);
  },
  methods: {
    valueX(value) {
      const { start, end } = this.gameData;
      return (
        this.LEFT + ((this.RIGHT - this.LEFT) * (value - start)) / (end - start)
      );
    },
    // 指標位置換算成最近的 0.1 刻度
    valueAt(event) {
      const rect = this.$refs.svg.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * this.WIDTH;
      const { start, end } = this.gameData;
      const ratio = (x - this.LEFT) / (this.RIGHT - this.LEFT);
      const value = Math.round(start + ratio * (end - start));
      return Math.min(end, Math.max(start, value));
    },
    // 點一下或拖曳都會把紅旗放到最近的刻度
    startMark(event) {
      if (!this.isMark || this.answered) return;
      this.dragging = true;
      this.wrong = false;
      this.markValue = this.valueAt(event);
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    moveMark(event) {
      if (!this.dragging) return;
      this.markValue = this.valueAt(event);
    },
    endMark() {
      this.dragging = false;
    },
    openPad(event) {
      if (this.answered) return;
      this.padEl = event.currentTarget;
    },
    press(key) {
      if (this.answered) return;
      this.wrong = false;
      if (key === "清除") {
        this.input = "";
      } else if (key === "←") {
        this.input = this.input.slice(0, -1);
      } else if (this.input.length < MAX_LENGTH) {
        if (key === "." && this.input.includes(".")) return;
        this.input = key === "." && this.input === "" ? "0." : this.input + key;
      }
    },
    checkAnswer() {
      if (this.answered) return;
      let isCorrect;
      let userAnswer;
      if (this.isMark) {
        isCorrect = this.markValue === this.gameData.target;
        userAnswer =
          this.markValue === null ? "未標示" : String(this.markValue / 10);
      } else {
        const value = Number(this.input);
        isCorrect =
          this.input !== "" &&
          !Number.isNaN(value) &&
          Math.abs(value * 10 - this.gameData.target) < 1e-9;
        userAnswer = this.input || "未作答";
      }
      this.wrong = !isCorrect;
      this.$emit("add-record", [
        this.gameData.answer,
        userAnswer,
        isCorrect ? "正確" : "錯誤",
      ]);
      if (!isCorrect) {
        this.$emit("play-effect", "WrongSound");
        return;
      }
      this.answered = true;
      this.$emit("play-effect", "CorrectSound");
      if (this.isDuck) {
        this.duckValue = this.gameData.target;
        this.revealTimer = setTimeout(
          () => this.$emit("next-question"),
          DUCK_REVEAL_MS
        );
      } else {
        this.$emit("next-question");
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
  gap: 1rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small;
}

.hint-text {
  margin: 0;
  padding: 0.5rem 1.2rem;
  font-size: 1.6rem;
  font-weight: $font-bold;
  text-align: center;
  line-height: 1.5;
  background-color: #fff8e1;
  border: 3px solid #ffcc80;
  border-radius: 14px;
}

.number-line {
  width: 100%;
  max-width: 920px;

  &__svg {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
    touch-action: none;
    user-select: none;

    &--mark {
      cursor: pointer;
    }
  }

  &__axis {
    stroke: #333333;
    stroke-width: 4;
  }

  &__arrow {
    fill: #333333;
  }

  &__tick {
    stroke: #333333;
    stroke-width: 3;

    &--whole {
      stroke-width: 5;
    }
  }

  &__label {
    font-size: 38px;
    font-weight: bold;
    text-anchor: middle;
    fill: #222222;
  }

  &__unit {
    font-size: 26px;
    font-weight: bold;
    text-anchor: middle;
    fill: #555555;
  }

  &__pointer {
    fill: #1e88e5;
  }

  &__box {
    fill: #ffffff;
    stroke: #1e88e5;
    stroke-width: 4;
  }

  &__origin {
    fill: #e53935;
  }
}

.flag {
  pointer-events: none;

  &__pole {
    stroke: #6d4c41;
    stroke-width: 5;
  }

  &__cloth {
    fill: #e53935;
  }

  &__label {
    font-size: 30px;
    font-weight: bold;
    text-anchor: middle;
    fill: #c62828;
  }

  &--wrong .flag__cloth {
    fill: #9e9e9e;
  }

  &--wrong .flag__label {
    fill: #9e9e9e;
  }

  &--correct .flag__cloth {
    fill: #43a047;
  }

  &--correct .flag__label {
    fill: #2e7d32;
  }
}

.duck {
  transition: transform 1.2s ease-in-out;

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
}

.answer-row {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  font-size: 2rem;
  font-weight: $font-bold;

  &__label {
    white-space: nowrap;
  }
}

.answer-box {
  min-width: 7rem;
  height: 3.6rem;
  padding: 0 0.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1565c0;
  background-color: #ffffff;
  border: 4px solid #1e88e5;
  border-radius: 12px;
  cursor: pointer;

  &--wrong {
    color: #c62828;
    border-color: #e53935;
    background-color: #ffebee;
  }

  &--correct {
    color: #2e7d32;
    border-color: #43a047;
    background-color: #e8f5e9;
  }

  &--active {
    border-color: #ffb300;
    box-shadow: 0 0 0 4px #ffe082;
  }
}

.equation {
  padding: 0.3rem 0.9rem;
  color: #2e7d32;
  background-color: #e8f5e9;
  border-radius: 10px;
  @media (max-height: 760px) {
    .game-area {
      gap: 0.6rem;
    }

    .hint-text {
      font-size: 1.4rem;
    }

    .answer-box {
      height: 3rem;
    }
  }
}
</style>

<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <div class="figure-card">
        <div class="figure-card__head">
          <span>可以用畫筆圈圈看</span>
          <div class="drawing-tools">
            <button
              type="button"
              :class="{ 'drawing-tools--active': tool === 'pen' }"
              @click="setTool('pen')"
            >
              畫筆
            </button>
            <button
              type="button"
              :class="{ 'drawing-tools--active': tool === 'eraser' }"
              @click="setTool('eraser')"
            >
              橡皮擦
            </button>
            <button type="button" @click="$refs.drawingBoard.clear()">
              清除
            </button>
          </div>
        </div>
        <div class="figure-card__body">
          <div class="grid-wrap" data-pad-avoid>
            <HundredGrid :filled="filled" />
            <DrawingBoard
              ref="drawingBoard"
              class="figure-card__board"
              :component-config="brush"
            />
          </div>
        </div>
      </div>

      <div class="answer-card">
        <p class="answer-card__ask">藍色部分合起來</p>
        <div class="answer-card__row">
          <span class="swatch" />
          <span>是</span>
          <button
            type="button"
            class="box"
            :class="{
              'box--active': padOpen && !answered,
              'box--wrong': wrong,
              'box--correct': answered,
            }"
            data-key="answer"
            data-pad-field
            aria-label="小數答案"
            @click="openPad"
          >
            {{ value }}
          </button>
          <span>張</span>
        </div>
        <p v-if="feedback" class="feedback">{{ feedback }}</p>
      </div>

      <FieldPad
        :field="padOpen && !answered ? padEl : null"
        decimal
        @press="press"
        @close="padOpen = false"
      />
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import DrawingBoard from "@/components/DrawingBoard.vue";
import HundredGrid from "./games/Decimal/HundredGrid.vue";
import { hundredPattern } from "./games/Decimal/hundredPattern.js";
import { toHundredths } from "./games/Decimal/decimal.js";
import FieldPad from "./games/Common/FieldPad.vue";

const PEN = { color: "#e53935", size: 4 };
const ERASER = { color: "eraser", size: 24 };
const MAX_LENGTH = 5;

// 認識二位小數：百格板上有 cells 格藍色（位置每題隨機、連續好數），填「是幾張紙」
// 畫筆只是輔助、不列入判定；答案以「幾個 0.01」的整數判定，避免浮點誤差
// 題目 { cells, answer }
export default {
  name: "MA4071",
  components: { DrawingBoard, HundredGrid, FieldPad },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      filled: hundredPattern(this.gameData.cells),
      tool: "pen",
      brush: { ...PEN },
      value: "",
      padOpen: false,
      padEl: null,
      wrong: false,
      feedback: "",
      answered: false,
    };
  },
  computed: {
    gameIntroText() {
      return (
        this.introText?.Content ||
        "白紙平均分成 100 等分，藍色部分合起來是幾張紙？用小數表示。"
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
    setTool(tool) {
      this.tool = tool;
      this.brush = tool === "eraser" ? { ...ERASER } : { ...PEN };
    },
    openPad(event) {
      if (this.answered) return;
      this.padEl = event.currentTarget;
      this.padOpen = true;
    },
    press(key) {
      if (this.answered) return;
      this.wrong = false;
      this.feedback = "";
      const v = this.value;
      if (key === "clear") this.value = "";
      else if (key === "←") this.value = v.slice(0, -1);
      else if (v.length < MAX_LENGTH && key === "." && !v.includes("."))
        this.value = (v || "0") + ".";
      else if (v.length < MAX_LENGTH && /^\d$/.test(key))
        this.value = v === "0" ? key : v + key;
    },
    checkAnswer() {
      if (this.answered) return;
      const { cells, answer } = this.gameData;
      if (this.value === "" || this.value.endsWith(".")) {
        this.feedback = "答案的格子還沒填好喔！";
        this.wrong = true;
        return;
      }
      const isCorrect = toHundredths(this.value) === cells;
      this.$emit("add-record", [
        `藍色 ${cells} 格是 ${answer} 張`,
        `${this.value} 張`,
        isCorrect ? "正確" : "錯誤",
      ]);
      if (isCorrect) {
        this.answered = true;
        this.wrong = false;
        this.feedback = "";
        this.padOpen = false;
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
      } else {
        this.wrong = true;
        this.feedback = this.value.includes(".")
          ? "1 格是 0.01 張，數數看藍色有幾格？"
          : "要用小數表示喔！1 格是 0.01 張。";
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
  align-items: stretch;
  gap: 1rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small $padding--medium;
}

.figure-card {
  flex: 1;
  min-height: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.5rem 0.8rem;
  background-color: #ffffff;
  border: 3px solid #ffcc80;
  border-radius: 16px;

  &__head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    font-size: 1.15rem;
    font-weight: $font-bold;
    color: #5d4037;
  }

  &__body {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;

    :deep(.piece-groups) {
      width: 100%;
      height: 100%;
    }
  }

  &__board {
    position: absolute;
    inset: 0;
    cursor: crosshair;
    touch-action: none;
  }
}

.drawing-tools {
  display: flex;
  gap: $gap--small;

  button {
    @extend .button-basic;
    border: none;
    padding: 0.25rem 1rem;
    font-size: 1.05rem;
    background-color: $primary-btn-bg;
  }

  &--active {
    background-color: $primary-btn-hover-bg !important;
  }
}

.grid-wrap {
  position: relative;
  height: 100%;
  aspect-ratio: 1;
  max-width: 100%;

  :deep(.hundred-grid) {
    width: 100%;
    height: 100%;
  }
}

.answer-card {
  flex: 0 0 auto;
  width: 19rem;
  align-self: flex-start;
  margin-top: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1.2rem 1rem;
  background-color: #ffffff;
  border-radius: 16px;
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.1);

  &__ask {
    margin: 0;
    font-size: 1.35rem;
    font-weight: $font-bold;
    color: #4e342e;
    text-align: center;
  }

  &__row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.8rem;
    font-weight: $font-bold;
    color: #333333;
  }
}

.swatch {
  width: 2rem;
  height: 2rem;
  background-color: #42a5f5;
  border: 2px solid #1565c0;
  border-radius: 4px;
}

.box {
  width: 7rem;
  height: 3.6rem;
  font-size: 2.2rem;
  font-weight: $font-bold;
  color: #1565c0;
  background-color: #ffffff;
  border: 3px dashed #90a4ae;
  border-radius: 10px;
  cursor: pointer;

  &--active {
    border-style: solid;
    border-color: #1e88e5;
    box-shadow: 0 0 0 3px #90caf9;
  }

  &--wrong {
    border-style: solid;
    border-color: #e53935;
    background-color: #ffebee;
  }

  &--correct {
    border-style: solid;
    border-color: #43a047;
    background-color: #e8f5e9;
    color: #2e7d32;
  }
}

.feedback {
  margin: 0;
  text-align: center;
  font-size: 1.3rem;
  font-weight: $font-bold;
  color: #c62828;
}

@media (max-width: 1100px), (max-height: 760px) {
  .figure-card__head {
    font-size: 1rem;
  }

  .answer-card {
    width: 15rem;
  }

  .answer-card__row {
    font-size: 1.5rem;
  }

  .box {
    width: 6rem;
    height: 3rem;
    font-size: 1.9rem;
  }
}
</style>

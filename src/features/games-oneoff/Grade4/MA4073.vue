<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <div class="figure-card">
        <div class="figure-card__head">
          <span>菜園平均分成 100 格。可以用畫筆圈圈看</span>
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
          <div class="garden-wrap">
            <VegetableGarden />
            <DrawingBoard
              ref="drawingBoard"
              class="figure-card__board"
              :component-config="brush"
            />
          </div>
        </div>
      </div>

      <div class="ask">
        <p class="ask__text">{{ gameData.question }}</p>
        <div class="choices">
          <button
            v-for="choice in CHOICES"
            :key="choice.kind"
            type="button"
            class="choice"
            :class="[
              `choice--${choice.kind}`,
              {
                'choice--selected': selected === choice.value,
                'choice--correct': answered && choice.value === gameData.answer,
              },
            ]"
            :data-choice="choice.kind"
            :aria-label="choice.aria"
            @click="choose(choice.value)"
          >
            <svg class="choice__icon" viewBox="0 0 100 100" aria-hidden="true">
              <circle v-if="choice.kind === 'o'" cx="50" cy="50" r="34" />
              <path v-else d="M22 22 L78 78 M78 22 L22 78" />
            </svg>
          </button>
        </div>
        <p v-if="message" class="message">{{ message }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import DrawingBoard from "@/components/DrawingBoard.vue";
import VegetableGarden from "./games/Decimal/VegetableGarden.vue";

const CHOICES = [
  { value: true, kind: "o", aria: "對" },
  { value: false, kind: "x", aria: "不對" },
];
const PEN = { color: "#e53935", size: 4 };
const ERASER = { color: "eraser", size: 24 };

// 百格菜園判斷題：看平均分成 100 格的菜園，判斷敘述對不對（○／×）
// 畫筆只是輔助、不列入判定；題目 { question, answer, veg, value }
export default {
  name: "MA4073",
  components: { DrawingBoard, VegetableGarden },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      CHOICES,
      tool: "pen",
      brush: { ...PEN },
      selected: null,
      message: "",
      answered: false,
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "想想看，再回答問題。";
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
    choose(value) {
      if (this.answered) return;
      this.selected = value;
      this.message = "";
    },
    checkAnswer() {
      if (this.answered) return;
      if (this.selected === null) {
        this.message = "先選 ○ 或 ×，再送出答案喔！";
        return;
      }
      const isCorrect = this.selected === this.gameData.answer;
      const mark = (v) => (v ? "○" : "×");
      this.$emit("add-record", [
        `${this.gameData.question} ${mark(this.gameData.answer)}`,
        mark(this.selected),
        isCorrect ? "正確" : "錯誤",
      ]);
      if (isCorrect) {
        this.answered = true;
        this.message = "";
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
      } else {
        this.selected = null;
        this.message = `再想想看！1 格是 0.01 塊地，數數看${this.gameData.veg}有幾格？`;
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
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.5rem 0.8rem;
  background-color: #ffffff;
  border: 3px solid #a5d6a7;
  border-radius: 16px;

  &__head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    font-size: 1.1rem;
    font-weight: $font-bold;
    color: #33691e;
  }

  &__body {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__board {
    position: absolute;
    inset: 0;
    cursor: crosshair;
    touch-action: none;
  }
}

.garden-wrap {
  position: relative;
  height: 100%;
  aspect-ratio: 1;
  max-width: 100%;

  :deep(.garden) {
    width: 100%;
    height: 100%;
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

.ask {
  flex: 0 0 auto;
  width: 22rem;
  align-self: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.4rem;

  &__text {
    margin: 0;
    padding: 1rem 1.4rem;
    font-size: 1.8rem;
    font-weight: $font-bold;
    line-height: 1.5;
    color: #333333;
    background-color: #ffffff;
    border-radius: 20px;
    box-shadow: 0 3px 0 rgba(0, 0, 0, 0.1);
  }
}

.choices {
  display: flex;
  gap: 2.4rem;
}

.choice {
  width: 7rem;
  height: 7rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background-color: #ffffff;
  border: 5px solid #b0bec5;
  border-radius: 24px;
  box-shadow: 0 5px 0 #90a4ae;
  cursor: pointer;

  &__icon {
    width: 72%;
    height: 72%;
    fill: none;
    stroke: currentColor;
    stroke-width: 12;
    stroke-linecap: round;
  }

  &--o {
    color: #1e88e5;
  }

  &--x {
    color: #e53935;
  }

  &--selected {
    border-color: #ffb300;
    background-color: #fff8e1;
    box-shadow: 0 0 0 6px #ffe082;
  }

  &--correct {
    border-color: #43a047;
    background-color: #e8f5e9;
  }
}

.message {
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

  .ask {
    width: 16rem;

    &__text {
      font-size: 1.45rem;
      padding: 0.8rem 1rem;
    }
  }

  .choice {
    width: 5.6rem;
    height: 5.6rem;
  }
}
</style>

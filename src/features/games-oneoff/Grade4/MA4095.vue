<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <div class="figure-card">
        <div class="figure-card__head">
          <span>
            {{ gameData.num }} 個 {{ gameData.den }} 分之 1，每
            {{ gameData.den }} 個是 1。用畫筆圈圈看
          </span>
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
          <PieceGroups :num="gameData.num" :den="gameData.den" />
          <DrawingBoard
            ref="drawingBoard"
            class="figure-card__board"
            :component-config="brush"
          />
        </div>
      </div>

      <div class="equation">
        <span class="frac">
          <span>{{ gameData.num }}</span>
          <span class="frac__bar" />
          <span>{{ gameData.den }}</span>
        </span>
        <span class="equation__sign">＝</span>
        <button
          type="button"
          class="box"
          :class="{
            'box--active': padOpen && !answered,
            'box--wrong': wrong,
            'box--correct': answered,
          }"
          data-key="whole"
          data-pad-field
          aria-label="整數"
          @click="openPad"
        >
          {{ value }}
        </button>
      </div>

      <p v-if="feedback" class="feedback">{{ feedback }}</p>

      <FieldPad
        :field="padOpen && !answered ? padEl : null"
        @press="press"
        @close="padOpen = false"
      />
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import DrawingBoard from "@/components/DrawingBoard.vue";
import PieceGroups from "./games/Fraction/PieceGroups.vue";
import FieldPad from "./games/Common/FieldPad.vue";

const PEN = { color: "#e53935", size: 4 };
const ERASER = { color: "eraser", size: 24 };
const MAX_LENGTH = 2;

// 假分數化為整數：「假分數 ＝ □」只填整數；
// 圖上 num 張 1/den 小卡每 den 張一組，可用畫筆圈選分組（畫筆不列入判定）
// 題目 { num, den, whole }
export default {
  name: "MA4095",
  components: { DrawingBoard, PieceGroups, FieldPad },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
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
      return this.introText?.Content || "把假分數換成整數。";
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
      if (key === "clear") this.value = "";
      else if (key === "←") this.value = this.value.slice(0, -1);
      else if (/^\d$/.test(key) && this.value.length < MAX_LENGTH)
        this.value = this.value === "0" ? key : this.value + key;
    },
    checkAnswer() {
      if (this.answered) return;
      const { num, den, whole } = this.gameData;
      if (this.value === "") {
        this.feedback = "整數的格子還沒填喔！";
        this.wrong = true;
        return;
      }
      const isCorrect = Number(this.value) === whole;
      this.$emit("add-record", [
        `${num}/${den}＝${whole}`,
        `${num}/${den}＝${this.value}`,
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
        this.feedback = `每 ${den} 個 ${den} 分之 1 是 1，數數看可以分成幾組？`;
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
  gap: 0.6rem;
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

.equation {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.3rem 1.6rem;
  font-size: 2.2rem;
  font-weight: $font-bold;
  color: #0d47a1;
  background-color: #ffffff;
  border-radius: 16px;
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.1);

  &__sign {
    color: #333333;
  }
}

.frac {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.1;

  &__bar {
    width: 100%;
    min-width: 2.4rem;
    height: 5px;
    margin: 0.15rem 0;
    background-color: #37474f;
    border-radius: 3px;
  }
}

.box {
  width: 4.4rem;
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
  font-size: 1.3rem;
  font-weight: $font-bold;
  color: #c62828;
}

@media (max-width: 1100px), (max-height: 760px) {
  .figure-card__head {
    font-size: 1rem;
  }

  .equation {
    font-size: 1.9rem;
  }

  .box {
    width: 3.8rem;
    height: 3rem;
    font-size: 1.9rem;
  }
}
</style>

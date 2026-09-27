<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <!-- 題目算式：答對後在問號處顯示標準答案 -->
      <div class="question-panel">
        <p class="question-label">用計算機算算看</p>
        <div class="expression">
          <span>{{ gameData.expression }} =</span>
          <span
            class="answer-box"
            :class="{
              'answer-box--wrong': wrong,
              'answer-box--correct': answered,
            }"
          >
            {{ answered ? gameData.answer : "?" }}
          </span>
        </div>
        <p v-if="wrong" class="feedback">
          你按出的答案是 {{ lastAnswer }}，再算算看！
        </p>
        <p v-else class="feedback feedback--hint">
          在計算機按出算式，按「=」後送出答案
        </p>
      </div>

      <div class="calculator-panel">
        <SimpleCalculator ref="calculator" />
      </div>
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import SimpleCalculator from "@/components/SimpleCalculator.vue";

// 小數計算題共用：題目 { expression, answer }，以計算機目前顯示的數值判定，
// 等值表示（例如 29.0 與 29）視為相同
export default {
  name: "CalculatorQuestion",
  components: { SimpleCalculator },
  props: {
    gameData: { type: Object, required: true },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return { wrong: false, answered: false, lastAnswer: "" };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "使用計算機點按出正確答案";
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    readCalculator() {
      const calc = this.$refs.calculator;
      if (!calc) return "";
      const untouched =
        calc.history.length === 0 && calc.input === "" && calc.display === "0";
      return untouched ? "" : calc.display;
    },
    checkAnswer() {
      if (this.answered) return;
      const value = this.readCalculator();
      const isCorrect =
        value !== "" &&
        Math.abs(Number(value) - Number(this.gameData.answer)) < 1e-9;
      this.wrong = !isCorrect;
      this.lastAnswer = value || "（還沒有按）";
      this.$emit("add-record", [
        this.gameData.answer,
        value || "未作答",
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
  align-items: stretch;
  justify-content: center;
  gap: 2rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small;
}

.question-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.2rem;
}

.question-label {
  margin: 0;
  font-size: 1.4rem;
  color: #555555;
}

.expression {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 3.6rem;
  font-weight: $font-bold;
  white-space: nowrap;
}

.answer-box {
  min-width: 7rem;
  padding: 0.2rem 1rem;
  text-align: center;
  color: #1e88e5;
  background-color: #ffffff;
  border: 4px dashed #1e88e5;
  border-radius: 12px;

  &--wrong {
    color: #e53935;
    border-color: #e53935;
    background-color: #ffebee;
  }

  &--correct {
    color: #2e7d32;
    border-style: solid;
    border-color: #2e7d32;
    background-color: #e8f5e9;
  }
}

.feedback {
  margin: 0;
  font-size: 1.3rem;
  font-weight: $font-bold;
  color: #e53935;

  &--hint {
    font-weight: normal;
    color: #555555;
  }
}

.calculator-panel {
  // 按鍵是正圓，寬度決定高度；依視窗高度縮放，讓顯示區在平板上也看得到
  width: min(18rem, calc(80vh - 312px));
  min-width: 13rem;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
</style>

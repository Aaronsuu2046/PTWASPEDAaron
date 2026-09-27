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
  width: 20rem;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

// 適合小學生的明亮配色；只在本遊戲覆寫，不改 SimpleCalculator 預設樣式
.calculator-panel :deep(.calc-root) {
  background: #fff8e1;
  border: 4px solid #ffb74d;
  border-radius: 20px;
  font-family: inherit;
}

// 計算過程（計算紀錄與目前算式）字級放大 2 倍
.calculator-panel :deep(.calc-history) {
  min-height: 0;
  padding: 8px 14px 0;

  .calc-history__hint {
    font-size: 1.6rem;
    color: #bcaaa4;
  }

  .calc-history__item {
    font-size: 1.9rem;
    font-weight: $font-bold;
    color: #6d4c41;
    line-height: 1.3;
  }
}

.calculator-panel :deep(.calc-display) {
  margin: 0 10px;
  padding: 4px 12px 6px;
  background: #ffffff;
  border: 3px solid #ffcc80;
  border-radius: 12px;

  .calc-display__expr {
    font-size: 2rem;
    font-weight: $font-bold;
    color: #1e88e5;
  }

  .calc-display__value {
    color: #333333;
    font-weight: $font-bold;
  }
}

.calculator-panel :deep(.calc-divider) {
  display: none;
}

.calculator-panel :deep(.calc-keypad) {
  gap: 8px;
  padding: 10px;
}

.calculator-panel :deep(.calc-btn) {
  aspect-ratio: auto;
  height: 3rem;
  padding: 0;
  line-height: 1;
  border-radius: 14px;
  font-size: 1.6rem;
  font-weight: $font-bold;
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.18);

  &.--num {
    background: #ffffff;
    color: #333333;
    border: 2px solid #ffcc80;
  }

  &.--op {
    background: #ffa726;
    color: #ffffff;
  }

  &.--fn {
    background: #b3e5fc;
    color: #01579b;
  }

  &.--clear {
    background: #ef5350;
    color: #ffffff;
  }

  &.--equal {
    background: #66bb6a;
    color: #ffffff;
    font-size: 1.9rem;
    box-shadow: 0 3px 0 #388e3c;
  }
}

// 螢幕較矮（平板）時按鍵壓扁一些，留空間給放大的計算過程
@media (max-height: 760px) {
  .calculator-panel :deep(.calc-btn) {
    height: 2.3rem;
    font-size: 1.4rem;
  }
}
</style>

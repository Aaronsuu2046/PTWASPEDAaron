<template>
  <div class="game">
    <div class="game__question-area">
      <h1 class="game__question-description">{{ questionDescription }}</h1>
    </div>
    <div class="game__interaction-area">
      <div class="game__fraction-panel">
        <div class="game__fraction-input-display">
          <div class="fraction-input-wrapper">
            <input
              v-model.number="userNumeratorInput"
              type="number"
              class="numerator-input"
              min="1"
            />
            <div class="fraction-line"></div>
            <span class="denominator-number">{{ parsedDenominator }}</span>
          </div>
          <span class="equals-sign">= {{ parsedResult }}</span>
        </div>
        <FractionChart
          :component-config="chartData"
          :game-id="gameId"
          class="game__chart-container"
          @mounted="calculateChartSize"
        />
      </div>
      <DragFraction
        :component-config="configFraction"
        :game-id="gameId"
        class="game__answer-area"
        @reply-answer="drag"
        @record-answer="handleRecordAnswer"
      />
    </div>
  </div>
</template>

<script>
import { defineAsyncComponent } from "vue";
import FractionChart from "@/components/FractionChart.vue";
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";

export default {
  components: {
    FractionChart,
    DragFraction: defineAsyncComponent(
      () => import("@/components/DragFraction.vue")
    ),
  },
  props: {
    gameData: {
      type: Object,
      required: true,
    },
    gameId: {
      type: String,
      required: true,
    },
  },
  emits: ["add-record", "play-effect", "next-question"],
  data() {
    const parsed = this.parseFractionContent(
      this.gameData.question.fraction.Content
    );
    return {
      configFraction: this.gameData.answerData,
      chartWidth: 0,
      chartHeight: 0,
      questionDescription: this.gameData.question.description,
      questionFraction: this.gameData.question.fraction,
      chartData: {
        shape: this.gameData.answerData.shape,
        numerator: this.gameData.answerData.answer.numerator,
        denominator: this.gameData.answerData.answer.denominator,
      },
      userNumeratorInput: "",
      parsedNumerator: parsed.numerator,
      parsedDenominator: parsed.denominator,
    };
  },
  computed: {
    parsedResult() {
      if (this.parsedDenominator === 0) return "";
      const r = this.parsedNumerator / this.parsedDenominator;
      return Number.isInteger(r)
        ? r.toString()
        : `${this.parsedNumerator}/${this.parsedDenominator}`;
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    parseFractionContent(content) {
      const match = content.match(/\\frac\{(\d+)\}\{(\d+)\}/);
      if (match)
        return { numerator: parseInt(match[1]), denominator: parseInt(match[2]) };
      return { numerator: 1, denominator: 1 };
    },
    drag(answer) {
      this.isAnswerCorrect = answer;
    },
    calculateChartSize() {
      const fractionChart = this.$refs.fractionChart;
      if (fractionChart) {
        this.chartWidth = fractionChart.offsetWidth * 0.85 || 150;
        this.chartHeight = fractionChart.offsetHeight * 0.85 || 150;
      }
    },
    checkAnswer() {
      const isCorrect =
        Number(this.userNumeratorInput) === this.parsedNumerator;
      this.$emit("add-record", [
        this.parsedNumerator.toString(),
        this.userNumeratorInput.toString(),
        isCorrect ? "正確" : "錯誤",
      ]);
      if (isCorrect) {
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
      } else {
        this.$emit("play-effect", "WrongSound");
      }
    },
    handleRecordAnswer(record) {
      this.recordedAnswer = record;
    },
  },
};
</script>

<style scoped lang="scss">
.game {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  height: 100%;
  width: 100%;
  justify-content: space-between;
}

.game__question-area {
  display: flex;
  height: 15%;
  padding: $padding--small;
  align-items: center;
  border: $border--normal solid #000;
  border-radius: $border-radius;
}

.game__question-description {
  font-size: $text-large;
  margin: 0;
}

.game__interaction-area {
  display: flex;
  align-items: center;
  height: 80%;
  width: 100%;
}

.game__fraction-panel {
  display: flex;
  flex-direction: column;
  width: 30%;
  height: 100%;
  padding: $padding--small;
  gap: 0.5rem;
}

.game__fraction-input-display {
  flex: 2;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.fraction-input-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
}

.numerator-input {
  width: 3rem;
  height: 2.5rem;
  font-size: 1.8rem;
  text-align: center;
  border: 2px solid #333;
  border-radius: 4px;
  outline: none;

  &:focus {
    border-color: #4a90d9;
  }

  /* hide number input spinners */
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
  }
}

.fraction-line {
  width: 100%;
  border-top: 3px solid #333;
}

.denominator-number {
  font-size: 1.8rem;
  font-weight: bold;
}

.equals-sign {
  font-size: 1.8rem;
  font-weight: bold;
  color: #333;
}

.game__chart-container {
  flex: 3;
  justify-content: center;
  align-items: center;
}

.game__answer-area {
  width: 70%;
  height: 100%;
}
</style>

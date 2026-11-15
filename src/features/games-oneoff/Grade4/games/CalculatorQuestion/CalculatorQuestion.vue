<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <!-- 題目算式：問號是答案格，點了用小鍵盤填；計算機只用來算，不會自動代填 -->
      <div class="question-panel">
        <p class="question-label">用計算機算算看</p>
        <div class="expression" :class="{ 'expression--compact': compact }">
          <span>{{ gameData.expression }} =</span>
          <button
            type="button"
            class="answer-box"
            :class="{
              'answer-box--active': padOpen && !answered,
              'answer-box--wrong': wrong,
              'answer-box--correct': answered,
            }"
            data-pad-field
            aria-label="答案"
            @click="openPad"
          >
            {{ value === "" ? "?" : value }}
          </button>
        </div>
        <p v-if="wrong && value === ''" class="feedback">
          問號的格子還沒填答案喔！
        </p>
        <p v-else-if="wrong" class="feedback">答案不對，再用計算機算算看！</p>
        <p v-else class="feedback feedback--hint">
          用計算機算出答案，點問號的格子填進去，再送出答案
        </p>
      </div>

      <FieldPad
        :field="padOpen && !answered ? padEl : null"
        :decimal="decimal"
        @press="press"
        @close="padOpen = false"
      />

      <div class="calculator-panel">
        <KidCalculator />
      </div>
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import KidCalculator from "./KidCalculator.vue";
import FieldPad from "../Common/FieldPad.vue";

const MAX_LENGTH = 10;

// 計算機題共用：題目 { expression, answer }
// 學生用計算機算，再點橫式的問號用小鍵盤填答案；只以答案格的內容判定，
// 計算機的顯示與操作歷程不影響、也不會代填答案。等值表示（例如 29.0 與 29）視為相同
export default {
  name: "CalculatorQuestion",
  components: { KidCalculator, FieldPad },
  props: {
    gameData: { type: Object, required: true },
    introText: { type: Object, default: null },
    // 選填：算式比較長（例如小數加減）時，小螢幕上把算式字縮小，避免超出畫面（預設不縮）
    compact: { type: Boolean, default: false },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      value: "",
      padOpen: false,
      padEl: null,
      wrong: false,
      answered: false,
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "使用計算機點按出正確答案";
    },
    // 答案有小數時，小鍵盤才出現小數點
    decimal() {
      return String(this.gameData.answer).includes(".");
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    openPad(event) {
      if (this.answered) return;
      this.padEl = event.currentTarget;
      this.padOpen = true;
    },
    press(key) {
      if (this.answered) return;
      this.wrong = false;
      const full = this.value.length >= MAX_LENGTH;
      if (key === "clear") this.value = "";
      else if (key === "←") this.value = this.value.slice(0, -1);
      else if (key === "." && !full && !this.value.includes("."))
        this.value = `${this.value || "0"}.`;
      else if (/^\d$/.test(key) && !full)
        this.value = this.value === "0" ? key : this.value + key;
    },
    checkAnswer() {
      if (this.answered) return;
      const value = this.value;
      const isCorrect =
        value !== "" &&
        !value.endsWith(".") &&
        Math.abs(Number(value) - Number(this.gameData.answer)) < 1e-9;
      this.wrong = !isCorrect;
      this.$emit("add-record", [
        this.gameData.answer,
        value || "未作答",
        isCorrect ? "正確" : "錯誤",
      ]);
      if (isCorrect) {
        this.answered = true;
        this.padOpen = false;
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
  font: inherit;
  line-height: inherit;
  cursor: pointer;
  text-align: center;
  color: #1e88e5;
  background-color: #ffffff;
  border: 4px dashed #1e88e5;
  border-radius: 12px;

  &--active {
    border-style: solid;
    box-shadow: 0 0 0 4px #90caf9;
  }

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

@media (max-width: 1100px), (max-height: 760px) {
  .expression--compact {
    font-size: 2.6rem;
  }
}
</style>

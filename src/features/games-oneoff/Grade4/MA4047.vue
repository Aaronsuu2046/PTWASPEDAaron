<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <!-- 橫式：答對後顯示答案 -->
      <div class="equation">
        <span>{{ gameData.dividend }} ÷ {{ gameData.divisor }} =</span>
        <span
          class="equation__answer"
          :class="{ 'equation__answer--done': answered }"
        >
          {{ answered ? answerText : "？" }}
        </span>
      </div>

      <div class="work">
        <DivisionFill
          ref="division"
          :dividend="gameData.dividend"
          :divisor="gameData.divisor"
          answer-only
          @change="feedback = ''"
          @focus="onDivisionFocus"
        />
        <div class="legend">
          <p class="legend__item">
            <span class="legend__swatch legend__swatch--answer" />
            黃色格子：填商{{ hasRemainder ? "和餘數" : "" }}
          </p>
          <p class="legend__item">
            <span class="legend__swatch legend__swatch--helper" />
            白色格子：可以寫計算過程，不填也可以
          </p>
          <p class="legend__hint">
            點格子會出現數字板，填好會自動跳到右邊下一格
          </p>
        </div>
      </div>

      <p v-if="feedback" class="feedback">{{ feedback }}</p>

      <!-- 點格子才出現的數字板，會跟著目前的格子移動 -->
      <FieldPad
        :field="padOpen && !answered ? padEl : null"
        @press="onPadKey"
        @close="closePad"
      />
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import DivisionFill from "./games/Vertical/DivisionFill.vue";
import FieldPad from "./games/Common/FieldPad.vue";

// 四位數÷二位數（計算）：用除法直式算，商要寫在正確的位值上；
// 只判黃色的答案格（商、有餘數時的餘數），中間的計算過程不強迫填
export default {
  name: "MA4047",
  components: { DivisionFill, FieldPad },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      feedback: "",
      answered: false,
      padOpen: false,
      padEl: null,
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "用直式算算看";
    },
    hasRemainder() {
      return this.gameData.remainder !== "0";
    },
    answerText() {
      const { quotient, remainder } = this.gameData;
      return this.hasRemainder ? `${quotient} … ${remainder}` : quotient;
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    onDivisionFocus() {
      this.padOpen = true;
      this.syncPad();
    },
    // 數字板對準目前的格子（填完一格會自動跳到下一格）
    syncPad() {
      this.$nextTick(() => {
        const id = this.$refs.division?.active;
        this.padEl = id ? this.$el.querySelector(`[data-cell="${id}"]`) : null;
      });
    },
    closePad() {
      this.padOpen = false;
      this.padEl = null;
      this.$refs.division?.blur();
    },
    onPadKey(key) {
      this.$refs.division.input(key === "clear" ? "←" : key);
      this.syncPad();
    },
    checkAnswer() {
      if (this.answered) return;
      const { quotient, remainder } = this.gameData;
      const result = this.$refs.division.check();
      if (result.wrong)
        this.feedback = "紅色的格子不對，再算算看！商要寫在正確的位置上";
      else if (!result.complete)
        this.feedback = this.hasRemainder
          ? "黃色格子還沒填完喔！商和最後的餘數都要填"
          : "黃色的商還沒填完喔！商前面沒有數字的格子可以空著";
      const expected = this.hasRemainder
        ? `商 ${quotient}，餘數 ${remainder}`
        : `商 ${quotient}`;
      const actual = this.hasRemainder
        ? `商 ${result.quotient || "_"}，餘數 ${result.remainder || "_"}`
        : `商 ${result.quotient || "_"}`;
      this.$emit("add-record", [
        expected,
        actual,
        result.correct ? "正確" : "錯誤",
      ]);
      if (result.correct) {
        this.answered = true;
        this.feedback = "";
        this.closePad();
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
  gap: 0.5rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small;
}

.equation {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 2rem;
  font-weight: $font-bold;
  color: #333333;

  &__answer {
    min-width: 4rem;
    padding: 0.1rem 0.8rem;
    text-align: center;
    color: #9e9e9e;
    background-color: #ffffff;
    border: 3px dashed #90a4ae;
    border-radius: 12px;

    &--done {
      color: #1b5e20;
      background-color: #e8f5e9;
      border: 3px solid #43a047;
    }
  }
}

.work {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2.5rem;
  overflow: auto;
}

.legend {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  max-width: 14rem;

  &__item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    font-size: 1.15rem;
    font-weight: $font-bold;
    line-height: 1.4;
    color: #4e342e;
  }

  &__swatch {
    flex-shrink: 0;
    width: 1.6rem;
    height: 1.6rem;
    border-radius: 6px;

    &--answer {
      background-color: #fff176;
      border: 3px solid #fbc02d;
    }

    &--helper {
      background-color: #ffffff;
      border: 2px dashed #b0bec5;
    }
  }

  &__hint {
    margin: 0;
    font-size: 1.05rem;
    line-height: 1.4;
    color: #6d4c41;
  }
}

.feedback {
  margin: 0;
  font-size: 1.3rem;
  font-weight: $font-bold;
  color: #c62828;
}

// 直式列數多：格子縮小一點才放得下
.work :deep(.dfill) {
  --cell: 2.6rem;
}

.work :deep(.dfill__cell) {
  font-size: 1.7rem;
}

@media (max-width: 1100px), (max-height: 760px) {
  .work {
    gap: 1.2rem;
  }

  .equation {
    font-size: 1.6rem;
  }

  .legend {
    max-width: 11rem;

    &__item {
      font-size: 1rem;
    }

    &__hint {
      font-size: 0.9rem;
    }
  }

  .work :deep(.dfill) {
    --cell: 2.1rem;
  }

  .work :deep(.dfill__cell) {
    font-size: 1.4rem;
  }
}
</style>

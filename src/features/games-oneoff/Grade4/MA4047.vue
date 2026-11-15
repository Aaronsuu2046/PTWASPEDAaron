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

      <!-- 直式放到最大：依可用空間算格子大小（--fit-cell） -->
      <div ref="work" class="work" :style="{ '--fit-cell': `${cell}px` }">
        <DivisionFill
          ref="division"
          :dividend="gameData.dividend"
          :divisor="gameData.divisor"
          answer-only
          @change="feedback = ''"
          @focus="onDivisionFocus"
        />
      </div>

      <!-- 提示列一直佔著位置，出現或消失時直式才不會跟著縮放 -->
      <p class="feedback">{{ feedback }}</p>

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

// 格子大小的上下限（px）
const MIN_CELL = 30;
const MAX_CELL = 76;
// 改格子大小後，直式的高度要等下一次畫面更新才會變，量之前先等一下
const FIT_DELAY_MS = 150;
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
      cell: 42,
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
  mounted() {
    this.observer = new ResizeObserver(() => this.fit());
    this.observer.observe(this.$refs.work);
    this.fit();
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
    this.observer?.disconnect();
    clearTimeout(this.fitTimer);
  },
  methods: {
    // 量直式目前的大小，等比例放大或縮小到剛好放進計算區
    // （等畫面更新後再量，並以實際套用的格子大小為準，避免量到舊尺寸）
    fit(tries = 6) {
      clearTimeout(this.fitTimer);
      this.fitTimer = setTimeout(() => {
        const work = this.$refs.work;
        const fill = work?.querySelector(".dfill");
        if (!fill || !fill.offsetWidth || tries <= 0) return;
        const applied = parseFloat(
          getComputedStyle(fill).getPropertyValue("--cell")
        );
        const scale = Math.min(
          (work.clientWidth - 16) / fill.offsetWidth,
          (work.clientHeight - 8) / fill.offsetHeight
        );
        const next = Math.max(
          MIN_CELL,
          Math.min(MAX_CELL, Math.floor(applied * scale))
        );
        if (Math.abs(next - applied) >= 1) {
          this.cell = next;
          this.fit(tries - 1);
        } else if (this.padOpen) {
          // 格子大小變了，數字板重新對準目前的格子
          this.padEl = null;
          this.syncPad();
        }
      }, FIT_DELAY_MS);
    },
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
  align-self: stretch;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.feedback {
  min-height: 1.6em;
  margin: 0;
  font-size: 1.3rem;
  font-weight: $font-bold;
  color: #c62828;
}

// 格子大小由 fit() 依空間計算，字跟著格子等比例放大
.work :deep(.dfill) {
  --cell: var(--fit-cell, 2.6rem);
}

.work :deep(.dfill__cell) {
  font-size: calc(var(--cell) * 0.65);
}

@media (max-width: 1100px), (max-height: 760px) {
  .equation {
    font-size: 1.6rem;
  }
}
</style>

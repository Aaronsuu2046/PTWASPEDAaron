<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <div class="compare">
        <span class="compare__num">{{ gameData.left }}</span>
        <!-- 比較框：點符號放進來，或直接拖進來；點框可以清掉 -->
        <button
          type="button"
          class="slot"
          :class="{
            'slot--hover': hoverSlot,
            'slot--wrong': wrong,
            'slot--correct': answered,
          }"
          data-slot
          aria-label="比較符號"
          @click="clearSymbol"
        >
          {{ symbol }}
        </button>
        <span class="compare__num">{{ gameData.right }}</span>
      </div>

      <div class="symbols">
        <span class="symbols__label">點或拖曳符號到□裡：</span>
        <button
          v-for="s in SYMBOLS"
          :key="s"
          type="button"
          class="symbol"
          :class="{ 'symbol--chosen': symbol === s }"
          :data-symbol="s"
          @pointerdown="startDrag($event, s)"
          @pointermove="onDrag"
          @pointerup="endDrag"
          @pointercancel="cancelDrag"
          @click="onSymbolClick(s)"
        >
          {{ s }}
        </button>
      </div>

      <!-- 答錯後：對齊小數點排好，幫忙一位一位比 -->
      <div v-if="showAlign" class="align">
        <span class="align__title">對齊小數點，一位一位比比看：</span>
        <div class="align__grid">
          <span v-for="u in UNITS" :key="u" class="align__head">{{ u }}</span>
          <template v-for="row in alignRows" :key="row.text">
            <span
              v-for="(d, k) in row.digits"
              :key="k"
              class="align__cell"
              :class="{ 'align__cell--point': k === 1 }"
            >
              {{ d }}
            </span>
          </template>
        </div>
      </div>

      <p class="feedback">{{ feedback }}</p>
    </div>

    <div
      v-if="drag && drag.moved"
      class="drag-ghost"
      :style="{ left: `${drag.x}px`, top: `${drag.y}px` }"
    >
      {{ drag.symbol }}
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";

const SYMBOLS = [">", "<", "="];
const UNITS = ["十位", "個位", "十分位", "百分位"];
const DRAG_THRESHOLD = 8;

// 小數換成「幾個 0.01」的整數，比大小不用浮點數
function hundredths(text) {
  const [whole, frac = ""] = text.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0").slice(0, 2));
}

// 小數放進十位、個位、十分位、百分位四格（保留題目原本的寫法，沒有的位數空著）
function digitsOf(text) {
  const [whole, frac = ""] = text.split(".");
  const w = whole.padStart(2, " ");
  return [w[0].trim(), w[1], frac[0] || "", frac[1] || ""];
}

// 小數比大小：兩個小數中間的□填 >、< 或 =（點選或拖曳）；保留原始寫法（如 0.50 和 0.5），以整數百分位判定
// 答錯後顯示兩數對齊小數點的位值表；題目 { left, right, answer }
export default {
  name: "MA4076",
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      SYMBOLS,
      UNITS,
      symbol: "",
      drag: null,
      hoverSlot: false,
      suppressClick: false,
      wrong: false,
      showAlign: false,
      feedback: "",
      answered: false,
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "在□裡填入 >、< 或 =。";
    },
    alignRows() {
      return [this.gameData.left, this.gameData.right].map((text) => ({
        text,
        digits: digitsOf(text),
      }));
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    setSymbol(s) {
      if (this.answered) return;
      this.symbol = s;
      this.wrong = false;
      this.feedback = "";
    },
    clearSymbol() {
      if (this.answered) return;
      this.symbol = "";
    },
    onSymbolClick(s) {
      if (this.suppressClick) {
        this.suppressClick = false;
        return;
      }
      this.setSymbol(s);
    },
    startDrag(event, symbol) {
      if (this.answered) return;
      if (event.button !== undefined && event.button !== 0) return;
      this.suppressClick = false;
      this.drag = {
        symbol,
        startX: event.clientX,
        startY: event.clientY,
        x: event.clientX,
        y: event.clientY,
        moved: false,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    onDrag(event) {
      if (!this.drag) return;
      this.drag.x = event.clientX;
      this.drag.y = event.clientY;
      if (
        !this.drag.moved &&
        Math.hypot(
          event.clientX - this.drag.startX,
          event.clientY - this.drag.startY
        ) > DRAG_THRESHOLD
      )
        this.drag.moved = true;
      if (this.drag.moved) this.hoverSlot = this.overSlot(event);
    },
    endDrag(event) {
      if (!this.drag) return;
      if (this.drag.moved) {
        this.suppressClick = true;
        if (this.overSlot(event)) this.setSymbol(this.drag.symbol);
      }
      this.cancelDrag();
    },
    cancelDrag() {
      this.drag = null;
      this.hoverSlot = false;
    },
    overSlot(event) {
      const el = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest("[data-slot]");
      return Boolean(el && this.$el.contains(el));
    },
    checkAnswer() {
      if (this.answered) return;
      const { left, right } = this.gameData;
      if (!this.symbol) {
        this.wrong = true;
        this.feedback = "先把 >、< 或 = 放進□裡喔！";
        return;
      }
      const a = hundredths(left);
      const b = hundredths(right);
      const answer = a > b ? ">" : a < b ? "<" : "=";
      const isCorrect = this.symbol === answer;
      this.$emit("add-record", [
        `${left} ${answer} ${right}`,
        `${left} ${this.symbol} ${right}`,
        isCorrect ? "正確" : "錯誤",
      ]);
      if (isCorrect) {
        this.answered = true;
        this.wrong = false;
        this.feedback = "";
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
      } else {
        this.wrong = true;
        this.showAlign = true;
        this.feedback = "再想想看！先比整數部分，一樣的話再比十分位、百分位。";
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
  justify-content: center;
  gap: 1.2rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small $padding--medium;
}

.compare {
  display: flex;
  align-items: center;
  gap: 1.6rem;
  padding: 1.2rem 2.4rem;
  background-color: #ffffff;
  border-radius: 22px;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.1);

  &__num {
    min-width: 7rem;
    text-align: center;
    font-size: 3.6rem;
    font-weight: $font-bold;
    color: #0d47a1;
  }
}

.slot {
  width: 5.4rem;
  height: 5.4rem;
  font-size: 3.2rem;
  font-weight: $font-bold;
  color: #6a1b9a;
  background-color: #ffffff;
  border: 4px dashed #ab47bc;
  border-radius: 16px;
  cursor: pointer;

  &--hover {
    box-shadow: 0 0 0 5px #ce93d8;
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

.symbols {
  display: flex;
  align-items: center;
  gap: 1rem;

  &__label {
    font-size: 1.25rem;
    font-weight: $font-bold;
    color: #5d4037;
  }
}

.symbol {
  width: 4.6rem;
  height: 4.2rem;
  font-size: 2.6rem;
  font-weight: $font-bold;
  color: #6a1b9a;
  background-color: #f3e5f5;
  border: 3px solid #ab47bc;
  border-radius: 14px;
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.12);
  cursor: grab;
  touch-action: none;
  user-select: none;

  &--chosen {
    background-color: #ce93d8;
  }
}

.align {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1rem;
  background-color: #fffde7;
  border: 3px dashed #ffb300;
  border-radius: 14px;

  &__title {
    font-size: 1.1rem;
    font-weight: $font-bold;
    color: #5d4037;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(4, 4.2rem);
    background-color: #ffffff;
    border: 2px solid #8d6e63;
  }

  &__head {
    padding: 0.15rem 0;
    text-align: center;
    font-size: 1rem;
    font-weight: $font-bold;
    color: #4e342e;
    background-color: #ffe0b2;
    border-bottom: 2px solid #8d6e63;
  }

  &__cell {
    position: relative;
    height: 2.6rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.8rem;
    font-weight: $font-bold;
    color: #0d47a1;
    border-right: 1px solid #d7ccc8;

    &--point::after {
      content: "";
      position: absolute;
      right: -0.3rem;
      bottom: 0.4rem;
      width: 0.6rem;
      height: 0.6rem;
      background-color: #d84315;
      border-radius: 50%;
    }
  }
}

.feedback {
  min-height: 1.6em;
  margin: 0;
  text-align: center;
  font-size: 1.25rem;
  font-weight: $font-bold;
  color: #c62828;
}

.drag-ghost {
  position: fixed;
  z-index: 1000;
  transform: translate(-50%, -50%);
  pointer-events: none;
  font-size: 2.6rem;
  font-weight: 700;
  color: #6a1b9a;
}

@media (max-width: 1100px), (max-height: 760px) {
  .game-area {
    gap: 0.7rem;
  }

  .compare {
    padding: 0.8rem 1.6rem;

    &__num {
      font-size: 3rem;
    }
  }

  .slot {
    width: 4.6rem;
    height: 4.6rem;
    font-size: 2.8rem;
  }

  .align__cell {
    height: 2.2rem;
    font-size: 1.5rem;
  }
}
</style>

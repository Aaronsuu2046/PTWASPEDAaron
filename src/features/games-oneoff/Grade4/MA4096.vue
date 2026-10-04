<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <p class="hint">提示：可以進行分數的互換再比比看！</p>

      <div class="compare">
        <div
          v-for="side in SIDES"
          :key="side"
          class="side"
          :class="{
            'side--wrong': wrongParts.includes(side),
            'side--correct': answered,
          }"
          :data-side="side"
        >
          <div class="side__head">
            <span class="number">
              <span v-if="gameData[side].whole" class="number__whole">
                {{ gameData[side].whole }}
              </span>
              <span v-if="gameData[side].num" class="frac">
                <span>{{ gameData[side].num }}</span>
                <span class="frac__bar" />
                <span>{{ gameData[side].den }}</span>
              </span>
            </span>
            <span class="side__count">已塗 {{ painted[side] }} 格</span>
            <button
              type="button"
              class="side__clear"
              :disabled="painted[side] === 0 || answered"
              @click="$refs[side][0].clear()"
            >
              擦掉
            </button>
          </div>
          <div class="side__board">
            <TapShapes
              :ref="side"
              :count="gameData.shapes"
              :den="gameData[side].den"
              :per-row="3"
              :disabled="answered"
              @change="onPaint(side, $event)"
            />
          </div>
        </div>

        <!-- 比較框：點符號放進來，或直接拖進來 -->
        <button
          type="button"
          class="slot"
          :class="{
            'slot--hover': hoverSlot,
            'slot--wrong': wrongParts.includes('symbol'),
            'slot--correct': answered,
          }"
          data-slot
          aria-label="比較符號"
          @click="symbol = ''"
        >
          {{ symbol || "口" }}
        </button>
      </div>

      <div class="symbols">
        <span class="symbols__label">點或拖曳符號到口裡：</span>
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

      <p v-if="feedback" class="feedback">{{ feedback }}</p>
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
import TapShapes from "./games/Fraction/TapShapes.vue";

const SIDES = ["left", "right"];
const SYMBOLS = [">", "<", "="];
const DRAG_THRESHOLD = 8;

const text = (x) => {
  const frac = x.num ? `${x.num}/${x.den}` : "";
  if (x.whole && frac) return `${x.whole} ${frac}`;
  return x.whole ? String(x.whole) : frac;
};

// 分數比大小：左右兩邊先在圓上塗出題目的數（整數的圓不切開），再把 >、<、= 放進口裡
// 兩邊塗色格數和符號都對才過關；題目 { left, right: { whole, num, den, parts }, answer, shapes }
export default {
  name: "MA4096",
  components: { TapShapes },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      SIDES,
      SYMBOLS,
      painted: { left: 0, right: 0 },
      symbol: "",
      drag: null,
      hoverSlot: false,
      suppressClick: false,
      wrongParts: [],
      feedback: "",
      answered: false,
    };
  },
  computed: {
    gameIntroText() {
      return (
        this.introText?.Content || "塗一塗，再比比看，在口裡填入 >、< 或 =。"
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
    onPaint(side, count) {
      this.painted = { ...this.painted, [side]: count };
      this.wrongParts = this.wrongParts.filter((p) => p !== side);
      this.feedback = "";
    },
    setSymbol(s) {
      if (this.answered) return;
      this.symbol = s;
      this.wrongParts = this.wrongParts.filter((p) => p !== "symbol");
      this.feedback = "";
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
      return Boolean(
        document
          .elementFromPoint(event.clientX, event.clientY)
          ?.closest("[data-slot]")
      );
    },
    checkAnswer() {
      if (this.answered) return;
      const { left, right, answer } = this.gameData;
      if (!this.symbol || !this.painted.left || !this.painted.right) {
        this.feedback = "兩邊都要塗色，也要把符號放進口裡喔！";
        this.wrongParts = [
          ...(this.painted.left ? [] : ["left"]),
          ...(this.painted.right ? [] : ["right"]),
          ...(this.symbol ? [] : ["symbol"]),
        ];
        return;
      }
      const wrong = [];
      if (this.painted.left !== left.parts) wrong.push("left");
      if (this.painted.right !== right.parts) wrong.push("right");
      if (this.symbol !== answer) wrong.push("symbol");
      this.wrongParts = wrong;
      const isCorrect = wrong.length === 0;
      this.$emit("add-record", [
        `${text(left)} ${answer} ${text(right)}（塗 ${left.parts}、${right.parts} 格）`,
        `${text(left)} ${this.symbol} ${text(right)}（塗 ${this.painted.left}、${this.painted.right} 格）`,
        isCorrect ? "正確" : "錯誤",
      ]);
      if (isCorrect) {
        this.answered = true;
        this.feedback = "";
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
      } else {
        this.feedback =
          wrong.includes("left") || wrong.includes("right")
            ? "紅框那邊塗的格數不對，數數看要塗幾格！"
            : "符號不對，比比看哪邊塗得比較多！";
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
  padding: $padding--small $padding--medium;
}

.hint {
  margin: 0;
  font-size: 1.1rem;
  font-weight: $font-bold;
  color: #6d4c41;
}

.compare {
  flex: 1;
  min-height: 0;
  width: 100%;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: stretch;
  gap: 1rem;
}

// 比較框放在兩邊中間
.slot {
  grid-column: 2;
  grid-row: 1;
  align-self: center;
  width: 5rem;
  height: 5rem;
  font-size: 3rem;
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

.side {
  grid-row: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.5rem;
  background-color: #ffffff;
  border: 3px solid #ffcc80;
  border-radius: 16px;

  &[data-side="left"] {
    grid-column: 1;
  }

  &[data-side="right"] {
    grid-column: 3;
  }

  &--wrong {
    border-color: #e53935;
    box-shadow: 0 0 0 4px #ffcdd2;
  }

  &--correct {
    border-color: #43a047;
  }

  &__head {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  &__count {
    padding: 0.1rem 0.5rem;
    font-size: 1.05rem;
    font-weight: $font-bold;
    color: #e65100;
    background-color: #fff3e0;
    border-radius: 10px;
  }

  &__clear {
    margin-left: auto;
    padding: 0.2rem 0.7rem;
    font-size: 1rem;
    font-weight: $font-bold;
    color: #ffffff;
    background-color: #90a4ae;
    border: none;
    border-radius: 10px;
    cursor: pointer;

    &:disabled {
      opacity: 0.5;
      cursor: default;
    }
  }

  &__board {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;

    :deep(.tap-shapes) {
      width: 100%;
      height: 100%;
    }
  }
}

.number {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 2rem;
  font-weight: $font-bold;
  color: #0d47a1;

  &__whole {
    font-size: 2.3rem;
  }
}

.frac {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  font-size: 1.6rem;
  line-height: 1.05;

  &__bar {
    width: 100%;
    min-width: 1.8rem;
    height: 4px;
    margin: 0.1rem 0;
    background-color: #37474f;
    border-radius: 2px;
  }
}

.symbols {
  display: flex;
  align-items: center;
  gap: 0.8rem;

  &__label {
    font-size: 1.15rem;
    font-weight: $font-bold;
    color: #5d4037;
  }
}

.symbol {
  width: 4rem;
  height: 3.6rem;
  font-size: 2.2rem;
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

.feedback {
  margin: 0;
  font-size: 1.25rem;
  font-weight: $font-bold;
  color: #c62828;
}

.drag-ghost {
  position: fixed;
  z-index: 1000;
  transform: translate(-50%, -50%);
  pointer-events: none;
  font-size: 2.4rem;
  font-weight: 700;
  color: #6a1b9a;
}

@media (max-width: 1100px), (max-height: 760px) {
  .hint {
    font-size: 1rem;
  }

  .slot {
    width: 4.2rem;
    height: 4.2rem;
    font-size: 2.5rem;
  }

  .number {
    font-size: 1.7rem;
  }

  .symbol {
    width: 3.4rem;
    height: 3rem;
    font-size: 1.9rem;
  }
}
</style>

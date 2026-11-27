<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <div class="shapes">
        <p class="shapes__hint">
          <span class="shapes__question">
            1張披薩平分成{{ gameData.den }}份。
          </span>
          <span class="shapes__tip">點一點或按住拖過去，可以塗色數數看</span>
          <span class="shapes__count">已塗 {{ paintedCount }} 份</span>
          <button
            type="button"
            class="shapes__clear"
            :disabled="paintedCount === 0 || answered"
            @click="$refs.shapes.clear()"
          >
            全部擦掉
          </button>
        </p>
        <div class="shapes__board">
          <TapShapes
            ref="shapes"
            :count="gameData.whole"
            :den="gameData.den"
            :disabled="answered"
            @change="paintedCount = $event"
          />
        </div>
      </div>

      <div class="answer-row">
        <div class="equation">
          <span class="equation__whole">{{ gameData.whole }}</span>
          <span class="equation__sign">＝</span>
          <span class="frac">
            <button
              type="button"
              class="box"
              :class="{
                'box--active': padOpen && !answered,
                'box--wrong': wrong,
                'box--correct': answered,
              }"
              data-key="num"
              data-pad-field
              aria-label="分子"
              @click="openPad"
            >
              {{ value }}
            </button>
            <span class="frac__bar" />
            <span class="frac__den">{{ gameData.den }}</span>
          </span>
        </div>

        <div v-if="feedback" class="help">
          <p class="feedback">{{ feedback }}</p>
          <!-- 答錯時依腳本的提示框，數字依這一題調整；要填的地方留（&nbsp;&nbsp;&nbsp;）不直接給答案 -->
          <div v-if="showHint" class="steps">
            <p>
              1張是{{ gameData.den }}個<span class="mini-frac"
                ><span>1</span><span class="mini-frac__bar" /><span>{{
                  gameData.den
                }}</span></span
              >張，
            </p>
            <p>
              {{ gameData.whole }}張是{{ gameData.den }}×{{
                gameData.whole
              }}=<span class="blank">（&nbsp;&nbsp;&nbsp;）</span>個<span
                class="mini-frac"
                ><span>1</span><span class="mini-frac__bar" /><span>{{
                  gameData.den
                }}</span></span
              >張，
            </p>
            <p>
              <span class="blank">（&nbsp;&nbsp;&nbsp;）</span>個<span
                class="mini-frac"
                ><span>1</span><span class="mini-frac__bar" /><span>{{
                  gameData.den
                }}</span></span
              >張合起來是<span class="mini-frac"
                ><span class="blank">（&nbsp;&nbsp;&nbsp;）</span
                ><span class="mini-frac__bar" /><span>{{
                  gameData.den
                }}</span></span
              >張。
            </p>
          </div>
        </div>
      </div>

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
import TapShapes from "./games/Fraction/TapShapes.vue";
import FieldPad from "./games/Common/FieldPad.vue";

const MAX_LENGTH = 2;

// 整數化為假分數：「整數 ＝ □ / 分母」只填分子；
// 下方畫同樣多個圓、每個按分母等分，可點擊塗色當輔助（不列入判定）
// 題目 { whole, den, num }
export default {
  name: "MA4094",
  components: { TapShapes, FieldPad },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      value: "",
      padOpen: false,
      padEl: null,
      paintedCount: 0,
      wrong: false,
      feedback: "",
      showHint: false,
      answered: false,
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "把整數化為假分數";
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
      this.feedback = "";
      this.showHint = false;
      if (key === "clear") this.value = "";
      else if (key === "←") this.value = this.value.slice(0, -1);
      else if (/^\d$/.test(key) && this.value.length < MAX_LENGTH)
        this.value = this.value === "0" ? key : this.value + key;
    },
    checkAnswer() {
      if (this.answered) return;
      const { whole, den, num } = this.gameData;
      if (this.value === "") {
        this.feedback = "分子的格子還沒填喔！";
        this.wrong = true;
        return;
      }
      const isCorrect = Number(this.value) === num;
      this.$emit("add-record", [
        `${whole}＝${num}/${den}`,
        `${whole}＝${this.value}/${den}`,
        isCorrect ? "正確" : "錯誤",
      ]);
      if (isCorrect) {
        this.answered = true;
        this.wrong = false;
        this.feedback = "";
        this.showHint = false;
        this.padOpen = false;
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
      } else {
        this.wrong = true;
        this.feedback = "再想想看：";
        this.showHint = true;
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

.shapes {
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

  &__hint {
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.6rem;
    font-size: 1.15rem;
    font-weight: $font-bold;
    color: #5d4037;
  }

  &__question {
    font-size: 1.5rem;
    color: #3e2723;
  }

  &__tip {
    font-size: 1rem;
    color: #8d6e63;
  }

  &__count {
    padding: 0.1rem 0.6rem;
    color: #e65100;
    background-color: #fff3e0;
    border-radius: 10px;
  }

  &__clear {
    margin-left: auto;
    padding: 0.25rem 0.8rem;
    font-size: 1.05rem;
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

.equation {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.3rem 1.6rem;
  font-weight: $font-bold;
  background-color: #ffffff;
  border-radius: 16px;
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.1);

  &__whole {
    font-size: 3rem;
    color: #0d47a1;
  }

  &__sign {
    font-size: 2.4rem;
    color: #333333;
  }
}

.frac {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;

  &__bar {
    width: 100%;
    height: 5px;
    background-color: #37474f;
    border-radius: 3px;
  }

  &__den {
    font-size: 2.2rem;
    color: #0d47a1;
    line-height: 1.1;
  }
}

.box {
  width: 4.4rem;
  height: 3.4rem;
  font-size: 2.1rem;
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

// 算式在左、答錯提示在右，避免提示把上面的圓擠小
.answer-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.2rem;
}

.help {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.feedback {
  margin: 0;
  font-size: 1.3rem;
  font-weight: $font-bold;
  color: #c62828;
}

.steps {
  margin: 0;
  padding: 0.4rem 1.2rem;
  font-size: 1.2rem;
  font-weight: $font-bold;
  line-height: 1.5;
  color: #4e342e;
  background-color: #fff8e1;
  border: 3px solid #ffb74d;
  border-radius: 14px;

  p {
    margin: 0.15rem 0;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
  }
}

.mini-frac {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  margin: 0 0.2rem;
  font-size: 0.85em;
  line-height: 1.05;

  &__bar {
    align-self: stretch;
    height: 2px;
    background-color: currentColor;
  }
}

.blank {
  color: #c62828;
}

@media (max-width: 1100px), (max-height: 760px) {
  .shapes__hint {
    font-size: 1rem;
  }

  .equation__whole {
    font-size: 2.5rem;
  }

  .box {
    width: 3.8rem;
    height: 2.9rem;
    font-size: 1.8rem;
  }

  .frac__den {
    font-size: 1.9rem;
  }
}
</style>

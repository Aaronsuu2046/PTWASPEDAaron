<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <!-- 關卡 1～4：除法直式 -->
      <template v-if="!isWord">
        <p class="equation">
          {{ gameData.dividend }} ÷ {{ gameData.divisor }} =
          <span class="equation__answer">{{ solvedText }}</span>
        </p>
        <div class="work">
          <DivisionFill
            ref="division"
            :dividend="gameData.dividend"
            :divisor="gameData.divisor"
            @change="feedback = ''"
          />
          <div class="side">
            <p class="side__hint">點黃色格子再按數字，也可以把數字拖進格子</p>
            <NumPad
              :disabled="answered"
              @press="$refs.division.input($event)"
              @drop="(key, cell) => $refs.division.input(key, cell)"
            />
          </div>
        </div>
      </template>

      <!-- 關卡 5：應用題 -->
      <template v-else>
        <p class="question">{{ gameData.question }}</p>
        <div class="work">
          <div class="word">
            <div class="word__row">
              <span class="word__label">做法：</span>
              <template v-for="part in FORMULA" :key="part.id">
                <span v-if="part.sign" class="word__sign">{{ part.sign }}</span>
                <button
                  v-else
                  type="button"
                  class="word__box"
                  :class="boxClass(part.id)"
                  :data-cell="part.id"
                  @click="active = part.id"
                >
                  {{ values[part.id] }}
                </button>
              </template>
            </div>
            <div class="word__row">
              <span class="word__label">答：</span>
              <span>每人最多可以分到</span>
              <button
                type="button"
                class="word__box"
                :class="boxClass('each')"
                data-cell="each"
                @click="active = 'each'"
              >
                {{ values.each }}
              </button>
              <span>{{ gameData.unit }}</span>
            </div>
            <div class="word__row">
              <span class="word__label" />
              <span>剩下</span>
              <button
                type="button"
                class="word__box"
                :class="boxClass('left')"
                data-cell="left"
                @click="active = 'left'"
              >
                {{ values.left }}
              </button>
              <span>{{ gameData.unit }}</span>
            </div>
          </div>
          <div class="side">
            <p class="side__hint">
              點格子再按數字；可以用右邊的「計算工具」幫忙算
            </p>
            <NumPad
              :disabled="answered"
              @press="typeWord($event)"
              @drop="(key, cell) => typeWord(key, cell)"
            />
          </div>
        </div>
      </template>

      <p v-if="feedback" class="feedback">{{ feedback }}</p>
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import DivisionFill from "./games/Vertical/DivisionFill.vue";
import NumPad from "./games/Vertical/NumPad.vue";

const FORMULA = [
  { id: "a" },
  { id: "div", sign: "÷" },
  { id: "b" },
  { id: "eq", sign: "=" },
  { id: "q" },
  { id: "dots", sign: "…" },
  { id: "r" },
];
const MAX_LEN = 5;

// 三、四位數÷三位數：關卡 1～4 用除法直式（商要放在正確位值，直式每一步都要填），
// 關卡 5 應用題填橫式與「每人最多分到／剩下」
export default {
  name: "MA4113",
  components: { DivisionFill, NumPad },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      FORMULA,
      feedback: "",
      answered: false,
      active: "a",
      values: { a: "", b: "", q: "", r: "", each: "", left: "" },
      wrongKeys: [],
    };
  },
  computed: {
    isWord() {
      return this.gameData.kind === "word";
    },
    gameIntroText() {
      return this.introText?.Content || "用除法直式算算看";
    },
    answerText() {
      const { quotient, remainder } = this.gameData;
      return remainder === "0" ? quotient : `${quotient}…${remainder}`;
    },
    solvedText() {
      return this.answered ? this.answerText : "？";
    },
    wordExpected() {
      const { dividend, divisor, quotient, remainder } = this.gameData;
      return {
        a: dividend,
        b: divisor,
        q: quotient,
        r: remainder,
        each: quotient,
        left: remainder,
      };
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  mounted() {
    if (this.isWord) window.addEventListener("keydown", this.onKey);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
    window.removeEventListener("keydown", this.onKey);
  },
  methods: {
    boxClass(id) {
      return {
        "word__box--active": this.active === id && !this.answered,
        "word__box--wrong": this.wrongKeys.includes(id),
        "word__box--correct": this.answered,
      };
    },
    typeWord(key, cell = this.active) {
      if (this.answered || !(cell in this.values)) return;
      this.active = cell;
      const cur = this.values[cell];
      const next =
        key === "←" ? cur.slice(0, -1) : (cur + key).slice(0, MAX_LEN);
      this.values = { ...this.values, [cell]: next };
      this.wrongKeys = this.wrongKeys.filter((k) => k !== cell);
      this.feedback = "";
    },
    onKey(event) {
      if (/^[0-9]$/.test(event.key)) this.typeWord(event.key);
      else if (event.key === "Backspace") this.typeWord("←");
    },
    finish(isCorrect, expected, actual) {
      this.$emit("add-record", [expected, actual, isCorrect ? "正確" : "錯誤"]);
      if (isCorrect) {
        this.answered = true;
        this.feedback = "";
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
      } else {
        this.$emit("play-effect", "WrongSound");
      }
    },
    checkAnswer() {
      if (this.answered) return;
      const { quotient, remainder, unit } = this.gameData;
      if (!this.isWord) {
        const result = this.$refs.division.check();
        if (result.wrong)
          this.feedback = "紅色的格子不對，再算算看！商要寫在正確的位置上";
        else if (!result.complete)
          this.feedback = "黃色格子還沒填完喔！商前面沒有數字的格子可以空著";
        this.finish(
          result.correct,
          `商 ${quotient}，餘數 ${remainder}`,
          `商 ${result.quotient || "_"}，餘數 ${result.remainder || "_"}`
        );
        return;
      }
      const exp = this.wordExpected;
      const empty = Object.keys(exp).filter((k) => !this.values[k]);
      this.wrongKeys = Object.keys(exp).filter(
        (k) => this.values[k] && this.values[k] !== exp[k]
      );
      const isCorrect = !empty.length && !this.wrongKeys.length;
      if (empty.length) this.feedback = "每個格子都要填喔！";
      else if (!isCorrect) this.feedback = "紅色的格子不對，再算算看！";
      const text = (v) =>
        `${v.a || "_"}÷${v.b || "_"}=${v.q || "_"}…${v.r || "_"}；每人 ${
          v.each || "_"
        } ${unit}，剩下 ${v.left || "_"} ${unit}`;
      this.finish(isCorrect, text(exp), text(this.values));
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
  margin: 0;
  font-size: 1.9rem;
  font-weight: $font-bold;
  color: #333333;

  &__answer {
    color: #2e7d32;
  }
}

.question {
  margin: 0;
  max-width: 50rem;
  font-size: 1.6rem;
  font-weight: $font-bold;
  line-height: 1.5;
  color: #333333;
}

.work {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2.5rem;
}

.side {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;

  &__hint {
    margin: 0;
    max-width: 11rem;
    font-size: 1.05rem;
    line-height: 1.4;
    text-align: center;
    color: #6d4c41;
  }
}

.word {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem 1.4rem;
  background-color: #ffffff;
  border-radius: 16px;
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.1);
  font-size: 1.6rem;
  font-weight: $font-bold;
  color: #333333;

  &__row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  &__label {
    min-width: 4.5rem;
    white-space: nowrap;
    color: #6d4c41;
  }

  &__sign {
    font-size: 1.9rem;
    color: #e65100;
  }

  &__box {
    min-width: 5rem;
    height: 3.2rem;
    padding: 0 0.4rem;
    font-size: 1.8rem;
    font-weight: $font-bold;
    color: #e65100;
    background-color: #fff176;
    border: 3px solid #fbc02d;
    border-radius: 10px;
    cursor: pointer;

    &--active {
      border-color: #1e88e5;
      box-shadow: 0 0 0 3px #90caf9;
    }

    &--wrong {
      color: #c62828;
      border-color: #e53935;
      box-shadow: 0 0 0 3px #ffcdd2;
    }

    &--correct {
      color: #2e7d32;
      background-color: #c8e6c9;
      border-color: #43a047;
    }
  }
}

.feedback {
  margin: 0;
  font-size: 1.3rem;
  font-weight: $font-bold;
  color: #c62828;
}

@media (max-width: 1100px) {
  .work {
    gap: 1.2rem;
  }

  .word {
    font-size: 1.35rem;

    &__box {
      min-width: 4.2rem;
      height: 2.8rem;
      font-size: 1.5rem;
    }
  }
}
</style>

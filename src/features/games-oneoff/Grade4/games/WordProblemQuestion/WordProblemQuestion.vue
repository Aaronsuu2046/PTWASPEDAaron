<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <div class="work-panel">
        <p class="question-text">{{ gameData.question }}</p>

        <!-- 做法：每一步都是「數 運算 數 = 數」；點格子後用右邊的按鍵填 -->
        <div class="work-block">
          <div
            v-for="(step, s) in gameData.steps"
            :key="`step-${s}`"
            class="work-row"
          >
            <span class="work-label">{{ s === 0 ? "做法：" : "" }}</span>
            <template v-for="part in STEP_PARTS" :key="`${s}-${part}`">
              <span v-if="part === 'eq'" class="work-sign">=</span>
              <button
                v-else
                type="button"
                class="fill-box"
                :class="boxClass(`s${s}${part}`, part === 'op')"
                :data-key="`s${s}${part}`"
                :aria-label="part === 'op' ? '運算符號' : '數字'"
                @click="activate(`s${s}${part}`)"
              >
                {{ display(`s${s}${part}`) }}
              </button>
            </template>
          </div>

          <div class="work-row">
            <span class="work-label">答：</span>
            <button
              type="button"
              class="fill-box fill-box--answer"
              :class="boxClass('answer', false)"
              data-key="answer"
              aria-label="答案"
              @click="activate('answer')"
            >
              {{ display("answer") }}
            </button>
            <span class="work-unit">{{ gameData.unit }}</span>
          </div>
        </div>
      </div>

      <!-- 按鍵：選到數字格可按數字，選到符號格可按運算符號 -->
      <div class="pad">
        <div class="pad__ops">
          <button
            v-for="op in OPS"
            :key="op"
            type="button"
            class="pad-key pad-key--op"
            :disabled="!activeIsOp"
            @click="press(op)"
          >
            {{ showOp(op) }}
          </button>
        </div>
        <div class="pad__digits">
          <button
            v-for="key in DIGITS"
            :key="key"
            type="button"
            class="pad-key"
            :class="{
              'pad-key--fn': key === '←',
              'pad-key--wide': key === '0',
            }"
            :disabled="activeIsOp || answered"
            :aria-label="key === '←' ? '刪除一個字' : key"
            @click="press(key)"
          >
            {{ key }}
          </button>
          <button
            type="button"
            class="pad-key pad-key--clear"
            :disabled="answered"
            @click="press('clear')"
          >
            清除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";

const OPS = ["+", "-", "×", "÷"];
const OP_LABEL = { "-": "−" };
// 交換兩數結果不變的運算，做法可接受 4 × 1.8 這種寫法
const COMMUTATIVE = ["+", "×"];
const MAX_LENGTH = 7;

// 應用題共用：題目 { question, steps: [{ a, op, b, result }], answer, unit }
// 學生填每一步的算式與答案；數字以數值比對（7.20 = 7.2）
export default {
  name: "WordProblemQuestion",
  props: {
    gameData: { type: Object, required: true },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      OPS,
      STEP_PARTS: ["a", "op", "b", "eq", "result"],
      DIGITS: ["7", "8", "9", "4", "5", "6", "1", "2", "3", "0", ".", "←"],
      values: {},
      active: "s0a",
      wrongKeys: [],
      answered: false,
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "把做法和答案記下來";
    },
    activeIsOp() {
      return /^s\d+op$/.test(this.active);
    },
    // 依填寫順序排列的格子，用來在選完符號後自動跳到下一格
    fieldOrder() {
      const keys = [];
      this.gameData.steps.forEach((_, s) => {
        ["a", "op", "b", "result"].forEach((part) => keys.push(`s${s}${part}`));
      });
      keys.push("answer");
      return keys;
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    showOp(op) {
      return OP_LABEL[op] || op;
    },
    display(key) {
      const value = this.values[key] || "";
      return /op$/.test(key) ? this.showOp(value) : value;
    },
    boxClass(key, isOp) {
      return {
        "fill-box--op": isOp,
        "fill-box--active": !this.answered && this.active === key,
        "fill-box--wrong": this.wrongKeys.includes(key),
        "fill-box--correct": this.answered,
      };
    },
    activate(key) {
      if (this.answered) return;
      this.active = key;
    },
    setValue(key, value) {
      this.values = { ...this.values, [key]: value };
      this.wrongKeys = this.wrongKeys.filter((k) => k !== key);
    },
    press(key) {
      if (this.answered || !this.active) return;
      const current = this.values[this.active] || "";
      if (key === "clear") {
        this.setValue(this.active, "");
      } else if (OPS.includes(key)) {
        if (!this.activeIsOp) return;
        this.setValue(this.active, key);
        const next = this.fieldOrder[this.fieldOrder.indexOf(this.active) + 1];
        if (next) this.active = next;
      } else if (key === "←") {
        this.setValue(this.active, current.slice(0, -1));
      } else if (!this.activeIsOp) {
        if (key === "." && current.includes(".")) return;
        if (current.length >= MAX_LENGTH) return;
        const value =
          key === "." && current === ""
            ? "0."
            : current === "0" && key !== "."
              ? key
              : current + key;
        this.setValue(this.active, value);
      }
    },
    sameNumber(input, expected) {
      return (
        input !== undefined &&
        input !== "" &&
        !Number.isNaN(Number(input)) &&
        Math.abs(Number(input) - Number(expected)) < 1e-9
      );
    },
    // 回傳答錯的格子
    findWrongKeys() {
      const wrong = [];
      this.gameData.steps.forEach((step, s) => {
        const v = (part) => this.values[`s${s}${part}`];
        if (v("op") !== step.op) wrong.push(`s${s}op`);
        const inOrder =
          this.sameNumber(v("a"), step.a) && this.sameNumber(v("b"), step.b);
        const swapped =
          COMMUTATIVE.includes(step.op) &&
          this.sameNumber(v("a"), step.b) &&
          this.sameNumber(v("b"), step.a);
        if (!inOrder && !swapped) {
          if (!this.sameNumber(v("a"), step.a)) wrong.push(`s${s}a`);
          if (!this.sameNumber(v("b"), step.b)) wrong.push(`s${s}b`);
        }
        if (!this.sameNumber(v("result"), step.result))
          wrong.push(`s${s}result`);
      });
      if (!this.sameNumber(this.values.answer, this.gameData.answer))
        wrong.push("answer");
      return wrong;
    },
    formatSteps(pick) {
      return this.gameData.steps
        .map((step, s) => {
          const v = pick(step, s);
          return `${v.a || "_"} ${this.showOp(v.op) || "_"} ${v.b || "_"} = ${
            v.result || "_"
          }`;
        })
        .join("；");
    },
    checkAnswer() {
      if (this.answered) return;
      this.wrongKeys = this.findWrongKeys();
      const isCorrect = this.wrongKeys.length === 0;
      const expected = `${this.formatSteps((step) => step)}，答：${
        this.gameData.answer
      } ${this.gameData.unit}`;
      const actual = `${this.formatSteps((_, s) => ({
        a: this.values[`s${s}a`],
        op: this.values[`s${s}op`],
        b: this.values[`s${s}b`],
        result: this.values[`s${s}result`],
      }))}，答：${this.values.answer || "_"} ${this.gameData.unit}`;
      this.$emit("add-record", [expected, actual, isCorrect ? "正確" : "錯誤"]);
      if (isCorrect) {
        this.answered = true;
        // 答對後顯示標準做法
        const filled = { answer: this.gameData.answer };
        this.gameData.steps.forEach((step, s) => {
          filled[`s${s}a`] = step.a;
          filled[`s${s}op`] = step.op;
          filled[`s${s}b`] = step.b;
          filled[`s${s}result`] = step.result;
        });
        this.values = filled;
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
  align-items: center;
  gap: 1.5rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small;
}

.work-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.question-text {
  margin: 0;
  padding: 0.8rem 1.2rem;
  font-size: 1.7rem;
  font-weight: $font-bold;
  line-height: 1.6;
  background-color: #fff8e1;
  border: 3px solid #ffcc80;
  border-radius: 14px;
}

.work-block {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding: 0.8rem 1rem;
  background-color: #ffffff;
  border-radius: 14px;
}

.work-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 2rem;
  font-weight: $font-bold;
}

.work-label {
  width: 6.5rem;
  white-space: nowrap;
  flex-shrink: 0;
  font-size: 1.6rem;
}

.work-unit {
  font-size: 1.8rem;
}

.fill-box {
  min-width: 6.5rem;
  height: 3.6rem;
  padding: 0 0.5rem;
  font-size: 2rem;
  font-weight: $font-bold;
  color: #1565c0;
  background-color: #ffffff;
  border: 3px dashed #90a4ae;
  border-radius: 10px;
  cursor: pointer;

  &--op {
    min-width: 3.6rem;
    color: #ef6c00;
  }

  &--active {
    border: 4px solid #1e88e5;
    background-color: #e3f2fd;
  }

  &--wrong {
    color: #c62828;
    border: 4px solid #e53935;
    background-color: #ffebee;
  }

  &--correct {
    color: #2e7d32;
    border: 3px solid #43a047;
    background-color: #e8f5e9;
  }
}

.pad {
  width: 15rem;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.7rem;
  background-color: #fff8e1;
  border: 4px solid #ffb74d;
  border-radius: 18px;

  &__ops,
  &__digits {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.45rem;
  }

  &__digits {
    grid-template-columns: repeat(3, 1fr);
  }
}

.pad-key {
  height: 3rem;
  padding: 0;
  line-height: 1;
  font-size: 1.6rem;
  font-weight: $font-bold;
  color: #333333;
  background-color: #ffffff;
  border: 2px solid #ffcc80;
  border-radius: 12px;
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.15);
  cursor: pointer;

  &:active:not(:disabled) {
    transform: translateY(2px);
    box-shadow: none;
  }

  &:disabled {
    opacity: 0.35;
    cursor: default;
  }

  &--op {
    color: #ffffff;
    background-color: #ffa726;
    border: none;
  }

  &--fn {
    background-color: #b3e5fc;
    color: #01579b;
  }

  &--clear {
    grid-column: span 3;
    color: #ffffff;
    background-color: #ef5350;
    border: none;
    font-size: 1.3rem;
  }
}

@media (max-height: 760px) {
  .question-text {
    font-size: 1.45rem;
    padding: 0.5rem 1rem;
  }

  .work-block {
    gap: 0.5rem;
  }

  .fill-box {
    height: 3rem;
  }

  .pad-key {
    height: 2.5rem;
  }
}

@media (max-width: 1100px) {
  .work-label {
    width: 5.6rem;
  }

  .fill-box {
    min-width: 5.2rem;
    font-size: 1.8rem;

    &--op {
      min-width: 3.2rem;
    }
  }

  .pad {
    width: 13.5rem;
  }
}
</style>

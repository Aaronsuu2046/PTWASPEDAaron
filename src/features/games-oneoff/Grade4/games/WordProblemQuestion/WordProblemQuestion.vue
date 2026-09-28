<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <div class="work-panel">
        <!-- 選填 calculator：可打開 MA4151 的計算機，看得到計算過程 -->
        <button
          v-if="gameData.calculator && !answered"
          type="button"
          class="calc-toggle"
          @click="calcOpen = !calcOpen"
        >
          {{ calcOpen ? "收起計算機" : "打開計算機" }}
        </button>
        <div class="question-row">
          <p class="question-text">{{ gameData.question }}</p>
          <!-- 選填：長方形／正方形示意圖 -->
          <CompositeFigure
            v-if="gameData.figure && gameData.figure.shape === 'composite'"
            class="work-figure work-figure--composite"
            :figure="gameData.figure"
          />
          <TileFigure
            v-else-if="gameData.figure && gameData.figure.shape === 'tiles'"
            class="work-figure work-figure--tiles"
            :figure="gameData.figure"
          />
          <RectFigure
            v-else-if="gameData.figure"
            class="work-figure"
            :figure="gameData.figure"
          />
        </div>

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
            <!-- 選填：有 unitOptions 時要選對單位 -->
            <template v-if="gameData.unitOptions">
              <button
                v-for="unit in gameData.unitOptions"
                :key="unit"
                type="button"
                class="unit-option"
                :class="{
                  'unit-option--selected': values.unit === unit,
                  'unit-option--wrong':
                    values.unit === unit && wrongKeys.includes('unit'),
                  'unit-option--correct': answered && values.unit === unit,
                }"
                :data-unit="unit"
                @click="chooseUnit(unit)"
              >
                {{ unit }}
              </button>
            </template>
            <span v-else class="work-unit">{{ gameData.unit }}</span>
          </div>
        </div>
      </div>

      <div v-if="gameData.calculator" v-show="calcOpen" class="calc-float">
        <div class="calc-float__head">
          <span>算好再填到格子裡</span>
          <button
            type="button"
            class="calc-float__close"
            @click="calcOpen = false"
          >
            關閉
          </button>
        </div>
        <KidCalculator />
      </div>

      <!-- 選填 revealMs：答對後停留，讓學生看完整做法再進下一題 -->
      <div v-if="revealing" class="reveal">
        <p class="reveal__title">答對了！</p>
        <p class="reveal__text">看看完整的做法</p>
      </div>

      <!-- 按鍵：選到數字格可按數字，選到符號格可按運算符號 -->
      <div v-else class="pad">
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
import RectFigure from "./RectFigure.vue";
import CompositeFigure from "./CompositeFigure.vue";
import TileFigure from "./TileFigure.vue";
import KidCalculator from "../CalculatorQuestion/KidCalculator.vue";

const OPS = ["+", "-", "×", "÷"];
const OP_LABEL = { "-": "−" };
// 交換兩數結果不變的運算，做法可接受 4 × 1.8 這種寫法
const COMMUTATIVE = ["+", "×"];
const MAX_LENGTH = 7;

// 應用題共用：題目 { question, steps: [{ a, op, b, result }], answer, unit }
// 學生填每一步的算式與答案；數字以數值比對（7.20 = 7.2）
// 選填 calculator: true：畫面上可打開小學生版計算機（顯示計算紀錄）
export default {
  name: "WordProblemQuestion",
  components: { RectFigure, CompositeFigure, TileFigure, KidCalculator },
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
      revealing: false,
      calcOpen: false,
      revealTimer: null,
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
    clearTimeout(this.revealTimer);
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
    chooseUnit(unit) {
      if (this.answered) return;
      this.setValue("unit", unit);
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
      const wrong =
        this.gameData.stepCheck === "consistent"
          ? this.findInconsistentSteps()
          : this.findStepMismatches();
      if (!this.sameNumber(this.values.answer, this.gameData.answer))
        wrong.push("answer");
      if (this.gameData.unitOptions && this.values.unit !== this.gameData.unit)
        wrong.push("unit");
      return wrong;
    },
    // 預設：每一步都要和標準做法相同（× 與 + 可交換兩數）
    findStepMismatches() {
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
      return wrong;
    },
    // 選填 stepCheck: "consistent"：接受等價做法，只要每一步都算對、
    // 最後一步等於答案即可
    findInconsistentSteps() {
      const wrong = [];
      const last = this.gameData.steps.length - 1;
      this.gameData.steps.forEach((_, s) => {
        const key = (part) => `s${s}${part}`;
        const num = (part) => this.values[key(part)];
        const filled = (part) =>
          num(part) !== undefined &&
          num(part) !== "" &&
          !Number.isNaN(Number(num(part)));
        ["a", "b", "result"].forEach((part) => {
          if (!filled(part)) wrong.push(key(part));
        });
        const op = this.values[key("op")];
        if (!OPS.includes(op)) wrong.push(key("op"));
        if (wrong.some((k) => k.startsWith(`s${s}`))) return;
        const a = Number(num("a"));
        const b = Number(num("b"));
        const value = { "+": a + b, "-": a - b, "×": a * b, "÷": a / b }[op];
        if (!this.sameNumber(num("result"), value)) wrong.push(key("result"));
        else if (
          s === last &&
          !this.sameNumber(num("result"), this.gameData.answer)
        )
          wrong.push(key("result"));
      });
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
      }))}，答：${this.values.answer || "_"} ${
        this.gameData.unitOptions ? this.values.unit || "_" : this.gameData.unit
      }`;
      this.$emit("add-record", [expected, actual, isCorrect ? "正確" : "錯誤"]);
      if (isCorrect) {
        this.answered = true;
        // 答對後顯示標準做法
        const filled = {
          answer: this.gameData.answer,
          unit: this.gameData.unit,
        };
        // consistent 模式保留學生自己的等價做法，其餘顯示標準做法
        const keepOwn = this.gameData.stepCheck === "consistent";
        this.gameData.steps.forEach((step, s) => {
          if (keepOwn) return;
          filled[`s${s}a`] = step.a;
          filled[`s${s}op`] = step.op;
          filled[`s${s}b`] = step.b;
          filled[`s${s}result`] = step.result;
        });
        this.values = keepOwn ? { ...this.values, ...filled } : filled;
        this.$emit("play-effect", "CorrectSound");
        if (this.gameData.revealMs > 0) {
          this.revealing = true;
          this.revealTimer = setTimeout(
            () => this.$emit("next-question"),
            this.gameData.revealMs
          );
        } else {
          this.$emit("next-question");
        }
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
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small;
}

.calc-toggle {
  align-self: flex-end;
  padding: 0.35rem 1rem;
  font-size: 1.2rem;
  font-weight: $font-bold;
  color: #ffffff;
  background-color: #ff9800;
  border: none;
  border-radius: 12px;
  box-shadow: 0 3px 0 #e65100;
  cursor: pointer;
}

// 計算機蓋在右邊按鍵區上方
.calc-float {
  position: absolute;
  top: $padding--small;
  right: $padding--small;
  bottom: $padding--small;
  z-index: 5;
  width: 20rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.5rem;
  background-color: #fffde7;
  border-radius: 20px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    font-size: 1.05rem;
    font-weight: $font-bold;
    color: #6d4c41;
  }

  &__close {
    flex-shrink: 0;
    padding: 0.2rem 0.8rem;
    font-size: 1.1rem;
    font-weight: $font-bold;
    color: #ffffff;
    background-color: #ef5350;
    border: none;
    border-radius: 10px;
    cursor: pointer;
  }

  :deep(.kid-calc) {
    flex: 1;
    min-height: 0;
  }

  // 留空間給計算紀錄，按鍵壓扁一點
  :deep(.calc-history) {
    flex-shrink: 0;
    min-height: 5.5rem;
  }

  :deep(.calc-btn) {
    height: 2.4rem;
    font-size: 1.4rem;
  }

  // 平板高度不夠：按鍵與顯示數字再縮小，計算紀錄才看得到
  @media (max-height: 760px) {
    :deep(.calc-history) {
      min-height: 4.2rem;
    }

    :deep(.calc-btn) {
      height: 1.95rem;
      font-size: 1.2rem;
    }

    :deep(.calc-keypad) {
      gap: 6px;
      padding: 6px 10px;
    }

    :deep(.calc-display__value) {
      font-size: 2.2rem !important;
    }
  }
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

.question-row {
  display: flex;
  align-items: center;
  gap: 1rem;

  .question-text {
    flex: 1;
  }
}

.work-figure {
  width: 13rem;
  flex-shrink: 0;
  background-color: #ffffff;
  border-radius: 14px;
}

.work-figure--composite {
  width: 16rem;
}

.work-figure--tiles {
  width: 13rem;
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

.unit-option {
  height: 3rem;
  white-space: nowrap;
  padding: 0 0.7rem;
  font-size: 1.4rem;
  font-weight: $font-bold;
  color: #333333;
  background-color: #ffffff;
  border: 3px solid #ffcc80;
  border-radius: 10px;
  cursor: pointer;

  &--selected {
    color: #1565c0;
    border-color: #1e88e5;
    background-color: #e3f2fd;
  }

  &--wrong {
    color: #c62828;
    border-color: #e53935;
    background-color: #ffebee;
  }

  &--correct {
    color: #2e7d32;
    border-color: #43a047;
    background-color: #e8f5e9;
  }
}

.reveal {
  width: 15rem;
  flex-shrink: 0;
  padding: 1.5rem 1rem;
  text-align: center;
  background-color: #e8f5e9;
  border: 4px solid #66bb6a;
  border-radius: 18px;

  &__title {
    margin: 0;
    font-size: 2rem;
    white-space: nowrap;
    font-weight: $font-bold;
    color: #2e7d32;
  }

  &__text {
    margin: 0.5rem 0 0;
    font-size: 1.4rem;
    color: #33691e;
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

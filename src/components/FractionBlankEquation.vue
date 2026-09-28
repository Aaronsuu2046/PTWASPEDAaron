<template>
  <div class="fraction-blank-equation">
    <div
      v-for="(row, rowIndex) in parsedRows"
      :key="rowIndex"
      class="fraction-blank-equation__row"
    >
      <span v-if="row.label" class="fraction-blank-equation__label">
        {{ row.label }}：
      </span>
      <template v-for="(term, termIndex) in row.terms" :key="termIndex">
        <div v-if="term.isFraction" class="fraction">
          <template v-for="part in ['numerator', 'denominator']" :key="part">
            <span v-if="part === 'denominator'" class="fraction__line"></span>
            <div class="fraction__row">
              <template v-for="item in term[part]" :key="item.key">
                <button
                  v-if="item.isBlank"
                  type="button"
                  class="blank"
                  :class="{
                    'blank--active': activeKey === item.key,
                    'blank--wrong': wrongKeys.includes(item.key),
                  }"
                  @click="openNumPad(item.key, $event)"
                >
                  {{ inputs[item.key] }}
                </button>
                <span v-else class="fraction__text">{{ item.value }}</span>
              </template>
            </div>
          </template>
        </div>
        <span v-else class="fraction-blank-equation__text">
          {{ displayText(term.text) }}
        </span>
      </template>
    </div>

    <FloatNumPad
      v-if="activeKey"
      :component-config="numPadPosition"
      @button-clicked="onNumPadClick"
    />
  </div>
</template>

<script>
import { defineAsyncComponent } from "vue";

const MAX_DIGITS = 2;

// 多行分數等式，數字固定顯示，{ answer } 為學生填答的挖空欄位（逐格比對整數）
// rows: [{ label?: "先算", equation: [ { numerator: [...], denominator: [...] } | { text } ] }]
// 父元件在送出時呼叫 check() 取得結果
export default {
  name: "FractionBlankEquation",
  components: {
    FloatNumPad: defineAsyncComponent(
      () => import("@/components/FloatNumPad.vue")
    ),
  },
  props: {
    rows: { type: Array, required: true },
  },
  data() {
    return {
      inputs: {},
      activeKey: "",
      wrongKeys: [],
      numPadPosition: { top: 0, left: 0 },
    };
  },
  computed: {
    parsedRows() {
      const toItems = (parts, prefix) =>
        parts.map((part, index) => {
          const key = `${prefix}-${index}`;
          if (part !== null && typeof part === "object") {
            return { key, isBlank: true, answer: part.answer };
          }
          return { key, isBlank: false, value: part };
        });
      return this.rows.map((row, rowIndex) => ({
        label: row.label,
        terms: row.equation.map((term, index) => {
          if (term.numerator) {
            const prefix = `r${rowIndex}-t${index}`;
            return {
              isFraction: true,
              numerator: toItems(term.numerator, `${prefix}-n`),
              denominator: toItems(term.denominator, `${prefix}-d`),
            };
          }
          return { isFraction: false, text: term.text };
        }),
      }));
    },
    blanks() {
      return this.parsedRows
        .flatMap((row) => row.terms)
        .filter((term) => term.isFraction)
        .flatMap((term) => [...term.numerator, ...term.denominator])
        .filter((item) => item.isBlank);
    },
  },
  created() {
    this.inputs = Object.fromEntries(this.blanks.map((item) => [item.key, ""]));
  },
  methods: {
    // 以數學減號顯示「-」，較一般連字號清楚
    displayText(text) {
      return text === "-" ? "−" : text;
    },
    openNumPad(key, event) {
      const rect = event.currentTarget.getBoundingClientRect();
      this.activeKey = key;
      this.numPadPosition = {
        top: `${rect.top + window.scrollY}px`,
        left: `${rect.right + window.scrollX + 10}px`,
      };
    },
    onNumPadClick(label) {
      const key = this.activeKey;
      if (!key) return;
      if (label === "關閉") {
        this.activeKey = "";
        return;
      }
      this.wrongKeys = this.wrongKeys.filter((k) => k !== key);
      if (label === "清除") {
        this.inputs[key] = "";
        return;
      }
      // 答案皆為正整數，忽略小數點並限制位數
      if (label === "." || this.inputs[key].length >= MAX_DIGITS) return;
      this.inputs[key] += String(label);
    },
    // 檢查所有挖空欄位，標出答錯的欄位並回傳結果
    check() {
      this.activeKey = "";
      this.wrongKeys = this.blanks
        .filter((item) => parseInt(this.inputs[item.key], 10) !== item.answer)
        .map((item) => item.key);
      return {
        isCorrect: this.wrongKeys.length === 0,
        expected: this.blanks.map((item) => item.answer).join("、"),
        actual: this.blanks
          .map((item) => this.inputs[item.key] || "空白")
          .join("、"),
      };
    },
  },
};
</script>

<style scoped lang="scss">
.fraction-blank-equation {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;

  &__row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }

  &__label {
    min-width: 4.5rem;
    font-size: 1.5rem;
    font-weight: bold;
  }

  &__text {
    font-size: 1.9rem;
    font-weight: bold;
    padding: 0 0.15rem;
  }
}

.fraction {
  display: inline-flex;
  flex-direction: column;
  align-items: center;

  &__row {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.1rem 0.2rem;
  }

  &__line {
    display: block;
    width: 100%;
    border-top: 0.2rem solid #000000;
  }

  &__text {
    font-size: 1.7rem;
    font-weight: bold;
    min-width: 1.4rem;
    text-align: center;
  }
}

.blank {
  min-width: 2.4rem;
  height: 2.4rem;
  padding: 0 0.3rem;
  font-size: 1.5rem;
  font-weight: bold;
  color: #c62828;
  background-color: #ffffff;
  border: 3px solid #bdbdbd;
  border-radius: 6px;
  cursor: pointer;

  &--active {
    border-color: #1e88e5;
  }

  &--wrong {
    border-color: #e53935;
    background-color: #ffebee;
  }
}
</style>

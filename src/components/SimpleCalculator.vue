<template>
  <div class="calc-root">
    <!-- 計算紀錄 -->
    <div ref="historyEl" class="calc-history">
      <p v-if="history.length === 0" class="calc-history__hint">計算紀錄</p>
      <p v-for="(rec, i) in history" :key="i" class="calc-history__item">
        {{ rec }}
      </p>
    </div>

    <!-- 顯示區 -->
    <div class="calc-display">
      <div class="calc-display__expr">{{ exprLine }}</div>
      <div class="calc-display__value" :style="{ fontSize: displayFontSize }">
        {{ display }}
      </div>
    </div>

    <div class="calc-divider" />

    <!-- 按鍵區 -->
    <div class="calc-keypad">
      <button
        v-for="key in flatKeys"
        :key="key"
        :class="btnClass(key)"
        @click="press(key)"
      >
        {{ key }}
      </button>
    </div>
  </div>
</template>

<script>
const LAYOUT = [
  ['C', '()', '%', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '−'],
  ['1', '2', '3', '+'],
  ['+/−', '0', '.', '='],
];

const OPS = ['+', '−', '×', '÷'];

export default {
  name: 'SimpleCalculator',
  data() {
    return {
      display: '0',
      exprLine: '',
      input: '',
      firstOp: null,
      operator: null,
      evaluated: false,
      history: [],
    };
  },
  computed: {
    flatKeys() {
      return LAYOUT.flat();
    },
    displayFontSize() {
      const len = this.display.length;
      if (len > 13) return '1.4rem';
      if (len > 10) return '2rem';
      if (len > 7)  return '2.6rem';
      return '3.2rem';
    },
  },
  methods: {
    press(key) {
      if ('0123456789'.includes(key)) { this.digit(key); return; }
      if (key === '.')   { this.decimal(); return; }
      if (OPS.includes(key)) { this.opKey(key); return; }
      if (key === '=')   { this.equals(); return; }
      if (key === 'C')   { this.clear(); return; }
      if (key === '+/−') { this.negate(); return; }
      if (key === '%')   { this.percent(); return; }
      // '()' no-op for simple mode
    },

    digit(d) {
      if (this.evaluated) {
        this.input = d === '0' ? '0' : d;
        this.firstOp = null;
        this.operator = null;
        this.exprLine = '';
        this.evaluated = false;
      } else {
        this.input = this.input === '' || this.input === '0'
          ? d
          : this.input + d;
      }
      this.display = this.input;
    },

    decimal() {
      if (this.evaluated) {
        this.input = '0.';
        this.firstOp = null;
        this.operator = null;
        this.exprLine = '';
        this.evaluated = false;
      } else if (!this.input.includes('.')) {
        this.input = (this.input || '0') + '.';
      }
      this.display = this.input;
    },

    opKey(op) {
      const cur = this.currentNum();
      if (this.operator && this.input !== '' && !this.evaluated) {
        const result = this.compute(this.firstOp, this.operator, cur);
        this.firstOp = result;
        this.display = this.fmt(result);
      } else {
        this.firstOp = this.evaluated ? parseFloat(this.display) : cur;
      }
      this.operator = op;
      this.exprLine = this.fmt(this.firstOp) + ' ' + op;
      this.input = '';
      this.evaluated = false;
    },

    equals() {
      if (this.operator === null) return;
      const second = this.input !== '' ? parseFloat(this.input) : this.firstOp;
      const result = this.compute(this.firstOp, this.operator, second);
      const record = `${this.fmt(this.firstOp)} ${this.operator} ${this.fmt(second)} = ${this.fmt(result)}`;
      this.history.push(record);
      this.$nextTick(() => {
        if (this.$refs.historyEl) {
          this.$refs.historyEl.scrollTop = this.$refs.historyEl.scrollHeight;
        }
      });
      this.display = this.fmt(result);
      this.exprLine = '';
      this.input = '';
      this.evaluated = true;
    },

    clear() {
      this.display = '0';
      this.exprLine = '';
      this.input = '';
      this.firstOp = null;
      this.operator = null;
      this.evaluated = false;
    },

    negate() {
      const val = parseFloat(this.input || this.display);
      if (isNaN(val)) return;
      const neg = -val;
      this.input = String(neg);
      this.display = this.fmt(neg);
    },

    percent() {
      const val = parseFloat(this.input || this.display);
      if (isNaN(val)) return;
      const pct = val / 100;
      this.input = String(pct);
      this.display = this.fmt(pct);
    },

    currentNum() {
      if (this.input !== '') return parseFloat(this.input);
      return parseFloat(this.display);
    },

    compute(a, op, b) {
      switch (op) {
        case '+': return a + b;
        case '−': return a - b;
        case '×': return a * b;
        case '÷': return b === 0 ? NaN : a / b;
        default:  return b;
      }
    },

    fmt(n) {
      if (isNaN(n))      return '錯誤';
      if (!isFinite(n))  return '無限大';
      return String(parseFloat(n.toPrecision(12)));
    },

    btnClass(key) {
      if (key === '=')              return 'calc-btn --equal';
      if (key === 'C')              return 'calc-btn --clear';
      if (OPS.includes(key))        return 'calc-btn --op';
      if (['%', '()'].includes(key))return 'calc-btn --op';
      if (['+/−', '.'].includes(key))return 'calc-btn --fn';
      return 'calc-btn --num';
    },
  },
};
</script>

<style scoped lang="scss">
/* ── 全域色盤（本元件獨立，不依賴 SCSS 變數） ── */
$c-bg:       #111113;
$c-btn-num:  #2c2c2e;
$c-btn-fn:   #3a3a3c;
$c-op-text:  #e88ffc;
$c-equal-bg: #7b3ff2;
$c-white:    #f5f5f7;
$c-dim:      #636366;
$c-red:      #ff6b6b;

.calc-root {
  background: $c-bg;
  border-radius: 16px;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: -apple-system, 'Helvetica Neue', sans-serif;
  user-select: none;
}

/* ── 計算紀錄 ── */
.calc-history {
  flex: 1;
  min-height: 80px;
  overflow-y: auto;
  padding: 16px 20px 6px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 2px;

  &::-webkit-scrollbar        { width: 3px; }
  &::-webkit-scrollbar-track  { background: transparent; }
  &::-webkit-scrollbar-thumb  { background: #444; border-radius: 2px; }

  &__hint {
    color: $c-dim;
    font-size: 0.8rem;
    text-align: center;
    margin: 0;
  }

  &__item {
    color: $c-dim;
    font-size: 0.95rem;
    text-align: right;
    margin: 0;
    line-height: 1.5;
  }
}

/* ── 數值顯示 ── */
.calc-display {
  padding: 6px 20px 14px;
  text-align: right;

  &__expr {
    color: $c-dim;
    font-size: 1rem;
    min-height: 1.4em;
    letter-spacing: 0.04em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__value {
    color: $c-white;
    font-weight: 300;
    letter-spacing: -1px;
    line-height: 1.1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: font-size 0.15s ease;
  }
}

.calc-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.07);
  margin: 0 12px;
}

/* ── 按鍵區 ── */
.calc-keypad {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  padding: 12px 12px 16px;
}

.calc-btn {
  aspect-ratio: 1;
  border-radius: 50%;
  border: none;
  font-size: 1.4rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  transition: filter 0.08s, transform 0.08s;

  &:active {
    filter: brightness(1.5);
    transform: scale(0.93);
  }

  &.--num {
    background: $c-btn-num;
    color: $c-white;
  }

  &.--fn {
    background: $c-btn-fn;
    color: $c-white;
    font-size: 1.1rem;
  }

  &.--op {
    background: $c-btn-num;
    color: $c-op-text;
  }

  &.--clear {
    background: $c-btn-fn;
    color: $c-red;
    font-weight: 700;
  }

  &.--equal {
    background: $c-equal-bg;
    color: $c-white;
    font-size: 1.7rem;
    box-shadow: 0 4px 16px rgba(123, 63, 242, 0.5);
  }
}
</style>

<template>
  <div class="kid-calc">
    <SimpleCalculator ref="calc" />
  </div>
</template>

<script>
import SimpleCalculator from "@/components/SimpleCalculator.vue";

// 小學生版計算機：SimpleCalculator 加上明亮配色與放大的計算過程
// 父元件用 ref 呼叫 read() 取得目前顯示的數字（還沒按過時回傳空字串），
// lastExpression() 取得最後一次按「=」的算式
export default {
  name: "KidCalculator",
  components: { SimpleCalculator },
  methods: {
    read() {
      const calc = this.$refs.calc;
      if (!calc) return "";
      const untouched =
        calc.history.length === 0 && calc.input === "" && calc.display === "0";
      return untouched ? "" : calc.display;
    },
    // 最後一次按「=」的完整算式（例如「4395 ÷ 3 = 1465」）；按「=」之後又按了其他鍵就回傳空字串
    lastExpression() {
      const calc = this.$refs.calc;
      if (!calc || !calc.evaluated || !calc.history.length) return "";
      return calc.history[calc.history.length - 1];
    },
  },
};
</script>

<style scoped lang="scss">
.kid-calc {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

// 適合小學生的明亮配色；只在這裡覆寫，不改 SimpleCalculator 預設樣式
.kid-calc :deep(.calc-root) {
  background: #fff8e1;
  border: 4px solid #ffb74d;
  border-radius: 20px;
  font-family: inherit;
}

// 計算過程（計算紀錄與目前算式）字級放大 2 倍
.kid-calc :deep(.calc-history) {
  min-height: 0;
  padding: 8px 14px 0;

  .calc-history__hint {
    font-size: 1.6rem;
    color: #bcaaa4;
  }

  .calc-history__item {
    font-size: 1.9rem;
    font-weight: $font-bold;
    color: #6d4c41;
    line-height: 1.3;
  }
}

.kid-calc :deep(.calc-display) {
  margin: 0 10px;
  padding: 4px 12px 6px;
  background: #ffffff;
  border: 3px solid #ffcc80;
  border-radius: 12px;

  .calc-display__expr {
    font-size: 2rem;
    font-weight: $font-bold;
    color: #1e88e5;
  }

  .calc-display__value {
    color: #333333;
    font-weight: $font-bold;
  }
}

.kid-calc :deep(.calc-divider) {
  display: none;
}

.kid-calc :deep(.calc-keypad) {
  gap: 8px;
  padding: 10px;
}

.kid-calc :deep(.calc-btn) {
  aspect-ratio: auto;
  height: 3rem;
  padding: 0;
  line-height: 1;
  border-radius: 14px;
  font-size: 1.6rem;
  font-weight: $font-bold;
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.18);

  &.--num {
    background: #ffffff;
    color: #333333;
    border: 2px solid #ffcc80;
  }

  &.--op {
    background: #ffa726;
    color: #ffffff;
  }

  &.--fn {
    background: #b3e5fc;
    color: #01579b;
  }

  &.--clear {
    background: #ef5350;
    color: #ffffff;
  }

  &.--equal {
    background: #66bb6a;
    color: #ffffff;
    font-size: 1.9rem;
    box-shadow: 0 3px 0 #388e3c;
  }
}

// 螢幕較矮（平板）時按鍵壓扁一些，留空間給放大的計算過程
@media (max-height: 760px) {
  .kid-calc :deep(.calc-btn) {
    height: 2.3rem;
    font-size: 1.4rem;
  }
}
</style>

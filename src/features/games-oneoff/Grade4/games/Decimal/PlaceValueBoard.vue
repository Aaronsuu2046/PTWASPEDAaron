<template>
  <!-- 小數定位板：十位、個位、十分位、百分位；小數點固定在個位和十分位之間 -->
  <div
    class="pv-wrap"
    :style="{ '--cols': units.length, '--point': pointAfter }"
  >
    <div class="pv-board">
      <span
        v-for="(unit, k) in units"
        :key="`h${k}`"
        class="pv-board__head"
        :style="{ backgroundColor: COLORS[k % COLORS.length] }"
      >
        {{ unit }}
      </span>
      <template v-for="(value, k) in values" :key="`c${k}`">
        <button
          v-if="editable"
          type="button"
          class="pv-board__cell pv-board__cell--input"
          :class="{
            'pv-board__cell--active': active === k,
            'pv-board__cell--wrong': wrongCells.includes(k),
            'pv-board__cell--correct': correct,
          }"
          :data-cell="k"
          data-pad-field
          :aria-label="`${units[k]}的數字`"
          @click="$emit('pick', k, $event.currentTarget)"
        >
          {{ value }}
        </button>
        <span v-else class="pv-board__cell" :data-cell="k">
          {{ value }}
        </span>
      </template>
    </div>
    <!-- 小數點：畫在格子外面一層，壓在兩欄之間的格線上，不會被格子的底色蓋掉 -->
    <span class="pv-point" aria-hidden="true" />
  </div>
</template>

<script>
const COLORS = ["#ffe0b2", "#fff59d", "#c8e6c9", "#b3e5fc", "#e1bee7"];

// units：各欄名稱；values：各欄數字（字串，空字串表示沒填）；pointAfter：小數點畫在第幾欄右邊
// editable 時每格是按鈕，點了送出 pick(欄位, 元素)；wrongCells 標紅
export default {
  name: "PlaceValueBoard",
  props: {
    units: {
      type: Array,
      default: () => ["十位", "個位", "十分位", "百分位"],
    },
    values: { type: Array, required: true },
    pointAfter: { type: Number, default: 1 },
    editable: { type: Boolean, default: false },
    active: { type: Number, default: null },
    wrongCells: { type: Array, default: () => [] },
    correct: { type: Boolean, default: false },
  },
  emits: ["pick"],
  data() {
    return { COLORS };
  },
};
</script>

<style scoped lang="scss">
.pv-wrap {
  --cw: 5.6rem;
  --border: 4px;
  position: relative;
  display: inline-block;
}

.pv-point {
  position: absolute;
  left: calc(var(--border) + (var(--point) + 1) * var(--cw) - 0.6rem);
  bottom: calc(var(--border) + 0.8rem);
  width: 1.2rem;
  height: 1.2rem;
  background-color: #d84315;
  border: 2px solid #ffffff;
  border-radius: 50%;
  z-index: 2;
  pointer-events: none;
}

.pv-board {
  display: grid;
  grid-template-columns: repeat(var(--cols), var(--cw));
  box-sizing: border-box;
  border: 4px solid #5d4037;
  border-radius: 14px;
  overflow: hidden;
  background-color: #ffffff;

  &__head {
    padding: 0.4rem 0;
    text-align: center;
    font-size: 1.3rem;
    font-weight: $font-bold;
    color: #4e342e;
    border-right: 2px solid #8d6e63;
    border-bottom: 3px solid #5d4037;

    &:nth-child(4n) {
      border-right: none;
    }
  }

  &__cell {
    position: relative;
    height: 5.6rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 3rem;
    font-weight: $font-bold;
    color: #0d47a1;
    background-color: #ffffff;
    border: none;
    border-right: 2px solid #8d6e63;
    box-sizing: border-box;

    &:last-child {
      border-right: none;
    }

    &--input {
      cursor: pointer;
      box-shadow: inset 0 0 0 3px transparent;
    }

    &--active {
      background-color: #e3f2fd;
      box-shadow: inset 0 0 0 4px #1e88e5;
    }

    &--wrong {
      background-color: #ffebee;
      box-shadow: inset 0 0 0 4px #e53935;
    }

    &--correct {
      background-color: #e8f5e9;
      color: #2e7d32;
    }
  }
}

@media (max-width: 1100px), (max-height: 760px) {
  .pv-wrap {
    --cw: 4.6rem;
  }

  .pv-board {
    &__head {
      font-size: 1.1rem;
    }

    &__cell {
      height: 4.6rem;
      font-size: 2.5rem;
    }
  }
}
</style>

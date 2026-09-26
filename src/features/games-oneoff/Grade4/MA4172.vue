<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <p v-if="gameData.stem" class="stem-text">{{ gameData.stem }}</p>
      <p class="question-text">{{ gameData.question }}</p>

      <!-- 關卡 1、2：基準數字表與三張碎片選項 -->
      <template v-if="isFragment">
        <div class="base-table" :style="gridStyle(base.cols)">
          <span v-for="cell in baseCells" :key="cell" class="base-table__cell">
            {{ cell }}
          </span>
        </div>
        <p v-if="base.order === 'row'" class="base-table__more">⋮</p>
        <div class="fragment-list">
          <button
            v-for="option in gameData.options"
            :key="option.label"
            type="button"
            class="fragment-card"
            :class="{
              'fragment-card--selected': selected === option.label,
              'fragment-card--wrong': wrong && selected === option.label,
            }"
            @click="select(option.label)"
          >
            <span class="fragment-card__label">{{ option.label }}</span>
            <div class="fragment" :style="fragmentStyle(option.cells)">
              <span
                v-for="([r, c, value], index) in option.cells"
                :key="index"
                class="fragment__cell"
                :style="{ gridRow: r + 1, gridColumn: c + 1 }"
              >
                {{ value === null ? "" : value }}
              </span>
            </div>
          </button>
        </div>
      </template>

      <!-- 關卡 3：4 月月曆 -->
      <table v-else-if="gameData.type === 'calendar'" class="calendar">
        <tr>
          <th colspan="7" class="calendar__month">4 月</th>
        </tr>
        <tr>
          <th v-for="day in WEEKDAYS" :key="day">{{ day }}</th>
        </tr>
        <tr v-for="(week, index) in calendarWeeks" :key="index">
          <td v-for="(day, col) in week" :key="col">{{ day || "" }}</td>
        </tr>
      </table>

      <!-- 關卡 4：高鐵座位表 -->
      <div v-else-if="gameData.type === 'hsr'" class="seat-map">
        <span class="seat-map__window">窗戶</span>
        <div class="seat-map__rows">
          <div v-for="row in [1, 2, 3]" :key="row" class="seat-map__row">
            <span v-for="seat in ['E', 'D']" :key="seat" class="seat">
              {{ row }}{{ seat }}
            </span>
            <span class="seat-map__aisle">走道</span>
            <span v-for="seat in ['C', 'B', 'A']" :key="seat" class="seat">
              {{ row }}{{ seat }}
            </span>
          </div>
        </div>
        <span class="seat-map__window">窗戶</span>
      </div>

      <!-- 關卡 5：客運座位表 -->
      <div v-else-if="gameData.type === 'bus'" class="seat-map">
        <span class="seat-map__window">窗戶</span>
        <div class="seat-map__rows">
          <div v-for="row in BUS_ROWS" :key="row" class="seat-map__row">
            <span class="seat">{{ row * 3 + 2 }}</span>
            <span class="seat">{{ row * 3 + 3 }}</span>
            <span class="seat-map__aisle">走道</span>
            <span class="seat">{{ row * 3 + 1 }}</span>
          </div>
          <span class="seat-map__more">⋮</span>
        </div>
        <span class="seat-map__window">窗戶</span>
      </div>

      <div v-if="!isFragment" class="option-group">
        <button
          v-for="option in gameData.options"
          :key="option.label"
          type="button"
          :class="{
            'button--onclick': selected === option.label,
            'option--wrong': wrong && selected === option.label,
          }"
          @click="select(option.label)"
        >
          {{ option.label }}<span class="option-text">{{ option.text }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";

export default {
  name: "MA4172",
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      WEEKDAYS: ["日", "一", "二", "三", "四", "五", "六"],
      BUS_ROWS: [0, 1, 2, 3, 4],
      selected: "",
      wrong: false,
      answered: false,
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "觀察數字排列的規律回答問題";
    },
    isFragment() {
      return this.gameData.type === "fragment";
    },
    base() {
      return this.gameData.base || {};
    },
    // 基準表依「由左到右」或「依欄遞增」排列，輸出成逐列的格子
    baseCells() {
      const { rows, cols, order } = this.base;
      const cells = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          cells.push(order === "row" ? r * cols + c + 1 : c * rows + r + 1);
        }
      }
      return cells;
    },
    calendarWeeks() {
      const { firstWeekday, days } = this.gameData.calendar;
      const cells = [
        ...Array(firstWeekday).fill(null),
        ...Array.from({ length: days }, (_, i) => i + 1),
      ];
      const weeks = [];
      // 最後一週補空格，讓表格維持 7 欄
      while (cells.length % 7 !== 0) cells.push(null);
      for (let i = 0; i < cells.length; i += 7)
        weeks.push(cells.slice(i, i + 7));
      return weeks;
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    gridStyle(cols) {
      return { gridTemplateColumns: `repeat(${cols}, 1fr)` };
    },
    fragmentStyle(cells) {
      const rows = Math.max(...cells.map(([r]) => r)) + 1;
      const cols = Math.max(...cells.map(([, c]) => c)) + 1;
      return {
        gridTemplateRows: `repeat(${rows}, 2.3rem)`,
        gridTemplateColumns: `repeat(${cols}, 2.3rem)`,
      };
    },
    select(label) {
      this.selected = label;
      this.wrong = false;
    },
    checkAnswer() {
      if (this.answered) return;
      const isCorrect = this.selected === this.gameData.answer;
      this.wrong = !isCorrect;
      this.$emit("add-record", [
        this.gameData.answer,
        this.selected || "未作答",
        isCorrect ? "正確" : "錯誤",
      ]);
      if (isCorrect) {
        this.answered = true;
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
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small;
}

.stem-text {
  margin: 0;
  font-size: 1.2rem;
  color: #444444;
}

.question-text {
  margin: 0;
  font-size: 1.6rem;
  font-weight: $font-bold;
  text-align: center;
}

.base-table {
  display: grid;
  gap: 2px;
  padding: 2px;
  background-color: #8d6e63;

  &__cell {
    min-width: 2.2rem;
    padding: 0.05rem 0.3rem;
    font-size: 1rem;
    text-align: center;
    background-color: #ffffff;
  }

  &__more {
    margin: -0.6rem 0 0;
    font-size: 1.2rem;
    line-height: 1;
  }
}

.fragment-list {
  display: flex;
  gap: 1.5rem;
}

.fragment-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 1rem 0.6rem;
  background-color: #ffffff;
  border: 3px solid #bdbdbd;
  border-radius: 12px;
  cursor: pointer;

  &--selected {
    border-color: #1e88e5;
    background-color: #e3f2fd;
  }

  &--wrong {
    border-color: #e53935;
    background-color: #ffebee;
  }

  &__label {
    font-size: 1.5rem;
    font-weight: $font-bold;
  }
}

.fragment {
  display: grid;

  &__cell {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    font-weight: $font-bold;
    background-color: #fff8e1;
    border: 2px solid #8d6e63;
    margin: -1px;
  }
}

.calendar {
  border-collapse: collapse;
  background-color: #ffffff;
  font-size: 1.2rem;

  &__month {
    font-size: 1.3rem;
    background-color: #ffcc80 !important;
  }

  th,
  td {
    width: 3rem;
    height: 2.1rem;
    text-align: center;
    border: 2px solid #8d6e63;
  }

  th {
    background-color: #ffe0b2;
  }
}

// 窗戶在每一排的左右兩側，中間是座位
.seat-map {
  display: flex;
  align-items: stretch;
  gap: 0.5rem;

  &__rows {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
  }

  &__row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  &__aisle {
    width: 4rem;
    text-align: center;
    color: #6d4c41;
    font-size: 0.95rem;
    letter-spacing: 0.3em;
  }

  &__window {
    display: flex;
    align-items: center;
    writing-mode: vertical-rl;
    letter-spacing: 0.4em;
    padding: 0 0.3rem;
    font-size: 0.95rem;
    color: #01579b;
    background-color: #b3e5fc;
    border-radius: 6px;
  }

  &__more {
    line-height: 1;
  }
}

.seat {
  min-width: 3.2rem;
  padding: 0.2rem 0.4rem;
  font-size: 1.15rem;
  font-weight: $font-bold;
  text-align: center;
  background-color: #ffffff;
  border: 2px solid #8d6e63;
  border-radius: 8px 8px 4px 4px;
}

.option-group {
  display: flex;
  gap: 1.5rem;

  button {
    @extend .button-basic;
    border: none;
    min-width: 9rem;
    padding: 0.5rem 1.2rem;
    font-size: 24px;
    background-color: $primary-btn-bg;
  }
}

.option-text {
  margin-left: 0.6rem;
}

.button--onclick {
  background-color: $primary-btn-hover-bg !important;
  scale: 1.03;
}

.option--wrong {
  outline: 3px solid #e53935;
}
</style>

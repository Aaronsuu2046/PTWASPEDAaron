<template>
  <div class="dfill">
    <div
      class="dfill__grid"
      :style="{
        gridTemplateColumns: `repeat(${divisor.length}, var(--cell)) 1.4rem repeat(${dividend.length}, var(--cell))`,
      }"
    >
      <template v-for="item in items" :key="item.key">
        <div
          v-if="item.type === 'line'"
          class="dfill__line"
          :style="place(item)"
        />
        <svg
          v-else-if="item.type === 'bracket'"
          class="dfill__bracket"
          :style="place(item)"
          viewBox="0 0 20 60"
          preserveAspectRatio="none"
        >
          <path d="M4 2 Q18 30 4 58" />
        </svg>
        <button
          v-else-if="item.type === 'cell'"
          type="button"
          class="dfill__cell dfill__input"
          :class="cellClass(item.cellId)"
          :style="place(item)"
          :data-cell="item.cellId"
          @click="activate(item.cellId)"
        >
          {{ values[item.cellId] || "" }}
        </button>
        <button
          v-else-if="item.type === 'cross'"
          type="button"
          class="dfill__cell dfill__digit dfill__zero"
          :class="{ 'dfill__zero--crossed': item.crossed }"
          :style="place(item)"
          :data-cross="`${item.side}${item.index}`"
          @click="toggleCross(item.side, item.index)"
        >
          {{ item.text }}
        </button>
        <span
          v-else
          class="dfill__cell dfill__digit"
          :class="{
            'dfill__digit--top': item.top,
            'dfill__digit--crossed': item.crossed,
          }"
          :style="place(item)"
        >
          {{ item.text }}
        </span>
      </template>
    </div>
    <p v-if="crossable && !ready" class="dfill__notice">
      {{
        crossA === crossB
          ? "先點被除數和除數末尾的 0，把它劃掉"
          : "兩邊要劃掉一樣多個 0"
      }}
    </p>
  </div>
</template>

<script>
import { divisionLayout } from "./divisionLayout.js";

const trailingZeros = (s) => s.length - s.replace(/0+$/, "").length;

// 除法直式定位版：商寫在被除數上方正確的位值欄（每一欄都有黃色格子），
// 直式每一步（乘積、相減後放下下一位、最後餘數）也要填。
// crossable：可以點末尾的 0 劃掉（兩邊要劃一樣多個），劃掉後用剩下的數字做直式。
// 父元件用 ref 呼叫 input(key) 輸入、check() 判分
export default {
  name: "DivisionFill",
  props: {
    dividend: { type: String, required: true },
    divisor: { type: String, required: true },
    crossable: { type: Boolean, default: false },
  },
  emits: ["change", "focus"],
  data() {
    return {
      values: {},
      active: null,
      wrong: [],
      solved: false,
      crossA: 0,
      crossB: 0,
    };
  },
  computed: {
    ready() {
      if (!this.crossable) return true;
      return this.crossA === this.crossB && this.crossA > 0;
    },
    activeLen() {
      return this.dividend.length - (this.ready ? this.crossA : 0);
    },
    layout() {
      if (!this.ready) return null;
      return divisionLayout(
        this.dividend.slice(0, this.activeLen),
        this.divisor.slice(0, this.divisor.length - this.crossB)
      );
    },
    // 畫面上的每個格子、數字、線，都用 grid 位置擺放
    items() {
      const items = [];
      const dl = this.divisor.length;
      const colOf = (c) => dl + 2 + c;
      const tzA = trailingZeros(this.dividend);
      const tzB = trailingZeros(this.divisor);
      // 第 1 列：商
      if (this.layout) {
        for (let c = 0; c < this.activeLen; c += 1) {
          items.push({
            key: `q${c}`,
            type: "cell",
            cellId: `q${c}`,
            row: 1,
            col: colOf(c),
          });
        }
      }
      // 第 2 列：除數 ) 被除數
      [...this.divisor].forEach((ch, i) => {
        const crossIndex = dl - i;
        if (this.crossable && crossIndex <= tzB && !this.solved) {
          items.push({
            key: `b${i}`,
            type: "cross",
            side: "b",
            index: crossIndex,
            text: ch,
            crossed: crossIndex <= this.crossB,
            row: 2,
            col: i + 1,
          });
        } else {
          items.push({
            key: `b${i}`,
            type: "text",
            text: ch,
            crossed: crossIndex <= this.crossB,
            row: 2,
            col: i + 1,
          });
        }
      });
      items.push({ key: "bracket", type: "bracket", row: 2, col: dl + 1 });
      [...this.dividend].forEach((ch, i) => {
        const crossIndex = this.dividend.length - i;
        const crossed = crossIndex <= this.crossA;
        if (this.crossable && crossIndex <= tzA && !this.solved) {
          items.push({
            key: `a${i}`,
            type: "cross",
            side: "a",
            index: crossIndex,
            text: ch,
            crossed,
            row: 2,
            col: colOf(i),
          });
        } else {
          items.push({
            key: `a${i}`,
            type: "text",
            text: ch,
            top: true,
            crossed,
            row: 2,
            col: colOf(i),
          });
        }
      });
      items.push({
        key: "topline",
        type: "line",
        row: 2,
        col: colOf(0),
        span: this.dividend.length,
        top: true,
      });
      // 直式每一步
      if (this.layout) {
        let row = 3;
        this.layout.rows.forEach((r, i) => {
          Object.keys(r.digits).forEach((c) => {
            items.push({
              key: `r${i}c${c}`,
              type: "cell",
              cellId: `r${i}c${c}`,
              row,
              col: colOf(Number(c)),
            });
          });
          row += 1;
          if (r.kind === "product") {
            items.push({
              key: `line${i}`,
              type: "line",
              row,
              col: colOf(0),
              span: this.activeLen,
            });
            row += 1;
          }
        });
      }
      return items;
    },
    // 每個輸入格應該填的數字（商前面的空欄要留空）
    expected() {
      if (!this.layout) return {};
      const exp = {};
      for (let c = 0; c < this.activeLen; c += 1) {
        const q = this.layout.quotient[c];
        exp[`q${c}`] = q === undefined ? "" : String(q);
      }
      this.layout.rows.forEach((r, i) => {
        Object.entries(r.digits).forEach(([c, d]) => {
          exp[`r${i}c${c}`] = String(d);
        });
      });
      return exp;
    },
    cellOrder() {
      return this.items
        .filter((it) => it.type === "cell")
        .map((it) => it.cellId);
    },
  },
  watch: {
    ready() {
      this.values = {};
      this.wrong = [];
      this.active = null;
    },
  },
  mounted() {
    window.addEventListener("keydown", this.onKey);
  },
  beforeUnmount() {
    window.removeEventListener("keydown", this.onKey);
  },
  methods: {
    place(item) {
      return {
        gridRow: item.row,
        gridColumn: item.span ? `${item.col} / span ${item.span}` : item.col,
        ...(item.type === "line" && item.top ? { alignSelf: "start" } : {}),
      };
    },
    cellClass(id) {
      return {
        "dfill__input--active": this.active === id,
        "dfill__input--wrong": this.wrong.includes(id),
        "dfill__input--correct": this.solved,
      };
    },
    activate(id) {
      if (this.solved) return;
      this.active = id;
      this.$emit("focus");
    },
    // 父元件把輸入焦點移到別處時呼叫
    blur() {
      this.active = null;
    },
    toggleCross(side, index) {
      if (this.solved) return;
      if (side === "a") this.crossA = this.crossA === index ? index - 1 : index;
      else this.crossB = this.crossB === index ? index - 1 : index;
      this.$emit("change");
    },
    // 放入數字；有 cellId 時放到那一格（拖曳用）
    input(key, cellId = this.active) {
      if (this.solved || !cellId || !(cellId in this.expected)) return;
      if (this.active !== cellId) this.$emit("focus");
      this.active = cellId;
      this.wrong = this.wrong.filter((id) => id !== cellId);
      if (key === "←") {
        this.values = { ...this.values, [cellId]: "" };
      } else {
        this.values = { ...this.values, [cellId]: key };
        // 自動跳到同一列右邊的下一格
        const next = this.cellOrder[this.cellOrder.indexOf(cellId) + 1];
        const rowOf = (id) => (id.startsWith("q") ? "q" : id.split("c")[0]);
        if (next && rowOf(next) === rowOf(cellId)) this.active = next;
      }
      this.$emit("change");
    },
    onKey(event) {
      if (/^[0-9]$/.test(event.key)) this.input(event.key);
      else if (event.key === "Backspace") this.input("←");
    },
    // 回傳 { ready, complete, correct, wrong（填錯格數）, quotient, remainder }，並標示填錯的格子
    check() {
      if (!this.ready) {
        return {
          ready: false,
          complete: false,
          correct: false,
          quotient: "",
          remainder: "",
        };
      }
      const exp = this.expected;
      const val = (id) => this.values[id] || "";
      const complete = Object.entries(exp).every(
        ([id, d]) => d === "" || val(id) !== ""
      );
      this.wrong = Object.keys(exp).filter(
        (id) => val(id) !== "" && val(id) !== exp[id]
      );
      const correct = complete && this.wrong.length === 0;
      this.solved = correct;
      const quotient = Object.keys(exp)
        .filter((id) => id.startsWith("q"))
        .map(val)
        .join("");
      const lastRow = this.layout.rows.length - 1;
      const remainder = Object.keys(exp)
        .filter((id) => id.startsWith(`r${lastRow}c`))
        .map(val)
        .join("");
      return {
        ready: true,
        complete,
        correct,
        wrong: this.wrong.length,
        quotient,
        remainder,
      };
    },
  },
};
</script>

<style scoped lang="scss">
.dfill {
  --cell: 3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;

  &__grid {
    display: grid;
    row-gap: 0.2rem;
    padding: 0.7rem 1.1rem;
    background-color: #ffffff;
    border-radius: 16px;
    box-shadow: 0 3px 0 rgba(0, 0, 0, 0.1);
  }

  &__cell {
    width: var(--cell);
    height: var(--cell);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    font-weight: $font-bold;
  }

  &__digit {
    color: #333333;

    &--crossed {
      position: relative;
      color: #b0bec5;

      &::after {
        content: "";
        position: absolute;
        left: 18%;
        right: 18%;
        top: 50%;
        height: 4px;
        background-color: #e53935;
        transform: rotate(-35deg);
      }
    }
  }

  &__zero {
    position: relative;
    margin: 0.1rem;
    width: calc(var(--cell) - 0.2rem);
    height: calc(var(--cell) - 0.2rem);
    background-color: #e3f2fd;
    border: 3px dashed #64b5f6;
    border-radius: 10px;
    cursor: pointer;

    &--crossed {
      color: #b0bec5;

      &::after {
        content: "";
        position: absolute;
        left: 12%;
        right: 12%;
        top: 50%;
        height: 4px;
        background-color: #e53935;
        transform: rotate(-35deg);
      }
    }
  }

  &__bracket {
    width: 1.4rem;
    height: var(--cell);
    fill: none;
    stroke: #455a64;
    stroke-width: 4;
  }

  &__line {
    height: 4px;
    background-color: #455a64;
    border-radius: 2px;
    align-self: end;
  }

  &__input {
    margin: 0.1rem;
    width: calc(var(--cell) - 0.2rem);
    height: calc(var(--cell) - 0.2rem);
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

  &__notice {
    margin: 0;
    font-size: 1.3rem;
    font-weight: $font-bold;
    color: #1565c0;
  }
}

@media (max-width: 1100px) {
  .dfill {
    --cell: 2.4rem;

    &__cell {
      font-size: 1.6rem;
    }
  }
}
</style>

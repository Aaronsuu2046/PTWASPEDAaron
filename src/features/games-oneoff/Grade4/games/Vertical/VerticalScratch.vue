<template>
  <div class="vfill">
    <div
      class="vfill__grid"
      :style="{ gridTemplateColumns: `repeat(${layout.cols}, var(--cell))` }"
    >
      <template v-for="item in layout.items" :key="item.key">
        <div
          v-if="item.type === 'line'"
          class="vfill__line"
          :style="place(item)"
        />
        <button
          v-else-if="item.type === 'cell'"
          type="button"
          class="vfill__cell vfill__input"
          :class="{
            'vfill__input--active': active === item.cellId,
            vfill__point: points[item.cellId],
          }"
          :style="place(item)"
          :data-cell="item.cellId"
          data-pad-field
          @click="activate(item.cellId)"
        >
          {{ values[item.cellId] || "" }}
        </button>
        <span
          v-else
          class="vfill__cell vfill__digit"
          :class="{
            vfill__point: item.point,
            'vfill__digit--op': item.op,
          }"
          :style="place(item)"
        >
          {{ item.text }}
        </span>
      </template>
    </div>
  </div>
</template>

<script>
const OP_LABEL = { "-": "−" };

// 把數字拆成整數部分與小數部分（"0.24" → ["0", "24"]）
const split = (n) => {
  const [i, f = ""] = String(n).split(".");
  return [i, f];
};

// 一列數字：從右邊第 right 欄開始往左排，point 是小數點落在哪一位數字的右下角
function numberRow(text, right, row, key) {
  const [i, f] = split(text);
  const digits = [...i, ...f];
  const pointAfter = f ? i.length - 1 : -1;
  return digits.map((ch, k) => ({
    key: `${key}${k}`,
    type: "text",
    text: ch,
    point: k === pointAfter,
    row,
    col: right - (digits.length - 1 - k),
  }));
}

// 加、減、乘的直式計算紙（只是算算看，不計分）：
// 加減法小數點對齊；乘法靠右對齊，兩位數以上的乘數會多幾列部分積。
// 答案格從右邊的個位開始填，填好一格自動跳到左邊；小數點鍵會在格子右下角加小數點。
// 父元件用 ref 呼叫 input(key)
export default {
  name: "VerticalScratch",
  props: {
    a: { type: String, required: true },
    op: { type: String, required: true },
    b: { type: String, required: true },
  },
  emits: ["focus"],
  data() {
    return { values: {}, points: {}, active: null };
  },
  computed: {
    layout() {
      return this.op === "×" ? this.multiplyLayout() : this.addLayout();
    },
    cellIds() {
      return this.layout.items
        .filter((it) => it.type === "cell")
        .map((it) => it.cellId);
    },
  },
  mounted() {
    window.addEventListener("keydown", this.onKey);
  },
  beforeUnmount() {
    window.removeEventListener("keydown", this.onKey);
  },
  // 放在 KeepAlive 裡切換到別的直式時，不要再接收鍵盤
  deactivated() {
    this.active = null;
  },
  methods: {
    // 加減：小數點對齊，加法左邊多留一格進位
    addLayout() {
      const [ai, af] = split(this.a);
      const [bi, bf] = split(this.b);
      const frac = Math.max(af.length, bf.length);
      const int = Math.max(ai.length, bi.length) + (this.op === "+" ? 1 : 0);
      const cols = int + frac + 1;
      // 整數部分最右一欄（個位）
      const ones = int + 1;
      const items = [
        ...numberRow(this.a, ones + af.length, 1, "a"),
        {
          key: "op",
          type: "text",
          text: this.opLabel(),
          op: true,
          row: 2,
          col: 1,
        },
        ...numberRow(this.b, ones + bf.length, 2, "b"),
        { key: "line", type: "line", row: 3, col: 1, span: cols },
      ];
      for (let c = 2; c <= cols; c += 1) {
        items.push(this.cell(4, c));
      }
      return { cols, items };
    },
    // 乘法：位數多的放上面，靠右對齊；乘數兩位數以上要寫部分積再相加
    multiplyLayout() {
      const len = (n) => String(Number(n.replace(".", ""))).length;
      const [top, bottom] =
        len(this.b) > len(this.a) ? [this.b, this.a] : [this.a, this.b];
      const width = len(top) + len(bottom);
      const shown = (n) => n.replace(".", "").length;
      const cols = Math.max(width, shown(top), shown(bottom) + 1) + 1;
      const items = [
        ...numberRow(top, cols, 1, "a"),
        { key: "op", type: "text", text: "×", op: true, row: 2, col: 1 },
        ...numberRow(bottom, cols, 2, "b"),
        { key: "line", type: "line", row: 3, col: 1, span: cols },
      ];
      let row = 4;
      const partials = len(bottom) > 1 ? len(bottom) : 0;
      for (let p = 0; p < partials; p += 1) {
        for (let c = 2; c <= cols; c += 1) items.push(this.cell(row, c));
        row += 1;
      }
      if (partials) {
        items.push({ key: "line2", type: "line", row, col: 1, span: cols });
        row += 1;
      }
      for (let c = 2; c <= cols; c += 1) items.push(this.cell(row, c));
      return { cols, items };
    },
    cell(row, col) {
      const cellId = `r${row}c${col}`;
      return { key: cellId, type: "cell", cellId, row, col };
    },
    opLabel() {
      return OP_LABEL[this.op] || this.op;
    },
    place(item) {
      return {
        gridRow: item.row,
        gridColumn: item.span ? `${item.col} / span ${item.span}` : item.col,
      };
    },
    activate(id) {
      this.active = id;
      this.$emit("focus");
    },
    blur() {
      this.active = null;
    },
    // 放入數字：填好自動跳到同一列左邊一格；"." 在這一格加上／拿掉小數點
    input(key) {
      const id = this.active;
      if (!id) return;
      if (key === "←" || key === "clear") {
        this.values = { ...this.values, [id]: "" };
        this.points = { ...this.points, [id]: false };
      } else if (key === ".") {
        this.points = { ...this.points, [id]: !this.points[id] };
      } else if (/^\d$/.test(key)) {
        this.values = { ...this.values, [id]: key };
        const [, row, col] = id.match(/^r(\d+)c(\d+)$/);
        const left = `r${row}c${Number(col) - 1}`;
        if (this.cellIds.includes(left)) this.active = left;
      }
    },
    onKey(event) {
      if (!this.active) return;
      if (/^[0-9.]$/.test(event.key)) this.input(event.key);
      else if (event.key === "Backspace") this.input("←");
    },
  },
};
</script>

<style scoped lang="scss">
.vfill {
  --cell: 3rem;
  display: flex;
  justify-content: center;

  &__grid {
    display: grid;
    row-gap: 0.2rem;
    padding: 0.7rem 1.1rem;
    background-color: #ffffff;
    border-radius: 16px;
    box-shadow: 0 3px 0 rgba(0, 0, 0, 0.1);
  }

  &__cell {
    position: relative;
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

    &--op {
      color: #1565c0;
    }
  }

  // 小數點畫在數字右下角
  &__point::after {
    content: "";
    position: absolute;
    right: -0.2rem;
    bottom: 0.15rem;
    width: 0.4rem;
    height: 0.4rem;
    border-radius: 50%;
    background-color: #333333;
  }

  &__line {
    height: 4px;
    background-color: #455a64;
    border-radius: 2px;
    align-self: center;
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
  }
}
</style>

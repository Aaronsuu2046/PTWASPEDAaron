<template>
  <!-- 時間直式計算紙：兩欄（大單位、小單位）上下對齊，上面一列寫進位／退位，最下面寫結果；只是算算看，不計分 -->
  <div class="tv">
    <div class="tv__grid">
      <!-- 進位／退位 -->
      <span class="tv__op" />
      <button
        v-bind="cell('h0')"
        class="tv__cell tv__cell--note"
        @click="pick('h0')"
      >
        {{ values.h0 }}
      </button>
      <span class="tv__unit" />
      <button
        v-bind="cell('h1')"
        class="tv__cell tv__cell--note"
        @click="pick('h1')"
      >
        {{ values.h1 }}
      </button>
      <span class="tv__unit" />

      <span class="tv__op" />
      <span class="tv__num">{{ a[0] }}</span>
      <span class="tv__unit">{{ bigUnit }}</span>
      <span class="tv__num">{{ a[1] }}</span>
      <span class="tv__unit">{{ smallUnit }}</span>

      <span class="tv__op">{{ op === "+" ? "＋" : "－" }}</span>
      <span class="tv__num">{{ b[0] }}</span>
      <span class="tv__unit">{{ bigUnit }}</span>
      <span class="tv__num">{{ b[1] }}</span>
      <span class="tv__unit">{{ smallUnit }}</span>

      <span class="tv__line" />

      <span class="tv__op" />
      <button v-bind="cell('s0')" class="tv__cell" @click="pick('s0')">
        {{ values.s0 }}
      </button>
      <span class="tv__unit">{{ bigUnit }}</span>
      <button v-bind="cell('s1')" class="tv__cell" @click="pick('s1')">
        {{ values.s1 }}
      </button>
      <span class="tv__unit">{{ smallUnit }}</span>
    </div>
    <p class="tv__tip">
      1 {{ bigUnit }}＝{{ factor }} {{ smallUnit }}。{{
        op === "+"
          ? `${smallUnit}加起來滿 ${factor}，要進 1 ${bigUnit}`
          : `${smallUnit}不夠減，要向${bigUnit}借 1（＝${factor} ${smallUnit}）`
      }}
    </p>
  </div>
</template>

<script>
const KEYS = ["h0", "h1", "s0", "s1"];

// a、b：[大單位, 小單位]；格子內容由父元件用 input() 填，這裡只管畫和選格子
export default {
  name: "TimeVerticalScratch",
  props: {
    a: { type: Array, required: true },
    b: { type: Array, required: true },
    op: { type: String, required: true },
    factor: { type: Number, required: true },
    bigUnit: { type: String, required: true },
    smallUnit: { type: String, required: true },
  },
  emits: ["focus"],
  data() {
    return {
      values: Object.fromEntries(KEYS.map((k) => [k, ""])),
      active: null,
    };
  },
  methods: {
    cell(key) {
      return {
        type: "button",
        "data-cell": key,
        "data-pad-field": "",
        "aria-label": "計算紙格子",
        class: { "tv__cell--active": this.active === key },
      };
    },
    pick(key) {
      this.active = key;
      this.$emit("focus", key);
    },
    // 父元件把輸入板按鍵轉進來：數字、← 或 clear
    input(key) {
      if (!this.active) return;
      const v = this.values[this.active];
      let next = v;
      if (key === "clear") next = "";
      else if (key === "←") next = v.slice(0, -1);
      else if (/^\d$/.test(key) && v.length < 3)
        next = v === "0" ? key : v + key;
      this.values = { ...this.values, [this.active]: next };
    },
    blur() {
      this.active = null;
    },
    clear() {
      this.values = Object.fromEntries(KEYS.map((k) => [k, ""]));
      this.active = null;
    },
  },
};
</script>

<style scoped lang="scss">
.tv {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;

  &__grid {
    display: grid;
    grid-template-columns: 1.6rem 3.4rem auto 3.4rem auto;
    align-items: center;
    justify-items: center;
    gap: 0.35rem 0.3rem;
    padding: 0.6rem 0.8rem;
    background-color: #ffffff;
    border-radius: 12px;
  }

  &__op,
  &__num {
    font-size: 1.7rem;
    font-weight: $font-bold;
    color: #333333;
  }

  &__op {
    color: #1e88e5;
  }

  &__unit {
    white-space: nowrap;
    font-size: 1.1rem;
    font-weight: $font-bold;
    color: #5d4037;
  }

  &__line {
    grid-column: 1 / -1;
    justify-self: stretch;
    height: 4px;
    background-color: #455a64;
    border-radius: 2px;
  }

  &__cell {
    width: 3.4rem;
    height: 2.6rem;
    font-size: 1.6rem;
    font-weight: $font-bold;
    color: #2e7d32;
    background-color: #fff9c4;
    border: 3px solid #fdd835;
    border-radius: 8px;
    cursor: pointer;

    &--note {
      width: 2.8rem;
      height: 2rem;
      font-size: 1.1rem;
      color: #c62828;
      background-color: #fce4ec;
      border-color: #f48fb1;
    }

    &--active {
      border-color: #1e88e5;
      box-shadow: 0 0 0 3px #90caf9;
    }
  }

  &__tip {
    margin: 0;
    max-width: 20rem;
    font-size: 1rem;
    color: #00695c;
  }
}
</style>

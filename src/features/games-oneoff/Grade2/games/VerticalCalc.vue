<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <div class="left">
        <p class="equation" data-equation>
          {{ gameData.a }} {{ OP_SHOW }} {{ gameData.b }} ＝
        </p>
        <p class="step">① 把數字和符號拖到直式（或點一下再點格子）</p>
        <div class="tiles" data-zone="tiles">
          <button
            v-for="tile in trayTiles"
            :key="tile.id"
            type="button"
            class="tile"
            :class="{
              'tile--op': tile.id === 'op',
              'tile--selected': selected === tile.id,
            }"
            :data-tile="tile.id"
            @pointerdown="startDrag($event, tile.id)"
            @pointermove="onDrag"
            @pointerup="endDrag"
            @pointercancel="drag = null"
            @click="onTileClick(tile.id)"
          >
            {{ tile.text }}
          </button>
          <span v-if="!trayTiles.length" class="tiles__done">都放好了！</span>
        </div>
        <p class="step">② 用直式算算看，答案填在最下面一列</p>
        <p
          v-if="feedback"
          class="feedback"
          :class="{ 'feedback--ok': answered }"
        >
          {{ feedback }}
        </p>
      </div>

      <!-- 直式：第 0 欄放運算符號，1～3 欄是百、十、個 -->
      <div class="form" data-pad-avoid>
        <div class="form__heads">
          <span />
          <span v-for="h in HEADS" :key="h">{{ h }}</span>
        </div>
        <!-- 進位格（十位、百位上方） -->
        <div class="form__row form__row--carry">
          <span />
          <template v-for="col in 3" :key="`c${col}`">
            <button
              v-if="col < 3"
              type="button"
              class="cell cell--carry"
              :class="inputClass(`carry${col}`)"
              :data-input="`carry${col}`"
              data-pad-field
              :aria-label="`${HEADS[col - 1]}的進位`"
              @click="activate($event, `carry${col}`)"
            >
              {{ values[`carry${col}`] ?? "" }}
            </button>
            <span v-else />
          </template>
        </div>
        <!-- 兩列算式：學生拖進來的數 -->
        <div v-for="row in 2" :key="`r${row}`" class="form__row">
          <span
            class="cell cell--op"
            :class="{
              'cell--target': row === 2 && dropHint === 'op',
              'cell--wrong': row === 2 && wrongKeys.includes('op'),
            }"
            :data-cell="row === 2 ? 'op' : null"
            @click="row === 2 && placeSelected('op')"
          >
            <span
              v-if="row === 2 && placed.op"
              class="placed placed--op"
              data-placed="op"
              @click.stop="unplace('op')"
              >{{ OP_SHOW }}</span
            >
          </span>
          <span
            v-for="col in 3"
            :key="`r${row}c${col}`"
            class="cell cell--digit"
            :class="{
              'cell--target': dropHint === `r${row}c${col}`,
              'cell--wrong':
                wrongRows.includes(row) && digitAt(row, col) !== '',
            }"
            :data-cell="`r${row}c${col}`"
            @click="placeSelected(`r${row}c${col}`)"
          >
            <span
              v-if="digitAt(row, col) !== ''"
              class="placed"
              :data-placed="tileAt(row)"
              @click.stop="unplace(tileAt(row))"
              >{{ digitAt(row, col) }}</span
            >
          </span>
        </div>
        <div class="form__line" />
        <!-- 答案列 -->
        <div class="form__row">
          <span class="cell cell--op">＝</span>
          <button
            v-for="col in 3"
            :key="`a${col}`"
            type="button"
            class="cell cell--answer"
            :class="inputClass(`ans${col}`)"
            :data-input="`ans${col}`"
            data-pad-field
            :aria-label="`答案的${HEADS[col - 1]}`"
            @click="activate($event, `ans${col}`)"
          >
            {{ values[`ans${col}`] ?? "" }}
          </button>
        </div>
      </div>

      <FieldPad
        :field="active && !answered ? activeEl : null"
        @press="press"
        @close="active = null"
      />
    </div>

    <div
      v-if="drag && drag.moved"
      class="tile drag-ghost"
      :class="{ 'tile--op': drag.id === 'op' }"
      :style="{ left: `${drag.x}px`, top: `${drag.y}px` }"
    >
      {{ textOf(drag.id) }}
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import FieldPad from "../../Grade4/games/Common/FieldPad.vue";

const HEADS = ["百位", "十位", "個位"];
const DRAG_THRESHOLD = 8;

// 二位數加法：橫式轉直式與計算（GameConfig.Op＝"+"）
// 題目 { code, a, b, answer }
// ① 把 a、b 兩張數字卡與「＋」拖進直式：數字卡放下的那一格是它的最高位，所以要讓個位對齊個位欄；
//    兩個數放哪一列都可以，「＋」放在第二列左邊
// ② 在答案列填百、十、個位（答案只有兩位時百位空著），要進位的位在上方進位格填 1、不進位就空著
// 送出時全部都要完成；答錯只標示錯的地方
export default {
  name: "VerticalCalc",
  components: { FieldPad },
  props: {
    gameData: { type: Object, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      HEADS,
      // 每張數字卡放在哪一列、從哪一欄開始（1～3）
      placed: { a: null, b: null, op: false },
      selected: null,
      drag: null,
      dropHint: null,
      suppressClick: false,
      values: {},
      active: null,
      activeEl: null,
      wrongKeys: [],
      wrongRows: [],
      answered: false,
      feedback: "",
    };
  },
  computed: {
    OP_SHOW() {
      return "＋";
    },
    gameIntroText() {
      return (
        this.introText?.Content ||
        "把橫式的數字與符號，拖到直式中。接著，練習用直式計算。"
      );
    },
    trayTiles() {
      return ["a", "op", "b"]
        .filter((id) => (id === "op" ? !this.placed.op : !this.placed[id]))
        .map((id) => ({ id, text: this.textOf(id) }));
    },
    // 正確的進位與答案（百、十、個）
    expected() {
      const { a, b, answer } = this.gameData;
      const carryT = (a % 10) + (b % 10) >= 10;
      const tensSum =
        (Math.floor(a / 10) % 10) +
        (Math.floor(b / 10) % 10) +
        (carryT ? 1 : 0);
      const carryH = tensSum >= 10;
      return {
        carry1: carryH ? "1" : "",
        carry2: carryT ? "1" : "",
        ans1: answer >= 100 ? String(Math.floor(answer / 100)) : "",
        ans2: String(Math.floor(answer / 10) % 10),
        ans3: String(answer % 10),
      };
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    textOf(id) {
      if (id === "op") return this.OP_SHOW;
      return String(this.gameData[id]);
    },
    tileAt(row) {
      return ["a", "b"].find((id) => this.placed[id]?.row === row) || null;
    },
    // 某列某欄顯示的數字（沒有就是空字串）
    digitAt(row, col) {
      const id = this.tileAt(row);
      if (!id) return "";
      const text = this.textOf(id);
      const i = col - this.placed[id].col;
      return i >= 0 && i < text.length ? text[i] : "";
    },
    // 放到某一格：數字卡要放得下（不能超出個位欄），已經有卡的列會把舊的卡退回
    place(id, cell) {
      if (this.answered || !id) return false;
      if (id === "op") {
        if (cell !== "op") return false;
        this.placed = { ...this.placed, op: true };
      } else {
        const m = /^r(\d)c(\d)$/.exec(cell || "");
        if (!m) return false;
        const row = Number(m[1]);
        const col = Number(m[2]);
        if (col + this.textOf(id).length - 1 > 3) {
          this.feedback = "放不下喔！數字卡放下的那一格是它的最高位。";
          return false;
        }
        const placed = { ...this.placed };
        const other = this.tileAt(row);
        if (other && other !== id) placed[other] = null;
        placed[id] = { row, col };
        this.placed = placed;
        this.wrongRows = this.wrongRows.filter((r) => r !== row);
      }
      this.wrongKeys = this.wrongKeys.filter((k) => k !== id && k !== "op");
      this.feedback = "";
      return true;
    },
    unplace(id) {
      if (this.answered || !id) return;
      if (this.suppressClick) {
        this.suppressClick = false;
        return;
      }
      if (id === "op") this.placed = { ...this.placed, op: false };
      else {
        const row = this.placed[id]?.row;
        this.placed = { ...this.placed, [id]: null };
        this.wrongRows = this.wrongRows.filter((r) => r !== row);
      }
    },
    onTileClick(id) {
      if (this.suppressClick) {
        this.suppressClick = false;
        return;
      }
      this.selected = this.selected === id ? null : id;
    },
    placeSelected(cell) {
      if (!this.selected) return;
      if (this.place(this.selected, cell)) this.selected = null;
    },
    startDrag(event, id) {
      if (this.answered) return;
      if (event.button !== undefined && event.button !== 0) return;
      this.suppressClick = false;
      this.drag = {
        id,
        startX: event.clientX,
        startY: event.clientY,
        x: event.clientX,
        y: event.clientY,
        moved: false,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    cellAt(event) {
      const el = document.elementFromPoint(event.clientX, event.clientY);
      return el?.closest("[data-cell]")?.dataset.cell || null;
    },
    onDrag(event) {
      if (!this.drag) return;
      this.drag.x = event.clientX;
      this.drag.y = event.clientY;
      if (
        !this.drag.moved &&
        Math.hypot(
          event.clientX - this.drag.startX,
          event.clientY - this.drag.startY
        ) > DRAG_THRESHOLD
      )
        this.drag.moved = true;
      if (this.drag.moved) this.dropHint = this.cellAt(event);
    },
    endDrag(event) {
      if (!this.drag) return;
      if (this.drag.moved) {
        this.suppressClick = true;
        this.place(this.drag.id, this.cellAt(event));
        this.selected = null;
      }
      this.drag = null;
      this.dropHint = null;
    },
    inputClass(key) {
      return {
        "cell--active": this.active === key && !this.answered,
        "cell--wrong": this.wrongKeys.includes(key),
        "cell--correct": this.answered,
      };
    },
    activate(event, key) {
      if (this.answered) return;
      this.active = key;
      this.activeEl = event.currentTarget;
    },
    // 每格只放一個數字，按新的數字就換掉
    press(key) {
      if (this.answered || !this.active) return;
      const k = this.active;
      const values = { ...this.values };
      if (key === "clear" || key === "←") delete values[k];
      else if (/^\d$/.test(key)) values[k] = key;
      this.values = values;
      this.wrongKeys = this.wrongKeys.filter((w) => w !== k);
      this.feedback = "";
    },
    // 直式的樣子寫成一行（紀錄用）
    formText() {
      const row = (r) => {
        const id = this.tileAt(r);
        if (!id) return "（空）";
        const pad = this.placed[id].col - 1;
        return `${"_".repeat(pad)}${this.textOf(id)}${"_".repeat(
          3 - pad - this.textOf(id).length
        )}`;
      };
      return `${row(1)}／${this.placed.op ? this.OP_SHOW : ""}${row(2)}`;
    },
    answerText(pick) {
      const carry = [pick("carry1"), pick("carry2")]
        .map((v) => v || "_")
        .join("");
      const ans = [pick("ans1"), pick("ans2"), pick("ans3")]
        .map((v) => v || "_")
        .join("");
      return `進位 ${carry}，答案 ${ans}`;
    },
    checkAnswer() {
      if (this.answered) return;
      const { code, a, b, answer } = this.gameData;
      if (!this.placed.a || !this.placed.b || !this.placed.op) {
        this.feedback = "先把兩個數和「＋」都放進直式喔！";
        return;
      }
      const needed = ["ans2", "ans3"].concat(answer >= 100 ? ["ans1"] : []);
      const empty = needed.filter((k) => !this.values[k]);
      if (empty.length) {
        this.wrongKeys = empty;
        this.feedback = "答案還沒填完喔！";
        return;
      }
      // 對齊：數字卡的個位要在個位欄（第 3 欄）
      this.wrongRows = [1, 2].filter((r) => {
        const id = this.tileAt(r);
        return this.placed[id].col + this.textOf(id).length - 1 !== 3;
      });
      const exp = this.expected;
      this.wrongKeys = Object.keys(exp).filter(
        (k) => (this.values[k] || "") !== exp[k]
      );
      const isCorrect = !this.wrongRows.length && !this.wrongKeys.length;
      this.$emit("add-record", [
        `${code} ${a}＋${b}＝${answer}（${this.answerText((k) => exp[k])}）`,
        `直式 ${this.formText()}，${this.answerText((k) => this.values[k])}`,
        isCorrect ? "正確" : "錯誤",
      ]);
      this.active = null;
      if (isCorrect) {
        this.answered = true;
        this.feedback = "答對了！";
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
        return;
      }
      const tips = [];
      if (this.wrongRows.length) tips.push("個位要對齊個位");
      if (this.wrongKeys.some((k) => k.startsWith("carry")))
        tips.push("滿 10 要進位，沒進位的格子空著");
      if (this.wrongKeys.some((k) => k.startsWith("ans")))
        tips.push("再算一次紅色的格子");
      this.feedback = `紅色的地方不對喔！${tips.join("；")}。`;
      this.$emit("play-effect", "WrongSound");
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
  gap: 1.6rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small $padding--medium;
}

.left {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
}

.equation {
  margin: 0;
  padding: 0.2rem 1.6rem;
  font-size: 3rem;
  font-weight: $font-bold;
  color: #0d47a1;
  background-color: #ffffff;
  border-radius: 18px;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.08);
}

.step {
  margin: 0;
  font-size: 1.2rem;
  font-weight: $font-bold;
  color: #5d4037;
}

.tiles {
  min-height: 5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;

  &__done {
    font-size: 1.3rem;
    font-weight: $font-bold;
    color: #43a047;
  }
}

.tile {
  min-width: 5rem;
  height: 4.4rem;
  padding: 0 0.8rem;
  font-size: 2.4rem;
  font-weight: $font-bold;
  color: #ffffff;
  background-color: #1e88e5;
  border: none;
  border-radius: 14px;
  box-shadow: 0 5px 0 #1565c0;
  cursor: grab;
  touch-action: none;
  user-select: none;

  &--op {
    min-width: 4.4rem;
    background-color: #fb8c00;
    box-shadow: 0 5px 0 #e65100;
  }

  &--selected {
    outline: 5px solid #ffeb3b;
  }
}

.drag-ghost {
  position: fixed;
  z-index: 1000;
  transform: translate(-50%, -50%);
  pointer-events: none;
  opacity: 0.9;
}

.form {
  flex: 0 0 auto;
  padding: 0.6rem 1rem 1rem;
  background-color: #ffffff;
  border-radius: 20px;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.08);

  &__heads,
  &__row {
    display: grid;
    grid-template-columns: 3.6rem repeat(3, 4.2rem);
    gap: 0.4rem;
    justify-items: center;
    align-items: center;
  }

  &__heads span {
    font-size: 1.1rem;
    font-weight: $font-bold;
    color: #6d4c41;
  }

  &__row {
    margin-top: 0.4rem;

    &--carry {
      margin-top: 0.1rem;
    }
  }

  &__line {
    height: 5px;
    margin: 0.5rem 0 0.1rem;
    background-color: #455a64;
    border-radius: 3px;
  }
}

.cell {
  width: 4.2rem;
  height: 4.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.4rem;
  font-weight: $font-bold;
  border-radius: 12px;

  &--op {
    width: 3.6rem;
    color: #e65100;
    border: 3px dashed #ffcc80;
  }

  &--digit {
    color: #0d47a1;
    background-color: #f5f5f5;
    border: 3px dashed #bdbdbd;
  }

  &--carry {
    width: 3rem;
    height: 2.6rem;
    font-size: 1.6rem;
    color: #d81b60;
    background-color: #fce4ec;
    border: 3px dashed #f48fb1;
    cursor: pointer;
  }

  &--answer {
    color: #0d47a1;
    background-color: #fffde7;
    border: 4px dashed #fb8c00;
    cursor: pointer;
  }

  &--target {
    border-style: solid;
    border-color: #1e88e5;
    background-color: #e3f2fd;
  }

  &--active {
    border-style: solid;
    border-color: #1e88e5;
    box-shadow: 0 0 0 4px #90caf9;
  }

  &--wrong {
    border-style: solid;
    border-color: #e53935;
    background-color: #ffebee;
  }

  &--correct {
    border-style: solid;
    border-color: #43a047;
    background-color: #e8f5e9;
  }
}

.placed {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &--op {
    color: #e65100;
  }
}

.feedback {
  margin: 0;
  padding: 0.3rem 1rem;
  text-align: center;
  font-size: 1.2rem;
  font-weight: $font-bold;
  color: #c62828;
  background-color: #fff8e1;
  border-radius: 12px;

  &--ok {
    color: #2e7d32;
    background-color: #e8f5e9;
  }
}

@media (max-width: 1100px) {
  .equation {
    font-size: 2.4rem;
  }

  .form {
    &__heads,
    &__row {
      grid-template-columns: 3rem repeat(3, 3.6rem);
    }
  }

  .cell {
    width: 3.6rem;
    height: 3.6rem;
    font-size: 2rem;

    &--op {
      width: 3rem;
    }

    &--carry {
      width: 2.6rem;
      height: 2.2rem;
      font-size: 1.4rem;
    }
  }

  .tile {
    min-width: 4.2rem;
    height: 3.8rem;
    font-size: 2rem;
  }
}
</style>

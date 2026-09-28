<template>
  <div class="mfill">
    <div class="mfill__body">
      <!-- 可拖曳的數字 -->
      <div class="mfill__tray">
        <p class="mfill__tray-title">數字卡</p>
        <button
          v-for="tile in trayTiles"
          :key="tile"
          type="button"
          class="mfill__tile"
          :class="{ 'mfill__tile--selected': selectedTile === tile }"
          :data-tile="tile"
          @pointerdown="startDrag($event, tile)"
          @pointermove="onDrag"
          @pointerup="endDrag"
          @pointercancel="drag = null"
          @click="onTileClick(tile)"
        >
          {{ tile }}
        </button>
        <p v-if="!trayTiles.length" class="mfill__tray-empty">都放好了</p>
      </div>

      <!-- 直式 -->
      <div
        class="mfill__grid"
        :style="{ gridTemplateColumns: `repeat(${width + 1}, var(--cell))` }"
      >
        <template v-for="(row, r) in gridRows" :key="`r${r}`">
          <div
            v-if="row.line"
            class="mfill__line"
            :style="{ gridColumn: `1 / span ${width + 1}` }"
          />
          <template v-else>
            <span class="mfill__cell mfill__cell--sign">{{ row.sign }}</span>
            <template v-for="col in columns" :key="`r${r}c${col}`">
              <button
                v-if="blankIndex(row.name, col) >= 0"
                type="button"
                class="mfill__cell mfill__blank"
                :class="blankClass(blankIndex(row.name, col))"
                :data-blank="blankIndex(row.name, col)"
                @click="onBlankClick(blankIndex(row.name, col))"
              >
                {{ placed[blankIndex(row.name, col)] ?? "" }}
              </button>
              <span v-else class="mfill__cell">{{
                row.digits[col] ?? ""
              }}</span>
            </template>
          </template>
        </template>
      </div>

      <!-- 橫式與乘積答案欄，下面是寫答案用的按鍵 -->
      <div class="mfill__pad">
        <p class="mfill__equation">{{ data.a }} × {{ data.b }} =</p>
        <div
          class="mfill__answer"
          :class="{
            'mfill__answer--wrong': answerWrong,
            'mfill__answer--correct': solved,
          }"
          data-answer
        >
          {{ answer || EMPTY }}
        </div>
        <div class="mfill__keys">
          <button
            v-for="key in KEYS"
            :key="key"
            type="button"
            class="mfill__key"
            :class="{
              'mfill__key--fn': key === '←',
              'mfill__key--wide': key === '0',
            }"
            :disabled="solved"
            @click="press(key)"
          >
            {{ key }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="drag && drag.moved"
      class="mfill__tile mfill__tile--ghost"
      :style="{ left: `${drag.x}px`, top: `${drag.y}px` }"
    >
      {{ drag.tile }}
    </div>
  </div>
</template>

<script>
const EMPTY = "\u3000"; // 空白時撐住高度
const KEYS = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "0", "←"];
const DRAG_THRESHOLD = 8;
const MAX_ANSWER = 7;

function shuffleNotIdentity(list) {
  const result = [...list];
  do {
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
  } while (list.length > 1 && result.every((v, i) => v === list[i]));
  return result;
}

// 直式乘法補空格：把數字卡放進黃色格子（點數字再點格子，或直接拖曳），
// 再用按鍵寫出乘積。data：{ a, b, rows: [{ name, digits: { 欄: 數字 } }], blanks, tiles, answer }
// 欄位 1＝個位、2＝十位…；父元件用 ref 呼叫 check() 判分
export default {
  name: "MultiplyFill",
  props: {
    data: { type: Object, required: true },
  },
  emits: ["change"],
  data() {
    return {
      KEYS,
      EMPTY,
      tiles: shuffleNotIdentity(this.data.tiles),
      placed: this.data.blanks.map(() => null),
      selectedTile: null,
      answer: "",
      wrongBlanks: [],
      answerWrong: false,
      solved: false,
      drag: null,
    };
  },
  computed: {
    width() {
      return Math.max(
        this.data.answer.length,
        this.data.a.length,
        this.data.b.length + 1
      );
    },
    // 由左到右的欄位（最高位到個位）
    columns() {
      return Array.from({ length: this.width }, (_, i) => this.width - i);
    },
    gridRows() {
      const digitsOf = (s) =>
        Object.fromEntries([...s].reverse().map((d, i) => [i + 1, d]));
      const partials = this.data.rows.filter((r) => r.name !== "總和");
      const total = this.data.rows.find((r) => r.name === "總和");
      return [
        { name: "a", sign: "", digits: digitsOf(this.data.a) },
        { name: "b", sign: "×", digits: digitsOf(this.data.b) },
        { line: true },
        ...partials.map((r) => ({ ...r, sign: "" })),
        { line: true },
        { ...total, sign: "" },
      ];
    },
    trayTiles() {
      return this.tiles.filter((t) => !this.placed.includes(t));
    },
  },
  mounted() {
    window.addEventListener("keydown", this.onKey);
  },
  beforeUnmount() {
    window.removeEventListener("keydown", this.onKey);
  },
  methods: {
    blankIndex(rowName, col) {
      return this.data.blanks.findIndex(
        (b) => b.row === rowName && b.col === col
      );
    },
    blankClass(i) {
      return {
        "mfill__blank--filled": this.placed[i] !== null,
        "mfill__blank--target":
          this.selectedTile !== null && this.placed[i] === null,
        "mfill__blank--wrong": this.wrongBlanks.includes(i),
        "mfill__blank--correct": this.solved,
      };
    },
    place(tile, i) {
      if (this.solved) return;
      const next = [...this.placed];
      const from = next.indexOf(tile);
      if (from >= 0) next[from] = null;
      next[i] = tile;
      this.placed = next;
      this.wrongBlanks = this.wrongBlanks.filter((b) => b !== i);
      this.selectedTile = null;
      this.$emit("change");
    },
    onTileClick(tile) {
      if (this.drag?.suppress) {
        this.drag = null;
        return;
      }
      this.selectedTile = this.selectedTile === tile ? null : tile;
    },
    onBlankClick(i) {
      if (this.solved) return;
      if (this.placed[i] !== null) {
        // 點已放好的格子：把數字卡拿回來
        const next = [...this.placed];
        next[i] = null;
        this.placed = next;
        this.wrongBlanks = this.wrongBlanks.filter((b) => b !== i);
        this.$emit("change");
        return;
      }
      if (this.selectedTile !== null) this.place(this.selectedTile, i);
    },
    startDrag(event, tile) {
      if (this.solved) return;
      if (event.button !== undefined && event.button !== 0) return;
      this.drag = {
        tile,
        startX: event.clientX,
        startY: event.clientY,
        x: event.clientX,
        y: event.clientY,
        moved: false,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
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
      ) {
        this.drag.moved = true;
        this.selectedTile = null;
      }
    },
    endDrag(event) {
      if (!this.drag) return;
      if (!this.drag.moved) {
        this.drag = null;
        return;
      }
      const target = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest("[data-blank]");
      if (target) this.place(this.drag.tile, Number(target.dataset.blank));
      // 拖曳結束後瀏覽器仍會送出 click，先擋掉
      this.drag = { suppress: true };
    },
    press(key) {
      if (this.solved) return;
      if (key === "←") this.answer = this.answer.slice(0, -1);
      else if (this.answer.length < MAX_ANSWER) this.answer += key;
      this.answerWrong = false;
      this.$emit("change");
    },
    onKey(event) {
      if (/^[0-9]$/.test(event.key)) this.press(event.key);
      else if (event.key === "Backspace") this.press("←");
    },
    // 回傳 { complete, correct, placed, answer }，並標示錯的格子
    check() {
      const complete =
        this.placed.every((p) => p !== null) && this.answer.length > 0;
      this.wrongBlanks = this.data.blanks
        .map((b, i) =>
          this.placed[i] !== null && this.placed[i] !== b.digit ? i : -1
        )
        .filter((i) => i >= 0);
      this.answerWrong =
        this.answer.length > 0 && this.answer !== this.data.answer;
      const correct = complete && !this.wrongBlanks.length && !this.answerWrong;
      this.solved = correct;
      return {
        complete,
        correct,
        placed: [...this.placed],
        answer: this.answer,
      };
    },
  },
};
</script>

<style scoped lang="scss">
.mfill {
  --cell: 3rem;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;

  &__equation {
    margin: 0;
    font-size: 1.7rem;
    white-space: nowrap;
    font-weight: $font-bold;
    color: #333333;
  }

  &__answer {
    min-width: 9rem;
    height: 3.2rem;
    padding: 0 0.6rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    font-weight: $font-bold;
    letter-spacing: 0.1em;
    color: #1565c0;
    background-color: #ffffff;
    border: 3px solid #1e88e5;
    border-radius: 12px;
    box-shadow: 0 0 0 4px #bbdefb;

    &--wrong {
      color: #c62828;
      border-color: #e53935;
      box-shadow: 0 0 0 4px #ffcdd2;
    }

    &--correct {
      color: #2e7d32;
      border-color: #43a047;
      box-shadow: 0 0 0 4px #c8e6c9;
    }
  }

  &__body {
    flex: 1;
    min-height: 0;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2.5rem;
  }

  &__tray {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.6rem;
    padding: 0.6rem 0.8rem;
    background-color: #fff3e0;
    border: 3px dashed #ffb74d;
    border-radius: 16px;
  }

  &__tray-title {
    margin: 0;
    font-size: 1.1rem;
    font-weight: $font-bold;
    color: #8d6e63;
  }

  &__tray-empty {
    margin: 0;
    font-size: 1rem;
    color: #8d6e63;
  }

  &__tile {
    width: 3.6rem;
    height: 3.6rem;
    font-size: 2.2rem;
    font-weight: $font-bold;
    color: #ffffff;
    background-color: #ff7043;
    border: none;
    border-radius: 12px;
    box-shadow: 0 4px 0 #d84315;
    cursor: grab;
    touch-action: none;
    user-select: none;

    &--selected {
      background-color: #1e88e5;
      box-shadow:
        0 0 0 4px #90caf9,
        0 4px 0 #1565c0;
    }

    &--ghost {
      position: fixed;
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      transform: translate(-50%, -50%);
      pointer-events: none;
      opacity: 0.9;
    }
  }

  &__grid {
    display: grid;
    row-gap: 0.25rem;
    padding: 0.8rem 1.2rem;
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
    font-size: 2.1rem;
    font-weight: $font-bold;
    color: #333333;

    &--sign {
      color: #e65100;
    }
  }

  &__line {
    height: 4px;
    margin: 0.15rem 0;
    background-color: #455a64;
    border-radius: 2px;
  }

  &__blank {
    margin: 0.1rem;
    width: calc(var(--cell) - 0.2rem);
    height: calc(var(--cell) - 0.2rem);
    color: #e65100;
    background-color: #fff176;
    border: 3px solid #fbc02d;
    border-radius: 10px;
    cursor: pointer;

    &--target {
      border-style: dashed;
      border-color: #1e88e5;
    }

    &--filled {
      background-color: #ffe082;
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

  &__pad {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  &__keys {
    display: grid;
    grid-template-columns: repeat(3, 3.4rem);
    gap: 0.4rem;
  }

  &__key {
    height: 3.2rem;
    font-size: 1.7rem;
    font-weight: $font-bold;
    color: #ffffff;
    background-color: #42a5f5;
    border: none;
    border-radius: 12px;
    box-shadow: 0 3px 0 #1976d2;
    cursor: pointer;

    &--wide {
      grid-column: span 2;
    }

    &--fn {
      background-color: #ffa726;
      box-shadow: 0 3px 0 #ef6c00;
    }

    &:disabled {
      opacity: 0.5;
      cursor: default;
    }
  }
}

@media (max-width: 1100px) {
  .mfill {
    --cell: 2.35rem;

    &__body {
      gap: 1.2rem;
    }

    &__cell {
      font-size: 1.6rem;
    }

    &__equation {
      font-size: 1.4rem;
    }

    &__answer {
      min-width: 8rem;
      height: 2.8rem;
      font-size: 1.7rem;
    }

    &__tile {
      width: 3.1rem;
      height: 3.1rem;
      font-size: 1.9rem;
    }

    &__keys {
      grid-template-columns: repeat(3, 2.9rem);
    }

    &__key {
      height: 2.8rem;
      font-size: 1.5rem;
    }
  }
}
</style>

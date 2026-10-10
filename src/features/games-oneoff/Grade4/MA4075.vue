<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <div class="board-card">
        <span class="board-card__label">定位板</span>
        <PlaceValueBoard :values="cells" />
        <button type="button" class="speaker" @click="speak">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9h4l5-4v14l-5-4H4z" />
            <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" />
          </svg>
          聽讀音
        </button>
      </div>

      <div class="answer-card">
        <p class="answer-card__ask">
          <span class="answer-card__num">{{ gameData.number }}</span> 讀作：
        </p>
        <div class="slots">
          <button
            v-for="(ch, k) in slots"
            :key="k"
            type="button"
            class="slot"
            :class="{
              'slot--filled': ch,
              'slot--selected': selected === k && !answered,
              'slot--wrong': wrongSlots.includes(k),
              'slot--hint': locked.includes(k),
              'slot--correct': answered,
            }"
            :data-slot="k"
            :aria-label="`第 ${k + 1} 格${ch ? `：${ch}` : ''}`"
            @click="tapSlot(k)"
          >
            {{ ch }}
          </button>
        </div>
        <div class="tiles">
          <button
            v-for="ch in tiles"
            :key="ch"
            type="button"
            class="tile"
            :data-tile="ch"
            @pointerdown="startDrag($event, ch)"
            @pointermove="moveDrag"
            @pointerup="endDrag"
            @pointercancel="cancelDrag"
          >
            {{ ch }}
          </button>
        </div>
        <p class="answer-card__tip">
          點字塊就會放進格子，也可以拖過去；點格子裡的字可以拿掉
        </p>
        <p class="feedback">{{ feedback }}</p>
      </div>

      <div
        v-if="drag && drag.moved"
        class="tile tile--ghost"
        :style="{ left: `${drag.x}px`, top: `${drag.y}px` }"
      >
        {{ drag.ch }}
      </div>
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import { ReadText, StopRead } from "@/lib/readtext.js";
import PlaceValueBoard from "./games/Decimal/PlaceValueBoard.vue";

const TILES = [..."零一二三四五六七八九", "十", "點"];
const DRAG_THRESHOLD = 8;
const HINT_AFTER = 3; // 連續答錯幾次給一個提示字塊

function shuffle(list) {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 小數放進定位板四格（十位、個位、十分位、百分位），沒有的位數空著
function toCells(text) {
  const [whole, frac = ""] = text.split(".");
  const w = whole.padStart(2, " ");
  return [w[0].trim(), w[1], frac[0] || "", frac[1] || ""];
}

// 二位小數讀音拼圖：左邊定位板顯示小數，右邊依讀音字數排空格，用字塊依序填入
// 字塊（零～九、十、點）可重複使用、每題洗牌；點字塊放進選取的格子（沒選就放第一個空格），也可拖曳
// 連續答錯 3 次，在一個錯的位置放上不可移動的藍色提示字塊
// 題目 { number, reading }
export default {
  name: "MA4075",
  components: { PlaceValueBoard },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      tiles: shuffle(TILES),
      slots: Array(this.gameData.reading.length).fill(""),
      locked: [],
      selected: null,
      wrongSlots: [],
      misses: 0,
      drag: null,
      feedback: "",
      answered: false,
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "使用文字方塊把讀法記下來。";
    },
    cells() {
      return toCells(this.gameData.number);
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
    StopRead();
  },
  methods: {
    speak() {
      ReadText(this.gameData.reading);
    },
    // 字塊放進第 k 格（k 沒給：選取的格子，否則第一個空格）
    place(ch, k = null) {
      if (this.answered) return;
      let target = k;
      if (target === null) target = this.selected;
      if (target === null || this.locked.includes(target))
        target = this.slots.findIndex(
          (s, i) => s === "" && !this.locked.includes(i)
        );
      if (target < 0 || this.locked.includes(target)) return;
      const slots = [...this.slots];
      slots[target] = ch;
      this.slots = slots;
      this.wrongSlots = this.wrongSlots.filter((i) => i !== target);
      this.feedback = "";
      // 選取跳到下一個空格
      const next = slots.findIndex(
        (s, i) => s === "" && !this.locked.includes(i)
      );
      this.selected = next < 0 ? null : next;
    },
    tapSlot(k) {
      if (this.answered || this.locked.includes(k)) return;
      if (this.slots[k]) {
        const slots = [...this.slots];
        slots[k] = "";
        this.slots = slots;
        this.wrongSlots = this.wrongSlots.filter((i) => i !== k);
      }
      this.selected = k;
      this.feedback = "";
    },
    startDrag(event, ch) {
      if (this.answered) return;
      if (event.button !== undefined && event.button !== 0) return;
      this.drag = {
        ch,
        startX: event.clientX,
        startY: event.clientY,
        x: event.clientX,
        y: event.clientY,
        moved: false,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    moveDrag(event) {
      if (!this.drag) return;
      this.drag.x = event.clientX;
      this.drag.y = event.clientY;
      if (
        Math.hypot(
          event.clientX - this.drag.startX,
          event.clientY - this.drag.startY
        ) > DRAG_THRESHOLD
      )
        this.drag.moved = true;
    },
    endDrag(event) {
      if (!this.drag) return;
      const { ch, moved } = this.drag;
      this.drag = null;
      if (!moved) {
        this.place(ch);
        return;
      }
      const slot = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest("[data-slot]");
      if (slot && this.$el.contains(slot))
        this.place(ch, Number(slot.dataset.slot));
    },
    cancelDrag() {
      this.drag = null;
    },
    checkAnswer() {
      if (this.answered) return;
      const { number, reading } = this.gameData;
      if (this.slots.some((s) => s === "")) {
        this.feedback = "每個格子都要放一個字喔！";
        return;
      }
      const typed = this.slots.join("");
      const isCorrect = typed === reading;
      this.$emit("add-record", [
        `${number} 讀作 ${reading}`,
        typed,
        isCorrect ? "正確" : "錯誤",
      ]);
      if (isCorrect) {
        this.answered = true;
        this.wrongSlots = [];
        this.selected = null;
        this.feedback = "";
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
        return;
      }
      this.wrongSlots = this.slots
        .map((s, k) => (s === reading[k] ? null : k))
        .filter((k) => k !== null);
      this.misses += 1;
      this.feedback = "紅色的格子不對，可以按「聽讀音」再聽一次！";
      if (this.misses >= HINT_AFTER) this.giveHint();
      this.$emit("play-effect", "WrongSound");
    },
    // 在第一個錯的位置放上正確的藍色字塊，之後不能移動
    giveHint() {
      const k = this.wrongSlots[0];
      if (k === undefined) return;
      const slots = [...this.slots];
      slots[k] = this.gameData.reading[k];
      this.slots = slots;
      this.locked = [...this.locked, k];
      this.wrongSlots = this.wrongSlots.filter((i) => i !== k);
      this.misses = 0;
      this.feedback = "給你一個提示：藍色的字已經放好了！";
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
  justify-content: center;
  gap: 1.6rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small $padding--medium;
}

.board-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.7rem;
  padding: 0.8rem 1.2rem 1rem;
  background-color: #ffffff;
  border-radius: 18px;
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.1);

  &__label {
    font-size: 1.3rem;
    font-weight: $font-bold;
    color: #5d4037;
  }
}

.speaker {
  @extend .button-basic;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 1.2rem;
  font-size: 1.3rem;
  border: none;
  background-color: #ffca28;
  color: #4e342e;

  svg {
    width: 1.8rem;
    height: 1.8rem;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;

    path:first-child {
      fill: currentColor;
    }
  }
}

.answer-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.9rem;
  padding: 1rem 1.4rem;
  background-color: #ffffff;
  border-radius: 18px;
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.1);

  &__ask {
    margin: 0;
    font-size: 1.6rem;
    font-weight: $font-bold;
    color: #4e342e;
  }

  &__num {
    font-size: 2rem;
    color: #0d47a1;
  }

  &__tip {
    margin: 0;
    font-size: 1rem;
    color: #6d4c41;
  }
}

.slots {
  display: flex;
  gap: 0.5rem;
}

.slot {
  width: 4.2rem;
  height: 4.2rem;
  font-size: 2.4rem;
  font-weight: $font-bold;
  color: #4e342e;
  background-color: #ffffff;
  border: 3px dashed #90a4ae;
  border-radius: 12px;
  cursor: pointer;

  &--filled {
    border-style: solid;
    border-color: #ffb74d;
    background-color: #fff8e1;
  }

  &--selected {
    border-style: solid;
    border-color: #1e88e5;
    box-shadow: 0 0 0 3px #90caf9;
  }

  &--wrong {
    border-color: #e53935;
    background-color: #ffebee;
  }

  &--hint {
    border-style: solid;
    border-color: #1565c0;
    background-color: #1e88e5;
    color: #ffffff;
    cursor: default;
  }

  &--correct {
    border-color: #43a047;
    background-color: #e8f5e9;
  }
}

.tiles {
  display: grid;
  grid-template-columns: repeat(6, 3.6rem);
  gap: 0.5rem;
  padding: 0.6rem;
  background-color: #fff3e0;
  border-radius: 14px;
}

.tile {
  width: 3.6rem;
  height: 3.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: $font-bold;
  color: #4e342e;
  background-color: #ffe082;
  border: none;
  border-radius: 10px;
  box-shadow: 0 4px 0 #ffb300;
  cursor: grab;
  touch-action: none;
  user-select: none;

  &--ghost {
    position: fixed;
    z-index: 50;
    transform: translate(-50%, -50%);
    pointer-events: none;
    opacity: 0.9;
  }
}

.feedback {
  min-height: 1.6em;
  margin: 0;
  text-align: center;
  font-size: 1.2rem;
  font-weight: $font-bold;
  color: #c62828;
}

@media (max-width: 1100px), (max-height: 760px) {
  .game-area {
    gap: 0.8rem;
  }

  .board-card {
    padding: 0.6rem 0.8rem;
  }

  .slot {
    width: 3.6rem;
    height: 3.6rem;
    font-size: 2rem;
  }

  .tiles {
    grid-template-columns: repeat(6, 3rem);
  }

  .tile {
    width: 3rem;
    height: 3rem;
    font-size: 1.7rem;
  }
}
</style>

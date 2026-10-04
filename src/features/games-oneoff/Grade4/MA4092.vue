<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <div class="board">
        <!-- 還沒分類的卡片 -->
        <div
          class="tray"
          :class="{ 'zone--hover': hoverZone === 'tray' }"
          data-zone="tray"
          @click="placeSelected('tray')"
        >
          <p v-if="trayCards.length === 0" class="tray__empty">
            都分好了，按「送出答案」
          </p>
          <button
            v-for="i in trayCards"
            :key="`t-${i}`"
            type="button"
            class="card"
            :class="cardClass(i)"
            :data-card="cards[i].id"
            @pointerdown="startDrag($event, i)"
            @pointermove="onDrag"
            @pointerup="endDrag"
            @pointercancel="cancelDrag"
            @click.stop="onCardClick(i)"
          >
            <StackedFraction v-bind="fracOf(cards[i])" />
          </button>
        </div>

        <!-- 三個分類區（順序每次隨機） -->
        <div class="bins">
          <div
            v-for="(bin, b) in BINS"
            :key="bin"
            class="bin"
            :class="[
              `bin--${CATEGORIES.indexOf(bin)}`,
              {
                'zone--hover': hoverZone === String(b),
                'bin--target': selected !== null,
              },
            ]"
            :data-zone="b"
            :data-bin="bin"
            @click="placeSelected(b)"
          >
            <p class="bin__title">{{ bin }}</p>
            <div class="bin__cards">
              <button
                v-for="i in binCards(b)"
                :key="`b-${i}`"
                type="button"
                class="card card--small"
                :class="cardClass(i)"
                :data-card="cards[i].id"
                @pointerdown="startDrag($event, i)"
                @pointermove="onDrag"
                @pointerup="endDrag"
                @pointercancel="cancelDrag"
                @click.stop="onCardClick(i)"
              >
                <StackedFraction v-bind="fracOf(cards[i])" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="side">
        <div class="info">
          <p class="info__main">把分數卡分到正確的框</p>
          <p class="info__sub">點卡片再點框，或直接拖曳；每一類有 2 張</p>
          <p v-if="feedback" class="info__feedback">{{ feedback }}</p>
        </div>
        <div class="rules">
          <p class="rules__title">提示</p>
          <p><b class="rules__tag rules__tag--0">真分數</b>分子＜分母</p>
          <p><b class="rules__tag rules__tag--1">假分數</b>分子≥分母</p>
          <p>
            <b class="rules__tag rules__tag--2">帶分數</b>整數和真分數合起來
          </p>
        </div>
      </div>
    </div>

    <!-- 拖曳中跟著手指／滑鼠移動的卡片 -->
    <div
      v-if="drag && drag.moved"
      class="drag-ghost"
      :style="{ left: `${drag.x}px`, top: `${drag.y}px` }"
    >
      <span class="card card--small">
        <StackedFraction v-bind="fracOf(cards[drag.index])" />
      </span>
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import StackedFraction from "./games/Fraction/StackedFraction.vue";

const DRAG_THRESHOLD = 8;
const CATEGORIES = ["真分數", "假分數", "帶分數"];

function shuffle(list) {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const fracText = (c) =>
  c.whole ? `${c.whole} ${c.num}/${c.den}` : `${c.num}/${c.den}`;

// 分類真分數、假分數和帶分數：6 張分數卡分到三個框，每類 2 張（互動同 MA4064）
// 題目 { cards: [{ id, whole, num, den, category }] }
// placement[i]：null 表示還在上方，其餘為分類框索引（分類框順序每次隨機）
export default {
  name: "MA4092",
  components: { StackedFraction },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      CATEGORIES,
      BINS: shuffle(CATEGORIES),
      cards: shuffle(this.gameData.cards),
      placement: Array(this.gameData.cards.length).fill(null),
      selected: null,
      drag: null,
      hoverZone: null,
      suppressClick: false,
      wrongCards: [],
      feedback: "",
      answered: false,
    };
  },
  computed: {
    gameIntroText() {
      return (
        this.introText?.Content ||
        "分類看看，哪些是真分數？哪些是假分數？哪些是帶分數？"
      );
    },
    trayCards() {
      return this.placement
        .map((p, i) => (p === null ? i : -1))
        .filter((i) => i >= 0);
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    fracOf(card) {
      return { whole: card.whole, num: card.num, den: card.den };
    },
    cardClass(i) {
      return {
        "card--selected": this.selected === i,
        "card--wrong": this.wrongCards.includes(i),
        "card--correct": this.answered,
        "card--dragging": this.drag && this.drag.moved && this.drag.index === i,
      };
    },
    binCards(b) {
      return this.placement
        .map((p, i) => (p === b ? i : -1))
        .filter((i) => i >= 0);
    },
    move(index, zone) {
      const next = [...this.placement];
      next[index] = zone === "tray" ? null : Number(zone);
      this.placement = next;
      this.wrongCards = this.wrongCards.filter((i) => i !== index);
      this.feedback = "";
    },
    onCardClick(index) {
      if (this.suppressClick) {
        this.suppressClick = false;
        return;
      }
      if (this.answered) return;
      this.selected = this.selected === index ? null : index;
    },
    placeSelected(zone) {
      if (this.answered || this.selected === null) return;
      this.move(this.selected, zone);
      this.selected = null;
    },
    startDrag(event, index) {
      if (this.answered) return;
      if (event.button !== undefined && event.button !== 0) return;
      this.suppressClick = false;
      this.drag = {
        index,
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
        this.selected = null;
      }
      if (this.drag.moved) this.hoverZone = this.zoneAt(event);
    },
    endDrag(event) {
      if (!this.drag) return;
      if (this.drag.moved) {
        this.suppressClick = true;
        const zone = this.zoneAt(event);
        if (zone !== null) this.move(this.drag.index, zone);
      }
      this.cancelDrag();
    },
    cancelDrag() {
      this.drag = null;
      this.hoverZone = null;
    },
    zoneAt(event) {
      const target = document.elementFromPoint(event.clientX, event.clientY);
      const zone = target?.closest("[data-zone]");
      return zone ? zone.dataset.zone : null;
    },
    checkAnswer() {
      if (this.answered) return;
      const cards = this.cards;
      const expected = cards
        .map((c) => `${fracText(c)}:${c.category}`)
        .join("、");
      if (this.trayCards.length > 0) {
        this.feedback = "還有卡片沒有分類喔！";
        return;
      }
      const placed = (i) => this.BINS[this.placement[i]];
      this.wrongCards = cards
        .map((c, i) => (placed(i) !== c.category ? i : -1))
        .filter((i) => i >= 0);
      const isCorrect = this.wrongCards.length === 0;
      this.feedback = isCorrect
        ? ""
        : "紅框放錯了，看看分子和分母誰比較大，再移過去！";
      this.$emit("add-record", [
        expected,
        cards.map((c, i) => `${fracText(c)}:${placed(i)}`).join("、"),
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
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 1rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small;
}

.board {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.tray {
  min-height: 8rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  padding: 0.5rem;
  background-color: #ffffff;
  border: 3px dashed #90a4ae;
  border-radius: 14px;

  &__empty {
    margin: 0;
    font-size: 1.3rem;
    font-weight: $font-bold;
    color: #2e7d32;
  }
}

.card {
  min-width: 5.5rem;
  height: 6.4rem;
  padding: 0.3rem 0.7rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 2.1rem;
  color: #0d47a1;
  background-color: #fffde7;
  border: 3px solid #ffca28;
  border-radius: 14px;
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.12);
  cursor: pointer;
  touch-action: none;
  user-select: none;

  &--small {
    min-width: 4.6rem;
    height: 5.4rem;
    font-size: 1.8rem;
  }

  &--selected {
    border-color: #1e88e5;
    box-shadow: 0 0 0 4px #90caf9;
  }

  &--wrong {
    border-color: #e53935;
    box-shadow: 0 0 0 4px #ffcdd2;
  }

  &--correct {
    border-color: #43a047;
    background-color: #e8f5e9;
  }

  &--dragging {
    opacity: 0.35;
  }
}

.bins {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 0.8rem;
}

.bin {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem;
  border: 4px solid;
  border-radius: 16px;
  cursor: pointer;

  &--0 {
    background-color: #e8f5e9;
    border-color: #66bb6a;
  }

  &--1 {
    background-color: #fff3e0;
    border-color: #ffa726;
  }

  &--2 {
    background-color: #e3f2fd;
    border-color: #42a5f5;
  }

  &--target {
    border-style: dashed;
  }

  &__title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: $font-bold;
  }

  &__cards {
    flex: 1;
    min-height: 0;
    width: 100%;
    overflow-y: auto;
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    justify-content: center;
    gap: 0.5rem;
  }
}

.zone--hover {
  box-shadow: 0 0 0 4px #1e88e5;
}

.side {
  width: 14rem;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1rem;
}

.info,
.rules {
  padding: 0.8rem 1rem;
  background-color: #ffffff;
  border: 3px solid #ffcc80;
  border-radius: 14px;

  p {
    margin: 0;
  }
}

.info {
  &__main {
    font-size: 1.3rem;
    font-weight: $font-bold;
  }

  &__sub {
    margin-top: 0.2rem !important;
    font-size: 1.05rem;
    color: #6d4c41;
  }

  &__feedback {
    margin-top: 0.5rem !important;
    font-size: 1.15rem;
    font-weight: $font-bold;
    color: #c62828;
  }
}

.rules {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  font-size: 1.1rem;
  color: #4e342e;
  background-color: #fff8e1;

  &__title {
    font-size: 1.2rem;
    font-weight: $font-bold;
  }

  &__tag {
    display: inline-block;
    margin-right: 0.4rem;
    padding: 0 0.4rem;
    border-radius: 8px;

    &--0 {
      background-color: #c8e6c9;
    }

    &--1 {
      background-color: #ffe0b2;
    }

    &--2 {
      background-color: #bbdefb;
    }
  }
}

@media (max-width: 1100px) {
  .tray {
    min-height: 6.6rem;
    gap: 0.5rem;
  }

  .card {
    min-width: 4.8rem;
    height: 5.6rem;
    font-size: 1.8rem;

    &--small {
      min-width: 4rem;
      height: 4.8rem;
      font-size: 1.55rem;
    }
  }

  .bin {
    padding: 0.4rem 0.3rem;

    &__title {
      font-size: 1.25rem;
    }

    &__cards {
      gap: 0.35rem;
    }
  }

  .side {
    width: 12rem;
    gap: 0.6rem;
  }

  .info,
  .rules {
    padding: 0.6rem 0.7rem;
  }

  .info__main {
    font-size: 1.15rem;
  }

  .info__sub {
    font-size: 0.95rem;
  }

  .rules {
    font-size: 1rem;
  }
}

.drag-ghost {
  position: fixed;
  z-index: 1000;
  transform: translate(-50%, -50%);
  pointer-events: none;
  opacity: 0.85;
}
</style>

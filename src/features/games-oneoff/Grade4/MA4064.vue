<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <div ref="board" class="board">
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
          <template v-for="i in trayCards" :key="`t-${i}`">
            <TriangleCard
              :card="cards[i]"
              :selected="selected === i"
              :dragging="drag && drag.moved && drag.index === i"
              @pointerdown="startDrag($event, i)"
              @pointermove="onDrag"
              @pointerup="endDrag"
              @pointercancel="cancelDrag"
              @click.stop="onCardClick(i)"
            />
          </template>
        </div>

        <!-- 兩個分類區 -->
        <div class="bins">
          <div
            v-for="(bin, b) in BINS"
            :key="bin"
            class="bin"
            :class="[
              `bin--${b}`,
              {
                'zone--hover': hoverZone === String(b),
                'bin--target': selected !== null,
              },
            ]"
            :data-zone="b"
            @click="placeSelected(b)"
          >
            <p class="bin__title">{{ bin }}</p>
            <div class="bin__cards">
              <template v-for="i in binCards(b)" :key="`b-${i}`">
                <TriangleCard
                  :card="cards[i]"
                  :selected="selected === i"
                  :wrong="wrongCards.includes(i)"
                  :dragging="drag && drag.moved && drag.index === i"
                  small
                  @pointerdown="startDrag($event, i)"
                  @pointermove="onDrag"
                  @pointerup="endDrag"
                  @pointercancel="cancelDrag"
                  @click.stop="onCardClick(i)"
                />
              </template>
            </div>
          </div>
        </div>

        <SetSquare
          v-if="showSquare"
          ref="setSquare"
          :size="110"
          :start-x="boardWidth - 150"
          :start-y="boardHeight - 14"
          @tap="forwardTap"
        />
      </div>

      <div class="side">
        <div class="info">
          <p class="info__main">把三角形分到正確的框</p>
          <p class="info__sub">點卡片再點框，或直接拖曳</p>
          <p v-if="feedback" class="info__feedback">{{ feedback }}</p>
        </div>
        <div class="tools">
          <p class="tools__title">三角板</p>
          <button type="button" class="tool tool--toggle" @click="toggleSquare">
            {{ showSquare ? "收起三角板" : "拿出三角板" }}
          </button>
          <template v-if="showSquare">
            <p class="tools__hint">拖曳移動，按鈕旋轉</p>
            <div class="tools__buttons">
              <button type="button" class="tool" @click="rotate(-15)">
                左轉
              </button>
              <button type="button" class="tool" @click="rotate(15)">
                右轉
              </button>
              <button
                type="button"
                class="tool tool--reset"
                @click="resetSquare"
              >
                歸位
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- 拖曳中跟著手指／滑鼠移動的卡片 -->
    <div
      v-if="drag && drag.moved"
      class="drag-ghost"
      :style="{ left: `${drag.x}px`, top: `${drag.y}px` }"
    >
      <TriangleCard :card="cards[drag.index]" small />
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import SetSquare from "./games/Geometry/SetSquare.vue";
import TriangleCard from "./games/Geometry/TriangleCard.vue";

const DRAG_THRESHOLD = 8;

const CATEGORIES = ["直角三角形", "鈍角三角形", "銳角三角形"];

function shuffle(list) {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 從題庫隨機抽 count 張，至少包含兩種類別
function pickCards(pool, count) {
  let picked;
  do {
    picked = shuffle(pool).slice(0, count);
  } while (new Set(picked.map((c) => c.category)).size < 2);
  return picked;
}

// 以角分類三角形：從 9 張圖卡隨機抽 4 張，分到直角／鈍角／銳角三角形
// placement[i]：null 表示還在上方，其餘為分類框索引（分類框順序每次隨機）
export default {
  name: "MA4064",
  components: { SetSquare, TriangleCard },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      BINS: shuffle(CATEGORIES),
      cards: pickCards(this.gameData.cards, this.gameConfig?.PickCount ?? 4),
      placement: Array(this.gameConfig?.PickCount ?? 4).fill(null),
      selected: null,
      drag: null,
      hoverZone: null,
      suppressClick: false,
      wrongCards: [],
      feedback: "",
      answered: false,
      showSquare: false,
      boardWidth: 600,
      boardHeight: 400,
    };
  },
  computed: {
    gameIntroText() {
      return (
        this.introText?.Content ||
        "分類看看，哪些是直角三角形？哪些是鈍角三角形？哪些是銳角三角形？"
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
  mounted() {
    const board = this.$refs.board;
    this.boardWidth = board?.clientWidth || 600;
    this.boardHeight = board?.clientHeight || 400;
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
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
    // 點到三角板但沒拖動時，當作點在底下的位置
    forwardTap({ clientX, clientY }) {
      const square = this.$refs.setSquare?.$el;
      if (square) square.style.visibility = "hidden";
      const target = document.elementFromPoint(clientX, clientY);
      if (square) square.style.visibility = "";
      target?.click();
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
    // 三角板收起來時不會擋住卡片，需要時再拿出來（放在分類區右下角）
    toggleSquare() {
      this.showSquare = !this.showSquare;
    },
    rotate(step) {
      this.$refs.setSquare?.rotate(step);
    },
    resetSquare() {
      this.$refs.setSquare?.reset();
    },
    checkAnswer() {
      if (this.answered) return;
      const cards = this.cards;
      const record = (list) =>
        list
          .map(
            (c, i) =>
              `${c.id}:${list === cards ? c.category : this.BINS[this.placement[i]] || "未分類"}`
          )
          .join("、");
      if (this.trayCards.length > 0) {
        this.feedback = "還有卡片沒有分類喔！";
        this.$emit("add-record", [record(cards), "未全部分類", "錯誤"]);
        this.$emit("play-effect", "WrongSound");
        return;
      }
      this.wrongCards = cards
        .map((c, i) => (this.BINS[this.placement[i]] !== c.category ? i : -1))
        .filter((i) => i >= 0);
      const isCorrect = this.wrongCards.length === 0;
      this.feedback = isCorrect
        ? ""
        : "紅框放錯了，用三角板量量最大的角，再移過去！";
      this.$emit("add-record", [
        record(cards),
        cards
          .map((c, i) => `${c.id}:${this.BINS[this.placement[i]]}`)
          .join("、"),
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
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  overflow: hidden;
}

.tray {
  min-height: 8.5rem;
  display: flex;
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

.info {
  padding: 0.8rem 1rem;
  background-color: #ffffff;
  border: 3px solid #ffcc80;
  border-radius: 14px;

  p {
    margin: 0;
  }

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

.tools {
  padding: 0.7rem;
  text-align: center;
  background-color: #fff8e1;
  border: 3px solid #ffb74d;
  border-radius: 14px;

  &__title {
    margin: 0;
    font-size: 1.3rem;
    font-weight: $font-bold;
  }

  &__hint {
    margin: 0.2rem 0 0.5rem;
    font-size: 1rem;
    color: #6d4c41;
  }

  &__buttons {
    display: flex;
    justify-content: center;
    gap: 0.4rem;
  }
}

.tool {
  min-width: 3.4rem;
  height: 3rem;
  font-size: 1.15rem;
  font-weight: $font-bold;
  color: #ffffff;
  background-color: #ffa726;
  border: none;
  border-radius: 12px;
  cursor: pointer;

  &--reset {
    background-color: #90a4ae;
  }

  &--toggle {
    width: 100%;
    margin-bottom: 0.5rem;
    background-color: #29b6f6;
  }
}

.tool {
  white-space: nowrap;
}

@media (max-width: 1100px) {
  .tray {
    min-height: 6.4rem;
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

  .info {
    padding: 0.6rem 0.7rem;

    &__main {
      font-size: 1.15rem;
    }

    &__sub {
      font-size: 0.95rem;
    }

    &__feedback {
      font-size: 1.05rem;
    }
  }

  .tools {
    padding: 0.5rem;

    &__hint {
      display: none;
    }
  }

  .tool {
    min-width: 3rem;
    height: 2.6rem;
    padding: 0 0.3rem;
    font-size: 1.05rem;
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

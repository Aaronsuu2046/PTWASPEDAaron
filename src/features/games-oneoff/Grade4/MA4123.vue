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
            <LineCard
              :card="gameData.cards[i]"
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
                <LineCard
                  :card="gameData.cards[i]"
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
          <p class="info__main">把卡片分到正確的框</p>
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
      <LineCard :card="gameData.cards[drag.index]" small />
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import SetSquare from "./games/Geometry/SetSquare.vue";
import LineCard from "./games/Geometry/LineCard.vue";

const DRAG_THRESHOLD = 8;

// 認識互相平行的兩條直線：把 4 張線段卡分類到「有／沒有互相平行」
// placement[i]：null 表示還在上方，0、1 表示放在哪個分類框
export default {
  name: "MA4123",
  components: { SetSquare, LineCard },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      BINS: ["有互相平行", "沒有互相平行"],
      placement: this.gameData.cards.map(() => null),
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
        "分類看看，兩條直線有互相平行？還是沒有互相平行？"
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
      const cards = this.gameData.cards;
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
        : "紅框的卡片放錯了，用三角板量量看再移到另一邊！";
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

.drag-ghost {
  position: fixed;
  z-index: 1000;
  transform: translate(-50%, -50%);
  pointer-events: none;
  opacity: 0.85;
}
</style>

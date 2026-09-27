<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <!-- 規律方格：空格顯示學生放入的圖形 -->
      <div
        class="pattern-grid"
        :class="`pattern-grid--${gameData.kind}`"
        :style="{ gridTemplateColumns: `repeat(${cols}, 1fr)` }"
      >
        <template v-for="(row, r) in gameData.grid" :key="`r-${r}`">
          <div
            v-for="(cell, c) in row"
            :key="`c-${r}-${c}`"
            class="pattern-grid__cell"
            :data-blank="cell === null ? '' : null"
            :class="{
              'pattern-grid__cell--blank': cell === null,
              'pattern-grid__cell--wrong': cell === null && wrong,
              'pattern-grid__cell--hover': cell === null && overBlank,
              'pattern-grid__cell--block-right': isBlockEdge(c),
            }"
          >
            <PatternTile
              v-if="cell !== null"
              :kind="gameData.kind"
              :variant="cell"
            />
            <PatternTile
              v-else-if="selected !== null"
              :kind="gameData.kind"
              :variant="gameData.options[selected - 1]"
            />
          </div>
        </template>
      </div>

      <!-- 選項：點一下或拖曳到空格都可以放入 -->
      <div class="option-area">
        <p class="option-hint">點選或拖曳圖形放入空格</p>
        <div class="option-list">
          <button
            v-for="(option, index) in gameData.options"
            :key="index"
            type="button"
            class="option-tile"
            :class="[
              `option-tile--${gameData.kind}`,
              { 'option-tile--selected': selected === index + 1 },
            ]"
            :aria-label="`選項 ${index + 1}`"
            @click="onOptionClick(index + 1)"
            @pointerdown="startDrag($event, index + 1)"
            @pointermove="onDrag"
            @pointerup="endDrag"
            @pointercancel="cancelDrag"
          >
            <PatternTile :kind="gameData.kind" :variant="option" />
          </button>
        </div>
      </div>
    </div>

    <!-- 拖曳中跟著手指／滑鼠移動的圖塊 -->
    <div
      v-if="drag && drag.moved"
      class="drag-ghost"
      :class="`option-tile--${gameData.kind}`"
      :style="{ left: `${drag.x}px`, top: `${drag.y}px` }"
    >
      <PatternTile
        :kind="gameData.kind"
        :variant="gameData.options[drag.index - 1]"
      />
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import PatternTile from "./games/MA4171/PatternTile.vue";

// 移動超過這個距離（px）才算拖曳，否則視為點選
const DRAG_THRESHOLD = 8;

export default {
  name: "MA4171",
  components: { PatternTile },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      selected: null,
      wrong: false,
      answered: false,
      drag: null,
      overBlank: false,
      suppressClick: false,
    };
  },
  computed: {
    gameIntroText() {
      return (
        this.introText?.Content || "觀察圖形的規律，在空格處放入正確的答案"
      );
    },
    cols() {
      return this.gameData.grid[0].length;
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    // 關卡 1 以粗線分出 2×2 區塊
    isBlockEdge(c) {
      const block = this.gameData.block;
      return !!block && (c + 1) % block[1] === 0 && c + 1 < this.cols;
    },
    select(index) {
      this.selected = index;
      this.wrong = false;
    },
    onOptionClick(index) {
      // 拖曳結束時瀏覽器仍會送出 click，略過這一次
      if (this.suppressClick) {
        this.suppressClick = false;
        return;
      }
      this.select(index);
    },
    startDrag(event, index) {
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
      }
      if (this.drag.moved) this.overBlank = this.isOverBlank(event);
    },
    endDrag(event) {
      if (!this.drag) return;
      if (this.drag.moved) {
        this.suppressClick = true;
        if (this.isOverBlank(event)) this.select(this.drag.index);
      }
      this.cancelDrag();
    },
    cancelDrag() {
      this.drag = null;
      this.overBlank = false;
    },
    isOverBlank(event) {
      const target = document.elementFromPoint(event.clientX, event.clientY);
      return !!target?.closest("[data-blank]");
    },
    checkAnswer() {
      if (this.answered) return;
      const isCorrect = this.selected === this.gameData.answer;
      this.wrong = !isCorrect;
      this.$emit("add-record", [
        `選項 ${this.gameData.answer}`,
        this.selected ? `選項 ${this.selected}` : "未作答",
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
  align-items: center;
  justify-content: center;
  gap: 2.5rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small;
}

.pattern-grid {
  display: grid;
  border: 3px solid #555555;
  background-color: #555555;
  gap: 1px;

  &__cell {
    width: 4.6rem;
    height: 3.45rem;
    background-color: #ffffff;

    &--blank {
      background-color: #eeeeee;
      outline: 3px dashed #1e88e5;
      outline-offset: -3px;
    }

    &--wrong {
      outline-color: #e53935;
      background-color: #ffebee;
    }

    &--hover {
      outline-color: #43a047;
      background-color: #e8f5e9;
    }

    &--block-right {
      border-right: 3px solid #555555;
    }
  }

  // 方形圖塊（愛心）
  &--heart &__cell,
  &--cornerHeart &__cell {
    width: 3.2rem;
    height: 3.2rem;
  }

  &--cornerHeart {
    background-color: #c9b98f;
    border-color: #c9b98f;
    gap: 3px;
  }

  // 關卡 1 格子較少，放大一些
  &--mark &__cell {
    width: 6rem;
    height: 4.5rem;
  }
}

.option-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
}

.option-hint {
  margin: 0;
  font-size: 1.1rem;
  color: #555555;
}

.option-list {
  display: grid;
  grid-template-columns: repeat(2, auto);
  gap: 0.8rem;
}

.option-tile {
  width: 5.6rem;
  height: 4.2rem;
  padding: 0;
  background: #ffffff;
  border: 3px solid #9e9e9e;
  border-radius: 6px;
  cursor: grab;
  overflow: hidden;
  touch-action: none;
  user-select: none;

  &--heart,
  &--cornerHeart {
    width: 4.4rem;
    height: 4.4rem;
  }

  &--selected {
    border-color: #1e88e5;
    box-shadow: 0 0 0 3px #90caf9;
  }
}
.drag-ghost {
  position: fixed;
  z-index: 1000;
  width: 5.6rem;
  height: 4.2rem;
  transform: translate(-50%, -50%);
  pointer-events: none;
  opacity: 0.85;
  background: #ffffff;
  border: 3px solid #1e88e5;
  border-radius: 6px;
  overflow: hidden;

  &.option-tile--heart,
  &.option-tile--cornerHeart {
    width: 4.4rem;
    height: 4.4rem;
  }
}
</style>

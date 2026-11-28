<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <div class="top">
        <p class="question" data-question>
          請湊出 <span class="question__target">{{ gameData.target }}</span>
        </p>
        <p v-if="hintText" class="tip">{{ hintText }}</p>
        <div class="top__actions">
          <button
            type="button"
            class="tool"
            data-action="digits"
            @click="showDigits = !showDigits"
          >
            {{ showDigits ? "隱藏數字" : "顯示數字" }}
          </button>
          <button
            type="button"
            class="tool tool--reset"
            data-action="reset"
            :disabled="answered || !!merging"
            @click="reset"
          >
            重置
          </button>
        </div>
      </div>

      <div class="main">
        <!-- 左：還沒用的積木（題目給的初始數量；湊完可以有剩） -->
        <div
          class="pool"
          :class="{ 'zone--over': overZone === 'pool' }"
          data-zone="pool"
          @click="tapZone('pool')"
        >
          <div
            v-for="kind in KINDS"
            v-show="pool[kind]"
            :key="kind"
            class="pool__group"
            :class="`pool__group--${kind}`"
          >
            <button
              v-for="i in pool[kind]"
              :key="i"
              type="button"
              class="piece"
              :class="pieceClass(kind, 'pool', i)"
              :data-kind="kind"
              data-from="pool"
              :aria-label="NAMES[kind]"
              @pointerdown="startDrag($event, kind, 'pool')"
              @pointermove="onDrag"
              @pointerup="endDrag"
              @pointercancel="cancelDrag"
              @click.stop="tapPiece(kind, 'pool')"
            >
              <PlaceBlock :kind="kind" />
            </button>
          </div>
          <p v-if="!poolTotal" class="pool__empty">積木都用完了</p>
        </div>

        <!-- 右：定位板，上面顯示各位的積木數量（可隱藏成＊） -->
        <div class="board">
          <p v-if="warning" class="warning" role="alert">
            <PlaceBlock :kind="warning.kind" class="warning__icon" />
            {{ warning.text }}
          </p>
          <div class="board__cols">
            <div v-for="kind in COLUMN_ORDER" :key="kind" class="col">
              <div class="col__head">{{ PLACE_NAMES[kind] }}</div>
              <div class="col__count" :data-count="kind">
                {{ showDigits ? placed[kind] : "＊" }}
                <span v-if="bump === kind" class="col__bump">+1</span>
              </div>
              <div
                class="col__body"
                :class="{ 'zone--over': overZone === kind }"
                :data-zone="kind"
                @click="tapZone(kind)"
              >
                <button
                  v-for="i in placed[kind]"
                  :key="i"
                  type="button"
                  class="piece"
                  :class="pieceClass(kind, kind, i)"
                  :data-kind="kind"
                  :data-from="kind"
                  :aria-label="NAMES[kind]"
                  @pointerdown="startDrag($event, kind, kind)"
                  @pointermove="onDrag"
                  @pointerup="endDrag"
                  @pointercancel="cancelDrag"
                  @click.stop="tapPiece(kind, kind)"
                >
                  <PlaceBlock :kind="kind" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p v-if="feedback" class="feedback" :class="{ 'feedback--ok': answered }">
        {{ feedback }}
      </p>
    </div>

    <!-- 拖曳中的積木跟著手指走 -->
    <div
      v-if="drag && drag.moved"
      class="drag-ghost"
      :style="{ left: `${drag.x}px`, top: `${drag.y}px` }"
    >
      <PlaceBlock :kind="drag.kind" />
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import PlaceBlock from "./components/PlaceBlock.vue";

const KINDS = ["hundred", "ten", "one"];
const COLUMN_ORDER = ["hundred", "ten", "one"];
const NAMES = { hundred: "百格板", ten: "十條", one: "個位方塊" };
const PLACE_NAMES = { hundred: "百位", ten: "十位", one: "個位" };
const NEXT = { one: "ten", ten: "hundred" };
const VALUE = { hundred: 100, ten: 10, one: 1 };
const DRAG_THRESHOLD = 8;
const MERGE_MS = 900;
const BUMP_MS = 1100;
const WARN_MS = 2200;

// 幾個百、幾個十、幾個一－定位板與十進位換算（物件拖拉）
// 題目 { code, target, hundreds, tens, ones, showDigits }
// 左邊積木拖到右邊相同位值才放得進去（放錯顯示提示、退回原處）；也可以先點積木再點區域。
// 右邊個位滿 10 個、十位滿 10 條會用動畫換成 1 條十、1 個百（不能換回來）；
// 送出時以右邊積木的總量和目標比較，左邊可以有剩
export default {
  name: "MA2113",
  components: { PlaceBlock },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      KINDS,
      COLUMN_ORDER,
      NAMES,
      PLACE_NAMES,
      pool: this.initialPool(),
      placed: { hundred: 0, ten: 0, one: 0 },
      showDigits: !!this.gameData.showDigits,
      selected: null,
      drag: null,
      overZone: null,
      merging: null,
      bump: null,
      warning: null,
      feedback: "",
      answered: false,
    };
  },
  computed: {
    gameIntroText() {
      return (
        this.introText?.Content ||
        "拖拉左邊的積木到右邊對應的位值區域，湊出題目要求的數字！"
      );
    },
    hintText() {
      return this.gameConfig?.Hint || "";
    },
    poolTotal() {
      return KINDS.reduce((sum, k) => sum + this.pool[k], 0);
    },
    placedValue() {
      return KINDS.reduce((sum, k) => sum + this.placed[k] * VALUE[k], 0);
    },
    busy() {
      return this.answered || !!this.merging;
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
    clearTimeout(this.mergeTimer);
    clearTimeout(this.bumpTimer);
    clearTimeout(this.warnTimer);
  },
  methods: {
    initialPool() {
      const { hundreds, tens, ones } = this.gameData;
      return { hundred: hundreds, ten: tens, one: ones };
    },
    pieceClass(kind, from, i) {
      return {
        "piece--selected":
          this.selected?.kind === kind &&
          this.selected?.from === from &&
          i === (from === "pool" ? this.pool[kind] : this.placed[kind]),
        "piece--merging": from !== "pool" && this.merging === kind && i <= 10,
        "piece--dragging":
          this.drag?.moved &&
          this.drag.kind === kind &&
          this.drag.from === from &&
          i === (from === "pool" ? this.pool[kind] : this.placed[kind]),
      };
    },

    // ── 移動積木 ──
    warn(kind) {
      this.warning = { kind, text: `只能放在${PLACE_NAMES[kind]}` };
      clearTimeout(this.warnTimer);
      this.warnTimer = setTimeout(() => (this.warning = null), WARN_MS);
    },
    move(kind, from, to) {
      if (this.busy || !to || from === to) return;
      // 只能放進相同位值；放錯就退回原處
      if (to !== "pool" && to !== kind) {
        this.warn(kind);
        return;
      }
      const source = from === "pool" ? this.pool : this.placed;
      if (source[kind] <= 0) return;
      source[kind] -= 1;
      if (to === "pool") this.pool[kind] += 1;
      else this.placed[kind] += 1;
      this.feedback = "";
      this.warning = null;
      this.carry();
    },
    // 滿 10 個就換成上一位的 1 個（先個位、再十位）
    carry() {
      const kind = ["one", "ten"].find((k) => this.placed[k] >= 10);
      if (!kind) return;
      this.merging = kind;
      clearTimeout(this.mergeTimer);
      this.mergeTimer = setTimeout(() => {
        const next = NEXT[kind];
        this.placed[kind] -= 10;
        this.placed[next] += 1;
        this.merging = null;
        this.bump = next;
        clearTimeout(this.bumpTimer);
        this.bumpTimer = setTimeout(() => (this.bump = null), BUMP_MS);
        this.carry();
      }, MERGE_MS);
    },
    reset() {
      if (this.busy) return;
      this.pool = this.initialPool();
      this.placed = { hundred: 0, ten: 0, one: 0 };
      this.selected = null;
      this.warning = null;
      this.feedback = "";
    },

    // ── 點選：先點積木、再點區域 ──
    tapPiece(kind, from) {
      if (this.busy) return;
      if (this.suppressClick) {
        this.suppressClick = false;
        return;
      }
      // 已經選了別處的積木，再點到這一區的積木＝把選好的放到這一區（區域擺滿時也點得到）
      if (this.selected && this.selected.from !== from) {
        this.tapZone(from);
        return;
      }
      const same = this.selected?.kind === kind;
      this.selected = same ? null : { kind, from };
    },
    tapZone(zone) {
      if (!this.selected || this.busy) return;
      const { kind, from } = this.selected;
      this.selected = null;
      this.move(kind, from, zone);
    },

    // ── 拖曳 ──
    startDrag(event, kind, from) {
      if (this.busy) return;
      if (event.button !== undefined && event.button !== 0) return;
      this.suppressClick = false;
      this.drag = {
        kind,
        from,
        startX: event.clientX,
        startY: event.clientY,
        x: event.clientX,
        y: event.clientY,
        moved: false,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    zoneAt(event) {
      const el = document.elementFromPoint(event.clientX, event.clientY);
      return el?.closest?.("[data-zone]")?.dataset.zone || null;
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
      if (this.drag.moved) this.overZone = this.zoneAt(event);
    },
    endDrag(event) {
      if (!this.drag) return;
      if (this.drag.moved) {
        this.suppressClick = true;
        const { kind, from } = this.drag;
        this.drag = null;
        this.overZone = null;
        this.move(kind, from, this.zoneAt(event));
        return;
      }
      this.drag = null;
    },
    cancelDrag() {
      this.drag = null;
      this.overZone = null;
    },

    // ── 判定 ──
    checkAnswer() {
      if (this.answered) return;
      if (this.merging) return;
      const { code, target, hundreds, tens, ones } = this.gameData;
      const { hundred, ten, one } = this.placed;
      if (!hundred && !ten && !one) {
        this.feedback = "先把積木拖到右邊的定位板喔！";
        return;
      }
      const isCorrect = this.placedValue === target;
      this.$emit("add-record", [
        `${code} 湊出 ${target}（左邊給：百格板${hundreds}、十條${tens}、個位${ones}）`,
        `百位${hundred}、十位${ten}、個位${one}＝${this.placedValue}`,
        isCorrect ? "正確" : "錯誤",
      ]);
      if (isCorrect) {
        this.answered = true;
        this.selected = null;
        this.showDigits = true;
        this.feedback = `答對了！${hundred} 個百、${ten} 個十、${one} 個一是 ${target}`;
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
      } else {
        this.feedback = `還不是 ${target} 喔！${this.hintText || "再數一數右邊的積木。"}`;
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
  --hundred: 3.4rem;
  --one: 1.15rem;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small $padding--medium;
}

.top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  column-gap: 1rem;
  row-gap: 0.2rem;

  &__actions {
    display: flex;
    gap: 0.6rem;
    margin-left: auto;
  }
}

.question {
  margin: 0;
  white-space: nowrap;
  font-size: 2rem;
  font-weight: $font-bold;
  color: #3e2723;

  &__target {
    padding: 0 0.6rem;
    color: #ffffff;
    background-color: #e65100;
    border-radius: 12px;
  }
}

.tip {
  margin: 0;
  font-size: 1.05rem;
  color: #6d4c41;
}

.tool {
  @extend .button-basic;
  white-space: nowrap;
  padding: 0.35rem 1rem;
  font-size: 1.15rem;
  font-weight: $font-bold;
  color: #0d47a1;
  background-color: #e3f2fd;
  border: 2px solid #64b5f6;

  &--reset {
    color: #ffffff;
    background-color: #fb8c00;
    border-color: #ef6c00;
  }

  &:disabled {
    opacity: 0.5;
  }
}

.main {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 0.8rem;
}

.pool {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.6rem;
  padding: 0.6rem;
  overflow: auto;
  background-color: #eceff1;
  border: 3px solid #cfd8dc;
  border-radius: 16px;

  &__group {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  &__empty {
    margin: 0;
    text-align: center;
    font-size: 1.2rem;
    color: #78909c;
  }
}

.board {
  position: relative;
  flex: 1.25;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 0.5rem;
  background-color: #ffffff;
  border: 3px solid #90a4ae;
  border-radius: 16px;

  &__cols {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: 1.3fr 1fr 1fr;
  }
}

.col {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-right: 2px solid #90a4ae;

  &:last-child {
    border-right: none;
  }

  &__head {
    padding: 0.15rem;
    text-align: center;
    font-size: 1.2rem;
    font-weight: $font-bold;
    color: #37474f;
    background-color: #eceff1;
    border-bottom: 2px solid #90a4ae;
  }

  &__count {
    position: relative;
    padding: 0.1rem;
    text-align: center;
    font-size: 2.2rem;
    font-weight: $font-bold;
    color: #0d47a1;
    border-bottom: 2px solid #90a4ae;
  }

  &__bump {
    position: absolute;
    top: 0.3rem;
    margin-left: 0.4rem;
    padding: 0 0.4rem;
    font-size: 1.1rem;
    color: #5d4037;
    background-color: #ffd54f;
    border-radius: 6px;
    animation: bump 1.1s ease-out;
  }

  &__body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: 0.25rem;
    padding: 0.4rem;
    overflow: auto;
  }
}

.zone--over {
  background-color: #fff9c4;
  outline: 3px dashed #fbc02d;
  outline-offset: -4px;
}

.piece {
  padding: 0.15rem;
  background: none;
  border: 2px solid transparent;
  border-radius: 6px;
  cursor: grab;
  touch-action: none;

  &--selected {
    border-color: #1e88e5;
    background-color: #e3f2fd;
  }

  &--dragging {
    opacity: 0.3;
  }

  &--merging {
    animation: merge 0.9s ease-in forwards;
  }

  // 十條很細，左右多留一點，手指比較好點
  &[data-kind="ten"] {
    padding: 0.15rem 0.35rem;
  }
}

.warning {
  position: absolute;
  top: -0.2rem;
  left: 50%;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0;
  padding: 0.2rem 0.8rem;
  font-size: 1.2rem;
  font-weight: $font-bold;
  white-space: nowrap;
  color: #c62828;
  background-color: #ffebee;
  border: 2px solid #ef9a9a;
  border-radius: 10px;
  transform: translate(-50%, -50%);

  &__icon {
    --hundred: 1.4rem;
    --one: 1rem;
  }
}

.feedback {
  margin: 0;
  align-self: center;
  padding: 0.2rem 1rem;
  font-size: 1.3rem;
  font-weight: $font-bold;
  color: #c62828;
  background-color: #fff8e1;
  border-radius: 12px;

  &--ok {
    color: #2e7d32;
    background-color: #e8f5e9;
  }
}

.drag-ghost {
  --hundred: 3.4rem;
  --one: 1.15rem;
  position: fixed;
  z-index: 1000;
  transform: translate(-50%, -50%) scale(1.1);
  pointer-events: none;
}

@keyframes merge {
  0% {
    transform: scale(1);
    filter: brightness(1);
  }
  60% {
    transform: scale(1.1);
    filter: brightness(1.4) drop-shadow(0 0 6px #ffeb3b);
  }
  100% {
    transform: scale(0.4);
    opacity: 0;
  }
}

@keyframes bump {
  0% {
    transform: translateY(6px);
    opacity: 0;
  }
  20% {
    transform: translateY(0);
    opacity: 1;
  }
  100% {
    opacity: 1;
  }
}

@media (max-width: 1100px), (max-height: 760px) {
  .game-area,
  .drag-ghost {
    --hundred: 2.9rem;
    --one: 1rem;
  }

  .question {
    font-size: 1.7rem;
  }

  .tip {
    order: 3;
    flex-basis: 100%;
    font-size: 1rem;
  }

  .col__count {
    font-size: 1.8rem;
  }
}
</style>

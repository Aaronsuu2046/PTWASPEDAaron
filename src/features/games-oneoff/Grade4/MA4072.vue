<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <!-- 積木代表多少（芳汶插圖：1 張、0.1 張、0.01 張） -->
      <div class="legend">
        <img
          :src="legendSrc"
          class="legend__img"
          alt="1 張百格板是 1 張，1 條是 0.1 張，1 個小方塊是 0.01 張"
        />
      </div>
      <!-- 配對：每列左邊是積木圖、右邊是空格；把右側的小數卡放進空格（點選或拖曳） -->
      <div class="board">
        <div class="pair-rows">
          <div
            v-for="(pair, r) in gameData.pairs"
            :key="pair.id"
            class="pair-row"
          >
            <div class="pair-row__blocks">
              <img
                :src="imageOf(pair)"
                class="card-blocks"
                :alt="blocksText(pair)"
              />
            </div>
            <span class="pair-row__eq">＝</span>
            <button
              type="button"
              class="slot"
              :class="{
                'slot--filled': placed[r] !== null,
                'slot--target': selectedCard !== null && placed[r] === null,
                'slot--wrong': wrongRows.includes(r),
                'slot--correct': answered,
              }"
              :data-slot="r"
              :aria-label="`第 ${r + 1} 列的空格`"
              @click="tapSlot(r)"
            >
              {{ placed[r] !== null ? cards[placed[r]].answer : "" }}
            </button>
          </div>
        </div>

        <div class="bank" data-bank>
          <button
            v-for="(card, c) in cards"
            v-show="!placed.includes(c)"
            :key="card.id"
            type="button"
            class="answer-card"
            :class="{ 'answer-card--selected': selectedCard === c }"
            @pointerdown="startDrag($event, c)"
            @pointermove="moveDrag"
            @pointerup="endDrag"
            @pointercancel="drag = null"
          >
            {{ card.answer }}
          </button>
          <p v-if="!placed.includes(null)" class="bank__empty">
            小數卡都放好了
          </p>
        </div>
      </div>
      <div
        v-if="drag && drag.moved"
        class="answer-card answer-card--ghost"
        :style="{ left: `${drag.x}px`, top: `${drag.y}px` }"
      >
        {{ cards[drag.c].answer }}
      </div>
      <p class="hint">
        點右邊的小數卡，再點左邊的空格（也可以直接拖過去）；點已放好的空格可以拿回來
      </p>
      <p v-if="feedback" class="feedback">{{ feedback }}</p>
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import { getGameAssets } from "@/lib/get-assets.js";

const blocksText = (item) =>
  [item.rods && `${item.rods} 條`, item.cubes && `${item.cubes} 個`]
    .filter(Boolean)
    .join("＋");

// 芳汶插圖的檔名（src/assets/games/MA4072/）：
// 1-1～1-14：5～9、11～19 個小方塊；2-1～2-5：20～60 個（10 個一排）；2-0：10 個一排（由 2-1 裁出）
// 3-1～3-9：1 條＋1～9 個；4-1～4-9：2 條＋1～9 個；4-10～4-18：3 條＋1～9 個
function imageName({ rods, cubes, grouped }) {
  if (rods === 0 && grouped) return `2-${cubes / 10 - 1}`;
  if (rods === 0) return `1-${cubes < 10 ? cubes - 4 : cubes - 5}`;
  if (rods === 1) return `3-${cubes}`;
  return `4-${(rods - 2) * 9 + cubes}`;
}

const DRAG_THRESHOLD = 8;

function shuffle(list) {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 百格積木配對（依腳本為配對題，不是連連看）：每列積木圖旁有一個空格，
// 把右側洗牌後的小數卡放進空格；三格都對才過關，答錯只標出放錯的空格
// 題目 { pairs: [{ id, rods, cubes, grouped, value, answer }] }
export default {
  name: "MA4072",

  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      legendSrc: getGameAssets("MA4072", "legend.PNG"),
      cards: shuffle(this.gameData.pairs),
      // placed[列] = 放進去的小數卡索引
      placed: this.gameData.pairs.map(() => null),
      selectedCard: null,
      wrongRows: [],
      drag: null,
      feedback: "",
      answered: false,
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "想一想，圖片合起來是多少張百格板？";
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    blocksText,
    imageOf(pair) {
      return getGameAssets("MA4072", `${imageName(pair)}.PNG`);
    },
    clearMark(r) {
      this.wrongRows = this.wrongRows.filter((i) => i !== r);
      this.feedback = "";
    },
    // 把小數卡放進第 r 列；那一列原本的卡回到右側
    put(c, r) {
      if (this.answered) return;
      const placed = this.placed.map((v) => (v === c ? null : v));
      placed[r] = c;
      this.placed = placed;
      this.selectedCard = null;
      this.clearMark(r);
    },
    tapSlot(r) {
      if (this.answered) return;
      if (this.selectedCard !== null) {
        this.put(this.selectedCard, r);
        return;
      }
      if (this.placed[r] !== null) {
        const placed = [...this.placed];
        placed[r] = null;
        this.placed = placed;
        this.clearMark(r);
      }
    },
    startDrag(event, c) {
      if (this.answered) return;
      if (event.button !== undefined && event.button !== 0) return;
      this.drag = {
        c,
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
      const { c, moved } = this.drag;
      this.drag = null;
      if (!moved) {
        // 點一下：選取／取消選取
        this.selectedCard = this.selectedCard === c ? null : c;
        return;
      }
      const slot = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest("[data-slot]");
      if (slot && this.$el.contains(slot))
        this.put(c, Number(slot.dataset.slot));
    },
    checkAnswer() {
      if (this.answered) return;
      const pairs = this.gameData.pairs;
      if (this.placed.includes(null)) {
        // 還沒放完不能送出，也不記錄
        this.wrongRows = this.placed
          .map((v, r) => (v === null ? r : null))
          .filter((r) => r !== null);
        this.feedback = "每個空格都要放一張小數卡喔！";
        return;
      }
      const given = (r) => this.cards[this.placed[r]];
      const wrong = pairs
        .map((p, r) => (given(r).id === p.id ? null : r))
        .filter((r) => r !== null);
      this.wrongRows = wrong;
      const isCorrect = wrong.length === 0;
      this.$emit("add-record", [
        pairs.map((p) => `${blocksText(p)}＝${p.answer}`).join("；"),
        pairs.map((p, r) => `${blocksText(p)}＝${given(r).answer}`).join("；"),
        isCorrect ? "正確" : "錯誤",
      ]);
      if (isCorrect) {
        this.answered = true;
        this.feedback = "";
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
      } else {
        this.feedback =
          "紅色的空格放錯了！1 條是 0.1，1 個小方塊是 0.01，再數數看。";
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
  flex-direction: column;
  gap: 0.5rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small $padding--medium;
}

.legend {
  display: flex;
  justify-content: center;

  &__img {
    height: 6.4rem;
    width: auto;
    padding: 0.2rem 1rem;
    background-color: #ffffff;
    border-radius: 12px;
  }
}

.board {
  flex: 1;
  min-height: 0;
  width: 100%;
  max-width: 60rem;
  align-self: center;
  display: grid;
  grid-template-columns: 1fr 11rem;
  gap: 1.5rem;
}

.pair-rows {
  min-height: 0;
  display: grid;
  grid-auto-rows: minmax(0, 1fr);
  gap: 0.6rem;
}

.pair-row {
  min-height: 0;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.4rem 0.8rem;
  background-color: #ffffff;
  border: 3px solid #c5e1a5;
  border-radius: 16px;

  &__blocks {
    flex: 1;
    min-width: 0;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__eq {
    font-size: 2rem;
    font-weight: $font-bold;
    color: #333333;
  }
}

.slot {
  flex-shrink: 0;
  width: 9rem;
  height: 4.2rem;
  font-size: 2.2rem;
  font-weight: $font-bold;
  color: #0d47a1;
  background-color: #fafafa;
  border: 3px dashed #90a4ae;
  border-radius: 14px;
  cursor: pointer;

  &--filled {
    border-style: solid;
    border-color: #1e88e5;
    background-color: #e3f2fd;
  }

  &--target {
    border-color: #1e88e5;
    box-shadow: 0 0 0 3px #bbdefb;
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
    color: #2e7d32;
  }
}

.bank {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  padding: 0.6rem;
  background-color: #fff8e1;
  border: 3px dashed #ffcc80;
  border-radius: 16px;

  &__empty {
    margin: 0;
    text-align: center;
    font-size: 1rem;
    color: #8d6e63;
  }
}

.answer-card {
  width: 8.5rem;
  height: 4rem;
  font-size: 2.2rem;
  font-weight: $font-bold;
  color: #0d47a1;
  background-color: #ffffff;
  border: 3px solid #66bb6a;
  border-radius: 14px;
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.12);
  cursor: grab;
  touch-action: none;
  user-select: none;

  &--selected {
    border-color: #1e88e5;
    box-shadow: 0 0 0 4px #90caf9;
  }

  &--ghost {
    position: fixed;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    transform: translate(-50%, -50%);
    pointer-events: none;
    opacity: 0.9;
  }
}

.card-blocks {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.hint {
  margin: 0;
  text-align: center;
  font-size: 1.05rem;
  color: #6d4c41;
}

.feedback {
  margin: 0;
  text-align: center;
  font-size: 1.3rem;
  font-weight: $font-bold;
  color: #c62828;
}

@media (max-width: 1100px), (max-height: 760px) {
  .legend__img {
    height: 4.8rem;
  }

  .slot,
  .answer-card {
    width: 7.5rem;
    height: 3.4rem;
    font-size: 1.8rem;
  }
}
</style>

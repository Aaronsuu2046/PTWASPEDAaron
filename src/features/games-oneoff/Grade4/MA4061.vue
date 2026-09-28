<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <p class="hint">
        點卡片再點空格，也可以直接拖過去；點已放好的空格可以把卡片拿回來
      </p>
      <!-- 選項卡 -->
      <div class="tray">
        <p class="tray__title">選項卡</p>
        <div class="tray__cards">
          <button
            v-for="card in trayCards"
            :key="card.id"
            type="button"
            class="card"
            :class="{ 'card--selected': selected === card.id }"
            :data-card="card.id"
            @pointerdown="startDrag($event, card.id)"
            @pointermove="onDrag"
            @pointerup="endDrag"
            @pointercancel="drag = null"
            @click="onCardClick(card.id)"
          >
            {{ card.text }}
          </button>
        </div>
        <p v-if="!trayCards.length" class="tray__empty">都放好了</p>
      </div>
      <div class="board">
        <!-- 三角形與「邊、頂點、角」的空格 -->
        <div class="figure">
          <svg class="figure__svg" viewBox="0 0 520 340">
            <polygon points="90,285 430,285 250,75" class="figure__shape" />
            <line x1="90" y1="285" x2="250" y2="75" class="figure__side" />
            <path :d="angleArc" class="figure__angle" />
            <circle cx="250" cy="75" r="9" class="figure__vertex" />
            <g class="figure__arrows">
              <line x1="128" y1="176" x2="162" y2="176" />
              <polygon points="172,176 158,169 158,183" />
              <line x1="300" y1="48" x2="266" y2="66" />
              <polygon points="258,71 268,59 273,72" />
              <line x1="455" y1="205" x2="400" y2="252" />
              <polygon points="393,258 399,244 408,254" />
            </g>
          </svg>
          <button
            v-for="zone in FIGURE_ZONES"
            :key="zone.id"
            type="button"
            class="slot slot--figure"
            :class="slotClass(zone.id)"
            :style="zone.style"
            :data-zone="zone.id"
            @click="onZoneClick(zone.id)"
          >
            {{ cardText(placed[zone.id]) }}
          </button>
        </div>
      </div>

      <!-- 句子填空 -->
      <p class="sentence">
        <template v-for="(part, i) in SENTENCE" :key="i">
          <button
            v-if="part.zone"
            type="button"
            class="slot slot--number"
            :class="slotClass(part.zone)"
            :data-zone="part.zone"
            @click="onZoneClick(part.zone)"
          >
            {{ cardText(placed[part.zone]) }}
          </button>
          <span v-else>{{ part.text }}</span>
        </template>
      </p>
      <p v-if="feedback" class="feedback">{{ feedback }}</p>
    </div>

    <div
      v-if="drag && drag.moved"
      class="card card--ghost"
      :style="{ left: `${drag.x}px`, top: `${drag.y}px` }"
    >
      {{ cardText(drag.cardId) }}
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";

const DRAG_THRESHOLD = 8;

// 圖形上的空格（位置用百分比，對應 520×340 的圖）
const FIGURE_ZONES = [
  { id: "side", answer: "邊", style: { left: "1%", top: "43%" } },
  { id: "vertex", answer: "頂點", style: { left: "58%", top: "3%" } },
  { id: "angle", answer: "角", style: { left: "78%", top: "44%" } },
];
const SENTENCE_ZONES = [
  { id: "angles", answer: "3" },
  { id: "sides", answer: "3" },
  { id: "vertices", answer: "3" },
];
// 三角形有（ ）個角、（ ）條邊和（ ）個頂點。
const SENTENCE = [
  { text: "三角形有" },
  { zone: "angles" },
  { text: "個角、" },
  { zone: "sides" },
  { text: "條邊和" },
  { zone: "vertices" },
  { text: "個頂點。" },
];

function shuffle(list) {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 認識三角形 1：把「邊、頂點、角」拖到圖上，並在句子裡填三個 3
export default {
  name: "MA4061",
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    const cards = ["邊", "頂點", "角", "3", "3", "3"].map((text, i) => ({
      id: `c${i}`,
      text,
    }));
    return {
      FIGURE_ZONES,
      SENTENCE,
      cards: shuffle(cards),
      placed: {},
      selected: null,
      drag: null,
      wrongZones: [],
      feedback: "",
      answered: false,
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "將三角形的各部位名稱拖到對應位置。";
    },
    allZones() {
      return [...FIGURE_ZONES, ...SENTENCE_ZONES];
    },
    trayCards() {
      const used = Object.values(this.placed);
      return this.cards.filter((c) => !used.includes(c.id));
    },
    // 角 B 的角弧（在三角形內側）
    angleArc() {
      return "M 430 285 L 370 285 A 60 60 0 0 1 390.9 239.5 Z";
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    cardText(cardId) {
      return this.cards.find((c) => c.id === cardId)?.text || "";
    },
    slotClass(zoneId) {
      return {
        "slot--filled": Boolean(this.placed[zoneId]),
        "slot--target": this.selected !== null && !this.placed[zoneId],
        "slot--wrong": this.wrongZones.includes(zoneId),
        "slot--correct": this.answered,
      };
    },
    place(cardId, zoneId) {
      if (this.answered) return;
      const next = { ...this.placed };
      Object.keys(next).forEach((z) => {
        if (next[z] === cardId) delete next[z];
      });
      next[zoneId] = cardId;
      this.placed = next;
      this.selected = null;
      this.wrongZones = [];
      this.feedback = "";
    },
    onCardClick(cardId) {
      if (this.drag?.suppress) {
        this.drag = null;
        return;
      }
      this.selected = this.selected === cardId ? null : cardId;
    },
    onZoneClick(zoneId) {
      if (this.answered) return;
      if (this.placed[zoneId]) {
        // 點已放好的空格：把卡片拿回來
        const next = { ...this.placed };
        delete next[zoneId];
        this.placed = next;
        this.feedback = "";
        return;
      }
      if (this.selected !== null) this.place(this.selected, zoneId);
    },
    startDrag(event, cardId) {
      if (this.answered) return;
      if (event.button !== undefined && event.button !== 0) return;
      this.drag = {
        cardId,
        startX: event.clientX,
        startY: event.clientY,
        x: event.clientX,
        y: event.clientY,
        moved: false,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    onDrag(event) {
      if (!this.drag || this.drag.suppress) return;
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
    },
    endDrag(event) {
      if (!this.drag || this.drag.suppress) return;
      if (!this.drag.moved) {
        this.drag = null;
        return;
      }
      const target = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest("[data-zone]");
      if (target) this.place(this.drag.cardId, target.dataset.zone);
      // 拖曳結束後瀏覽器仍會送出 click，先擋掉
      this.drag = { suppress: true };
    },
    checkAnswer() {
      if (this.answered) return;
      const wrong = this.allZones
        .filter(
          (z) =>
            this.placed[z.id] && this.cardText(this.placed[z.id]) !== z.answer
        )
        .map((z) => z.id);
      const complete = this.allZones.every((z) => this.placed[z.id]);
      const isCorrect = complete && !wrong.length;
      const text = (pick) =>
        this.allZones.map((z) => `${z.id}:${pick(z) || "_"}`).join("，");
      this.$emit("add-record", [
        text((z) => z.answer),
        text((z) => this.cardText(this.placed[z.id])),
        isCorrect ? "正確" : "錯誤",
      ]);
      if (isCorrect) {
        this.answered = true;
        this.feedback = "";
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
        return;
      }
      this.$emit("play-effect", "WrongSound");
      if (wrong.length) {
        // 放錯的卡片退回選項卡區
        this.wrongZones = wrong;
        const next = { ...this.placed };
        wrong.forEach((z) => delete next[z]);
        this.placed = next;
        this.feedback = "放錯的卡片回到選項卡了，再試試看！";
      } else {
        this.feedback = "每個空格都要放一張卡片喔！";
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
  align-items: center;
  gap: 0.5rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small;
}

.hint {
  margin: 0;
  font-size: 1.15rem;
  color: #6d4c41;
}

.board {
  flex: 1;
  min-height: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
}

.figure {
  position: relative;
  height: 100%;
  max-height: 22rem;
  aspect-ratio: 520 / 340;
  background-color: #ffffff;
  border-radius: 16px;
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.1);

  &__svg {
    width: 100%;
    height: 100%;
  }

  &__shape {
    fill: #e3f2fd;
    stroke: #1565c0;
    stroke-width: 6;
    stroke-linejoin: round;
  }

  &__side {
    stroke: #ef6c00;
    stroke-width: 10;
    stroke-linecap: round;
  }

  &__angle {
    fill: #ffcdd2;
    stroke: #e53935;
    stroke-width: 6;
  }

  &__vertex {
    fill: #8e24aa;
  }

  &__arrows {
    stroke: #455a64;
    stroke-width: 4;
    fill: #455a64;
  }
}

.slot {
  min-width: 5.5rem;
  height: 3.2rem;
  padding: 0 0.5rem;
  font-size: 1.6rem;
  font-weight: $font-bold;
  color: #e65100;
  background-color: #fff176;
  border: 3px dashed #fbc02d;
  border-radius: 12px;
  cursor: pointer;

  // 圖上的空格：至少 21% 寬，放入較長的字（頂點）時跟著變寬
  &--figure {
    position: absolute;
    min-width: 21%;
    padding: 0 0.5rem;
    white-space: nowrap;
  }

  &--number {
    min-width: 4rem;
  }

  &--filled {
    border-style: solid;
    background-color: #ffe082;
  }

  &--target {
    border-color: #1e88e5;
  }

  &--wrong {
    border-color: #e53935;
    box-shadow: 0 0 0 4px #ffcdd2;
  }

  &--correct {
    color: #2e7d32;
    background-color: #c8e6c9;
    border: 3px solid #43a047;
  }
}

.tray {
  width: 100%;
  max-width: 48rem;
  min-height: 4.4rem;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.5rem 0.9rem;
  background-color: #fff3e0;
  border: 3px dashed #ffb74d;
  border-radius: 16px;

  &__title {
    margin: 0;
    flex-shrink: 0;
    font-size: 1.1rem;
    font-weight: $font-bold;
    color: #8d6e63;
  }

  // 選項卡橫向排成一列
  &__cards {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.6rem;
  }

  &__empty {
    margin: 0;
    color: #8d6e63;
  }
}

.card {
  min-width: 4.6rem;
  height: 3.2rem;
  padding: 0 1rem;
  white-space: nowrap;
  font-size: 1.6rem;
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

.sentence {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 1.7rem;
  font-weight: $font-bold;
  color: #333333;
}

.feedback {
  margin: 0;
  font-size: 1.3rem;
  font-weight: $font-bold;
  color: #c62828;
}

@media (max-width: 1100px) {
  .board {
    gap: 1rem;
  }

  .figure {
    max-height: 17rem;
  }

  .slot {
    height: 2.8rem;
    font-size: 1.4rem;
  }

  .card {
    height: 2.8rem;
    font-size: 1.4rem;
  }

  .sentence {
    font-size: 1.45rem;
  }
}
</style>

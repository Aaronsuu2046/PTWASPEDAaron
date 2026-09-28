<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <p class="how">
        點角卡再點分類區，或直接拖過去；按「量」可以用量角器量
      </p>

      <div
        class="tray"
        data-zone="tray"
        :class="{ 'tray--target': selected && placed[selected] }"
        @click="onZoneClick('tray')"
      >
        <template v-for="card in trayCards" :key="card.id">
          <div
            class="card"
            :class="cardClass(card)"
            :data-card="card.id"
            @pointerdown="startDrag($event, card.id)"
            @pointermove="onDrag"
            @pointerup="endDrag"
            @pointercancel="drag = null"
            @click.stop="onCardClick(card.id)"
          >
            <svg class="card__svg" viewBox="0 0 100 100" aria-hidden="true">
              <path :d="card.figure.arc" class="card__arc" />
              <polyline
                :points="card.figure.line"
                class="card__line"
                :style="{ stroke: card.color }"
              />
              <circle
                :cx="card.figure.v[0]"
                :cy="card.figure.v[1]"
                r="3.5"
                class="card__vertex"
              />
            </svg>
            <button
              type="button"
              class="card__measure"
              :aria-label="`量角卡 ${card.id}`"
              @pointerdown.stop
              @click.stop="measuring = card"
            >
              量
            </button>
          </div>
        </template>
        <p v-if="!trayCards.length" class="tray__empty">
          都分類好了，按「送出答案」
        </p>
      </div>

      <div class="zones">
        <div
          v-for="zone in ZONES"
          :key="zone.id"
          class="zone"
          :class="[`zone--${zone.id}`, { 'zone--target': selected }]"
          :data-zone="zone.id"
          @click="onZoneClick(zone.id)"
        >
          <p class="zone__name">
            {{ zone.name }}<span class="zone__rule">{{ zone.rule }}</span>
          </p>
          <div class="zone__cards">
            <div
              v-for="card in zoneCards(zone.id)"
              :key="card.id"
              class="card card--small"
              :class="cardClass(card)"
              :data-card="card.id"
              @pointerdown="startDrag($event, card.id)"
              @pointermove="onDrag"
              @pointerup="endDrag"
              @pointercancel="drag = null"
              @click.stop="onCardClick(card.id)"
            >
              <svg class="card__svg" viewBox="0 0 100 100" aria-hidden="true">
                <path :d="card.figure.arc" class="card__arc" />
                <polyline
                  :points="card.figure.line"
                  class="card__line"
                  :style="{ stroke: card.color }"
                />
                <circle
                  :cx="card.figure.v[0]"
                  :cy="card.figure.v[1]"
                  r="3.5"
                  class="card__vertex"
                />
              </svg>
              <button
                type="button"
                class="card__measure"
                :aria-label="`量角卡 ${card.id}`"
                @pointerdown.stop
                @click.stop="measuring = card"
              >
                量
              </button>
              <span v-if="wrong.includes(card.id)" class="card__mark">✘</span>
            </div>
          </div>
        </div>
      </div>

      <p v-if="feedback" class="feedback">{{ feedback }}</p>

      <div
        v-if="drag && drag.moved"
        class="ghost"
        :style="{ left: `${drag.x}px`, top: `${drag.y}px` }"
      >
        <svg class="card__svg" viewBox="0 0 100 100" aria-hidden="true">
          <polyline
            :points="dragCard.figure.line"
            class="card__line"
            :style="{ stroke: dragCard.color }"
          />
        </svg>
      </div>

      <MeasureDialog
        v-if="measuring"
        :from="measuring.from"
        :angle="measuring.angle"
        :color="measuring.color"
        @close="measuring = null"
      />
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import MeasureDialog from "./games/Geometry/MeasureDialog.vue";

const ZONES = [
  { id: "acute", name: "銳角", rule: "比直角小" },
  { id: "right", name: "直角", rule: "90°" },
  { id: "obtuse", name: "鈍角", rule: "比直角大、比平角小" },
];
const ZONE_NAME = { acute: "銳角", right: "直角", obtuse: "鈍角" };
const DRAG_THRESHOLD = 8;

const along = (deg, r) => {
  const rad = (deg * Math.PI) / 180;
  return [r * Math.cos(rad), -r * Math.sin(rad)];
};

// 角卡圖形：兩邊與角弧（不標度數、直角也不畫直角記號），置中於 100×100
function cardFigure({ from, angle, len }) {
  const a = along(from, len[0]);
  const b = along(from + angle, len[1]);
  const xs = [0, a[0], b[0]];
  const ys = [0, a[1], b[1]];
  const dx = 50 - (Math.min(...xs) + Math.max(...xs)) / 2;
  const dy = 50 - (Math.min(...ys) + Math.max(...ys)) / 2;
  const shift = (p) => [p[0] + dx, p[1] + dy];
  const v = shift([0, 0]);
  const A = shift(a);
  const B = shift(b);
  const r = 13;
  const p = shift(along(from, r));
  const q = shift(along(from + angle, r));
  return {
    v,
    line: [A, v, B].map((pt) => pt.join(",")).join(" "),
    arc: `M ${v[0]} ${v[1]} L ${p[0]} ${p[1]} A ${r} ${r} 0 0 0 ${q[0]} ${q[1]} Z`,
  };
}

function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// 銳角、直角和鈍角：把角卡拖（或點選）到三個分類區；可開量角器視窗輔助
export default {
  name: "MA4033",
  components: { MeasureDialog },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    const pool = this.gameConfig?.Pool || [];
    const cards = shuffle(
      this.gameData.cards
        .map((id) => pool.find((p) => p.id === id))
        .filter(Boolean)
        .map((p) => ({ ...p, figure: cardFigure(p) }))
    );
    return {
      ZONES,
      cards,
      placed: {},
      selected: null,
      drag: null,
      suppress: false,
      measuring: null,
      wrong: [],
      feedback: "",
      solved: false,
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "量量看，哪些是銳角、直角或鈍角？";
    },
    trayCards() {
      return this.cards.filter((c) => !this.placed[c.id]);
    },
    dragCard() {
      return this.cards.find((c) => c.id === this.drag?.id);
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    zoneCards(zone) {
      return this.cards.filter((c) => this.placed[c.id] === zone);
    },
    cardClass(card) {
      return {
        "card--selected": this.selected === card.id,
        "card--wrong": this.wrong.includes(card.id),
        "card--right": this.solved,
      };
    },
    place(id, zone) {
      if (this.solved) return;
      if (zone === "tray") delete this.placed[id];
      else this.placed[id] = zone;
      this.wrong = this.wrong.filter((w) => w !== id);
      this.selected = null;
      this.feedback = "";
    },

    // ---- 點選 ----
    onCardClick(id) {
      if (this.suppress) {
        this.suppress = false;
        return;
      }
      if (this.solved) return;
      this.selected = this.selected === id ? null : id;
    },
    onZoneClick(zone) {
      if (!this.selected) return;
      if (zone === "tray" && !this.placed[this.selected]) return;
      this.place(this.selected, zone);
    },

    // ---- 拖曳 ----
    startDrag(event, id) {
      if (this.solved) return;
      if (event.button !== undefined && event.button !== 0) return;
      this.suppress = false;
      this.drag = {
        id,
        sx: event.clientX,
        sy: event.clientY,
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
        Math.hypot(event.clientX - this.drag.sx, event.clientY - this.drag.sy) >
        DRAG_THRESHOLD
      ) {
        this.drag.moved = true;
      }
    },
    endDrag(event) {
      if (!this.drag) return;
      if (this.drag.moved) {
        this.suppress = true;
        const zone = document
          .elementsFromPoint(event.clientX, event.clientY)
          .map((el) => el.closest("[data-zone]"))
          .find(Boolean);
        if (zone) this.place(this.drag.id, zone.dataset.zone);
      }
      this.drag = null;
    },

    // ---- 判分 ----
    checkAnswer() {
      if (this.solved) return;
      if (this.trayCards.length) {
        this.feedback = "還有角卡沒有分類喔！";
        return;
      }
      this.wrong = this.cards
        .filter((c) => this.placed[c.id] !== c.kind)
        .map((c) => c.id);
      const describe = (pick) =>
        ZONES.map(
          (z) =>
            `${z.name}：${
              this.cards
                .filter((c) => pick(c) === z.id)
                .map((c) => `${c.angle}°`)
                .join("、") || "無"
            }`
        ).join("；");
      const ok = this.wrong.length === 0;
      this.$emit("add-record", [
        describe((c) => c.kind),
        describe((c) => this.placed[c.id]),
        ok ? "正確" : "錯誤",
      ]);
      if (ok) {
        this.feedback = "";
        this.solved = true;
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
      } else {
        const names = [
          ...new Set(
            this.cards
              .filter((c) => this.wrong.includes(c.id))
              .map((c) => ZONE_NAME[this.placed[c.id]])
          ),
        ];
        this.feedback = `有 ${this.wrong.length} 張放錯了（打 ✘ 的卡，放在${names.join(
          "、"
        )}），按「量」量量看，再換個地方放。`;
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
  padding: $padding--small;
}

.how {
  margin: 0;
  font-size: 1.1rem;
  font-weight: $font-bold;
  color: #6d4c41;
  text-align: center;
}

.tray {
  min-height: 7.4rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.7rem;
  padding: 0.4rem;
  background-color: #fff8e1;
  border: 3px dashed #ffcc80;
  border-radius: 16px;

  &--target {
    border-color: #ffb300;
    background-color: #fff3c4;
  }

  &__empty {
    margin: 0;
    font-size: 1.3rem;
    font-weight: $font-bold;
    color: #8d6e63;
  }
}

.card {
  position: relative;
  width: 6.6rem;
  height: 6.6rem;
  flex-shrink: 0;
  background-color: #ffffff;
  border: 4px solid #b0bec5;
  border-radius: 16px;
  box-shadow: 0 3px 0 #90a4ae;
  cursor: grab;
  touch-action: none;
  user-select: none;

  &--small {
    width: 5.2rem;
    height: 5.2rem;
    border-radius: 12px;
  }

  &--selected {
    border-color: #ffb300;
    box-shadow: 0 0 0 5px #ffe082;
  }

  &--wrong {
    border-color: #e53935;
    background-color: #ffebee;
  }

  &--right {
    border-color: #43a047;
    background-color: #e8f5e9;
  }

  &__svg {
    width: 100%;
    height: 100%;
    display: block;
    pointer-events: none;
  }

  &__arc {
    fill: rgba(255, 193, 7, 0.45);
    stroke: #ff8f00;
    stroke-width: 1.5;
  }

  &__line {
    fill: none;
    stroke-width: 5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  &__vertex {
    fill: #37474f;
  }

  &__measure {
    position: absolute;
    right: -0.5rem;
    top: -0.5rem;
    width: 2rem;
    height: 2rem;
    padding: 0;
    font-size: 1rem;
    font-weight: $font-bold;
    color: #ffffff;
    background-color: #7e57c2;
    border: 2px solid #ffffff;
    border-radius: 50%;
    box-shadow: 0 2px 0 #4527a0;
    cursor: pointer;
  }

  &__mark {
    position: absolute;
    left: 0.2rem;
    top: 0;
    font-size: 1.3rem;
    font-weight: $font-bold;
    color: #e53935;
  }
}

.zones {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 0.7rem;
}

.zone {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.4rem 0.5rem;
  border: 4px solid;
  border-radius: 18px;
  cursor: pointer;

  &--acute {
    background-color: #e3f2fd;
    border-color: #64b5f6;
  }

  &--right {
    background-color: #e8f5e9;
    border-color: #81c784;
  }

  &--obtuse {
    background-color: #fce4ec;
    border-color: #f06292;
  }

  &--target {
    border-style: dashed;
  }

  &__name {
    margin: 0;
    font-size: 1.7rem;
    font-weight: $font-bold;
    color: #37474f;
    text-align: center;
  }

  &__rule {
    margin-left: 0.4rem;
    font-size: 1rem;
    color: #6d4c41;
  }

  &__cards {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    justify-content: center;
    gap: 0.6rem;
    overflow-y: auto;
    padding-top: 0.5rem;
  }
}

.feedback {
  margin: 0;
  font-size: 1.2rem;
  font-weight: $font-bold;
  color: #c62828;
  text-align: center;
}

.ghost {
  position: fixed;
  z-index: 100;
  width: 6rem;
  height: 6rem;
  background-color: rgba(255, 255, 255, 0.9);
  border: 3px solid #ffb300;
  border-radius: 14px;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

@media (max-width: 1100px) {
  .how {
    font-size: 0.95rem;
  }

  .tray {
    min-height: 6rem;
  }

  .card {
    width: 5.4rem;
    height: 5.4rem;

    &--small {
      width: 4.4rem;
      height: 4.4rem;
    }
  }

  .zone__name {
    font-size: 1.4rem;
  }

  .zone__rule {
    font-size: 0.85rem;
  }

  .feedback {
    font-size: 1.05rem;
  }
}
</style>

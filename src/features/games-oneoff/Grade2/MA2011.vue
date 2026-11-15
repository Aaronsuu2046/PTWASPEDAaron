<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <!-- 題幹：答案格就在句子裡的括號位置 -->
      <p class="question" data-pad-avoid>
        一盒甜甜圈有 10 個。數數看，下面共有（<button
          type="button"
          class="answer-box"
          :class="{
            'answer-box--active': padOpen && !answered,
            'answer-box--wrong': wrong,
            'answer-box--correct': answered,
          }"
          data-answer
          data-pad-field
          aria-label="共有幾個甜甜圈"
          @click="openPad"
        >
          {{ value }}</button
        >）個甜甜圈。
      </p>

      <!-- 左：題目的甜甜圈；右：計數區。盒子與零散的甜甜圈可以拖過去，或點一下移過去 -->
      <div class="trays" :class="`trays--${size}`">
        <section
          v-for="tray in TRAYS"
          :key="tray.id"
          class="tray"
          :class="[
            `tray--${tray.id}`,
            { 'tray--over': drag && drag.moved && drag.over === tray.id },
          ]"
          :data-tray="tray.id"
        >
          <p class="tray__label">{{ tray.label }}</p>
          <div class="tray__items">
            <button
              v-for="item in itemsIn(tray.id)"
              :key="item.id"
              type="button"
              class="item"
              :class="[
                `item--${item.kind}`,
                {
                  'item--dragging': drag && drag.moved && drag.id === item.id,
                },
              ]"
              :data-item="item.id"
              :data-kind="item.kind"
              :aria-label="
                item.kind === 'box' ? '一盒 10 個甜甜圈' : '一個甜甜圈'
              "
              @pointerdown="startDrag($event, item)"
              @pointermove="onDrag"
              @pointerup="endDrag"
              @pointercancel="cancelDrag"
              @click="onItemClick(item)"
            >
              <DonutBox v-if="item.kind === 'box'" />
              <DonutIcon v-else />
            </button>
          </div>
          <p v-if="!itemsIn(tray.id).length" class="tray__empty">
            {{ tray.empty }}
          </p>
        </section>
      </div>

      <p v-if="feedback" class="feedback" :class="{ 'feedback--ok': answered }">
        {{ feedback }}
      </p>

      <FieldPad
        :field="padOpen && !answered ? padEl : null"
        @press="press"
        @close="padOpen = false"
      />
    </div>

    <!-- 拖曳中跟著手指／滑鼠移動 -->
    <div
      v-if="drag && drag.moved"
      class="item drag-ghost"
      :class="`item--${drag.kind}`"
      :style="{ left: `${drag.x}px`, top: `${drag.y}px` }"
    >
      <DonutBox v-if="drag.kind === 'box'" />
      <DonutIcon v-else />
    </div>
  </div>
</template>

<script>
import { h } from "vue";
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import FieldPad from "../Grade4/games/Common/FieldPad.vue";

const TRAYS = [
  { id: "pile", label: "甜甜圈", empty: "全部都移到計數區了" },
  { id: "count", label: "計數區", empty: "把甜甜圈拖過來（或點一下）一起數" },
];
// 移動超過這個距離（px）才算拖曳，否則視為點一下
const DRAG_THRESHOLD = 8;
const MAX_LENGTH = 3;
const ICING = ["#f06292", "#8d6e63", "#ffb74d", "#ba68c8", "#4fc3f7"];

// 一個甜甜圈（SVG，可縮放）
function donut(cx, cy, r, icing) {
  return [
    h("circle", {
      cx,
      cy,
      r,
      fill: "#f5c27a",
      stroke: "#c98b3c",
      "stroke-width": r * 0.12,
    }),
    h("circle", { cx, cy, r: r * 0.78, fill: icing }),
    h("circle", {
      cx: cx - r * 0.35,
      cy: cy - r * 0.38,
      r: r * 0.1,
      fill: "#fff",
    }),
    h("circle", {
      cx: cx + r * 0.42,
      cy: cy - r * 0.1,
      r: r * 0.1,
      fill: "#fff59d",
    }),
    h("circle", {
      cx: cx - r * 0.1,
      cy: cy + r * 0.45,
      r: r * 0.1,
      fill: "#81d4fa",
    }),
    h("circle", {
      cx,
      cy,
      r: r * 0.3,
      fill: "#fff8e1",
      stroke: "#c98b3c",
      "stroke-width": r * 0.08,
    }),
  ];
}

const DonutIcon = {
  name: "DonutIcon",
  render: () =>
    h(
      "svg",
      { viewBox: "0 0 40 40", class: "item__svg", "aria-hidden": "true" },
      donut(20, 20, 17, ICING[0])
    ),
};

// 一盒 10 個：兩排各 5 個
const DonutBox = {
  name: "DonutBox",
  render: () => {
    const kids = [
      h("rect", {
        x: 2,
        y: 2,
        width: 196,
        height: 84,
        rx: 12,
        fill: "#fff3e0",
        stroke: "#ef6c00",
        "stroke-width": 4,
      }),
    ];
    for (let r = 0; r < 2; r += 1)
      for (let c = 0; c < 5; c += 1)
        kids.push(...donut(24 + c * 38, 25 + r * 38, 16, ICING[c]));
    return h(
      "svg",
      { viewBox: "0 0 200 88", class: "item__svg", "aria-hidden": "true" },
      kids
    );
  },
};

// 數到 200：一盒 10 個甜甜圈，看幾盒加幾個零散的，填出共有幾個
// 題目 { code, total, boxes: 幾盒, loose: 零散幾個 }；盒子與甜甜圈只是輔助（可拖到計數區），只判定數字
export default {
  name: "MA2011",
  components: { FieldPad, DonutBox, DonutIcon },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    const items = [];
    for (let i = 0; i < this.gameData.boxes; i += 1)
      items.push({ id: `b${i}`, kind: "box", tray: "pile" });
    for (let i = 0; i < this.gameData.loose; i += 1)
      items.push({ id: `d${i}`, kind: "donut", tray: "pile" });
    return {
      TRAYS,
      items,
      value: "",
      padOpen: false,
      padEl: null,
      wrong: false,
      answered: false,
      feedback: "",
      drag: null,
      suppressClick: false,
    };
  },
  computed: {
    // 盒子越多畫得越小，最多 19 盒＋9 個也放得下
    size() {
      const n = this.gameData.boxes;
      if (n <= 6) return "l";
      if (n <= 10) return "m";
      return "s";
    },
    gameIntroText() {
      return this.introText?.Content || "一盒有 10 個，數數看共有幾個甜甜圈。";
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    itemsIn(tray) {
      // 盒子排前面、零散的排後面，同一區裡的順序固定
      return this.items.filter((it) => it.tray === tray);
    },
    moveTo(item, tray) {
      item.tray = tray;
    },
    onItemClick(item) {
      // 拖曳結束時瀏覽器仍會送出 click，略過這一次
      if (this.suppressClick) {
        this.suppressClick = false;
        return;
      }
      this.moveTo(item, item.tray === "pile" ? "count" : "pile");
    },
    startDrag(event, item) {
      if (event.button !== undefined && event.button !== 0) return;
      this.suppressClick = false;
      this.drag = {
        id: item.id,
        kind: item.kind,
        startX: event.clientX,
        startY: event.clientY,
        x: event.clientX,
        y: event.clientY,
        moved: false,
        over: null,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    trayAt(event) {
      const el = document.elementFromPoint(event.clientX, event.clientY);
      return el?.closest("[data-tray]")?.dataset.tray || null;
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
      )
        this.drag.moved = true;
      if (this.drag.moved) this.drag.over = this.trayAt(event);
    },
    endDrag(event) {
      if (!this.drag) return;
      if (this.drag.moved) {
        this.suppressClick = true;
        const tray = this.trayAt(event);
        const item = this.items.find((it) => it.id === this.drag.id);
        if (tray && item) this.moveTo(item, tray);
      }
      this.drag = null;
    },
    cancelDrag() {
      this.drag = null;
    },
    openPad(event) {
      if (this.answered) return;
      this.padEl = event.currentTarget;
      this.padOpen = true;
    },
    press(key) {
      if (this.answered) return;
      this.wrong = false;
      this.feedback = "";
      if (key === "clear") this.value = "";
      else if (key === "←") this.value = this.value.slice(0, -1);
      else if (/^\d$/.test(key) && this.value.length < MAX_LENGTH)
        this.value = this.value === "0" ? key : this.value + key;
    },
    checkAnswer() {
      if (this.answered) return;
      const { code, total } = this.gameData;
      if (this.value === "") {
        this.wrong = true;
        this.feedback = "先在（　）裡填上數字喔！";
        return;
      }
      const isCorrect = Number(this.value) === total;
      this.$emit("add-record", [
        `${code} 一盒甜甜圈有 10 個，共有（${total}）個甜甜圈`,
        `${this.value} 個`,
        isCorrect ? "正確" : "錯誤",
      ]);
      this.padOpen = false;
      if (isCorrect) {
        this.answered = true;
        this.wrong = false;
        this.feedback = "答對了！";
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
        return;
      }
      // 答錯：保留填的數字與甜甜圈的位置
      this.wrong = true;
      this.feedback =
        "再數一次：一盒一盒 10 個、10 個數，再把零散的 1 個、1 個數。";
      this.$emit("play-effect", "WrongSound");
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
  gap: 0.6rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small $padding--medium;
}

.question {
  margin: 0;
  font-size: 1.7rem;
  font-weight: $font-bold;
  line-height: 2.2;
  text-align: center;
  color: #4e342e;
}

.answer-box {
  display: inline-block;
  min-width: 4.2rem;
  height: 3.2rem;
  margin: 0 0.2rem;
  padding: 0 0.4rem;
  vertical-align: middle;
  font-size: 2rem;
  font-weight: $font-bold;
  line-height: 1;
  color: #0d47a1;
  background-color: #fffde7;
  border: 4px dashed #fb8c00;
  border-radius: 12px;
  cursor: pointer;

  &--active {
    border-style: solid;
    border-color: #1e88e5;
    box-shadow: 0 0 0 4px #90caf9;
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
  }
}

.trays {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.8rem;
}

.tray {
  position: relative;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0.4rem 0.6rem;
  background-color: #ffffff;
  border: 4px solid #ffcc80;
  border-radius: 16px;
  overflow: hidden;

  &--count {
    background-color: #f1f8e9;
    border: 4px dashed #8bc34a;
  }

  &--over {
    border-style: solid;
    border-color: #1e88e5;
    box-shadow: 0 0 0 4px #bbdefb;
  }

  &__label {
    margin: 0 0 0.3rem;
    font-size: 1.25rem;
    font-weight: $font-bold;
    color: #6d4c41;
  }

  &__items {
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: 0.35rem;
  }

  &__empty {
    position: absolute;
    inset: 2.4rem 0.6rem 0.6rem;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    font-size: 1.15rem;
    color: #7cb342;
    text-align: center;
    pointer-events: none;
  }
}

.trays {
  --box-w: 6.4rem;
  --donut-w: 2.6rem;

  &--l {
    --box-w: 9.5rem;
    --donut-w: 3.6rem;
  }

  &--m {
    --box-w: 8.4rem;
    --donut-w: 3.2rem;
  }
}

.item {
  padding: 0;
  background: none;
  border: none;
  cursor: grab;
  touch-action: none;
  user-select: none;

  &--box {
    width: var(--box-w);
    height: calc(var(--box-w) * 0.44);
  }

  &--donut {
    width: var(--donut-w);
    height: var(--donut-w);
  }

  &--dragging {
    opacity: 0.3;
  }

  :deep(.item__svg) {
    width: 100%;
    height: 100%;
    display: block;
    pointer-events: none;
  }
}

.drag-ghost {
  position: fixed;
  z-index: 1000;
  transform: translate(-50%, -50%) scale(1.1);
  pointer-events: none;
}

.feedback {
  margin: 0;
  padding: 0.3rem 1rem;
  text-align: center;
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

@media (max-width: 1100px) {
  .question {
    font-size: 1.45rem;
  }

  .trays {
    --box-w: 4.4rem;
    --donut-w: 2rem;

    &--l {
      --box-w: 7.2rem;
      --donut-w: 2.8rem;
    }

    &--m {
      --box-w: 5.8rem;
      --donut-w: 2.4rem;
    }
  }
}
</style>

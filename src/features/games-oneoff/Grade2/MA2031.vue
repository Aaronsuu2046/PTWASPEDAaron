<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <p class="question">{{ gameData.question }}</p>

      <!-- 情境圖：被量的東西長 L，每種單位長 L ÷ 數量，縮放後排的個數不變 -->
      <div class="scene-wrap" data-scene>
        <svg
          class="scene"
          :viewBox="`0 0 1000 ${sceneHeight}`"
          role="img"
          :aria-label="sceneLabel"
        >
          <!-- 被量的東西 -->
          <g v-if="gameData.scene === 'road'">
            <rect
              :x="X0"
              y="20"
              :width="LEN"
              height="70"
              rx="8"
              fill="#607d8b"
            />
            <line
              :x1="X0 + 10"
              y1="55"
              :x2="X0 + LEN - 10"
              y2="55"
              stroke="#ffee58"
              stroke-width="6"
              stroke-dasharray="30 20"
            />
          </g>
          <g v-else-if="gameData.scene === 'river'">
            <rect x="0" y="20" :width="X0" height="70" fill="#8bc34a" />
            <rect
              :x="X0 + LEN"
              y="20"
              :width="1000 - X0 - LEN"
              height="70"
              fill="#8bc34a"
            />
            <rect :x="X0" y="20" :width="LEN" height="70" fill="#4fc3f7" />
            <path
              :d="`M${X0 + 20} 45 q30 -12 60 0 t60 0 M${X0 + 400} 65 q30 -12 60 0 t60 0`"
              stroke="#e1f5fe"
              stroke-width="5"
              fill="none"
            />
          </g>
          <g v-else-if="gameData.scene === 'ribbon'">
            <rect
              :x="X0"
              y="35"
              :width="LEN"
              height="40"
              rx="6"
              fill="#ef5350"
            />
            <path :d="`M${X0} 35 l-30 20 l30 20 Z`" fill="#c62828" />
          </g>
          <g v-else-if="gameData.scene === 'desk'">
            <rect
              :x="X0"
              y="30"
              :width="LEN"
              height="34"
              rx="6"
              fill="#a1887f"
            />
            <rect :x="X0 + 20" y="64" width="24" height="26" fill="#8d6e63" />
            <rect
              :x="X0 + LEN - 44"
              y="64"
              width="24"
              height="26"
              fill="#8d6e63"
            />
          </g>
          <g v-else>
            <rect
              :x="X0 - 22"
              y="14"
              :width="LEN + 44"
              height="84"
              rx="6"
              fill="#8d6e63"
            />
            <rect :x="X0" y="26" :width="LEN" height="60" fill="#fff3e0" />
          </g>
          <!-- 兩端的輔助線 -->
          <line
            v-for="x in [X0, X0 + LEN]"
            :key="`edge${x}`"
            :x1="x"
            y1="10"
            :x2="x"
            :y2="sceneHeight - 6"
            stroke="#e65100"
            stroke-width="3"
            stroke-dasharray="8 6"
          />

          <!-- 每一列量的單位 -->
          <g v-for="(row, r) in gameData.rows" :key="row.name" :data-row="r">
            <text
              x="8"
              :y="rowY(r) + 30"
              class="scene__label"
              :fill="row.color"
            >
              {{ row.name }}
            </text>
            <g
              v-for="i in shownCount(r)"
              :key="`${r}-${i}`"
              :data-unit="r"
              :transform="`translate(${X0 + (i - 1) * unitLen(r)}, ${rowY(r)})`"
            >
              <UnitShape
                :shape="row.shape"
                :w="unitLen(r)"
                :color="row.color"
              />
            </g>
          </g>
        </svg>
      </div>

      <!-- 可以拖的單位：點一下或拖到圖上就接著排一個（只是輔助，不計分） -->
      <div v-if="draggableRows.length" class="palette">
        <button
          v-for="r in draggableRows"
          :key="r"
          type="button"
          class="palette__btn"
          :style="{ '--c': gameData.rows[r].color }"
          :data-add="r"
          :disabled="placed[r] >= maxOf(r) || answered"
          @pointerdown="startDrag($event, r)"
          @pointermove="onDrag"
          @pointerup="endDrag"
          @pointercancel="drag = null"
          @click="onAddClick(r)"
        >
          ＋ 放一個{{ gameData.rows[r].name }}
        </button>
        <button
          type="button"
          class="palette__clear"
          data-clear
          :disabled="!anyPlaced || answered"
          @click="clearUnits"
        >
          全部拿走
        </button>
      </div>

      <!-- 作答：數字填空或選擇 -->
      <div class="answer" data-pad-avoid>
        <template v-if="gameData.kind === 'input'">
          <p
            v-for="(row, r) in gameData.rows"
            :key="row.name"
            class="answer__line"
          >
            <span v-if="gameData.rows.length > 1">用{{ row.name }}量：</span
            >（<button
              type="button"
              class="answer__box"
              :class="{
                'answer__box--active': active === r && !answered,
                'answer__box--wrong': wrongInputs.includes(r),
                'answer__box--correct': answered,
              }"
              :data-input="r"
              data-pad-field
              :aria-label="`幾${row.unit}${row.name}`"
              @click="activate($event, r)"
            >
              {{ values[r] ?? "" }}</button
            >）{{ row.unit }}{{ row.name }}
          </p>
        </template>
        <div v-else class="option-group">
          <button
            v-for="opt in gameData.options"
            :key="opt"
            type="button"
            :class="{
              'button--onclick': choice === opt,
              'option--wrong': wrongChoice && choice === opt,
              'option--correct': answered && choice === opt,
            }"
            :data-option="opt"
            @click="pick(opt)"
          >
            {{ opt }}
          </button>
        </div>
      </div>

      <p v-if="feedback" class="feedback" :class="{ 'feedback--ok': answered }">
        {{ feedback }}
      </p>

      <FieldPad
        :field="active !== null && !answered ? activeEl : null"
        @press="press"
        @close="active = null"
      />
    </div>

    <div
      v-if="drag && drag.moved"
      class="palette__btn drag-ghost"
      :style="{
        left: `${drag.x}px`,
        top: `${drag.y}px`,
        '--c': gameData.rows[drag.row].color,
      }"
    >
      {{ gameData.rows[drag.row].name }}
    </div>
  </div>
</template>

<script>
import { h } from "vue";
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import FieldPad from "../Grade4/games/Common/FieldPad.vue";

// 被量的東西在圖上的起點與長度（viewBox 單位）
const X0 = 130;
const LEN = 820;
const ROW_H = 62;
const DRAG_THRESHOLD = 8;
const H_ = 46;

// 測量用的單位圖形（寬 w、高 46）
const UnitShape = {
  name: "UnitShape",
  props: { shape: String, w: Number, color: String },
  render() {
    const { shape, w, color } = this;
    const g = (...kids) => h("g", kids);
    const box = (attrs) =>
      h("rect", {
        x: 1,
        y: 4,
        width: w - 2,
        height: H_ - 8,
        rx: 6,
        fill: color,
        stroke: "#37474f",
        "stroke-width": 2,
        ...attrs,
      });
    switch (shape) {
      case "stick":
        return box({ y: 16, height: 14, rx: 7 });
      case "stone":
        return h("ellipse", {
          cx: w / 2,
          cy: H_ / 2,
          rx: w / 2 - 2,
          ry: 16,
          fill: color,
          stroke: "#455a64",
          "stroke-width": 2,
        });
      case "leaf":
        return g(
          h("ellipse", {
            cx: w / 2,
            cy: H_ / 2,
            rx: w / 2 - 2,
            ry: 15,
            fill: color,
            stroke: "#2e7d32",
            "stroke-width": 2,
          }),
          h("line", {
            x1: 6,
            y1: H_ / 2,
            x2: w - 6,
            y2: H_ / 2,
            stroke: "#2e7d32",
            "stroke-width": 2,
          })
        );
      case "log":
        return g(
          box({ y: 10, height: 26, rx: 10 }),
          h("ellipse", {
            cx: w - 8,
            cy: 23,
            rx: 6,
            ry: 12,
            fill: "#d7ccc8",
            stroke: "#5d4037",
            "stroke-width": 2,
          })
        );
      case "choco":
        return g(
          box({ rx: 4 }),
          ...[1, 2, 3].map((k) =>
            h("line", {
              x1: (w * k) / 4,
              y1: 6,
              x2: (w * k) / 4,
              y2: H_ - 6,
              stroke: "rgba(0,0,0,0.25)",
              "stroke-width": 2,
            })
          )
        );
      case "tape":
        return box({ y: 12, height: 22, rx: 3, opacity: 0.85 });
      case "pencil":
        return g(
          h("rect", {
            x: 1,
            y: 14,
            width: w - 22,
            height: 18,
            fill: color,
            stroke: "#5d4037",
            "stroke-width": 2,
          }),
          h("polygon", {
            points: `${w - 21},14 ${w - 2},23 ${w - 21},32`,
            fill: "#ffe0b2",
            stroke: "#5d4037",
            "stroke-width": 2,
          })
        );
      case "pen":
        return g(
          h("rect", {
            x: 1,
            y: 15,
            width: w - 2,
            height: 16,
            rx: 8,
            fill: "#42a5f5",
            stroke: "#1565c0",
            "stroke-width": 2,
          }),
          h("rect", {
            x: 1,
            y: 15,
            width: w * 0.3,
            height: 16,
            rx: 8,
            fill: "#1565c0",
          })
        );
      case "cube":
        return g(
          box({ rx: 4 }),
          h("line", {
            x1: w / 2,
            y1: 4,
            x2: w / 2,
            y2: H_ - 4,
            stroke: "#fff",
            "stroke-width": 2,
          }),
          h("line", {
            x1: 1,
            y1: H_ / 2,
            x2: w - 1,
            y2: H_ / 2,
            stroke: "#fff",
            "stroke-width": 2,
          })
        );
      case "ruler":
        return g(
          box({ fill: "#fff59d", y: 10, height: 26, rx: 3 }),
          ...Array.from({ length: 9 }, (_, k) =>
            h("line", {
              x1: (w * (k + 1)) / 10,
              y1: 10,
              x2: (w * (k + 1)) / 10,
              y2: k % 2 ? 18 : 24,
              stroke: "#5d4037",
              "stroke-width": 2,
            })
          )
        );
      default:
        return box();
    }
  },
};

// 個別單位測量－長度大偵探
// 題目 { code, kind: "input"|"choice", scene, question, rows: [{ name, unit, count, color, shape, draggable?, max? }],
//        answers（input：每列的數量）或 options／answer（choice） }
// 每一列單位長＝被量的長度 ÷ count；draggable 的列由學生點一下或拖曳加上去（只是輔助、不計分），其他列直接畫出來
export default {
  name: "MA2031",
  components: { FieldPad, UnitShape },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      X0,
      LEN,
      placed: this.gameData.rows.map(() => 0),
      drag: null,
      suppressClick: false,
      values: {},
      active: null,
      activeEl: null,
      wrongInputs: [],
      choice: null,
      wrongChoice: false,
      answered: false,
      feedback: "",
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "用不同的東西量量看，當個長度大偵探！";
    },
    sceneHeight() {
      return 110 + this.gameData.rows.length * ROW_H;
    },
    sceneLabel() {
      return `${this.gameData.question}（圖中的東西只是輔助）`;
    },
    draggableRows() {
      return this.gameData.rows
        .map((row, r) => (row.draggable ? r : null))
        .filter((r) => r !== null);
    },
    anyPlaced() {
      return this.placed.some((n) => n > 0);
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    rowY(r) {
      return 108 + r * ROW_H;
    },
    unitLen(r) {
      return LEN / this.gameData.rows[r].count;
    },
    shownCount(r) {
      const row = this.gameData.rows[r];
      return row.draggable ? this.placed[r] : row.count;
    },
    // 可以拖的單位最多放幾個：比答案多兩個（最多到題目給的上限）
    maxOf(r) {
      const row = this.gameData.rows[r];
      return row.max ?? Math.ceil(row.count) + 2;
    },
    addUnit(r) {
      if (this.answered || this.placed[r] >= this.maxOf(r)) return;
      this.placed = this.placed.map((n, i) => (i === r ? n + 1 : n));
    },
    onAddClick(r) {
      if (this.suppressClick) {
        this.suppressClick = false;
        return;
      }
      this.addUnit(r);
    },
    clearUnits() {
      this.placed = this.placed.map(() => 0);
    },
    startDrag(event, r) {
      if (this.answered) return;
      if (event.button !== undefined && event.button !== 0) return;
      this.suppressClick = false;
      this.drag = {
        row: r,
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
        Math.hypot(
          event.clientX - this.drag.startX,
          event.clientY - this.drag.startY
        ) > DRAG_THRESHOLD
      )
        this.drag.moved = true;
    },
    endDrag(event) {
      if (!this.drag) return;
      if (this.drag.moved) {
        this.suppressClick = true;
        const el = document.elementFromPoint(event.clientX, event.clientY);
        if (el?.closest("[data-scene]")) this.addUnit(this.drag.row);
      }
      this.drag = null;
    },
    activate(event, r) {
      if (this.answered) return;
      this.active = r;
      this.activeEl = event.currentTarget;
    },
    press(key) {
      if (this.answered || this.active === null) return;
      const r = this.active;
      const cur = this.values[r] || "";
      let next = cur;
      if (key === "clear") next = "";
      else if (key === "←") next = cur.slice(0, -1);
      else if (/^\d$/.test(key) && cur.length < 2)
        next = cur === "0" ? key : cur + key;
      this.values = { ...this.values, [r]: next };
      this.wrongInputs = this.wrongInputs.filter((i) => i !== r);
      this.feedback = "";
    },
    pick(opt) {
      if (this.answered) return;
      this.choice = opt;
      this.wrongChoice = false;
      this.feedback = "";
    },
    finish(isCorrect, expected, given, hint) {
      this.$emit("add-record", [
        `${this.gameData.code} ${this.gameData.question} ${expected}`,
        given,
        isCorrect ? "正確" : "錯誤",
      ]);
      this.active = null;
      if (isCorrect) {
        this.answered = true;
        this.feedback = "答對了！";
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
        return;
      }
      this.feedback = hint;
      this.$emit("play-effect", "WrongSound");
    },
    checkAnswer() {
      if (this.answered) return;
      const q = this.gameData;
      if (q.kind === "input") {
        const empty = q.rows.map((_, r) => r).filter((r) => !this.values[r]);
        if (empty.length) {
          this.wrongInputs = empty;
          this.feedback = "（　）裡還沒填喔！";
          return;
        }
        this.wrongInputs = q.rows
          .map((_, r) => r)
          .filter((r) => Number(this.values[r]) !== q.answers[r]);
        const text = (pick) =>
          q.rows
            .map((row, r) => `${pick(r)} ${row.unit}${row.name}`)
            .join("、");
        this.finish(
          this.wrongInputs.length === 0,
          text((r) => q.answers[r]),
          text((r) => this.values[r]),
          "紅色的格子不對喔！把東西一個接一個排好，從頭數到尾。"
        );
        return;
      }
      if (!this.choice) {
        this.feedback = "先選一個答案喔！";
        return;
      }
      const isCorrect = this.choice === q.answer;
      this.wrongChoice = !isCorrect;
      this.finish(
        isCorrect,
        q.answer,
        this.choice,
        "再想一想：用來量的東西越短，需要的數量就越多；越長，數量就越少。"
      );
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
  padding: $padding--small $padding--medium;
}

.question {
  margin: 0;
  text-align: center;
  font-size: 1.5rem;
  font-weight: $font-bold;
  color: #4e342e;
}

.scene-wrap {
  flex: 1;
  min-height: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.4rem;
  background-color: #ffffff;
  border-radius: 18px;
}

.scene {
  width: 100%;
  height: 100%;

  &__label {
    font-size: 22px;
    font-weight: bold;
  }
}

.palette {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.6rem;

  &__btn {
    padding: 0.35rem 1rem;
    font-size: 1.15rem;
    font-weight: $font-bold;
    color: #ffffff;
    background-color: var(--c);
    border: 3px solid rgba(0, 0, 0, 0.2);
    border-radius: 14px;
    cursor: grab;
    touch-action: none;
    user-select: none;

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
  }

  &__clear {
    padding: 0.35rem 1rem;
    font-size: 1.1rem;
    font-weight: $font-bold;
    color: #ffffff;
    background-color: #fb8c00;
    border: none;
    border-radius: 14px;
    cursor: pointer;

    &:disabled {
      background-color: #bdbdbd;
      cursor: not-allowed;
    }
  }
}

.drag-ghost {
  position: fixed;
  z-index: 1000;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.answer {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.4rem 2rem;

  &__line {
    margin: 0;
    font-size: 1.6rem;
    font-weight: $font-bold;
    line-height: 2.2;
    color: #4e342e;
  }

  &__box {
    display: inline-block;
    min-width: 3.6rem;
    height: 3rem;
    vertical-align: middle;
    font-size: 1.9rem;
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
}

.option-group {
  display: flex;
  gap: 1.6rem;

  button {
    @extend .button-basic;
    border: none;
    min-width: 8rem;
    padding: 0.45rem 1.4rem;
    font-size: 1.6rem;
    font-weight: $font-bold;
    background-color: $primary-btn-bg;
  }
}

.button--onclick {
  background-color: $primary-btn-hover-bg !important;
  scale: 1.05;
}

.option--wrong {
  outline: 5px solid #e53935;
}

.option--correct {
  outline: 5px solid #43a047;
}

.feedback {
  margin: 0;
  padding: 0.2rem 1rem;
  font-size: 1.2rem;
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
    font-size: 1.25rem;
  }

  .answer__line {
    font-size: 1.35rem;
  }

  .option-group button {
    font-size: 1.35rem;
  }
}
</style>

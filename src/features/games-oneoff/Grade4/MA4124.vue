<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <!-- 四關共用同一張四邊形 ABCD，題目問到的邊或角用橘色標示 -->
      <div class="figure">
        <svg
          viewBox="0 0 340 250"
          class="figure__svg"
          role="img"
          aria-label="四邊形 ABCD"
        >
          <polygon :points="polygonPoints" class="figure__shape" />
          <line
            v-if="highlightSide"
            :x1="POINTS[highlightSide[0]][0]"
            :y1="POINTS[highlightSide[0]][1]"
            :x2="POINTS[highlightSide[1]][0]"
            :y2="POINTS[highlightSide[1]][1]"
            class="figure__highlight"
          />
          <path v-if="angleArc" :d="angleArc" class="figure__angle" />
          <text
            v-for="(pos, name) in LABELS"
            :key="name"
            :x="pos[0]"
            :y="pos[1]"
            class="figure__label"
          >
            {{ name }}
          </text>
        </svg>
      </div>

      <div class="work">
        <!-- 題目與空格：點空格後點選項，或把選項拖到空格 -->
        <p class="question">
          <template v-for="(part, i) in gameData.parts" :key="`p-${i}`">
            <span v-if="part !== null">{{ part }}</span>
            <button
              v-else
              type="button"
              class="blank"
              :class="{
                'blank--active': !answered && active === blankIndex(i),
                'blank--wrong': wrongBlanks.includes(blankIndex(i)),
                'blank--correct': answered,
                'blank--hover': hoverBlank === blankIndex(i),
              }"
              :data-blank="blankIndex(i)"
              @click="onBlankClick(blankIndex(i))"
            >
              {{ values[blankIndex(i)] || "\u3000" }}
            </button>
          </template>
        </p>

        <div class="options">
          <button
            v-for="option in gameData.options"
            :key="option"
            type="button"
            class="option"
            :disabled="answered"
            @pointerdown="startDrag($event, option)"
            @pointermove="onDrag"
            @pointerup="endDrag"
            @pointercancel="cancelDrag"
            @click="onOptionClick(option)"
          >
            {{ option }}
          </button>
        </div>
        <p class="hint-line">
          點空格再點答案，也可以把答案拖到空格；點已填的空格可清除
        </p>
        <p v-if="feedback" class="feedback">{{ feedback }}</p>

        <button type="button" class="hint-toggle" @click="showHint = !showHint">
          {{ showHint ? "收起提示" : "看提示" }}
        </button>
        <ul v-if="showHint" class="hints">
          <li v-for="hint in HINTS" :key="hint">{{ hint }}</li>
        </ul>
      </div>
    </div>

    <div
      v-if="drag && drag.moved"
      class="drag-ghost option"
      :style="{ left: `${drag.x}px`, top: `${drag.y}px` }"
    >
      {{ drag.option }}
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";

const DRAG_THRESHOLD = 8;
// A 左上、B 左下、C 右下、D 右上
const POINTS = { A: [80, 45], B: [40, 205], C: [300, 215], D: [265, 35] };

// 認識四邊形的構成要素：鄰邊、對邊、對角、對角線
// parts：題目文字，null 為空格；answers 依空格順序；anyOrder 時答案順序可互換
export default {
  name: "MA4124",
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      POINTS,
      LABELS: { A: [66, 36], B: [24, 222], C: [316, 232], D: [280, 28] },
      HINTS: [
        "相對的兩條邊，稱為對邊。",
        "共用頂點的兩條邊，稱為鄰邊。",
        "相對的兩個角，稱為對角。",
        "相對頂點的連線，稱為對角線。",
      ],
      values: this.gameData.answers.map(() => ""),
      active: 0,
      wrongBlanks: [],
      feedback: "",
      showHint: false,
      answered: false,
      drag: null,
      hoverBlank: null,
      suppressClick: false,
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "看圖回答問題";
    },
    polygonPoints() {
      return ["A", "B", "C", "D"].map((k) => POINTS[k].join(",")).join(" ");
    },
    highlightSide() {
      return this.gameData.highlight?.side || null;
    },
    // 在指定頂點畫一段角弧
    angleArc() {
      const v = this.gameData.highlight?.angle;
      if (!v) return "";
      const order = ["A", "B", "C", "D"];
      const i = order.indexOf(v);
      const prev = POINTS[order[(i + 3) % 4]];
      const next = POINTS[order[(i + 1) % 4]];
      const [x, y] = POINTS[v];
      const r = 26;
      const unit = ([px, py]) => {
        const len = Math.hypot(px - x, py - y);
        return [x + ((px - x) / len) * r, y + ((py - y) / len) * r];
      };
      const [x1, y1] = unit(prev);
      const [x2, y2] = unit(next);
      // 依兩邊方向決定弧線方向，永遠畫內角那一側
      const sweep = (x1 - x) * (y2 - y) - (y1 - y) * (x2 - x) > 0 ? 1 : 0;
      return `M ${x} ${y} L ${x1} ${y1} A ${r} ${r} 0 0 ${sweep} ${x2} ${y2} Z`;
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    // parts 中第 i 項是第幾個空格
    blankIndex(i) {
      return this.gameData.parts.slice(0, i).filter((p) => p === null).length;
    },
    onBlankClick(b) {
      if (this.answered) return;
      if (this.values[b]) this.setValue(b, "");
      this.active = b;
    },
    setValue(b, value) {
      const next = [...this.values];
      next[b] = value;
      this.values = next;
      this.wrongBlanks = this.wrongBlanks.filter((w) => w !== b);
      this.feedback = "";
    },
    fill(b, option) {
      this.setValue(b, option);
      // 自動跳到下一個還沒填的空格
      const empty = this.values.findIndex((v) => !v);
      this.active = empty === -1 ? b : empty;
    },
    onOptionClick(option) {
      if (this.suppressClick) {
        this.suppressClick = false;
        return;
      }
      if (this.answered) return;
      this.fill(this.active, option);
    },
    startDrag(event, option) {
      if (this.answered) return;
      if (event.button !== undefined && event.button !== 0) return;
      this.suppressClick = false;
      this.drag = {
        option,
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
      if (this.drag.moved) this.hoverBlank = this.blankAt(event);
    },
    endDrag(event) {
      if (!this.drag) return;
      if (this.drag.moved) {
        this.suppressClick = true;
        const b = this.blankAt(event);
        if (b !== null) this.fill(b, this.drag.option);
      }
      this.cancelDrag();
    },
    cancelDrag() {
      this.drag = null;
      this.hoverBlank = null;
    },
    blankAt(event) {
      const target = document.elementFromPoint(event.clientX, event.clientY);
      const blank = target?.closest("[data-blank]");
      return blank ? Number(blank.dataset.blank) : null;
    },
    findWrongBlanks() {
      const { answers, anyOrder } = this.gameData;
      if (anyOrder) {
        const remaining = [...answers];
        const wrong = [];
        this.values.forEach((v, b) => {
          const k = remaining.indexOf(v);
          if (k === -1) wrong.push(b);
          else remaining.splice(k, 1);
        });
        return wrong;
      }
      return this.values
        .map((v, b) => (v === answers[b] ? -1 : b))
        .filter((b) => b >= 0);
    },
    checkAnswer() {
      if (this.answered) return;
      this.wrongBlanks = this.findWrongBlanks();
      const isCorrect = this.wrongBlanks.length === 0;
      this.feedback = isCorrect ? "" : "紅色的空格不對，再看看圖！";
      this.$emit("add-record", [
        this.gameData.answers.join("、"),
        this.values.map((v) => v || "空白").join("、"),
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
  gap: 1.5rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small;
}

.figure {
  width: 22rem;
  flex-shrink: 0;
  padding: 0.5rem;
  background-color: #ffffff;
  border: 3px solid #ffcc80;
  border-radius: 16px;

  &__svg {
    display: block;
    width: 100%;
    height: auto;
  }

  &__shape {
    fill: #e3f2fd;
    stroke: #1565c0;
    stroke-width: 4;
    stroke-linejoin: round;
  }

  &__highlight {
    stroke: #ff6d00;
    stroke-width: 8;
    stroke-linecap: round;
  }

  &__angle {
    fill: rgba(255, 109, 0, 0.35);
    stroke: #ff6d00;
    stroke-width: 3;
  }

  &__label {
    font-size: 24px;
    font-weight: bold;
    text-anchor: middle;
    fill: #222222;
  }
}

.work {
  flex: 1;
  max-width: 34rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.question {
  margin: 0;
  padding: 0.8rem 1rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  font-size: 2rem;
  font-weight: $font-bold;
  background-color: #fff8e1;
  border: 3px solid #ffcc80;
  border-radius: 14px;
}

.blank {
  min-width: 5.5rem;
  height: 3.4rem;
  padding: 0 0.6rem;
  font-size: 2rem;
  font-weight: $font-bold;
  color: #1565c0;
  background-color: #ffffff;
  border: 3px dashed #90a4ae;
  border-radius: 10px;
  cursor: pointer;

  &--active {
    border: 4px solid #1e88e5;
    background-color: #e3f2fd;
  }

  &--hover {
    border-color: #43a047;
    background-color: #e8f5e9;
  }

  &--wrong {
    color: #c62828;
    border: 4px solid #e53935;
    background-color: #ffebee;
  }

  &--correct {
    color: #2e7d32;
    border: 3px solid #43a047;
    background-color: #e8f5e9;
  }
}

.options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.option {
  min-width: 4.6rem;
  height: 3.4rem;
  padding: 0 0.8rem;
  font-size: 1.8rem;
  font-weight: $font-bold;
  color: #333333;
  background-color: #ffffff;
  border: 3px solid #ffcc80;
  border-radius: 12px;
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.15);
  cursor: grab;
  touch-action: none;
  user-select: none;

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
}

.hint-line {
  margin: 0;
  font-size: 1.05rem;
  color: #6d4c41;
}

.feedback {
  margin: 0;
  font-size: 1.3rem;
  font-weight: $font-bold;
  color: #c62828;
}

.hint-toggle {
  align-self: flex-start;
  height: 2.8rem;
  padding: 0 1.2rem;
  font-size: 1.2rem;
  font-weight: $font-bold;
  color: #ffffff;
  background-color: #29b6f6;
  border: none;
  border-radius: 12px;
  cursor: pointer;
}

.hints {
  margin: 0;
  padding: 0.6rem 1rem 0.6rem 2rem;
  font-size: 1.2rem;
  line-height: 1.6;
  background-color: #ffffff;
  border: 3px solid #b3e5fc;
  border-radius: 12px;
}

.drag-ghost {
  position: fixed;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translate(-50%, -50%);
  pointer-events: none;
  opacity: 0.9;
}

@media (max-width: 1100px) {
  .figure {
    width: 17rem;
  }

  .question {
    font-size: 1.7rem;
  }
}
</style>

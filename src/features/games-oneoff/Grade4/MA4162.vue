<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <p class="question-text">
        <FractionText :text="gameData.question" />
      </p>

      <div class="visual-area">
        <!-- 關卡 1、2：依分母提供已平分的空白圖形，可點擊塗色（僅輔助） -->
        <template v-if="isCompare">
          <p class="visual-hint">點一點圖形，塗塗看</p>
          <div class="compare-list">
            <div
              v-for="(item, index) in gameData.shapes"
              :key="index"
              class="compare-item"
            >
              <FractionText
                class="compare-item__label"
                :text="`\\frac{${item.numerator}}{${item.denominator}}`"
              />
              <div
                class="compare-item__shape"
                :class="`compare-item__shape--${item.shape}`"
              >
                <PartitionedShape
                  :shape="item.shape"
                  :denominator="item.denominator"
                  paintable
                />
              </div>
            </div>
          </div>
        </template>

        <!-- 關卡 3：已填色的色紙參考圖 -->
        <div v-else-if="gameData.visual === 'paper'" class="paper-shape">
          <PartitionedShape
            :shape="gameData.shape"
            :denominator="gameData.denominator"
            :filled="gameData.filled"
            :base-denominator="gameData.baseDenominator"
          />
        </div>

        <!-- 關卡 4：一包糖果與平分後的糖果 -->
        <div v-else-if="gameData.visual === 'candy'" class="row-list">
          <div class="visual-row">
            <span class="visual-row__caption"
              >1 包（{{ candy.total }} 顆）</span
            >
            <div class="visual-row__figure">
              <CandyGroups :total="candy.total" :colored="candy.colored" />
            </div>
          </div>
          <div class="visual-row">
            <span class="visual-row__caption"
              >平分成 {{ candy.groups }} 份</span
            >
            <div class="visual-row__figure">
              <CandyGroups
                :total="candy.total"
                :colored="candy.colored"
                :groups="candy.groups"
              />
            </div>
          </div>
        </div>

        <!-- 關卡 5：一串珠子與可用畫筆圈選的空白珠串 -->
        <div v-else-if="gameData.visual === 'beads'" class="row-list">
          <div class="visual-row">
            <span class="visual-row__caption">1 串珠子</span>
            <div class="visual-row__figure">
              <BeadString :total="beads.total" :colored="beads.colored" />
            </div>
          </div>
          <div class="visual-row">
            <span class="visual-row__caption">用畫筆圈圈看</span>
            <div class="visual-row__figure drawing-figure">
              <BeadString :total="beads.total" />
              <DrawingBoard
                ref="drawingBoard"
                class="drawing-figure__board"
                :component-config="brush"
              />
            </div>
          </div>
          <div class="drawing-tools">
            <button
              type="button"
              :class="{ 'drawing-tools--active': tool === 'pen' }"
              @click="setTool('pen')"
            >
              畫筆
            </button>
            <button
              type="button"
              :class="{ 'drawing-tools--active': tool === 'eraser' }"
              @click="setTool('eraser')"
            >
              橡皮擦
            </button>
            <button type="button" @click="$refs.drawingBoard.clear()">
              清除
            </button>
          </div>
        </div>
      </div>

      <!-- 作答區：關卡 1、2 選擇；關卡 3～5 只填挖空欄位 -->
      <div v-if="isCompare" class="option-group">
        <button
          v-for="option in options"
          :key="option"
          type="button"
          :class="{
            'button--onclick': selected === option,
            'option--wrong': optionWrong && selected === option,
          }"
          @click="selectOption(option)"
        >
          {{ option }}
        </button>
      </div>
      <div v-else class="equation-area">
        <template v-for="(term, termIndex) in equation" :key="termIndex">
          <div v-if="term.isFraction" class="fraction">
            <div class="fraction__row">
              <template v-for="item in term.numerator" :key="item.key">
                <button
                  v-if="item.isBlank"
                  type="button"
                  class="blank"
                  :class="{
                    'blank--active': activeKey === item.key,
                    'blank--wrong': wrongKeys.includes(item.key),
                  }"
                  @click="openNumPad(item.key, $event)"
                >
                  {{ inputs[item.key] }}
                </button>
                <span v-else class="fraction__text">{{ item.value }}</span>
              </template>
            </div>
            <span class="fraction__line"></span>
            <div class="fraction__row">
              <template v-for="item in term.denominator" :key="item.key">
                <button
                  v-if="item.isBlank"
                  type="button"
                  class="blank"
                  :class="{
                    'blank--active': activeKey === item.key,
                    'blank--wrong': wrongKeys.includes(item.key),
                  }"
                  @click="openNumPad(item.key, $event)"
                >
                  {{ inputs[item.key] }}
                </button>
                <span v-else class="fraction__text">{{ item.value }}</span>
              </template>
            </div>
          </div>
          <span v-else class="equation-text">{{ term.text }}</span>
        </template>
      </div>
    </div>

    <FloatNumPad
      v-if="activeKey"
      :component-config="numPadPosition"
      @button-clicked="onNumPadClick"
    />
  </div>
</template>

<script>
import { defineAsyncComponent } from "vue";
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import PartitionedShape from "@/components/PartitionedShape.vue";
import DrawingBoard from "@/components/DrawingBoard.vue";
import FractionText from "@/components/FractionText.vue";
import CandyGroups from "./games/MA4162/CandyGroups.vue";
import BeadString from "./games/MA4162/BeadString.vue";

const MAX_DIGITS = 2;
const PEN = { color: "#e53935", size: 4 };
const ERASER = { color: "eraser", size: 24 };

export default {
  name: "MA4162",
  components: {
    PartitionedShape,
    DrawingBoard,
    FractionText,
    CandyGroups,
    BeadString,
    FloatNumPad: defineAsyncComponent(
      () => import("@/components/FloatNumPad.vue")
    ),
  },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      options: ["一樣大", "不一樣大"],
      selected: "",
      optionWrong: false,
      inputs: {},
      activeKey: "",
      wrongKeys: [],
      numPadPosition: { top: 0, left: 0 },
      tool: "pen",
      brush: { ...PEN },
      answered: false,
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "塗塗看，再回答問題";
    },
    isCompare() {
      return this.gameData.type === "compare";
    },
    candy() {
      return this.gameData.candy || {};
    },
    beads() {
      return this.gameData.beads || {};
    },
    // 將題庫等式轉成顯示用結構，並替每個挖空欄位加上唯一 key
    equation() {
      if (!this.gameData.equation) return [];
      const toItems = (parts, prefix) =>
        parts.map((part, index) => {
          const key = `${prefix}-${index}`;
          if (part !== null && typeof part === "object") {
            return { key, isBlank: true, answer: part.answer };
          }
          return { key, isBlank: false, value: part };
        });
      return this.gameData.equation.map((term, index) => {
        if (term.numerator) {
          return {
            isFraction: true,
            numerator: toItems(term.numerator, `t${index}-n`),
            denominator: toItems(term.denominator, `t${index}-d`),
          };
        }
        return { isFraction: false, text: term.text };
      });
    },
    blanks() {
      return this.equation
        .filter((term) => term.isFraction)
        .flatMap((term) => [...term.numerator, ...term.denominator])
        .filter((item) => item.isBlank);
    },
  },
  created() {
    this.inputs = Object.fromEntries(this.blanks.map((item) => [item.key, ""]));
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    selectOption(option) {
      this.selected = option;
      this.optionWrong = false;
    },
    setTool(tool) {
      this.tool = tool;
      this.brush = tool === "eraser" ? { ...ERASER } : { ...PEN };
    },
    openNumPad(key, event) {
      const rect = event.currentTarget.getBoundingClientRect();
      this.activeKey = key;
      this.numPadPosition = {
        top: `${rect.top + window.scrollY}px`,
        left: `${rect.right + window.scrollX + 10}px`,
      };
    },
    onNumPadClick(label) {
      const key = this.activeKey;
      if (!key) return;
      if (label === "關閉") {
        this.activeKey = "";
        return;
      }
      this.wrongKeys = this.wrongKeys.filter((k) => k !== key);
      if (label === "清除") {
        this.inputs[key] = "";
        return;
      }
      // 答案皆為正整數，忽略小數點並限制位數
      if (label === "." || this.inputs[key].length >= MAX_DIGITS) return;
      this.inputs[key] += String(label);
    },
    checkAnswer() {
      if (this.answered) return;
      this.activeKey = "";
      let record;
      let isCorrect;
      if (this.isCompare) {
        isCorrect = this.selected === this.gameData.answer;
        this.optionWrong = !isCorrect;
        record = [this.gameData.answer, this.selected || "未作答"];
      } else {
        this.wrongKeys = this.blanks
          .filter((item) => parseInt(this.inputs[item.key], 10) !== item.answer)
          .map((item) => item.key);
        isCorrect = this.wrongKeys.length === 0;
        record = [
          this.blanks.map((item) => item.answer).join("、"),
          this.blanks.map((item) => this.inputs[item.key] || "空白").join("、"),
        ];
      }

      this.$emit("add-record", [...record, isCorrect ? "正確" : "錯誤"]);
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
  flex-direction: column;
  align-items: center;
  gap: $gap--small;
}

.question-text {
  margin: 0;
  font-size: 1.6rem;
  font-weight: $font-bold;
  text-align: center;

  // KaTeX 預設分數偏小，放大讓題目中的分數容易閱讀
  :deep(.katex) {
    font-size: 1.5em;
  }
}

.visual-area {
  flex: 3;
  min-height: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $gap--tiny;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small;
}

.visual-hint {
  margin: 0;
  font-size: 1.1rem;
  color: #555555;
}

.compare-list {
  flex: 1;
  min-height: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3rem;
}

.compare-item {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $gap--tiny;

  &__label {
    font-size: 1.6rem;

    :deep(.katex) {
      font-size: 1.5em;
    }
  }

  &__shape {
    flex: 1;
    min-height: 0;
    max-height: 200px;
    aspect-ratio: 4 / 3;

    &--circle {
      aspect-ratio: 1 / 1;
    }
  }
}

.paper-shape {
  height: 100%;
  max-height: 240px;
  aspect-ratio: 4 / 3;
}

.row-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $gap--small;
}

.visual-row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $gap--small;

  &__caption {
    width: 10rem;
    white-space: nowrap;
    flex-shrink: 0;
    text-align: right;
    font-size: 1.2rem;
    font-weight: $font-bold;
  }

  &__figure {
    width: min(70%, 720px);
  }
}

.drawing-figure {
  position: relative;

  &__board {
    position: absolute;
    inset: 0;
    cursor: crosshair;
    touch-action: none;
  }
}

.drawing-tools {
  display: flex;
  gap: $gap--small;

  button {
    @extend .button-basic;
    border: none;
    padding: 0.3rem 1.2rem;
    font-size: 1.1rem;
    background-color: $primary-btn-bg;
  }

  &--active {
    background-color: $primary-btn-hover-bg !important;
  }
}

.option-group {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;

  button {
    @extend .button-basic;
    border: none;
    min-width: 10rem;
    padding: 0.6rem 1.5rem;
    font-size: 28px;
    background-color: $primary-btn-bg;
  }
}

.button--onclick {
  background-color: $primary-btn-hover-bg !important;
  scale: 1.03;
}

.option--wrong {
  outline: 3px solid #e53935;
}

.equation-area {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  font-size: 2rem;
}

.equation-text {
  font-size: 2.25rem;
  font-weight: $font-bold;
  padding: 0 0.25rem;
}

.fraction {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;

  &__row {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  &__text {
    font-size: 2rem;
    font-weight: $font-bold;
    min-width: 1.5rem;
    text-align: center;
  }

  &__line {
    display: block;
    width: 100%;
    border-top: 0.2rem solid #000000;
  }
}

.blank {
  min-width: 3rem;
  height: 3rem;
  padding: 0 0.4rem;
  font-size: 1.8rem;
  font-weight: $font-bold;
  color: #c62828;
  background-color: #ffffff;
  border: 3px solid #bdbdbd;
  border-radius: 6px;
  cursor: pointer;

  &--active {
    border-color: #1e88e5;
  }

  &--wrong {
    border-color: #e53935;
    background-color: #ffebee;
  }
}
</style>

<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <!-- 圖形區：依分母畫等分虛線；關卡 1、2 可點擊塗色（僅輔助），關卡 3～5 為已填色參考圖 -->
      <div class="shape-area">
        <p v-if="gameData.paintable" class="shape-hint">點一點圖形，塗塗看</p>
        <div class="shape-list" :class="`shape-list--${gameData.shape}`">
          <div
            v-for="n in shapeCount"
            :key="n"
            class="shape-item"
            :class="`shape-item--${gameData.shape}`"
          >
            <PartitionedShape
              :shape="gameData.shape"
              :denominator="gameData.denominator"
              :filled="gameData.filled || 0"
              :base-denominator="gameData.baseDenominator || 0"
              :paintable="!!gameData.paintable"
            />
          </div>
        </div>
      </div>

      <!-- 等式區：只有挖空欄位可填答 -->
      <div class="equation-area">
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

const MAX_DIGITS = 2;

export default {
  name: "MA4161",
  components: {
    PartitionedShape,
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
      inputs: {},
      activeKey: "",
      wrongKeys: [],
      numPadPosition: { top: 0, left: 0 },
      answered: false,
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "塗塗看，再回答問題";
    },
    shapeCount() {
      return this.gameData.shapeCount || 1;
    },
    // 將題庫等式轉成顯示用結構，並替每個挖空欄位加上唯一 key
    equation() {
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
      this.wrongKeys = this.blanks
        .filter((item) => parseInt(this.inputs[item.key], 10) !== item.answer)
        .map((item) => item.key);
      const isCorrect = this.wrongKeys.length === 0;

      this.$emit("add-record", [
        this.blanks.map((item) => item.answer).join("、"),
        this.blanks.map((item) => this.inputs[item.key] || "空白").join("、"),
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
  flex-direction: column;
  align-items: center;
  gap: $gap--small;
}

.shape-area {
  flex: 3;
  min-height: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small;
}

.shape-hint {
  margin: 0 0 $gap--tiny;
  font-size: 1.1rem;
  color: #555555;
}

.shape-list {
  flex: 1;
  min-height: 0;
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: $gap--small;
}

.shape-item {
  height: 100%;
  max-height: 220px;
  aspect-ratio: 1 / 1;

  &--bar {
    width: min(100%, 360px);
    height: auto;
    aspect-ratio: 32 / 9;
  }
}

// 圖形較多（關卡 2）時縮小，讓一列放得下
.shape-list:has(.shape-item:nth-child(3)) .shape-item:not(.shape-item--bar) {
  max-height: 160px;
}

.equation-area {
  flex: 2;
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

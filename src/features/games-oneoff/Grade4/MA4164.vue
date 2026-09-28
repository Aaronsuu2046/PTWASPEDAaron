<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <p class="question-text">
        <FractionText :text="gameData.question" />
      </p>

      <div class="work-area" :class="{ 'work-area--story': gameData.items }">
        <!-- 圖示區：計算題顯示兩個分數的長條圖；應用題顯示一盒糖果／雞蛋 -->
        <div class="visual-area">
          <div v-if="gameData.items" class="box-figure">
            <BoxItems
              :type="gameData.items.type"
              :count="gameData.items.count"
            />
          </div>
          <div v-else class="operand-list">
            <div class="operand-item">
              <FractionWithShape :component-config="gameData.operands[0]" />
            </div>
            <span class="operand-op">{{
              operator === "-" ? "−" : operator
            }}</span>
            <div class="operand-item">
              <FractionWithShape :component-config="gameData.operands[1]" />
            </div>
          </div>
        </div>

        <!-- 作答區：先算、後算（應用題另有「答」），只填紅字挖空欄位 -->
        <div class="answer-area">
          <FractionBlankEquation ref="equation" :rows="gameData.rows" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import FractionText from "@/components/FractionText.vue";
import FractionWithShape from "@/components/FractionWithShape.vue";
import FractionBlankEquation from "@/components/FractionBlankEquation.vue";
import BoxItems from "./games/MA4164/BoxItems.vue";

export default {
  name: "MA4164",
  components: {
    FractionText,
    FractionWithShape,
    FractionBlankEquation,
    BoxItems,
  },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return { answered: false };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "把做法和答案記下來";
    },
    // 後算那一行的運算符號（+ 或 -）
    operator() {
      const post = this.gameData.rows.find((row) => row.label === "後算");
      return post?.equation.find((term) => ["+", "-"].includes(term.text))
        ?.text;
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    checkAnswer() {
      if (this.answered) return;
      const { isCorrect, expected, actual } = this.$refs.equation.check();
      this.$emit("add-record", [expected, actual, isCorrect ? "正確" : "錯誤"]);
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
  font-size: 1.5rem;
  font-weight: $font-bold;
  text-align: center;

  // KaTeX 預設分數偏小，放大讓題目中的分數容易閱讀
  :deep(.katex) {
    font-size: 1.5em;
  }
}

// 計算題：圖示在上、算式在下；應用題：盒子在左、算式在右，節省高度
.work-area {
  flex: 1;
  min-height: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: $gap--small;

  &--story {
    flex-direction: row;
    align-items: center;

    .visual-area {
      width: 34%;
      align-self: stretch;
    }

    .box-figure {
      height: auto;
      width: 100%;

      :deep(.box-items) {
        width: 100%;
        height: auto;
      }
    }
  }
}

.visual-area {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small;
}

.box-figure {
  height: 90px;
  max-width: 100%;
  display: flex;
  justify-content: center;

  // 依糖果／雞蛋數量決定寬度，高度固定
  :deep(.box-items) {
    width: auto;
    height: 100%;
  }
}

.operand-list {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
}

.operand-item {
  width: 240px;
  height: 150px;
}

.operand-op {
  font-size: 2.5rem;
  font-weight: $font-bold;
}

.answer-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>

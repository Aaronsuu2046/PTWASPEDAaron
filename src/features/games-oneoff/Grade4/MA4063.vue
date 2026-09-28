<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <div class="question">
        <div class="question__figure">
          <SideTriangle :figure="gameData.figure" />
        </div>
        <p class="question__text">{{ gameData.question }}</p>
      </div>

      <div class="choices">
        <button
          v-for="choice in CHOICES"
          :key="choice.label"
          type="button"
          class="choice"
          :class="[
            `choice--${choice.kind}`,
            {
              'choice--selected': selected === choice.value,
              'choice--correct': answered && choice.value === gameData.answer,
            },
          ]"
          :data-choice="choice.kind"
          :aria-label="choice.aria"
          @click="choose(choice.value)"
        >
          {{ choice.label }}
        </button>
      </div>

      <p v-if="message" class="message">{{ message }}</p>
      <p v-if="showHint" class="hint">提示：{{ gameData.hint }}</p>
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import SideTriangle from "./games/Geometry/SideTriangle.vue";

const CHOICES = [
  { label: "○", value: true, kind: "o", aria: "對" },
  { label: "×", value: false, kind: "x", aria: "不對" },
];

// 以邊分類三角形：看圖和句子，選 ○ 或 ×；答錯後顯示對應提示
export default {
  name: "MA4063",
  components: { SideTriangle },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      CHOICES,
      selected: null,
      message: "",
      showHint: false,
      answered: false,
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "想一想，再選選看。";
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    choose(value) {
      if (this.answered) return;
      this.selected = value;
      this.message = "";
    },
    checkAnswer() {
      if (this.answered) return;
      if (this.selected === null) {
        this.message = "先選 ○ 或 ×，再送出答案喔！";
        return;
      }
      const isCorrect = this.selected === this.gameData.answer;
      const mark = (v) => (v ? "○" : "×");
      this.$emit("add-record", [
        `${this.gameData.question} ${mark(this.gameData.answer)}`,
        mark(this.selected),
        isCorrect ? "正確" : "錯誤",
      ]);
      if (isCorrect) {
        this.answered = true;
        this.message = "";
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
      } else {
        this.selected = null;
        this.showHint = true;
        this.message = "再想想看！";
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
  justify-content: center;
  gap: 1rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small;
}

.question {
  display: flex;
  align-items: center;
  gap: 2rem;
  padding: 1rem 1.6rem;
  background-color: #ffffff;
  border-radius: 20px;
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.1);

  &__figure {
    width: 13rem;
    height: 11rem;
    flex-shrink: 0;
  }

  &__text {
    margin: 0;
    max-width: 26rem;
    font-size: 2rem;
    font-weight: $font-bold;
    line-height: 1.5;
    color: #333333;
  }
}

.choices {
  display: flex;
  gap: 3rem;
}

.choice {
  width: 8rem;
  height: 8rem;
  font-size: 5rem;
  font-weight: $font-bold;
  line-height: 1;
  background-color: #ffffff;
  border: 5px solid #b0bec5;
  border-radius: 24px;
  box-shadow: 0 5px 0 #90a4ae;
  cursor: pointer;

  &--o {
    color: #1e88e5;
  }

  &--x {
    color: #e53935;
  }

  &--selected {
    border-color: #ffb300;
    background-color: #fff8e1;
    box-shadow: 0 0 0 6px #ffe082;
  }

  &--correct {
    border-color: #43a047;
    background-color: #e8f5e9;
  }
}

.message {
  margin: 0;
  font-size: 1.4rem;
  font-weight: $font-bold;
  color: #c62828;
}

.hint {
  margin: 0;
  max-width: 44rem;
  padding: 0.6rem 1rem;
  font-size: 1.35rem;
  font-weight: $font-bold;
  line-height: 1.5;
  color: #5d4037;
  background-color: #fffde7;
  border: 3px dashed #ffb300;
  border-radius: 14px;
}

@media (max-width: 1100px) {
  .question {
    gap: 1.2rem;

    &__figure {
      width: 10rem;
      height: 8.5rem;
    }

    &__text {
      font-size: 1.7rem;
    }
  }

  .choice {
    width: 6.5rem;
    height: 6.5rem;
    font-size: 4rem;
  }
}
</style>

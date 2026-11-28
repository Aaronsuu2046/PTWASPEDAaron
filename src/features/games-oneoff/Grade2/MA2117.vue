<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <p class="question" data-question>
        選出數字卡，排出<span
          class="question__goal"
          :class="`question__goal--${gameData.goal}`"
          >{{ goalText }}</span
        >的三位數
      </p>
      <p class="hint">
        點數字卡再點黃色格子，也可以直接拖過去；點格子裡的卡片可以拿回來
      </p>

      <PlaceValueCards
        ref="cards"
        :cards="cards"
        :fixed="gameData.fixed || {}"
        :locked="answered"
        @change="onChange"
        @reject="onReject"
      />

      <div class="actions">
        <button
          type="button"
          class="reset"
          data-reset
          :disabled="answered"
          @click="reset"
        >
          重置
        </button>
      </div>

      <p
        v-if="feedback"
        class="feedback"
        :class="{ 'feedback--ok': answered }"
        data-feedback
      >
        {{ feedback }}
      </p>
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import PlaceValueCards from "./components/PlaceValueCards.vue";

function shuffle(list) {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const HINTS = {
  max: "想一想：最大的數字放百位，再放十位、個位。",
  min: "想一想：最小的數字放百位（0 不能放百位），再放十位、個位。",
};

// 比大小－數字猜猜樂：把數字卡放進百／十／個位，排出最大或最小的三位數
// 題目 { code, goal: "max"|"min", cards: [數字], fixed?: { tens, ones }, answer: 完整三位數 }
// 關卡 1、2 只有百位要放卡（十位、個位固定）；關卡 3～5 選 3 張排列，沒用到的卡不影響送出
export default {
  name: "MA2117",
  components: { PlaceValueCards },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      // 同樣的數字也用不同 id，卡片順序每次洗牌
      cards: shuffle(
        this.gameData.cards.map((digit, i) => ({ id: `c${i}`, digit }))
      ),
      answered: false,
      feedback: "",
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "選出數字卡，排出題目要的三位數。";
    },
    goalText() {
      return this.gameData.goal === "max" ? "最大" : "最小";
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    onChange() {
      if (!this.answered) this.feedback = "";
    },
    // 0 放百位：格子搖一下並提示；不播答錯特效，免得大叉叉擋住畫面、學生沒辦法馬上再拖
    onReject() {
      this.feedback = "0 不能放在百位";
    },
    reset() {
      if (this.answered) return;
      this.$refs.cards.reset();
      this.feedback = "";
    },
    checkAnswer() {
      if (this.answered) return;
      const board = this.$refs.cards;
      if (!board.isComplete()) {
        this.feedback = "黃色格子都要放數字卡喔！";
        return;
      }
      const { code, goal, cards, fixed, answer } = this.gameData;
      const value = board.value();
      const isCorrect = value === answer;
      const given = fixed
        ? `□${fixed.tens}${fixed.ones}；卡 ${cards.join("、")}`
        : `卡 ${cards.join("、")}`;
      this.$emit("add-record", [
        `${code} 排出${this.goalText}的三位數（${given}）＝${answer}`,
        String(value),
        isCorrect ? "正確" : "錯誤",
      ]);
      if (isCorrect) {
        this.answered = true;
        this.feedback = `答對了！${this.goalText}的三位數是 ${answer}。`;
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
        return;
      }
      // 答錯：把和正確答案不一樣的位值標紅，卡片留著讓學生調整
      const want = String(answer).split("").map(Number);
      const slots = ["hundreds", "tens", "ones"].filter(
        (s, i) => board.digits()[i] !== want[i]
      );
      board.markWrong(slots);
      this.feedback = HINTS[goal];
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
  align-items: center;
  justify-content: center;
  gap: 0.7rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small $padding--medium;
}

.question {
  margin: 0;
  font-size: 2rem;
  font-weight: $font-bold;
  color: #4e342e;

  &__goal {
    margin: 0 0.3rem;
    padding: 0 0.5rem;
    border-radius: 10px;
    color: #ffffff;

    &--max {
      background-color: #e53935;
    }

    &--min {
      background-color: #1e88e5;
    }
  }
}

.hint {
  margin: 0;
  font-size: 1.1rem;
  color: #6d4c41;
}

.actions {
  display: flex;
  gap: 1rem;
}

.reset {
  @extend .button-basic;
  border: none;
  padding: 0.4rem 1.6rem;
  font-size: 1.3rem;
  font-weight: $font-bold;
  color: #ffffff;
  background-color: #fb8c00;

  &:disabled {
    opacity: 0.5;
  }
}

.feedback {
  margin: 0;
  padding: 0.2rem 1rem;
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

@media (max-width: 1100px), (max-height: 760px) {
  .question {
    font-size: 1.6rem;
  }

  .game-area {
    gap: 0.4rem;
  }
}
</style>

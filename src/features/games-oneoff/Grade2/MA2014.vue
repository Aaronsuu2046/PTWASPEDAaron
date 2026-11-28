<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <p class="question">數一數，積木一共是多少？</p>

      <div ref="board" class="board">
        <BaseTenBlocks
          :hundreds="gameData.hundreds"
          :tens="gameData.tens"
          :ones="gameData.ones"
          :unit="unit"
          :variant="gameConfig?.BlockVariant || ''"
        />
      </div>

      <div class="option-group">
        <!-- 選項可能有重複的錯誤選項（例如 MA2112 3-2），所以用原本的索引當 key、記錄選了哪一顆 -->
        <button
          v-for="opt in options"
          :key="opt.i"
          type="button"
          :class="{
            'button--onclick': picked === opt.i,
            'option--wrong': wrong && picked === opt.i,
            'option--correct': answered && picked === opt.i,
          }"
          :data-option="opt.value"
          @click="select(opt)"
        >
          {{ opt.value }}
        </button>
      </div>

      <p v-if="feedback" class="feedback" :class="{ 'feedback--ok': answered }">
        {{ feedback }}
      </p>
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import BaseTenBlocks from "./components/BaseTenBlocks.vue";

function shuffle(list) {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 積木一小格最大／最小的邊長（px）
const UNIT_MAX = 26;
const UNIT_MIN = 10;

// 幾個百、幾個十、幾個一－積木選答：看百格板、十條、個位方塊，三選一選出數量
// 題目 { code, hundreds, tens, ones, options: [三個數], answer }；選項每次洗牌，判定用數值
// 選填 GameConfig.WrongHint：答錯時的提示；GameConfig.BlockVariant：積木配色（見 BaseTenBlocks）
export default {
  name: "MA2014",
  components: { BaseTenBlocks },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      options: shuffle(this.gameData.options.map((value, i) => ({ value, i }))),
      picked: null,
      selected: null,
      wrong: false,
      answered: false,
      feedback: "",
      unit: 18,
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "數一數積木，選出正確的數。";
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  mounted() {
    this.fit();
    this.observer = new ResizeObserver(() => this.fit());
    this.observer.observe(this.$refs.board);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
    this.observer?.disconnect();
  },
  methods: {
    // 依板子大小算一小格多大，讓這一題的積木全部放得下（寬、高都以「格」計算）
    fit() {
      const board = this.$refs.board;
      if (!board) return;
      const { hundreds, tens, ones } = this.gameData;
      const groups = [hundreds, tens, ones].filter(Boolean).length;
      const width =
        hundreds * 10.35 +
        tens * 1.35 +
        (ones ? Math.min(ones, 5) * 1.3 : 0) +
        (groups - 1) * 1.2 +
        1;
      const height = Math.max(
        hundreds || tens ? 10 : 0,
        Math.ceil(ones / 5) * 1.3
      );
      const w = board.clientWidth - 32;
      const h = board.clientHeight - 24;
      const u = Math.floor(Math.min(w / width, h / height));
      this.unit = Math.max(UNIT_MIN, Math.min(UNIT_MAX, u));
    },
    select(opt) {
      if (this.answered) return;
      this.picked = opt.i;
      this.selected = opt.value;
      this.wrong = false;
      this.feedback = "";
    },
    checkAnswer() {
      if (this.answered) return;
      const { code, hundreds, tens, ones, answer } = this.gameData;
      if (this.selected === null) {
        this.feedback = "先選一個答案喔！";
        return;
      }
      const isCorrect = this.selected === answer;
      this.$emit("add-record", [
        `${code} 百×${hundreds}、十×${tens}、一×${ones}＝${answer}（選項 ${this.gameData.options.join("、")}）`,
        String(this.selected),
        isCorrect ? "正確" : "錯誤",
      ]);
      if (isCorrect) {
        this.answered = true;
        this.feedback = "答對了！";
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
        return;
      }
      this.wrong = true;
      this.feedback =
        this.gameConfig?.WrongHint ||
        "再數一次：一片百格板是 100，一條是 10，一個小方塊是 1。";
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
  gap: 0.6rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small $padding--medium;
}

.question {
  margin: 0;
  font-size: 1.7rem;
  font-weight: $font-bold;
  color: #4e342e;
}

.board {
  flex: 1;
  min-height: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1rem;
  background-color: #ffffff;
  border-radius: 20px;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.option-group {
  display: flex;
  gap: 2rem;

  button {
    @extend .button-basic;
    border: none;
    min-width: 8.5rem;
    padding: 0.5rem 1.4rem;
    font-size: 2.2rem;
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

  .option-group button {
    min-width: 7rem;
    font-size: 1.9rem;
  }
}
</style>

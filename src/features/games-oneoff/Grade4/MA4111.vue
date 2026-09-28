<template>
  <WordProblemQuestion
    v-if="gameData.kind === 'word'"
    :game-data="gameData"
    :intro-text="introText"
    @play-effect="$emit('play-effect', $event)"
    @add-record="$emit('add-record', $event)"
    @next-question="$emit('next-question')"
  />
  <div v-else class="outer-container">
    <div class="title">
      <p>把下面 4 個數字放進右邊的算式中</p>
    </div>
    <div class="game-area">
      <p class="hint">
        點數字卡再點黃色格子（也可以拖過去），最後在右邊寫出答案
      </p>
      <div class="board">
        <MultiplyFill ref="fill" :data="gameData" @change="feedback = ''" />
      </div>
      <p v-if="feedback" class="feedback">{{ feedback }}</p>
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import WordProblemQuestion from "./games/WordProblemQuestion/WordProblemQuestion.vue";
import MultiplyFill from "./games/Vertical/MultiplyFill.vue";

// 三、四位數×三位數：關卡 1、2 拖 4 個數字補直式並寫乘積；關卡 3、4 應用題填做法與答案
export default {
  name: "MA4111",
  components: { WordProblemQuestion, MultiplyFill },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return { feedback: "", answered: false };
  },
  created() {
    // 應用題由 WordProblemQuestion 自己接送出答案
    if (this.gameData.kind !== "word") {
      emitter.on("submitAnswer", this.checkAnswer);
    }
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    checkAnswer() {
      if (this.answered) return;
      const { blanks, answer } = this.gameData;
      const result = this.$refs.fill.check();
      if (!result.complete)
        this.feedback = "4 個數字都要放進黃色格子，也要寫出答案喔！";
      else if (!result.correct)
        this.feedback = "紅色的地方不對，點一下拿回來再試試看！";
      const text = (digits, ans) =>
        `空格 ${digits.map((d) => (d === null ? "_" : d)).join("、")}；答案 ${
          ans || "_"
        }`;
      this.$emit("add-record", [
        text(
          blanks.map((b) => b.digit),
          answer
        ),
        text(result.placed, result.answer),
        result.correct ? "正確" : "錯誤",
      ]);
      if (result.correct) {
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
  gap: 0.5rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small;
}

.hint {
  margin: 0;
  font-size: 1.15rem;
  color: #6d4c41;
}

.board {
  flex: 1;
  min-height: 0;
  width: 100%;
}

.feedback {
  margin: 0;
  font-size: 1.3rem;
  font-weight: $font-bold;
  color: #c62828;
}
</style>

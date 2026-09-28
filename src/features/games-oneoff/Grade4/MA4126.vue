<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <p class="hint">
        點左邊再點右邊就會連線，也可以從左邊拖到右邊；點已連線的左邊可以重連
      </p>
      <div class="board">
        <MatchPairs
          ref="match"
          :left="gameData.left"
          :right="gameData.right"
          compact
          @change="feedback = ''"
        />
      </div>
      <p v-if="feedback" class="feedback">{{ feedback }}</p>
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import MatchPairs from "./games/Geometry/MatchPairs.vue";

// 分割四邊形：沿對角線剪開後兩個三角形的關係，5 個四邊形配 5 個敘述
export default {
  name: "MA4126",
  components: { MatchPairs },
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
  computed: {
    gameIntroText() {
      return (
        this.introText?.Content ||
        "沿著四邊形的一條對角線剪開，剪開的兩個三角形有什麼關係？"
      );
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    describe(item) {
      return item.kind === "shape" ? item.shape : item.text;
    },
    checkAnswer() {
      if (this.answered) return;
      const { left, right, answer } = this.gameData;
      const result = this.$refs.match.check(answer);
      const isCorrect = result.complete && result.wrong.length === 0;
      if (!result.complete)
        this.feedback = "還有沒連到的，每一個都要連一條線喔！";
      else if (!isCorrect) this.feedback = "紅色虛線連錯了，點左邊重新連看看！";
      const text = (pairs) =>
        left
          .map((l) => {
            const r = right.find((x) => x.id === pairs[l.id]);
            return `${this.describe(l)}→${r ? this.describe(r) : "未連"}`;
          })
          .join("；");
      this.$emit("add-record", [
        text(answer),
        text(result.pairs),
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
  gap: 0.6rem;
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
  max-width: 50rem;
}

.feedback {
  margin: 0;
  font-size: 1.3rem;
  font-weight: $font-bold;
  color: #c62828;
}
</style>

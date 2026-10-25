<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <!-- 積木代表多少 -->
      <div class="legend">
        <span class="legend__item">
          <BaseTenDecimalBlocks
            :flats="1"
            class="legend__icon legend__icon--flat"
          />
          1 張百格板 ＝ 1
        </span>
        <span class="legend__item">
          <BaseTenDecimalBlocks :rods="1" class="legend__icon" />
          1 條 ＝ 0.1
        </span>
        <span class="legend__item">
          <BaseTenDecimalBlocks
            :cubes="1"
            tight
            class="legend__icon legend__icon--cube"
          />
          1 個小方塊 ＝ 0.01
        </span>
      </div>
      <div class="board">
        <MatchThree ref="match" :columns="columns" @change="feedback = ''">
          <template #item="{ item, col }">
            <BaseTenDecimalBlocks
              v-if="col === 0"
              class="card-blocks"
              :rods="item.rods"
              :cubes="item.cubes"
              :grouped="item.grouped"
            />
            <span v-else class="card-answer">{{ item.answer }}</span>
          </template>
        </MatchThree>
      </div>
      <p class="hint">
        點一張卡再點另一邊的卡就會連線，也可以直接拖過去；點已連線的積木卡可以重連
      </p>
      <p v-if="feedback" class="feedback">{{ feedback }}</p>
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import MatchThree from "./games/Fraction/MatchThree.vue";
import BaseTenDecimalBlocks from "./games/Decimal/BaseTenDecimalBlocks.vue";

const blocksText = (item) =>
  [item.rods && `${item.rods} 條`, item.cubes && `${item.cubes} 個`]
    .filter(Boolean)
    .join("＋");

// 百格積木配對：左欄十進位積木、右欄小數卡（兩欄各自洗牌），三組都連對才過關
// 題目 { pairs: [{ id, rods, cubes, grouped, value, answer }] }
export default {
  name: "MA4072",
  components: { MatchThree, BaseTenDecimalBlocks },
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
      return this.introText?.Content || "想一想，圖片合起來是多少張百格板？";
    },
    // 兩欄用同一組資料，同一組的 id 相同
    columns() {
      return [this.gameData.pairs, this.gameData.pairs];
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
      const result = this.$refs.match.check();
      if (!result.complete) {
        // 還沒連完不能送出，也不記錄
        this.feedback = "每張積木卡都要連到一個小數喔！";
        return;
      }
      const isCorrect = result.wrong === 0;
      const pairs = this.gameData.pairs;
      const find = (id) => pairs.find((p) => p.id === id);
      this.$emit("add-record", [
        pairs.map((p) => `${blocksText(p)}＝${p.answer}`).join("；"),
        pairs
          .map((p) => `${blocksText(find(result.links[0][p.id]))}＝${p.answer}`)
          .join("；"),
        isCorrect ? "正確" : "錯誤",
      ]);
      if (isCorrect) {
        this.answered = true;
        this.feedback = "";
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
      } else {
        this.feedback =
          "紅色虛線連錯了！1 條是 0.1，1 個小方塊是 0.01，再數數看。";
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
  gap: 0.5rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small $padding--medium;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.6rem 1.6rem;
  font-size: 1.15rem;
  font-weight: $font-bold;
  color: #4e342e;

  &__item {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.2rem 0.8rem;
    background-color: #ffffff;
    border-radius: 12px;
  }

  &__icon {
    height: 2.4rem;
    width: auto;

    &--cube {
      height: 1.2rem;
    }
  }
}

.board {
  flex: 1;
  min-height: 0;
  width: 100%;
  max-width: 54rem;
  align-self: center;

  // 兩欄：積木卡寬一點
  :deep(.match3) {
    grid-template-columns: 1.6fr 1fr;
    gap: 7rem;
  }
}

.card-blocks {
  width: 100%;
  height: 100%;
}

.card-answer {
  font-size: 2.4rem;
  color: #0d47a1;
}

.hint {
  margin: 0;
  text-align: center;
  font-size: 1.05rem;
  color: #6d4c41;
}

.feedback {
  margin: 0;
  text-align: center;
  font-size: 1.3rem;
  font-weight: $font-bold;
  color: #c62828;
}

@media (max-width: 1100px), (max-height: 760px) {
  .legend {
    font-size: 1rem;
  }

  .board :deep(.match3) {
    gap: 5rem;
  }

  .card-answer {
    font-size: 2rem;
  }
}
</style>

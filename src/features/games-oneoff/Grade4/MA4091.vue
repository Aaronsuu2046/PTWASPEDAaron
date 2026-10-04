<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <div class="heads">
        <span>塗色的圖形</span>
        <span>分數</span>
        <span>讀法</span>
      </div>
      <div class="board">
        <MatchThree ref="match" :columns="columns" @change="feedback = ''">
          <template #item="{ item, col }">
            <FractionFigure
              v-if="col === 0"
              class="card-figure"
              :shape="gameData.shape"
              :whole="item.whole"
              :num="item.num"
              :den="item.den"
            />
            <StackedFraction
              v-else-if="col === 1"
              class="card-fraction"
              :whole="item.whole"
              :num="item.num"
              :den="item.den"
            />
            <span v-else class="card-reading">{{ item.reading }}</span>
          </template>
        </MatchThree>
      </div>
      <p class="hint">
        點一張卡再點旁邊一欄的卡就會連線，也可以直接拖過去；點已連線的卡可以重連
      </p>
      <p v-if="feedback" class="feedback">{{ feedback }}</p>
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import MatchThree from "./games/Fraction/MatchThree.vue";
import FractionFigure from "./games/Fraction/FractionFigure.vue";
import StackedFraction from "./games/Fraction/StackedFraction.vue";

const fracText = (item) =>
  item.whole
    ? `${item.whole} ${item.num}/${item.den}`
    : `${item.num}/${item.den}`;

// 分數連連看：塗色圖形—分數—讀法三欄，同一個數量的三張卡連成一組；三組都連對才過關
// 題目 { shape, items: [{ id, whole, num, den, reading }] }
export default {
  name: "MA4091",
  components: { MatchThree, FractionFigure, StackedFraction },
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
        "連連看，塗色的部分是多少？並將分數與正確的讀法連起來。"
      );
    },
    // 三欄都用同一組資料，同一組的 id 相同
    columns() {
      const items = this.gameData.items;
      return [items, items, items];
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    find(id) {
      return this.gameData.items.find((item) => item.id === id);
    },
    checkAnswer() {
      if (this.answered) return;
      const result = this.$refs.match.check();
      const isCorrect = result.complete && result.wrong === 0;
      if (!result.complete)
        this.feedback = "每個分數都要連到一個圖形和一個讀法喔！";
      else if (!isCorrect) this.feedback = "紅色虛線連錯了，點卡片重新連看看！";
      const items = this.gameData.items;
      const expected = items
        .map((item) => `${fracText(item)}＝${item.reading}`)
        .join("；");
      const actual = items
        .map((item) => {
          const fig = this.find(result.links[0][item.id]);
          const read = this.find(result.links[1][item.id]);
          return `圖${fig ? fracText(fig) : "未連"}—${fracText(item)}—${read ? read.reading : "未連"}`;
        })
        .join("；");
      this.$emit("add-record", [expected, actual, isCorrect ? "正確" : "錯誤"]);
      if (isCorrect) {
        this.answered = true;
        this.feedback = "";
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
  gap: 0.4rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small $padding--medium;
}

// 欄位標題對齊下面三欄
.heads {
  display: grid;
  grid-template-columns: 1.35fr 0.75fr 1fr;
  gap: 4.5rem;
  text-align: center;
  font-size: 1.2rem;
  font-weight: $font-bold;
  color: #5d4037;
}

.board {
  flex: 1;
  min-height: 0;
}

.card-figure {
  width: 100%;
  height: 100%;
}

.card-fraction {
  font-size: 2.2rem;
  color: #0d47a1;
}

.card-reading {
  font-size: 1.6rem;
  color: #4e342e;
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

@media (max-width: 1100px) {
  .heads {
    gap: 3rem;
  }

  .card-fraction {
    font-size: 1.9rem;
  }

  .card-reading {
    font-size: 1.35rem;
  }
}
</style>

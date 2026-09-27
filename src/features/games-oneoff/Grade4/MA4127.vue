<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <div class="board">
        <GridDraw
          ref="grid"
          :cols="grid.cols"
          :rows="grid.rows"
          :given="gameData.given"
          :labels="gameData.labels"
          :fill="solved"
          @change="feedback = ''"
        />
        <p class="unit">
          每一小格邊長 1 公分<span class="how"
            >點兩個點就會連線，也可以用拖的；點一下橘色線可以擦掉</span
          >
        </p>
      </div>

      <div class="side">
        <p class="prompt">
          以<span class="prompt__given">藍色線段</span>為邊，畫出
          <strong>{{ gameData.shapeName }}</strong>
        </p>
        <div class="tools">
          <button type="button" class="tool" @click="$refs.grid.undo()">
            ← 復原
          </button>
          <button type="button" class="tool" @click="$refs.grid.clear()">
            清除
          </button>
        </div>
        <p v-if="feedback" class="feedback">{{ feedback }}</p>

        <div v-if="wrongCount >= 3" class="hint">
          <p class="hint__title">提示圖（僅供參考）</p>
          <div class="hint__figure">
            <GridDraw
              :cols="grid.cols"
              :rows="grid.rows"
              :given="gameData.given"
              :labels="gameData.labels"
              :dashed="hintSegments"
              readonly
              crop
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import GridDraw from "./games/Geometry/GridDraw.vue";
import { judge } from "./games/Geometry/quadCheck.js";

const SHAPE_RULES = {
  square: "正方形的 4 條邊要一樣長，4 個角都要是直角喔！",
  rectangle: "長方形的 4 個角都要是直角喔！",
  rhombus: "菱形的 4 條邊要一樣長喔！",
  parallelogram: "平行四邊形的兩雙對邊要分別互相平行喔！",
  trapezoid: "梯形只能有一雙對邊互相平行喔！",
};
const POLYGON_NAMES = { 3: "三角形", 5: "五邊形", 6: "六邊形" };

// 在 1cm 方格紙上，以題目給的線段為邊補畫指定四邊形；不要求唯一答案，符合定義即可
export default {
  name: "MA4127",
  components: { GridDraw },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return { feedback: "", wrongCount: 0, solved: null };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "在邊長為 1cm 的方格紙上畫畫看。";
    },
    grid() {
      return this.gameConfig?.Grid || { cols: 11, rows: 8 };
    },
    // 提示圖：參考答案中不是題目線段的邊畫成虛線
    hintSegments() {
      const hint = this.gameData.hint;
      const key = (p) => p.join(",");
      const givenKeys = this.gameData.given.map((s) =>
        s.map(key).sort().join("|")
      );
      return hint
        .map((p, i) => [p, hint[(i + 1) % hint.length]])
        .filter((s) => !givenKeys.includes(s.map(key).sort().join("|")));
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    message(result) {
      switch (result.reason) {
        case "empty":
        case "open":
          return "還沒圍起來喔！線要頭尾相連，圍成一個四邊形。";
        case "extra":
          return "有多出來的線或線交叉了，點一下橘色線可以擦掉。";
        case "cross":
          return "四邊形的邊不能交叉喔！";
        case "notQuad":
          return `你圍成的是${
            POLYGON_NAMES[result.sides] || "多邊形"
          }，要畫四邊形喔！`;
        case "given":
          return "藍色線段要剛好當作四邊形的一條邊喔！";
        default:
          return SHAPE_RULES[this.gameData.shape];
      }
    },
    checkAnswer() {
      if (this.solved) return;
      const { given, shape, shapeName } = this.gameData;
      const segments = this.$refs.grid.segments;
      const result = judge(segments, given, shape);
      const expected = `${shapeName}（以藍色線段為邊）`;
      const actual = result.corners
        ? `頂點 ${result.corners.map((p) => `(${p.join(",")})`).join("、")}`
        : this.message(result);
      this.$emit("add-record", [expected, actual, result.ok ? "正確" : "錯誤"]);
      if (result.ok) {
        this.feedback = "";
        this.solved = result.corners;
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
      } else {
        this.wrongCount += 1;
        this.feedback = this.message(result);
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
  gap: 1rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small;
}

.board {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;

  :deep(.grid-draw) {
    flex: 1;
    min-height: 0;
  }
}

.unit {
  margin: 0.2rem 0 0;
  font-size: 1.1rem;
  font-weight: $font-bold;
  color: #0277bd;
}

.side {
  width: 17rem;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  min-height: 0;
  overflow-y: auto;
}

.prompt {
  margin: 0;
  font-size: 1.5rem;
  font-weight: $font-bold;
  line-height: 1.5;
  color: #333333;

  &__given {
    color: #1565c0;
  }

  strong {
    font-size: 1.8rem;
    color: #e65100;
  }
}

.how {
  margin-left: 1rem;
  font-size: 1.05rem;
  font-weight: normal;
  color: #6d4c41;
}

.tools {
  display: flex;
  gap: 0.5rem;
}

.tool {
  flex: 1;
  padding: 0.55rem 0.4rem;
  font-size: 1.2rem;
  font-weight: $font-bold;
  color: #ffffff;
  background-color: #ff9800;
  border: none;
  border-radius: 12px;
  box-shadow: 0 3px 0 #e65100;
  cursor: pointer;

  &:active {
    transform: translateY(2px);
    box-shadow: 0 1px 0 #e65100;
  }
}

.feedback {
  margin: 0;
  font-size: 1.25rem;
  font-weight: $font-bold;
  line-height: 1.45;
  color: #c62828;
}

.hint {
  padding: 0.4rem;
  background-color: #fffde7;
  border: 3px dashed #ffb300;
  border-radius: 12px;

  &__title {
    margin: 0 0 0.2rem;
    font-size: 1.05rem;
    font-weight: $font-bold;
    color: #8d6e63;
  }

  &__figure {
    height: 11rem;
  }
}

@media (max-width: 1100px) {
  .side {
    width: 15rem;
    gap: 0.45rem;
  }

  .feedback {
    font-size: 1.1rem;
    line-height: 1.35;
  }

  .prompt {
    font-size: 1.3rem;

    strong {
      font-size: 1.55rem;
    }
  }

  .hint__figure {
    height: 8rem;
  }
}
</style>

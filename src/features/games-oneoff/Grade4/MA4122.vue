<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <div ref="figure" class="figure">
        <svg
          ref="svg"
          class="figure__svg"
          viewBox="0 0 320 230"
          role="img"
          aria-label="找出直角並圈起來"
          @click="onTap"
        >
          <!-- 關卡 1：多邊形 -->
          <template v-if="gameData.kind === 'polygon'">
            <polygon :points="polygonPoints" class="figure__polygon" />
            <text
              v-for="(label, i) in gameData.labels"
              :key="`pl-${i}`"
              :x="vertexLabel(i).x"
              :y="vertexLabel(i).y"
              class="figure__label"
            >
              {{ label }}
            </text>
          </template>

          <!-- 關卡 2：線段交會 -->
          <template v-else>
            <g v-for="line in gameData.lines" :key="line.name">
              <line
                :x1="line.seg[0]"
                :y1="line.seg[1]"
                :x2="line.seg[2]"
                :y2="line.seg[3]"
                class="figure__line"
                :stroke="line.color"
              />
              <text
                v-if="!gameData.hideLineNames"
                :x="lineLabel(line.seg).x"
                :y="lineLabel(line.seg).y"
                class="figure__label"
                :fill="line.color"
              >
                {{ line.name }}
              </text>
            </g>
            <text
              v-for="(mark, i) in gameData.pointLabels || []"
              :key="`pt-${i}`"
              :x="mark.x - 16"
              :y="mark.y - 10"
              class="figure__label"
            >
              {{ mark.text }}
            </text>
          </template>

          <!-- 學生圈的位置 -->
          <circle
            v-for="i in circled"
            :key="`c-${i}`"
            :cx="gameData.candidates[i].x"
            :cy="gameData.candidates[i].y"
            r="17"
            class="figure__circle"
            :class="{
              'figure__circle--wrong': checked && !gameData.candidates[i].right,
              'figure__circle--correct': answered,
            }"
          />
        </svg>
        <SetSquare
          ref="setSquare"
          :start-x="24"
          :start-y="figureHeight - 12"
          @tap="onTap"
        />
      </div>

      <div class="side">
        <div class="info">
          <p class="info__main">點一下直角的位置把它圈起來</p>
          <p class="info__sub">再點一次可以取消</p>
          <p class="info__count">已圈 {{ circled.length }} 個</p>
          <p v-if="feedback" class="info__feedback">{{ feedback }}</p>
        </div>

        <div class="tools">
          <p class="tools__title">三角板</p>
          <p class="tools__hint">拖曳移動，按鈕旋轉</p>
          <div class="tools__buttons">
            <button type="button" class="tool" @click="rotate(-15)">
              左轉
            </button>
            <button type="button" class="tool" @click="rotate(15)">右轉</button>
            <button type="button" class="tool tool--reset" @click="resetSquare">
              歸位
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import SetSquare from "./games/Geometry/SetSquare.vue";

// 點擊時與候選角點的最大距離（SVG 座標）
const HIT_RADIUS = 28;

// 互相垂直的線：用三角板找出直角並圈起來
// polygon：candidates 為各頂點；lines：candidates 為線段交點；right 表示是否為直角
export default {
  name: "MA4122",
  components: { SetSquare },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      circled: [],
      checked: false,
      feedback: "",
      answered: false,
      figureHeight: 300,
    };
  },
  computed: {
    gameIntroText() {
      return (
        this.introText?.Content || "利用三角板找出互相垂直的線，並將直角圈起來"
      );
    },
    polygonPoints() {
      return this.gameData.points.map((p) => p.join(",")).join(" ");
    },
    centroid() {
      const pts = this.gameData.points || [];
      const sum = pts.reduce(
        (acc, p) => [acc[0] + p[0], acc[1] + p[1]],
        [0, 0]
      );
      return [sum[0] / pts.length, sum[1] / pts.length];
    },
    rightIndexes() {
      return this.gameData.candidates
        .map((c, i) => (c.right ? i : -1))
        .filter((i) => i >= 0);
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  mounted() {
    // 三角板放在圖框左下角
    this.figureHeight = this.$refs.figure?.clientHeight || 300;
    this.$nextTick(() => this.$refs.setSquare?.reset());
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    // 頂點名稱放在頂點往外（遠離重心）的位置
    vertexLabel(i) {
      const [x, y] = this.gameData.points[i];
      const [cx, cy] = this.centroid;
      const len = Math.hypot(x - cx, y - cy) || 1;
      return { x: x + ((x - cx) / len) * 20, y: y + ((y - cy) / len) * 20 + 8 };
    },
    lineLabel(seg) {
      const dx = seg[2] - seg[0];
      const dy = seg[3] - seg[1];
      const len = Math.hypot(dx, dy);
      return { x: seg[2] + (dx / len) * 14, y: seg[3] + (dy / len) * 14 + 7 };
    },
    onTap(event) {
      if (this.answered) return;
      const svg = this.$refs.svg;
      const point = svg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      const { x, y } = point.matrixTransform(svg.getScreenCTM().inverse());
      let best = -1;
      let bestDist = HIT_RADIUS;
      this.gameData.candidates.forEach((c, i) => {
        const dist = Math.hypot(c.x - x, c.y - y);
        if (dist < bestDist) {
          best = i;
          bestDist = dist;
        }
      });
      if (best === -1) return;
      this.checked = false;
      this.feedback = "";
      this.circled = this.circled.includes(best)
        ? this.circled.filter((i) => i !== best)
        : [...this.circled, best];
    },
    rotate(step) {
      this.$refs.setSquare?.rotate(step);
    },
    resetSquare() {
      this.$refs.setSquare?.reset();
    },
    labelsOf(indexes) {
      return indexes
        .map((i) => this.gameData.candidates[i].label)
        .sort()
        .join("、");
    },
    checkAnswer() {
      if (this.answered) return;
      const wrongCircles = this.circled.filter(
        (i) => !this.gameData.candidates[i].right
      );
      const missing = this.rightIndexes.filter(
        (i) => !this.circled.includes(i)
      );
      const isCorrect = wrongCircles.length === 0 && missing.length === 0;
      this.checked = true;
      if (!isCorrect) {
        this.feedback = wrongCircles.length
          ? "灰色的圈不是直角，再用三角板量量看！"
          : this.circled.length
            ? "還有直角沒有圈到喔！"
            : "先圈出直角再送出！";
      }
      this.$emit("add-record", [
        this.labelsOf(this.rightIndexes),
        this.circled.length ? this.labelsOf(this.circled) : "未圈選",
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
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small;
}

.figure {
  position: relative;
  flex: 1;
  max-width: 34rem;
  height: 100%;
  max-height: 25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #ffffff;
  border: 3px solid #ffcc80;
  border-radius: 16px;
  overflow: hidden;

  &__svg {
    width: 100%;
    height: 100%;
    cursor: pointer;
    touch-action: manipulation;
  }

  &__polygon {
    fill: #e3f2fd;
    stroke: #1565c0;
    stroke-width: 4;
    stroke-linejoin: round;
  }

  &__line {
    stroke-width: 5;
    stroke-linecap: round;
  }

  &__label {
    font-size: 20px;
    font-weight: bold;
    text-anchor: middle;
    fill: #333333;
  }

  &__circle {
    fill: rgba(229, 57, 53, 0.08);
    stroke: #e53935;
    stroke-width: 4;
    pointer-events: none;

    &--wrong {
      fill: rgba(158, 158, 158, 0.15);
      stroke: #9e9e9e;
      stroke-dasharray: 6 4;
    }

    &--correct {
      stroke: #43a047;
      fill: rgba(67, 160, 71, 0.12);
    }
  }
}

.side {
  width: 16.5rem;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info {
  padding: 0.8rem 1rem;
  background-color: #ffffff;
  border: 3px solid #ffcc80;
  border-radius: 14px;

  p {
    margin: 0;
  }

  &__main {
    font-size: 1.4rem;
    font-weight: $font-bold;
  }

  &__sub {
    margin-top: 0.2rem !important;
    font-size: 1.1rem;
    color: #6d4c41;
  }

  &__count {
    margin-top: 0.6rem !important;
    font-size: 1.3rem;
    font-weight: $font-bold;
    color: #1565c0;
  }

  &__feedback {
    margin-top: 0.5rem !important;
    font-size: 1.2rem;
    font-weight: $font-bold;
    color: #c62828;
  }
}

.tools {
  padding: 0.7rem;
  text-align: center;
  background-color: #fff8e1;
  border: 3px solid #ffb74d;
  border-radius: 14px;

  &__title {
    margin: 0;
    font-size: 1.3rem;
    font-weight: $font-bold;
  }

  &__hint {
    margin: 0.2rem 0 0.5rem;
    font-size: 1rem;
    color: #6d4c41;
  }

  &__buttons {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
  }
}

.tool {
  min-width: 3.6rem;
  height: 3rem;
  font-size: 1.2rem;
  font-weight: $font-bold;
  color: #ffffff;
  background-color: #ffa726;
  border: none;
  border-radius: 12px;
  cursor: pointer;

  &--reset {
    background-color: #90a4ae;
  }
}
</style>

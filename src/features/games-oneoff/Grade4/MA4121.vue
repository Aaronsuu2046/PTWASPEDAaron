<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <div ref="figure" class="figure">
        <svg
          class="figure__svg"
          viewBox="0 0 320 220"
          role="img"
          aria-label="直線 L 和直線 M"
        >
          <g v-for="line in gameData.lines" :key="line.name">
            <line
              :x1="line.seg[0]"
              :y1="line.seg[1]"
              :x2="line.seg[2]"
              :y2="line.seg[3]"
              class="figure__line"
              :class="`figure__line--${line.name}`"
            />
            <text
              :x="labelPos(line.seg).x"
              :y="labelPos(line.seg).y"
              class="figure__label"
              :class="`figure__label--${line.name}`"
            >
              {{ line.name }}
            </text>
          </g>
          <path
            v-if="gameData.rightMark"
            :d="rightMarkPath"
            class="figure__right-mark"
          />
        </svg>
        <SetSquare ref="setSquare" :start-x="24" :start-y="figureHeight - 12" />
      </div>

      <div class="side">
        <div class="choices">
          <button
            v-for="option in OPTIONS"
            :key="option"
            type="button"
            class="choice"
            :class="{
              'choice--selected': selected === option,
              'choice--wrong': wrong && selected === option,
            }"
            @click="choose(option)"
          >
            {{ option }}
          </button>
          <p v-if="wrong" class="retry">再試一次！可以用三角板量量看。</p>
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

// 認識互相垂直的兩條直線：看兩條直線，選「有／沒有互相垂直」；三角板只是輔助
export default {
  name: "MA4121",
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
      OPTIONS: ["有互相垂直", "沒有互相垂直"],
      selected: "",
      wrong: false,
      answered: false,
      figureHeight: 300,
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "直線 L 和直線 M 有沒有互相垂直？";
    },
    // 兩線交點處的直角記號（只有題目要求時才畫）
    rightMarkPath() {
      const [l, m] = this.gameData.lines.map((line) => line.seg);
      const cross = this.intersection(l, m);
      const unit = (s) => {
        const len = Math.hypot(s[2] - s[0], s[3] - s[1]);
        return [(s[2] - s[0]) / len, (s[3] - s[1]) / len];
      };
      const [ux, uy] = unit(l);
      const [vx, vy] = unit(m);
      const k = 14;
      const a = [cross.x + ux * k, cross.y + uy * k];
      const b = [cross.x + (ux + vx) * k, cross.y + (uy + vy) * k];
      const c = [cross.x + vx * k, cross.y + vy * k];
      return `M ${a[0]} ${a[1]} L ${b[0]} ${b[1]} L ${c[0]} ${c[1]}`;
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
    labelPos(seg) {
      // 標在第二個端點外側一點
      const dx = seg[2] - seg[0];
      const dy = seg[3] - seg[1];
      const len = Math.hypot(dx, dy);
      return {
        x: seg[2] + (dx / len) * 14,
        y: seg[3] + (dy / len) * 14 + 7,
      };
    },
    intersection(p, q) {
      const d = (p[2] - p[0]) * (q[3] - q[1]) - (p[3] - p[1]) * (q[2] - q[0]);
      const t =
        ((q[0] - p[0]) * (q[3] - q[1]) - (q[1] - p[1]) * (q[2] - q[0])) / d;
      return { x: p[0] + t * (p[2] - p[0]), y: p[1] + t * (p[3] - p[1]) };
    },
    choose(option) {
      if (this.answered) return;
      this.selected = option;
      this.wrong = false;
    },
    rotate(step) {
      this.$refs.setSquare?.rotate(step);
    },
    resetSquare() {
      this.$refs.setSquare?.reset();
    },
    checkAnswer() {
      if (this.answered) return;
      const isCorrect = this.selected === this.gameData.answer;
      this.wrong = !isCorrect;
      this.$emit("add-record", [
        `第 ${this.gameData.no} 題：${this.gameData.answer}`,
        this.selected || "未作答",
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
  }

  &__line {
    stroke-width: 5;
    stroke-linecap: round;

    &--L {
      stroke: #1e88e5;
    }

    &--M {
      stroke: #e53935;
    }
  }

  &__label {
    font-size: 22px;
    font-weight: bold;
    text-anchor: middle;

    &--L {
      fill: #1565c0;
    }

    &--M {
      fill: #c62828;
    }
  }

  &__right-mark {
    fill: none;
    stroke: #333333;
    stroke-width: 2.5;
  }
}

.side {
  width: 16.5rem;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.choices {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.choice {
  height: 4rem;
  font-size: 1.5rem;
  white-space: nowrap;
  font-weight: $font-bold;
  color: #333333;
  background-color: #ffffff;
  border: 3px solid #ffcc80;
  border-radius: 14px;
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.15);
  cursor: pointer;

  &--selected {
    color: #1565c0;
    border-color: #1e88e5;
    background-color: #e3f2fd;
  }

  &--wrong {
    color: #c62828;
    border-color: #e53935;
    background-color: #ffebee;
  }
}

.retry {
  margin: 0;
  font-size: 1.2rem;
  font-weight: $font-bold;
  color: #c62828;
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
    font-size: 1.2rem;
    background-color: #90a4ae;
  }
}
</style>

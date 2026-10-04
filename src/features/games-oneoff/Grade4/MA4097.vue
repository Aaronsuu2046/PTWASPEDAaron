<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <!-- 橫式提示與金字塔靠左，右邊留給數字板 -->
      <div class="stage">
        <p class="formula" data-pad-avoid>
          <template v-if="gameData.expr">
            <span v-html="numberHtml(gameData.expr.a)" />
            <span class="formula__op">{{
              gameData.op === "+" ? "＋" : "－"
            }}</span>
            <span v-html="numberHtml(gameData.expr.b)" />
            <span class="formula__op">＝</span>
            <span v-if="answered" v-html="numberHtml(gameData.answer)" />
            <span v-else class="formula__q">？</span>
            <span v-if="answered && gameData.reference" class="formula__ref">
              （{{ gameData.reference }}）
            </span>
          </template>
          <template v-else> 上面的圓圈 ＝ 正下方相鄰兩個圓圈相加 </template>
        </p>

        <div class="pyramid" :class="`pyramid--${gameData.shape}`">
          <svg
            class="pyramid__lines"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <line
              v-for="(edge, k) in edges"
              :key="k"
              :x1="POS[edge[0]][0]"
              :y1="POS[edge[0]][1]"
              :x2="POS[edge[1]][0]"
              :y2="POS[edge[1]][1]"
            />
          </svg>
          <div
            v-for="(node, key) in gameData.nodes"
            :key="key"
            class="node"
            :class="{
              'node--blank': node.blank,
              'node--wrong': node.blank && wrongNodes.includes(key),
              'node--correct': node.blank && answered,
            }"
            :style="{ left: `${POS[key][0]}%`, top: `${POS[key][1]}%` }"
            :data-node="key"
            data-pad-avoid
          >
            <span v-if="gameData.shape === 'big'" class="node__name">{{
              key
            }}</span>
            <!-- 已知的數 -->
            <span v-if="!node.blank" v-html="numberHtml(node)" />
            <!-- 要填的：整數（帶分數時）＋分子，分母固定 -->
            <span v-else class="num">
              <button
                v-if="node.whole"
                v-bind="box(`${key}w`)"
                class="box box--whole"
                @click="activate(`${key}w`)"
              >
                {{ values[`${key}w`] }}
              </button>
              <span class="frac">
                <button
                  v-bind="box(`${key}n`)"
                  class="box"
                  @click="activate(`${key}n`)"
                >
                  {{ values[`${key}n`] }}
                </button>
                <span class="frac__bar" />
                <span class="frac__den">{{ node.den }}</span>
              </span>
            </span>
          </div>
        </div>
      </div>

      <p v-if="feedback" class="feedback">{{ feedback }}</p>

      <FieldPad
        :field="answered ? null : activeEl"
        @press="press"
        @close="closePad"
      />
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import FieldPad from "./games/Common/FieldPad.vue";

const MAX_LENGTH = 2;
const REVEAL_MS = 2200;
// 各圓圈的位置（%）與連線
const LAYOUT = {
  small: {
    pos: { top: [50, 22], left: [28, 76], right: [72, 76] },
    edges: [
      ["top", "left"],
      ["top", "right"],
    ],
  },
  big: {
    pos: {
      F: [50, 15],
      D: [32, 48],
      E: [68, 48],
      A: [16, 82],
      B: [50, 82],
      C: [84, 82],
    },
    edges: [
      ["F", "D"],
      ["F", "E"],
      ["D", "A"],
      ["D", "B"],
      ["E", "B"],
      ["E", "C"],
    ],
  },
};

const textOf = (x) => {
  const frac = x.num ? `${x.num}/${x.den}` : "";
  if (x.whole && frac) return `${x.whole} ${frac}`;
  return x.whole ? String(x.whole) : frac;
};

// 同分母分數加減（分數金字塔）：上面的圓圈＝正下方相鄰兩個圓圈相加
// 關卡 1～4：3 個圓圈（加法填上面、減法填下面）；關卡 5：A、B、C 在底層，D＝A＋B、E＝B＋C、F＝D＋E
// 只填挖空的格子：分母固定，帶分數答案填整數和分子，其餘只填分子；假分數不需約分
export default {
  name: "MA4097",
  components: { FieldPad },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    const values = {};
    Object.entries(this.gameData.nodes).forEach(([key, node]) => {
      if (!node.blank) return;
      if (node.whole) values[`${key}w`] = "";
      values[`${key}n`] = "";
    });
    return {
      values,
      active: null,
      activeEl: null,
      wrongNodes: [],
      wrongKeys: [],
      feedback: "",
      answered: false,
      revealTimer: null,
    };
  },
  computed: {
    gameIntroText() {
      return (
        this.introText?.Content ||
        "上面的圓圈等於下面相鄰兩個圓圈相加，填填看。"
      );
    },
    POS() {
      return LAYOUT[this.gameData.shape].pos;
    },
    edges() {
      return LAYOUT[this.gameData.shape].edges;
    },
    blanks() {
      return Object.entries(this.gameData.nodes).filter(([, n]) => n.blank);
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
    clearTimeout(this.revealTimer);
  },
  methods: {
    // 整數＋直式分數（只用數字，不含使用者輸入）
    numberHtml(x) {
      const whole = x.whole ? `<span class="num__whole">${x.whole}</span>` : "";
      const frac = x.num
        ? `<span class="frac"><span>${x.num}</span><span class="frac__bar"></span><span>${x.den}</span></span>`
        : "";
      return `<span class="num">${whole}${frac}</span>`;
    },
    box(key) {
      return {
        type: "button",
        "data-key": key,
        "data-pad-field": "",
        "aria-label": key.endsWith("w") ? "整數" : "分子",
        class: {
          "box--active": !this.answered && this.active === key,
          "box--wrong": this.wrongKeys.includes(key),
          "box--correct": this.answered,
        },
      };
    },
    activate(key) {
      if (this.answered) return;
      this.active = key;
      // 數字板以整個金字塔定位，放在右邊空白處，不會蓋住圓圈和橫式
      this.activeEl = this.$el.querySelector(".stage");
    },
    closePad() {
      this.active = null;
      this.activeEl = null;
    },
    press(key) {
      if (this.answered || !this.active) return;
      const k = this.active;
      const current = this.values[k];
      let next = current;
      if (key === "clear") next = "";
      else if (key === "←") next = current.slice(0, -1);
      else if (/^\d$/.test(key) && current.length < MAX_LENGTH)
        next = current === "0" ? key : current + key;
      this.values = { ...this.values, [k]: next };
      this.wrongKeys = this.wrongKeys.filter((w) => w !== k);
      this.wrongNodes = this.wrongNodes.filter((n) => !k.startsWith(n));
      this.feedback = "";
    },
    checkAnswer() {
      if (this.answered) return;
      const empty = Object.keys(this.values).filter(
        (k) => this.values[k] === ""
      );
      if (empty.length) {
        this.wrongKeys = empty;
        this.feedback = "空白的格子都要填喔！";
        return;
      }
      const wrongKeys = [];
      this.blanks.forEach(([key, node]) => {
        if (node.whole && Number(this.values[`${key}w`]) !== node.whole)
          wrongKeys.push(`${key}w`);
        if (Number(this.values[`${key}n`]) !== node.num)
          wrongKeys.push(`${key}n`);
      });
      this.wrongKeys = wrongKeys;
      this.wrongNodes = this.blanks
        .map(([key]) => key)
        .filter((key) => wrongKeys.some((w) => w.startsWith(key)));
      const isCorrect = wrongKeys.length === 0;
      const typed = (key, node) =>
        node.whole
          ? `${this.values[`${key}w`]} ${this.values[`${key}n`]}/${node.den}`
          : `${this.values[`${key}n`]}/${node.den}`;
      this.$emit("add-record", [
        this.blanks.map(([key, node]) => `${key}=${textOf(node)}`).join("；"),
        this.blanks
          .map(([key, node]) => `${key}=${typed(key, node)}`)
          .join("；"),
        isCorrect ? "正確" : "錯誤",
      ]);
      if (isCorrect) {
        this.answered = true;
        this.feedback = "";
        this.closePad();
        this.$emit("play-effect", "CorrectSound");
        // 有帶分數參考時，先停一下讓學生看到再進下一題
        if (this.gameData.reference)
          this.revealTimer = setTimeout(
            () => this.$emit("next-question"),
            REVEAL_MS
          );
        else this.$emit("next-question");
      } else {
        this.feedback = "紅色的格子不對，分母一樣時，分子相加減就好！";
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
  padding: $padding--small $padding--medium;
}

.stage {
  flex: 1;
  min-height: 0;
  width: 100%;
  max-width: 32rem;
  align-self: flex-start;
  margin-left: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.formula {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.3rem 1.2rem;
  font-size: 1.6rem;
  font-weight: $font-bold;
  color: #4e342e;
  background-color: #fff8e1;
  border: 3px solid #ffcc80;
  border-radius: 14px;

  &__op {
    color: #333333;
  }

  &__q {
    color: #e65100;
  }

  &__ref {
    color: #2e7d32;
  }
}

.pyramid {
  position: relative;
  flex: 1;
  min-height: 0;
  width: 100%;

  &__lines {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;

    line {
      stroke: #8d6e63;
      stroke-width: 0.6;
      vector-effect: non-scaling-stroke;
      stroke-width: 4px;
    }
  }
}

.node {
  position: absolute;
  width: 9.5rem;
  height: 9.5rem;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #e3f2fd;
  border: 4px solid #42a5f5;
  border-radius: 50%;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.1);

  &--blank {
    background-color: #fffde7;
    border-color: #ffca28;
  }

  &--wrong {
    border-color: #e53935;
    box-shadow: 0 0 0 5px #ffcdd2;
  }

  &--correct {
    background-color: #e8f5e9;
    border-color: #43a047;
  }

  &__name {
    position: absolute;
    top: -0.2rem;
    left: 0.1rem;
    width: 1.9rem;
    height: 1.9rem;
    line-height: 1.9rem;
    text-align: center;
    font-size: 1.1rem;
    font-weight: $font-bold;
    color: #ffffff;
    background-color: #7e57c2;
    border-radius: 50%;
  }
}

.pyramid--big .node {
  width: 7.6rem;
  height: 7.6rem;
}

:deep(.num) {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 1.9rem;
  font-weight: $font-bold;
  color: #0d47a1;
}

:deep(.num__whole) {
  font-size: 2.1rem;
}

:deep(.frac) {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.05;
}

:deep(.frac__bar) {
  align-self: stretch;
  min-width: 1.8rem;
  height: 4px;
  margin: 0.12rem 0;
  background-color: #37474f;
  border-radius: 2px;
}

.formula :deep(.num) {
  font-size: 1.5rem;
}

.box {
  width: 3.2rem;
  height: 2.6rem;
  font-size: 1.6rem;
  font-weight: $font-bold;
  color: #1565c0;
  background-color: #ffffff;
  border: 3px dashed #90a4ae;
  border-radius: 10px;
  cursor: pointer;

  &--active {
    border-style: solid;
    border-color: #1e88e5;
    box-shadow: 0 0 0 3px #90caf9;
  }

  &--wrong {
    border-style: solid;
    border-color: #e53935;
    background-color: #ffebee;
  }

  &--correct {
    border-style: solid;
    border-color: #43a047;
    background-color: #e8f5e9;
    color: #2e7d32;
  }
}

.feedback {
  margin: 0;
  font-size: 1.25rem;
  font-weight: $font-bold;
  color: #c62828;
}

@media (max-width: 1100px), (max-height: 760px) {
  .formula {
    font-size: 1.35rem;
  }

  .node {
    width: 8rem;
    height: 8rem;
  }

  .pyramid--big .node {
    width: 6.4rem;
    height: 6.4rem;
  }

  :deep(.num) {
    font-size: 1.6rem;
  }

  .box {
    width: 2.8rem;
    height: 2.2rem;
    font-size: 1.4rem;
  }
}
</style>

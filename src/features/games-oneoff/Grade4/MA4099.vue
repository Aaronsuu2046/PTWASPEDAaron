<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <p class="question">
        <template v-for="(seg, k) in questionParts" :key="k">
          <span v-if="seg.text">{{ seg.text }}</span>
          <span v-else class="qf">
            <span>{{ gameData.num }}</span>
            <span class="qf__bar" />
            <span>{{ gameData.den }}</span>
          </span>
        </template>
      </p>

      <!-- 關卡 1、2 的操作示意圖 -->
      <div v-if="gameData.figure" class="figure">
        <TimesFigure
          :kind="gameData.figure"
          :num="gameData.num"
          :den="gameData.den"
          :times="gameData.times"
        />
      </div>

      <!-- 依腳本示意圖：num/den × □ ＝ (num × □) / den ＝ □ / den，答：□/□（只寫假分數，沒有整數格） -->
      <div class="work">
        <div class="work-row">
          <span class="work-label">做法：</span>
          <span class="frac">
            <span>{{ gameData.num }}</span>
            <span class="frac__bar" />
            <span>{{ gameData.den }}</span>
          </span>
          <span class="sign">×</span>
          <button v-bind="box('t')" class="box box--int" @click="activate('t')">
            {{ values.t }}
          </button>
          <span class="sign">＝</span>
          <span class="frac">
            <span class="frac__top">
              （{{ gameData.num }} ×
              <button v-bind="box('t2')" class="box" @click="activate('t2')">
                {{ values.t2 }}
              </button>
              ）
            </span>
            <span class="frac__bar" />
            <span>{{ gameData.den }}</span>
          </span>
        </div>
        <div class="work-row">
          <span class="work-label" />
          <span class="sign">＝</span>
          <span class="frac">
            <button v-bind="box('p')" class="box" @click="activate('p')">
              {{ values.p }}
            </button>
            <span class="frac__bar" />
            <span>{{ gameData.den }}</span>
          </span>
        </div>
        <div class="work-row">
          <span class="work-label">答：</span>
          <span class="frac">
            <button v-bind="box('an')" class="box" @click="activate('an')">
              {{ values.an }}
            </button>
            <span class="frac__bar" />
            <button v-bind="box('ad')" class="box" @click="activate('ad')">
              {{ values.ad }}
            </button>
          </span>
          <span class="unit">{{ gameData.unit }}</span>
          <!-- 假分數答對後，用分線寫法顯示換成帶分數（或整數）的參考答案 -->
          <span v-if="answered && reference" class="reference">
            （<span class="frac frac--small">
              <span>{{ gameData.product }}</span>
              <span class="frac__bar" />
              <span>{{ gameData.den }}</span>
            </span>
            ＝
            <span v-if="reference.w" class="reference__whole">{{
              reference.w
            }}</span>
            <span v-if="reference.n" class="frac frac--small">
              <span>{{ reference.n }}</span>
              <span class="frac__bar" />
              <span>{{ gameData.den }}</span>
            </span>
            ）
          </span>
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
import TimesFigure from "./games/Fraction/TimesFigure.vue";
import FieldPad from "./games/Common/FieldPad.vue";

const KEYS = ["t", "t2", "p", "an", "ad"];
const MAX_LENGTH = 3;
const REVEAL_MS = 2200;

// 分數的整數倍（依腳本）：做法「num/den × □ ＝ (num × □)/den ＝ □/den」，答案用假分數 □/□
// 假分數答對後，顯示換成帶分數（或整數）的參考答案；右側「點我看提示」放腳本的提示文字
// 題目 { question（{f} 換成分數）, num, den, times, product, unit, figure, hint }
export default {
  name: "MA4099",
  components: { TimesFigure, FieldPad },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record", "side-hint"],
  data() {
    return {
      values: Object.fromEntries(KEYS.map((k) => [k, ""])),
      active: null,
      activeEl: null,
      wrongKeys: [],
      feedback: "",
      answered: false,
      revealTimer: null,
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "想一想，再填填看";
    },
    // 答案是假分數時的參考：帶分數或整數
    reference() {
      const { product, den } = this.gameData;
      if (product < den) return null;
      return { w: Math.floor(product / den), n: product % den };
    },
    questionParts() {
      return this.gameData.question
        .split(/(\{f\})/)
        .filter(Boolean)
        .map((s) => (s === "{f}" ? { frac: true } : { text: s }));
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  mounted() {
    if (this.gameData.hint)
      this.$emit("side-hint", {
        title: "提示",
        groups: [
          { title: "想一想", rules: [this.gameData.hint] },
          {
            title: "算不出來時",
            rules: ["可以打開右邊「計算工具」的九九乘法表。"],
          },
        ],
      });
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
    this.$emit("side-hint", null);
    clearTimeout(this.revealTimer);
  },
  methods: {
    box(key) {
      return {
        type: "button",
        "data-key": key,
        "data-pad-field": "",
        "aria-label": "數字",
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
      this.activeEl = this.$el.querySelector(`[data-key="${key}"]`);
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
      this.feedback = "";
    },
    checkAnswer() {
      if (this.answered) return;
      const v = this.values;
      const empty = KEYS.filter((k) => v[k] === "");
      if (empty.length) {
        this.wrongKeys = empty;
        this.feedback = "空白的格子都要填喔！";
        return;
      }
      const { num, den, times, product, unit } = this.gameData;
      const wrong = [];
      // 逐格檢查，只標出填錯的格子
      if (Number(v.t) !== times) wrong.push("t");
      if (Number(v.t2) !== times) wrong.push("t2");
      if (Number(v.p) !== product) wrong.push("p");
      if (Number(v.an) !== product) wrong.push("an");
      if (Number(v.ad) !== den) wrong.push("ad");
      this.wrongKeys = wrong;
      const isCorrect = wrong.length === 0;
      this.$emit("add-record", [
        `${num}/${den}×${times}＝(${num}×${times})/${den}＝${product}/${den}；答 ${product}/${den} ${unit}`,
        `${num}/${den}×${v.t}＝(${num}×${v.t2})/${den}＝${v.p}/${den}；答 ${v.an}/${v.ad} ${unit}`,
        isCorrect ? "正確" : "錯誤",
      ]);
      if (isCorrect) {
        this.answered = true;
        this.feedback = "";
        this.closePad();
        this.$emit("play-effect", "CorrectSound");
        if (this.reference)
          this.revealTimer = setTimeout(
            () => this.$emit("next-question"),
            REVEAL_MS
          );
        else this.$emit("next-question");
      } else {
        this.feedback = wrong.includes("p")
          ? `分母不變，分子要乘 ${times}，算算看 ${num} × ${times} 是多少？`
          : "紅色的格子不對，再想一想！";
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
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.7rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small $padding--medium;
}

.question {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.2rem;
  padding: 0.5rem 1.2rem;
  font-size: 1.6rem;
  font-weight: $font-bold;
  color: #4e342e;
  background-color: #fff8e1;
  border: 3px solid #ffcc80;
  border-radius: 14px;
}

.qf {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  margin: 0 0.25rem;
  font-size: 1.25rem;
  line-height: 1.05;
  color: #0d47a1;

  &__bar {
    align-self: stretch;
    min-width: 1.4rem;
    height: 3px;
    margin: 0.1rem 0;
    background-color: currentColor;
  }
}

.figure {
  flex-shrink: 1;
  min-height: 0;
  height: 10rem;
  width: 100%;

  :deep(.times-figure) {
    width: 100%;
    height: 100%;
  }
}

.work {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding: 0.8rem 1.4rem;
  background-color: #ffffff;
  border-radius: 16px;
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.1);
}

.work-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.work-label {
  min-width: 4.8rem;
  white-space: nowrap;
  font-size: 1.5rem;
  font-weight: $font-bold;
  color: #00695c;
}

.frac {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  font-size: 1.8rem;
  font-weight: $font-bold;
  line-height: 1.1;
  color: #0d47a1;

  &__bar {
    align-self: stretch;
    min-width: 2rem;
    height: 4px;
    background-color: #37474f;
    border-radius: 2px;
  }

  &__top {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
  }

  &--small {
    font-size: 1.25rem;

    .frac__bar {
      min-width: 1.4rem;
      height: 3px;
    }
  }
}

.sign,
.unit {
  font-size: 1.8rem;
  font-weight: $font-bold;
  color: #333333;
}

.reference {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 1.3rem;
  font-weight: $font-bold;
  color: #2e7d32;

  &__whole {
    font-size: 1.5rem;
  }

  .frac {
    color: #2e7d32;
  }
}

.box {
  width: 3.6rem;
  height: 2.6rem;
  font-size: 1.6rem;
  font-weight: $font-bold;
  color: #1565c0;
  background-color: #ffffff;
  border: 3px dashed #90a4ae;
  border-radius: 10px;
  cursor: pointer;

  &--int {
    height: 3.2rem;
  }

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
  .question {
    font-size: 1.35rem;
  }

  .figure {
    height: 8rem;
  }

  .work {
    gap: 0.5rem;
    padding: 0.6rem 1rem;
  }

  .work-label {
    min-width: 4rem;
    font-size: 1.3rem;
  }

  .box {
    width: 3.2rem;
    height: 2.3rem;
    font-size: 1.4rem;

    &--int {
      height: 2.8rem;
    }
  }
}
</style>

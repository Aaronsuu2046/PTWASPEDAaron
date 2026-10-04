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
            <button v-bind="box('p')" class="box" @click="activate('p')">
              {{ values.p }}
            </button>
            <span class="frac__bar" />
            <span>{{ gameData.den }}</span>
          </span>
        </div>
        <div class="work-row">
          <span class="work-label">答：</span>
          <button
            v-bind="box('aw')"
            class="box box--int"
            @click="activate('aw')"
          >
            {{ values.aw }}
          </button>
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
          <span v-if="answered && gameData.reference" class="reference">
            （也就是 {{ gameData.reference }} {{ gameData.unit }}）
          </span>
        </div>
        <p class="work-hint">
          答案可以寫假分數，整數格可以空著。需要時可按右邊「計算工具」看九九乘法表。
        </p>
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

const KEYS = ["t", "p", "aw", "an", "ad"];
const MAX_LENGTH = 3;
const REVEAL_MS = 2200;

// 分數的整數倍：做法「num/den × □ ＝ □/den」填倍數和乘積分子（分母固定），再填答案
// 答案可寫假分數、帶分數或整數（數值相同、有分數時分母相同就對）；答對後顯示帶分數或整數參考
// 題目 { question（{f} 換成分數）, num, den, times, product, unit, figure, reference }
export default {
  name: "MA4099",
  components: { TimesFigure, FieldPad },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
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
      return this.introText?.Content || "想一想，再填填看。";
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
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
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
    // 答案：寫成分數（可帶整數）時分母要和題目相同；剛好是整數時也可以只寫整數
    answerOk() {
      const { product, den } = this.gameData;
      const w = Number(this.values.aw || 0);
      const n = this.values.an;
      const d = this.values.ad;
      if (n === "" && d === "")
        return product % den === 0 && w === product / den;
      return Number(d) === den && w * den + Number(n) === product;
    },
    checkAnswer() {
      if (this.answered) return;
      const v = this.values;
      const empty = ["t", "p"].filter((k) => v[k] === "");
      const answerEmpty = v.aw === "" && v.an === "" && v.ad === "";
      const fracHalf = (v.an === "") !== (v.ad === "");
      if (empty.length || answerEmpty || fracHalf) {
        this.wrongKeys = [
          ...empty,
          ...(answerEmpty ? ["an", "ad"] : []),
          ...(fracHalf ? [v.an === "" ? "an" : "ad"] : []),
        ];
        this.feedback = "空白的格子都要填喔！";
        return;
      }
      const { num, den, times, product, unit } = this.gameData;
      const wrong = [];
      if (Number(v.t) !== times) wrong.push("t");
      if (Number(v.p) !== product) wrong.push("p");
      if (!this.answerOk()) wrong.push("aw", "an", "ad");
      this.wrongKeys = wrong;
      const isCorrect = wrong.length === 0;
      const typedAns = `${v.aw ? `${v.aw} ` : ""}${v.an || v.ad ? `${v.an || "_"}/${v.ad || "_"}` : ""}`;
      this.$emit("add-record", [
        `${num}/${den}×${times}＝${product}/${den}；答 ${product}/${den} ${unit}`,
        `${num}/${den}×${v.t}＝${v.p}/${den}；答 ${typedAns} ${unit}`,
        isCorrect ? "正確" : "錯誤",
      ]);
      if (isCorrect) {
        this.answered = true;
        this.feedback = "";
        this.closePad();
        this.$emit("play-effect", "CorrectSound");
        if (this.gameData.reference)
          this.revealTimer = setTimeout(
            () => this.$emit("next-question"),
            REVEAL_MS
          );
        else this.$emit("next-question");
      } else {
        this.feedback = wrong.includes("p")
          ? `分母不變，分子要乘 ${v.t || "幾"}，算算看 ${num} × ${v.t || "？"} 是多少？`
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

.work-hint {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  font-size: 1.05rem;
  color: #6d4c41;
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
}

.sign,
.unit {
  font-size: 1.8rem;
  font-weight: $font-bold;
  color: #333333;
}

.reference {
  font-size: 1.3rem;
  font-weight: $font-bold;
  color: #2e7d32;
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

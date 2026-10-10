<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <div class="work-panel">
        <button
          v-if="!answered"
          type="button"
          class="calc-toggle calc-toggle--scratch"
          @click="toggleScratch"
        >
          {{ scratchOpen ? "收起計算紙" : "打開計算紙" }}
        </button>
        <p class="question-text">{{ q.question }}</p>

        <div class="work">
          <div class="work-row">
            <span class="work-label">做法：</span>
            <button v-bind="box('a0')" @click="activate('a0')">
              {{ values.a0 }}
            </button>
            <span class="unit">{{ q.bigUnit }}</span>
            <button v-bind="box('a1')" @click="activate('a1')">
              {{ values.a1 }}
            </button>
            <span class="unit">{{ q.smallUnit }}</span>
            <button v-bind="box('op')" class="box--op" @click="activate('op')">
              {{ OP_LABEL[values.op] || "" }}
            </button>
            <button v-bind="box('b0')" @click="activate('b0')">
              {{ values.b0 }}
            </button>
            <span class="unit">{{ q.bigUnit }}</span>
            <button v-bind="box('b1')" @click="activate('b1')">
              {{ values.b1 }}
            </button>
            <span class="unit">{{ q.smallUnit }}</span>
          </div>
          <div class="work-row">
            <span class="work-label" />
            <span class="sign">＝</span>
            <button v-bind="box('r0')" @click="activate('r0')">
              {{ values.r0 }}
            </button>
            <span class="unit">{{ q.bigUnit }}</span>
            <button v-bind="box('r1')" @click="activate('r1')">
              {{ values.r1 }}
            </button>
            <span class="unit">{{ q.smallUnit }}</span>
          </div>
          <div class="work-row">
            <span class="work-label">答：</span>
            <button v-bind="box('ans0')" @click="activate('ans0')">
              {{ values.ans0 }}
            </button>
            <span class="unit">{{ q.bigUnit }}</span>
            <button v-bind="box('ans1')" @click="activate('ans1')">
              {{ values.ans1 }}
            </button>
            <span class="unit">{{ q.smallUnit }}</span>
          </div>
        </div>

        <p class="feedback">{{ feedback }}</p>
      </div>

      <!-- 時間直式計算紙：只是算算看，不計分；關掉再打開會保留寫過的內容 -->
      <div v-show="scratchOpen && !answered" class="scratch">
        <div class="scratch__head">
          <span>計算紙（算算看，不計分）</span>
          <span class="scratch__buttons">
            <button
              type="button"
              class="scratch__btn scratch__btn--clear"
              data-pad-avoid
              @click="clearScratch"
            >
              清除
            </button>
            <button
              type="button"
              class="scratch__btn"
              data-pad-avoid
              @click="toggleScratch"
            >
              關閉
            </button>
          </span>
        </div>
        <TimeVerticalScratch
          ref="scratch"
          :a="q.a"
          :b="q.b"
          :op="q.op"
          :factor="q.factor"
          :big-unit="q.bigUnit"
          :small-unit="q.smallUnit"
          @focus="onScratchFocus"
        />
      </div>

      <FieldPad
        :field="answered ? null : activeEl"
        :kind="active === 'op' ? 'operator' : 'number'"
        :operators="OPS"
        @press="press"
        @close="closePad"
      />
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import FieldPad from "../Common/FieldPad.vue";
import TimeVerticalScratch from "./TimeVerticalScratch.vue";

const OPS = ["+", "-"];
const OP_LABEL = { "+": "＋", "-": "－" };
const KEYS = ["a0", "a1", "op", "b0", "b1", "r0", "r1", "ans0", "ans1"];
const MAX_LENGTH = 3;

// 時間量的加減（應用題）共用：
// 填完整橫式「a 大 a 小 ＋/－ b 大 b 小 ＝ r 大 r 小」與答案；加法兩個時間量可交換
// 結果要換好單位（小單位要小於 factor）；以整數計算
// 可打開時間直式計算紙（進位／退位），不計分
// 題目 { question, bigUnit, smallUnit, factor, op, a: [大, 小], b: [大, 小], result: [大, 小] }
export default {
  name: "TimeArithmeticQuestion",
  components: { FieldPad, TimeVerticalScratch },
  props: {
    gameData: { type: Object, required: true },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      OPS,
      OP_LABEL,
      values: Object.fromEntries(KEYS.map((k) => [k, ""])),
      active: null,
      activeEl: null,
      wrongKeys: [],
      feedback: "",
      scratchOpen: false,
      answered: false,
    };
  },
  computed: {
    q() {
      return this.gameData;
    },
    gameIntroText() {
      return this.introText?.Content || "把做法和答案記下來";
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    box(key) {
      return {
        type: "button",
        class: [
          "box",
          {
            "box--active": !this.answered && this.active === key,
            "box--wrong": this.wrongKeys.includes(key),
            "box--correct": this.answered,
          },
        ],
        "data-key": key,
        "data-pad-field": "",
        "aria-label": key === "op" ? "運算符號" : "數字",
      };
    },
    activate(key) {
      if (this.answered) return;
      if (this.active === "scratch") this.$refs.scratch?.blur();
      this.active = key;
      this.activeEl = this.$el.querySelector(`[data-key="${key}"]`);
    },
    onScratchFocus(cell) {
      this.active = "scratch";
      this.activeEl = this.$el.querySelector(`.scratch [data-cell="${cell}"]`);
    },
    closePad() {
      if (this.active === "scratch") this.$refs.scratch?.blur();
      this.active = null;
      this.activeEl = null;
    },
    toggleScratch() {
      if (this.active === "scratch") this.closePad();
      this.scratchOpen = !this.scratchOpen;
    },
    clearScratch() {
      if (this.active === "scratch") this.closePad();
      this.$refs.scratch?.clear();
    },
    press(key) {
      if (this.answered || !this.active) return;
      if (this.active === "scratch") {
        this.$refs.scratch?.input(key);
        return;
      }
      const k = this.active;
      const current = this.values[k];
      let next = current;
      if (k === "op") {
        if (OPS.includes(key)) next = key;
        else if (key === "clear" || key === "←") next = "";
      } else if (key === "clear") next = "";
      else if (key === "←") next = current.slice(0, -1);
      else if (/^\d$/.test(key) && current.length < MAX_LENGTH)
        next = current === "0" ? key : current + key;
      this.values = { ...this.values, [k]: next };
      this.wrongKeys = this.wrongKeys.filter((w) => w !== k);
      this.feedback = "";
      // 選好符號就跳到下一格
      if (k === "op" && OPS.includes(key)) this.activate("b0");
    },
    findWrong() {
      const v = this.values;
      const n = (k) => Number(v[k]);
      const { a, b, op, result } = this.q;
      const wrong = [];
      const pairMiss = (x, y) =>
        [`${x}0`, `${x}1`].filter((k, i) => n(k) !== y[i]);
      // 加法時兩個時間量交換也算對：取錯得比較少的那種對法
      let ab = [...pairMiss("a", a), ...pairMiss("b", b)];
      if (op === "+") {
        const swapped = [...pairMiss("a", b), ...pairMiss("b", a)];
        if (swapped.length < ab.length) ab = swapped;
      }
      wrong.push(...ab);
      if (v.op !== op) wrong.push("op");
      ["r", "ans"].forEach((p) => {
        if (n(`${p}0`) !== result[0]) wrong.push(`${p}0`);
        if (n(`${p}1`) !== result[1]) wrong.push(`${p}1`);
      });
      return wrong;
    },
    checkAnswer() {
      if (this.answered) return;
      const empty = KEYS.filter((k) => this.values[k] === "");
      if (empty.length) {
        this.wrongKeys = empty;
        this.feedback = "空白的格子都要填喔！";
        return;
      }
      const { a, b, op, result, bigUnit, smallUnit, factor } = this.q;
      const v = this.values;
      const t = (x, y) => `${x} ${bigUnit} ${y} ${smallUnit}`;
      const wrong = this.findWrong();
      const isCorrect = wrong.length === 0;
      this.$emit("add-record", [
        `${t(...a)} ${OP_LABEL[op]} ${t(...b)} ＝ ${t(...result)}`,
        `${t(v.a0, v.a1)} ${OP_LABEL[v.op]} ${t(v.b0, v.b1)} ＝ ${t(v.r0, v.r1)}；答 ${t(v.ans0, v.ans1)}`,
        isCorrect ? "正確" : "錯誤",
      ]);
      if (isCorrect) {
        this.answered = true;
        this.wrongKeys = [];
        this.feedback = "";
        this.closePad();
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
        return;
      }
      this.wrongKeys = wrong;
      const resultWrong = wrong.some((k) => /^(r|ans)/.test(k));
      this.feedback =
        resultWrong && Number(v.r1) >= factor
          ? `${smallUnit}滿 ${factor} 要換成 1 ${bigUnit}喔！`
          : `紅色的格子不對！1 ${bigUnit}＝${factor} ${smallUnit}，可以打開計算紙算算看。`;
      this.$emit("play-effect", "WrongSound");
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
  align-items: center;
  gap: 1.2rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small;
}

.work-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.calc-toggle {
  align-self: flex-end;
  padding: 0.35rem 1rem;
  font-size: 1.2rem;
  font-weight: $font-bold;
  color: #ffffff;
  border: none;
  border-radius: 12px;
  cursor: pointer;

  &--scratch {
    background-color: #26a69a;
    box-shadow: 0 3px 0 #00796b;
  }
}

.question-text {
  margin: 0;
  padding: 0.8rem 1.2rem;
  font-size: 1.6rem;
  font-weight: $font-bold;
  line-height: 1.6;
  color: #4e342e;
  background-color: #fff8e1;
  border: 3px solid #ffcc80;
  border-radius: 16px;
}

.work {
  align-self: flex-start;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.8rem 1.2rem;
  background-color: #ffffff;
  border-radius: 16px;
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.1);
}

.work-row {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.35rem;
}

.work-label {
  min-width: 4.6rem;
  white-space: nowrap;
  font-size: 1.45rem;
  font-weight: $font-bold;
  color: #00695c;
}

.sign {
  font-size: 1.8rem;
  font-weight: $font-bold;
  color: #333333;
}

.unit {
  white-space: nowrap;
  font-size: 1.35rem;
  font-weight: $font-bold;
  color: #5d4037;
}

.box {
  width: 3.6rem;
  height: 2.8rem;
  font-size: 1.7rem;
  font-weight: $font-bold;
  color: #1565c0;
  background-color: #ffffff;
  border: 3px dashed #90a4ae;
  border-radius: 10px;
  cursor: pointer;

  &--op {
    width: 2.8rem;
    margin: 0 0.3rem;
    color: #e65100;
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
  min-height: 1.6em;
  margin: 0;
  font-size: 1.25rem;
  font-weight: $font-bold;
  color: #c62828;
}

.scratch {
  align-self: stretch;
  flex-shrink: 0;
  width: 19rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.5rem;
  background-color: #e0f2f1;
  border: 3px solid #80cbc4;
  border-radius: 18px;

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.3rem;
    font-size: 1rem;
    font-weight: $font-bold;
    color: #00695c;
  }

  &__buttons {
    display: flex;
    gap: 0.3rem;
  }

  &__btn {
    white-space: nowrap;
    padding: 0.2rem 0.6rem;
    font-size: 1rem;
    font-weight: $font-bold;
    color: #ffffff;
    background-color: #ef5350;
    border: none;
    border-radius: 10px;
    cursor: pointer;

    &--clear {
      background-color: #78909c;
    }
  }
}

@media (max-width: 1100px), (max-height: 760px) {
  .question-text {
    font-size: 1.35rem;
    padding: 0.6rem 1rem;
  }

  .work-label {
    min-width: 3.8rem;
    font-size: 1.25rem;
  }

  .box {
    width: 3.1rem;
    height: 2.5rem;
    font-size: 1.45rem;

    &--op {
      width: 2.5rem;
    }
  }

  .unit {
    font-size: 1rem;
  }

  .work {
    padding: 0.7rem 0.9rem;
  }

  .scratch {
    width: 16.5rem;
  }
}
</style>

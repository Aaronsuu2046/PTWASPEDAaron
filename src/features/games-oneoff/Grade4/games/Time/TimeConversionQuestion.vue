<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <p class="question">
        <template v-if="isToSmall">
          {{ q.big }} {{ q.bigUnit }} {{ q.small }} {{ q.smallUnit }} ＝ ？{{
            q.smallUnit
          }}
        </template>
        <template v-else>
          {{ q.total }} {{ q.smallUnit }} ＝ ？{{ q.bigUnit }} ？{{
            q.smallUnit
          }}
        </template>
      </p>

      <div class="hint" data-pad-avoid>
        <div class="hint__facts">
          <span v-for="fact in FACTS" :key="fact" class="hint__fact">{{
            fact
          }}</span>
        </div>
        <TimeNumberLine
          :mode="q.mode"
          :factor="q.factor"
          :big="q.big"
          :small="q.small"
          :total="q.total"
          :big-unit="q.bigUnit"
          :small-unit="q.smallUnit"
        />
      </div>

      <div class="work">
        <template v-if="isToSmall">
          <div class="work-row">
            <span class="work-label">做法：</span>
            <button v-bind="box('m1')" @click="activate('m1')">
              {{ values.m1 }}
            </button>
            <span class="sign">×</span>
            <button v-bind="box('m2')" @click="activate('m2')">
              {{ values.m2 }}
            </button>
            <span class="sign">＝</span>
            <button v-bind="box('mp')" @click="activate('mp')">
              {{ values.mp }}
            </button>
          </div>
          <div class="work-row">
            <span class="work-label" />
            <button v-bind="box('a1')" @click="activate('a1')">
              {{ values.a1 }}
            </button>
            <span class="sign">＋</span>
            <button v-bind="box('a2')" @click="activate('a2')">
              {{ values.a2 }}
            </button>
            <span class="sign">＝</span>
            <button v-bind="box('as')" @click="activate('as')">
              {{ values.as }}
            </button>
          </div>
          <div class="work-row">
            <span class="work-label">答：</span>
            <button v-bind="box('ans')" @click="activate('ans')">
              {{ values.ans }}
            </button>
            <span class="unit">{{ q.smallUnit }}</span>
          </div>
        </template>
        <template v-else>
          <div class="work-row">
            <span class="work-label">做法：</span>
            <button v-bind="box('d1')" @click="activate('d1')">
              {{ values.d1 }}
            </button>
            <span class="sign">÷</span>
            <button v-bind="box('d2')" @click="activate('d2')">
              {{ values.d2 }}
            </button>
            <span class="sign">＝</span>
            <button v-bind="box('dq')" @click="activate('dq')">
              {{ values.dq }}
            </button>
            <span class="sign">…</span>
            <button v-bind="box('dr')" @click="activate('dr')">
              {{ values.dr }}
            </button>
          </div>
          <div class="work-row">
            <span class="work-label">答：</span>
            <button v-bind="box('ansBig')" @click="activate('ansBig')">
              {{ values.ansBig }}
            </button>
            <span class="unit">{{ q.bigUnit }}</span>
            <button v-bind="box('ansSmall')" @click="activate('ansSmall')">
              {{ values.ansSmall }}
            </button>
            <span class="unit">{{ q.smallUnit }}</span>
          </div>
        </template>
      </div>

      <p class="feedback">{{ feedback }}</p>

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
import FieldPad from "../Common/FieldPad.vue";
import TimeNumberLine from "./TimeNumberLine.vue";

const FACTS = ["1 日＝24 小時", "1 小時＝60 分鐘", "1 分鐘＝60 秒"];
const KEYS = {
  toSmall: ["m1", "m2", "mp", "a1", "a2", "as", "ans"],
  toBig: ["d1", "d2", "dq", "dr", "ansBig", "ansSmall"],
};
const MAX_LENGTH = 4;

// 兩個數的格子：兩數交換也算對（乘法、加法）；回傳錯的格子
function pairWrong(values, keys, expected) {
  const got = keys.map((k) => Number(values[k]));
  const want = [...expected].sort((a, b) => a - b);
  if ([...got].sort((a, b) => a - b).every((v, i) => v === want[i])) return [];
  // 在對的位置上的保留，其餘標錯
  const inOrder = keys.filter((k, i) => got[i] !== expected[i]);
  const swapped = keys.filter((k, i) => got[i] !== expected[1 - i]);
  return inOrder.length <= swapped.length ? inOrder : swapped;
}

// 時間單位換算共用：
// toSmall（例 4 日 12 小時＝？小時）：填「因數×因數＝積」「積＋剩下＝和」與答案（乘法、加法兩數可交換）
// toBig（例 28 小時＝？日？小時）：填「被除數÷除數＝商…餘數」與「? 大單位 ? 小單位」
// 都以整數計算；上方固定顯示換算提示和數線
// 題目 { mode, bigUnit, smallUnit, factor, big, small, total }
export default {
  name: "TimeConversionQuestion",
  components: { FieldPad, TimeNumberLine },
  props: {
    gameData: { type: Object, required: true },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      FACTS,
      values: Object.fromEntries(KEYS[this.gameData.mode].map((k) => [k, ""])),
      active: null,
      activeEl: null,
      wrongKeys: [],
      feedback: "",
      answered: false,
    };
  },
  computed: {
    q() {
      return this.gameData;
    },
    isToSmall() {
      return this.q.mode === "toSmall";
    },
    gameIntroText() {
      return this.introText?.Content || "把做法和答案記下來";
    },
    keys() {
      return KEYS[this.q.mode];
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
        "aria-label": "數字",
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
    findWrong() {
      const v = this.values;
      const { factor, big, small, total } = this.q;
      const n = (k) => Number(v[k]);
      if (this.isToSmall) {
        const product = factor * big;
        return [
          ...pairWrong(v, ["m1", "m2"], [factor, big]),
          ...(n("mp") === product ? [] : ["mp"]),
          ...pairWrong(v, ["a1", "a2"], [product, small]),
          ...(n("as") === total ? [] : ["as"]),
          ...(n("ans") === total ? [] : ["ans"]),
        ];
      }
      const expect = {
        d1: total,
        d2: factor,
        dq: big,
        dr: small,
        ansBig: big,
        ansSmall: small,
      };
      return Object.keys(expect).filter((k) => n(k) !== expect[k]);
    },
    checkAnswer() {
      if (this.answered) return;
      const empty = this.keys.filter((k) => this.values[k] === "");
      if (empty.length) {
        this.wrongKeys = empty;
        this.feedback = "空白的格子都要填喔！";
        return;
      }
      const wrong = this.findWrong();
      const { bigUnit, smallUnit, factor, big, small, total } = this.q;
      const v = this.values;
      const expected = this.isToSmall
        ? `${factor}×${big}＝${factor * big}；${factor * big}＋${small}＝${total}；${total} ${smallUnit}`
        : `${total}÷${factor}＝${big}…${small}；${big} ${bigUnit} ${small} ${smallUnit}`;
      const typed = this.isToSmall
        ? `${v.m1}×${v.m2}＝${v.mp}；${v.a1}＋${v.a2}＝${v.as}；${v.ans} ${smallUnit}`
        : `${v.d1}÷${v.d2}＝${v.dq}…${v.dr}；${v.ansBig} ${bigUnit} ${v.ansSmall} ${smallUnit}`;
      const isCorrect = wrong.length === 0;
      this.$emit("add-record", [expected, typed, isCorrect ? "正確" : "錯誤"]);
      if (isCorrect) {
        this.answered = true;
        this.wrongKeys = [];
        this.feedback = "";
        this.closePad();
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
      } else {
        this.wrongKeys = wrong;
        this.feedback = `紅色的格子不對！1 ${bigUnit}＝${factor} ${smallUnit}，再想一想。`;
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
  padding: $padding--small $padding--medium;
}

.question {
  margin: 0;
  padding: 0.4rem 1.6rem;
  font-size: 2rem;
  font-weight: $font-bold;
  color: #4e342e;
  background-color: #fff8e1;
  border: 3px solid #ffcc80;
  border-radius: 16px;
}

.hint {
  width: 100%;
  max-width: 44rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  padding: 0.4rem 1rem 0.2rem;
  background-color: #ffffff;
  border-radius: 16px;

  &__facts {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem 1rem;
  }

  &__fact {
    padding: 0.1rem 0.8rem;
    font-size: 1.15rem;
    font-weight: $font-bold;
    color: #00695c;
    background-color: #e0f2f1;
    border-radius: 10px;
  }
}

.work {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.7rem 1.4rem;
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

.sign,
.unit {
  font-size: 1.8rem;
  font-weight: $font-bold;
  color: #333333;
}

.box {
  width: 5rem;
  height: 3rem;
  font-size: 1.8rem;
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
  min-height: 1.6em;
  margin: 0;
  text-align: center;
  font-size: 1.25rem;
  font-weight: $font-bold;
  color: #c62828;
}

@media (max-width: 1100px), (max-height: 760px) {
  .question {
    font-size: 1.6rem;
  }

  .hint__fact {
    font-size: 1rem;
  }

  .work {
    gap: 0.45rem;
    padding: 0.5rem 1rem;
  }

  .work-label {
    min-width: 4rem;
    font-size: 1.3rem;
  }

  .box {
    width: 4.4rem;
    height: 2.6rem;
    font-size: 1.5rem;
  }
}
</style>

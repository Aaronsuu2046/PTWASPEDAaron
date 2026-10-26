<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <p class="question-text">{{ q.question }}</p>

      <div class="hint" data-pad-avoid>
        <p class="hint__rule">{{ rule }}</p>
        <DayTimeline
          :start="q.start"
          :end="q.end"
          :midnights="q.midnights"
          :unknown="unknown"
        />
        <p v-if="q.mode !== 'between'" class="hint__dur">
          經過時間：{{ q.hours }} 小時
        </p>
      </div>

      <div class="answer">
        <span class="answer__label">答：</span>
        <template v-if="q.mode === 'between'">
          <button v-bind="box('days')" @click="activate('days')">
            {{ values.days }}
          </button>
          <span class="unit">日</span>
          <button v-bind="box('hours')" @click="activate('hours')">
            {{ values.hours }}
          </button>
          <span class="unit">小時</span>
        </template>
        <template v-else>
          <button v-bind="box('month')" @click="activate('month')">
            {{ values.month }}
          </button>
          <span class="unit">月</span>
          <button v-bind="box('day')" @click="activate('day')">
            {{ values.day }}
          </button>
          <span class="unit">日</span>
          <span
            class="periods"
            :class="{ 'periods--wrong': wrongKeys.includes('period') }"
          >
            <button
              v-for="p in PERIODS"
              :key="p"
              type="button"
              class="period"
              :class="{
                'period--on': values.period === p,
                'period--correct': answered && values.period === p,
              }"
              :data-period="p"
              @click="choosePeriod(p)"
            >
              {{ p }}
            </button>
          </span>
          <button v-bind="box('hour')" @click="activate('hour')">
            {{ values.hour }}
          </button>
          <span class="unit">時</span>
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
import DayTimeline from "./DayTimeline.vue";

const PERIODS = ["上午", "下午"];
const MAX_LENGTH = 3;
const RULES = {
  after: "開始的日期時刻 ＋ 經過時間 ＝ 結束的日期時刻（1 日＝24 小時）",
  before: "結束的日期時刻 － 經過時間 ＝ 開始的日期時刻（1 日＝24 小時）",
  between: "結束的日期時刻 － 開始的日期時刻 ＝ 經過時間（1 日＝24 小時）",
};

// 跨日的時間計算：
// after：開始日期時刻＋經過的小時 → 答「? 月 ? 日 上午／下午 ? 時」
// before：結束日期時刻－經過的小時 → 答開始的日期時刻
// between：兩個日期時刻 → 答「? 日 ? 小時」
// 日期與小時都由題庫依真實曆法算好（整數小時），這裡只比對
// 題目 { question, mode, start, end: { month, day, period, hour, offset }, hours, midnights, answer? }
export default {
  name: "DateTimeQuestion",
  components: { FieldPad, DayTimeline },
  props: {
    gameData: { type: Object, required: true },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      PERIODS,
      values: Object.fromEntries(this.allKeys().map((k) => [k, ""])),
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
    gameIntroText() {
      return this.introText?.Content || "把答案記下來";
    },
    rule() {
      return RULES[this.q.mode];
    },
    unknown() {
      return { after: "end", before: "start" }[this.q.mode] || "";
    },
    // after／before 要求的日期時刻
    target() {
      return this.q.mode === "after" ? this.q.end : this.q.start;
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    allKeys() {
      return this.gameData.mode === "between"
        ? ["days", "hours"]
        : ["month", "day", "period", "hour"];
    },
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
    choosePeriod(p) {
      if (this.answered) return;
      this.values = { ...this.values, period: p };
      this.wrongKeys = this.wrongKeys.filter((w) => w !== "period");
      this.feedback = "";
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
    expected() {
      if (this.q.mode === "between")
        return { days: this.q.answer[0], hours: this.q.answer[1] };
      const t = this.target;
      return { month: t.month, day: t.day, period: t.period, hour: t.hour };
    },
    checkAnswer() {
      if (this.answered) return;
      const keys = this.allKeys();
      const empty = keys.filter((k) => this.values[k] === "");
      if (empty.length) {
        this.wrongKeys = empty;
        this.feedback = empty.includes("period")
          ? "記得選上午或下午，空白的格子也都要填喔！"
          : "空白的格子都要填喔！";
        return;
      }
      const want = this.expected();
      const v = this.values;
      const wrong = keys.filter((k) =>
        k === "period" ? v[k] !== want[k] : Number(v[k]) !== want[k]
      );
      const text = (o) =>
        this.q.mode === "between"
          ? `${o.days} 日 ${o.hours} 小時`
          : `${o.month} 月 ${o.day} 日${o.period} ${o.hour} 時`;
      const isCorrect = wrong.length === 0;
      this.$emit("add-record", [
        text(want),
        text(v),
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
      this.feedback =
        this.q.mode === "between"
          ? "紅色的格子不對！先數跨過幾個午夜，再算剩下幾小時。"
          : "紅色的地方不對！看看數線，過了午夜就是下一天喔。";
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

.question-text {
  margin: 0;
  padding: 0.6rem 1.2rem;
  font-size: 1.55rem;
  font-weight: $font-bold;
  line-height: 1.5;
  color: #4e342e;
  background-color: #fff8e1;
  border: 3px solid #ffcc80;
  border-radius: 16px;
}

.hint {
  width: 100%;
  max-width: 46rem;
  padding: 0.4rem 1rem 0.2rem;
  background-color: #ffffff;
  border-radius: 16px;

  &__rule {
    margin: 0;
    text-align: center;
    font-size: 1.15rem;
    font-weight: $font-bold;
    color: #00695c;
  }

  &__dur {
    margin: 0;
    text-align: center;
    font-size: 1.15rem;
    font-weight: $font-bold;
    color: #e65100;
  }
}

.answer {
  align-self: flex-start;
  margin-left: 2rem;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.8rem 1.4rem;
  background-color: #ffffff;
  border-radius: 16px;
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.1);

  &__label {
    font-size: 1.6rem;
    font-weight: $font-bold;
    color: #00695c;
  }
}

.unit {
  white-space: nowrap;
  font-size: 1.5rem;
  font-weight: $font-bold;
  color: #5d4037;
}

.periods {
  display: inline-flex;
  gap: 0.3rem;
  margin: 0 0.3rem;
  padding: 0.2rem;
  border: 3px solid transparent;
  border-radius: 12px;

  &--wrong {
    border-color: #e53935;
    background-color: #ffebee;
  }
}

.period {
  padding: 0.35rem 0.9rem;
  font-size: 1.4rem;
  font-weight: $font-bold;
  color: #5d4037;
  background-color: #fff3e0;
  border: 3px solid #ffcc80;
  border-radius: 10px;
  cursor: pointer;

  &--on {
    color: #ffffff;
    background-color: #ff9800;
    border-color: #e65100;
  }

  &--correct {
    background-color: #43a047;
    border-color: #2e7d32;
  }
}

.box {
  width: 3.8rem;
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
  font-size: 1.25rem;
  font-weight: $font-bold;
  color: #c62828;
}

@media (max-width: 1100px), (max-height: 760px) {
  .question-text {
    font-size: 1.3rem;
  }

  .hint__rule,
  .hint__dur {
    font-size: 1rem;
  }

  .box {
    width: 3.3rem;
    height: 2.7rem;
    font-size: 1.55rem;
  }

  .unit {
    font-size: 1.3rem;
  }

  .period {
    font-size: 1.2rem;
  }
}
</style>

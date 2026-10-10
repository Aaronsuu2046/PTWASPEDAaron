<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <p class="question-text">{{ q.question }}</p>

      <div class="hint" data-pad-avoid>
        <p class="hint__rule">
          結束時刻 － 開始時刻 ＝ 經過時間
          <span v-if="crossesNoon" class="hint__sub">
            （下午的時刻可以先換成 24 時制，例如下午 1:00 是 13:00）
          </span>
        </p>
        <TimeTimeline
          :start="q.start"
          :end="q.end"
          :with-seconds="q.withSeconds"
        />
      </div>

      <div class="work">
        <div class="work-row">
          <span class="work-label">做法：</span>
          <template v-for="(part, side) in ['e', 's']" :key="part">
            <span v-if="side === 1" class="sign">－</span>
            <span class="time">
              <template v-for="(k, i) in timeKeys(part)" :key="k">
                <span v-if="i > 0" class="time__colon">:</span>
                <button v-bind="box(k)" @click="activate(k)">
                  {{ values[k] }}
                </button>
              </template>
            </span>
          </template>
        </div>
        <div class="work-row">
          <span class="work-label" />
          <span class="sign">＝</span>
          <button v-bind="box('r0')" @click="activate('r0')">
            {{ values.r0 }}
          </button>
          <span class="unit">{{ q.units[0] }}</span>
          <button v-bind="box('r1')" @click="activate('r1')">
            {{ values.r1 }}
          </button>
          <span class="unit">{{ q.units[1] }}</span>
        </div>
        <div class="work-row">
          <span class="work-label">答：</span>
          <button v-bind="box('a0')" @click="activate('a0')">
            {{ values.a0 }}
          </button>
          <span class="unit">{{ q.units[0] }}</span>
          <button v-bind="box('a1')" @click="activate('a1')">
            {{ values.a1 }}
          </button>
          <span class="unit">{{ q.units[1] }}</span>
        </div>
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
import TimeTimeline from "./TimeTimeline.vue";

const MAX_LENGTH = 2;

// 兩時刻間的時間量：做法「結束時刻 － 開始時刻 ＝ ? ?」再寫答案
// 時刻的「時」可寫 12 時制或 24 時制（下午 5:10 寫 5 或 17 都可以），其餘依題目；內部都以秒計算
// 題目 { question, start, end: { period, h, m, s, sec }, withSeconds, units: [大, 小], answer: [大, 小] }
export default {
  name: "TimeIntervalQuestion",
  components: { FieldPad, TimeTimeline },
  props: {
    gameData: { type: Object, required: true },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    const keys = this.allKeys();
    return {
      values: Object.fromEntries(keys.map((k) => [k, ""])),
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
      return this.introText?.Content || "把做法和答案記下來";
    },
    crossesNoon() {
      return this.q.start.period !== this.q.end.period;
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    timeKeys(part) {
      const n = this.gameData.withSeconds ? 3 : 2;
      return Array.from({ length: n }, (_, i) => `${part}${i}`);
    },
    allKeys() {
      return [
        ...this.timeKeys("e"),
        ...this.timeKeys("s"),
        "r0",
        "r1",
        "a0",
        "a1",
      ];
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
    // 時刻格子：時可寫 12 或 24 時制，分、秒要一樣
    timeWrong(part, t) {
      const n = (k) => Number(this.values[k]);
      const h24 = t.h + (t.period === "下午" && t.h !== 12 ? 12 : 0);
      const wrong = [];
      if (![t.h, h24].includes(n(`${part}0`))) wrong.push(`${part}0`);
      if (n(`${part}1`) !== t.m) wrong.push(`${part}1`);
      if (this.q.withSeconds && n(`${part}2`) !== t.s) wrong.push(`${part}2`);
      return wrong;
    },
    checkAnswer() {
      if (this.answered) return;
      const keys = this.allKeys();
      const empty = keys.filter((k) => this.values[k] === "");
      if (empty.length) {
        this.wrongKeys = empty;
        this.feedback = "空白的格子都要填喔！";
        return;
      }
      const { start, end, answer, units } = this.q;
      const n = (k) => Number(this.values[k]);
      const wrong = [
        ...this.timeWrong("e", end),
        ...this.timeWrong("s", start),
      ];
      ["r", "a"].forEach((p) => {
        if (n(`${p}0`) !== answer[0]) wrong.push(`${p}0`);
        if (n(`${p}1`) !== answer[1]) wrong.push(`${p}1`);
      });
      const v = this.values;
      const t = (part) =>
        this.timeKeys(part)
          .map((k) => v[k])
          .join(":");
      const isCorrect = wrong.length === 0;
      this.$emit("add-record", [
        `${answer[0]} ${units[0]} ${answer[1]} ${units[1]}`,
        `${t("e")} － ${t("s")} ＝ ${v.r0} ${units[0]} ${v.r1} ${units[1]}；答 ${v.a0} ${units[0]} ${v.a1} ${units[1]}`,
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
      this.feedback = wrong.some((k) => /^[es]/.test(k))
        ? "先把結束時刻寫在前面、開始時刻寫在後面喔！"
        : "紅色的格子不對！看看數線，一段一段算算看。";
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
  gap: 0.6rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small $padding--medium;
}

.question-text {
  margin: 0;
  padding: 0.6rem 1.2rem;
  font-size: 1.6rem;
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
  padding: 0.3rem 1rem 0.1rem;
  background-color: #ffffff;
  border-radius: 16px;

  &__rule {
    margin: 0;
    text-align: center;
    font-size: 1.2rem;
    font-weight: $font-bold;
    color: #00695c;
  }

  &__sub {
    font-size: 1rem;
    color: #1565c0;
  }
}

.work {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding: 0.7rem 1.2rem;
  background-color: #ffffff;
  border-radius: 16px;
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.1);
}

.work-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.work-label {
  min-width: 4.6rem;
  white-space: nowrap;
  font-size: 1.45rem;
  font-weight: $font-bold;
  color: #00695c;
}

.time {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  padding: 0.2rem 0.4rem;
  background-color: #e3f2fd;
  border-radius: 10px;

  &__colon {
    font-size: 1.8rem;
    font-weight: $font-bold;
    color: #0d47a1;
  }
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
  width: 3.4rem;
  height: 2.7rem;
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
  min-height: 1.6em;
  margin: 0;
  font-size: 1.25rem;
  font-weight: $font-bold;
  color: #c62828;
}

@media (max-width: 1100px), (max-height: 760px) {
  .question-text {
    font-size: 1.35rem;
  }

  .hint__rule {
    font-size: 1.05rem;
  }

  .work {
    padding: 0.5rem 0.9rem;
    gap: 0.4rem;
  }

  .work-label {
    min-width: 3.8rem;
    font-size: 1.25rem;
  }

  .box {
    width: 3rem;
    height: 2.4rem;
    font-size: 1.4rem;
  }

  .unit {
    font-size: 1.1rem;
  }
}
</style>

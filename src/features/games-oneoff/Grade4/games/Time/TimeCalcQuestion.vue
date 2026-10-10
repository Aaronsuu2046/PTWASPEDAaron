<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <p class="question-text">{{ q.question }}</p>

      <div class="hint" data-pad-avoid>
        <p class="hint__rule">
          {{
            isForward
              ? "開始時刻 ＋ 經過時間 ＝ 結束時刻"
              : "結束時刻 － 經過時間 ＝ 開始時刻"
          }}
          <span v-if="q.crossesNoon" class="hint__sub">
            （跨過中午先用 24 時制算，例如下午
            1:00＝13:00，最後再換回上午／下午）
          </span>
        </p>
        <TimeTimeline
          :start="q.start"
          :end="q.end"
          :unknown="isForward ? 'end' : 'start'"
        />
        <p class="hint__dur">經過時間：{{ q.durationText }}</p>
      </div>

      <div class="work">
        <div class="work-row">
          <span class="work-label">做法：</span>
          <span class="time">
            <button v-bind="box('t0')" @click="activate('t0')">
              {{ values.t0 }}
            </button>
            <span class="time__colon">:</span>
            <button v-bind="box('t1')" @click="activate('t1')">
              {{ values.t1 }}
            </button>
          </span>
          <span class="sign">{{ isForward ? "＋" : "－" }}</span>
          <template v-if="q.duration[0] > 0">
            <button v-bind="box('dh')" @click="activate('dh')">
              {{ values.dh }}
            </button>
            <span class="unit">小時</span>
          </template>
          <template v-if="q.duration[1] > 0">
            <button v-bind="box('dm')" @click="activate('dm')">
              {{ values.dm }}
            </button>
            <span class="unit">分鐘</span>
          </template>
        </div>
        <div class="work-row">
          <span class="work-label" />
          <span class="sign">＝</span>
          <span class="time">
            <button v-bind="box('u0')" @click="activate('u0')">
              {{ values.u0 }}
            </button>
            <span class="time__colon">:</span>
            <button v-bind="box('u1')" @click="activate('u1')">
              {{ values.u1 }}
            </button>
          </span>
        </div>
        <div class="work-row">
          <span class="work-label">答：</span>
          <span
            class="periods"
            :class="{ 'periods--wrong': wrongKeys.includes('ap') }"
          >
            <button
              v-for="p in PERIODS"
              :key="p"
              type="button"
              class="period"
              :class="{
                'period--on': values.ap === p,
                'period--correct': answered && values.ap === p,
              }"
              :data-period="p"
              @click="choosePeriod(p)"
            >
              {{ p }}
            </button>
          </span>
          <span class="time">
            <button v-bind="box('a0')" @click="activate('a0')">
              {{ values.a0 }}
            </button>
            <span class="time__colon">:</span>
            <button v-bind="box('a1')" @click="activate('a1')">
              {{ values.a1 }}
            </button>
          </span>
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

const PERIODS = ["上午", "下午"];
const MAX_LENGTH = 2;
const pad2 = (n) => String(n).padStart(2, "0");

// 時刻與時間量的計算：
// forward：開始時刻 ＋ 經過時間 ＝ 結束時刻；backward：結束時刻 － 經過時間 ＝ 開始時刻
// 做法的時刻：跨中午的題目，下午的時刻要寫 24 時制；沒跨中午可寫 12 或 24 時制
// 答案：選上午／下午，再寫 12 時制的時、分；內部以秒計算
// 題目 { question, mode, start, end: { period, h, m, sec }, duration: [時, 分], durationText, crossesNoon }
export default {
  name: "TimeCalcQuestion",
  components: { FieldPad, TimeTimeline },
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
    isForward() {
      return this.q.mode === "forward";
    },
    given() {
      return this.isForward ? this.q.start : this.q.end;
    },
    target() {
      return this.isForward ? this.q.end : this.q.start;
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
    allKeys() {
      const [dh, dm] = this.gameData.duration;
      return [
        "t0",
        "t1",
        ...(dh > 0 ? ["dh"] : []),
        ...(dm > 0 ? ["dm"] : []),
        "u0",
        "u1",
        "ap",
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
    choosePeriod(p) {
      if (this.answered) return;
      this.values = { ...this.values, ap: p };
      this.wrongKeys = this.wrongKeys.filter((w) => w !== "ap");
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
    // 做法裡的時刻：跨中午時下午要用 24 時制，否則 12、24 時制都可以
    timeWrong(part, t) {
      const n = (k) => Number(this.values[k]);
      const afternoon = t.period === "下午" && t.h !== 12;
      const h24 = t.h + (afternoon ? 12 : 0);
      const okHours = this.q.crossesNoon && afternoon ? [h24] : [t.h, h24];
      const wrong = [];
      if (!okHours.includes(n(`${part}0`))) wrong.push(`${part}0`);
      if (n(`${part}1`) !== t.m) wrong.push(`${part}1`);
      return wrong;
    },
    checkAnswer() {
      if (this.answered) return;
      const keys = this.allKeys();
      const empty = keys.filter((k) => this.values[k] === "");
      if (empty.length) {
        this.wrongKeys = empty;
        this.feedback = empty.includes("ap")
          ? "記得選上午或下午，空白的格子也都要填喔！"
          : "空白的格子都要填喔！";
        return;
      }
      const n = (k) => Number(this.values[k]);
      const [dh, dm] = this.q.duration;
      const wrong = [...this.timeWrong("t", this.given)];
      if (dh > 0 && n("dh") !== dh) wrong.push("dh");
      if (dm > 0 && n("dm") !== dm) wrong.push("dm");
      wrong.push(...this.timeWrong("u", this.target));
      if (this.values.ap !== this.target.period) wrong.push("ap");
      if (n("a0") !== this.target.h) wrong.push("a0");
      if (n("a1") !== this.target.m) wrong.push("a1");
      const v = this.values;
      const tt = this.target;
      const isCorrect = wrong.length === 0;
      this.$emit("add-record", [
        `${tt.period} ${tt.h}:${pad2(tt.m)}`,
        `${v.t0}:${v.t1} ${this.isForward ? "＋" : "－"} ${this.q.durationText} ＝ ${v.u0}:${v.u1}；答 ${v.ap} ${v.a0}:${v.a1}`,
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
      const timeWrong = wrong.some((k) => /^[tu]0$/.test(k));
      this.feedback =
        timeWrong && this.q.crossesNoon
          ? "跨過中午，下午的時刻要先寫成 24 時制喔（下午 1:00＝13:00）！"
          : "紅色的地方不對，看看數線再想一想！";
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
  gap: 0.5rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small $padding--medium;
}

.question-text {
  margin: 0;
  padding: 0.5rem 1.2rem;
  font-size: 1.5rem;
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
  padding: 0.3rem 1rem 0.2rem;
  background-color: #ffffff;
  border-radius: 16px;

  &__rule {
    margin: 0;
    text-align: center;
    font-size: 1.15rem;
    font-weight: $font-bold;
    color: #00695c;
  }

  &__sub {
    font-size: 1rem;
    color: #1565c0;
  }

  &__dur {
    margin: 0;
    text-align: center;
    font-size: 1.1rem;
    font-weight: $font-bold;
    color: #e65100;
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
  gap: 0.4rem;
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
  font-size: 1.3rem;
  font-weight: $font-bold;
  color: #5d4037;
}

.periods {
  display: inline-flex;
  gap: 0.3rem;
  padding: 0.2rem;
  border: 3px solid transparent;
  border-radius: 12px;

  &--wrong {
    border-color: #e53935;
    background-color: #ffebee;
  }
}

.period {
  padding: 0.3rem 0.8rem;
  font-size: 1.35rem;
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
  font-size: 1.2rem;
  font-weight: $font-bold;
  color: #c62828;
}

@media (max-width: 1100px), (max-height: 760px) {
  .question-text {
    font-size: 1.15rem;
  }

  .game-area {
    gap: 0.35rem;
  }

  .question-text {
    padding: 0.35rem 1rem;
  }

  .hint {
    max-width: 34rem;
    padding: 0.2rem 0.8rem 0.1rem;
  }

  .hint__rule {
    font-size: 1rem;
  }

  .hint__dur {
    font-size: 1rem;
  }

  .hint__sub {
    font-size: 0.9rem;
  }

  .work {
    padding: 0.4rem 0.9rem;
    gap: 0.3rem;
  }

  .work-label {
    min-width: 3.8rem;
    font-size: 1.25rem;
  }

  .box {
    width: 2.9rem;
    height: 2.4rem;
    font-size: 1.4rem;
  }

  .unit {
    font-size: 1.1rem;
  }

  .period {
    font-size: 1.15rem;
  }
}
</style>

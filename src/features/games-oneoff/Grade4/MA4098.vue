<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <!-- 題目：{a}、{b} 換成直式分數 -->
      <p class="question">
        <template v-for="(seg, k) in questionParts" :key="k">
          <span v-if="seg.text">{{ seg.text }}</span>
          <span v-else class="qnum" v-html="numberHtml(seg.num)" />
        </template>
      </p>

      <div class="work">
        <div v-for="(row, r) in gameData.rows" :key="r" class="work-row">
          <span class="work-label">{{ r === 0 ? "做法：" : "" }}</span>
          <template v-for="(term, t) in row" :key="t">
            <span v-if="term.kind === 'eq'" class="sign">＝</span>
            <button
              v-else-if="term.kind === 'op'"
              v-bind="box(`r${r}t${t}o`)"
              class="box box--op"
              @click="activate(`r${r}t${t}o`)"
            >
              {{ showOp(values[`r${r}t${t}o`]) }}
            </button>
            <button
              v-else-if="term.kind === 'int'"
              v-bind="box(`r${r}t${t}v`)"
              class="box box--int"
              @click="activate(`r${r}t${t}v`)"
            >
              {{ values[`r${r}t${t}v`] }}
            </button>
            <FracBoxes
              v-else
              :prefix="`r${r}t${t}`"
              :whole="term.whole"
              :values="values"
              :box="box"
              @pick="activate"
            />
          </template>
        </div>

        <div class="work-row">
          <span class="work-label">答：</span>
          <FracBoxes
            prefix="ans"
            :whole="answerWhole"
            :values="values"
            :box="box"
            @pick="activate"
          />
          <span class="unit">{{ gameData.unit }}</span>
          <span v-if="answered && gameData.reference" class="reference">
            （也就是 {{ gameData.reference }} {{ gameData.unit }}）
          </span>
        </div>
      </div>

      <p v-if="feedback" class="feedback">{{ feedback }}</p>

      <FieldPad
        :field="answered ? null : activeEl"
        :kind="activeIsOp ? 'operator' : 'number'"
        :operators="OPS"
        @press="press"
        @close="closePad"
      />
    </div>
  </div>
</template>

<script>
import { h } from "vue";
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import FieldPad from "./games/Common/FieldPad.vue";

const OPS = ["+", "-"];
const OP_LABEL = { "+": "＋", "-": "－" };
const MAX_LENGTH = 2;
const REVEAL_MS = 2200;

// 一組分數格：（整數）＋分子／分母，用 render function 讓三格共用同一套樣式
const FracBoxes = {
  props: {
    prefix: { type: String, required: true },
    whole: { type: Boolean, default: false },
    values: { type: Object, required: true },
    box: { type: Function, required: true },
  },
  emits: ["pick"],
  setup(props, { emit }) {
    const button = (suffix, extra = "") => {
      const key = `${props.prefix}${suffix}`;
      const attrs = props.box(key);
      return h(
        "button",
        {
          ...attrs,
          class: ["box", extra, attrs.class],
          onClick: () => emit("pick", key),
        },
        props.values[key]
      );
    };
    return () =>
      h("span", { class: "fbox" }, [
        props.whole ? button("w", "box--whole") : null,
        h("span", { class: "fbox__frac" }, [
          button("n"),
          h("span", { class: "fbox__bar" }),
          button("d"),
        ]),
      ]);
  },
};

const totalOf = (x) => x.w * x.d + x.n;
const textOf = (x) => {
  if (x.kind === "int") return String(x.v);
  return x.w ? `${x.w} ${x.n}/${x.d}` : `${x.n}/${x.d}`;
};

// 同分母分數加減（應用題）：做法每一格都要填（運算符號、分子、分母、整數、結果），答案也要填
// 第 4 關先把整數換成假分數、第 5 關先把假分數換成整數
// 分數格可寫成假分數或帶分數（數值與分母相同就對，不強制約分）；答對後顯示帶分數參考
export default {
  name: "MA4098",
  components: { FieldPad, FracBoxes },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    const values = {};
    const add = (prefix, term) => {
      if (term.kind === "op") values[`${prefix}o`] = "";
      else if (term.kind === "int") values[`${prefix}v`] = "";
      else if (term.kind === "frac") {
        if (term.whole) values[`${prefix}w`] = "";
        values[`${prefix}n`] = "";
        values[`${prefix}d`] = "";
      }
    };
    this.gameData.rows.forEach((row, r) =>
      row.forEach((term, t) => add(`r${r}t${t}`, term))
    );
    const answer = this.gameData.answer;
    const answerWhole =
      answer.kind === "frac"
        ? answer.w > 0 || totalOf(answer) >= answer.d
        : true;
    if (answerWhole) values.answ = "";
    values.ansn = "";
    values.ansd = "";
    return {
      OPS,
      values,
      answerWhole,
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
      return this.introText?.Content || "把做法和答案記下來";
    },
    activeIsOp() {
      return /o$/.test(this.active || "");
    },
    questionParts() {
      return this.gameData.question
        .split(/(\{a\}|\{b\})/)
        .filter(Boolean)
        .map((s) =>
          s === "{a}"
            ? { num: this.gameData.a }
            : s === "{b}"
              ? { num: this.gameData.b }
              : { text: s }
        );
    },
    fieldOrder() {
      return Object.keys(this.values);
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
    numberHtml(x) {
      if (x.kind === "int") return `<span class="qn">${x.v}</span>`;
      const whole = x.w ? `<span class="qn">${x.w}</span>` : "";
      return `${whole}<span class="qf"><span>${x.n}</span><span class="qf__bar"></span><span>${x.d}</span></span>`;
    },
    showOp(op) {
      return OP_LABEL[op] || op || "";
    },
    box(key) {
      return {
        type: "button",
        "data-key": key,
        "data-pad-field": "",
        "aria-label": key.endsWith("o") ? "運算符號" : "數字",
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
    setValue(key, value) {
      this.values = { ...this.values, [key]: value };
      this.wrongKeys = this.wrongKeys.filter((k) => k !== key);
      this.feedback = "";
    },
    press(key) {
      if (this.answered || !this.active) return;
      const k = this.active;
      const current = this.values[k];
      if (key === "clear") this.setValue(k, "");
      else if (OPS.includes(key)) {
        if (!this.activeIsOp) return;
        this.setValue(k, key);
        // 選完符號跳到下一格
        const next = this.fieldOrder[this.fieldOrder.indexOf(k) + 1];
        if (next) this.activate(next);
      } else if (key === "←") this.setValue(k, current.slice(0, -1));
      else if (
        /^\d$/.test(key) &&
        !this.activeIsOp &&
        current.length < MAX_LENGTH
      )
        this.setValue(k, current === "0" ? key : current + key);
    },
    // 一個數的格子對不對：分數看分母相同、數值相同（假分數或帶分數都可以）
    checkTerm(prefix, term) {
      const v = (s) => this.values[`${prefix}${s}`];
      if (term.kind === "op") return v("o") === term.v ? [] : [`${prefix}o`];
      if (term.kind === "int")
        return Number(v("v")) === term.v ? [] : [`${prefix}v`];
      const keys = [`${prefix}n`, `${prefix}d`];
      if (v("w") !== undefined) keys.unshift(`${prefix}w`);
      const w = Number(v("w") || 0);
      const n = Number(v("n"));
      const d = Number(v("d"));
      const ok = d === term.d && w * d + n === totalOf(term);
      return ok ? [] : keys;
    },
    typedTerm(prefix, term) {
      const v = (s) => this.values[`${prefix}${s}`] || "_";
      if (term.kind === "op")
        return this.showOp(this.values[`${prefix}o`]) || "_";
      if (term.kind === "int") return v("v");
      const w = this.values[`${prefix}w`];
      return `${w ? `${w} ` : ""}${v("n")}/${v("d")}`;
    },
    checkAnswer() {
      if (this.answered) return;
      // 整數格可以空著（寫假分數）；其他格子都要填
      const empty = Object.keys(this.values).filter(
        (k) => this.values[k] === "" && !k.endsWith("w")
      );
      if (empty.length) {
        this.wrongKeys = empty;
        this.feedback = "做法和答案的格子都要填喔！";
        return;
      }
      const { rows, answer } = this.gameData;
      const wrong = [];
      rows.forEach((row, r) =>
        row.forEach((term, t) => {
          if (term.kind !== "eq")
            wrong.push(...this.checkTerm(`r${r}t${t}`, term));
        })
      );
      wrong.push(...this.checkTerm("ans", answer));
      this.wrongKeys = wrong;
      const isCorrect = wrong.length === 0;
      const rowText = (fn) =>
        rows
          .map((row, r) =>
            row
              .map((term, t) =>
                term.kind === "eq" ? "＝" : fn(`r${r}t${t}`, term)
              )
              .join(" ")
          )
          .join("；");
      const expected = (_, term) =>
        term.kind === "op" ? this.showOp(term.v) : textOf(term);
      this.$emit("add-record", [
        `${rowText(expected)}；答 ${textOf(answer)} ${this.gameData.unit}`,
        `${rowText(this.typedTerm)}；答 ${this.typedTerm("ans", answer)} ${this.gameData.unit}`,
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
        this.feedback = "紅色的格子不對，看看題目的數再想一想！";
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
  gap: 0.8rem;
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
  padding: 0.6rem 1.2rem;
  font-size: 1.6rem;
  font-weight: $font-bold;
  line-height: 1.5;
  color: #4e342e;
  background-color: #fff8e1;
  border: 3px solid #ffcc80;
  border-radius: 14px;
}

.qnum {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  margin: 0 0.2rem;
  color: #0d47a1;

  :deep(.qf) {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    font-size: 1.25rem;
    line-height: 1.05;
  }

  :deep(.qf__bar) {
    align-self: stretch;
    min-width: 1.4rem;
    height: 3px;
    margin: 0.1rem 0;
    background-color: currentColor;
  }
}

.work {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
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

:deep(.fbox) {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

:deep(.fbox__frac) {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
}

:deep(.fbox__bar) {
  align-self: stretch;
  height: 4px;
  background-color: #37474f;
  border-radius: 2px;
}

:deep(.box) {
  width: 3.2rem;
  height: 2.6rem;
  font-size: 1.6rem;
  font-weight: $font-bold;
  color: #1565c0;
  background-color: #ffffff;
  border: 3px dashed #90a4ae;
  border-radius: 10px;
  cursor: pointer;
}

:deep(.box--whole),
.box--int {
  height: 3.2rem;
}

.box--op {
  width: 2.8rem;
  color: #ef6c00;
}

:deep(.box--active) {
  border-style: solid;
  border-color: #1e88e5;
  box-shadow: 0 0 0 3px #90caf9;
}

:deep(.box--wrong) {
  border-style: solid;
  border-color: #e53935;
  background-color: #ffebee;
}

:deep(.box--correct) {
  border-style: solid;
  border-color: #43a047;
  background-color: #e8f5e9;
  color: #2e7d32;
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

  .work {
    gap: 0.6rem;
    padding: 0.6rem 1rem;
  }

  .work-label {
    min-width: 4rem;
    font-size: 1.3rem;
  }

  :deep(.box) {
    width: 2.8rem;
    height: 2.3rem;
    font-size: 1.4rem;
  }

  :deep(.box--whole),
  .box--int {
    height: 2.8rem;
  }
}
</style>

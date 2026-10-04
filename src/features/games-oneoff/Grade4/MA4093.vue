<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <p class="question">{{ gameData.question }}</p>

      <div class="figures">
        <div class="figure">
          <ContainerFigure
            :theme="gameData.theme"
            :capacity="gameData.den"
            :count="gameData.den"
          />
          <span class="figure__label">滿滿 1 {{ gameData.unit }}</span>
        </div>
        <div class="figure">
          <ContainerFigure
            :theme="gameData.theme"
            :capacity="gameData.den"
            :count="gameData.part"
          />
          <span class="figure__label">沒有裝滿</span>
        </div>
      </div>

      <div class="answers">
        <div class="answer">
          <span class="answer__label">帶分數</span>
          <button
            v-bind="box('mw')"
            class="box box--whole"
            @click="activate('mw')"
          >
            {{ values.mw }}
          </button>
          <span class="frac">
            <button v-bind="box('mn')" class="box" @click="activate('mn')">
              {{ values.mn }}
            </button>
            <span class="frac__bar" />
            <button v-bind="box('md')" class="box" @click="activate('md')">
              {{ values.md }}
            </button>
          </span>
          <span class="answer__unit">{{ gameData.unit }}</span>
        </div>
        <div class="answer">
          <span class="answer__label">假分數</span>
          <span class="frac">
            <button v-bind="box('in')" class="box" @click="activate('in')">
              {{ values.in }}
            </button>
            <span class="frac__bar" />
            <button v-bind="box('id')" class="box" @click="activate('id')">
              {{ values.id }}
            </button>
          </span>
          <span class="answer__unit">{{ gameData.unit }}</span>
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
import ContainerFigure from "./games/Fraction/ContainerFigure.vue";
import FieldPad from "./games/Common/FieldPad.vue";

const KEYS = ["mw", "mn", "md", "in", "id"];
const MAX_LENGTH = 2;

// 帶分數、假分數填填看：1 個裝滿的容器 + 1 個沒裝滿的容器，
// 同時填帶分數（整數、分子、分母）和假分數（分子、分母），兩個都對才過關
// 題目 { question, theme, unit, measure, den, part, mixed: { whole, num, den }, improper: { num, den } }
export default {
  name: "MA4093",
  components: { ContainerFigure, FieldPad },
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
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "用帶分數或假分數回答問題。";
    },
    expected() {
      const { mixed, improper } = this.gameData;
      return {
        mw: mixed.whole,
        mn: mixed.num,
        md: mixed.den,
        in: improper.num,
        id: improper.den,
      };
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
    setValue(key, value) {
      this.values = { ...this.values, [key]: value };
      this.wrongKeys = this.wrongKeys.filter((k) => k !== key);
      this.feedback = "";
    },
    press(key) {
      if (this.answered || !this.active) return;
      const current = this.values[this.active];
      if (key === "clear") this.setValue(this.active, "");
      else if (key === "←") this.setValue(this.active, current.slice(0, -1));
      else if (/^\d$/.test(key) && current.length < MAX_LENGTH)
        this.setValue(this.active, current === "0" ? key : current + key);
    },
    text(v) {
      return `${v.mw || "_"} ${v.mn || "_"}/${v.md || "_"}、${v.in || "_"}/${v.id || "_"}`;
    },
    checkAnswer() {
      if (this.answered) return;
      const blank = KEYS.filter((k) => this.values[k] === "");
      if (blank.length) {
        this.feedback = "帶分數和假分數的格子都要填喔！";
        this.wrongKeys = blank;
        return;
      }
      this.wrongKeys = KEYS.filter(
        (k) => Number(this.values[k]) !== this.expected[k]
      );
      const isCorrect = this.wrongKeys.length === 0;
      const den = this.gameData.den;
      if (!isCorrect) {
        const dens = [Number(this.values.md), Number(this.values.id)];
        this.feedback = dens.some((d) => d !== den)
          ? `一${this.gameData.unit}有 ${den} ${this.gameData.measure}，分母要寫 ${den} 喔！`
          : "紅色的格子不對，再數數看！";
      }
      this.$emit("add-record", [
        this.text(this.expected),
        this.text(this.values),
        isCorrect ? "正確" : "錯誤",
      ]);
      if (isCorrect) {
        this.answered = true;
        this.feedback = "";
        this.closePad();
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
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small $padding--medium;
}

.question {
  margin: 0;
  padding: 0.4rem 1.2rem;
  font-size: 1.6rem;
  font-weight: $font-bold;
  color: #4e342e;
  background-color: #fff8e1;
  border: 3px solid #ffcc80;
  border-radius: 14px;
}

.figures {
  flex: 1;
  min-height: 0;
  width: 100%;
  display: flex;
  justify-content: center;
  gap: 3rem;
}

.figure {
  flex: 0 1 17rem;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;

  :deep(.container-figure) {
    flex: 1;
    min-height: 0;
  }

  &__label {
    font-size: 1.2rem;
    font-weight: $font-bold;
    color: #5d4037;
  }
}

.answers {
  display: flex;
  justify-content: center;
  gap: 3rem;
}

.answer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 1rem;
  background-color: #ffffff;
  border-radius: 16px;
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.1);

  &__label {
    font-size: 1.4rem;
    font-weight: $font-bold;
    color: #00695c;
  }

  &__unit {
    font-size: 1.5rem;
    font-weight: $font-bold;
    color: #333333;
  }
}

.frac {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;

  &__bar {
    width: 100%;
    height: 4px;
    background-color: #37474f;
    border-radius: 2px;
  }
}

.box {
  width: 3.6rem;
  height: 3rem;
  font-size: 1.8rem;
  font-weight: $font-bold;
  color: #1565c0;
  background-color: #ffffff;
  border: 3px dashed #90a4ae;
  border-radius: 10px;
  cursor: pointer;

  &--whole {
    height: 3.6rem;
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
  font-size: 1.3rem;
  font-weight: $font-bold;
  color: #c62828;
}

@media (max-width: 1100px), (max-height: 760px) {
  .question {
    font-size: 1.35rem;
  }

  .answers {
    gap: 1.5rem;
  }

  .box {
    width: 3.2rem;
    height: 2.6rem;
    font-size: 1.55rem;

    &--whole {
      height: 3.2rem;
    }
  }
}
</style>

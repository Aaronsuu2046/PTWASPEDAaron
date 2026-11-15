<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <p class="question">看看數的規律，在空格裡填上正確的數。</p>

      <!-- 數線：7 個刻度，每個刻度上面是一個數或一個空格 -->
      <div class="line-wrap">
        <div class="cells">
          <div
            v-for="(value, i) in gameData.values"
            :key="i"
            class="cell"
            :data-index="i"
          >
            <button
              v-if="isBlank(i)"
              type="button"
              class="cell__box"
              :class="{
                'cell__box--active': active === i && !answered,
                'cell__box--wrong': wrongCells.includes(i),
                'cell__box--correct': answered,
              }"
              :data-blank="i"
              data-pad-field
              :aria-label="`第 ${i + 1} 個數`"
              @click="activate($event, i)"
            >
              {{ values[i] || "" }}
            </button>
            <span v-else class="cell__number">{{ value }}</span>
            <span class="cell__tick" />
          </div>
        </div>
        <div class="axis">
          <span class="axis__arrow" />
        </div>
      </div>

      <p v-if="feedback" class="feedback" :class="{ 'feedback--ok': answered }">
        {{ feedback }}
      </p>

      <FieldPad
        :field="active !== null && !answered ? activeEl : null"
        @press="press"
        @close="closePad"
      />
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import FieldPad from "../Grade4/games/Common/FieldPad.vue";

const MAX_LENGTH = 3;
const HINTS = {
  1: "每次加 1",
  10: "每次加 10",
  "-1": "每次減 1",
  "-10": "每次減 10",
};

// 數到 200－填寫數線：7 個數依規律（加 1、加 10、減 1、減 10）排在數線上，填出挖空的數
// 題目 { code, step, values: 7 個數, blanks: 挖空的位置 }；只有四關
export default {
  name: "MA2013",
  components: { FieldPad },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      values: {},
      active: null,
      activeEl: null,
      wrongCells: [],
      answered: false,
      feedback: "",
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "看看數線的規律，把空格填好。";
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    isBlank(i) {
      return this.gameData.blanks.includes(i);
    },
    activate(event, i) {
      if (this.answered) return;
      this.active = i;
      this.activeEl = event.currentTarget;
    },
    closePad() {
      this.active = null;
    },
    press(key) {
      if (this.answered || this.active === null) return;
      const i = this.active;
      const current = this.values[i] || "";
      let next = current;
      if (key === "clear") next = "";
      else if (key === "←") next = current.slice(0, -1);
      else if (/^\d$/.test(key) && current.length < MAX_LENGTH)
        next = current === "0" ? key : current + key;
      this.values = { ...this.values, [i]: next };
      this.wrongCells = this.wrongCells.filter((c) => c !== i);
      this.feedback = "";
    },
    // 整條數線寫成一行，挖空的位置寫填的數（沒填寫「＿」）
    lineText(pick) {
      return this.gameData.values
        .map((v, i) => (this.isBlank(i) ? `(${pick(i)})` : String(v)))
        .join("－");
    },
    checkAnswer() {
      if (this.answered) return;
      const { values, blanks, step, code } = this.gameData;
      const empty = blanks.filter((i) => !this.values[i]);
      if (empty.length) {
        this.wrongCells = empty;
        this.feedback = "還有空格沒有填喔！";
        return;
      }
      this.wrongCells = blanks.filter(
        (i) => Number(this.values[i]) !== values[i]
      );
      const isCorrect = this.wrongCells.length === 0;
      this.$emit("add-record", [
        `${code} ${this.lineText((i) => values[i])}`,
        this.lineText((i) => this.values[i] || "＿"),
        isCorrect ? "正確" : "錯誤",
      ]);
      this.active = null;
      if (isCorrect) {
        this.answered = true;
        this.feedback = "答對了！";
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
        return;
      }
      // 答錯：只標示錯的格子，填的數都保留
      this.feedback = `紅色的格子不對喔！提示：${HINTS[step]}。`;
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
  justify-content: center;
  gap: 2rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small $padding--medium;
}

.question {
  margin: 0;
  font-size: 1.7rem;
  font-weight: $font-bold;
  color: #4e342e;
}

.line-wrap {
  width: 100%;
  padding: 1.6rem 1rem 1.2rem;
  background-color: #ffffff;
  border-radius: 20px;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.08);
}

.cells {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding: 0 1.2rem;
}

.cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;

  &__number,
  &__box {
    width: 5.4rem;
    height: 4rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.2rem;
    font-weight: $font-bold;
  }

  &__number {
    color: #0d47a1;
  }

  &__box {
    padding: 0;
    color: #c62828;
    background-color: #fffde7;
    border: 4px dashed #fb8c00;
    border-radius: 12px;
    cursor: pointer;

    &--active {
      border-style: solid;
      border-color: #1e88e5;
      box-shadow: 0 0 0 4px #90caf9;
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

  &__tick {
    width: 5px;
    height: 1.4rem;
    background-color: #455a64;
    border-radius: 3px;
  }
}

// 數線本體：刻度下端接在這條線上，右邊有箭頭
.axis {
  position: relative;
  height: 6px;
  margin: -3px 0.2rem 0;
  background-color: #455a64;
  border-radius: 3px;

  &__arrow {
    position: absolute;
    right: -0.4rem;
    top: 50%;
    width: 0;
    height: 0;
    transform: translateY(-50%);
    border-top: 0.8rem solid transparent;
    border-bottom: 0.8rem solid transparent;
    border-left: 1.2rem solid #455a64;
  }
}

.feedback {
  margin: 0;
  padding: 0.3rem 1.2rem;
  font-size: 1.4rem;
  font-weight: $font-bold;
  color: #c62828;
  background-color: #fff8e1;
  border-radius: 12px;

  &--ok {
    color: #2e7d32;
    background-color: #e8f5e9;
  }
}

@media (max-width: 1100px) {
  .cells {
    padding: 0 0.4rem;
  }

  .cell__number,
  .cell__box {
    width: 4.4rem;
    height: 3.4rem;
    font-size: 1.8rem;
  }

  .question {
    font-size: 1.45rem;
  }
}
</style>

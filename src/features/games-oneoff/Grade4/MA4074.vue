<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <p class="prompt" data-pad-avoid>
        <template v-if="isBoard">{{ gameData.prompt }}，是多少？</template>
        <template v-else>{{ gameData.prompt }}？</template>
      </p>

      <div class="work" :class="{ 'work--row': !isBoard }">
        <div class="board-card" :data-pad-avoid="isBoard ? null : ''">
          <span class="board-card__label">定位板</span>
          <PlaceValueBoard
            :values="boardValues"
            :editable="isBoard && !answered"
            :active="isBoard ? active : null"
            :wrong-cells="wrongCells"
            :correct="answered && isBoard"
            @pick="pickCell"
          />
          <p v-if="isBoard" class="board-card__tip">
            一格寫一個數字；小數點已經在定位板上了
          </p>
        </div>

        <!-- 關卡 3、4：0.05 是 □ 個 0.01 -->
        <div v-if="!isBoard" class="count-row">
          <span class="count-row__num">{{ gameData.decimal }}</span>
          <span>是</span>
          <button
            type="button"
            class="box"
            :class="{
              'box--active': active === 'count' && !answered,
              'box--wrong': countWrong,
              'box--correct': answered,
            }"
            data-key="count"
            data-pad-field
            aria-label="幾個 0.01"
            @click="pickCount"
          >
            {{ count }}
          </button>
          <span>個</span>
          <span class="count-row__num">0.01</span>
        </div>
      </div>

      <!-- 一直佔著位置，出現提示時版面才不會跳動 -->
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
import PlaceValueBoard from "./games/Decimal/PlaceValueBoard.vue";
import FieldPad from "./games/Common/FieldPad.vue";

const CELLS = 4; // 十位、個位、十分位、百分位
const ONES = 1;
const TENTHS = 2;

// 小數字串放進定位板四格（十位沒有就空著，百分位沒寫就空著）
function toCells(text) {
  const [whole, frac = ""] = text.split(".");
  const w = whole.padStart(2, " ");
  return [
    w[0].trim() === "0" ? "" : w[0].trim(),
    w[1],
    frac[0] || "",
    frac[1] || "",
  ];
}

// 認識百分位：
// board（關卡 1、2、5）：在定位板上填數字，十位、百分位可空著（當 0），個位、十分位要填；以「幾個 0.01」判定
// count（關卡 3、4）：定位板顯示小數，填「是幾個 0.01」
// 題目 board { prompt, value, answer, digits }；count { prompt, decimal, count }
export default {
  name: "MA4074",
  components: { PlaceValueBoard, FieldPad },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      cells: Array(CELLS).fill(""),
      count: "",
      active: null,
      activeEl: null,
      wrongCells: [],
      countWrong: false,
      feedback: "",
      answered: false,
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "在定位板上記記看，並回答問題。";
    },
    isBoard() {
      return this.gameData.mode === "board";
    },
    boardValues() {
      return this.isBoard ? this.cells : toCells(this.gameData.decimal);
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    pickCell(k, el) {
      if (this.answered) return;
      this.active = k;
      this.activeEl = el;
    },
    pickCount(event) {
      if (this.answered) return;
      this.active = "count";
      this.activeEl = event.currentTarget;
    },
    closePad() {
      this.active = null;
      this.activeEl = null;
    },
    press(key) {
      if (this.answered || this.active === null) return;
      this.feedback = "";
      if (this.active === "count") {
        this.countWrong = false;
        const v = this.count;
        if (key === "clear") this.count = "";
        else if (key === "←") this.count = v.slice(0, -1);
        else if (/^\d$/.test(key) && v.length < 3)
          this.count = v === "0" ? key : v + key;
        return;
      }
      const k = this.active;
      this.wrongCells = this.wrongCells.filter((c) => c !== k);
      const cells = [...this.cells];
      if (key === "clear" || key === "←") cells[k] = "";
      else if (/^\d$/.test(key)) cells[k] = key;
      this.cells = cells;
      // 填好一格就跳到右邊下一格
      if (/^\d$/.test(key) && k < CELLS - 1) {
        this.$nextTick(() => {
          const next = this.$el.querySelector(`[data-cell="${k + 1}"]`);
          if (next) this.pickCell(k + 1, next);
        });
      }
    },
    checkAnswer() {
      if (this.answered) return;
      if (this.isBoard) this.checkBoard();
      else this.checkCount();
    },
    checkBoard() {
      const { value, answer, digits } = this.gameData;
      const c = this.cells;
      const missing = [ONES, TENTHS].filter((k) => c[k] === "");
      if (c.every((d) => d === "") || missing.length) {
        this.wrongCells = missing;
        this.feedback = "個位和十分位都要填數字，沒有就寫 0 喔！";
        return;
      }
      const typed = c.map((d) => Number(d || 0));
      const got = typed[0] * 1000 + typed[1] * 100 + typed[2] * 10 + typed[3];
      const isCorrect = got === value;
      const shown = `${c[0]}${c[1]}.${c[2]}${c[3]}`.trim();
      this.$emit("add-record", [
        `${this.gameData.prompt}＝${answer}`,
        shown,
        isCorrect ? "正確" : "錯誤",
      ]);
      if (isCorrect) this.finish();
      else {
        this.wrongCells = typed
          .map((d, k) => (d === Number(digits[k]) ? null : k))
          .filter((k) => k !== null);
        this.feedback =
          "紅色的格子不對！1 個 0.01 記在百分位，10 個 0.01 就是 1 個 0.1。";
        this.$emit("play-effect", "WrongSound");
      }
    },
    checkCount() {
      const { decimal, count } = this.gameData;
      if (this.count === "") {
        this.countWrong = true;
        this.feedback = "答案的格子還沒填喔！";
        return;
      }
      const isCorrect = Number(this.count) === count;
      this.$emit("add-record", [
        `${decimal}＝${count} 個 0.01`,
        `${this.count} 個 0.01`,
        isCorrect ? "正確" : "錯誤",
      ]);
      if (isCorrect) this.finish();
      else {
        this.countWrong = true;
        this.feedback =
          "再想想看！0.1 是 10 個 0.01，看看定位板上的十分位和百分位。";
        this.$emit("play-effect", "WrongSound");
      }
    },
    finish() {
      this.answered = true;
      this.wrongCells = [];
      this.countWrong = false;
      this.feedback = "";
      this.closePad();
      this.$emit("play-effect", "CorrectSound");
      this.$emit("next-question");
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
  gap: 1.1rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small $padding--medium;
}

.prompt {
  margin: 0;
  padding: 0.6rem 1.6rem;
  font-size: 2rem;
  font-weight: $font-bold;
  color: #4e342e;
  background-color: #fff8e1;
  border: 3px solid #ffcc80;
  border-radius: 16px;
}

.work {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.1rem;

  &--row {
    flex-direction: row;
    align-items: flex-start;
    gap: 1.6rem;
  }
}

.board-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.8rem 1.4rem 1rem;
  background-color: #ffffff;
  border-radius: 18px;
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.1);

  &__label {
    font-size: 1.3rem;
    font-weight: $font-bold;
    color: #5d4037;
  }

  &__tip {
    margin: 0;
    font-size: 1.05rem;
    color: #6d4c41;
  }
}

.count-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 1.4rem;
  font-size: 2rem;
  font-weight: $font-bold;
  color: #333333;
  background-color: #ffffff;
  border-radius: 16px;
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.1);

  &__num {
    color: #0d47a1;
  }
}

.box {
  width: 5rem;
  height: 3.6rem;
  font-size: 2.2rem;
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
  font-size: 1.3rem;
  font-weight: $font-bold;
  color: #c62828;
}

@media (max-width: 1100px), (max-height: 760px) {
  .game-area {
    gap: 0.7rem;
  }

  .prompt {
    font-size: 1.6rem;
  }

  .count-row {
    font-size: 1.7rem;
  }
}
</style>

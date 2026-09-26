<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <p v-if="gameData.stem" class="stem-text">{{ gameData.stem }}</p>
      <p class="question-text" :class="{ 'question-text--expr': isExpr }">
        {{ gameData.question }}
      </p>

      <!-- 關卡 1、2：點字卡依序放進空格，點空格可把字卡退回 -->
      <template v-if="isCards">
        <div class="slot-list" :class="{ 'slot-list--wrong': wrong }">
          <button
            v-for="(card, index) in slots"
            :key="`slot-${index}`"
            type="button"
            class="digit-card digit-card--slot"
            :class="{ 'digit-card--empty': card === null }"
            @click="returnCard(index)"
          >
            {{ card === null ? "" : gameData.cards[card] }}
          </button>
        </div>
        <div class="card-list">
          <button
            v-for="(digit, index) in gameData.cards"
            :key="`card-${index}`"
            type="button"
            class="digit-card"
            :class="{ 'digit-card--used': slots.includes(index) }"
            :disabled="slots.includes(index)"
            @click="placeCard(index)"
          >
            {{ digit }}
          </button>
        </div>
      </template>

      <!-- 關卡 3～5：選擇奇／偶 -->
      <template v-else>
        <table v-if="gameData.table" class="op-table">
          <tr>
            <th class="op-table__corner">{{ tableSymbol }}</th>
            <th v-for="col in TABLE_RANGE" :key="`h-${col}`">{{ col }}</th>
          </tr>
          <tr v-for="row in TABLE_RANGE" :key="`r-${row}`">
            <th>{{ row }}</th>
            <td v-for="col in TABLE_RANGE" :key="`c-${row}-${col}`">
              {{ tableValue(row, col) }}
            </td>
          </tr>
        </table>
        <div class="option-group">
          <button
            v-for="option in gameData.options"
            :key="option"
            type="button"
            :class="{
              'button--onclick': selected === option,
              'option--wrong': wrong && selected === option,
            }"
            @click="selectOption(option)"
          >
            {{ option }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";

export default {
  name: "MA4173",
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      // 自製加法表／乘法表的範圍
      TABLE_RANGE: [1, 2, 3, 4, 5, 6],
      // 每個空格放的是 cards 的索引，null 表示空
      slots: Array.from({ length: this.gameData.slots || 0 }, () => null),
      selected: "",
      wrong: false,
      answered: false,
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "觀察奇偶數的規律並回答問題";
    },
    isCards() {
      return this.gameData.type === "cards";
    },
    isExpr() {
      return !this.isCards && !this.gameData.table;
    },
    tableSymbol() {
      return this.gameData.table === "+" ? "+" : "×";
    },
    userAnswer() {
      if (!this.isCards) return this.selected;
      return this.slots
        .map((card) => (card === null ? "" : this.gameData.cards[card]))
        .join("");
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    tableValue(row, col) {
      return this.gameData.table === "+" ? row + col : row * col;
    },
    placeCard(index) {
      const empty = this.slots.indexOf(null);
      if (empty === -1) return;
      this.slots[empty] = index;
      this.wrong = false;
    },
    returnCard(slotIndex) {
      this.slots[slotIndex] = null;
      this.wrong = false;
    },
    selectOption(option) {
      this.selected = option;
      this.wrong = false;
    },
    checkAnswer() {
      if (this.answered) return;
      const isCorrect = this.userAnswer === this.gameData.answer;
      this.wrong = !isCorrect;
      this.$emit("add-record", [
        this.gameData.answer,
        this.userAnswer || "未作答",
        isCorrect ? "正確" : "錯誤",
      ]);
      if (isCorrect) {
        this.answered = true;
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
  justify-content: center;
  gap: 1rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small;
}

.stem-text {
  margin: 0;
  font-size: 1.3rem;
  color: #444444;
}

.question-text {
  margin: 0;
  font-size: 1.8rem;
  font-weight: $font-bold;
  text-align: center;

  &--expr {
    font-size: 3rem;
    letter-spacing: 0.1em;
  }
}

.slot-list,
.card-list {
  display: flex;
  gap: 1rem;
}

.slot-list {
  padding: 0.6rem;
  border-radius: 12px;

  &--wrong {
    outline: 4px solid #e53935;
  }
}

.digit-card {
  width: 5rem;
  height: 6rem;
  font-size: 3rem;
  font-weight: $font-bold;
  color: #222222;
  background-color: #fffde7;
  border: 3px solid #8d6e63;
  border-radius: 12px;
  box-shadow: 0 4px 0 #bcaaa4;
  cursor: pointer;

  &--slot {
    background-color: #ffffff;
    border-style: solid;
  }

  &--empty {
    border-style: dashed;
    box-shadow: none;
  }

  &--used {
    opacity: 0.3;
    cursor: default;
  }
}

.op-table {
  border-collapse: collapse;
  font-size: 1.2rem;
  background-color: #ffffff;

  th,
  td {
    width: 2.8rem;
    height: 1.9rem;
    text-align: center;
    border: 2px solid #8d6e63;
  }

  th {
    background-color: #ffe0b2;
  }

  &__corner {
    background-color: #ffcc80 !important;
  }
}

.option-group {
  display: flex;
  gap: 2rem;

  button {
    @extend .button-basic;
    border: none;
    min-width: 9rem;
    padding: 0.6rem 1.5rem;
    font-size: 28px;
    background-color: $primary-btn-bg;
  }
}

.button--onclick {
  background-color: $primary-btn-hover-bg !important;
  scale: 1.03;
}

.option--wrong {
  outline: 3px solid #e53935;
}
</style>

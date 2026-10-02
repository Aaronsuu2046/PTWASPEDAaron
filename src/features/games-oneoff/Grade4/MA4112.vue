<template>
  <!-- 關卡 1～3：沿用 LinkGame，把算式和答案連起來（答案每次隨機排列） -->
  <LinkGame
    v-if="isLink"
    :game-data="linkData"
    :game-config="LINK_CONFIG"
    :game-id="gameId"
    @play-effect="$emit('play-effect', $event)"
    @add-record="$emit('add-record', $event)"
    @next-question="$emit('next-question')"
  />

  <!-- 關卡 4：定位板直式，填最後的乘積 -->
  <div v-else ref="root" class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <p class="hint-text">
        用直式算算看：{{ gameData.a }} × {{ gameData.b }} = ?
        <span class="hint-text__sub">（橘色的 0 可以先不算，最後再補上）</span>
      </p>

      <div class="board-wrap">
        <table class="board" aria-label="定位板直式">
          <thead>
            <tr>
              <th
                v-for="(name, c) in placeNames"
                :key="`h-${c}`"
                class="board__head"
              >
                {{ name }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                v-for="(cell, c) in rowA"
                :key="`a-${c}`"
                class="board__cell"
                :class="{ 'board__cell--zero': cell.trailingZero }"
              >
                {{ cell.digit }}
              </td>
            </tr>
            <tr class="board__row--times">
              <td
                v-for="(cell, c) in rowB"
                :key="`b-${c}`"
                class="board__cell"
                :class="{ 'board__cell--zero': cell.trailingZero }"
              >
                {{ cell.digit }}
              </td>
            </tr>
            <tr class="board__row--answer">
              <td v-for="(value, c) in answerCells" :key="`r-${c}`">
                <button
                  v-if="c > 0"
                  type="button"
                  class="answer-cell"
                  :class="{
                    'answer-cell--active': !answered && padOpen && active === c,
                    'answer-cell--wrong': wrong,
                    'answer-cell--correct': answered,
                  }"
                  :data-col="c"
                  data-pad-field
                  :aria-label="`${placeNames[c]}位`"
                  @click="activate(c)"
                >
                  {{ value }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 點答案格才出現數字板；寫完一格會往左跳到下一格，數字板跟著移動 -->
      <FieldPad
        :field="padOpen && !answered ? padEl : null"
        @press="onPadKey"
        @close="padOpen = false"
      />
    </div>
  </div>
</template>

<script>
import { defineAsyncComponent } from "vue";
import FieldPad from "./games/Common/FieldPad.vue";
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";

const PLACE_NAMES = ["個", "十", "百", "千", "萬", "十萬", "百萬", "千萬"];

function shuffle(list) {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 洗牌但避開原本的順序，免得答案剛好和算式一一對齊
function shuffleNotIdentity(list) {
  let result = shuffle(list);
  while (list.length > 1 && result.every((v, i) => v === list[i])) {
    result = shuffle(list);
  }
  return result;
}

// 末幾位為 0 的乘法
// mode "link"：pairs [{ expression, answer }]，右欄答案隨機排列後交給 LinkGame
// mode "vertical"：a × b，在定位板上由右往左填乘積
export default {
  name: "MA4112",
  components: {
    FieldPad,
    LinkGame: defineAsyncComponent(
      () => import("@/features/game-templates/link-game/LinkGame.vue")
    ),
  },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    const isLink = this.gameData.mode === "link";
    return {
      LINK_CONFIG: { CheckingMode: "OnSubmit" },
      // 答案欄的排列順序，建立題目時洗牌一次
      answerOrder: isLink
        ? shuffleNotIdentity(this.gameData.pairs.map((_, i) => i))
        : [],
      answerCells: [],
      active: null,
      padOpen: false,
      padEl: null,
      wrong: false,
      answered: false,
    };
  },
  computed: {
    isLink() {
      return this.gameData.mode === "link";
    },
    gameIntroText() {
      return this.introText?.Content || "試試看末幾位為0的乘法簡便算法";
    },
    linkData() {
      const text = (value) => ({
        Name: "TextOnly",
        Data: { Text: value, Size: "2.2rem" },
      });
      const pairs = this.gameData.pairs;
      return {
        Question: {
          text: "把算式和正確答案連起來",
          RowData: [
            pairs.map((pair) => text(pair.expression)),
            this.answerOrder.map((i) => text(pairs[i].answer)),
          ],
        },
        Answer: pairs.map((_, i) => [
          [0, i],
          [1, this.answerOrder.indexOf(i)],
        ]),
      };
    },
    // 欄位數：最長的數字位數，再加最左邊放「×」的一欄
    columns() {
      const { a, b, answer } = this.gameData;
      return Math.max(a.length, b.length, answer.length) + 1;
    },
    placeNames() {
      return Array.from({ length: this.columns }, (_, c) =>
        c === 0 ? "" : PLACE_NAMES[this.columns - 1 - c]
      );
    },
    rowA() {
      return this.alignRow(this.gameData.a, "");
    },
    rowB() {
      return this.alignRow(this.gameData.b, "×");
    },
  },
  created() {
    if (this.isLink) return;
    this.answerCells = Array(this.columns).fill("");
    this.active = this.columns - 1;
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    if (!this.isLink) emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    // 數字靠右對齊到定位板，標出末尾的 0
    alignRow(number, sign) {
      const trailing = number.length - number.replace(/0+$/, "").length;
      return Array.from({ length: this.columns }, (_, c) => {
        if (c === 0) return { digit: sign, trailingZero: false };
        const i = c - (this.columns - number.length);
        return {
          digit: i >= 0 ? number[i] : "",
          trailingZero: i >= number.length - trailing,
        };
      });
    },
    activate(c) {
      if (this.answered) return;
      this.active = c;
      this.padOpen = true;
      this.syncPad();
    },
    syncPad() {
      this.$nextTick(() => {
        this.padEl = this.$refs.root?.querySelector(
          `[data-col="${this.active}"]`
        );
      });
    },
    // 數字板：數字照原本規則寫入；「刪除」退回上一個寫的數字
    onPadKey(key) {
      if (key === "clear") {
        this.press("清除");
      } else if (key === "←") {
        if (this.answered || this.active === null) return;
        const cells = [...this.answerCells];
        if (!cells[this.active] && this.active + 1 < this.columns) {
          this.active += 1;
        }
        cells[this.active] = "";
        this.answerCells = cells;
        this.wrong = false;
      } else {
        this.press(key);
      }
      this.syncPad();
    },
    press(key) {
      if (this.answered || this.active === null) return;
      this.wrong = false;
      const cells = [...this.answerCells];
      if (key === "清除") {
        this.answerCells = Array(this.columns).fill("");
        this.active = this.columns - 1;
        return;
      }
      if (key === "←") {
        // 往左移一格（直式由個位往左寫）
        this.active = Math.max(1, this.active - 1);
        return;
      }
      cells[this.active] = key;
      this.answerCells = cells;
      if (this.active > 1) this.active -= 1;
    },
    userAnswer() {
      const digits = this.answerCells.slice(1);
      const first = digits.findIndex((d) => d !== "");
      if (first === -1) return "";
      const used = digits.slice(first);
      // 中間有空格視為未完成
      return used.includes("") ? null : used.join("");
    },
    checkAnswer() {
      if (this.answered) return;
      const value = this.userAnswer();
      const isCorrect = value === this.gameData.answer;
      this.wrong = !isCorrect;
      this.$emit("add-record", [
        `${this.gameData.a} × ${this.gameData.b} = ${this.gameData.answer}`,
        value === "" ? "未作答" : value === null ? "有空格未填" : value,
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

.hint-text {
  margin: 0;
  padding: 0.5rem 1.2rem;
  font-size: 1.7rem;
  font-weight: $font-bold;
  text-align: center;
  background-color: #fff8e1;
  border: 3px solid #ffcc80;
  border-radius: 14px;

  &__sub {
    display: block;
    font-size: 1.2rem;
    color: #ef6c00;
  }
}

.board-wrap {
  padding: 0.6rem 1rem;
  background-color: #ffffff;
  border-radius: 14px;
}

.board {
  border-collapse: collapse;

  td,
  th {
    width: 3.6rem;
    text-align: center;
    // 各位之間用虛線分隔，協助對齊位值
    border-left: 2px dashed #90a4ae;

    &:first-child {
      border-left: none;
    }
  }

  &__head {
    height: 2rem;
    font-size: 1.1rem;
    color: #1565c0;
    background-color: #e3f2fd;
  }

  &__cell {
    height: 3.2rem;
    font-size: 2.2rem;
    font-weight: $font-bold;

    &--zero {
      color: #ef6c00;
    }
  }

  &__row--times td {
    border-bottom: 4px solid #37474f;
  }

  &__row--answer td {
    height: 4rem;
    padding: 0.3rem 0.2rem;
  }
}

.answer-cell {
  width: 3rem;
  height: 3.2rem;
  padding: 0;
  font-size: 2rem;
  font-weight: $font-bold;
  color: #1565c0;
  background-color: #ffffff;
  border: 3px dashed #90a4ae;
  border-radius: 8px;
  cursor: pointer;

  &--active {
    border: 4px solid #1e88e5;
    background-color: #e3f2fd;
  }

  &--wrong {
    color: #c62828;
    border-color: #e53935;
    background-color: #ffebee;
  }

  &--correct {
    color: #2e7d32;
    border: 3px solid #43a047;
    background-color: #e8f5e9;
  }
}

@media (max-height: 760px) {
  .game-area {
    gap: 0.5rem;
  }

  .board__cell {
    height: 2.6rem;
  }

  .board__row--answer td {
    height: 3.4rem;
  }

  .answer-cell {
    height: 2.8rem;
  }
}
</style>

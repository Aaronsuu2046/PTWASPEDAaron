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

  <!-- 關卡 4：簡便算法直式（依腳本）：不是 0 的數字靠右對齊，末尾的 0（橘色）放到虛線右邊，填最後的乘積 -->
  <div v-else ref="root" class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <p class="hint-text">
        用直式算算看：{{ gameData.a }} × {{ gameData.b }} = ?
        <span class="hint-text__sub">
          先算虛線左邊的 {{ core.a }} × {{ core.b }}，再把橘色的
          {{ core.zeros }} 個 0 補在後面
        </span>
      </p>

      <div class="board-wrap">
        <table class="board" aria-label="定位板直式">
          <tbody>
            <tr>
              <td
                v-for="(cell, c) in rowA"
                :key="`a-${c}`"
                class="board__cell"
                :class="{
                  'board__cell--zero': cell.trailingZero,
                  'board__cell--split': c === splitCol,
                }"
              >
                {{ cell.digit }}
              </td>
            </tr>
            <tr class="board__row--times">
              <td
                v-for="(cell, c) in rowB"
                :key="`b-${c}`"
                class="board__cell"
                :class="{
                  'board__cell--zero': cell.trailingZero,
                  'board__cell--split': c === splitCol,
                }"
              >
                {{ cell.digit }}
              </td>
            </tr>
            <tr class="board__row--answer">
              <td
                v-for="(value, c) in answerCells"
                :key="`r-${c}`"
                :class="{ 'board__cell--split': c === splitCol }"
              >
                <button
                  v-if="c > 0"
                  type="button"
                  class="answer-cell"
                  :class="{
                    'answer-cell--active': !answered && padOpen && active === c,
                    'answer-cell--wrong': wrongCols.includes(c),
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
// mode "vertical"：a × b 的簡便算法直式（依腳本「題目協助定位且有虛線」）：
//   兩數不是 0 的部分靠右對齊在虛線左邊，末尾的 0（橘色）往虛線右邊排；
//   乘積也靠右對齊，學生由右往左填，答錯只標出填錯的格子
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
      wrongCols: [],
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
    // 拆成「不是 0 的部分」與末尾 0 的個數，例如 140 → 14 和 1 個 0
    core() {
      const split = (n) => {
        const head = n.replace(/0+$/, "") || "0";
        return { head, zeros: n.length - head.length };
      };
      const a = split(this.gameData.a);
      const b = split(this.gameData.b);
      return {
        a: a.head,
        b: b.head,
        za: a.zeros,
        zb: b.zeros,
        zeros: a.zeros + b.zeros,
      };
    },
    // 虛線左邊的欄數（放不是 0 的部分）
    coreWidth() {
      const { a, b, zeros } = this.core;
      return Math.max(a.length, b.length, this.gameData.answer.length - zeros);
    },
    // 欄位數：最左邊放「×」一欄＋虛線左邊＋末尾 0 的欄數
    columns() {
      return 1 + this.coreWidth + this.core.zeros;
    },
    // 虛線畫在這一欄的右邊
    splitCol() {
      return this.coreWidth;
    },
    placeNames() {
      return Array.from({ length: this.columns }, (_, c) =>
        c === 0 ? "" : PLACE_NAMES[this.columns - 1 - c]
      );
    },
    rowA() {
      return this.alignRow(this.core.a, this.core.za, "");
    },
    rowB() {
      return this.alignRow(this.core.b, this.core.zb, "×");
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
    // 不是 0 的部分靠右對齊到虛線左邊，末尾的 0 接在虛線右邊（橘色）
    alignRow(head, zeros, sign) {
      return Array.from({ length: this.columns }, (_, c) => {
        if (c === 0) return { digit: sign, trailingZero: false };
        if (c > this.splitCol)
          return {
            digit: c - this.splitCol <= zeros ? "0" : "",
            trailingZero: c - this.splitCol <= zeros,
          };
        const i = c - (this.splitCol + 1 - head.length);
        return { digit: i >= 0 ? head[i] : "", trailingZero: false };
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
        this.wrongCols = this.wrongCols.filter((w) => w !== this.active);
      } else {
        this.press(key);
      }
      this.syncPad();
    },
    press(key) {
      if (this.answered || this.active === null) return;
      this.wrongCols = this.wrongCols.filter((w) => w !== this.active);
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
      // 逐格比對（乘積靠右對齊），只標出填錯或該填沒填的格子
      const expected = this.gameData.answer.padStart(this.columns - 1, " ");
      this.wrongCols = isCorrect
        ? []
        : this.answerCells
            .map((d, c) => (c > 0 && (d || " ") !== expected[c - 1] ? c : null))
            .filter((c) => c !== null);
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
  }

  &__cell {
    height: 3.2rem;
    font-size: 2.2rem;
    font-weight: $font-bold;

    &--zero {
      color: #ef6c00;
    }
  }

  // 虛線：左邊是不是 0 的部分，右邊是末尾的 0
  &__cell--split {
    border-right: 3px dashed #ef6c00;
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

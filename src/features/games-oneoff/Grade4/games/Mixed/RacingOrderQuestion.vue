<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <div class="top">
        <div class="progress" aria-label="答題進度">
          <span class="progress__text"
            >第 {{ index + 1 }} 題／共 {{ total }} 題</span
          >
          <span
            v-for="n in total"
            :key="n"
            class="progress__dot"
            :class="{
              'progress__dot--done': results[n - 1] === 'ok',
              'progress__dot--wrong': results[n - 1] === 'wrong',
              'progress__dot--now': n - 1 === index && !results[n - 1],
            }"
          />
        </div>

        <!-- 題目固定在道路上方；比較題（cards）並排兩個算式 -->
        <div class="exprs" :class="{ 'exprs--pair': cards.length > 1 }">
          <div v-for="(card, c) in cards" :key="c" class="expr" data-expr>
            <span v-if="cards.length > 1" class="expr__tag">{{ TAGS[c] }}</span>
            <span
              v-for="(tok, k) in tokens(card.expr)"
              :key="k"
              :class="{ expr__paren: tok === '(' || tok === ')' }"
              >{{ tok }}</span
            >
          </div>
        </div>

        <p
          class="feedback"
          :class="{ 'feedback--wrong': feedbackKind === 'wrong' }"
          data-feedback
        >
          {{ feedback || askText }}
        </p>
      </div>

      <div class="race">
        <RacingCar
          :key="raceKey"
          :game-data="raceData"
          :game-id="gameId"
          :racing-config="RACING"
          @play-effect="$emit('play-effect', $event)"
          @add-record="onRecord"
          @race-correct="onCorrect"
          @race-wrong="onWrong"
        />

        <!-- 答對後：完整解題過程，先算的部分標出來，按鈕確認才換題 -->
        <div v-if="answered" class="solution" data-solution>
          <p class="solution__title">答對了！這樣算：</p>
          <div class="solution__cards">
            <div v-for="(card, c) in cards" :key="c" class="solution__lines">
              <p class="solution__line">
                <span v-if="cards.length > 1" class="solution__tag">{{
                  TAGS[c]
                }}</span>
                <span>{{ firstParts(card).before }}</span
                ><span class="solution__first">{{
                  firstParts(card).first
                }}</span
                ><span>{{ firstParts(card).after }}</span>
              </p>
              <p
                v-for="(s, k) in card.steps"
                :key="k"
                class="solution__line"
                :class="{
                  'solution__line--result': k === card.steps.length - 1,
                }"
              >
                ＝{{ s }}
              </p>
            </div>
          </div>
          <p v-if="conclusion" class="solution__conclusion">
            {{ conclusion }}
          </p>
          <button type="button" class="next" data-next @click="goNext">
            {{ isLast ? "完成" : "下一題" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import RacingCar from "@/features/game-templates/racing-car/RacingCar.vue";

// 換行字元決定終點答案框裡怎麼斷行
const LABELS = {
  ltr: "由左而右\n一步一步算",
  paren: "先算括號\n的部分",
};
const plain = (text) => String(text).replace(/\n/g, "");
const GO = "按「上」或「下」選車道，車子就會出發！";
const ASK = `這題要怎麼算？${GO}`;
const HINT = "提示：有括號先算括號的部分；沒有括號就由左而右一步一步算。";
// 不放三角錐；車子停在原點，第一次按上／下才出發（2026-11-15 需求更新）
const RACING = {
  obstacles: false,
  holdOnCorrect: true,
  waitStart: true,
  holdOnWrong: true,
  speedRatio: 0.0022,
};
// 答錯：本題失敗，留一點時間看答錯回饋後直接換下一題（不重答同一題）
const WRONG_MS = 2600;

function shuffle(list) {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 併式觀念題（賽車選答）：只有 1 關，從題庫隨機抽 PickCount（5）題、同輪不重複；
// 兩條車道終點放「由左而右一步一步算／先算括號的部分」，車子停在原點，
// 第一次按上／下選好車道才出發，出發後仍可換道；
// 答對後顯示完整解題過程，按「下一題」才換題，第 5 題按「完成」進入完成畫面；
// 答錯則本題失敗，顯示正確答案後直接換下一題（車子回原點、答案重新洗牌）
// 題目 { no, expr, answer: "ltr"|"paren", first: [start, end], steps: [第一步, 答案] }
// 比較題（MA4087、MA408A）：{ no, cards: [{ expr, first, steps }, { … }], answer: "same"|"diff" }，
//   兩個終點放 GameConfig.Choices 的 label（一樣／不一樣），題目上方問 GameConfig.Ask
// 選填 GameConfig.Hint：答錯時的提示
export default {
  name: "RacingOrderQuestion",
  components: { RacingCar },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    const count = Math.min(
      this.gameConfig?.PickCount ?? 5,
      this.gameData.bank.length
    );
    return {
      RACING,
      TAGS: ["A", "B"],
      picked: shuffle(this.gameData.bank).slice(0, count),
      index: 0,
      raceKey: 0,
      answered: false,
      results: [],
      feedback: "",
      feedbackKind: "",
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "開車選出正確的算法！";
    },
    total() {
      return this.picked.length;
    },
    isLast() {
      return this.index === this.total - 1;
    },
    current() {
      return this.picked[this.index];
    },
    isCompare() {
      return Array.isArray(this.current.cards);
    },
    // 每題要顯示的算式：觀念題一個，比較題兩個
    cards() {
      return this.isCompare ? this.current.cards : [this.current];
    },
    choices() {
      if (this.isCompare) return this.gameConfig?.Choices || [];
      return [
        { value: "ltr", label: LABELS.ltr },
        { value: "paren", label: LABELS.paren },
      ];
    },
    askText() {
      if (this.isCompare)
        return `${this.gameConfig?.Ask || "兩個算式的答案一樣嗎？"}${GO}`;
      return ASK;
    },
    raceData() {
      return {
        Question: "",
        Options: this.choices.map((c) => c.label),
        Answer: this.choices.findIndex((c) => c.value === this.current.answer),
      };
    },
    // 比較題答對後的結論，例如「74 和 49 不一樣」
    conclusion() {
      if (!this.isCompare) return "";
      const [a, b] = this.cards.map((c) => c.steps[c.steps.length - 1]);
      const label = this.choices.find(
        (c) => c.value === this.current.answer
      )?.label;
      return `${a} 和 ${b} ${label}`;
    },
  },
  beforeUnmount() {
    clearTimeout(this.timer);
  },
  methods: {
    tokens(expr) {
      return expr.match(/\d+|[^\d]/g);
    },
    firstParts(card) {
      const { expr, first } = card;
      return {
        before: expr.slice(0, first[0]),
        first: expr.slice(first[0], first[1]),
        after: expr.slice(first[1]),
      };
    },
    onRecord([answer, chosen, result]) {
      const expr = this.cards.map((c) => c.expr).join("／");
      this.$emit("add-record", [
        `${expr}（${plain(answer)}）`,
        plain(chosen),
        result,
      ]);
    },
    onCorrect() {
      this.answered = true;
      this.results[this.index] = "ok";
      this.feedback = "";
      this.feedbackKind = "";
    },
    onWrong() {
      if (this.results[this.index]) return;
      this.results[this.index] = "wrong";
      const right = plain(this.raceData.Options[this.raceData.Answer]);
      this.feedback = `答錯了！正確的是「${right}」。${
        this.gameConfig?.Hint || HINT
      }`;
      this.feedbackKind = "wrong";
      this.timer = setTimeout(this.advance, WRONG_MS);
    },
    goNext() {
      if (!this.answered) return;
      this.advance();
    },
    // 換下一題；最後一題就進入完成畫面
    advance() {
      clearTimeout(this.timer);
      if (this.isLast) {
        this.$emit("next-question");
        return;
      }
      this.index += 1;
      this.answered = false;
      this.feedback = "";
      this.feedbackKind = "";
      this.raceKey += 1;
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
  gap: 0.6rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small $padding--medium;
}

.top {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
}

.progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &__text {
    margin-right: 0.4rem;
    font-size: 1.2rem;
    font-weight: $font-bold;
    color: #5d4037;
  }

  &__dot {
    width: 1.1rem;
    height: 1.1rem;
    border-radius: 50%;
    background-color: #ffffff;
    border: 3px solid #ffb74d;

    &--now {
      background-color: #ffe082;
    }

    &--done {
      background-color: #66bb6a;
      border-color: #43a047;
    }

    &--wrong {
      background-color: #ef9a9a;
      border-color: #e53935;
    }
  }
}

.exprs {
  display: flex;
  gap: 1.2rem;

  &--pair .expr {
    font-size: 2.6rem;
    padding: 0.3rem 1.4rem;
  }
}

.expr {
  padding: 0.3rem 2.4rem;
  font-size: 3.2rem;
  font-weight: $font-bold;
  letter-spacing: 0.06em;
  color: #0d47a1;
  background-color: #ffffff;
  border-radius: 20px;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.1);

  &__paren {
    color: #e65100;
  }

  &__tag {
    margin-right: 0.6rem;
    padding: 0 0.6rem;
    font-size: 0.6em;
    vertical-align: middle;
    color: #ffffff;
    background-color: #fb8c00;
    border-radius: 10px;
  }
}

.feedback {
  min-height: 2.2rem;
  margin: 0;
  padding: 0.2rem 1rem;
  text-align: center;
  font-size: 1.35rem;
  font-weight: $font-bold;
  color: #4e342e;
  border-radius: 12px;

  &--wrong {
    color: #c62828;
    background-color: #fff8e1;
    border: 2px solid #ffca28;
  }
}

.race {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
}

.solution {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 5;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  padding: 1rem 2.2rem;
  background-color: #f1f8e9;
  border: 4px solid #9ccc65;
  border-radius: 22px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);

  &__title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: $font-bold;
    color: #2e7d32;
  }

  &__cards {
    display: flex;
    gap: 2.2rem;
  }

  &__lines {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  &__tag {
    margin-right: 0.5rem;
    padding: 0 0.5rem;
    font-size: 0.65em;
    vertical-align: middle;
    color: #ffffff;
    background-color: #fb8c00;
    border-radius: 10px;
  }

  &__conclusion {
    margin: 0;
    padding: 0.2rem 1.2rem;
    font-size: 1.8rem;
    font-weight: $font-bold;
    color: #ffffff;
    background-color: #43a047;
    border-radius: 14px;
  }

  &__line {
    margin: 0;
    font-size: 2.2rem;
    font-weight: $font-bold;
    color: #33691e;
    white-space: nowrap;

    &--result {
      color: #1b5e20;
    }
  }

  &__first {
    padding: 0 0.15rem;
    background-color: #fff59d;
    border-bottom: 4px solid #fbc02d;
    border-radius: 4px;
  }
}

.next {
  @extend .button-basic;
  border: none;
  padding: 0.6rem 2.4rem;
  font-size: 1.7rem;
  background-color: #66bb6a;
  color: #ffffff;
}

@media (max-width: 1100px), (max-height: 760px) {
  .expr {
    font-size: 2.5rem;
    padding: 0.2rem 1.8rem;
  }

  .feedback {
    font-size: 1.15rem;
  }

  .solution__line {
    font-size: 1.8rem;
  }

  .exprs--pair .expr {
    font-size: 2rem;
    padding: 0.2rem 1rem;
  }

  .solution__cards {
    gap: 1.4rem;
  }

  .solution__conclusion {
    font-size: 1.5rem;
  }
}
</style>

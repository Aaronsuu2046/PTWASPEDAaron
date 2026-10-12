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
              'progress__dot--done':
                n - 1 < index || (n - 1 === index && answered),
              'progress__dot--now': n - 1 === index && !answered,
            }"
          />
        </div>

        <!-- 題目固定在道路上方 -->
        <div class="expr" data-expr>
          <span
            v-for="(tok, k) in exprTokens"
            :key="k"
            :class="{ expr__paren: tok === '(' || tok === ')' }"
            >{{ tok }}</span
          >
        </div>

        <p
          class="feedback"
          :class="{
            'feedback--wrong': feedbackKind === 'wrong',
            'feedback--crash': feedbackKind === 'crash',
          }"
          data-feedback
        >
          {{ feedback || ASK }}
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
          @race-crash="onCrash"
        />

        <!-- 答對後：完整解題過程，先算的部分標出來，按鈕確認才換題 -->
        <div v-if="answered" class="solution" data-solution>
          <p class="solution__title">答對了！這樣算：</p>
          <div class="solution__lines">
            <p class="solution__line">
              <span>{{ firstParts.before }}</span
              ><span class="solution__first">{{ firstParts.first }}</span
              ><span>{{ firstParts.after }}</span>
            </p>
            <p
              v-for="(s, k) in current.steps"
              :key="k"
              class="solution__line"
              :class="{
                'solution__line--result': k === current.steps.length - 1,
              }"
            >
              ＝{{ s }}
            </p>
          </div>
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
const ASK = "這題要怎麼算？按「上」「下」把車開進正確的答案！";
const HINT = "提示：有括號先算括號的部分；沒有括號就由左而右一步一步算。";
const RACING = { obstacles: true, holdOnCorrect: true };

function shuffle(list) {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 併式觀念題（賽車選答）：只有 1 關，從題庫隨機抽 PickCount（5）題、同輪不重複；
// 兩條車道終點放「由左而右一步一步算／先算括號的部分」，車子自動前進，學生用上下鍵換道；
// 答對後顯示完整解題過程，按「下一題」才換題，第 5 題按「完成」進入完成畫面
// 題目 { no, expr, answer: "ltr"|"paren", first: [start, end], steps: [第一步, 答案] }
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
      ASK,
      RACING,
      picked: shuffle(this.gameData.bank).slice(0, count),
      index: 0,
      raceKey: 0,
      answered: false,
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
    raceData() {
      return {
        Question: "",
        Options: [LABELS.ltr, LABELS.paren],
        Answer: this.current.answer === "ltr" ? 0 : 1,
      };
    },
    exprTokens() {
      return this.current.expr.match(/\d+|[^\d]/g);
    },
    firstParts() {
      const { expr, first } = this.current;
      return {
        before: expr.slice(0, first[0]),
        first: expr.slice(first[0], first[1]),
        after: expr.slice(first[1]),
      };
    },
  },
  methods: {
    onRecord([answer, chosen, result]) {
      this.$emit("add-record", [
        `${this.current.expr}（${plain(answer)}）`,
        plain(chosen),
        result,
      ]);
    },
    onCorrect() {
      this.answered = true;
      this.feedback = "";
      this.feedbackKind = "";
    },
    onWrong() {
      this.feedback = `再試一次！${this.gameConfig?.Hint || HINT}`;
      this.feedbackKind = "wrong";
    },
    onCrash() {
      this.feedback = "撞到三角錐了，回到起點再出發（不算答錯）";
      this.feedbackKind = "crash";
    },
    goNext() {
      if (!this.answered) return;
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

  &--crash {
    color: #e65100;
    background-color: #fff3e0;
    border: 2px solid #ffb74d;
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

  &__lines {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
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
}
</style>

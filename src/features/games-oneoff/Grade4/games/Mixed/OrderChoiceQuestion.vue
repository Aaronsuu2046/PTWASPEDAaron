<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
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

      <!-- 題目算式：一般 1 個；比較題 2 個（標 A、B） -->
      <div class="exprs">
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

      <div class="ask">
        <span class="ask__text">{{ askText }}</span>
        <!-- 答案框：點選項放進來，或直接拖進來；點框可以清掉 -->
        <button
          type="button"
          class="slot"
          :class="{
            'slot--hover': hoverSlot,
            'slot--wrong': wrong,
            'slot--correct': answered,
            'slot--empty': !choice,
          }"
          data-slot
          aria-label="我的答案"
          @click="clearChoice"
        >
          {{ chosenLabel || "點或拖曳選項到這裡" }}
        </button>
      </div>

      <div class="choices">
        <button
          v-for="c in choices"
          :key="c.value"
          type="button"
          class="choice"
          :class="[
            `choice--${c.value}`,
            { 'choice--chosen': choice === c.value },
          ]"
          :data-choice="c.value"
          @pointerdown="startDrag($event, c.value)"
          @pointermove="onDrag"
          @pointerup="endDrag"
          @pointercancel="cancelDrag"
          @click="onChoiceClick(c.value)"
        >
          <span class="choice__icon" aria-hidden="true">{{ c.icon }}</span>
          {{ c.label }}
        </button>
      </div>

      <!-- 答對後：完整解題過程，先算的部分標出來 -->
      <div v-if="answered" class="solution">
        <div v-for="(card, c) in cards" :key="c" class="solution__lines">
          <p class="solution__line">
            <span v-if="cards.length > 1" class="solution__tag">{{
              TAGS[c]
            }}</span>
            <span>{{ firstParts(card).before }}</span
            ><span class="solution__first">{{ firstParts(card).first }}</span
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
        <button type="button" class="next" data-next @click="goNext">
          {{ isLast ? "完成" : "下一題" }}
        </button>
      </div>

      <p v-else class="feedback" :class="{ 'feedback--hint': showHint }">
        {{ feedback }}
      </p>
    </div>

    <div
      v-if="drag && drag.moved"
      class="drag-ghost"
      :style="{ left: `${drag.x}px`, top: `${drag.y}px` }"
    >
      {{ labelOf(drag.value) }}
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";

const CHOICES = [
  { value: "ltr", label: "由左而右", icon: "→" },
  { value: "paren", label: "先算括號", icon: "( )" },
];
const DRAG_THRESHOLD = 8;

function shuffle(list) {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 併式觀念題共用（加減、乘除…）：只有 1 關，從題庫隨機抽 PickCount（預設 5）題、同輪不重複；
// 每題二選一「由左而右／先算括號」（點選或拖曳到答案框），答錯顯示 GameConfig.Hint，
// 答對後顯示完整解題過程，按「下一題」換題，最後一題按「完成」才進入完成畫面
// 題目 { no, expr, answer: "ltr"|"paren", first: [start, end], steps: [第一步, 答案] }
// 選填：比較題 { no, cards: [{ expr, first, steps }, …], answer }（兩個算式並排、解題過程各一欄）；
// GameConfig.Choices: [{ value, label, icon }] 換掉兩個選項，GameConfig.Ask 換掉「這題要怎麼算？」
export default {
  name: "OrderChoiceQuestion",
  props: {
    gameData: { type: Object, required: true },
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
      TAGS: ["A", "B"],
      picked: shuffle(this.gameData.bank).slice(0, count),
      index: 0,
      choice: "",
      drag: null,
      hoverSlot: false,
      suppressClick: false,
      wrong: false,
      showHint: false,
      feedback: "",
      answered: false,
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "這題要怎麼算？選選看正確的答案。";
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
    // 一般題 { expr, first, steps }；比較題 { cards: [{ expr, first, steps }, …] }
    cards() {
      return this.current.cards || [this.current];
    },
    choices() {
      return this.gameConfig?.Choices || CHOICES;
    },
    askText() {
      return this.gameConfig?.Ask || "這題要怎麼算？";
    },
    chosenLabel() {
      return this.labelOf(this.choice);
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    tokens(expr) {
      return expr.match(/\d+|[^\d]/g);
    },
    firstParts({ expr, first }) {
      return {
        before: expr.slice(0, first[0]),
        first: expr.slice(first[0], first[1]),
        after: expr.slice(first[1]),
      };
    },
    labelOf(value) {
      return this.choices.find((c) => c.value === value)?.label || "";
    },
    setChoice(value) {
      if (this.answered) return;
      this.choice = value;
      this.wrong = false;
      if (!this.showHint) this.feedback = "";
    },
    clearChoice() {
      if (this.answered) return;
      this.choice = "";
    },
    onChoiceClick(value) {
      if (this.suppressClick) {
        this.suppressClick = false;
        return;
      }
      this.setChoice(value);
    },
    startDrag(event, value) {
      if (this.answered) return;
      if (event.button !== undefined && event.button !== 0) return;
      this.suppressClick = false;
      this.drag = {
        value,
        startX: event.clientX,
        startY: event.clientY,
        x: event.clientX,
        y: event.clientY,
        moved: false,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    onDrag(event) {
      if (!this.drag) return;
      this.drag.x = event.clientX;
      this.drag.y = event.clientY;
      if (
        !this.drag.moved &&
        Math.hypot(
          event.clientX - this.drag.startX,
          event.clientY - this.drag.startY
        ) > DRAG_THRESHOLD
      )
        this.drag.moved = true;
      if (this.drag.moved) this.hoverSlot = this.overSlot(event);
    },
    endDrag(event) {
      if (!this.drag) return;
      if (this.drag.moved) {
        this.suppressClick = true;
        if (this.overSlot(event)) this.setChoice(this.drag.value);
      }
      this.cancelDrag();
    },
    cancelDrag() {
      this.drag = null;
      this.hoverSlot = false;
    },
    overSlot(event) {
      const el = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest("[data-slot]");
      return Boolean(el && this.$el.contains(el));
    },
    checkAnswer() {
      if (this.answered) return;
      if (!this.choice) {
        this.wrong = true;
        this.feedback = "先選「由左而右」或「先算括號」，再送出答案喔！";
        return;
      }
      const q = this.current;
      const isCorrect = this.choice === q.answer;
      this.$emit("add-record", [
        `${this.cards.map((c) => c.expr).join("／")}（${this.labelOf(q.answer)}）`,
        this.labelOf(this.choice),
        isCorrect ? "正確" : "錯誤",
      ]);
      if (isCorrect) {
        this.answered = true;
        this.wrong = false;
        this.showHint = false;
        this.feedback = "";
        this.$emit("play-effect", "CorrectSound");
      } else {
        this.wrong = true;
        this.showHint = true;
        this.choice = "";
        this.feedback = `再想想看！${this.gameConfig?.Hint || ""}`;
        this.$emit("play-effect", "WrongSound");
      }
    },
    goNext() {
      if (!this.answered) return;
      if (this.isLast) {
        this.$emit("next-question");
        return;
      }
      this.index += 1;
      this.choice = "";
      this.wrong = false;
      this.showHint = false;
      this.feedback = "";
      this.answered = false;
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
  justify-content: safe center;
  gap: 1rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small $padding--medium;
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

.exprs {
  display: flex;
  gap: 1.2rem;
}

.expr {
  display: flex;
  align-items: center;
  padding: 0.9rem 2.6rem;
  font-size: 3.8rem;
  font-weight: $font-bold;
  letter-spacing: 0.06em;
  color: #0d47a1;
  background-color: #ffffff;
  border-radius: 22px;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.1);

  &__paren {
    color: #e65100;
  }

  &__tag {
    margin-right: 0.8rem;
    padding: 0 0.6rem;
    font-size: 1.6rem;
    color: #ffffff;
    background-color: #7e57c2;
    border-radius: 10px;
  }
}

// 比較題兩個算式並排：字小一點
.exprs:has(.expr + .expr) .expr {
  padding: 0.6rem 1.4rem;
  font-size: 2.6rem;
}

.ask {
  display: flex;
  align-items: center;
  gap: 1rem;

  &__text {
    font-size: 1.6rem;
    font-weight: $font-bold;
    color: #4e342e;
  }
}

.slot {
  min-width: 15rem;
  height: 4.4rem;
  padding: 0 1.2rem;
  font-size: 1.9rem;
  font-weight: $font-bold;
  color: #6a1b9a;
  background-color: #ffffff;
  border: 4px dashed #ab47bc;
  border-radius: 16px;
  cursor: pointer;

  white-space: nowrap;

  &--empty {
    font-size: 1.3rem;
    color: #9e9e9e;
  }

  &--hover {
    box-shadow: 0 0 0 5px #ce93d8;
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

.choices {
  display: flex;
  gap: 2rem;
}

.choice {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.7rem 1.6rem;
  font-size: 2rem;
  font-weight: $font-bold;
  border-radius: 18px;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.14);
  cursor: grab;
  touch-action: none;
  user-select: none;

  &__icon {
    font-size: 1.6rem;
  }

  &--ltr,
  &--other {
    color: #01579b;
    background-color: #e1f5fe;
    border: 3px solid #29b6f6;
  }

  &--paren,
  &--diff {
    color: #bf360c;
    background-color: #fff3e0;
    border: 3px solid #ff9800;
  }

  &--same {
    color: #1b5e20;
    background-color: #e8f5e9;
    border: 3px solid #66bb6a;
  }

  &--chosen {
    box-shadow: 0 0 0 5px #ffd54f;
  }
}

.feedback {
  min-height: 3.6rem;
  max-width: 44rem;
  margin: 0;
  text-align: center;
  font-size: 1.3rem;
  font-weight: $font-bold;
  color: #c62828;

  &--hint {
    padding: 0.4rem 1rem;
    background-color: #fff8e1;
    border: 2px solid #ffca28;
    border-radius: 12px;
  }
}

.solution {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1.6rem;
  padding: 0.6rem 1.6rem;
  background-color: #f1f8e9;
  border: 3px solid #9ccc65;
  border-radius: 18px;

  &__lines {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  &__line {
    margin: 0;
    font-size: 1.8rem;
    font-weight: $font-bold;
    color: #33691e;
    white-space: nowrap;

    &--result {
      color: #1b5e20;
    }
  }

  &__tag {
    margin-right: 0.4rem;
    padding: 0 0.4rem;
    font-size: 1.2rem;
    color: #ffffff;
    background-color: #7e57c2;
    border-radius: 8px;
    vertical-align: middle;
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
  padding: 0.6rem 1.8rem;
  font-size: 1.6rem;
  background-color: #66bb6a;
  color: #ffffff;
}

.drag-ghost {
  position: fixed;
  z-index: 50;
  transform: translate(-50%, -50%);
  padding: 0.5rem 1.2rem;
  font-size: 1.9rem;
  font-weight: $font-bold;
  color: #6a1b9a;
  background-color: #f3e5f5;
  border: 3px solid #ab47bc;
  border-radius: 14px;
  pointer-events: none;
  opacity: 0.9;
}

@media (max-width: 1100px), (max-height: 760px) {
  .game-area {
    gap: 0.6rem;
  }

  .expr {
    font-size: 3rem;
    padding: 0.4rem 2rem;
  }

  .ask__text {
    font-size: 1.4rem;
  }

  .slot {
    height: 3.8rem;
    font-size: 1.7rem;
  }

  .choice {
    padding: 0.5rem 1.3rem;
    font-size: 1.75rem;
  }

  .solution {
    padding: 0.4rem 1.4rem;

    &__line {
      font-size: 1.4rem;
    }
  }
}
</style>

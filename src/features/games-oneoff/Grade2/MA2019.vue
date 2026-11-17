<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <div class="top">
        <!-- 題目：不等式固定在道路上方，□ 是要填的地方 -->
        <p class="expr" data-expr>
          <span
            v-for="(part, k) in parts"
            :key="k"
            :class="{
              expr__blank: part.blank,
              'expr__blank--filled': part.blank && shown,
            }"
            >{{ part.text }}</span
          >
        </p>
        <p
          class="feedback"
          :class="{
            'feedback--wrong': feedbackKind === 'wrong',
            'feedback--ok': feedbackKind === 'ok',
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
        />
      </div>
    </div>
  </div>
</template>

<script>
import RacingCar from "@/features/game-templates/racing-car/RacingCar.vue";

// 不放障礙物；車子停在原點，第一次按上／下才出發（#268 使用者確認）
const RACING = {
  obstacles: false,
  holdOnCorrect: true,
  waitStart: true,
  holdOnWrong: true,
  speedRatio: 0.0022,
};
const ASK = "哪一個才對？按「上」或「下」選車道，車子就會出發！";
// 答錯時車子停在答案框（holdOnWrong），先讓學生看正確關係，再換題
const SWAP_MS = 2600;
const NEXT_MS = 1600;

function pickOther(bank, current) {
  const others = bank.filter((q) => q.code !== current?.code);
  const pool = others.length ? others : bank;
  return pool[Math.floor(Math.random() * pool.length)];
}

// 比大小－紅綠燈賽車選答：題目上方顯示不等式，兩條車道終點各放一個選項（數字或 ＞／＜）
// 每關題目 { code, bank: [{ code, left, op, right, options, answer }] }：left／right 為 "□" 表示要填的數；
// op 為 "□" 表示要填大於或小於。答對進下一關；答錯顯示正確關係後，車子回原點並換同一關的另一題
export default {
  name: "MA2019",
  components: { RacingCar },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      ASK,
      RACING,
      current: pickOther(this.gameData.bank, null),
      raceKey: 0,
      shown: false,
      feedback: "",
      feedbackKind: "",
      answered: false,
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "比大小！把車開到正確的答案。";
    },
    raceData() {
      const q = this.current;
      return {
        Question: "",
        Options: q.options,
        Answer: q.options.indexOf(q.answer),
      };
    },
    // 不等式的三段；作答後把 □ 換成正確答案
    parts() {
      const q = this.current;
      const blank = (v) =>
        v === "□"
          ? { text: this.shown ? q.answer : "□", blank: true }
          : { text: v };
      return [blank(q.left), blank(q.op), blank(q.right)];
    },
    relation() {
      const q = this.current;
      const v = (x) => (x === "□" ? q.answer : x);
      return `${v(q.left)} ${v(q.op)} ${v(q.right)}`;
    },
  },
  beforeUnmount() {
    clearTimeout(this.timer);
  },
  methods: {
    exprText() {
      const q = this.current;
      return `${q.left} ${q.op} ${q.right}`;
    },
    onRecord([, chosen, result]) {
      this.$emit("add-record", [
        `${this.current.code} ${this.exprText()}（正確：${this.relation}）`,
        String(chosen),
        result,
      ]);
    },
    onCorrect() {
      this.answered = true;
      this.shown = true;
      this.feedbackKind = "ok";
      this.feedback = `答對了！${this.relation}`;
      this.timer = setTimeout(() => this.$emit("next-question"), NEXT_MS);
    },
    // 答錯：顯示正確關係，之後換同一關的另一題、車子回到原點
    onWrong() {
      if (this.shown) return;
      this.shown = true;
      this.feedbackKind = "wrong";
      this.feedback = `不對喔！正確的是 ${this.relation}。換一題再試試看！`;
      this.timer = setTimeout(() => {
        this.current = pickOther(this.gameData.bank, this.current);
        this.shown = false;
        this.feedback = "";
        this.feedbackKind = "";
        this.raceKey += 1;
      }, SWAP_MS);
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

.expr {
  display: flex;
  align-items: center;
  gap: 1.2rem;
  margin: 0;
  padding: 0.2rem 2.4rem;
  font-size: 3.2rem;
  font-weight: $font-bold;
  color: #0d47a1;
  background-color: #ffffff;
  border-radius: 20px;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.1);

  &__blank {
    min-width: 4rem;
    text-align: center;
    color: #e65100;
    border-bottom: 5px dashed #ffb74d;

    &--filled {
      color: #2e7d32;
      border-bottom-style: solid;
      border-bottom-color: #66bb6a;
    }
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

  &--ok {
    color: #2e7d32;
    background-color: #e8f5e9;
  }
}

.race {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
}

@media (max-width: 1100px), (max-height: 760px) {
  .expr {
    font-size: 2.5rem;
    padding: 0.2rem 1.8rem;
  }

  .feedback {
    font-size: 1.15rem;
  }
}
</style>

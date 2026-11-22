<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <p class="question" data-pad-avoid>
        數一數，共有多少元？（<button
          type="button"
          class="answer-box"
          :class="{
            'answer-box--active': padOpen && !answered,
            'answer-box--wrong': wrong,
            'answer-box--correct': answered,
          }"
          data-answer
          data-pad-field
          aria-label="共有多少元"
          @click="openPad"
        >
          {{ value }}</button
        >）元
      </p>

      <!-- 錢幣依面額由大到小分組排列，同面額排在一起方便點數 -->
      <div ref="tray" class="tray">
        <div
          v-for="group in groups"
          :key="group.value"
          class="tray__group"
          :data-group="group.value"
        >
          <MoneyItem
            v-for="i in group.count"
            :key="`${group.value}-${i}`"
            :value="group.value"
            :size="size"
            :class="{ 'is-merging': isMerging(group.value, i) }"
          />
        </div>
      </div>

      <!-- 兌換：小面額換成大面額，不能換回來；只在數量夠的時候可以按 -->
      <div class="trade">
        <button
          v-for="rule in RULES"
          :key="rule.id"
          type="button"
          class="trade__btn"
          :data-trade="rule.id"
          :disabled="!canTrade(rule) || !!merging || answered"
          @click="trade(rule)"
        >
          {{ rule.label }}
        </button>
      </div>

      <p v-if="feedback" class="feedback" :class="{ 'feedback--ok': answered }">
        {{ feedback }}
      </p>

      <FieldPad
        :field="padOpen && !answered ? padEl : null"
        @press="press"
        @close="padOpen = false"
      />
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import FieldPad from "../Grade4/games/Common/FieldPad.vue";
import MoneyItem from "./components/MoneyItem.vue";

const DENOMS = [1000, 500, 100, 50, 10, 5, 1];
const ALL_RULES = [
  { id: "1to10", from: 1, count: 10, to: 10, label: "10 個 1 元 ➜ 1 個 10 元" },
  { id: "5to10", from: 5, count: 2, to: 10, label: "2 個 5 元 ➜ 1 個 10 元" },
  {
    id: "10to100",
    from: 10,
    count: 10,
    to: 100,
    label: "10 個 10 元 ➜ 1 張 100 元",
  },
  {
    id: "50to100",
    from: 50,
    count: 2,
    to: 100,
    label: "2 個 50 元 ➜ 1 張 100 元",
  },
  {
    id: "100to500",
    from: 100,
    count: 5,
    to: 500,
    label: "5 張 100 元 ➜ 1 張 500 元",
  },
  {
    id: "100to1000",
    from: 100,
    count: 10,
    to: 1000,
    label: "10 張 100 元 ➜ 1 張 1000 元",
  },
  {
    id: "500to1000",
    from: 500,
    count: 2,
    to: 1000,
    label: "2 張 500 元 ➜ 1 張 1000 元",
  },
];
// 沒指定 rules 時（MA2017）用的兌換按鈕
const DEFAULT_RULES = ["1to10", "5to10", "10to100", "50to100"];
const MERGE_MS = 700;
// 答案最少可以填 3 位數；答案是 4 位數（1000）時放寬到 4 位
const MIN_LENGTH = 3;

// 使用錢幣－點數錢幣與兌換：數出錢幣共有多少元；可以把小面額換成大面額（不可逆、總額不變），只判定填的總額
// 題目 { code, coins: { 面額: 數量 }, answer }；面額可到 500、1000
// 選填 rules：這題要顯示的兌換按鈕 id（見 ALL_RULES），不填就是 MA2017 原本的四種
// 選填 GameConfig.WrongHint：答錯時的提示
export default {
  name: "MA2017",
  components: { FieldPad, MoneyItem },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    const coins = {};
    DENOMS.forEach((d) => (coins[d] = this.gameData.coins[d] || 0));
    const ids = this.gameData.rules || DEFAULT_RULES;
    return {
      RULES: ids.map((id) => ALL_RULES.find((r) => r.id === id)),
      coins,
      merging: null,
      size: 60,
      value: "",
      padOpen: false,
      padEl: null,
      wrong: false,
      answered: false,
      feedback: "",
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "數一數錢幣，也可以換成大面額再數。";
    },
    groups() {
      return DENOMS.filter((d) => this.coins[d] > 0).map((d) => ({
        value: d,
        count: this.coins[d],
      }));
    },
    maxLength() {
      return Math.max(MIN_LENGTH, String(this.gameData.answer).length);
    },
    total() {
      return DENOMS.reduce((sum, d) => sum + d * this.coins[d], 0);
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  mounted() {
    this.fit();
    this.observer = new ResizeObserver(() => this.fit());
    this.observer.observe(this.$refs.tray);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
    this.observer?.disconnect();
    clearTimeout(this.mergeTimer);
  },
  methods: {
    // 錢幣越多畫得越小：估算每枚佔的面積，讓全部放進盤子
    fit() {
      const tray = this.$refs.tray;
      if (!tray) return;
      const area = DENOMS.reduce(
        (sum, d) => sum + (this.gameData.coins[d] || 0) * (d >= 100 ? 2.2 : 1),
        0
      );
      const w = tray.clientWidth - 40;
      const h = tray.clientHeight - 30;
      // 每枚約佔 (0.9s + gap) × (s + gap)，留 45% 給分組間隔與換行
      const s = Math.sqrt((w * h * 0.55) / (area * 1.1));
      this.size = Math.max(36, Math.min(84, Math.floor(s)));
      this.shrinkToFit();
    },
    // 估算後實際畫出來若還是超出盤子，就每次縮小一點直到放得下
    async shrinkToFit() {
      const tray = this.$refs.tray;
      for (let i = 0; i < 20 && tray; i += 1) {
        await this.$nextTick();
        const over =
          tray.scrollHeight > tray.clientHeight + 1 ||
          tray.scrollWidth > tray.clientWidth + 1;
        if (!over || this.size <= 30) return;
        this.size -= 4;
      }
    },
    canTrade(rule) {
      return this.coins[rule.from] >= rule.count;
    },
    isMerging(value, i) {
      return (
        this.merging?.from === value &&
        i > this.coins[value] - this.merging.count
      );
    },
    trade(rule) {
      if (!this.canTrade(rule) || this.merging || this.answered) return;
      this.merging = rule;
      this.mergeTimer = setTimeout(() => {
        this.coins = {
          ...this.coins,
          [rule.from]: this.coins[rule.from] - rule.count,
          [rule.to]: this.coins[rule.to] + 1,
        };
        this.merging = null;
      }, MERGE_MS);
    },
    openPad(event) {
      if (this.answered) return;
      this.padEl = event.currentTarget;
      this.padOpen = true;
    },
    press(key) {
      if (this.answered) return;
      this.wrong = false;
      this.feedback = "";
      if (key === "clear") this.value = "";
      else if (key === "←") this.value = this.value.slice(0, -1);
      else if (/^\d$/.test(key) && this.value.length < this.maxLength)
        this.value = this.value === "0" ? key : this.value + key;
    },
    coinText(coins) {
      return DENOMS.filter((d) => coins[d])
        .map((d) => `${d}元×${coins[d]}`)
        .join("＋");
    },
    checkAnswer() {
      if (this.answered) return;
      const { code, answer, coins } = this.gameData;
      if (this.value === "") {
        this.wrong = true;
        this.feedback = "先在（　）裡填上共有多少元喔！";
        return;
      }
      const isCorrect = Number(this.value) === answer;
      this.$emit("add-record", [
        `${code} ${this.coinText(coins)}＝${answer} 元`,
        `${this.value} 元（盤中：${this.coinText(this.coins)}）`,
        isCorrect ? "正確" : "錯誤",
      ]);
      this.padOpen = false;
      if (isCorrect) {
        this.answered = true;
        this.wrong = false;
        this.feedback = "答對了！";
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
        return;
      }
      this.wrong = true;
      this.feedback =
        this.gameConfig?.WrongHint ||
        "再數一次：先數大的錢，再數小的錢；也可以先換成大面額。";
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
  gap: 0.6rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small $padding--medium;
}

.question {
  margin: 0;
  text-align: center;
  font-size: 1.7rem;
  font-weight: $font-bold;
  line-height: 2.2;
  color: #4e342e;
}

.answer-box {
  display: inline-block;
  min-width: 4.4rem;
  height: 3.2rem;
  margin: 0 0.2rem;
  vertical-align: middle;
  font-size: 2rem;
  font-weight: $font-bold;
  line-height: 1;
  color: #0d47a1;
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
  }
}

.tray {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  justify-content: center;
  gap: 1rem 1.6rem;
  padding: 0.8rem 1rem;
  background-color: #e8f5e9;
  border: 4px solid #a5d6a7;
  border-radius: 20px;
  overflow: hidden;

  &__group {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: center;
    gap: 0.3rem;
    padding: 0.3rem 0.5rem;
    background-color: rgba(255, 255, 255, 0.7);
    border-radius: 12px;
  }
}

.is-merging {
  animation: merge 0.7s ease-in-out forwards;
}

@keyframes merge {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.15);
    filter: drop-shadow(0 0 6px #ff4081);
  }
  100% {
    transform: scale(0.4);
    opacity: 0.2;
  }
}

.trade {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.6rem;

  &__btn {
    padding: 0.35rem 0.9rem;
    font-size: 1.15rem;
    font-weight: $font-bold;
    color: #ffffff;
    background-color: #8e24aa;
    border: none;
    border-radius: 14px;
    box-shadow: 0 4px 0 #6a1b9a;
    cursor: pointer;

    &:disabled {
      background-color: #bdbdbd;
      box-shadow: none;
      cursor: not-allowed;
    }
  }
}

.feedback {
  margin: 0;
  align-self: center;
  padding: 0.2rem 1rem;
  font-size: 1.3rem;
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
  .question {
    font-size: 1.45rem;
  }

  .trade__btn {
    font-size: 1rem;
  }
}
</style>

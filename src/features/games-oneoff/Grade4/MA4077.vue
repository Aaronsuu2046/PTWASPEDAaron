<template>
  <CalculatorQuestion
    :game-data="gameData"
    :intro-text="introText"
    compact
    @play-effect="$emit('play-effect', $event)"
    @add-record="$emit('add-record', $event)"
    @next-question="$emit('next-question')"
  />
</template>

<script>
import CalculatorQuestion from "./games/CalculatorQuestion/CalculatorQuestion.vue";

// 小數的加減（計算題）：用計算機算，再點橫式的問號用小鍵盤填答案；以數值判定（2.9 與 2.90 相同）
export default {
  name: "MA4077",
  components: { CalculatorQuestion },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
};
</script>

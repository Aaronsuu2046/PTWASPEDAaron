<template>
  <CalculatorQuestion
    :game-data="gameData"
    :intro-text="introText"
    @play-effect="$emit('play-effect', $event)"
    @add-record="$emit('add-record', $event)"
    @next-question="$emit('next-question')"
  />
</template>

<script>
import CalculatorQuestion from "./games/CalculatorQuestion/CalculatorQuestion.vue";

// 四位數÷一位數（計算題）：用計算機算，再點橫式的問號用小鍵盤填答案
export default {
  name: "MA4041",
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

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

// 三、四位數×二位數（計算題）：用計算機按出算式的答案
export default {
  name: "MA4025",
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

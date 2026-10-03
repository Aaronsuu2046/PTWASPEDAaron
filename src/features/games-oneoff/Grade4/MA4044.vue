<template>
  <WordProblemQuestion
    :game-data="gameData"
    :intro-text="introText"
    @play-effect="$emit('play-effect', $event)"
    @add-record="$emit('add-record', $event)"
    @next-question="$emit('next-question')"
  />
</template>

<script>
import WordProblemQuestion from "./games/WordProblemQuestion/WordProblemQuestion.vue";

// 二位數÷二位數（應用題）：被除數由題目給定，填除號、除數、商與餘數，再分別填答案（關卡 1 只問商）
export default {
  name: "MA4044",
  components: { WordProblemQuestion },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
};
</script>

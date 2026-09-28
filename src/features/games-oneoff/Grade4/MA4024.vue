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

// 一、二位數×二位數（應用題）：第一個因數由題目給定，填乘號、第二個因數、乘積與答案
export default {
  name: "MA4024",
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

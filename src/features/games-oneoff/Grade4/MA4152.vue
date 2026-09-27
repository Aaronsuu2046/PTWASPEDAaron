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

// 一位小數×整數（應用題）：填做法算式與答案
export default {
  name: "MA4152",
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

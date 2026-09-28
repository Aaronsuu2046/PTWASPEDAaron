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

// 長方形、正方形的面積：看圖填做法算式、答案與單位
export default {
  name: "MA4142",
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

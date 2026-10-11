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

// 小數的加減（應用題）：填兩個數、＋或－、結果與答案（3.4 與 3.40 都對）；可打開直式計算紙，小數點上下對齊，不計分
export default {
  name: "MA4078",
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

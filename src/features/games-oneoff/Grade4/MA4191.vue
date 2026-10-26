<template>
  <TimeConversionQuestion
    :game-data="gameData"
    :intro-text="introText"
    @play-effect="$emit('play-effect', $event)"
    @add-record="$emit('add-record', $event)"
    @next-question="$emit('next-question')"
  />
</template>

<script>
import TimeConversionQuestion from "./games/Time/TimeConversionQuestion.vue";

// 時間單位的換算：日、時、分、秒互換，填乘法＋加法或除法（商…餘數）的做法與答案
export default {
  name: "MA4191",
  components: { TimeConversionQuestion },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
};
</script>

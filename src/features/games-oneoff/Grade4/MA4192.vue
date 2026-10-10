<template>
  <TimeArithmeticQuestion
    :game-data="gameData"
    :intro-text="introText"
    @play-effect="$emit('play-effect', $event)"
    @add-record="$emit('add-record', $event)"
    @next-question="$emit('next-question')"
  />
</template>

<script>
import TimeArithmeticQuestion from "./games/Time/TimeArithmeticQuestion.vue";

// 時間量的加減（應用題）：填完整橫式與答案（日／時、時／分、分／秒），可打開時間直式計算紙
export default {
  name: "MA4192",
  components: { TimeArithmeticQuestion },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
};
</script>

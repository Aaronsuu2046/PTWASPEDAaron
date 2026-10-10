<template>
  <TimeIntervalQuestion
    :game-data="gameData"
    :intro-text="introText"
    @play-effect="$emit('play-effect', $event)"
    @add-record="$emit('add-record', $event)"
    @next-question="$emit('next-question')"
  />
</template>

<script>
import TimeIntervalQuestion from "./games/Time/TimeIntervalQuestion.vue";

// 兩時刻間的時間量（應用題）：結束時刻－開始時刻＝經過時間（同上下午、含秒、跨中午）
export default {
  name: "MA4193",
  components: { TimeIntervalQuestion },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
};
</script>

<template>
  <TimeCalcQuestion
    :game-data="gameData"
    :intro-text="introText"
    @play-effect="$emit('play-effect', $event)"
    @add-record="$emit('add-record', $event)"
    @next-question="$emit('next-question')"
  />
</template>

<script>
import TimeCalcQuestion from "./games/Time/TimeCalcQuestion.vue";

// 時刻與時間量的計算（應用題）：開始時刻＋經過時間＝結束時刻，或結束時刻－經過時間＝開始時刻（含跨中午）
export default {
  name: "MA4194",
  components: { TimeCalcQuestion },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
};
</script>

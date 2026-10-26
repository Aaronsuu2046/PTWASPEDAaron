<template>
  <DateTimeQuestion
    :game-data="gameData"
    :intro-text="introText"
    @play-effect="$emit('play-effect', $event)"
    @add-record="$emit('add-record', $event)"
    @next-question="$emit('next-question')"
  />
</template>

<script>
import DateTimeQuestion from "./games/Time/DateTimeQuestion.vue";

// 跨日的時間計算（應用題）：日期時刻加減小時，或求兩個日期時刻間經過幾日幾小時
export default {
  name: "MA4195",
  components: { DateTimeQuestion },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
};
</script>

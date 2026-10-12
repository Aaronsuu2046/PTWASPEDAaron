<template>
  <RacingOrderQuestion
    :game-data="gameData"
    :game-id="gameId"
    :game-config="gameConfig"
    :intro-text="introText"
    @play-effect="$emit('play-effect', $event)"
    @add-record="$emit('add-record', $event)"
    @next-question="$emit('next-question')"
  />
</template>

<script>
import RacingOrderQuestion from "./games/Mixed/RacingOrderQuestion.vue";

// 加與減的併式（觀念題）：賽車選答，1 關抽 5 題，開進「由左而右一步一步算／先算括號的部分」，
// 答對後看完整解題過程
export default {
  name: "MA4081",
  components: { RacingOrderQuestion },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
};
</script>

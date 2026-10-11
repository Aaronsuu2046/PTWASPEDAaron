<template>
  <DecimalMazeGame
    :game-data="gameData"
    :intro-text="introText"
    @play-effect="$emit('play-effect', $event)"
    @add-record="$emit('add-record', $event)"
    @next-question="$emit('next-question')"
  />
</template>

<script>
import DecimalMazeGame from "./games/Maze/DecimalMazeGame.vue";

// 小數比大小（迷宮）：走到正確的 >、< 或 = 答案區
export default {
  name: "MA4076",
  components: { DecimalMazeGame },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
};
</script>

<template>
  <OrderChoiceQuestion
    :game-data="gameData"
    :game-config="gameConfig"
    :intro-text="introText"
    @play-effect="$emit('play-effect', $event)"
    @add-record="$emit('add-record', $event)"
    @next-question="$emit('next-question')"
  />
</template>

<script>
import OrderChoiceQuestion from "./games/Mixed/OrderChoiceQuestion.vue";

// 乘與除的併式（觀念題）：1 關抽 5 題，選「由左而右／先算括號」，答對後看完整解題過程
export default {
  name: "MA4084",
  components: { OrderChoiceQuestion },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
};
</script>

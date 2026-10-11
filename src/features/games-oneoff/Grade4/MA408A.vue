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

// 加減與除的混合計算（概念釐清）：1 關抽 5 題，比較兩個算式的答案「一樣／不一樣」，答對後看兩個算式的解題過程
export default {
  name: "MA408A",
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

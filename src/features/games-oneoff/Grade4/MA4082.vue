<template>
  <ChainExpressionQuestion
    :game-data="gameData"
    :game-config="gameConfig"
    :intro-text="introText"
    @play-effect="$emit('play-effect', $event)"
    @add-record="$emit('add-record', $event)"
    @next-question="$emit('next-question')"
  />
</template>

<script>
import ChainExpressionQuestion from "./games/Mixed/ChainExpressionQuestion.vue";

// 加與減的併式（計算題）：遞等式填第一步結果與最後答案，附計算紙（畫筆／定位版）
export default {
  name: "MA4082",
  components: { ChainExpressionQuestion },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
};
</script>

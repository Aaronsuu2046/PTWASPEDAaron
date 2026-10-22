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

// 加減與乘的混合計算（應用題）：看題目與情境圖，填運算符號、第一步結果、第二步符號、結果與答案，附計算紙（畫筆／定位版）
export default {
  name: "MA4089",
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

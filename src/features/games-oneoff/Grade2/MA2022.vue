<template>
  <VerticalCalc
    :game-data="gameData"
    :game-config="gameConfig"
    :intro-text="introText"
    @play-effect="$emit('play-effect', $event)"
    @add-record="$emit('add-record', $event)"
    @next-question="$emit('next-question')"
  />
</template>

<script>
import VerticalCalc from "./games/VerticalCalc.vue";

// 二位數加法應用－用直式解題：讀文字題填出橫式，再把橫式拖到直式算出答案（VerticalCalc 應用題模式）
export default {
  name: "MA2022",
  components: { VerticalCalc },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
};
</script>

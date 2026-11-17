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

// 二位數減法－橫式轉直式與計算：把被減數、減數與「－」拖到直式並對齊，再用直式（含退位標記）算出答案
export default {
  name: "MA2023",
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

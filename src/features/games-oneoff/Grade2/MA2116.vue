<template>
  <MA2019
    :game-data="gameData"
    :game-id="gameId"
    :game-config="gameConfig"
    :intro-text="introText"
    @play-effect="$emit('play-effect', $event)"
    @next-question="$emit('next-question')"
    @add-record="$emit('add-record', $event)"
  />
</template>

<script>
import MA2019 from "./MA2019.vue";

// 比大小－1000以內賽車選答：沿用 MA2019 的賽車（無障礙物、停在原點、按上／下才出發）
// GameConfig.WrongNext：答錯顯示正解後直接進下一關，不在同關重選
export default {
  name: "MA2116",
  components: { MA2019 },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
};
</script>

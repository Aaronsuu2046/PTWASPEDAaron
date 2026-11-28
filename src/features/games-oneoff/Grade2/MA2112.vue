<template>
  <MA2014
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
import MA2014 from "./MA2014.vue";

// 幾個百、幾個十、幾個一－積木選答（1000 以內）：沿用 MA2014 的積木三選一
// 題目 { code, hundreds, tens, ones, options, answer }；十條可超過 9 條，照數量畫出、不自動換成百格板
export default {
  name: "MA2112",
  components: { MA2014 },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
};
</script>

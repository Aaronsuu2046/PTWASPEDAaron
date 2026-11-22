<template>
  <MA2018
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
import MA2018 from "./MA2018.vue";

// 認識及使用錢幣－拿出正確的錢幣（1000 以內）：沿用 MA2018 的錢包與付款盤
// 題目 { code, product, name, price, wallet }；付款盤剛好等於價格就對，超過時立刻提示
export default {
  name: "MA2115",
  components: { MA2018 },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
};
</script>

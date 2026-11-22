<template>
  <MA2017
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
import MA2017 from "./MA2017.vue";

// 認識及使用錢幣－點數錢幣與兌換（1000 以內）：沿用 MA2017 的點數與兌換
// 題目 { code, coins, answer, rules }；rules 指定這題能用的兌換（100→1000、500→1000、100→500、10→100）
export default {
  name: "MA2114",
  components: { MA2017 },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
};
</script>

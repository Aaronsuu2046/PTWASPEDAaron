<template>
  <MA2012
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
import MA2012 from "./MA2012.vue";

// 數到 1000－讀法連連看：沿用 MA2012 的連連看（MatchThree、語音卡、numberReading）
// 題目 { code, values: [3 個數], columns: ["number", "text"|"voice", ...] }，每關從 5 組抽 1 組
export default {
  name: "MA2111",
  components: { MA2012 },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
};
</script>

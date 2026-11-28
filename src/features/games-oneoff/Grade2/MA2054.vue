<template>
  <TimesTable
    :game-data="gameData"
    :game-config="gameConfig"
    :intro-text="introText"
    @play-effect="$emit('play-effect', $event)"
    @next-question="$emit('next-question')"
    @add-record="$emit('add-record', $event)"
  />
</template>

<script>
import TimesTable from "./games/TimesTable.vue";

// 4 的乘法－圖像操作與乘法表填空（共用 TimesTable 版型；圖組與題庫在 MA2054.json）
export default {
  name: "MA2054",
  components: { TimesTable },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
};
</script>

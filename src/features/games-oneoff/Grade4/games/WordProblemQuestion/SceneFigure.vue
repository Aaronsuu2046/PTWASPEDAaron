<template>
  <svg
    class="scene-figure"
    viewBox="0 0 320 185"
    role="img"
    :aria-label="`${figure.total}，${figure.rule}`"
  >
    <!-- 左邊：全部的東西 -->
    <g v-if="figure.item === 'rope'">
      <path
        d="M 22 90 C 50 40, 90 140, 120 70 S 150 40, 140 110"
        class="scene-figure__rope"
      />
    </g>
    <g v-else>
      <g
        v-for="(pos, k) in PILE"
        :key="`pile-${k}`"
        :transform="`translate(${pos[0]} ${pos[1]})`"
      >
        <SceneIcon :name="figure.item" />
      </g>
    </g>
    <text x="80" y="168" class="scene-figure__label">{{ figure.total }}</text>

    <!-- 中間箭頭 -->
    <path
      d="M 150 90 H 176 M 168 80 L 178 90 L 168 100"
      class="scene-figure__arrow"
    />

    <!-- 右邊：平分成幾份，或每幾個一份 -->
    <g v-if="figure.mode === 'share'">
      <g
        v-for="(pos, k) in shareSlots"
        :key="`slot-${k}`"
        :transform="`translate(${pos[0]} ${pos[1]})`"
      >
        <SceneIcon :name="figure.holder" />
      </g>
      <text v-if="moreHolders" x="300" y="100" class="scene-figure__more">
        …
      </text>
    </g>
    <g v-else transform="translate(244 88)">
      <SceneIcon :name="figure.holder" big />
    </g>
    <text x="245" y="168" class="scene-figure__label">{{ figure.rule }}</text>
  </svg>
</template>

<script>
import SceneIcon from "./SceneIcon.vue";

// 左邊一堆東西的位置（兩排）
const PILE = [
  [40, 58],
  [80, 52],
  [120, 58],
  [40, 112],
  [80, 106],
  [120, 112],
];
// 右邊最多畫 4 份，再多就加「…」
const SLOTS = [
  [218, 62],
  [272, 62],
  [218, 118],
  [272, 118],
];

// 應用題情境圖：{ shape: "scene", item, holder, mode: "share" | "each", count, total, rule }
// share：平分成 count 份（最多畫 4 份）；each：每幾個一份（畫一個容器）
// 圖上只放題目給的數字，不出現答案
export default {
  name: "SceneFigure",
  components: { SceneIcon },
  props: {
    figure: { type: Object, required: true },
  },
  data() {
    return { PILE };
  },
  computed: {
    shareSlots() {
      return SLOTS.slice(0, Math.min(this.figure.count || 4, SLOTS.length));
    },
    moreHolders() {
      return (this.figure.count || 0) > SLOTS.length;
    },
  },
};
</script>

<style scoped lang="scss">
.scene-figure {
  display: block;
  width: 100%;
  height: auto;

  &__rope {
    fill: none;
    stroke: #a1887f;
    stroke-width: 9;
    stroke-linecap: round;
  }

  &__arrow {
    fill: none;
    stroke: #ff7043;
    stroke-width: 5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  &__label {
    font-size: 17px;
    font-weight: 700;
    text-anchor: middle;
    fill: #4e342e;
  }

  &__more {
    font-size: 26px;
    font-weight: 700;
    text-anchor: middle;
    fill: #6d4c41;
  }
}
</style>

<template>
  <!-- 百格板、十條、個位方塊：照題目給的數量畫，不會自動換位（例如 14 條十就畫 14 條） -->
  <div class="blocks" :style="{ '--unit': `${unit}px` }">
    <div v-if="hundreds" class="blocks__group blocks__group--hundreds">
      <svg
        v-for="i in hundreds"
        :key="`h${i}`"
        class="flat"
        viewBox="0 0 100 100"
        data-block="hundred"
        aria-label="一百"
      >
        <rect x="1" y="1" width="98" height="98" rx="3" class="flat__bg" />
        <template v-for="r in 10" :key="`r${r}`">
          <rect
            v-for="c in 10"
            :key="`c${c}`"
            :x="(c - 1) * 9.8 + 1.6"
            :y="(r - 1) * 9.8 + 1.6"
            width="8.6"
            height="8.6"
            rx="1.2"
            class="flat__cell"
          />
        </template>
      </svg>
    </div>
    <div v-if="tens" class="blocks__group blocks__group--tens">
      <svg
        v-for="i in tens"
        :key="`t${i}`"
        class="rod"
        :class="{ 'is-merging': mergingAt('ten', i) }"
        viewBox="0 0 10 100"
        data-block="ten"
        aria-label="十"
      >
        <rect x="0.5" y="0.5" width="9" height="99" rx="1.5" class="rod__bg" />
        <rect
          v-for="c in 10"
          :key="c"
          x="1.2"
          :y="(c - 1) * 9.8 + 1.6"
          width="7.6"
          height="8.6"
          rx="1"
          class="rod__cell"
        />
      </svg>
    </div>
    <div v-if="ones" class="blocks__group blocks__group--ones">
      <svg
        v-for="i in ones"
        :key="`o${i}`"
        class="cube"
        :class="{ 'is-merging': mergingAt('one', i) }"
        viewBox="0 0 10 10"
        data-block="one"
        aria-label="一"
      >
        <rect
          x="0.6"
          y="0.6"
          width="8.8"
          height="8.8"
          rx="1.4"
          class="cube__cell"
        />
      </svg>
    </div>
  </div>
</template>

<script>
// 二年級位值積木（百格板／十條／個位方塊），SVG 可縮放
// unit：一小格的邊長（px），百格板是 10×10 格、十條是 1×10 格、個位方塊是 1 格
export default {
  name: "BaseTenBlocks",
  props: {
    hundreds: { type: Number, default: 0 },
    tens: { type: Number, default: 0 },
    ones: { type: Number, default: 0 },
    unit: { type: Number, default: 16 },
    // 選填：換算動畫，把前 count 個 kind（"one"／"ten"）標成正在合併
    highlight: { type: Object, default: null },
  },
  methods: {
    mergingAt(kind, i) {
      return this.highlight?.kind === kind && i <= (this.highlight.count ?? 10);
    },
  },
};
</script>

<style scoped lang="scss">
.blocks {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: center;
  gap: calc(var(--unit) * 1.2);

  &__group {
    display: flex;
    align-items: flex-end;
    gap: calc(var(--unit) * 0.35);

    &--ones {
      // 個位方塊每 5 個一排，方便數；超過 10 個也照數量排，不換成十條
      display: grid;
      grid-template-columns: repeat(5, var(--unit));
      gap: calc(var(--unit) * 0.3);
    }
  }
}

// 換算時，要合併的 10 個積木閃動並縮小
.is-merging {
  animation: merge 0.7s ease-in-out forwards;
}

@keyframes merge {
  0% {
    transform: scale(1);
    filter: none;
  }
  40% {
    transform: scale(1.15);
    filter: drop-shadow(0 0 6px #ff4081);
  }
  100% {
    transform: scale(0.4);
    opacity: 0.2;
  }
}

.flat {
  width: calc(var(--unit) * 10);
  height: calc(var(--unit) * 10);

  &__bg {
    fill: #1565c0;
  }

  &__cell {
    fill: #64b5f6;
  }
}

.rod {
  width: var(--unit);
  height: calc(var(--unit) * 10);

  &__bg {
    fill: #2e7d32;
  }

  &__cell {
    fill: #81c784;
  }
}

.cube {
  width: var(--unit);
  height: var(--unit);

  &__cell {
    fill: #ffb300;
    stroke: #e65100;
    stroke-width: 0.8;
  }
}
</style>

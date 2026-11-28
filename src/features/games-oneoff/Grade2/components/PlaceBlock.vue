<template>
  <!-- 單一塊積木（可以拖）：百格板、十條、個位方塊；配色和 BaseTenBlocks 的 orange 一致 -->
  <svg
    v-if="kind === 'hundred'"
    class="place-block place-block--hundred"
    viewBox="0 0 100 100"
    aria-label="百格板"
  >
    <rect x="1" y="1" width="98" height="98" rx="3" fill="#00838f" />
    <template v-for="r in 10" :key="`r${r}`">
      <rect
        v-for="c in 10"
        :key="`c${c}`"
        :x="(c - 1) * 9.8 + 1.6"
        :y="(r - 1) * 9.8 + 1.6"
        width="8.6"
        height="8.6"
        rx="1.2"
        fill="#80deea"
      />
    </template>
  </svg>
  <svg
    v-else-if="kind === 'ten'"
    class="place-block place-block--ten"
    viewBox="0 0 12 100"
    aria-label="十條"
  >
    <rect x="0.5" y="0.5" width="11" height="99" rx="2" fill="#e65100" />
    <rect
      v-for="c in 10"
      :key="c"
      x="1.6"
      :y="(c - 1) * 9.8 + 1.6"
      width="8.8"
      height="8.6"
      rx="1"
      fill="#ffb74d"
    />
  </svg>
  <svg
    v-else
    class="place-block place-block--one"
    viewBox="0 0 10 10"
    aria-label="個位方塊"
  >
    <rect
      x="0.8"
      y="0.8"
      width="8.4"
      height="8.4"
      rx="1.4"
      fill="#ffffff"
      stroke="#616161"
      stroke-width="1.2"
    />
  </svg>
</template>

<script>
export default {
  name: "PlaceBlock",
  props: {
    // hundred | ten | one
    kind: { type: String, required: true },
  },
};
</script>

<style scoped>
.place-block {
  display: block;
}

.place-block--hundred {
  width: var(--hundred, 3.4rem);
  height: var(--hundred, 3.4rem);
}

.place-block--ten {
  width: calc(var(--hundred, 3.4rem) * 0.16);
  height: var(--hundred, 3.4rem);
}

.place-block--one {
  width: var(--one, 1.1rem);
  height: var(--one, 1.1rem);
}
</style>

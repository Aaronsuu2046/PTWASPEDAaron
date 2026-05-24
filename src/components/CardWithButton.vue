<template>
  <div class="OutterContainer">
    <img
      v-if="imageURL !== undefined && imageURL !== ''"
      :src="imageURL"
      class=""
      :alt="altText"
    />
    <p class="h3">
      {{ text }}
    </p>
  </div>
</template>
<script>
export default {
  name: "CardWithButton",
  props: {
    text: {
      type: String,
      required: true,
    },
    altText: {
      type: String,
      required: true,
    },
    imageURL: {
      type: String,
      required: true,
    },
  },
  data() {
    return {};
  },
  computed: {
  },
  mounted() {},
};
</script>

<style scoped lang="scss">
.OutterContainer {
  display: grid;
  grid-template-rows: 5fr 1fr;
  width: 100%;
  height: 100%;
  img {
    width: 100%;
    height: 100%;
  }
}
</style>

<template>
  <!-- 直式分數：帶分數的整數寫在左邊，分子在上、分母在下 -->
  <span class="stacked-fraction" :aria-label="label">
    <span v-if="whole" class="stacked-fraction__whole">{{ whole }}</span>
    <span class="stacked-fraction__frac">
      <span class="stacked-fraction__num">{{ num }}</span>
      <span class="stacked-fraction__den">{{ den }}</span>
    </span>
  </span>
</template>

<script>
export default {
  name: "StackedFraction",
  props: {
    whole: { type: Number, default: 0 },
    num: { type: Number, required: true },
    den: { type: Number, required: true },
  },
  computed: {
    label() {
      const frac = `${this.den}分之${this.num}`;
      return this.whole ? `${this.whole}又${frac}` : frac;
    },
  },
};
</script>

<style scoped lang="scss">
.stacked-fraction {
  display: inline-flex;
  align-items: center;
  gap: 0.2em;
  font-weight: $font-bold;
  line-height: 1;

  &__whole {
    font-size: 1.15em;
  }

  &__frac {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
  }

  &__num,
  &__den {
    min-width: 1.4em;
    padding: 0 0.15em;
    text-align: center;
  }

  &__num {
    padding-bottom: 0.1em;
    border-bottom: 0.12em solid currentColor;
  }

  &__den {
    padding-top: 0.1em;
  }
}
</style>

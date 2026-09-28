<template>
  <div class="fraction-with-shape">
    <div class="fraction-with-shape__fraction">
      <span>{{ numerator }}</span>
      <span class="fraction-with-shape__line"></span>
      <span>{{ denominator }}</span>
    </div>
    <!-- 分子大於分母時畫出多個整體，例如 3/2 畫兩個 -->
    <div class="fraction-with-shape__shapes">
      <div
        v-for="(filled, index) in wholes"
        :key="index"
        class="fraction-with-shape__shape"
        :class="`fraction-with-shape__shape--${shape}`"
      >
        <PartitionedShape
          :shape="shape"
          :denominator="denominator"
          :filled="filled"
        />
      </div>
    </div>
  </div>
</template>

<script>
import PartitionedShape from "@/components/PartitionedShape.vue";

// 顯示分數與對應的已填色圖形，供比較、配對等模板當作題目元件使用
// componentConfig: { numerator, denominator, shape?: "bar" | "circle" | "square" }
export default {
  name: "FractionWithShape",
  components: { PartitionedShape },
  props: {
    componentConfig: { type: Object, required: true },
  },
  computed: {
    numerator() {
      return this.componentConfig.numerator;
    },
    denominator() {
      return this.componentConfig.denominator;
    },
    shape() {
      return this.componentConfig.shape || "bar";
    },
    wholes() {
      const count = Math.max(1, Math.ceil(this.numerator / this.denominator));
      return Array.from({ length: count }, (_, i) =>
        Math.min(this.denominator, this.numerator - i * this.denominator)
      );
    },
  },
};
</script>

<style scoped lang="scss">
.fraction-with-shape {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;

  &__fraction {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-size: 2.5rem;
    font-weight: bold;
    line-height: 1.15;
  }

  &__line {
    display: block;
    width: 100%;
    min-width: 2.5rem;
    border-top: 0.2rem solid #000000;
  }

  &__shapes {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
  }

  &__shape {
    width: 100%;
    max-width: 320px;
    aspect-ratio: 32 / 9;

    &--circle,
    &--square {
      width: auto;
      height: 110px;
      aspect-ratio: 1 / 1;
    }
  }
}
</style>

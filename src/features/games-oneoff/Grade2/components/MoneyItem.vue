<template>
  <!-- 一枚錢幣或一張鈔票：用專案的錢幣素材（MoneyGenerator），硬幣保留真實的大小比例 -->
  <span
    class="money"
    :class="[`money--${value}`, { 'money--bill': isBill }]"
    :style="{ '--size': `${size}px` }"
    :data-money="value"
  >
    <img :src="src" :alt="`${value} 元`" draggable="false" />
  </span>
</template>

<script>
import { getSlotComponentAssets } from "@/lib/get-assets.js";

const FILES = {
  1: "1.png",
  5: "5.png",
  10: "10.png",
  50: "50.png",
  100: "100.png",
  500: "500.png",
  1000: "1000.png",
};

// 二年級錢幣：value 為 1、5、10、50、100、500、1000（100 以上是鈔票）；size 為硬幣格子的高度（px）
export default {
  name: "MoneyItem",
  props: {
    value: { type: Number, required: true },
    size: { type: Number, default: 56 },
  },
  computed: {
    isBill() {
      return this.value >= 100;
    },
    src() {
      return getSlotComponentAssets("MoneyGenerator", FILES[this.value]);
    },
  },
};
</script>

<style scoped lang="scss">
.money {
  display: inline-flex;
  align-items: flex-end;
  justify-content: center;
  // 硬幣圖片下方對齊、圖中已含真實大小比例，所以每種硬幣用同樣高度的格子
  width: calc(var(--size) * 0.9);
  height: var(--size);
  user-select: none;
  pointer-events: none;

  img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  &--bill {
    width: calc(var(--size) * 1.9);
    height: calc(var(--size) * 0.92);
    align-items: center;

    img {
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
    }
  }
}
</style>

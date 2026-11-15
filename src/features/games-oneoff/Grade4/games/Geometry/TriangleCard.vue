<template>
  <!-- 三角形圖卡；點選或拖曳由父元件處理 -->
  <div
    class="tri-card"
    :class="{
      'tri-card--small': small,
      'tri-card--selected': selected,
      'tri-card--wrong': wrong,
      'tri-card--dragging': dragging,
    }"
    :data-card="card.id"
    role="button"
    :aria-label="`三角形圖卡 ${card.id}`"
  >
    <!-- 正式插圖：只顯示三角形所在的範圍（box），透明的 polygon 對齊圖上的頂點，
         三角板吸附（snap-selector=".tri-card polygon"）靠它找頂點 -->
    <svg v-if="card.image" :viewBox="card.box.join(' ')" class="tri-card__svg">
      <image
        :href="imageSrc"
        x="0"
        y="0"
        :width="card.size[0]"
        :height="card.size[1]"
      />
      <polygon :points="pointsAttr" fill="transparent" stroke="none" />
    </svg>
    <svg v-else viewBox="0 0 160 110" class="tri-card__svg">
      <polygon
        :points="pointsAttr"
        :fill="card.color"
        stroke="#37474f"
        stroke-width="3.5"
        stroke-linejoin="round"
      />
    </svg>
  </div>
</template>

<script>
import { getGameAssets } from "@/lib/get-assets.js";

// card: { id, points: [[x, y] × 3], color }，座標以 160×110 為準
// 或正式插圖 card: { id, image, size: [寬, 高], box: [x, y, 寬, 高], points }，
// 座標以原圖像素為準；圖片放在 src/assets/games/<gameId>/
export default {
  name: "TriangleCard",
  props: {
    card: { type: Object, required: true },
    small: { type: Boolean, default: false },
    selected: { type: Boolean, default: false },
    wrong: { type: Boolean, default: false },
    dragging: { type: Boolean, default: false },
    gameId: { type: String, default: "MA4064" },
  },
  computed: {
    pointsAttr() {
      return this.card.points.map((p) => p.join(",")).join(" ");
    },
    imageSrc() {
      return getGameAssets(this.gameId, this.card.image);
    },
  },
};
</script>

<style scoped lang="scss">
.tri-card {
  width: 11rem;
  height: 7.6rem;
  flex-shrink: 0;
  background-color: #ffffff;
  border: 3px solid #b0bec5;
  border-radius: 12px;
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.12);
  cursor: grab;
  touch-action: none;
  user-select: none;

  // 分類框裡用小卡，一列放兩張
  &--small {
    width: 8rem;
    height: 5.5rem;
  }

  &--selected {
    border-color: #1e88e5;
    box-shadow: 0 0 0 4px #90caf9;
  }

  &--wrong {
    border-color: #e53935;
    box-shadow: 0 0 0 4px #ffcdd2;
  }

  &--dragging {
    opacity: 0.35;
  }

  &__svg {
    width: 100%;
    height: 100%;
    display: block;
  }
}

@media (max-width: 1100px) {
  .tri-card {
    width: 8.4rem;
    height: 5.8rem;

    &--small {
      width: 5.6rem;
      height: 4.2rem;
    }
  }
}
</style>

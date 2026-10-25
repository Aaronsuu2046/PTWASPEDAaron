<template>
  <!-- 十進位積木：百格板（1）、條（0.1）、小方塊（0.01）；數量都能直接數出來 -->
  <svg
    class="base-ten"
    :viewBox="`0 ${layout.top} ${layout.width} ${layout.height}`"
    role="img"
    :aria-label="label"
  >
    <!-- 百格板 -->
    <g
      v-for="(x, k) in layout.flats"
      :key="`f${k}`"
      :transform="`translate(${x} ${(H - TEN) / 2})`"
    >
      <rect :width="TEN" :height="TEN" class="base-ten__flat" />
      <path :d="flatGrid" class="base-ten__seam" />
    </g>
    <!-- 條：10 格連在一起 -->
    <g
      v-for="(x, k) in layout.rods"
      :key="`r${k}`"
      :transform="`translate(${x} ${(H - TEN) / 2})`"
    >
      <rect :width="U" :height="TEN" class="base-ten__rod" />
      <path :d="rodSeams" class="base-ten__seam" />
    </g>
    <!-- 小方塊：一顆一顆分開 -->
    <rect
      v-for="(c, k) in layout.cubes"
      :key="`c${k}`"
      :x="c.x"
      :y="c.y"
      :width="CUBE"
      :height="CUBE"
      rx="1.5"
      class="base-ten__cube"
    />
  </svg>
</template>

<script>
const U = 12; // 一格的邊長
const TEN = U * 10;
const CUBE = 10; // 小方塊比一格小一點，看得出是分開的
const STEP = 13; // 小方塊之間的間距
const GAP = 12; // 不同積木之間的空隙
const H = TEN + 8;

// flats 張百格板、rods 條、cubes 個小方塊
// grouped：小方塊每 10 個排成一直排（仍是一顆一顆分開），否則每排 5 個
export default {
  name: "BaseTenDecimalBlocks",
  props: {
    flats: { type: Number, default: 0 },
    rods: { type: Number, default: 0 },
    cubes: { type: Number, default: 0 },
    grouped: { type: Boolean, default: false },
    // 圖例用：只有小方塊時裁到剛好包住方塊
    tight: { type: Boolean, default: false },
  },
  data() {
    return { U, TEN, CUBE, H };
  },
  computed: {
    layout() {
      let x = 4;
      const flats = [];
      const rods = [];
      const cubes = [];
      for (let k = 0; k < this.flats; k += 1) {
        flats.push(x);
        x += TEN + GAP;
      }
      for (let k = 0; k < this.rods; k += 1) {
        rods.push(x);
        x += U + GAP / 2;
      }
      if (this.rods) x += GAP;
      if (this.grouped) {
        // 每 10 個一直排，排與排之間空開
        const top = (H - (STEP * 9 + CUBE)) / 2;
        for (let k = 0; k < this.cubes; k += 1) {
          const col = Math.floor(k / 10);
          cubes.push({ x: x + col * (CUBE + GAP), y: top + (k % 10) * STEP });
        }
        x += Math.ceil(this.cubes / 10) * (CUBE + GAP);
      } else {
        // 每排 5 個，排成好數的長方形
        const rows = Math.ceil(this.cubes / 5);
        const top = (H - (rows - 1) * STEP - CUBE) / 2;
        for (let k = 0; k < this.cubes; k += 1) {
          cubes.push({
            x: x + (k % 5) * STEP,
            y: top + Math.floor(k / 5) * STEP,
          });
        }
        if (this.cubes) x += Math.min(this.cubes, 5) * STEP;
      }
      // 只有小方塊時把畫面裁小，方塊才夠大好數（至少留 5 排的高度）
      let top = 0;
      let height = H;
      if (!this.flats && !this.rods && !this.grouped && this.cubes) {
        const rows = Math.ceil(this.cubes / 5);
        height = (this.tight ? rows : Math.max(rows, 5)) * STEP + 6;
        top = (H - height) / 2;
      }
      return { width: Math.max(x + 4, 40), top, height, flats, rods, cubes };
    },
    flatGrid() {
      let d = "";
      for (let k = 1; k < 10; k += 1)
        d += `M ${k * U} 0 V ${TEN} M 0 ${k * U} H ${TEN} `;
      return d;
    },
    rodSeams() {
      let d = "";
      for (let k = 1; k < 10; k += 1) d += `M 0 ${k * U} H ${U} `;
      return d;
    },
    label() {
      const parts = [];
      if (this.flats) parts.push(`${this.flats} 張百格板`);
      if (this.rods) parts.push(`${this.rods} 條`);
      if (this.cubes) parts.push(`${this.cubes} 個小方塊`);
      return parts.join("、");
    },
  },
};
</script>

<style scoped lang="scss">
.base-ten {
  display: block;
  max-width: 100%;
  max-height: 100%;

  &__flat {
    fill: #90caf9;
    stroke: #1565c0;
    stroke-width: 2;
  }

  &__rod {
    fill: #81c784;
    stroke: #2e7d32;
    stroke-width: 2;
  }

  &__seam {
    fill: none;
    stroke: rgba(0, 0, 0, 0.35);
    stroke-width: 1;
  }

  &__cube {
    fill: #ffb74d;
    stroke: #e65100;
    stroke-width: 1.5;
  }
}
</style>

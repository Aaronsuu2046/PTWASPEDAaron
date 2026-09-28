<template>
  <svg
    class="box-items"
    :viewBox="`0 0 ${width} ${height}`"
    role="img"
    :aria-label="`1 盒${name}有 ${count} 顆`"
  >
    <rect
      x="3"
      y="3"
      :width="width - 6"
      :height="height - 6"
      rx="14"
      class="box-items__box"
    />
    <g
      v-for="item in items"
      :key="item.index"
      :transform="`translate(${item.x} ${item.y})`"
    >
      <template v-if="type === 'candy'">
        <path d="M -17 0 L -26 -9 L -26 9 Z" class="box-items__candy" />
        <path d="M 17 0 L 26 -9 L 26 9 Z" class="box-items__candy" />
        <ellipse rx="15" ry="11" class="box-items__candy" />
      </template>
      <ellipse v-else rx="16" ry="20" class="box-items__egg" />
    </g>
  </svg>
</template>

<script>
const CELL = { candy: 60, egg: 48 };
const ROW_HEIGHT = 52;
const PAD = 14;

// 一盒糖果或雞蛋，排成兩列
export default {
  name: "BoxItems",
  props: {
    type: {
      type: String,
      required: true,
      validator: (value) => ["candy", "egg"].includes(value),
    },
    count: { type: Number, required: true },
  },
  computed: {
    name() {
      return this.type === "candy" ? "糖果" : "雞蛋";
    },
    perRow() {
      return Math.ceil(this.count / 2);
    },
    width() {
      return PAD * 2 + this.perRow * CELL[this.type];
    },
    height() {
      return PAD * 2 + ROW_HEIGHT * 2;
    },
    items() {
      return Array.from({ length: this.count }, (_, index) => {
        const row = Math.floor(index / this.perRow);
        const col = index % this.perRow;
        return {
          index,
          x: PAD + (col + 0.5) * CELL[this.type],
          y: PAD + (row + 0.5) * ROW_HEIGHT,
        };
      });
    },
  },
};
</script>

<style scoped lang="scss">
.box-items {
  display: block;
  width: 100%;
  height: 100%;

  &__box {
    fill: #fff3e0;
    stroke: #8d6e63;
    stroke-width: 4;
  }

  &__candy {
    fill: #f06292;
    stroke: #ad1457;
    stroke-width: 2;
  }

  &__egg {
    fill: #fffde7;
    stroke: #a1887f;
    stroke-width: 2.5;
  }
}
</style>

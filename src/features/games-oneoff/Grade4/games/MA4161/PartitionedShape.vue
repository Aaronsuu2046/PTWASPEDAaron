<template>
  <svg
    class="partitioned-shape"
    :class="[
      `partitioned-shape--${shape}`,
      { 'partitioned-shape--paintable': paintable },
    ]"
    :viewBox="viewBox"
    role="img"
    :aria-label="`${denominator} 等分的${shapeName}`"
  >
    <!-- 各等分區塊：可塗色時點擊切換 -->
    <path
      v-for="(part, index) in parts"
      :key="index"
      :d="part"
      class="partitioned-shape__part"
      :class="{ 'partitioned-shape__part--filled': painted[index] }"
      @click="togglePart(index)"
    />
    <!-- 題目分母的等分虛線 -->
    <path :d="dividerPath" class="partitioned-shape__divider" />
    <!-- 原分數分母的分隔實線（等值分數對照用） -->
    <path v-if="basePath" :d="basePath" class="partitioned-shape__base" />
    <path :d="outlinePath" class="partitioned-shape__outline" />
  </svg>
</template>

<script>
const SIZE = 200;
const PAD = 6;
const BAR = { width: 320, height: 90 };

// 將 n 等分排成 rows × cols 的方格，rows ≤ cols（例如 8 → 2 × 4、9 → 3 × 3）
function gridDims(n) {
  let rows = Math.floor(Math.sqrt(n));
  while (n % rows !== 0) rows--;
  return { rows, cols: n / rows };
}

function polar(cx, cy, r, turn) {
  const angle = turn * Math.PI * 2 - Math.PI / 2;
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

export default {
  name: "PartitionedShape",
  props: {
    shape: {
      type: String,
      required: true,
      validator: (value) => ["circle", "bar", "square"].includes(value),
    },
    denominator: { type: Number, required: true },
    filled: { type: Number, default: 0 },
    baseDenominator: { type: Number, default: 0 },
    paintable: { type: Boolean, default: false },
  },
  data() {
    return {
      painted: Array.from(
        { length: this.denominator },
        (_, i) => i < this.filled
      ),
    };
  },
  computed: {
    shapeName() {
      return { circle: "圓形", bar: "長條", square: "正方形" }[this.shape];
    },
    viewBox() {
      return this.shape === "bar"
        ? `0 0 ${BAR.width} ${BAR.height}`
        : `0 0 ${SIZE} ${SIZE}`;
    },
    box() {
      const width = this.shape === "bar" ? BAR.width : SIZE;
      const height = this.shape === "bar" ? BAR.height : SIZE;
      return { x: PAD, y: PAD, w: width - PAD * 2, h: height - PAD * 2 };
    },
    circle() {
      return { cx: SIZE / 2, cy: SIZE / 2, r: SIZE / 2 - PAD };
    },
    grid() {
      // 長條圖固定一列；正方形排成接近正方的方格
      return this.shape === "bar"
        ? { rows: 1, cols: this.denominator }
        : gridDims(this.denominator);
    },
    parts() {
      if (this.shape === "circle") {
        const { cx, cy, r } = this.circle;
        if (this.denominator === 1) {
          return [
            `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`,
          ];
        }
        return Array.from({ length: this.denominator }, (_, i) => {
          const [x0, y0] = polar(cx, cy, r, i / this.denominator);
          const [x1, y1] = polar(cx, cy, r, (i + 1) / this.denominator);
          // n ≥ 2 時每塊扇形不超過半圓，不需要 large-arc
          return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1} Z`;
        });
      }
      // 方格依「由左到右、每欄由上到下」的順序編號，讓預填色與原分數的分隔線對齊
      const { rows, cols } = this.grid;
      const { x, y, w, h } = this.box;
      const cw = w / cols;
      const ch = h / rows;
      return Array.from({ length: this.denominator }, (_, i) => {
        const col = Math.floor(i / rows);
        const row = i % rows;
        const px = x + col * cw;
        const py = y + row * ch;
        return `M ${px} ${py} h ${cw} v ${ch} h ${-cw} Z`;
      });
    },
    dividerPath() {
      return this.linesFor(this.denominator);
    },
    basePath() {
      if (!this.baseDenominator || this.baseDenominator <= 1) return "";
      return this.linesFor(this.baseDenominator);
    },
    outlinePath() {
      if (this.shape === "circle") {
        const { cx, cy, r } = this.circle;
        return `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`;
      }
      const { x, y, w, h } = this.box;
      return `M ${x} ${y} h ${w} v ${h} h ${-w} Z`;
    },
  },
  methods: {
    linesFor(n) {
      if (n <= 1) return "";
      if (this.shape === "circle") {
        const { cx, cy, r } = this.circle;
        return Array.from({ length: n }, (_, i) => {
          const [px, py] = polar(cx, cy, r, i / n);
          return `M ${cx} ${cy} L ${px} ${py}`;
        }).join(" ");
      }
      const { rows, cols } =
        this.shape === "bar" ? { rows: 1, cols: n } : gridDims(n);
      const { x, y, w, h } = this.box;
      const vertical = Array.from({ length: cols - 1 }, (_, i) => {
        const px = x + ((i + 1) * w) / cols;
        return `M ${px} ${y} V ${y + h}`;
      });
      const horizontal = Array.from({ length: rows - 1 }, (_, i) => {
        const py = y + ((i + 1) * h) / rows;
        return `M ${x} ${py} H ${x + w}`;
      });
      return [...vertical, ...horizontal].join(" ");
    },
    togglePart(index) {
      if (!this.paintable) return;
      this.painted[index] = !this.painted[index];
    },
  },
};
</script>

<style scoped lang="scss">
.partitioned-shape {
  display: block;
  width: 100%;
  height: 100%;

  &--paintable .partitioned-shape__part {
    cursor: pointer;

    &:hover:not(.partitioned-shape__part--filled) {
      fill: #fde7cc;
    }
  }

  &__part {
    fill: #ffffff;
    stroke: none;
    transition: fill 0.15s ease;

    &--filled {
      fill: #f6a04d;
    }
  }

  &__divider {
    fill: none;
    stroke: #333333;
    stroke-width: 1.5;
    stroke-dasharray: 6 5;
    pointer-events: none;
  }

  &__base {
    fill: none;
    stroke: #333333;
    stroke-width: 3.5;
    pointer-events: none;
  }

  &__outline {
    fill: none;
    stroke: #333333;
    stroke-width: 3.5;
    pointer-events: none;
  }
}
</style>

<template>
  <svg
    class="pattern-tile"
    :viewBox="`0 0 ${size.w} ${size.h}`"
    preserveAspectRatio="none"
    role="img"
    aria-hidden="true"
  >
    <!-- 關卡 1：方格角落的花形符號 -->
    <template v-if="kind === 'mark'">
      <rect :width="size.w" :height="size.h" fill="#ffffff" />
      <g :transform="`translate(${markPos.x} ${markPos.y})`" class="mark">
        <line x1="-7" y1="0" x2="7" y2="0" />
        <line x1="0" y1="-7" x2="0" y2="7" />
        <line x1="-5" y1="-5" x2="5" y2="5" />
        <line x1="-5" y1="5" x2="5" y2="-5" />
        <circle r="2.2" />
      </g>
    </template>

    <!-- 關卡 2：綠色四分之一圓，橘色落在指定角落 -->
    <template v-else-if="kind === 'arc'">
      <clipPath :id="clipId">
        <rect :width="size.w" :height="size.h" />
      </clipPath>
      <rect :width="size.w" :height="size.h" fill="#f0914a" />
      <circle
        :cx="arcCenter.x"
        :cy="arcCenter.y"
        :r="variant.big ? size.w * 0.62 : size.w * 0.92"
        fill="#a8d672"
        :clip-path="`url(#${clipId})`"
      />
    </template>

    <!-- 關卡 3：綠色愛心，依尖端方向旋轉 -->
    <template v-else-if="kind === 'heart'">
      <rect :width="size.w" :height="size.h" fill="#f6fbf2" />
      <path
        :d="HEART"
        fill="#1fa64a"
        :transform="`translate(30 30) rotate(${heartAngle}) scale(1.35)`"
      />
    </template>

    <!-- 關卡 4：紅色小愛心位於角落 -->
    <template v-else-if="kind === 'cornerHeart'">
      <rect :width="size.w" :height="size.h" fill="#fffdf8" />
      <path
        :d="HEART"
        fill="#c0392b"
        :transform="`translate(${cornerHeartPos.x} ${cornerHeartPos.y}) rotate(${
          variant.flip ? 180 : 0
        }) scale(0.55)`"
      />
    </template>

    <!-- 關卡 5：2×2 色塊，黃色與藍色在對角 -->
    <template v-else-if="kind === 'quad'">
      <rect :width="size.w" :height="size.h" fill="#ffffff" />
      <rect
        v-for="cell in quadCells"
        :key="cell.key"
        :x="cell.x"
        :y="cell.y"
        :width="size.w / 2"
        :height="size.h / 2"
        :fill="cell.fill"
      />
      <line
        :x1="size.w / 2"
        y1="0"
        :x2="size.w / 2"
        :y2="size.h"
        class="quad-line"
      />
      <line
        x1="0"
        :y1="size.h / 2"
        :x2="size.w"
        :y2="size.h / 2"
        class="quad-line"
      />
    </template>
  </svg>
</template>

<script>
// 往下的愛心（尖端朝下），以 (0,0) 為中心
const HEART =
  "M 0 14 C -4 10 -16 3 -16 -5 C -16 -12 -10 -16 -5 -16 C -2 -16 0 -14 0 -11 C 0 -14 2 -16 5 -16 C 10 -16 16 -12 16 -5 C 16 3 4 10 0 14 Z";
const OPPOSITE = { TL: "BR", TR: "BL", BL: "TR", BR: "TL" };
let uid = 0;

// 依原稿重繪的規律圖塊；variant 依 kind 不同：
// mark: "TL"｜"TR"｜"BL"｜"BR"；arc: { corner, big? }；heart: "U"｜"D"｜"L"｜"R"
// cornerHeart: { pos, flip }；quad: "YTL"｜"YTR"｜"YBL"｜"YBR"（黃色位置，藍色在對角）
export default {
  name: "PatternTile",
  props: {
    kind: { type: String, required: true },
    variant: { type: [String, Object], required: true },
  },
  data() {
    uid += 1;
    return { HEART, clipId: `pattern-tile-clip-${uid}` };
  },
  computed: {
    size() {
      return ["heart", "cornerHeart"].includes(this.kind)
        ? { w: 60, h: 60 }
        : { w: 80, h: 60 };
    },
    markPos() {
      const v = this.variant;
      return {
        x: v.includes("L") ? this.size.w * 0.2 : this.size.w * 0.8,
        y: v.includes("T") ? this.size.h * 0.24 : this.size.h * 0.76,
      };
    },
    arcCenter() {
      // 綠色圓心在橘色角落的對角
      const c = OPPOSITE[this.variant.corner];
      return {
        x: c.includes("L") ? 0 : this.size.w,
        y: c.includes("T") ? 0 : this.size.h,
      };
    },
    heartAngle() {
      return { D: 0, U: 180, L: 90, R: -90 }[this.variant];
    },
    cornerHeartPos() {
      const { pos, flip } = this.variant;
      // 尖端朝上的右上愛心在原稿中貼著右側邊緣、略低
      if (pos === "TR" && flip) return { x: 51, y: 17 };
      return {
        x: pos.includes("L") ? 11 : 49,
        y: pos.includes("T") ? 11 : 49,
      };
    },
    quadCells() {
      const yellow = this.variant.slice(1);
      const blue = OPPOSITE[yellow];
      const at = (corner) => ({
        x: corner.includes("L") ? 0 : this.size.w / 2,
        y: corner.includes("T") ? 0 : this.size.h / 2,
      });
      return [
        { key: "y", ...at(yellow), fill: "#ffe44d" },
        { key: "b", ...at(blue), fill: "#4fc3f7" },
      ];
    },
  },
};
</script>

<style scoped lang="scss">
.pattern-tile {
  display: block;
  width: 100%;
  height: 100%;
}

.mark {
  stroke: #222222;
  stroke-width: 2;
  fill: #222222;
}

.quad-line {
  stroke: #d0d0d0;
  stroke-width: 1;
}
</style>

<template>
  <div ref="root" class="match" :class="{ 'match--compact': compact }">
    <!-- 已配對的連線 -->
    <svg class="match__lines" :width="size.w" :height="size.h">
      <line
        v-for="line in lines"
        :key="line.left"
        :x1="line.x1"
        :y1="line.y1"
        :x2="line.x2"
        :y2="line.y2"
        class="match__line"
        :class="{
          'match__line--wrong': wrongLefts.includes(line.left),
          'match__line--correct': correct,
        }"
        :stroke="line.color"
      />
      <line
        v-if="drag && drag.moved"
        :x1="drag.fromX"
        :y1="drag.fromY"
        :x2="drag.x"
        :y2="drag.y"
        class="match__line match__line--drawing"
      />
    </svg>

    <div class="match__column">
      <button
        v-for="item in left"
        :key="item.id"
        type="button"
        class="match__item"
        :class="[
          `match__item--${item.kind}`,
          {
            'match__item--selected': selected === item.id,
            'match__item--wrong': wrongLefts.includes(item.id),
            'match__item--paired': pairs[item.id],
          },
        ]"
        :data-left="item.id"
        @pointerdown="startDrag($event, item.id)"
        @pointermove="onDrag"
        @pointerup="endDrag"
        @pointercancel="cancelDrag"
        @click="onLeftClick(item.id)"
      >
        <QuadShape
          v-if="item.kind === 'shape'"
          :shape="item.shape"
          :diagonal="item.diagonal"
        />
        <span v-else>{{ item.text }}</span>
        <span class="match__dot match__dot--left" :style="dotStyle(item.id)" />
      </button>
    </div>

    <div class="match__column">
      <button
        v-for="item in rightOrdered"
        :key="item.id"
        type="button"
        class="match__item"
        :class="[
          `match__item--${item.kind}`,
          { 'match__item--target': selected !== null },
        ]"
        :data-right="item.id"
        @click="onRightClick(item.id)"
      >
        <span class="match__dot match__dot--right" />
        <QuadShape
          v-if="item.kind === 'shape'"
          :shape="item.shape"
          :diagonal="item.diagonal"
        />
        <span v-else>{{ item.text }}</span>
      </button>
    </div>
  </div>
</template>

<script>
import QuadShape from "./QuadShape.vue";

const DRAG_THRESHOLD = 8;
const COLORS = ["#1e88e5", "#8e24aa", "#00897b", "#f4511e", "#6d4c41"];

function shuffleNotIdentity(list) {
  const result = [...list];
  do {
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
  } while (list.length > 1 && result.every((v, i) => v === list[i]));
  return result;
}

// 左右配對（連連看）：點左邊再點右邊、或從左邊拖到右邊就會連線；再點左邊可取消
// left / right：[{ id, kind: "shape" | "text", shape?, diagonal?, text? }]
// 父元件用 ref 呼叫 check(answer) 判分；answer 為 { leftId: rightId }
export default {
  name: "MatchPairs",
  components: { QuadShape },
  props: {
    left: { type: Array, required: true },
    right: { type: Array, required: true },
    // 選填：項目較多時縮小卡片，平板也放得下
    compact: { type: Boolean, default: false },
  },
  emits: ["change"],
  data() {
    return {
      rightOrder: shuffleNotIdentity(this.right.map((item) => item.id)),
      pairs: {},
      selected: null,
      drag: null,
      suppressClick: false,
      wrongLefts: [],
      correct: false,
      lines: [],
      size: { w: 0, h: 0 },
    };
  },
  computed: {
    rightOrdered() {
      return this.rightOrder.map((id) => this.right.find((r) => r.id === id));
    },
  },
  watch: {
    pairs: {
      handler() {
        this.$nextTick(this.layoutLines);
      },
      deep: true,
    },
  },
  mounted() {
    this.layoutLines();
    window.addEventListener("resize", this.layoutLines);
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.layoutLines);
  },
  methods: {
    colorOf(leftId) {
      return COLORS[
        this.left.findIndex((l) => l.id === leftId) % COLORS.length
      ];
    },
    dotStyle(leftId) {
      return this.pairs[leftId]
        ? { backgroundColor: this.colorOf(leftId) }
        : {};
    },
    // 依畫面上元素位置重算連線座標
    layoutLines() {
      const root = this.$refs.root;
      if (!root) return;
      const box = root.getBoundingClientRect();
      this.size = { w: box.width, h: box.height };
      const anchor = (selector, side) => {
        const el = root.querySelector(selector);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          x: (side === "right" ? r.right : r.left) - box.left,
          y: r.top + r.height / 2 - box.top,
        };
      };
      this.lines = Object.entries(this.pairs)
        .map(([leftId, rightId]) => {
          const a = anchor(`[data-left="${leftId}"]`, "right");
          const b = anchor(`[data-right="${rightId}"]`, "left");
          if (!a || !b) return null;
          return {
            left: leftId,
            x1: a.x,
            y1: a.y,
            x2: b.x,
            y2: b.y,
            color: this.colorOf(leftId),
          };
        })
        .filter(Boolean);
    },
    connect(leftId, rightId) {
      const next = { ...this.pairs };
      // 右邊一個項目只能連一條線
      Object.keys(next).forEach((k) => {
        if (next[k] === rightId) delete next[k];
      });
      next[leftId] = rightId;
      this.pairs = next;
      this.wrongLefts = this.wrongLefts.filter((id) => id !== leftId);
      this.$emit("change");
    },
    onLeftClick(leftId) {
      if (this.suppressClick) {
        this.suppressClick = false;
        return;
      }
      if (this.correct) return;
      if (this.pairs[leftId] && this.selected !== leftId) {
        // 點已連線的項目：取消這條線並重新選取
        const next = { ...this.pairs };
        delete next[leftId];
        this.pairs = next;
      }
      this.selected = this.selected === leftId ? null : leftId;
    },
    onRightClick(rightId) {
      if (this.correct || this.selected === null) return;
      this.connect(this.selected, rightId);
      this.selected = null;
    },
    startDrag(event, leftId) {
      if (this.correct) return;
      if (event.button !== undefined && event.button !== 0) return;
      const box = this.$refs.root.getBoundingClientRect();
      const r = event.currentTarget.getBoundingClientRect();
      this.suppressClick = false;
      this.drag = {
        leftId,
        startX: event.clientX,
        startY: event.clientY,
        fromX: r.right - box.left,
        fromY: r.top + r.height / 2 - box.top,
        x: event.clientX - box.left,
        y: event.clientY - box.top,
        moved: false,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    onDrag(event) {
      if (!this.drag) return;
      const box = this.$refs.root.getBoundingClientRect();
      this.drag.x = event.clientX - box.left;
      this.drag.y = event.clientY - box.top;
      if (
        !this.drag.moved &&
        Math.hypot(
          event.clientX - this.drag.startX,
          event.clientY - this.drag.startY
        ) > DRAG_THRESHOLD
      ) {
        this.drag.moved = true;
        this.selected = null;
      }
    },
    endDrag(event) {
      if (!this.drag) return;
      if (this.drag.moved) {
        this.suppressClick = true;
        const target = document
          .elementFromPoint(event.clientX, event.clientY)
          ?.closest("[data-right]");
        if (target) this.connect(this.drag.leftId, target.dataset.right);
      }
      this.cancelDrag();
    },
    cancelDrag() {
      this.drag = null;
    },
    // 回傳 { complete, wrong: [leftId] }，並標示連錯的線
    check(answer) {
      const complete = this.left.every((l) => this.pairs[l.id]);
      const wrong = this.left
        .filter((l) => this.pairs[l.id] && this.pairs[l.id] !== answer[l.id])
        .map((l) => l.id);
      this.wrongLefts = wrong;
      this.correct = complete && wrong.length === 0;
      return { complete, wrong, pairs: { ...this.pairs } };
    },
  },
};
</script>

<style scoped lang="scss">
.match {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: space-between;
  gap: 6rem;

  &__lines {
    position: absolute;
    left: 0;
    top: 0;
    pointer-events: none;
    overflow: visible;
  }

  &__line {
    stroke-width: 5;
    stroke-linecap: round;

    &--wrong {
      stroke: #e53935 !important;
      stroke-dasharray: 10 6;
    }

    &--correct {
      stroke: #43a047 !important;
    }

    &--drawing {
      stroke: #90a4ae;
      stroke-dasharray: 8 6;
    }
  }

  &__column {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    gap: 0.6rem;
  }

  &__item {
    position: relative;
    min-height: 4.2rem;
    padding: 0.4rem 0.8rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.35rem;
    font-weight: $font-bold;
    line-height: 1.35;
    color: #333333;
    background-color: #ffffff;
    border: 3px solid #ffcc80;
    border-radius: 14px;
    box-shadow: 0 3px 0 rgba(0, 0, 0, 0.12);
    cursor: pointer;
    touch-action: none;
    user-select: none;

    &--shape {
      height: 6.5rem;
      padding: 0.2rem;

      // 圖形填滿卡片高度
      :deep(.quad-shape) {
        width: 8.5rem;
        height: 6rem;
      }
    }

    &--selected {
      border-color: #1e88e5;
      box-shadow: 0 0 0 4px #90caf9;
    }

    &--target {
      border-style: dashed;
      border-color: #1e88e5;
    }

    &--wrong {
      border-color: #e53935;
      box-shadow: 0 0 0 4px #ffcdd2;
    }
  }

  &__dot {
    position: absolute;
    top: 50%;
    width: 1rem;
    height: 1rem;
    margin-top: -0.5rem;
    background-color: #b0bec5;
    border: 3px solid #ffffff;
    border-radius: 50%;
    box-shadow: 0 0 0 2px #90a4ae;

    &--left {
      right: -0.65rem;
    }

    &--right {
      left: -0.65rem;
    }
  }
}
.match--compact {
  gap: 5rem;

  .match__column {
    gap: 0.35rem;
  }

  .match__item {
    min-height: 3.4rem;
    font-size: 1.2rem;

    &--shape {
      height: 4.6rem;

      :deep(.quad-shape) {
        width: 6.4rem;
        height: 4.4rem;
      }
    }
  }
}
</style>

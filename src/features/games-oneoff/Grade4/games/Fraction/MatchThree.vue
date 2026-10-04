<template>
  <div ref="root" class="match3">
    <svg class="match3__lines" :width="size.w" :height="size.h">
      <line
        v-for="line in lines"
        :key="line.key"
        :x1="line.x1"
        :y1="line.y1"
        :x2="line.x2"
        :y2="line.y2"
        class="match3__line"
        :class="{
          'match3__line--wrong': wrongKeys.includes(line.key),
          'match3__line--correct': correct,
        }"
        :stroke="line.color"
      />
      <line
        v-if="drag && drag.moved"
        :x1="drag.fromX"
        :y1="drag.fromY"
        :x2="drag.x"
        :y2="drag.y"
        class="match3__line match3__line--drawing"
      />
    </svg>

    <div
      v-for="(column, c) in ordered"
      :key="c"
      class="match3__column"
      :class="`match3__column--${c}`"
    >
      <button
        v-for="item in column"
        :key="item.id"
        type="button"
        class="match3__item"
        :class="{
          'match3__item--selected': isSelected(c, item.id),
          'match3__item--target': isTarget(c),
          'match3__item--wrong': itemWrong(c, item.id),
        }"
        :data-col="c"
        :data-id="item.id"
        @pointerdown="startDrag($event, c, item.id)"
        @pointermove="onDrag"
        @pointerup="endDrag"
        @pointercancel="cancelDrag"
        @click="onClick(c, item.id)"
      >
        <span
          v-if="c > 0"
          class="match3__dot match3__dot--left"
          :style="dotStyle(c, item.id, 'left')"
        />
        <slot name="item" :item="item" :col="c" />
        <span
          v-if="c < ordered.length - 1"
          class="match3__dot match3__dot--right"
          :style="dotStyle(c, item.id, 'right')"
        />
      </button>
    </div>
  </div>
</template>

<script>
const DRAG_THRESHOLD = 8;
const COLORS = ["#1e88e5", "#8e24aa", "#00897b"];

function shuffle(list) {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 三欄連連看：左欄—中欄、中欄—右欄各連一條線，三張卡連成一組
// columns：三個陣列 [{ id, ... }]，同一組的三張卡 id 相同；卡片內容由 slot "item" 畫
// 也可以只給兩欄（左欄—右欄連一條線），這時右欄就是程式裡的「中欄」，只用 links[0]
// 點一張卡再點相鄰欄的卡就連線，也可以從一張卡拖到相鄰欄；點已連線的左／右欄卡片可以重連
// 父元件用 ref 呼叫 check() 判分
export default {
  name: "MatchThree",
  props: {
    columns: { type: Array, required: true },
  },
  emits: ["change"],
  data() {
    // 三欄各自洗牌，避免三欄排得一模一樣
    let orders;
    do {
      orders = this.columns.map((col) => shuffle(col.map((item) => item.id)));
    } while (
      this.columns[0].length > 1 &&
      orders.every((o) => o.join() === orders[0].join())
    );
    return {
      orders,
      // links[0]：中欄 id → 左欄 id；links[1]：中欄 id → 右欄 id
      links: [{}, {}],
      selected: null,
      drag: null,
      suppressClick: false,
      wrongKeys: [],
      correct: false,
      lines: [],
      size: { w: 0, h: 0 },
    };
  },
  computed: {
    ordered() {
      return this.orders.map((order, c) =>
        order.map((id) => this.columns[c].find((item) => item.id === id))
      );
    },
  },
  watch: {
    links: {
      handler() {
        this.$nextTick(this.layoutLines);
      },
      deep: true,
    },
  },
  mounted() {
    this.layoutLines();
    window.addEventListener("resize", this.layoutLines);
    this.resizeObserver = new ResizeObserver(() => this.layoutLines());
    this.resizeObserver.observe(this.$refs.root);
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.layoutLines);
    this.resizeObserver?.disconnect();
  },
  methods: {
    colorOf(midId) {
      const index = this.columns[1].findIndex((item) => item.id === midId);
      return COLORS[index % COLORS.length];
    },
    isSelected(c, id) {
      return this.selected?.c === c && this.selected.id === id;
    },
    isTarget(c) {
      return this.selected !== null && Math.abs(this.selected.c - c) === 1;
    },
    // 某張卡在某一側連到的中欄 id（左欄連 links[0]、右欄連 links[1]）
    midOf(c, id) {
      const side = c === 0 ? 0 : 1;
      return Object.keys(this.links[side]).find(
        (mid) => this.links[side][mid] === id
      );
    },
    dotStyle(c, id, side) {
      let mid = null;
      if (c === 1) {
        mid = this.links[side === "left" ? 0 : 1][id] ? id : null;
      } else {
        mid = this.midOf(c, id) || null;
      }
      return mid ? { backgroundColor: this.colorOf(mid) } : {};
    },
    itemWrong(c, id) {
      if (c === 1) return this.wrongKeys.some((k) => k.endsWith(`:${id}`));
      const mid = this.midOf(c, id);
      return (
        Boolean(mid) && this.wrongKeys.includes(`${c === 0 ? 0 : 1}:${mid}`)
      );
    },
    layoutLines() {
      const root = this.$refs.root;
      if (!root) return;
      const box = root.getBoundingClientRect();
      this.size = { w: box.width, h: box.height };
      const anchor = (c, id, side) => {
        const el = root.querySelector(`[data-col="${c}"][data-id="${id}"]`);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          x: (side === "right" ? r.right : r.left) - box.left,
          y: r.top + r.height / 2 - box.top,
        };
      };
      const lines = [];
      [0, 1].forEach((side) => {
        Object.entries(this.links[side]).forEach(([mid, outer]) => {
          const a =
            side === 0 ? anchor(0, outer, "right") : anchor(1, mid, "right");
          const b =
            side === 0 ? anchor(1, mid, "left") : anchor(2, outer, "left");
          if (!a || !b) return;
          lines.push({
            key: `${side}:${mid}`,
            x1: a.x,
            y1: a.y,
            x2: b.x,
            y2: b.y,
            color: this.colorOf(mid),
          });
        });
      });
      this.lines = lines;
    },
    // a、b 是相鄰兩欄的卡片 { c, id }
    connect(a, b) {
      const mid = a.c === 1 ? a : b;
      const outer = a.c === 1 ? b : a;
      const side = outer.c === 0 ? 0 : 1;
      const next = { ...this.links[side] };
      // 一張卡在同一側只能連一條線
      Object.keys(next).forEach((k) => {
        if (next[k] === outer.id) delete next[k];
      });
      next[mid.id] = outer.id;
      const links = [...this.links];
      links[side] = next;
      this.links = links;
      this.wrongKeys = this.wrongKeys.filter((k) => k !== `${side}:${mid.id}`);
      this.$emit("change");
    },
    // 左／右欄的卡片已經連線時，點它就拿掉那條線，重新選
    unlinkOuter(c, id) {
      if (c === 1) return;
      const side = c === 0 ? 0 : 1;
      const mid = this.midOf(c, id);
      if (!mid) return;
      const links = [...this.links];
      links[side] = { ...links[side] };
      delete links[side][mid];
      this.links = links;
      this.$emit("change");
    },
    onClick(c, id) {
      if (this.suppressClick) {
        this.suppressClick = false;
        return;
      }
      if (this.correct) return;
      const sel = this.selected;
      if (sel && sel.c === c && sel.id === id) {
        this.selected = null;
      } else if (sel && Math.abs(sel.c - c) === 1) {
        this.connect(sel, { c, id });
        this.selected = null;
      } else {
        this.unlinkOuter(c, id);
        this.selected = { c, id };
      }
    },
    startDrag(event, c, id) {
      if (this.correct) return;
      if (event.button !== undefined && event.button !== 0) return;
      const box = this.$refs.root.getBoundingClientRect();
      const r = event.currentTarget.getBoundingClientRect();
      this.suppressClick = false;
      this.drag = {
        c,
        id,
        startX: event.clientX,
        startY: event.clientY,
        fromX: r.left + r.width / 2 - box.left,
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
          ?.closest("[data-col]");
        if (target) {
          const c = Number(target.dataset.col);
          if (Math.abs(c - this.drag.c) === 1)
            this.connect(
              { c: this.drag.c, id: this.drag.id },
              { c, id: target.dataset.id }
            );
        }
      }
      this.cancelDrag();
    },
    cancelDrag() {
      this.drag = null;
    },
    // 同一組三張卡 id 相同；回傳 { complete, wrong（連錯的線數）, links }，並標示連錯的線
    check() {
      const mids = this.columns[1].map((item) => item.id);
      const sides = this.columns.length === 2 ? [0] : [0, 1];
      const complete = mids.every((m) => sides.every((s) => this.links[s][m]));
      const wrong = [];
      [0, 1].forEach((side) => {
        Object.entries(this.links[side]).forEach(([mid, outer]) => {
          if (outer !== mid) wrong.push(`${side}:${mid}`);
        });
      });
      this.wrongKeys = wrong;
      this.correct = complete && wrong.length === 0;
      return {
        complete,
        wrong: wrong.length,
        links: this.links.map((l) => ({ ...l })),
      };
    },
  },
};
</script>

<style scoped lang="scss">
.match3 {
  position: relative;
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: 1.35fr 0.75fr 1fr;
  gap: 4.5rem;

  &__lines {
    position: absolute;
    left: 0;
    top: 0;
    pointer-events: none;
    overflow: visible;
    z-index: 1;
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
    min-height: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    gap: 0.6rem;
  }

  &__item {
    position: relative;
    flex: 1;
    min-height: 0;
    max-height: 9rem;
    padding: 0.4rem 0.7rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: $font-bold;
    color: #333333;
    background-color: #ffffff;
    border: 3px solid #ffcc80;
    border-radius: 14px;
    box-shadow: 0 3px 0 rgba(0, 0, 0, 0.12);
    cursor: pointer;
    touch-action: none;
    user-select: none;

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
    z-index: 2;

    &--left {
      left: -0.65rem;
    }

    &--right {
      right: -0.65rem;
    }
  }
}

@media (max-width: 1100px) {
  .match3 {
    gap: 3rem;

    &__item {
      font-size: 1.3rem;
    }
  }
}
</style>

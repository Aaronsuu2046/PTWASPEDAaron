<template>
  <!-- 數字卡＋百／十／個定位格：點卡片再點格子（或直接點卡片放到第一個空格），也可以拖過去；點格子裡的卡片拿回來 -->
  <div class="pvc" :class="{ 'pvc--locked': locked }">
    <div class="pvc__board">
      <div
        v-for="slot in SLOTS"
        :key="slot.id"
        class="pvc__slot"
        :class="{
          'pvc__slot--fixed': isFixed(slot.id),
          'pvc__slot--target': !isFixed(slot.id) && !locked,
          'pvc__slot--over': drag && drag.moved && drag.over === slot.id,
          'pvc__slot--wrong': wrongSlots.includes(slot.id),
          'pvc__slot--bounce': bounce === slot.id,
        }"
        :data-slot="slot.id"
        @click="onSlotClick(slot.id)"
      >
        <span class="pvc__label">{{ slot.label }}</span>
        <span v-if="isFixed(slot.id)" class="pvc__digit pvc__digit--fixed">{{
          fixed[slot.id]
        }}</span>
        <button
          v-else-if="placed[slot.id]"
          type="button"
          class="pvc__card pvc__card--placed"
          :data-card="placed[slot.id]"
          :data-digit="digitOf(placed[slot.id])"
          :aria-label="`${slot.label}的 ${digitOf(placed[slot.id])}，點一下拿回來`"
          @pointerdown="startDrag($event, placed[slot.id])"
          @pointermove="onDrag"
          @pointerup="endDrag"
          @pointercancel="drag = null"
          @click.stop="onPlacedClick(slot.id)"
        >
          {{ digitOf(placed[slot.id]) }}
        </button>
        <span v-else class="pvc__empty">？</span>
      </div>
    </div>

    <div class="pvc__tray" data-tray>
      <button
        v-for="card in trayCards"
        :key="card.id"
        type="button"
        class="pvc__card"
        :class="{
          'pvc__card--selected': selected === card.id,
          'pvc__card--dragging': drag && drag.moved && drag.id === card.id,
        }"
        :data-card="card.id"
        :data-digit="card.digit"
        :aria-label="`數字卡 ${card.digit}`"
        @pointerdown="startDrag($event, card.id)"
        @pointermove="onDrag"
        @pointerup="endDrag"
        @pointercancel="drag = null"
        @click="onTrayClick(card.id)"
      >
        {{ card.digit }}
      </button>
    </div>

    <div
      v-if="drag && drag.moved"
      class="pvc__ghost"
      :style="{ left: `${drag.x}px`, top: `${drag.y}px` }"
    >
      {{ digitOf(drag.id) }}
    </div>
  </div>
</template>

<script>
const SLOTS = [
  { id: "hundreds", label: "百位" },
  { id: "tens", label: "十位" },
  { id: "ones", label: "個位" },
];
const DRAG_THRESHOLD = 8;

// 二年級數字卡與定位格（共用）：
// cards [{ id, digit }]：每張卡有唯一 id，同樣的數字也分得開
// fixed { tens?, ones?, hundreds? }：已經寫好、不能放卡的位值
// 百位不能放 0：放進去會立刻退回並送出 reject 事件（由外層顯示提示）
// 事件 change（放卡、拿回）、reject({ slot, digit })；用 ref 呼叫 value()、reset()、markWrong()
export default {
  name: "PlaceValueCards",
  props: {
    cards: { type: Array, required: true },
    fixed: { type: Object, default: () => ({}) },
    locked: { type: Boolean, default: false },
  },
  emits: ["change", "reject"],
  data() {
    return {
      SLOTS,
      placed: { hundreds: null, tens: null, ones: null },
      selected: null,
      drag: null,
      suppressClick: false,
      wrongSlots: [],
      bounce: null,
    };
  },
  computed: {
    usedIds() {
      return Object.values(this.placed).filter(Boolean);
    },
    trayCards() {
      return this.cards.filter((c) => !this.usedIds.includes(c.id));
    },
    openSlots() {
      return SLOTS.map((s) => s.id).filter((id) => !this.isFixed(id));
    },
  },
  beforeUnmount() {
    clearTimeout(this.bounceTimer);
  },
  methods: {
    isFixed(slot) {
      return this.fixed[slot] !== undefined && this.fixed[slot] !== null;
    },
    digitOf(id) {
      return this.cards.find((c) => c.id === id)?.digit;
    },
    // 每個位值目前的數字（固定的或放進去的），空的是 null
    digits() {
      return SLOTS.map((s) =>
        this.isFixed(s.id)
          ? this.fixed[s.id]
          : this.placed[s.id]
            ? this.digitOf(this.placed[s.id])
            : null
      );
    },
    isComplete() {
      return this.openSlots.every((id) => this.placed[id]);
    },
    value() {
      const d = this.digits();
      return d.includes(null) ? null : d[0] * 100 + d[1] * 10 + d[2];
    },
    reset() {
      this.placed = { hundreds: null, tens: null, ones: null };
      this.selected = null;
      this.wrongSlots = [];
      this.$emit("change");
    },
    markWrong(slots) {
      this.wrongSlots = slots;
    },
    // 把卡放進位值格；格子裡原本有卡就換回卡片區
    put(id, slot) {
      if (this.locked || this.isFixed(slot)) return;
      if (slot === "hundreds" && this.digitOf(id) === 0) {
        this.selected = null;
        this.bounce = slot;
        clearTimeout(this.bounceTimer);
        this.bounceTimer = setTimeout(() => (this.bounce = null), 600);
        this.$emit("reject", { slot, digit: 0 });
        return;
      }
      const next = { ...this.placed };
      Object.keys(next).forEach((k) => {
        if (next[k] === id) next[k] = null;
      });
      next[slot] = id;
      this.placed = next;
      this.selected = null;
      this.wrongSlots = [];
      this.$emit("change");
    },
    takeBack(slot) {
      if (this.locked) return;
      this.placed = { ...this.placed, [slot]: null };
      this.wrongSlots = [];
      this.$emit("change");
    },
    onTrayClick(id) {
      if (this.suppressClick) {
        this.suppressClick = false;
        return;
      }
      if (this.locked) return;
      // 點同一張卡取消選取；選了之後再點格子放進去
      this.selected = this.selected === id ? null : id;
    },
    onSlotClick(slot) {
      if (this.locked || this.isFixed(slot) || !this.selected) return;
      this.put(this.selected, slot);
    },
    onPlacedClick(slot) {
      if (this.suppressClick) {
        this.suppressClick = false;
        return;
      }
      // 已經選了卡片時，點有卡的格子就換卡；沒選就拿回來
      if (this.selected) this.put(this.selected, slot);
      else this.takeBack(slot);
    },
    startDrag(event, id) {
      if (this.locked) return;
      if (event.button !== undefined && event.button !== 0) return;
      this.suppressClick = false;
      this.drag = {
        id,
        startX: event.clientX,
        startY: event.clientY,
        x: event.clientX,
        y: event.clientY,
        moved: false,
        over: null,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    targetAt(event) {
      const el = document.elementFromPoint(event.clientX, event.clientY);
      const slot = el?.closest("[data-slot]")?.dataset.slot;
      if (slot) return slot;
      return el?.closest("[data-tray]") ? "tray" : null;
    },
    onDrag(event) {
      if (!this.drag) return;
      this.drag.x = event.clientX;
      this.drag.y = event.clientY;
      if (
        !this.drag.moved &&
        Math.hypot(
          event.clientX - this.drag.startX,
          event.clientY - this.drag.startY
        ) > DRAG_THRESHOLD
      )
        this.drag.moved = true;
      if (this.drag.moved) this.drag.over = this.targetAt(event);
    },
    endDrag(event) {
      if (!this.drag) return;
      if (this.drag.moved) {
        this.suppressClick = true;
        const target = this.targetAt(event);
        const from = Object.keys(this.placed).find(
          (k) => this.placed[k] === this.drag.id
        );
        if (target === "tray" && from) this.takeBack(from);
        else if (target && target !== "tray") this.put(this.drag.id, target);
      }
      this.drag = null;
    },
  },
};
</script>

<style scoped lang="scss">
.pvc {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.2rem;
  width: 100%;

  &__board {
    display: grid;
    grid-template-columns: repeat(3, 9rem);
    gap: 0.8rem;
  }

  &__slot {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    padding: 0.4rem 0.4rem 0.7rem;
    background-color: #ffffff;
    border: 4px solid #90caf9;
    border-radius: 18px;

    &--target {
      border-style: dashed;
      border-color: #ffb300;
      background-color: #fffde7;
      cursor: pointer;
    }

    &--over {
      background-color: #fff3e0;
      border-color: #ef6c00;
    }

    &--wrong {
      border-color: #e53935;
      border-style: solid;
      background-color: #ffebee;
    }

    &--bounce {
      animation: shake 0.5s;
      border-color: #e53935;
    }
  }

  &__label {
    font-size: 1.35rem;
    font-weight: bold;
    color: #1565c0;
  }

  &__empty,
  &__digit,
  &__card {
    width: 5.6rem;
    height: 6.6rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 3.8rem;
    font-weight: bold;
    border-radius: 14px;
  }

  &__empty {
    color: #ffca28;
  }

  &__digit--fixed {
    color: #37474f;
    background-color: #eceff1;
  }

  &__tray {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.9rem;
    min-height: 7.4rem;
    min-width: 60%;
    padding: 0.4rem 1rem;
    background-color: #e8f5e9;
    border: 3px solid #a5d6a7;
    border-radius: 18px;
  }

  &__card {
    padding: 0;
    color: #4a148c;
    background-color: #ffffff;
    border: 4px solid #ab47bc;
    box-shadow: 0 5px 0 #ce93d8;
    cursor: grab;
    touch-action: none;
    user-select: none;

    &--selected {
      background-color: #f3e5f5;
      border-color: #ef6c00;
      transform: translateY(-6px);
    }

    &--dragging {
      opacity: 0.35;
    }

    &--placed {
      box-shadow: none;
    }
  }

  &__ghost {
    position: fixed;
    z-index: 50;
    width: 5.6rem;
    height: 6.6rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 3.8rem;
    font-weight: bold;
    color: #4a148c;
    background-color: #ffffff;
    border: 4px solid #ef6c00;
    border-radius: 14px;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  &--locked &__card {
    cursor: default;
  }
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-8px);
  }
  75% {
    transform: translateX(8px);
  }
}

@media (max-width: 1100px), (max-height: 760px) {
  .pvc {
    gap: 0.8rem;

    &__board {
      grid-template-columns: repeat(3, 7.6rem);
    }

    &__empty,
    &__digit,
    &__card,
    &__ghost {
      width: 4.8rem;
      height: 5.6rem;
      font-size: 3.2rem;
    }

    &__tray {
      min-height: 6.4rem;
    }
  }
}
</style>

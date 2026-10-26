<template>
  <div class="side-hint">
    <button
      type="button"
      class="btn btn-primary text-nowrap img-hover-zoom side-hint__button"
      :aria-expanded="open"
      @click="toggle"
    >
      <div class="d-flex align-items-center">
        <div class="">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            class="bi bi-info-square-fill"
            viewBox="0 0 16 16"
          >
            <path
              d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm8.93 4.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533zM8 5.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2"
            />
          </svg>
        </div>
        <div class="mx-auto">點我看提示</div>
      </div>
    </button>

    <!-- 提示蓋在右側功能區上，不遮住左邊的題目與作答區 -->
    <div
      v-if="open"
      class="side-hint__panel"
      role="dialog"
      :aria-label="hint.title || '提示'"
      :style="panelStyle"
    >
      <p class="side-hint__heading">{{ hint.title || "提示" }}</p>
      <div class="side-hint__body">
        <p v-if="hint.text" class="side-hint__text">{{ hint.text }}</p>
        <div
          v-for="group in hint.groups || []"
          :key="group.title"
          class="side-hint__group"
        >
          <p class="side-hint__title">{{ group.title }}</p>
          <p v-for="rule in group.rules" :key="rule">{{ rule }}</p>
        </div>
      </div>
      <button type="button" class="side-hint__close" @click="open = false">
        關閉提示
      </button>
    </div>
  </div>
</template>

<script>
// 遊戲自訂的文字提示：放在右側功能區，按「點我看提示」開啟，蓋住功能區顯示
export default {
  name: "SideHintButton",
  props: {
    // { title?: string, text?: string, groups?: [{ title, rules: [] }] }
    hint: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      open: false,
      panelStyle: {},
    };
  },
  watch: {
    hint() {
      this.open = false;
    },
  },
  mounted() {
    window.addEventListener("resize", this.place);
    window.addEventListener("scroll", this.place, true);
    window.addEventListener("keydown", this.onKey);
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.place);
    window.removeEventListener("scroll", this.place, true);
    window.removeEventListener("keydown", this.onKey);
  },
  methods: {
    toggle() {
      this.open = !this.open;
      if (this.open) this.place();
    },
    place() {
      if (!this.open) return;
      const bar = this.$el.closest(".SideBar") || this.$el;
      const rect = bar.getBoundingClientRect();
      this.panelStyle = {
        top: `${rect.top}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        height: `${Math.min(rect.height, window.innerHeight - rect.top)}px`,
      };
    },
    onKey(event) {
      if (event.key === "Escape") this.open = false;
    },
  },
};
</script>

<style scoped lang="scss">
.side-hint {
  display: flex;
  justify-content: center;
}

.side-hint__button {
  width: 93%;
}

.side-hint__panel {
  position: fixed;
  z-index: 1050;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.6rem;
  background-color: #fff8e1;
  border: 4px solid #fb8c00;
  border-radius: 12px;
  box-shadow: -4px 0 12px rgba(0, 0, 0, 0.15);
}

.side-hint__heading {
  margin: 0;
  font-size: clamp(1.1rem, 1.6vw, 1.5rem);
  font-weight: bold;
  text-align: center;
  color: #e65100;
}

.side-hint__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  p {
    margin: 0;
    font-size: clamp(0.9rem, 1.35vw, 1.25rem);
    line-height: 1.35;
  }
}

.side-hint__title {
  font-weight: bold;
  color: #bf360c;
}

.side-hint__close {
  padding: 0.4rem;
  font-size: clamp(1rem, 1.4vw, 1.3rem);
  font-weight: bold;
  color: #ffffff;
  background-color: #fb8c00;
  border: none;
  border-radius: 10px;
  cursor: pointer;
}
</style>

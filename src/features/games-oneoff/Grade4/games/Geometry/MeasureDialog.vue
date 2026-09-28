<template>
  <!-- 量測視窗：放大顯示一個角，量角器可拖動、旋轉並自動吸附；只供輔助，不判分 -->
  <div
    class="measure"
    role="dialog"
    aria-label="量角器量測視窗"
    @click.self="close"
  >
    <div class="measure__panel">
      <div class="measure__head">
        <p class="measure__title">用量角器量量看</p>
        <button type="button" class="measure__close" @click="close">
          ✕ 關閉
        </button>
      </div>

      <svg
        ref="svg"
        class="measure__svg"
        :viewBox="`0 0 ${W} ${H}`"
        preserveAspectRatio="xMidYMid meet"
        @pointerdown="startDrag"
        @pointermove="onDrag"
        @pointerup="endDrag"
        @pointercancel="endDrag"
      >
        <g class="figure">
          <path :d="arc" class="figure__arc" />
          <line
            v-for="(end, k) in rayEnds"
            :key="k"
            :x1="V[0]"
            :y1="V[1]"
            :x2="end[0]"
            :y2="end[1]"
            class="figure__ray"
            :style="{ stroke: color }"
          />
          <circle :cx="V[0]" :cy="V[1]" r="5" class="figure__vertex" />
        </g>
        <g
          class="tool"
          data-drag="move"
          :transform="`translate(${pose.x} ${pose.y}) rotate(${pose.rot})`"
        >
          <ProtractorTool :r="R" :font-scale="1.25" glass />
          <g
            class="tool__knob"
            data-drag="rotate"
            :transform="`translate(0 ${-R - 20})`"
          >
            <circle r="17" />
            <path d="M -7 3 A 8 8 0 1 1 5 6" />
          </g>
        </g>
      </svg>

      <div class="measure__tools">
        <button
          type="button"
          class="measure__btn"
          aria-label="量角器向左轉"
          @click="rotate(-ROTATE_STEP)"
        >
          <svg class="measure__icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12a7 7 0 1 0 2.1-5" />
            <path d="M4 3v5h5" /></svg
          >左轉
        </button>
        <button
          type="button"
          class="measure__btn"
          aria-label="量角器向右轉"
          @click="rotate(ROTATE_STEP)"
        >
          右轉<svg
            class="measure__icon"
            viewBox="0 0 24 24"
            style="transform: scaleX(-1)"
            aria-hidden="true"
          >
            <path d="M5 12a7 7 0 1 0 2.1-5" />
            <path d="M4 3v5h5" />
          </svg>
        </button>
        <button
          type="button"
          class="measure__btn measure__btn--reset"
          @click="reset"
        >
          還原
        </button>
        <span class="measure__tip">
          中心點對準頂點、0° 線對齊一邊，再從 0° 讀到另一邊
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import ProtractorTool from "./ProtractorTool.vue";

const W = 600;
const H = 380;
const R = 165;
const RAY = 170;
const ROTATE_STEP = 5;
const SNAP_DISTANCE = 24;
const SNAP_ANGLE = 7;

const along = (p, deg, r) => {
  const rad = (deg * Math.PI) / 180;
  return [p[0] + r * Math.cos(rad), p[1] - r * Math.sin(rad)];
};
const dirOf = (a, b) =>
  ((Math.atan2(-(b[1] - a[1]), b[0] - a[0]) * 180) / Math.PI + 360) % 360;
const diff = (a, b) => ((((a - b) % 360) + 540) % 360) - 180;

export default {
  name: "MeasureDialog",
  components: { ProtractorTool },
  props: {
    // 起始邊方向（數學方向：0° 向右、逆時針）與角度
    from: { type: Number, default: 0 },
    angle: { type: Number, required: true },
    color: { type: String, default: "#1565c0" },
  },
  emits: ["close"],
  data() {
    return {
      W,
      H,
      R,
      ROTATE_STEP,
      V: [W / 2, H / 2],
      pose: this.startPose(),
      drag: null,
    };
  },
  computed: {
    rayEnds() {
      return [
        along(this.V, this.from, RAY),
        along(this.V, this.from + this.angle, RAY),
      ];
    },
    arc() {
      const r = 34;
      const p = along(this.V, this.from, r);
      const q = along(this.V, this.from + this.angle, r);
      return `M ${this.V[0]} ${this.V[1]} L ${p[0]} ${p[1]} A ${r} ${r} 0 0 0 ${q[0]} ${q[1]} Z`;
    },
    snapRotations() {
      return [-this.from, 180 - (this.from + this.angle)];
    },
  },
  methods: {
    startPose() {
      return { x: W - R - 8, y: H - 10, rot: 0 };
    },
    close() {
      this.$emit("close");
    },
    toLocal(event) {
      const svg = this.$refs.svg;
      const pt = svg.createSVGPoint();
      pt.x = event.clientX;
      pt.y = event.clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      return [p.x, p.y];
    },
    startDrag(event) {
      if (event.button !== undefined && event.button !== 0) return;
      const kind = event.target.closest?.("[data-drag]")?.dataset.drag;
      if (!kind) return;
      this.drag = { kind, start: this.toLocal(event), pose: { ...this.pose } };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    onDrag(event) {
      if (!this.drag) return;
      const p = this.toLocal(event);
      const { kind, start, pose } = this.drag;
      if (kind === "move") {
        this.pose.x = Math.min(W, Math.max(0, pose.x + p[0] - start[0]));
        this.pose.y = Math.min(H, Math.max(0, pose.y + p[1] - start[1]));
      } else {
        this.pose.rot =
          Math.round(90 - dirOf([this.pose.x, this.pose.y], p) + 360) % 360;
      }
    },
    endDrag() {
      if (!this.drag) return;
      this.snap();
      this.drag = null;
    },
    rotate(step) {
      this.pose.rot = (this.pose.rot + step + 360) % 360;
      this.snap();
    },
    reset() {
      this.pose = this.startPose();
    },
    // 中心點靠近頂點就吸附；對準後 0° 線接近一邊就吸附
    snap() {
      const [vx, vy] = this.V;
      if (Math.hypot(this.pose.x - vx, this.pose.y - vy) < SNAP_DISTANCE) {
        this.pose.x = vx;
        this.pose.y = vy;
      } else {
        return;
      }
      const target = this.snapRotations.find(
        (r) => Math.abs(diff(this.pose.rot, r)) < SNAP_ANGLE
      );
      if (target !== undefined) this.pose.rot = ((target % 360) + 360) % 360;
    },
  },
};
</script>

<style scoped lang="scss">
.measure {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(38, 50, 56, 0.55);

  &__panel {
    width: min(92vw, 820px);
    height: min(86vh, 600px);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.8rem;
    background-color: #fffdf7;
    border: 5px solid #ffb74d;
    border-radius: 22px;
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__title {
    margin: 0;
    font-size: 1.6rem;
    font-weight: 700;
    color: #e65100;
  }

  &__close {
    padding: 0.4rem 1rem;
    font-size: 1.3rem;
    font-weight: 700;
    color: #ffffff;
    background-color: #ef5350;
    border: none;
    border-radius: 12px;
    box-shadow: 0 3px 0 #c62828;
    cursor: pointer;
  }

  &__svg {
    flex: 1;
    min-height: 0;
    width: 100%;
    background-color: #ffffff;
    border: 3px solid #b3e5fc;
    border-radius: 14px;
    touch-action: none;
    user-select: none;
  }

  &__tools {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }

  &__icon {
    width: 1.3em;
    height: 1.3em;
    fill: none;
    stroke: currentColor;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  &__btn {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.4rem 1rem;
    font-size: 1.2rem;
    font-weight: 700;
    color: #ffffff;
    background-color: #7e57c2;
    border: none;
    border-radius: 12px;
    box-shadow: 0 3px 0 #4527a0;
    cursor: pointer;

    &--reset {
      background-color: #78909c;
      box-shadow: 0 3px 0 #455a64;
    }
  }

  &__tip {
    font-size: 1.05rem;
    font-weight: 700;
    color: #6d4c41;
  }
}

.figure {
  pointer-events: none;

  &__arc {
    fill: rgba(255, 152, 0, 0.35);
    stroke: #ef6c00;
    stroke-width: 2.5;
  }

  &__ray {
    stroke-width: 6;
    stroke-linecap: round;
  }

  &__vertex {
    fill: #37474f;
  }
}

.tool {
  cursor: grab;

  &__knob {
    cursor: alias;

    circle {
      fill: #7e57c2;
      stroke: #ffffff;
      stroke-width: 3;
    }

    path {
      fill: none;
      stroke: #ffffff;
      stroke-width: 2.5;
      stroke-linecap: round;
    }
  }
}
</style>

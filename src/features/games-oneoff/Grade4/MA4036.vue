<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <div class="board">
        <svg
          ref="svg"
          class="board__svg"
          :viewBox="`0 0 ${W} ${H}`"
          preserveAspectRatio="xMidYMid meet"
          @pointerdown="startDrag"
          @pointermove="onDrag"
          @pointerup="endDrag"
          @pointercancel="endDrag"
        >
          <!-- 鐘面 -->
          <circle :cx="C[0]" :cy="C[1]" :r="FACE" class="clock__face" />
          <line
            v-for="k in 60"
            :key="`t${k}`"
            v-bind="tick(k)"
            class="clock__tick"
            :class="{ 'clock__tick--hour': k % 5 === 0 }"
          />
          <text
            v-for="n in 12"
            :key="`n${n}`"
            :x="C[0] + (FACE - 30) * Math.sin((n * Math.PI) / 6)"
            :y="C[1] - (FACE - 30) * Math.cos((n * Math.PI) / 6)"
            class="clock__num"
          >
            {{ n }}
          </text>

          <!-- 旋轉角：角弧、起始虛線、方向箭頭 -->
          <path v-if="turn > 0.5" :d="sector" class="turn__sector" />
          <path v-if="turn > 0.5" :d="arcLine" class="turn__arc" />
          <polygon v-if="turn > 8" :points="arrowHead" class="turn__arrow" />
          <line
            :x1="C[0]"
            :y1="C[1]"
            :x2="C[0]"
            :y2="C[1] - FACE + 8"
            class="turn__start"
          />

          <!-- 指針（拖動旋轉） -->
          <g data-drag="hand" class="hand">
            <line
              :x1="C[0]"
              :y1="C[1]"
              :x2="handEnd[0]"
              :y2="handEnd[1]"
              class="hand__hit"
            />
            <line
              :x1="C[0]"
              :y1="C[1]"
              :x2="handEnd[0]"
              :y2="handEnd[1]"
              class="hand__line"
            />
            <circle
              :cx="handEnd[0]"
              :cy="handEnd[1]"
              r="13"
              class="hand__knob"
            />
          </g>
          <circle :cx="C[0]" :cy="C[1]" r="8" class="clock__center" />
          <text :x="C[0] + 12" :y="C[1] + 26" class="clock__label">
            旋轉中心
          </text>

          <!-- 量角器（只有第 1 題有） -->
          <g
            v-if="showTool"
            class="tool"
            data-drag="move"
            :transform="`translate(${pose.x} ${pose.y}) rotate(${pose.rot})`"
          >
            <ProtractorTool :r="TOOL_R" :font-scale="1.25" glass />
            <g
              class="tool__knob"
              data-drag="rotate"
              :transform="`translate(0 ${-TOOL_R - 20})`"
            >
              <circle r="17" />
              <path d="M -7 3 A 8 8 0 1 1 5 6" />
            </g>
          </g>
        </svg>

        <div class="tools">
          <button type="button" class="tool-btn" @click="play">
            ▶ 播放動畫
          </button>
          <button
            type="button"
            class="tool-btn tool-btn--reset"
            @click="resetHand"
          >
            指針回到 12
          </button>
          <button
            v-if="gameData.protractor"
            type="button"
            class="tool-btn tool-btn--green"
            @click="toggleTool"
          >
            {{ showTool ? "收起量角器" : "拿出量角器" }}
          </button>
          <span class="tools__how">拖動紅色指針可以自己轉轉看</span>
        </div>
      </div>

      <div class="side">
        <p class="prompt">{{ gameData.text }}</p>

        <template v-if="gameData.kind === 'degree'">
          <div class="number">
            <div
              class="slot"
              data-cell="answer"
              :class="{ 'slot--filled': digits, 'slot--right': solved }"
            >
              {{ digits || "？" }}
            </div>
            <span class="number__unit">{{ gameData.unit }}</span>
          </div>
          <NumPad :disabled="solved" @press="press" @drop="press" />
        </template>

        <div v-else class="options">
          <button
            v-for="opt in gameData.options"
            :key="opt"
            type="button"
            class="option"
            :class="{
              'option--picked': choice === opt,
              'option--right': solved && choice === opt,
            }"
            :data-option="opt"
            :disabled="solved"
            @click="pick(opt)"
          >
            {{ opt }}
          </button>
        </div>

        <p v-if="feedback" class="feedback">{{ feedback }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import NumPad from "./games/Vertical/NumPad.vue";
import ProtractorTool from "./games/Geometry/ProtractorTool.vue";

const W = 600;
const H = 380;
const C = [300, 190];
const FACE = 165;
const HAND = 130;
const TOOL_R = 165;
const PLAY_MS = 2200;
const SNAP_STEP = 30;
const SNAP_WITHIN = 6;
const SNAP_DISTANCE = 24;
const SNAP_ANGLE = 7;

const rad = (d) => (d * Math.PI) / 180;
// 鐘面角度：0° 在 12，順時針增加
const onClock = (deg, r) => [
  C[0] + r * Math.sin(rad(deg)),
  C[1] - r * Math.cos(rad(deg)),
];
const clockAngle = (x, y) =>
  ((Math.atan2(x - C[0], -(y - C[1])) * 180) / Math.PI + 360) % 360;
const diff = (a, b) => ((((a - b) % 360) + 540) % 360) - 180;

// 認識周角：鐘面指針從 12 順時針旋轉，看動畫或自己拖動，回答轉了幾度
export default {
  name: "MA4036",
  components: { NumPad, ProtractorTool },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      W,
      H,
      C,
      FACE,
      TOOL_R,
      // 累計轉了幾度（0～360），轉一圈是 360 而不是回到 0
      turn: 0,
      drag: null,
      timer: null,
      showTool: false,
      pose: this.toolStart(),
      digits: "",
      choice: "",
      feedback: "",
      solved: false,
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "使用量角器量量看，再回答問題。";
    },
    handEnd() {
      return onClock(this.turn, HAND);
    },
    sector() {
      const r = 70;
      if (this.turn >= 359.5) {
        return `M ${C[0]} ${C[1] - r} A ${r} ${r} 0 1 1 ${C[0] - 0.01} ${
          C[1] - r
        } Z`;
      }
      const [x, y] = onClock(this.turn, r);
      const large = this.turn > 180 ? 1 : 0;
      return `M ${C[0]} ${C[1]} L ${C[0]} ${C[1] - r} A ${r} ${r} 0 ${large} 1 ${x} ${y} Z`;
    },
    arcLine() {
      const r = 92;
      const end = Math.min(this.turn, 359.5);
      const [x, y] = onClock(end, r);
      const large = end > 180 ? 1 : 0;
      return `M ${C[0]} ${C[1] - r} A ${r} ${r} 0 ${large} 1 ${x} ${y}`;
    },
    // 角弧末端的箭頭，指向順時針方向
    arrowHead() {
      const r = 92;
      const end = Math.min(this.turn, 359.5);
      const tip = onClock(end, r);
      const back = onClock(end - 7, r);
      const dx = tip[0] - back[0];
      const dy = tip[1] - back[1];
      const len = Math.hypot(dx, dy) || 1;
      const [ux, uy] = [dx / len, dy / len];
      const [nx, ny] = [-uy, ux];
      const s = 11;
      const base = [tip[0] - ux * s * 1.4, tip[1] - uy * s * 1.4];
      return [
        tip,
        [base[0] + nx * s, base[1] + ny * s],
        [base[0] - nx * s, base[1] - ny * s],
      ]
        .map((p) => p.join(","))
        .join(" ");
    },
    // 量角器 0° 線可以對齊的方向：起始虛線或指針（兩端都可以）
    snapRotations() {
      const rays = [90, 90 - this.turn];
      return rays.flatMap((phi) => [-phi, 180 - phi]);
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  mounted() {
    // 進入題目先播放一次動畫
    this.play();
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
    cancelAnimationFrame(this.timer);
  },
  methods: {
    tick(k) {
      const deg = k * 6;
      const inner = k % 5 === 0 ? FACE - 16 : FACE - 9;
      const [x1, y1] = onClock(deg, FACE - 2);
      const [x2, y2] = onClock(deg, inner);
      return { x1, y1, x2, y2 };
    },
    toolStart() {
      return { x: W - TOOL_R - 8, y: H - 8, rot: 0 };
    },

    // ---- 動畫 ----
    play() {
      cancelAnimationFrame(this.timer);
      const target = this.gameData.target;
      const start = performance.now();
      this.turn = 0;
      const step = (now) => {
        const t = Math.min(1, (now - start) / PLAY_MS);
        // 前後放慢，讓起點和終點看得清楚
        const ease = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        this.turn = target * ease;
        if (t < 1) this.timer = requestAnimationFrame(step);
      };
      this.timer = requestAnimationFrame(step);
    },
    resetHand() {
      cancelAnimationFrame(this.timer);
      this.turn = 0;
    },
    toggleTool() {
      this.showTool = !this.showTool;
      if (this.showTool) this.pose = this.toolStart();
    },

    // ---- 拖動：指針、量角器 ----
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
      cancelAnimationFrame(this.timer);
      const p = this.toLocal(event);
      this.drag = {
        kind,
        start: p,
        pose: { ...this.pose },
        last: clockAngle(...p),
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    onDrag(event) {
      if (!this.drag) return;
      const p = this.toLocal(event);
      const { kind, start, pose } = this.drag;
      if (kind === "hand") {
        // 累加轉動量，不讓 360 跳回 0
        const now = clockAngle(...p);
        const next = this.turn + diff(now, this.drag.last);
        this.drag.last = now;
        this.turn = Math.min(360, Math.max(0, next));
      } else if (kind === "move") {
        this.pose.x = Math.min(W, Math.max(0, pose.x + p[0] - start[0]));
        this.pose.y = Math.min(H, Math.max(0, pose.y + p[1] - start[1]));
      } else if (kind === "rotate") {
        const dir =
          ((Math.atan2(-(p[1] - this.pose.y), p[0] - this.pose.x) * 180) /
            Math.PI +
            360) %
          360;
        this.pose.rot = Math.round(90 - dir + 360) % 360;
      }
    },
    endDrag() {
      if (!this.drag) return;
      const { kind } = this.drag;
      this.drag = null;
      if (kind === "hand") {
        // 靠近整數大格（30° 的倍數）時對齊
        const near = Math.round(this.turn / SNAP_STEP) * SNAP_STEP;
        if (Math.abs(near - this.turn) <= SNAP_WITHIN) this.turn = near;
        return;
      }
      if (Math.hypot(this.pose.x - C[0], this.pose.y - C[1]) < SNAP_DISTANCE) {
        this.pose.x = C[0];
        this.pose.y = C[1];
        const target = this.snapRotations.find(
          (r) => Math.abs(diff(this.pose.rot, r)) < SNAP_ANGLE
        );
        if (target !== undefined) {
          this.pose.rot = ((Math.round(target) % 360) + 360) % 360;
        }
      }
    },

    // ---- 作答 ----
    press(key) {
      if (this.solved) return;
      this.feedback = "";
      if (key === "←") {
        this.digits = this.digits.slice(0, -1);
      } else if (this.digits.length < 3) {
        this.digits = (this.digits + key).replace(/^0+(?=\d)/, "");
      }
    },
    pick(opt) {
      if (this.solved) return;
      this.choice = opt;
      this.feedback = "";
    },
    checkAnswer() {
      if (this.solved) return;
      const q = this.gameData;
      const isDegree = q.kind === "degree";
      const given = isDegree ? this.digits : this.choice;
      if (!given) {
        this.feedback = isDegree
          ? "請先用數字鍵輸入答案喔！"
          : "請先選一個答案喔！";
        return;
      }
      const ok = isDegree ? Number(given) === q.answer : given === q.answer;
      this.$emit("add-record", [
        `${q.text} ${q.answer}${isDegree ? " 度" : ""}`,
        `${given}${isDegree ? " 度" : ""}`,
        ok ? "正確" : "錯誤",
      ]);
      if (ok) {
        this.feedback = "";
        this.solved = true;
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
      } else {
        this.feedback = isDegree
          ? "不對喔！鐘面上一大格是 30°，數數看指針轉了幾大格。"
          : "不對喔！直角是 90°、平角是 180°，轉一圈 360° 的角叫什麼呢？";
        this.$emit("play-effect", "WrongSound");
        this.play();
      }
    },
  },
};
</script>

<style scoped lang="scss">
.outer-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: $gap--small;

  .title {
    @extend .container-basic;
    justify-content: center;
    background-color: $primary-color;
    padding: $padding--small $padding--medium;
    p {
      font-size: $text-large;
      font-weight: $font-bold;
      margin: 0;
    }
  }
}

.game-area {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 1rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small;
}

.board {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;

  &__svg {
    flex: 1;
    min-height: 0;
    width: 100%;
    background-color: #ffffff;
    border: 3px solid #b3e5fc;
    border-radius: 16px;
    touch-action: none;
    user-select: none;
  }
}

.clock {
  &__face {
    fill: #fffde7;
    stroke: #7e57c2;
    stroke-width: 8;
  }

  &__tick {
    stroke: #90a4ae;
    stroke-width: 2;

    &--hour {
      stroke: #37474f;
      stroke-width: 4;
    }
  }

  &__num {
    font-size: 24px;
    font-weight: 700;
    fill: #37474f;
    text-anchor: middle;
    dominant-baseline: central;
    pointer-events: none;
  }

  &__center {
    fill: #37474f;
    stroke: #ffffff;
    stroke-width: 3;
    pointer-events: none;
  }

  &__label {
    font-size: 15px;
    font-weight: 700;
    fill: #6d4c41;
    pointer-events: none;
  }
}

.turn {
  &__sector {
    fill: rgba(255, 167, 38, 0.35);
    stroke: none;
    pointer-events: none;
  }

  &__arc {
    fill: none;
    stroke: #fb8c00;
    stroke-width: 5;
    pointer-events: none;
  }

  &__arrow {
    fill: #fb8c00;
    pointer-events: none;
  }

  &__start {
    stroke: #1565c0;
    stroke-width: 4;
    stroke-dasharray: 10 7;
    pointer-events: none;
  }
}

.hand {
  cursor: grab;

  &__hit {
    stroke: transparent;
    stroke-width: 30;
    stroke-linecap: round;
  }

  &__line {
    stroke: #e53935;
    stroke-width: 8;
    stroke-linecap: round;
  }

  &__knob {
    fill: #ef9a9a;
    stroke: #c62828;
    stroke-width: 4;
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

.tools {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &__how {
    flex: 1;
    min-width: 0;
    font-size: 1rem;
    font-weight: $font-bold;
    color: #6d4c41;
  }
}

.tool-btn {
  flex-shrink: 0;
  white-space: nowrap;
  padding: 0.45rem 0.9rem;
  font-size: 1.15rem;
  font-weight: $font-bold;
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

  &--green {
    background-color: #43a047;
    box-shadow: 0 3px 0 #1b5e20;
  }
}

.side {
  width: 17rem;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.7rem;
  min-height: 0;
  overflow-y: auto;
}

.prompt {
  align-self: stretch;
  margin: 0;
  font-size: 1.5rem;
  font-weight: $font-bold;
  line-height: 1.45;
  color: #333333;
}

.slot {
  min-width: 6rem;
  height: 3.8rem;
  padding: 0 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.2rem;
  font-weight: $font-bold;
  color: #9e9e9e;
  background-color: #ffffff;
  border: 4px dashed #90a4ae;
  border-radius: 14px;

  &--filled {
    color: #0d47a1;
    border-style: solid;
    border-color: #42a5f5;
  }

  &--right {
    color: #1b5e20;
    background-color: #e8f5e9;
    border-color: #43a047;
  }
}

.number {
  display: flex;
  align-items: center;
  gap: 0.6rem;

  &__unit {
    font-size: 1.8rem;
    font-weight: $font-bold;
    color: #333333;
  }
}

.options {
  display: flex;
  flex-direction: column;
  align-self: stretch;
  gap: 0.8rem;
}

.option {
  padding: 0.8rem;
  font-size: 1.8rem;
  font-weight: $font-bold;
  color: #ffffff;
  background-color: #26a69a;
  border: none;
  border-radius: 16px;
  box-shadow: 0 5px 0 #00796b;
  cursor: pointer;

  &--picked {
    background-color: #ff7043;
    box-shadow: 0 5px 0 #d84315;
  }

  &--right {
    background-color: #43a047;
    box-shadow: 0 5px 0 #1b5e20;
  }

  &:disabled {
    cursor: default;
  }
}

.feedback {
  align-self: stretch;
  margin: 0;
  font-size: 1.15rem;
  font-weight: $font-bold;
  line-height: 1.45;
  color: #c62828;
}

@media (max-width: 1100px) {
  .side {
    width: 15rem;
    gap: 0.5rem;
  }

  .prompt {
    font-size: 1.25rem;
  }

  .slot {
    height: 3.2rem;
    font-size: 1.9rem;
  }

  .tool-btn {
    padding: 0.35rem 0.6rem;
    font-size: 1rem;
  }

  .tools__how {
    font-size: 0.85rem;
  }

  .option {
    font-size: 1.5rem;
    padding: 0.6rem;
  }

  .feedback {
    font-size: 1rem;
  }
}
</style>

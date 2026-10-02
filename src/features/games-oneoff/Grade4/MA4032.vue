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
          :viewBox="`0 0 ${board.width} ${board.height}`"
          preserveAspectRatio="xMidYMid meet"
          @pointerdown="startDrag"
          @pointermove="onDrag"
          @pointerup="endDrag"
          @pointercancel="endDrag"
        >
          <!-- 題目圖形 -->
          <g class="figure">
            <template v-if="gameData.shape === 'triangle'">
              <line
                v-for="(e, k) in extensions"
                :key="`ext${k}`"
                :x1="e[0][0]"
                :y1="e[0][1]"
                :x2="e[1][0]"
                :y2="e[1][1]"
                class="figure__ext"
              />
              <polygon :points="trianglePoints" class="figure__tri" />
              <path :d="targetArc" class="figure__arc" />
              <text
                v-for="l in triangleLabels"
                :key="l.name"
                :x="l.p[0]"
                :y="l.p[1]"
                class="figure__label"
                :class="{ 'figure__label--target': l.target }"
              >
                {{ l.name }}
              </text>
            </template>

            <template v-else>
              <path :d="targetArc" class="figure__arc" />
              <line
                v-for="(r, k) in rays"
                :key="`ray${k}`"
                :x1="vertex[0]"
                :y1="vertex[1]"
                :x2="r.end[0]"
                :y2="r.end[1]"
                class="figure__ray"
                :class="`figure__ray--${r.kind}`"
              />
            </template>
            <circle
              :cx="vertex[0]"
              :cy="vertex[1]"
              r="5"
              class="figure__vertex"
            />
          </g>

          <!-- 量角器：拖動移動、拖轉鈕旋轉 -->
          <g
            class="tool"
            data-drag="move"
            :transform="`translate(${pose.x} ${pose.y}) rotate(${pose.rot})`"
          >
            <ProtractorTool :r="board.radius" :font-scale="1.25" glass />
            <g
              class="tool__knob"
              data-drag="rotate"
              :transform="`translate(0 ${-board.radius - 20})`"
            >
              <circle r="17" />
              <path d="M -7 3 A 8 8 0 1 1 5 6" />
              <path d="M 1 3 L 6 7 L 8 1" class="tool__knob-tip" />
            </g>
          </g>

          <!-- 關卡 4：活動邊的拖動把手，畫在量角器上面 -->
          <g v-if="isDraw" class="handle" data-drag="ray">
            <line
              :x1="vertex[0]"
              :y1="vertex[1]"
              :x2="rays[1].end[0]"
              :y2="rays[1].end[1]"
              class="handle__hit"
            />
            <circle
              :cx="rays[1].end[0]"
              :cy="rays[1].end[1]"
              r="16"
              class="handle__dot"
            />
          </g>
        </svg>

        <div class="tools">
          <span class="tools__label">量角器</span>
          <button
            type="button"
            class="tool-btn"
            aria-label="量角器向左轉"
            @click="rotate(-ROTATE_STEP)"
          >
            <svg class="tool-btn__icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12a7 7 0 1 0 2.1-5" />
              <path d="M4 3v5h5" />
            </svg>
            左轉
          </button>
          <button
            type="button"
            class="tool-btn"
            aria-label="量角器向右轉"
            @click="rotate(ROTATE_STEP)"
          >
            右轉
            <svg
              class="tool-btn__icon"
              viewBox="0 0 24 24"
              style="transform: scaleX(-1)"
              aria-hidden="true"
            >
              <path d="M5 12a7 7 0 1 0 2.1-5" />
              <path d="M4 3v5h5" />
            </svg>
          </button>
          <button type="button" class="tool-btn tool-btn--reset" @click="reset">
            還原
          </button>
        </div>
      </div>

      <div class="side">
        <p class="prompt">{{ gameData.text }}</p>

        <ol class="steps">
          <li :class="{ steps__done: centered }">中心點對準頂點</li>
          <li :class="{ steps__done: aligned }">0° 線對齊一邊</li>
          <li>
            {{ isDraw ? "數到 120°，拖動紫色邊" : "從 0° 讀到另一邊" }}
          </li>
        </ol>

        <template v-if="!isDraw">
          <div class="number">
            <button
              type="button"
              class="slot"
              data-cell="answer"
              data-pad-field
              aria-label="答案"
              :class="{
                'slot--filled': digits,
                'slot--right': solved,
                'slot--active': padEl,
              }"
              @click="openPad"
            >
              {{ digits || "？" }}
            </button>
            <span class="number__unit">{{ gameData.unit }}</span>
          </div>
          <FieldPad
            :field="solved ? null : padEl"
            @press="press"
            @close="padEl = null"
          />
        </template>
        <p v-else class="side__tip">
          拖動<span class="side__end">紫色邊</span>的圓點，畫好就按「送出答案」
        </p>

        <p v-if="feedback" class="feedback">{{ feedback }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import FieldPad from "./games/Common/FieldPad.vue";
import ProtractorTool from "./games/Geometry/ProtractorTool.vue";

const ROTATE_STEP = 5;
const SNAP_DISTANCE = 24;
const SNAP_ANGLE = 7;
const MAX_DIGITS = 3;
const DEFAULT_BOARD = { width: 600, height: 380, radius: 165, ray: 185 };

// 數學方向（0° 向右、逆時針），SVG y 向下
const along = (p, deg, r) => {
  const rad = (deg * Math.PI) / 180;
  return [p[0] + r * Math.cos(rad), p[1] - r * Math.sin(rad)];
};
const dirOf = (a, b) =>
  ((Math.atan2(-(b[1] - a[1]), b[0] - a[0]) * 180) / Math.PI + 360) % 360;
// 兩個角度差（-180～180）
const diff = (a, b) => ((((a - b) % 360) + 540) % 360) - 180;

// 怎麼量角度：拖動、旋轉量角器（靠近會自動吸附）量角或畫角
export default {
  name: "MA4032",
  components: { FieldPad, ProtractorTool },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    const board = { ...DEFAULT_BOARD, ...(this.gameConfig?.Board || {}) };
    return {
      ROTATE_STEP,
      pose: this.startPose(board),
      moving: this.gameData.start ?? 0,
      drag: null,
      digits: "",
      padEl: null,
      feedback: "",
      solved: false,
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "用量角器量量看、畫畫看。";
    },
    board() {
      return { ...DEFAULT_BOARD, ...(this.gameConfig?.Board || {}) };
    },
    isDraw() {
      return this.gameData.kind === "draw";
    },
    vertex() {
      return this.gameData.vertex;
    },
    // 要量（或畫）的角的兩邊方向
    sides() {
      const q = this.gameData;
      if (this.isDraw) return [q.fixed, this.moving];
      return [q.from, q.from + q.angle];
    },
    rays() {
      const len = this.board.ray;
      return [
        { kind: "start", end: along(this.vertex, this.sides[0], len) },
        {
          kind: this.isDraw ? "move" : "end",
          end: along(this.vertex, this.sides[1], len),
        },
      ];
    },
    targetArc() {
      const [a, b] = this.sides;
      let sweep = diff(b, a);
      const r = 30;
      const p = along(this.vertex, a, r);
      const q = along(this.vertex, b, r);
      // 逆時針（數學方向）在 SVG 為 sweep-flag 0
      const flag = sweep >= 0 ? 0 : 1;
      sweep = Math.abs(sweep);
      const large = sweep > 180 ? 1 : 0;
      return `M ${this.vertex[0]} ${this.vertex[1]} L ${p[0]} ${p[1]} A ${r} ${r} 0 ${large} ${flag} ${q[0]} ${q[1]} Z`;
    },
    trianglePoints() {
      return Object.values(this.gameData.points)
        .map((p) => p.join(","))
        .join(" ");
    },
    // 三角形要量的角：兩邊用虛線延長，方便讀刻度
    extensions() {
      const len = this.board.radius * 1.1;
      return this.sides.map((d) => [this.vertex, along(this.vertex, d, len)]);
    },
    triangleLabels() {
      const pts = this.gameData.points;
      const list = Object.values(pts);
      const c = [
        list.reduce((s, p) => s + p[0], 0) / list.length,
        list.reduce((s, p) => s + p[1], 0) / list.length,
      ];
      return Object.entries(pts).map(([name, p]) => {
        const d = Math.hypot(c[0] - p[0], c[1] - p[1]) || 1;
        // 數字角名放在角的內側，英文字母頂點名放在外側
        const inward = /\d/.test(name) ? 42 : -22;
        return {
          name,
          target: name === this.gameData.target,
          p: [
            p[0] + ((c[0] - p[0]) / d) * inward,
            p[1] + ((c[1] - p[1]) / d) * inward,
          ],
        };
      });
    },
    // 量角器 0° 線可對齊的方向（旋轉角）：右端對起始邊，或左端對另一邊
    snapRotations() {
      const [a, b] = this.sides;
      if (this.isDraw) return [-a, 180 - a];
      return [-a, 180 - b];
    },
    centered() {
      return (
        Math.hypot(this.pose.x - this.vertex[0], this.pose.y - this.vertex[1]) <
        1
      );
    },
    aligned() {
      return (
        this.centered &&
        this.snapRotations.some((r) => Math.abs(diff(this.pose.rot, r)) < 0.5)
      );
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    startPose(board) {
      return { x: board.width - 130, y: board.height - 12, rot: 0 };
    },
    toLocal(event) {
      const svg = this.$refs.svg;
      const pt = svg.createSVGPoint();
      pt.x = event.clientX;
      pt.y = event.clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      return [p.x, p.y];
    },

    // ---- 拖動：量角器移動／旋轉、活動邊 ----
    startDrag(event) {
      if (event.button !== undefined && event.button !== 0) return;
      const kind = event.target.closest?.("[data-drag]")?.dataset.drag;
      if (!kind) return;
      if (kind === "ray" && this.solved) return;
      const p = this.toLocal(event);
      this.drag = { kind, start: p, pose: { ...this.pose } };
      this.feedback = "";
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    onDrag(event) {
      if (!this.drag) return;
      const p = this.toLocal(event);
      const { kind, start, pose } = this.drag;
      if (kind === "move") {
        const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
        this.pose.x = clamp(pose.x + p[0] - start[0], 0, this.board.width);
        this.pose.y = clamp(pose.y + p[1] - start[1], 0, this.board.height);
      } else if (kind === "rotate") {
        // 旋轉鈕在量角器的 90° 方向
        this.pose.rot =
          Math.round(90 - dirOf([this.pose.x, this.pose.y], p) + 360) % 360;
      } else if (kind === "ray") {
        this.moving = Math.round(dirOf(this.vertex, p)) % 360;
      }
    },
    endDrag() {
      if (!this.drag) return;
      if (this.drag.kind !== "ray") this.snap();
      this.drag = null;
    },
    rotate(step) {
      this.pose.rot = (this.pose.rot + step + 360) % 360;
      this.snap();
    },
    reset() {
      this.pose = this.startPose(this.board);
    },
    // 靠近頂點就吸附中心點；中心點對準後，0° 線接近某一邊就吸附
    snap() {
      const [vx, vy] = this.vertex;
      if (Math.hypot(this.pose.x - vx, this.pose.y - vy) < SNAP_DISTANCE) {
        this.pose.x = vx;
        this.pose.y = vy;
      }
      if (!this.centered) return;
      const target = this.snapRotations.find(
        (r) => Math.abs(diff(this.pose.rot, r)) < SNAP_ANGLE
      );
      if (target !== undefined) this.pose.rot = ((target % 360) + 360) % 360;
    },

    // ---- 數字鍵盤 ----
    openPad(event) {
      if (this.solved) return;
      this.padEl = event.currentTarget;
    },
    press(key) {
      if (this.solved) return;
      this.feedback = "";
      if (key === "clear") {
        this.digits = "";
      } else if (key === "←") {
        this.digits = this.digits.slice(0, -1);
      } else if (this.digits.length < MAX_DIGITS) {
        this.digits = (this.digits + key).replace(/^0+(?=\d)/, "");
      }
    },

    // ---- 判分 ----
    checkAnswer() {
      if (this.solved) return;
      const q = this.gameData;
      let ok;
      let given;
      let hint;
      if (this.isDraw) {
        const drawn = Math.abs(diff(this.moving, q.fixed));
        ok = Math.abs(drawn - q.answer) <= (q.tolerance ?? 2);
        given = `${drawn} 度`;
        hint = this.aligned
          ? `從綠色邊的 0° 開始數到 ${q.answer}，再把紫色邊拖到那裡。`
          : "先把量角器的中心點對準頂點，0° 線對齊綠色的邊。";
      } else {
        if (!this.digits) {
          this.feedback = "請先用數字鍵輸入答案喔！";
          return;
        }
        const value = Number(this.digits);
        ok = value === q.answer;
        given = `${value} 度`;
        if (value === 180 - q.answer) {
          hint = "你讀到另一圈了！要讀從 0° 開始的那一圈。";
        } else if (!this.aligned) {
          hint = "先把量角器的中心點對準頂點，0° 線對齊其中一邊。";
        } else {
          hint = "從對齊的那一邊的 0° 開始，數到另一邊。";
        }
      }
      this.$emit("add-record", [
        `${q.text} ${q.answer} 度`,
        given,
        ok ? "正確" : "錯誤",
      ]);
      if (ok) {
        this.feedback = "";
        this.solved = true;
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
      } else {
        this.feedback = `不對喔！${hint}`;
        this.$emit("play-effect", "WrongSound");
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
  align-items: center;
  gap: 0.35rem;

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

.figure {
  pointer-events: none;

  &__tri {
    fill: #c8e6c9;
    stroke: #2e7d32;
    stroke-width: 4;
    stroke-linejoin: round;
  }

  &__ext {
    stroke: #2e7d32;
    stroke-width: 2.5;
    stroke-dasharray: 8 6;
  }

  &__arc {
    fill: rgba(255, 152, 0, 0.45);
    stroke: #ef6c00;
    stroke-width: 2.5;
  }

  &__ray {
    stroke-width: 5;
    stroke-linecap: round;

    &--start {
      stroke: #2e7d32;
    }

    &--end {
      stroke: #1565c0;
    }

    &--move {
      stroke: #8e24aa;
    }
  }

  &__vertex {
    fill: #37474f;
  }

  &__label {
    font-size: 26px;
    font-weight: 700;
    text-anchor: middle;
    dominant-baseline: central;
    fill: #1b5e20;
    paint-order: stroke;
    stroke: #ffffff;
    stroke-width: 5px;

    &--target {
      fill: #d84315;
      font-size: 30px;
    }
  }
}

.tool {
  cursor: grab;
  touch-action: none;

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
      stroke-linejoin: round;
    }
  }
}

.handle {
  cursor: pointer;

  &__hit {
    stroke: transparent;
    stroke-width: 26;
    stroke-linecap: round;
  }

  &__dot {
    fill: #ce93d8;
    stroke: #6a1b9a;
    stroke-width: 4;
  }
}

.tools {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &__label {
    font-size: 1.2rem;
    font-weight: $font-bold;
    color: #37474f;
  }
}

.tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.45rem 1rem;
  font-size: 1.2rem;
  font-weight: $font-bold;
  color: #ffffff;
  background-color: #7e57c2;
  border: none;
  border-radius: 12px;
  box-shadow: 0 3px 0 #4527a0;
  cursor: pointer;

  &__icon {
    width: 1.3em;
    height: 1.3em;
    fill: none;
    stroke: currentColor;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  &--reset {
    background-color: #78909c;
    box-shadow: 0 3px 0 #455a64;
  }

  &:active {
    transform: translateY(2px);
    box-shadow: none;
  }
}

.side {
  width: 17rem;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  min-height: 0;
  overflow-y: auto;

  &__tip {
    align-self: stretch;
    margin: 0;
    font-size: 1.25rem;
    font-weight: $font-bold;
    line-height: 1.5;
    color: #0277bd;
  }

  &__end {
    color: #8e24aa;
  }
}

.prompt {
  align-self: stretch;
  margin: 0;
  font-size: 1.6rem;
  font-weight: $font-bold;
  line-height: 1.4;
  color: #333333;
}

.steps {
  align-self: stretch;
  margin: 0;
  padding: 0.4rem 0.6rem 0.4rem 2rem;
  font-size: 1.05rem;
  font-weight: $font-bold;
  line-height: 1.55;
  color: #5d4037;
  background-color: #fffde7;
  border: 3px dashed #ffb300;
  border-radius: 12px;

  &__done {
    color: #2e7d32;

    &::after {
      content: " ✔";
    }
  }
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
    gap: 0.45rem;
  }

  .prompt {
    font-size: 1.35rem;
  }

  .steps {
    font-size: 0.95rem;
    line-height: 1.4;
  }

  .slot {
    height: 3.2rem;
    font-size: 1.9rem;
  }

  .tool-btn {
    padding: 0.35rem 0.7rem;
    font-size: 1.05rem;
  }

  .feedback {
    font-size: 1rem;
    line-height: 1.35;
  }
}
// 答案框可以點：點了在旁邊出現數字板
.slot {
  cursor: pointer;

  &--active {
    border-style: solid;
    border-color: #ffb300;
    box-shadow: 0 0 0 4px #ffe082;
  }
}
</style>

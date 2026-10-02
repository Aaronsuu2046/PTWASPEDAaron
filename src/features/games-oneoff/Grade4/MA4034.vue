<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <div class="work">
        <svg
          ref="svg"
          class="board"
          data-board
          :viewBox="`0 0 ${W} ${H}`"
          preserveAspectRatio="xMidYMid meet"
          @pointerdown="onBoardDown"
          @pointermove="onPieceMove"
          @pointerup="onPieceUp"
          @pointercancel="onPieceUp"
        >
          <line
            :x1="40"
            :y1="O[1]"
            :x2="W - 40"
            :y2="O[1]"
            class="board__line"
          />
          <circle
            :cx="O[0]"
            :cy="O[1]"
            :r="SNAP_RADIUS"
            class="board__zone"
            :class="{ 'board__zone--target': selectedInTray }"
          />
          <text :x="O[0]" :y="O[1] + 34" class="board__label">
            角的頂點放這裡
          </text>

          <!-- 完成圖：碎片拼好後加上頭、腳等 -->
          <g v-if="solved" class="picture">
            <template v-if="gameData.picture === 'turtle'">
              <ellipse
                :cx="O[0] + PR + 34"
                :cy="O[1] - 28"
                rx="34"
                ry="26"
                class="picture__skin"
              />
              <circle
                :cx="O[0] + PR + 46"
                :cy="O[1] - 36"
                r="6"
                class="picture__eye"
              />
              <path
                :d="`M ${O[0] + PR + 44} ${O[1] - 16} q 12 8 20 -2`"
                class="picture__smile"
              />
              <rect
                :x="O[0] - PR * 0.7"
                :y="O[1] - 2"
                width="34"
                height="30"
                rx="12"
                class="picture__skin"
              />
              <rect
                :x="O[0] + PR * 0.45"
                :y="O[1] - 2"
                width="34"
                height="30"
                rx="12"
                class="picture__skin"
              />
              <path
                :d="`M ${O[0] - PR - 4} ${O[1] - 8} l -26 12 l 26 4 z`"
                class="picture__skin"
              />
            </template>
            <template v-else>
              <line
                :x1="O[0]"
                :y1="O[1] - 95"
                :x2="O[0]"
                :y2="O[1] - 150"
                class="picture__pole"
              />
              <path
                :d="`M ${O[0]} ${O[1] - 150} l 44 12 l -44 12 z`"
                class="picture__flag"
              />
              <path
                :d="`M ${O[0] - 24} ${O[1]} L ${O[0]} ${O[1] - 44} L ${O[0] + 24} ${O[1]} Z`"
                class="picture__door"
              />
            </template>
            <text :x="O[0]" :y="44" class="picture__text">拼好了！</text>
          </g>

          <g
            v-for="piece in boardPieces"
            :key="piece.id"
            class="piece"
            :class="{
              'piece--selected': selected === piece.id,
              'piece--snapped': piece.side,
            }"
            :data-piece="piece.id"
            :transform="`translate(${piece.x} ${piece.y}) rotate(${-piece.rot})`"
          >
            <path
              :d="shapePath(piece)"
              class="piece__body"
              :style="{ fill: piece.color }"
            />
            <path :d="shellLines(piece)" class="piece__lines" />
            <path :d="cornerArc(piece)" class="piece__arc" />
            <circle r="5" class="piece__vertex" />
          </g>
          <circle :cx="O[0]" :cy="O[1]" r="6" class="board__center" />
        </svg>

        <div class="tray" data-tray>
          <div
            v-for="piece in trayPieces"
            :key="piece.id"
            class="chip"
            :class="{ 'chip--selected': selected === piece.id }"
            :data-chip="piece.id"
            @pointerdown="startChip($event, piece)"
            @pointermove="moveChip"
            @pointerup="endChip"
            @pointercancel="chip = null"
          >
            <svg
              class="chip__svg"
              :viewBox="preview(piece).box"
              aria-hidden="true"
            >
              <g :transform="`rotate(${-trayRot(piece)})`">
                <path
                  :d="shapePath(piece)"
                  class="piece__body"
                  :style="{ fill: piece.color }"
                />
                <path :d="shellLines(piece)" class="piece__lines" />
                <path :d="cornerArc(piece)" class="piece__arc" />
              </g>
            </svg>
            <button
              type="button"
              class="chip__measure"
              :aria-label="`量角 ${piece.id}`"
              @pointerdown.stop
              @click.stop="measuring = piece"
            >
              量
            </button>
          </div>
          <p v-if="!trayPieces.length" class="tray__empty">碎片都拿出來了</p>
        </div>

        <div class="tools">
          <button
            type="button"
            class="tool"
            :disabled="!selectedOnBoard"
            @click="rotate(-ROTATE_STEP)"
          >
            <svg class="tool__icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12a7 7 0 1 0 2.1-5" />
              <path d="M4 3v5h5" />
            </svg>
            左轉
          </button>
          <button
            type="button"
            class="tool"
            :disabled="!selectedOnBoard"
            @click="rotate(ROTATE_STEP)"
          >
            右轉
            <svg
              class="tool__icon"
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
            class="tool tool--back"
            :disabled="!selectedOnBoard"
            @click="toTray(selected)"
          >
            放回
          </button>
          <span class="tools__how">點碎片會放到紅點上，也可以拖過去</span>
        </div>
      </div>

      <div class="side">
        <p class="sentence">
          <template v-for="(cell, k) in CELLS" :key="cell">
            （<button
              type="button"
              class="cell"
              :class="{
                'cell--focus': padEl && focus === k,
                'cell--filled': inputs[k],
                'cell--right': solved,
              }"
              :data-cell="cell"
              data-pad-field
              @click="openPad(k, $event)"
            >
              {{ inputs[k] || "？" }}</button
            >）{{ k === 0 ? "度的角和" : "度的角合起來是平角" }}
          </template>
        </p>
        <FieldPad
          :field="solved ? null : padEl"
          @press="press"
          @close="padEl = null"
        />
        <p v-if="feedback" class="feedback">{{ feedback }}</p>
      </div>

      <div
        v-if="chip && chip.moved"
        class="ghost"
        :style="{ left: `${chip.cx}px`, top: `${chip.cy}px` }"
      >
        <svg
          class="chip__svg"
          :viewBox="preview(chip.piece).box"
          aria-hidden="true"
        >
          <g :transform="`rotate(${-trayRot(chip.piece)})`">
            <path
              :d="shapePath(chip.piece)"
              class="piece__body"
              :style="{ fill: chip.piece.color }"
            />
          </g>
        </svg>
      </div>

      <MeasureDialog
        v-if="measuring"
        :from="trayRot(measuring)"
        :angle="measuring.angle"
        color="#2e7d32"
        @close="measuring = null"
      />
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import FieldPad from "./games/Common/FieldPad.vue";
import MeasureDialog from "./games/Geometry/MeasureDialog.vue";

const W = 600;
const H = 300;
const O = [300, 250];
const PR = 125; // 扇形碎片半徑
const SNAP_RADIUS = 46;
const SNAP_ANGLE = 12;
const ROTATE_STEP = 15;
const TAP_DISTANCE = 8;
const CELLS = ["first", "second"];
const PICTURE_MS = 1800;

const rad = (d) => (d * Math.PI) / 180;
const polar = (deg, r) => [r * Math.cos(rad(deg)), -r * Math.sin(rad(deg))];
const diff = (a, b) => ((((a - b) % 360) + 540) % 360) - 180;

function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// 平角拼圖：把兩個角的頂點放到直線中間的紅點，拼成 180°，再填兩個角的度數
export default {
  name: "MA4034",
  components: { FieldPad, MeasureDialog },
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
      O,
      PR,
      SNAP_RADIUS,
      ROTATE_STEP,
      CELLS,
      // 選項順序每次隨機
      pieces: shuffle(this.gameData.pieces).map((p) => ({
        ...p,
        where: "tray",
        x: 0,
        y: 0,
        rot: 0,
        side: null,
      })),
      selected: null,
      drag: null,
      chip: null,
      measuring: null,
      inputs: ["", ""],
      focus: 0,
      padEl: null,
      feedback: "",
      solved: false,
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "量量看，哪兩個角可以拼成一個平角？";
    },
    trayPieces() {
      return this.pieces.filter((p) => p.where === "tray");
    },
    boardPieces() {
      // 選到的碎片畫在最上層
      return this.pieces
        .filter((p) => p.where === "board")
        .sort((a, b) => (a.id === this.selected) - (b.id === this.selected));
    },
    selectedOnBoard() {
      return (
        this.boardPieces.some((p) => p.id === this.selected) && !this.solved
      );
    },
    selectedInTray() {
      return this.trayPieces.some((p) => p.id === this.selected);
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
    clearTimeout(this.nextTimer);
  },
  methods: {
    // ---- 碎片形狀（頂點在原點，兩邊在 0° 與 angle 方向） ----
    shapePath(p) {
      if (p.shape === "setSquare") {
        const [a, b] = p.legs;
        return `M 0 0 L ${a} 0 L 0 ${-b} Z`;
      }
      const [x, y] = polar(p.angle, PR);
      const large = p.angle > 180 ? 1 : 0;
      return `M 0 0 L ${PR} 0 A ${PR} ${PR} 0 ${large} 0 ${x} ${y} Z`;
    },
    // 龜殼花紋：同心弧與放射線
    shellLines(p) {
      if (p.shape === "setSquare") {
        const [a, b] = p.legs;
        return `M ${a * 0.45} 0 L 0 ${-b * 0.45}`;
      }
      const parts = [];
      for (const r of [PR * 0.45, PR * 0.75]) {
        const [x, y] = polar(p.angle, r);
        parts.push(`M ${r} 0 A ${r} ${r} 0 0 0 ${x} ${y}`);
      }
      for (let d = 30; d < p.angle; d += 30) {
        const [x1, y1] = polar(d, PR * 0.45);
        const [x2, y2] = polar(d, PR);
        parts.push(`M ${x1} ${y1} L ${x2} ${y2}`);
      }
      return parts.join(" ");
    },
    cornerArc(p) {
      const r = 22;
      const [x, y] = polar(p.angle, r);
      if (p.shape === "setSquare") return `M ${r} 0 L ${r} ${-r} L 0 ${-r}`;
      return `M ${r} 0 A ${r} ${r} 0 0 0 ${x} ${y}`;
    },
    // 托盤裡角平分線朝上
    trayRot(p) {
      return 90 - p.angle / 2;
    },
    preview(p) {
      const rot = this.trayRot(p);
      const pts = [[0, 0]];
      if (p.shape === "setSquare") {
        pts.push(polar(rot, p.legs[0]), polar(rot + 90, p.legs[1]));
      } else {
        for (let d = 0; d <= p.angle; d += 5) pts.push(polar(rot + d, PR));
        pts.push(polar(rot + p.angle, PR));
      }
      const xs = pts.map((q) => q[0]);
      const ys = pts.map((q) => q[1]);
      const pad = 8;
      const x0 = Math.min(...xs) - pad;
      const y0 = Math.min(...ys) - pad;
      return {
        box: `${x0} ${y0} ${Math.max(...xs) + pad - x0} ${Math.max(...ys) + pad - y0}`,
      };
    },

    // ---- 放置與吸附 ----
    toBoardPoint(clientX, clientY) {
      const svg = this.$refs.svg;
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      return [p.x, p.y];
    },
    // 右邊：第一邊對齊 0°；左邊：第二邊對齊 180°
    sideRot(p, side) {
      return side === "right" ? 0 : 180 - p.angle;
    },
    freeSide(p, prefer) {
      const taken = this.pieces
        .filter((q) => q.id !== p.id && q.where === "board" && q.side)
        .map((q) => q.side);
      const order = prefer === "left" ? ["left", "right"] : ["right", "left"];
      return order.find((s) => !taken.includes(s)) || null;
    },
    snapTo(p, side) {
      p.x = O[0];
      p.y = O[1];
      p.rot = this.sideRot(p, side);
      p.side = side;
    },
    // 頂點靠近紅點就吸附到離目前方向較近的那一邊
    trySnap(p) {
      p.side = null;
      if (Math.hypot(p.x - O[0], p.y - O[1]) > SNAP_RADIUS) return;
      const near = ["right", "left"].sort(
        (a, b) =>
          Math.abs(diff(p.rot, this.sideRot(p, a))) -
          Math.abs(diff(p.rot, this.sideRot(p, b)))
      );
      const side = this.freeSide(p, near[0]);
      if (side) this.snapTo(p, side);
    },
    placeAtCenter(p) {
      const side = this.freeSide(p, "right");
      if (!side) {
        this.feedback = "紅點上已經有兩個角了，先把一個放回去。";
        return;
      }
      p.where = "board";
      this.snapTo(p, side);
      this.selected = p.id;
    },
    toTray(id) {
      const p = this.pieces.find((q) => q.id === id);
      if (!p || this.solved) return;
      p.where = "tray";
      p.side = null;
      if (this.selected === id) this.selected = null;
    },
    rotate(step) {
      const p = this.pieces.find((q) => q.id === this.selected);
      if (!p || p.where !== "board") return;
      p.rot = (p.rot + step + 360) % 360;
      // 在紅點上轉到接近某一邊時對齊
      p.side = null;
      if (Math.hypot(p.x - O[0], p.y - O[1]) < 1) {
        const side = ["right", "left"].find(
          (s) => Math.abs(diff(p.rot, this.sideRot(p, s))) < SNAP_ANGLE
        );
        if (side && this.freeSide(p, side) === side) this.snapTo(p, side);
      }
      this.feedback = "";
    },

    // ---- 托盤碎片：點一下放到紅點、拖曳放到板子上 ----
    startChip(event, piece) {
      if (this.solved) return;
      if (event.button !== undefined && event.button !== 0) return;
      this.chip = {
        piece,
        sx: event.clientX,
        sy: event.clientY,
        cx: event.clientX,
        cy: event.clientY,
        moved: false,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    moveChip(event) {
      if (!this.chip) return;
      this.chip.cx = event.clientX;
      this.chip.cy = event.clientY;
      if (
        Math.hypot(event.clientX - this.chip.sx, event.clientY - this.chip.sy) >
        TAP_DISTANCE
      ) {
        this.chip.moved = true;
      }
    },
    endChip(event) {
      if (!this.chip) return;
      const { piece, moved } = this.chip;
      this.chip = null;
      this.feedback = "";
      if (!moved) {
        this.placeAtCenter(piece);
        return;
      }
      const overBoard = document
        .elementsFromPoint(event.clientX, event.clientY)
        .some((el) => el.closest("[data-board]"));
      if (!overBoard) return;
      const [x, y] = this.toBoardPoint(event.clientX, event.clientY);
      piece.where = "board";
      piece.x = Math.min(W - 10, Math.max(10, x));
      piece.y = Math.min(H - 10, Math.max(10, y));
      piece.rot = this.trayRot(piece);
      this.selected = piece.id;
      this.trySnap(piece);
    },

    // ---- 板子上的碎片：拖動、點選 ----
    onBoardDown(event) {
      if (this.solved) return;
      if (event.button !== undefined && event.button !== 0) return;
      const id = event.target.closest?.("[data-piece]")?.dataset.piece;
      if (!id) {
        // 點紅點附近：把托盤裡選到的碎片放上來
        const [x, y] = this.toBoardPoint(event.clientX, event.clientY);
        const p = this.pieces.find((q) => q.id === this.selected);
        if (
          p &&
          p.where === "tray" &&
          Math.hypot(x - O[0], y - O[1]) < SNAP_RADIUS * 1.5
        ) {
          this.placeAtCenter(p);
        }
        return;
      }
      const p = this.pieces.find((q) => q.id === id);
      this.selected = id;
      this.feedback = "";
      this.drag = {
        p,
        start: this.toBoardPoint(event.clientX, event.clientY),
        sx: event.clientX,
        sy: event.clientY,
        x: p.x,
        y: p.y,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    onPieceMove(event) {
      if (!this.drag) return;
      const [x, y] = this.toBoardPoint(event.clientX, event.clientY);
      const { p, start } = this.drag;
      p.x = Math.min(W - 10, Math.max(10, this.drag.x + x - start[0]));
      p.y = Math.min(H - 10, Math.max(10, this.drag.y + y - start[1]));
      p.side = null;
    },
    onPieceUp(event) {
      if (!this.drag) return;
      const { p, sx, sy } = this.drag;
      this.drag = null;
      const moved =
        Math.hypot(event.clientX - sx, event.clientY - sy) > TAP_DISTANCE;
      if (!moved) {
        this.trySnap(p);
        return;
      }
      // 拖回托盤
      const overTray = document
        .elementsFromPoint(event.clientX, event.clientY)
        .some((el) => el.closest("[data-tray]"));
      if (overTray) {
        this.toTray(p.id);
        return;
      }
      this.trySnap(p);
    },

    // ---- 數字填空 ----
    // 點哪一格就在那一格旁邊開數字板
    openPad(k, event) {
      if (this.solved) return;
      this.focus = k;
      this.padEl = event.currentTarget;
    },
    press(key) {
      if (this.solved) return;
      this.feedback = "";
      const k = this.focus;
      if (key === "clear") {
        this.inputs[k] = "";
      } else if (key === "←") {
        this.inputs[k] = this.inputs[k].slice(0, -1);
      } else if (this.inputs[k].length < 3) {
        this.inputs[k] = (this.inputs[k] + key).replace(/^0+(?=\d)/, "");
      }
    },
    // ---- 判分 ----
    checkAnswer() {
      if (this.solved) return;
      const snapped = this.pieces.filter((p) => p.where === "board" && p.side);
      const onBoard = this.pieces.filter((p) => p.where === "board");
      const sum = snapped.reduce((s, p) => s + p.angle, 0);
      const answer = this.gameData.answer
        .map((id) => this.pieces.find((p) => p.id === id).angle)
        .sort((a, b) => a - b);
      const typed = this.inputs.map(Number).sort((a, b) => a - b);

      let message = "";
      if (snapped.length < 2) {
        message = "先把兩個角的頂點放到紅點上，拼成一條直線喔！";
      } else if (onBoard.length > 2) {
        message = "板子上只能留兩個角，把多的放回去。";
      } else if (sum !== 180) {
        message = `這兩個角合起來${sum > 180 ? "疊在一起了" : "還有空隙"}，不是平角，換一個角試試看。`;
      } else if (this.inputs.some((v) => !v)) {
        this.feedback = "角拼好了！再把兩個角的度數填進括號裡。";
        return;
      } else if (typed.join() !== answer.join()) {
        message = "角度填錯了，按「量」量量看。";
      }
      if (snapped.length < 2 && !this.inputs.some(Boolean)) {
        this.feedback = message;
        return;
      }
      const ok = !message;
      this.$emit("add-record", [
        `${answer[0]} 度和 ${answer[1]} 度合起來是平角`,
        `拼了 ${snapped.map((p) => `${p.angle}°`).join("、") || "無"}；填 ${this.inputs
          .map((v) => v || "空")
          .join("、")}`,
        ok ? "正確" : "錯誤",
      ]);
      if (ok) {
        this.feedback = "";
        this.solved = true;
        this.selected = null;
        this.$emit("play-effect", "CorrectSound");
        // 先讓學生看一下拼好的圖案，再進下一關
        this.nextTimer = setTimeout(
          () => this.$emit("next-question"),
          PICTURE_MS
        );
      } else {
        this.feedback = `不對喔！${message}`;
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

.work {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.board {
  flex: 1;
  min-height: 0;
  width: 100%;
  background-color: #ffffff;
  border: 3px solid #b3e5fc;
  border-radius: 16px;
  touch-action: none;
  user-select: none;

  &__line {
    stroke: #37474f;
    stroke-width: 4;
    stroke-linecap: round;
  }

  &__zone {
    fill: rgba(255, 235, 59, 0.25);
    stroke: #ffb300;
    stroke-width: 2.5;
    stroke-dasharray: 7 5;

    &--target {
      fill: rgba(255, 235, 59, 0.55);
    }
  }

  &__center {
    fill: #e53935;
    stroke: #ffffff;
    stroke-width: 2;
    pointer-events: none;
  }

  &__label {
    font-size: 17px;
    font-weight: 700;
    fill: #8d6e63;
    text-anchor: middle;
    pointer-events: none;
  }
}

.piece {
  cursor: grab;

  &__body {
    stroke: #33691e;
    stroke-width: 3;
    stroke-linejoin: round;
    opacity: 0.92;
  }

  &__lines {
    fill: none;
    stroke: rgba(255, 255, 255, 0.75);
    stroke-width: 3;
    pointer-events: none;
  }

  &__arc {
    fill: none;
    stroke: #bf360c;
    stroke-width: 3;
    pointer-events: none;
  }

  &__vertex {
    fill: #37474f;
    pointer-events: none;
  }

  &--selected &__body {
    stroke: #ff6f00;
    stroke-width: 5;
  }
}

.picture {
  pointer-events: none;

  &__skin {
    fill: #aed581;
    stroke: #558b2f;
    stroke-width: 3;
  }

  &__eye {
    fill: #263238;
  }

  &__smile {
    fill: none;
    stroke: #263238;
    stroke-width: 3;
    stroke-linecap: round;
  }

  &__pole {
    stroke: #6d4c41;
    stroke-width: 5;
  }

  &__flag {
    fill: #ef5350;
  }

  &__door {
    fill: #8d6e63;
  }

  &__text {
    font-size: 34px;
    font-weight: 700;
    fill: #e65100;
    text-anchor: middle;
  }
}

.tray {
  min-height: 6.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  padding: 0.3rem;
  background-color: #fff8e1;
  border: 3px dashed #ffcc80;
  border-radius: 16px;

  &__empty {
    margin: 0;
    font-size: 1.2rem;
    font-weight: $font-bold;
    color: #8d6e63;
  }
}

.chip {
  position: relative;
  width: 7.4rem;
  height: 5.6rem;
  padding: 0.3rem;
  background-color: #ffffff;
  border: 4px solid #b0bec5;
  border-radius: 14px;
  box-shadow: 0 3px 0 #90a4ae;
  cursor: grab;
  touch-action: none;
  user-select: none;

  &--selected {
    border-color: #ffb300;
    box-shadow: 0 0 0 5px #ffe082;
  }

  &__svg {
    width: 100%;
    height: 100%;
    display: block;
    pointer-events: none;
  }

  &__measure {
    position: absolute;
    right: -0.5rem;
    top: -0.5rem;
    width: 2rem;
    height: 2rem;
    padding: 0;
    font-size: 1rem;
    font-weight: $font-bold;
    color: #ffffff;
    background-color: #7e57c2;
    border: 2px solid #ffffff;
    border-radius: 50%;
    box-shadow: 0 2px 0 #4527a0;
    cursor: pointer;
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

.tool {
  flex-shrink: 0;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.4rem 0.9rem;
  font-size: 1.15rem;
  font-weight: $font-bold;
  color: #ffffff;
  background-color: #7e57c2;
  border: none;
  border-radius: 12px;
  box-shadow: 0 3px 0 #4527a0;
  cursor: pointer;

  &--back {
    background-color: #78909c;
    box-shadow: 0 3px 0 #455a64;
  }

  &:disabled {
    opacity: 0.45;
    cursor: default;
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
}

.sentence {
  align-self: stretch;
  margin: 0;
  font-size: 1.4rem;
  font-weight: $font-bold;
  line-height: 2.3;
  color: #333333;
}

.cell {
  min-width: 4.6rem;
  height: 3.2rem;
  font-size: 1.8rem;
  vertical-align: middle;
  font-weight: $font-bold;
  color: #9e9e9e;
  background-color: #ffffff;
  border: 4px dashed #90a4ae;
  border-radius: 14px;
  cursor: pointer;

  &--filled {
    color: #0d47a1;
    border-style: solid;
    border-color: #90caf9;
  }

  &--focus {
    border-color: #ffb300;
    box-shadow: 0 0 0 4px #ffe082;
  }

  &--right {
    color: #1b5e20;
    background-color: #e8f5e9;
    border-color: #43a047;
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

.ghost {
  position: fixed;
  z-index: 100;
  width: 6.4rem;
  height: 4.8rem;
  transform: translate(-50%, -50%);
  pointer-events: none;
  opacity: 0.85;
}

@media (max-width: 1100px) {
  .side {
    width: 15rem;
    gap: 0.45rem;
  }

  .tray {
    min-height: 5.2rem;
  }

  .chip {
    width: 6rem;
    height: 4.6rem;
  }

  .sentence {
    font-size: 1.15rem;
    line-height: 1.9;
  }

  .cell {
    min-width: 3.9rem;
    height: 2.8rem;
    font-size: 1.55rem;
  }

  .tool {
    padding: 0.35rem 0.7rem;
    font-size: 1rem;
  }

  .tools__how {
    font-size: 0.85rem;
    line-height: 1.25;
  }

  .feedback {
    font-size: 1rem;
  }
}
</style>

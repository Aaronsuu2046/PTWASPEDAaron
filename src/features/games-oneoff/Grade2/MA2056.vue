<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <!-- 題目：a × b ＝ □，走到正確答案後填上 -->
      <div class="question">
        <span class="question__num">{{ gameData.a }}</span>
        <span class="question__sign">×</span>
        <span class="question__num">{{ gameData.b }}</span>
        <span class="question__sign">＝</span>
        <span
          class="question__slot"
          :class="{ 'question__slot--done': status === 'correct' }"
          data-slot
        >
          {{ status === "correct" ? gameData.answer : "" }}
        </span>
      </div>
      <p v-if="hintText" class="tip">{{ hintText }}</p>

      <div class="play">
        <div class="board-wrap">
          <MazeBoard v-if="level" :tiles="level.tiles">
            <rect
              :x="level.start[0] + 0.12"
              :y="level.start[1] + 0.12"
              width="0.76"
              height="0.76"
              rx="0.2"
              fill="#b2ebf2"
            />
            <MazeAnswerZone
              v-for="zone in zones"
              :key="zone.value"
              :symbol="String(zone.value)"
              :x="zone.x"
              :y="zone.y"
              :fill="zone.color"
              :font-size="fontSizeOf(zone.value)"
              :state="zoneState(zone)"
            />
            <MazePlayer
              :x="player[0]"
              :y="player[1]"
              :facing="facing"
              :move-ms="MOVE_MS"
            />
          </MazeBoard>

          <!-- 開始前的操作提示 -->
          <div v-if="status === 'ready'" class="overlay">
            <p class="overlay__text">
              用方向鍵（或右邊的按鈕）帶小精靈，<br />走到正確的答案！
            </p>
            <button
              type="button"
              class="overlay__btn"
              data-start
              @click="begin"
            >
              開始
            </button>
          </div>
          <!-- 走錯：停止操作，可以再試一次 -->
          <div v-if="status === 'wrong'" class="overlay overlay--wrong">
            <p class="overlay__text">
              走錯了！{{ gameData.a }} × {{ gameData.b }} 不是
              {{ hitValue }}，<br />想一想 {{ gameData.a }} 的乘法再試一次。
            </p>
            <button
              type="button"
              class="overlay__btn"
              data-retry
              @click="retry"
            >
              再試一次
            </button>
          </div>
        </div>

        <!-- 平板／觸控用的方向鍵：按住會一直走 -->
        <div class="pad" aria-label="方向鍵">
          <button
            v-for="btn in PAD"
            :key="btn.dir"
            type="button"
            class="pad__btn"
            :class="`pad__btn--${btn.dir}`"
            :data-dir="btn.dir"
            :aria-label="btn.label"
            @pointerdown.prevent="padDown(btn.dir, $event)"
            @pointerup="padUp(btn.dir)"
            @pointercancel="padUp(btn.dir)"
            @pointerleave="padUp(btn.dir)"
          >
            {{ btn.icon }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import MazeBoard from "../Grade4/games/Maze/MazeBoard.vue";
import MazeAnswerZone from "../Grade4/games/Maze/MazeAnswerZone.vue";
import MazePlayer from "../Grade4/games/Maze/MazePlayer.vue";
import {
  DIRS,
  walkable,
  makeLevel,
  reshuffleZones,
} from "../Grade4/games/Maze/maze.js";

const KEYS = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};
const PAD = [
  { dir: "up", icon: "▲", label: "往上" },
  { dir: "left", icon: "◀", label: "往左" },
  { dir: "right", icon: "▶", label: "往右" },
  { dir: "down", icon: "▼", label: "往下" },
];
// 迷宮大小：7 × 5 個房間（15 × 11 格），四個答案區
const ROOMS = [7, 5];
const ZONE_COUNT = 4;
const MOVE_MS = 130;
const SHOW_MS = 900;
// 四個答案區各一個顏色（不代表對錯）
const ZONE_COLORS = ["#ef6c00", "#2e7d32", "#c2185b", "#1565c0"];

function shuffle(list) {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 2、4、5、8 乘法大挑戰（迷宮選答）
// 題目 { code, a, b, answer, distractors[3] }；正解與 3 個干擾項隨機放在 4 個不同的死路盡頭
// 方向鍵／WASD／畫面方向鈕移動，碰到牆走不過去；走進答案區才判定：
// 對了填上答案並換題，錯了停下來顯示提示，按「再試一次」回起點、答案區重新洗牌
// 沿用四年級迷宮（MA4076）的地圖、角色與答案區元件，這裡沒有小幽靈
export default {
  name: "MA2056",
  components: { MazeBoard, MazeAnswerZone, MazePlayer },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      PAD,
      MOVE_MS,
      level: null,
      zones: [],
      player: [0, 0],
      facing: "down",
      // ready：還沒開始；playing：走迷宮中；correct／wrong：已判定，停止操作
      status: "ready",
      hitValue: null,
      held: [],
      moving: false,
      timer: null,
      advanceTimer: null,
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "帶小精靈到正確的乘法答案";
    },
    hintText() {
      return this.gameConfig?.Hint || "";
    },
    options() {
      return [this.gameData.answer, ...this.gameData.distractors];
    },
  },
  created() {
    this.newLevel();
    emitter.on("submitAnswer", this.onSubmit);
  },
  mounted() {
    window.addEventListener("keydown", this.onKeyDown, { passive: false });
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.releaseAll);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.onSubmit);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.releaseAll);
    this.releaseAll();
    clearTimeout(this.advanceTimer);
  },
  methods: {
    newLevel() {
      this.level = makeLevel(ROOMS[0], ROOMS[1], ZONE_COUNT);
      this.placeZones(this.level.zones);
      this.player = [...this.level.start];
    },
    placeZones(cells) {
      const values = shuffle(this.options);
      this.zones = cells.map(([x, y], k) => ({
        x,
        y,
        value: values[k],
        color: ZONE_COLORS[k],
      }));
    },
    fontSizeOf(value) {
      const len = String(value).length;
      return len >= 3 ? 0.46 : len === 2 ? 0.66 : 0.72;
    },
    zoneState(zone) {
      if (zone.value !== this.hitValue) return "";
      return this.status === "correct" ? "hit" : "wrong";
    },
    begin() {
      if (this.status !== "ready") return;
      this.status = "playing";
    },
    // 再試一次：回起點，答案區換位置（正解一定換到別的地方）
    retry() {
      this.releaseAll();
      const before = this.zones.find((z) => z.value === this.gameData.answer);
      let cells = null;
      let tries = 0;
      do {
        cells = reshuffleZones(this.level.tiles, this.level.start, ZONE_COUNT);
        if (cells) this.placeZones(cells);
        tries += 1;
      } while (
        cells &&
        tries < 20 &&
        this.zones.some(
          (z) =>
            z.value === this.gameData.answer &&
            z.x === before.x &&
            z.y === before.y
        )
      );
      if (!cells || tries >= 20) this.newLevel();
      this.player = [...this.level.start];
      this.facing = "down";
      this.hitValue = null;
      this.status = "playing";
    },
    onSubmit() {
      // 這個單元用走的作答；按送出答案時就開始
      if (this.status === "ready") this.begin();
    },
    onKeyDown(event) {
      if (event.target?.closest?.("input, textarea, [contenteditable]")) return;
      const dir = KEYS[event.key] || KEYS[event.key?.toLowerCase?.()];
      if (!dir) return;
      // 方向鍵不要捲動頁面
      event.preventDefault();
      if (event.repeat) return;
      if (this.status === "ready") this.begin();
      this.hold(dir);
    },
    onKeyUp(event) {
      const dir = KEYS[event.key] || KEYS[event.key?.toLowerCase?.()];
      if (dir) this.release(dir);
    },
    padDown(dir, event) {
      event.currentTarget.setPointerCapture?.(event.pointerId);
      if (this.status === "ready") this.begin();
      this.hold(dir);
    },
    padUp(dir) {
      this.release(dir);
    },
    hold(dir) {
      this.held = [...this.held.filter((d) => d !== dir), dir];
      this.step();
    },
    release(dir) {
      this.held = this.held.filter((d) => d !== dir);
    },
    releaseAll() {
      this.held = [];
      clearTimeout(this.timer);
      this.timer = null;
      this.moving = false;
    },
    // 走一格；方向鍵還按著就繼續走
    step() {
      if (this.status !== "playing" || this.moving || !this.held.length) return;
      const dir = this.held[this.held.length - 1];
      const [dx, dy] = DIRS[dir];
      this.facing = dir;
      const nx = this.player[0] + dx;
      const ny = this.player[1] + dy;
      if (!walkable(this.level.tiles, nx, ny)) return;
      this.player = [nx, ny];
      this.moving = true;
      this.timer = setTimeout(() => {
        this.moving = false;
        this.timer = null;
        // 角色完全走進格子後才判定
        const zone = this.zones.find((z) => z.x === nx && z.y === ny);
        if (zone) this.judge(zone);
        else this.step();
      }, MOVE_MS);
    },
    judge(zone) {
      if (this.status !== "playing") return;
      this.releaseAll();
      this.hitValue = zone.value;
      const { code, a, b, answer } = this.gameData;
      const isCorrect = zone.value === answer;
      this.$emit("add-record", [
        `${code} ${a}×${b}＝${answer}（選項：${this.options.join("、")}）`,
        `走到 ${zone.value}`,
        isCorrect ? "正確" : "錯誤",
      ]);
      if (isCorrect) {
        this.status = "correct";
        this.$emit("play-effect", "CorrectSound");
        this.advanceTimer = setTimeout(
          () => this.$emit("next-question"),
          SHOW_MS
        );
      } else {
        this.status = "wrong";
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
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small $padding--medium;
}

.question {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.2rem 2rem;
  background-color: #ffffff;
  border-radius: 18px;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.1);

  &__num {
    font-size: 2.6rem;
    font-weight: $font-bold;
    color: #0d47a1;
  }

  &__sign {
    font-size: 2.4rem;
    font-weight: $font-bold;
    color: #333333;
  }

  &__slot {
    min-width: 4rem;
    height: 3.4rem;
    padding: 0 0.3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.4rem;
    font-weight: $font-bold;
    color: #2e7d32;
    border: 4px dashed #ab47bc;
    border-radius: 12px;

    &--done {
      border-style: solid;
      border-color: #43a047;
      background-color: #e8f5e9;
    }
  }
}

.tip {
  margin: 0;
  font-size: 1.1rem;
  font-weight: $font-bold;
  color: #6d4c41;
}

.play {
  flex: 1;
  min-height: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.2rem;
}

.board-wrap {
  position: relative;
  height: 100%;
  aspect-ratio: 15 / 11;
  max-width: calc(100% - 11rem);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.12);
}

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  background-color: rgba(255, 255, 255, 0.82);

  &--wrong {
    background-color: rgba(255, 235, 238, 0.9);
  }

  &__text {
    max-width: 85%;
    margin: 0;
    text-align: center;
    font-size: 1.6rem;
    font-weight: $font-bold;
    line-height: 1.5;
    color: #4e342e;
  }

  &__btn {
    padding: 0.5rem 2rem;
    font-size: 1.6rem;
    font-weight: $font-bold;
    color: #ffffff;
    background-color: #43a047;
    border: none;
    border-radius: 14px;
    box-shadow: 0 4px 0 #2e7d32;
    cursor: pointer;
  }
}

.pad {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: repeat(3, 3.4rem);
  grid-template-rows: repeat(3, 3.4rem);
  gap: 0.3rem;

  &__btn {
    font-size: 1.5rem;
    color: #ffffff;
    background-color: #7e57c2;
    border: none;
    border-radius: 12px;
    box-shadow: 0 3px 0 #512da8;
    cursor: pointer;
    touch-action: none;
    user-select: none;

    &:active {
      background-color: #5e35b1;
    }

    &--up {
      grid-column: 2;
      grid-row: 1;
    }

    &--left {
      grid-column: 1;
      grid-row: 2;
    }

    &--right {
      grid-column: 3;
      grid-row: 2;
    }

    &--down {
      grid-column: 2;
      grid-row: 3;
    }
  }
}

@media (max-width: 1100px), (max-height: 760px) {
  .question {
    &__num {
      font-size: 2.2rem;
    }

    &__slot {
      height: 2.9rem;
      font-size: 2rem;
    }
  }

  .pad {
    grid-template-columns: repeat(3, 2.9rem);
    grid-template-rows: repeat(3, 2.9rem);
  }

  .overlay__text {
    font-size: 1.35rem;
  }
}
</style>

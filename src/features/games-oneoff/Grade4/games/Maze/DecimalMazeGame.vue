<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <!-- 題目：兩個小數，中間的□走到正確符號後填上 -->
      <div class="question">
        <span class="question__num">{{ gameData.left }}</span>
        <span
          class="question__slot"
          :class="{ 'question__slot--done': status === 'correct' }"
          data-slot
        >
          {{ status === "correct" ? gameData.answer : "" }}
        </span>
        <span class="question__num">{{ gameData.right }}</span>
        <!-- 愛心：碰到小幽靈扣一顆，遊戲照常進行 -->
        <span class="hearts" :class="{ 'hearts--hit': hitFlash }" data-hearts>
          <span
            v-for="k in MAX_HEARTS"
            :key="k"
            class="hearts__one"
            :class="{ 'hearts__one--lost': k > hearts }"
            >❤</span
          >
        </span>
      </div>

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
              :key="zone.symbol"
              :symbol="zone.symbol"
              :x="zone.x"
              :y="zone.y"
              :state="zoneState(zone)"
            />
            <MazeEnemy
              v-for="(enemy, k) in enemies"
              :key="`enemy-${k}`"
              :x="enemy.x"
              :y="enemy.y"
              :facing="enemy.dir"
              :color="ENEMY_COLORS[k % ENEMY_COLORS.length]"
              :move-ms="ENEMY_MS - 60"
            />
            <MazePlayer
              :class="{ 'player--hurt': invincible }"
              :x="player[0]"
              :y="player[1]"
              :facing="facing"
              :move-ms="MOVE_MS"
            />
          </MazeBoard>

          <!-- 開始前的操作提示 -->
          <div v-if="status === 'ready'" class="overlay">
            <p class="overlay__text">
              使用方向鍵或 WASD，走到正確的符號。<br />小心小幽靈，碰到會扣一顆愛心喔！
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
          <!-- 走錯：本關失敗，可以再試一次 -->
          <div v-if="status === 'wrong'" class="overlay overlay--wrong">
            <p class="overlay__text">
              走錯了！{{ gameData.left }} 和 {{ gameData.right }}
              要先比整數部分，再一位一位比。
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
import MazeBoard from "./MazeBoard.vue";
import MazeAnswerZone from "./MazeAnswerZone.vue";
import MazePlayer from "./MazePlayer.vue";
import MazeEnemy from "./MazeEnemy.vue";
import {
  DIRS,
  walkable,
  distances,
  makeLevel,
  reshuffleZones,
} from "./maze.js";

const SYMBOLS = [">", "<", "="];
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
// 迷宮大小：7 × 5 個房間（15 × 11 格）
const ROOMS = [7, 5];
const MOVE_MS = 130;
// 小幽靈：兩隻，比角色慢，在通道上隨機遊走（盡量不回頭），不會走進答案區
const ENEMY_COUNT = 2;
const ENEMY_MS = 420;
const ENEMY_COLORS = ["#f48fb1", "#80cbc4"];
// 出生點離起點至少幾步
const ENEMY_MIN_DIST = 6;
// 每關愛心數；被碰到後幾毫秒內不會再扣
const MAX_HEARTS = 3;
const INVINCIBLE_MS = 1500;
const SHOW_MS = 900;

function shuffle(list) {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 小數換成「幾個 0.01」的整數，比大小不用浮點數
function hundredths(text) {
  const [whole, frac = ""] = text.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0").slice(0, 2));
}

// 小數比大小迷宮：題目 { left, right, answer }，保留原始寫法（0.50 和 0.5）
// 角色從中央起點出發，走進 >、<、= 其中一個答案區就判定；
// 兩隻小幽靈在通道上隨機遊走，碰到扣一顆愛心（每關 3 顆），遊戲不暫停、不結束；
// 答案區每次都隨機放在三個不同的死路盡頭，走錯可以再試一次（答案位置重新洗牌）
export default {
  name: "DecimalMazeGame",
  components: { MazeBoard, MazeAnswerZone, MazePlayer, MazeEnemy },
  props: {
    gameData: { type: Object, required: true },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      PAD,
      MOVE_MS,
      ENEMY_MS,
      ENEMY_COLORS,
      MAX_HEARTS,
      enemies: [],
      enemyTimer: null,
      hearts: MAX_HEARTS,
      invincible: false,
      invincibleTimer: null,
      hitFlash: false,
      level: null,
      zones: [],
      player: [0, 0],
      facing: "down",
      // ready：還沒開始；playing：走迷宮中；moving 時不接受新的一步
      status: "ready",
      hitSymbol: "",
      // 按住中的方向，最後按的優先（同時按好幾個也只走一個方向）
      held: [],
      moving: false,
      timer: null,
      advanceTimer: null,
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "走到正確的符號：>、< 還是 =？";
    },
    answer() {
      const a = hundredths(this.gameData.left);
      const b = hundredths(this.gameData.right);
      return a > b ? ">" : a < b ? "<" : "=";
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
    this.stopEnemies();
    clearTimeout(this.advanceTimer);
    clearTimeout(this.invincibleTimer);
  },
  methods: {
    newLevel() {
      this.level = makeLevel(ROOMS[0], ROOMS[1], SYMBOLS.length);
      this.placeZones(this.level.zones);
      this.player = [...this.level.start];
      this.spawnEnemies();
    },
    // 小幽靈放在離起點夠遠、不是答案區的通道上
    spawnEnemies() {
      const { tiles, start } = this.level;
      const dist = distances(tiles, start[0], start[1]);
      const cells = Object.entries(dist)
        .filter(([, d]) => d >= ENEMY_MIN_DIST)
        .map(([k]) => k.split(",").map(Number))
        .filter(([x, y]) => !this.isZone(x, y));
      this.enemies = shuffle(cells)
        .slice(0, ENEMY_COUNT)
        .map(([x, y]) => ({ x, y, dir: "down" }));
    },
    isZone(x, y) {
      return this.zones.some((z) => z.x === x && z.y === y);
    },
    startEnemies() {
      this.stopEnemies();
      this.enemyTimer = setInterval(this.moveEnemies, ENEMY_MS);
    },
    stopEnemies() {
      clearInterval(this.enemyTimer);
      this.enemyTimer = null;
    },
    moveEnemies() {
      if (this.status !== "playing") return;
      const { tiles } = this.level;
      const back = { up: "down", down: "up", left: "right", right: "left" };
      this.enemies = this.enemies.map((e) => {
        const options = Object.keys(DIRS).filter((d) => {
          const nx = e.x + DIRS[d][0];
          const ny = e.y + DIRS[d][1];
          return walkable(tiles, nx, ny) && !this.isZone(nx, ny);
        });
        if (!options.length) return e;
        // 盡量不回頭，走起來比較像在巡邏；死路才掉頭
        const forward = options.filter((d) => d !== back[e.dir]);
        const pool = forward.length ? forward : options;
        const dir = pool[Math.floor(Math.random() * pool.length)];
        return {
          x: e.x + DIRS[dir][0],
          y: e.y + DIRS[dir][1],
          dir,
          px: e.x,
          py: e.y,
        };
      });
      this.checkHit();
    },
    // 碰到（同一格，或和角色互換位置）就扣一顆愛心；不暫停、不結束
    checkHit(prev = null) {
      if (this.invincible || this.status !== "playing") return;
      const [x, y] = this.player;
      const hit = this.enemies.some(
        (e) =>
          (e.x === x && e.y === y) ||
          (e.px === x &&
            e.py === y &&
            prev &&
            e.x === prev[0] &&
            e.y === prev[1])
      );
      if (!hit) return;
      if (this.hearts > 0) this.hearts -= 1;
      this.invincible = true;
      this.hitFlash = true;
      clearTimeout(this.invincibleTimer);
      this.invincibleTimer = setTimeout(() => {
        this.invincible = false;
        this.hitFlash = false;
      }, INVINCIBLE_MS);
    },
    placeZones(cells) {
      const symbols = shuffle(SYMBOLS);
      this.zones = cells.map(([x, y], k) => ({ x, y, symbol: symbols[k] }));
    },
    zoneState(zone) {
      if (zone.symbol !== this.hitSymbol) return "";
      return this.status === "correct" ? "hit" : "wrong";
    },
    begin() {
      if (this.status !== "ready") return;
      this.status = "playing";
      this.startEnemies();
    },
    // 再試一次：角色回起點，三個答案區換位置（正確答案一定換到別的地方）
    retry() {
      this.releaseAll();
      const before = this.zones.find((z) => z.symbol === this.answer);
      let cells = null;
      let tries = 0;
      do {
        cells = reshuffleZones(
          this.level.tiles,
          this.level.start,
          SYMBOLS.length
        );
        if (cells) this.placeZones(cells);
        tries += 1;
      } while (
        cells &&
        tries < 20 &&
        this.zones.some(
          (z) =>
            z.symbol === this.answer && z.x === before.x && z.y === before.y
        )
      );
      // 這個迷宮放不出不同的位置時，就換一個新迷宮
      if (!cells || tries >= 20) this.newLevel();
      this.player = [...this.level.start];
      this.spawnEnemies();
      this.facing = "down";
      this.hitSymbol = "";
      this.status = "playing";
      this.startEnemies();
    },
    onSubmit() {
      // 這個單元用走的作答；按送出答案時提醒一下
      if (this.status === "ready") this.begin();
    },
    onKeyDown(event) {
      // 在輸入框打字（例如重現代碼）時不要攔截
      if (event.target?.closest?.("input, textarea, [contenteditable]")) return;
      const dir = KEYS[event.key] || KEYS[event.key?.toLowerCase?.()];
      if (!dir) return;
      // 遊戲中方向鍵不要捲動頁面
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
    // 走一格；走完如果方向鍵還按著就繼續走
    step() {
      if (this.status !== "playing" || this.moving || !this.held.length) return;
      const dir = this.held[this.held.length - 1];
      const [dx, dy] = DIRS[dir];
      this.facing = dir;
      const nx = this.player[0] + dx;
      const ny = this.player[1] + dy;
      if (!walkable(this.level.tiles, nx, ny)) return;
      const prev = this.player;
      this.player = [nx, ny];
      this.checkHit(prev);
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
      this.releaseAll();
      this.hitSymbol = zone.symbol;
      const isCorrect = zone.symbol === this.answer;
      const { left, right } = this.gameData;
      this.$emit("add-record", [
        `${left} ${this.answer} ${right}`,
        `${left} ${zone.symbol} ${right}`,
        isCorrect ? "正確" : "錯誤",
      ]);
      if (isCorrect) {
        this.status = "correct";
        this.stopEnemies();
        this.$emit("play-effect", "CorrectSound");
        // 停一下讓學生看到□填上正確符號，再進下一關
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
  gap: 0.6rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small $padding--medium;
}

.question {
  display: flex;
  align-items: center;
  gap: 1.2rem;
  padding: 0.3rem 2rem;
  background-color: #ffffff;
  border-radius: 18px;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.1);

  &__num {
    font-size: 2.8rem;
    font-weight: $font-bold;
    color: #0d47a1;
  }

  &__slot {
    width: 3.6rem;
    height: 3.6rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.6rem;
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

.hearts {
  margin-left: 1rem;
  display: flex;
  gap: 0.15rem;
  font-size: 1.8rem;

  &__one {
    color: #e53935;
    transition:
      color 0.2s,
      transform 0.2s;

    &--lost {
      color: #cfd8dc;
      transform: scale(0.85);
    }
  }

  &--hit {
    animation: hearts-shake 0.4s;
  }
}

@keyframes hearts-shake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-6px);
  }
  75% {
    transform: translateX(6px);
  }
}

// 被碰到後閃爍（無敵時間）
.player--hurt {
  animation: player-blink 0.25s steps(2) infinite;
}

@keyframes player-blink {
  50% {
    opacity: 0.25;
  }
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
    max-width: 80%;
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
  grid-template-columns: repeat(3, 3.2rem);
  grid-template-rows: repeat(3, 3.2rem);
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
      font-size: 2.3rem;
    }

    &__slot {
      width: 3rem;
      height: 3rem;
      font-size: 2.2rem;
    }
  }

  .pad {
    grid-template-columns: repeat(3, 2.8rem);
    grid-template-rows: repeat(3, 2.8rem);
  }

  .overlay__text {
    font-size: 1.35rem;
  }
}
</style>

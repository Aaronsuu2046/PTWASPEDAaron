<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <!-- 木牌：時間、分數、愛心 -->
      <div class="status" :style="{ backgroundImage: `url(${ASSETS.board})` }">
        <span class="status__item">
          時間
          <strong :class="{ 'status__time--low': timeLeft <= 10 }">{{
            timeLeft
          }}</strong>
          秒
        </span>
        <span class="status__item">
          三角形 <strong>{{ hits }}</strong> / {{ passScore }}
        </span>
        <span class="status__lives" aria-label="生命值">
          <span
            v-for="i in maxLives"
            :key="i"
            class="status__heart"
            :class="{ 'status__heart--lost': i > lives }"
            >♥</span
          >
        </span>
      </div>

      <div
        class="field"
        :style="{ backgroundImage: `url(${ASSETS.background})` }"
      >
        <div
          v-for="(pos, i) in HOLE_POSITIONS"
          :key="i"
          class="hole"
          :style="{ left: `${pos.x}%`, top: `${pos.y}%`, zIndex: pos.z }"
        >
          <!-- 洞口以上才看得到：地鼠頭頂著題卡一起升起、落下 -->
          <div class="hole__window">
            <button
              v-if="holes[i]"
              :key="holes[i].key"
              type="button"
              class="mole"
              :class="{
                'mole--up': holes[i].up,
                'mole--hit': holes[i].result === 'hit',
                'mole--miss': holes[i].result === 'miss',
              }"
              :data-hole="i"
              :data-triangle="holes[i].item.isTriangle"
              :aria-label="`題卡 ${i + 1}`"
              @pointerdown.prevent="whack(i)"
            >
              <span class="mole__card">
                <TriangleShape :shape="holes[i].item.shape" />
                <span v-if="holes[i].result === 'hit'" class="mole__mark"
                  >✔</span
                >
                <span
                  v-if="holes[i].result === 'miss'"
                  class="mole__mark mole__mark--x"
                  >✘</span
                >
              </span>
              <img
                :src="ASSETS.mole"
                alt=""
                class="mole__body"
                draggable="false"
              />
            </button>
          </div>
          <img
            :src="ASSETS.hole"
            alt=""
            class="hole__mound"
            draggable="false"
          />
        </div>

        <!-- 開始／結束面板 -->
        <div v-if="phase !== 'playing'" class="panel">
          <template v-if="phase === 'ready'">
            <p class="panel__title">找出三角形！</p>
            <p class="panel__text">
              點一下是三角形的題卡；點錯會少一顆愛心。{{ totalTime }} 秒內打到
              {{ passScore }} 個三角形就過關。
            </p>
            <button type="button" class="panel__btn" @click="startRound">
              開始
            </button>
          </template>
          <template v-else>
            <p class="panel__title">
              {{ passed ? "過關了！" : lives <= 0 ? "愛心用完了" : "時間到了" }}
            </p>
            <p class="panel__text">
              打到 {{ hits }} 個三角形，點錯 {{ misses }} 次。
            </p>
            <button
              v-if="!passed"
              type="button"
              class="panel__btn"
              @click="startRound"
            >
              再玩一次
            </button>
          </template>
        </div>
      </div>
      <p class="hint">
        判斷方法：由 3 條直直的邊圍起來、有 3 個頂點的才是三角形
      </p>
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import { getGameAssets, getSystemEffectAssets } from "@/lib/get-assets.js";
import TriangleShape from "./games/Geometry/TriangleShape.vue";

const HOLE_COUNT = 6;
const ASSETS = {
  background: getGameAssets("MA4062", "MA4062_background.png"),
  board: getGameAssets("MA4062", "MA4062_board.png"),
  hole: getGameAssets("MA4062", "MA4062_hole.png"),
  mole: getGameAssets("MA4062", "MA4062_mole.png"),
};
// 土堆左上角位置（%）：後排在上、前排在下且與後排交錯，前排蓋在後排前面
const HOLE_POSITIONS = [
  { x: 4.5, y: 36, z: 1 },
  { x: 36.5, y: 36, z: 1 },
  { x: 68.5, y: 36, z: 1 },
  { x: 20.5, y: 71, z: 2 },
  { x: 52.5, y: 71, z: 2 },
  { x: 84.5, y: 71, z: 2 },
];
const RISE_MS = 300;
const MAX_VISIBLE = 4;
const rand = (min, max) => min + Math.random() * (max - min);

// 認識三角形 2：打地鼠，點「是三角形」的題卡得分，點錯扣愛心；
// 時間到或愛心用完結束，打到 passScore 個三角形且愛心沒用完就過關
export default {
  name: "MA4062",
  components: { TriangleShape },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      ASSETS,
      HOLE_POSITIONS,
      holes: Array(HOLE_COUNT).fill(null),
      phase: "ready",
      timeLeft: 0,
      hits: 0,
      misses: 0,
      lives: 0,
      passed: false,
      keySeq: 0,
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "找出三角形。";
    },
    totalTime() {
      return this.gameConfig?.Time ?? 40;
    },
    maxLives() {
      return this.gameConfig?.Lives ?? 3;
    },
    passScore() {
      return this.gameConfig?.PassScore ?? 6;
    },
    items() {
      return this.gameData.items;
    },
  },
  created() {
    emitter.on("submitAnswer", this.onSubmit);
    this.timers = new Set();
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.onSubmit);
    this.clearTimers();
  },
  methods: {
    later(fn, ms) {
      const id = setTimeout(() => {
        this.timers.delete(id);
        fn();
      }, ms);
      this.timers.add(id);
      return id;
    },
    clearTimers() {
      this.timers.forEach((id) => clearTimeout(id));
      this.timers.clear();
      clearInterval(this.clock);
    },
    startRound() {
      this.clearTimers();
      this.holes = Array(HOLE_COUNT).fill(null);
      this.timeLeft = this.totalTime;
      this.hits = 0;
      this.misses = 0;
      this.lives = this.maxLives;
      this.passed = false;
      this.phase = "playing";
      this.clock = setInterval(() => {
        this.timeLeft -= 1;
        if (this.timeLeft <= 0) this.endRound();
      }, 1000);
      this.spawn();
    },
    // 隨機找空洞放題卡，隨機停留後縮回；同時最多 MAX_VISIBLE 張
    spawn() {
      if (this.phase !== "playing") return;
      const visible = this.holes.filter(Boolean).length;
      const empty = this.holes
        .map((h, i) => (h ? -1 : i))
        .filter((i) => i >= 0);
      if (visible < MAX_VISIBLE && empty.length) {
        const index = empty[Math.floor(Math.random() * empty.length)];
        const item = this.items[Math.floor(Math.random() * this.items.length)];
        this.keySeq += 1;
        const key = this.keySeq;
        this.setHole(index, { key, item, result: null, up: false });
        // 先放在洞裡，下一刻再升起，才會有動畫
        this.later(() => this.raise(index, key), 30);
        this.later(
          () => {
            if (!this.holes[index]?.result) this.lower(index, key);
          },
          rand(2800, 4500)
        );
      }
      this.later(this.spawn, rand(700, 1300));
    },
    raise(index, key) {
      const hole = this.holes[index];
      if (hole?.key === key) this.setHole(index, { ...hole, up: true });
    },
    // 地鼠連同題卡一起縮回洞裡，動畫結束後清空
    lower(index, key) {
      const hole = this.holes[index];
      if (hole?.key !== key) return;
      this.setHole(index, { ...hole, up: false });
      this.later(() => {
        if (this.holes[index]?.key === key) this.setHole(index, null);
      }, RISE_MS);
    },
    setHole(index, value) {
      const next = [...this.holes];
      next[index] = value;
      this.holes = next;
    },
    playSound(name) {
      try {
        const audio = new Audio(getSystemEffectAssets(name));
        audio.play().catch(() => {});
      } catch {
        // 無法播放音效時不影響遊戲
      }
    },
    whack(index) {
      const hole = this.holes[index];
      if (this.phase !== "playing" || !hole || !hole.up || hole.result) return;
      const isTriangle = hole.item.isTriangle;
      this.setHole(index, { ...hole, result: isTriangle ? "hit" : "miss" });
      this.$emit("add-record", [
        `${hole.item.name}：${isTriangle ? "是" : "不是"}三角形`,
        "點擊",
        isTriangle ? "正確" : "錯誤",
      ]);
      if (isTriangle) {
        this.hits += 1;
        this.playSound("CorrectAnswer.mp3");
      } else {
        this.misses += 1;
        this.lives -= 1;
        this.playSound("WrongAnswer.mp3");
      }
      this.later(() => this.lower(index, hole.key), 500);
      if (this.lives <= 0) this.endRound();
    },
    endRound() {
      if (this.phase !== "playing") return;
      this.clearTimers();
      this.timeLeft = Math.max(this.timeLeft, 0);
      this.phase = "done";
      this.passed = this.lives > 0 && this.hits >= this.passScore;
      this.later(() => {
        this.holes = Array(HOLE_COUNT).fill(null);
      }, 600);
      if (this.passed) {
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
      } else {
        this.$emit("play-effect", "WrongSound");
      }
    },
    // 側邊欄「送出答案」：還沒開始就開始；進行中不用送出
    onSubmit() {
      if (this.phase === "ready") this.startRound();
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
  gap: 0.5rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small;
}

.status {
  flex-shrink: 0;
  width: 27rem;
  height: 4.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.2rem;
  padding: 0 2.2rem 0.2rem;
  background-size: 100% 100%;
  background-repeat: no-repeat;
  font-size: 1.3rem;
  font-weight: $font-bold;
  white-space: nowrap;
  color: #4e342e;

  strong {
    font-size: 1.7rem;
    color: #1565c0;
  }

  &__time--low {
    color: #e53935 !important;
  }

  &__lives {
    display: flex;
    gap: 0.1rem;
  }

  &__heart {
    font-size: 1.7rem;
    color: #e53935;

    &--lost {
      color: #bcaaa4;
    }
  }
}

// 草地背景（2:1），洞的位置用百分比
.field {
  position: relative;
  flex: 1;
  min-height: 0;
  max-width: 100%;
  aspect-ratio: 2 / 1;
  background-size: 100% 100%;
  border-radius: 20px;
  overflow: hidden;
}

// 一個洞：寬為草地的 15%，高依土堆圖 4:3（= 草地高度的 22.5%）
.hole {
  position: absolute;
  width: 15%;
  height: 22.5%;

  &__mound {
    position: absolute;
    inset: 0;
    z-index: 2;
    width: 100%;
    height: 100%;
    pointer-events: none;
    user-select: none;
  }

  // 洞口（土堆圖由上往下 22% 處）以上的可見範圍
  &__window {
    position: absolute;
    left: 0;
    bottom: 78%;
    z-index: 1;
    width: 100%;
    height: 170%;
    overflow: hidden;
  }
}

// 地鼠連同頭上的題卡一起升起、落下
.mole {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  touch-action: manipulation;
  transform: translateY(100%);
  transition: transform 0.3s ease;

  &--up {
    transform: translateY(0);
  }

  &__card {
    position: relative;
    z-index: 1;
    width: 62%;
    aspect-ratio: 1;
    margin-bottom: -15%;
    padding: 6%;
    background-color: #ffffff;
    border: 4px solid #8d6e63;
    border-radius: 14px;
    box-shadow: 0 4px 0 #6d4c41;
  }

  &__body {
    width: 100%;
    display: block;
    pointer-events: none;
    user-select: none;
  }

  &--hit &__card {
    border-color: #43a047;
    box-shadow: 0 0 0 5px #a5d6a7;
  }

  &--miss &__card {
    border-color: #e53935;
    box-shadow: 0 0 0 5px #ffcdd2;
  }

  &__mark {
    position: absolute;
    top: -0.3rem;
    right: 0.1rem;
    font-size: 2rem;
    font-weight: $font-bold;
    color: #2e7d32;

    &--x {
      color: #c62828;
    }
  }
}

.panel {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  padding: 1rem;
  background-color: rgba(255, 255, 255, 0.88);
  border-radius: 20px;

  &__title {
    margin: 0;
    font-size: 2.2rem;
    font-weight: $font-bold;
    color: #e65100;
  }

  &__text {
    margin: 0;
    max-width: 32rem;
    font-size: 1.35rem;
    line-height: 1.5;
    text-align: center;
    color: #333333;
  }

  &__btn {
    padding: 0.6rem 2.4rem;
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

.hint {
  margin: 0;
  font-size: 1.1rem;
  color: #6d4c41;
}

@media (max-width: 1100px) {
  .status {
    width: 26rem;
    height: 3.8rem;
    gap: 0.7rem;
    padding: 0 1.8rem 0.2rem;
    font-size: 1.1rem;

    strong {
      font-size: 1.45rem;
    }
  }

  .mole__card {
    border-width: 3px;
  }

  .mole__mark {
    font-size: 1.6rem;
  }
}
</style>

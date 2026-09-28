<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <div class="status">
        <span class="status__item">
          時間
          <strong :class="{ 'status__time--low': timeLeft <= 10 }">{{
            timeLeft
          }}</strong>
          秒
        </span>
        <span class="status__item">
          打到三角形 <strong>{{ hits }}</strong> / {{ passScore }}
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

      <div class="field">
        <div v-for="(hole, i) in holes" :key="i" class="hole">
          <div class="hole__pit" />
          <button
            v-if="hole"
            :key="hole.key"
            type="button"
            class="mole"
            :class="{
              'mole--hit': hole.result === 'hit',
              'mole--miss': hole.result === 'miss',
            }"
            :data-hole="i"
            :data-triangle="hole.item.isTriangle"
            :aria-label="`題卡 ${i + 1}`"
            @pointerdown.prevent="whack(i)"
          >
            <TriangleShape :shape="hole.item.shape" />
            <span v-if="hole.result === 'hit'" class="mole__mark">✔</span>
            <span v-if="hole.result === 'miss'" class="mole__mark mole__mark--x"
              >✘</span
            >
          </button>
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
import { getSystemEffectAssets } from "@/lib/get-assets.js";
import TriangleShape from "./games/Geometry/TriangleShape.vue";

const HOLE_COUNT = 6;
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
        this.setHole(index, { key, item, result: null });
        this.later(
          () => {
            if (this.holes[index]?.key === key && !this.holes[index].result)
              this.setHole(index, null);
          },
          rand(1800, 3200)
        );
      }
      this.later(this.spawn, rand(450, 1000));
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
      if (this.phase !== "playing" || !hole || hole.result) return;
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
      this.later(() => {
        if (this.holes[index]?.key === hole.key) this.setHole(index, null);
      }, 500);
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
  display: flex;
  align-items: center;
  gap: 2rem;
  font-size: 1.5rem;
  font-weight: $font-bold;
  color: #333333;

  strong {
    font-size: 1.9rem;
    color: #1565c0;
  }

  &__time--low {
    color: #e53935 !important;
  }

  &__lives {
    display: flex;
    gap: 0.2rem;
  }

  &__heart {
    font-size: 2rem;
    color: #e53935;

    &--lost {
      color: #cfd8dc;
    }
  }
}

.field {
  position: relative;
  flex: 1;
  min-height: 0;
  width: 100%;
  max-width: 48rem;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 0.8rem 1.5rem;
  padding: 0.8rem;
  background: linear-gradient(#aed581, #7cb342);
  border-radius: 20px;
}

.hole {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overflow: hidden;

  &__pit {
    position: absolute;
    bottom: 0.3rem;
    width: 80%;
    height: 22%;
    background-color: #5d4037;
    border-radius: 50%;
    box-shadow: inset 0 6px 8px rgba(0, 0, 0, 0.5);
  }
}

.mole {
  position: relative;
  z-index: 1;
  height: 88%;
  aspect-ratio: 1;
  margin-bottom: 1rem;
  padding: 0.5rem;
  background-color: #ffffff;
  border: 4px solid #8d6e63;
  border-radius: 18px;
  box-shadow: 0 5px 0 #6d4c41;
  cursor: pointer;
  touch-action: manipulation;
  animation: pop-up 0.25s ease-out;

  &--hit {
    border-color: #43a047;
    box-shadow: 0 0 0 5px #a5d6a7;
  }

  &--miss {
    border-color: #e53935;
    box-shadow: 0 0 0 5px #ffcdd2;
  }

  &__mark {
    position: absolute;
    top: -0.2rem;
    right: 0.2rem;
    font-size: 2.2rem;
    font-weight: $font-bold;
    color: #2e7d32;

    &--x {
      color: #c62828;
    }
  }
}

@keyframes pop-up {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
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
    gap: 1.2rem;
    font-size: 1.3rem;
  }

  .field {
    max-width: 40rem;
    gap: 0.6rem 1rem;
  }
}
</style>

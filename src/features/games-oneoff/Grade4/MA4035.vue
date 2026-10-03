<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <div class="stage">
        <p class="stage__name">{{ gameData.text }}</p>
        <div class="stage__video">
          <!-- 正式動畫：連續播放到題目設定的秒數，停在最後一格 -->
          <video
            :key="playKey"
            class="stage__clip"
            :src="videoSrc"
            :aria-label="gameData.text"
            muted
            autoplay
            playsinline
            preload="auto"
            disablepictureinpicture
            @loadeddata="onLoaded"
            @ended="onEnded"
          />
        </div>
        <button type="button" class="replay" @click="replay">
          <svg class="replay__icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12a7 7 0 1 0 2.1-5" />
            <path d="M4 3v5h5" />
          </svg>
          重播動畫
        </button>
      </div>

      <div class="side">
        <p class="prompt">{{ gameData.text }}，是往哪個方向旋轉？</p>
        <button
          v-for="opt in OPTIONS"
          :key="opt.value"
          type="button"
          class="choice"
          :class="{
            'choice--picked': choice === opt.value,
            'choice--right': solved && choice === opt.value,
          }"
          :data-choice="opt.value"
          :disabled="solved"
          @click="pick(opt.value)"
        >
          {{ opt.label }}
        </button>
        <p v-if="feedback" class="feedback">{{ feedback }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";

// 各情境的正式動畫（H.264 MP4），以檔名對應題目的 video 欄位
const VIDEOS = Object.fromEntries(
  Object.entries(
    import.meta.glob("@/assets/games/MA4035/*.mp4", {
      eager: true,
      import: "default",
    })
  ).map(([path, url]) => [path.split("/").pop().replace(".mp4", ""), url])
);

const OPTIONS = [
  { value: "cw", label: "順時針方向旋轉" },
  { value: "ccw", label: "逆時針方向旋轉" },
];
const NAMES = { cw: "順時針", ccw: "逆時針" };

// 順時針和逆時針：看旋轉情境動畫，選方向
export default {
  name: "MA4035",
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      OPTIONS,
      playKey: 0,
      playStart: 0,
      choice: "",
      feedback: "",
      solved: false,
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "看完動畫，再回答問題。";
    },
    videoSrc() {
      return VIDEOS[this.gameData.video];
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    // 每次重播都會換 key 重新建立影片，載入時從頭計時（重複播放時不重設）
    onLoaded() {
      this.playStart = performance.now();
    },
    // 動畫很短，重複播放到題目設定的秒數再停
    onEnded(event) {
      const seconds = this.gameData.seconds ?? 0;
      if (performance.now() - this.playStart < seconds * 1000) {
        event.target.currentTime = 0;
        event.target.play();
      }
    },
    replay() {
      this.playKey += 1;
    },
    pick(value) {
      if (this.solved) return;
      this.choice = value;
      this.feedback = "";
    },
    checkAnswer() {
      if (this.solved) return;
      if (!this.choice) {
        this.feedback = "先選一個答案喔！";
        return;
      }
      const ok = this.choice === this.gameData.answer;
      this.$emit("add-record", [
        `${this.gameData.text}：${NAMES[this.gameData.answer]}`,
        NAMES[this.choice],
        ok ? "正確" : "錯誤",
      ]);
      if (ok) {
        this.feedback = "";
        this.solved = true;
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
      } else {
        this.feedback =
          "不對喔！看清楚東西是往哪邊轉：和時鐘指針轉的方向一樣是順時針，相反是逆時針。按「重播動畫」再看一次。";
        this.replay();
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

.stage {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;

  &__name {
    margin: 0;
    font-size: 1.7rem;
    font-weight: $font-bold;
    color: #e65100;
  }

  &__video {
    flex: 1;
    min-height: 0;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #ffffff;
    border: 4px solid #b3e5fc;
    border-radius: 18px;
    overflow: hidden;
  }
}

// 影片依原始長寬比放進畫面，不裁切
.stage__clip {
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}

.replay {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 1.2rem;
  font-size: 1.25rem;
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
}

.side {
  width: 17rem;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1rem;
  min-height: 0;
  overflow-y: auto;
}

.prompt {
  margin: 0;
  font-size: 1.6rem;
  font-weight: $font-bold;
  line-height: 1.45;
  color: #333333;
}

.choice {
  padding: 1rem 0.6rem;
  font-size: 1.6rem;
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
  margin: 0;
  font-size: 1.15rem;
  font-weight: $font-bold;
  line-height: 1.45;
  color: #c62828;
}

@media (max-width: 1100px) {
  .side {
    width: 15rem;
    gap: 0.7rem;
  }

  .prompt {
    font-size: 1.35rem;
  }

  .choice {
    padding: 0.8rem 0.5rem;
    font-size: 1.35rem;
  }

  .stage__name {
    font-size: 1.4rem;
  }

  .feedback {
    font-size: 1rem;
  }
}
</style>

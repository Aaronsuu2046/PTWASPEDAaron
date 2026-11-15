<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <div ref="board" class="board">
        <!-- 關卡 1～4：二選一／三選一 -->
        <div
          v-if="gameData.type === 'choose'"
          class="options"
          :class="`options--${options.length}`"
        >
          <button
            v-for="opt in options"
            :key="opt.optionId"
            type="button"
            class="option"
            :class="optionClass(opt.optionId)"
            :data-option="opt.optionId"
            @click="select(opt.optionId)"
          >
            <!-- 正式插圖；透明的 polygon 對齊圖上的頂點，三角板可吸附量測 -->
            <svg
              :viewBox="opt.view.join(' ')"
              class="option__svg"
              role="img"
              :aria-label="`三角形 ${opt.label}`"
            >
              <image
                :href="imageOf(opt.image)"
                :width="opt.size[0]"
                :height="opt.size[1]"
              />
              <polygon
                :points="pointsOf(opt)"
                class="option__hit"
                fill="transparent"
              />
            </svg>
          </button>
        </div>

        <!-- 關卡 5：正式複合圖；每個色塊疊一個對齊的透明點選區（座標同原圖） -->
        <svg
          v-else
          class="composite"
          :viewBox="gameData.view.join(' ')"
          role="group"
          aria-label="複合圖形"
        >
          <image
            :href="imageOf(gameData.image)"
            :width="gameData.size[0]"
            :height="gameData.size[1]"
          />
          <polygon
            v-for="piece in gameData.options"
            :key="piece.optionId"
            :points="pointsOf(piece)"
            class="composite__piece"
            :class="pieceClass(piece.optionId)"
            :data-option="piece.optionId"
            tabindex="0"
            role="button"
            :aria-label="`色塊 ${piece.label}`"
            @click="select(piece.optionId)"
            @keydown.enter.prevent="select(piece.optionId)"
            @keydown.space.prevent="select(piece.optionId)"
          />
        </svg>

        <SetSquare
          v-if="showSquare"
          ref="setSquare"
          :size="130"
          :start-x="boardWidth - 170"
          :start-y="boardHeight - 16"
          snap-selector=".option__hit, .composite__piece"
          @tap="forwardTap"
        />
      </div>

      <div class="side">
        <div class="info">
          <p class="info__main">
            {{
              gameData.type === "choose"
                ? "點選等腰直角三角形"
                : "點選圖中的等腰直角三角形"
            }}
          </p>
          <p v-if="!showHint" class="info__sub">選好後按「送出答案」</p>
          <p v-if="message" class="info__feedback">{{ message }}</p>
          <p v-if="showHint" class="info__hint">
            不對喔！等腰直角三角形有一個直角，而且兩條直角邊一樣長。可以用三角板量量看。
          </p>
        </div>
        <div class="tools">
          <button type="button" class="tool tool--toggle" @click="toggleSquare">
            {{ showSquare ? "收起三角板" : "拿出三角板" }}
          </button>
          <div v-if="showSquare" class="tools__buttons">
            <button type="button" class="tool" @click="rotate(-15)">
              左轉
            </button>
            <button type="button" class="tool" @click="rotate(15)">右轉</button>
            <button type="button" class="tool tool--reset" @click="resetSquare">
              歸位
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import SetSquare from "./games/Geometry/SetSquare.vue";
import { getGameAssets } from "@/lib/get-assets.js";

function shuffle(list) {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 認識等腰直角三角形：關卡 1～4 從 2～3 張圖卡選出等腰直角三角形（位置隨機），
// 關卡 5 在複合圖形中點選唯一的等腰直角三角形色塊；以 optionId 判分
// 圖片都是正式插圖（src/assets/games/MA4065）；vertices 為原圖像素座標，
// view 為要顯示的範圍（SVG viewBox，等比例完整顯示）
export default {
  name: "MA4065",
  components: { SetSquare },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      options: shuffle(this.gameData.options),
      selected: null,
      wrongId: null,
      message: "",
      showHint: false,
      answered: false,
      showSquare: false,
      boardWidth: 600,
      boardHeight: 400,
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "找出等腰直角三角形。";
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  mounted() {
    const board = this.$refs.board;
    this.boardWidth = board?.clientWidth || 600;
    this.boardHeight = board?.clientHeight || 400;
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    imageOf(name) {
      return getGameAssets("MA4065", name);
    },
    pointsOf(shape) {
      return shape.vertices.map((p) => p.join(",")).join(" ");
    },
    optionClass(id) {
      return {
        "option--selected": this.selected === id,
        "option--wrong": this.wrongId === id,
        "option--correct": this.answered && id === this.gameData.answer,
      };
    },
    pieceClass(id) {
      return {
        "composite__piece--selected": this.selected === id,
        "composite__piece--wrong": this.wrongId === id,
        "composite__piece--correct":
          this.answered && id === this.gameData.answer,
      };
    },
    select(id) {
      if (this.answered) return;
      this.selected = id;
      this.wrongId = null;
      this.message = "";
    },
    // 點到三角板但沒拖動時，當作點在底下的位置
    forwardTap({ clientX, clientY }) {
      const square = this.$refs.setSquare?.$el;
      if (square) square.style.visibility = "hidden";
      const target = document.elementFromPoint(clientX, clientY);
      if (square) square.style.visibility = "";
      const option = target?.closest("[data-option]");
      if (option) this.select(option.dataset.option);
    },
    toggleSquare() {
      this.showSquare = !this.showSquare;
    },
    rotate(step) {
      this.$refs.setSquare?.rotate(step);
    },
    resetSquare() {
      this.$refs.setSquare?.reset();
    },
    describe(id) {
      const opt = this.gameData.options.find((o) => o.optionId === id);
      return opt ? `${this.gameData.code} ${opt.label}` : "未選";
    },
    checkAnswer() {
      if (this.answered) return;
      if (!this.selected) {
        this.message = "先點選一個三角形，再送出答案喔！";
        return;
      }
      const isCorrect = this.selected === this.gameData.answer;
      this.$emit("add-record", [
        this.describe(this.gameData.answer),
        this.describe(this.selected),
        isCorrect ? "正確" : "錯誤",
      ]);
      if (isCorrect) {
        this.answered = true;
        this.message = "";
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
      } else {
        this.wrongId = this.selected;
        this.selected = null;
        this.showHint = true;
        this.message = "";
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
  align-items: stretch;
  gap: 1rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small;
}

.board {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.options {
  display: flex;
  gap: 2rem;

  &--3 {
    gap: 1.2rem;
  }
}

.option {
  width: 18rem;
  height: 13.5rem;
  padding: 0.4rem;
  background-color: #ffffff;
  border: 4px solid #b0bec5;
  border-radius: 18px;
  box-shadow: 0 4px 0 #90a4ae;
  cursor: pointer;

  .options--3 & {
    width: 15rem;
    height: 11.25rem;
  }

  &__svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  &--selected {
    border-color: #ffb300;
    background-color: #fff8e1;
    box-shadow: 0 0 0 6px #ffe082;
  }

  &--wrong {
    border-color: #e53935;
    box-shadow: 0 0 0 6px #ffcdd2;
  }

  &--correct {
    border-color: #43a047;
    background-color: #e8f5e9;
  }
}

.composite {
  width: 100%;
  height: 100%;
  max-width: 40rem;
  max-height: 27rem;

  // 透明點選區疊在圖上：平常看不出來，選取或答錯時加框和淡色
  &__piece {
    fill: transparent;
    stroke: transparent;
    stroke-width: 3;
    stroke-linejoin: round;
    cursor: pointer;
    outline: none;

    &:hover,
    &:focus-visible {
      fill: rgba(30, 136, 229, 0.12);
      stroke: #1e88e5;
      stroke-width: 6;
    }

    &--selected {
      fill: rgba(255, 179, 0, 0.25) !important;
      stroke: #ffb300 !important;
      stroke-width: 10 !important;
    }

    &--wrong {
      fill: rgba(229, 57, 53, 0.2) !important;
      stroke: #e53935 !important;
      stroke-width: 10 !important;
    }

    &--correct {
      fill: rgba(67, 160, 71, 0.2) !important;
      stroke: #43a047 !important;
      stroke-width: 10 !important;
    }
  }
}

.side {
  width: 14rem;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1rem;
  min-height: 0;
  overflow-y: auto;
}

.info {
  padding: 0.8rem 1rem;
  background-color: #ffffff;
  border: 3px solid #ffcc80;
  border-radius: 14px;

  p {
    margin: 0;
  }

  &__main {
    font-size: 1.3rem;
    font-weight: $font-bold;
  }

  &__sub {
    margin-top: 0.2rem !important;
    font-size: 1.05rem;
    color: #6d4c41;
  }

  &__feedback {
    margin-top: 0.5rem !important;
    font-size: 1.15rem;
    font-weight: $font-bold;
    color: #c62828;
  }

  &__hint {
    margin-top: 0.5rem !important;
    padding: 0.4rem 0.5rem;
    font-size: 1.05rem;
    font-weight: $font-bold;
    line-height: 1.45;
    color: #5d4037;
    background-color: #fffde7;
    border: 2px dashed #ffb300;
    border-radius: 10px;
  }
}

.tools {
  padding: 0.7rem;
  text-align: center;
  background-color: #fff8e1;
  border: 3px solid #ffb74d;
  border-radius: 14px;

  &__title {
    margin: 0 0 0.4rem;
    font-size: 1.3rem;
    font-weight: $font-bold;
  }

  &__buttons {
    display: flex;
    justify-content: center;
    gap: 0.4rem;
  }
}

.tool {
  min-width: 3.4rem;
  height: 3rem;
  font-size: 1.15rem;
  font-weight: $font-bold;
  white-space: nowrap;
  color: #ffffff;
  background-color: #ffa726;
  border: none;
  border-radius: 12px;
  cursor: pointer;

  &--reset {
    background-color: #90a4ae;
  }

  &--toggle {
    width: 100%;
    margin-bottom: 0.5rem;
    background-color: #29b6f6;
  }
}

@media (max-width: 1100px) {
  .options {
    gap: 1rem;

    &--3 {
      gap: 0.6rem;
    }
  }

  .option {
    width: 14rem;
    height: 10.5rem;

    .options--3 & {
      width: 11rem;
      height: 8.25rem;
    }
  }

  .side {
    width: 12rem;
    gap: 0.5rem;
  }

  .tools {
    padding: 0.5rem;
  }

  .tool--toggle {
    margin-bottom: 0.35rem;
  }

  .info {
    padding: 0.6rem 0.7rem;

    &__main {
      font-size: 1.15rem;
    }

    &__feedback,
    &__hint {
      font-size: 1rem;
    }

    &__hint {
      padding: 0.3rem 0.4rem;
      line-height: 1.35;
    }
  }

  .tool {
    min-width: 3rem;
    height: 2.6rem;
    padding: 0 0.3rem;
    font-size: 1.05rem;
  }
}
</style>

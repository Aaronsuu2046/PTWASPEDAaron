<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <p v-if="gameData.stem" class="stem-text">{{ gameData.stem }}</p>
      <p class="question-text">{{ gameData.question }}</p>

      <!-- 關卡 1、2：正式插圖的基準數字表與三張碎片圖；
           基準表直的（關卡 1）時碎片排在右邊，橫的（關卡 2）時碎片排在下面 -->
      <div
        v-if="isFragment"
        class="board"
        :class="tallBase ? 'board--side' : 'board--stack'"
      >
        <div class="board__picture">
          <svg
            class="picture"
            :viewBox="gameData.imageView.view.join(' ')"
            role="img"
            :aria-label="baseAlt"
          >
            <image
              :href="imageOf(gameData.image)"
              :width="gameData.imageView.size[0]"
              :height="gameData.imageView.size[1]"
            />
          </svg>
        </div>
        <div class="fragment-list">
          <button
            v-for="option in gameData.options"
            :key="option.label"
            type="button"
            class="fragment-card"
            :class="{
              'fragment-card--selected': selected === option.label,
              'fragment-card--wrong': wrong && selected === option.label,
            }"
            :data-option="option.image"
            :aria-label="describe(option)"
            @click="select(option.label)"
          >
            <!-- 選項只顯示碎片圖；label（ㄅ、ㄆ、ㄇ）只當內部答案代號，不顯示 -->
            <svg
              class="fragment-card__img"
              :viewBox="option.imageView.view.join(' ')"
              aria-hidden="true"
            >
              <image
                :href="imageOf(option.image)"
                :width="option.imageView.size[0]"
                :height="option.imageView.size[1]"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- 關卡 3～5：正式插圖（月曆、高鐵座位表、客運座位表）在左，文字選項在右 -->
      <div v-else class="board board--side">
        <div class="board__picture">
          <svg
            class="picture"
            :viewBox="gameData.imageView.view.join(' ')"
            role="img"
            :aria-label="PICTURE_ALT[gameData.type] || ''"
          >
            <image
              :href="imageOf(gameData.image)"
              :width="gameData.imageView.size[0]"
              :height="gameData.imageView.size[1]"
            />
          </svg>
        </div>
        <div class="option-group">
          <button
            v-for="option in gameData.options"
            :key="option.label"
            type="button"
            :class="{
              'button--onclick': selected === option.label,
              'option--wrong': wrong && selected === option.label,
            }"
            @click="select(option.label)"
          >
            <span class="option-text">{{ option.text }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import { getGameAssets } from "@/lib/get-assets.js";

// 螢幕閱讀用的圖片說明（不含答案）
const PICTURE_ALT = {
  calendar: "4 月的月曆，只看得到前兩週的日期，其他被墨水遮住",
  hsr: "高鐵座位表，左邊是 E、D，走道右邊是 C、B、A",
  bus: "客運座位表，左邊兩排、走道右邊一排，座位號碼依序排列",
};

// 數字排列的規律：題圖與碎片圖都用正式插圖（src/assets/games/MA4172）
// 題目 { code, type, image, imageView, question, options: [{ label, image?, imageView?, cells?, text? }], answer }
// imageView { size: 原圖寬高, view: 去掉四周空白後要顯示的範圍 }：用 SVG viewBox 等比例顯示，不切到內容
export default {
  name: "MA4172",
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      PICTURE_ALT,
      selected: "",
      wrong: false,
      answered: false,
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "觀察數字排列的規律回答問題";
    },
    isFragment() {
      return this.gameData.type === "fragment";
    },
    // 基準表列數比欄數多（關卡 1）就是直的
    tallBase() {
      const { rows, cols } = this.gameData.base || {};
      return rows > cols;
    },
    baseAlt() {
      const { rows, cols, maxShown } = this.gameData.base || {};
      return `${rows} 列 ${cols} 欄的數字表，從 1 寫到 ${maxShown}`;
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    imageOf(name) {
      return getGameAssets("MA4172", name);
    },
    // 紀錄與螢幕閱讀用選項的實際內容（文字選項的文字；碎片寫出上面看得到的數字）
    describe(option) {
      if (!option) return "未作答";
      if (option.text) return option.text;
      const shown = (option.cells || [])
        .map(([, , value]) => value)
        .filter((value) => value !== null);
      // 不同碎片可能寫著一樣的數字（差在排列位置），所以加上是第幾張
      const index = this.gameData.options.indexOf(option) + 1;
      return `第 ${index} 張碎片（寫著 ${shown.join("、")}）`;
    },
    optionOf(label) {
      return this.gameData.options.find((o) => o.label === label);
    },
    select(label) {
      this.selected = label;
      this.wrong = false;
    },
    checkAnswer() {
      if (this.answered) return;
      const isCorrect = this.selected === this.gameData.answer;
      this.wrong = !isCorrect;
      this.$emit("add-record", [
        `${this.gameData.question} ${this.describe(this.optionOf(this.gameData.answer))}`,
        this.selected ? this.describe(this.optionOf(this.selected)) : "未作答",
        isCorrect ? "正確" : "錯誤",
      ]);
      if (isCorrect) {
        this.answered = true;
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
      } else {
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
  gap: 0.5rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small;
}

.stem-text {
  margin: 0;
  font-size: 1.2rem;
  color: #444444;
}

.question-text {
  margin: 0;
  font-size: 1.6rem;
  font-weight: $font-bold;
  text-align: center;
}

// 題圖區：插圖等比例完整顯示（object-fit: contain），選項排在旁邊或下面
.board {
  flex: 1;
  min-height: 0;
  width: 100%;
  display: flex;
  gap: 1rem;

  &--side {
    flex-direction: row;
    align-items: stretch;
  }

  &--stack {
    flex-direction: column;
  }

  &__picture {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.4rem;
    background-color: #ffffff;
    border-radius: 14px;
  }
}

// SVG 預設 preserveAspectRatio="xMidYMid meet"：等比例縮放、完整顯示
.picture {
  width: 100%;
  height: 100%;
  user-select: none;
}

.fragment-list {
  display: flex;
  gap: 0.8rem;

  .board--side & {
    flex: 0 0 44%;
    flex-direction: column;
    justify-content: center;
  }

  .board--stack & {
    flex: 0 0 42%;
    min-height: 0;
    justify-content: center;
  }
}

.fragment-card {
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.4rem;
  background-color: #ffffff;
  border: 4px solid #bdbdbd;
  border-radius: 12px;
  cursor: pointer;

  .board--stack & {
    flex: 0 1 12rem;
  }

  &__img {
    width: 100%;
    height: 100%;
    pointer-events: none;
    user-select: none;
  }

  &--selected {
    border-color: #1e88e5;
    background-color: #e3f2fd;
  }

  &--wrong {
    border-color: #e53935;
    background-color: #ffebee;
  }
}

.option-group {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1.2rem;

  button {
    @extend .button-basic;
    border: none;
    min-width: 9rem;
    padding: 0.6rem 1.2rem;
    font-size: 26px;
    background-color: $primary-btn-bg;
  }
}

.option-text {
  white-space: nowrap;
}

.button--onclick {
  background-color: $primary-btn-hover-bg !important;
  scale: 1.03;
}

.option--wrong {
  outline: 3px solid #e53935;
}

@media (max-width: 1100px) {
  .question-text {
    font-size: 1.35rem;
  }

  .option-group button {
    min-width: 7.5rem;
    font-size: 22px;
  }
}
</style>

<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <!-- 左側：鈔票 / 硬幣圖片 -->
      <div class="money-area">
        <transition name="fade" mode="out-in">
          <!-- 關卡一答對後：顯示等值的萬元券 -->
          <div v-if="showSuccessImage" key="success" class="success-display">
            <img :src="getImgSrc('10000')" alt="10000元" class="success-img" />
            <p class="success-text">十張一千元 ＝ 一張萬元券！</p>
          </div>

          <!-- 一般顯示：各面額圖片 -->
          <div v-else key="bills" class="bills-display">
            <template v-for="denom in denomOrder" :key="denom">
              <div v-if="gameData.bills[denom]" class="denom-row">
                <img
                  v-for="n in gameData.bills[denom]"
                  :key="n"
                  :src="getImgSrc(denom)"
                  :alt="denom + '元'"
                  :class="['money-img', sizeClass(denom)]"
                />
              </div>
            </template>
          </div>
        </transition>
      </div>

      <!-- 右側：定位板 -->
      <div class="board-area">
        <p class="board-label">定位板</p>
        <!-- 記下學生點過哪幾格，紀錄裡才分得出「沒動過」的格子 -->
        <div class="board-wrap" @click="onBoardClick">
          <NumberBoard
            ref="board"
            :component-config="boardConfig"
            @reply-answer="onBoardReply"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import NumberBoard from "@/components/NumberBoard.vue";
import { getGameAssets } from "@/lib/get-assets.js";
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";

const FILE_EXT = {
  1: "png",
  5: "png",
  10: "png",
  50: "png",
  100: "png",
  500: "jpg",
  1000: "jpg",
  10000: "png",
};

export default {
  name: "MA4011",
  components: { NumberBoard },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, required: true },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      gameIntroText: "",
      boardConfig: {},
      boardReply: false,
      showSuccessImage: false,
      answered: false,
      touched: [],
      attempt: 0,
      denomOrder: ["10000", "1000", "500", "100", "50", "10", "5", "1"],
    };
  },
  created() {
    // 優先使用傳入的 introText prop，其次嘗試從 gameConfig 獲取
    if (this.introText?.Content) {
      this.gameIntroText = this.introText.Content;
    } else if (this.gameConfig?.IntroText?.Content) {
      this.gameIntroText = this.gameConfig.IntroText.Content;
    }
    this.boardConfig = {
      Unit: ["萬", "千", "百", "十", "個"],
      Number: this.gameData.answer,
      isInput: true,
    };
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    getImgSrc(denom) {
      const ext = FILE_EXT[String(denom)] || "png";
      return getGameAssets("MA4011", `${denom}.${ext}`);
    },
    sizeClass(denom) {
      const n = parseInt(denom);
      if (n >= 1000) return "bill-large";
      if (n >= 100) return "bill-medium";
      return "bill-small";
    },
    onBoardReply(reply) {
      this.boardReply = reply;
    },
    onBoardClick(event) {
      const cell = event.target.closest?.(".number-board__cell--clickable");
      if (cell) this.touched[cell.cellIndex] = true;
    },
    // 答題紀錄：每一格帶位值，例如「萬3 千0 百2 十0 個0」；學生沒點過的格子標「未作答」
    describeBills() {
      const order = ["10000", "1000", "500", "100", "50", "10", "5", "1"];
      return order
        .filter((d) => this.gameData.bills[d])
        .map((d) => `${d}元×${this.gameData.bills[d]}`)
        .join("、");
    },
    expectedText() {
      const units = this.boardConfig.Unit;
      const digits = String(this.gameData.answer)
        .padStart(units.length, "0")
        .split("");
      const cells = units.map((u, i) => `${u}${digits[i]}`).join(" ");
      return `${this.gameData.answer}（${cells}）`;
    },
    givenText() {
      const units = this.boardConfig.Unit;
      const numbers = this.$refs.board?.numbers || [];
      const cells = units
        .map((u, i) => {
          const d = String(numbers[i] ?? "").trim();
          return this.touched[i] ? `${u}${d}` : `${u}${d}（未作答）`;
        })
        .join(" ");
      const value = numbers
        .join("")
        .trim()
        .replace(/^0+(?=\d)/, "");
      return `${value}（${cells}）`;
    },
    record(ok) {
      this.attempt += 1;
      this.$emit("add-record", [
        `${this.describeBills()}，共多少元？正確答案 ${this.expectedText()}`,
        `第 ${this.attempt} 次作答：${this.givenText()}`,
        ok ? "正確" : "錯誤",
      ]);
    },
    checkAnswer() {
      if (this.answered) return;
      if (this.boardReply) {
        this.answered = true;
        this.$emit("play-effect", "CorrectSound");
        this.record(true);
        if (this.gameData.successImage) {
          this.showSuccessImage = true;
          setTimeout(() => this.$emit("next-question"), 5000);
        } else {
          this.$emit("next-question");
        }
      } else {
        this.$emit("play-effect", "WrongSound");
        this.record(false);
        emitter.emit("checkAnswer");
      }
    },
  },
};
</script>

<style scoped lang="scss">
// 只用來接點擊事件，不影響定位板原本的版面
.board-wrap {
  display: contents;
}

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
  display: flex;
  flex: 1;
  gap: $gap--small;
  min-height: 0;
  overflow: hidden;
}

/* ── 左側：鈔票區 ── */
.money-area {
  flex: 6;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small;
  overflow-y: auto;

  .bills-display {
    display: flex;
    flex-direction: column;
    gap: $gap--tiny;

    .denom-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
    }
  }

  .money-img {
    object-fit: contain;
    border-radius: 4px;

    &.bill-large {
      height: 80px;
    }
    &.bill-medium {
      height: 55px;
    }
    &.bill-small {
      height: 38px;
    }
  }

  .success-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: $gap--small;

    .success-img {
      max-height: 45%;
      max-width: 80%;
      object-fit: contain;
    }

    .success-text {
      font-size: $text-large;
      font-weight: $font-bold;
      color: $highlight-color;
    }
  }
}

/* ── 右側：定位板區 ── */
.board-area {
  flex: 4;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $gap--small;

  .board-label {
    font-size: $text-medium;
    font-weight: $font-bold;
    margin: 0;
  }
}

/* 淡入淡出 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

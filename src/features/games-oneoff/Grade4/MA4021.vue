<template>
  <div class="outer-container">
    <div class="title">
      <p>用直式算算看</p>
    </div>

    <div class="game-area">
      <!-- 關卡一：左側顯示對應數量的千元券 -->
      <transition name="fade">
        <div v-if="gameData.billCount" class="money-area">
          <img
            v-for="n in gameData.billCount"
            :key="n"
            :src="billImgSrc"
            alt="1000元"
            class="bill-img"
          />
        </div>
      </transition>

      <!-- 直式乘法計算板 -->
      <div class="board-area" :class="{ 'board-area--full': !gameData.billCount }">
        <p class="question-label">
          {{ gameData.operand1 }} × {{ gameData.operand2 }} = ________
        </p>
        <CalculationBoard
          :component-config="boardConfig"
          @reply-answer="onReply"
        />
      </div>
    </div>
  </div>
</template>

<script>
import CalculationBoard from "@/components/CalculationBoard.vue";
import { getGameAssets } from "@/lib/get-assets.js";
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";

export default {
  name: "MA4021",
  components: { CalculationBoard },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, required: true },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      boardReply: false,
      answered: false,
    };
  },
  computed: {
    boardConfig() {
      return {
        type: "multiply",
        mode: "checkAnswer",
        unitType: "Number",
        operands: {
          operand1: this.gameData.operand1,
          operand2: this.gameData.operand2,
        },
      };
    },
    billImgSrc() {
      return getGameAssets("MA4021", "1000.jpg");
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    onReply(isCorrect) {
      this.boardReply = isCorrect;
    },
    checkAnswer() {
      if (this.answered) return;
      if (this.boardReply) {
        this.answered = true;
        this.$emit("play-effect", "CorrectSound");
        this.$emit("add-record", ["不支援", "不支援", "正確"]);
        this.$emit("next-question");
      } else {
        this.$emit("play-effect", "WrongSound");
        this.$emit("add-record", ["不支援", "不支援", "錯誤"]);
        emitter.emit("checkAnswer");
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
  display: flex;
  flex: 1;
  gap: $gap--small;
  min-height: 0;
  overflow: hidden;
}

/* ── 左側：千元券圖片區 ── */
.money-area {
  flex: 5;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 8px;
  overflow-y: auto;

  .bill-img {
    height: 70px;
    object-fit: contain;
    border-radius: 4px;
  }
}

/* ── 右側：計算板區 ── */
.board-area {
  flex: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  .question-label {
    font-size: $text-large;
    font-weight: $font-bold;
    margin: 0 0 $gap--small 0;
    letter-spacing: 0.05em;
  }

  &--full {
    flex: 1;

    :deep(.Board__container) {
      max-width: 560px;
      margin: 0 auto;
    }
  }
}

/* 淡入淡出 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

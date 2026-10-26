<template>
  <div
    v-if="visible"
    class="calculator-tool-overlay"
    :class="{ 'calculator-tool-overlay--passthrough': activeTab === 'kidcalc' }"
  >
    <div class="tool-container">
      <!-- 功能內容區域 -->
      <div class="content-area">
        <!-- 浮動計算板 -->
        <div v-if="activeTab === 'calculator'" class="calculator-panel">
          <FloatingCalculator
            :visible="showFloatingCalculator"
            @close="closeFloatingCalculator"
            @calculator-result="handleCalculatorResult"
          />
        </div>

        <!-- 計算機（四年級以上）：浮在右邊，開著時仍可以點題目的答案格；
             只用來算，不會代填答案。用 v-show 保留算到一半的內容 -->
        <div
          v-if="hasKidCalculator"
          v-show="activeTab === 'kidcalc'"
          class="kid-calc-panel"
        >
          <div class="kid-calc-panel__head">
            <span>算好再自己填到答案格</span>
            <button
              type="button"
              class="kid-calc-panel__close"
              @click="activeTab = 'none'"
            >
              收起計算機
            </button>
          </div>
          <KidCalculator backspace />
        </div>

        <!-- 計算紙 -->
        <div v-if="activeTab === 'scratch'" class="scratch-panel">
          <ScratchSheets
            ref="scratchSheet"
            :background-image="scratchBackground"
            @close-sheet="closeScratch"
            @save-canvas="saveScratchCanvas"
          />
        </div>

        <!-- 九九乘法表 -->
        <div v-if="activeTab === 'multiplication'" class="multiplication-panel">
          <MultiplicationTable />
        </div>

        <!-- 空狀態 -->
        <div v-if="activeTab === 'none'" class="empty-panel">
          <div class="empty-message">
            <h3>計算工具</h3>
            <p>請選擇要使用的功能</p>
            <div class="function-buttons">
              <button class="function-btn" @click="switchToCalculator">
                計算板
              </button>
              <button
                v-if="hasKidCalculator"
                class="function-btn"
                @click="activeTab = 'kidcalc'"
              >
                計算機
              </button>
              <button class="function-btn" @click="activeTab = 'scratch'">
                畫筆
              </button>
              <button
                class="function-btn"
                @click="activeTab = 'multiplication'"
              >
                九九乘法表
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 控制面板 -->
      <div class="control-panel">
        <div class="panel-header">
          <h3>計算工具</h3>
        </div>

        <div class="tool-options">
          <div class="option-container">
            <div class="btn-title">功能選擇</div>
            <div class="tool-option">
              <button
                class="tool-btn"
                :class="{ active: activeTab === 'calculator' }"
                @click="switchToCalculator"
              >
                計算板
              </button>
              <button
                v-if="hasKidCalculator"
                class="tool-btn"
                :class="{ active: activeTab === 'kidcalc' }"
                @click="activeTab = 'kidcalc'"
              >
                計算機
              </button>
              <button
                class="tool-btn"
                :class="{ active: activeTab === 'scratch' }"
                @click="activeTab = 'scratch'"
              >
                畫筆
              </button>
              <button
                class="tool-btn"
                :class="{ active: activeTab === 'multiplication' }"
                @click="activeTab = 'multiplication'"
              >
                九九乘法表
              </button>
            </div>
          </div>
        </div>

        <div class="operation-option">
          <button class="exit-btn" @click="closeTool">關閉</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import FloatingCalculator from "./FloatingCalculator.vue";
import ScratchSheets from "./ScratchSheets.vue";
import MultiplicationTable from "./MultiplicationTable.vue";
import KidCalculator from "@/features/games-oneoff/Grade4/games/CalculatorQuestion/KidCalculator.vue";

// 四年級以上才有「計算機」（計算板仍保留給所有年級）
const KID_CALCULATOR_MIN_GRADE = 4;

export default {
  name: "CalculatorTool",
  components: {
    FloatingCalculator,
    ScratchSheets,
    MultiplicationTable,
    KidCalculator,
  },
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    // 遊戲路由的年級；4 以上顯示「計算機」，沒傳就不顯示
    grade: {
      type: Number,
      default: 0,
    },
  },
  emits: ["close", "saveCanvas"],
  data() {
    return {
      activeTab: "none",
      showFloatingCalculator: false,
      scratchBackground: null,
    };
  },
  computed: {
    hasKidCalculator() {
      return this.grade >= KID_CALCULATOR_MIN_GRADE;
    },
  },
  watch: {
    activeTab(newTab) {
      // 當切換到計算板時，自動顯示浮動計算板
      if (newTab === "calculator") {
        this.showFloatingCalculator = true;
      } else {
        this.showFloatingCalculator = false;
      }
    },
  },
  methods: {
    closeTool() {
      this.$emit("close");
    },
    switchToCalculator() {
      this.activeTab = "calculator";
      this.showFloatingCalculator = true;
    },
    closeFloatingCalculator() {
      this.showFloatingCalculator = false;
      console.log("浮動計算板已關閉");
    },
    closeScratch() {
      this.$emit("close");
    },
    saveScratchCanvas(canvasImage) {
      this.scratchBackground = canvasImage;
      this.$emit("saveCanvas", canvasImage);
    },
    handleCalculatorResult(result) {
      console.log("計算結果:", result);
    },
    // GamePlayPage 換關時透過 ref 呼叫
    // eslint-disable-next-line vue/no-unused-properties
    clearDrawing() {
      this.scratchBackground = null;
      this.$refs.scratchSheet?.clearCanvas();
    },
  },
};
</script>

<style lang="scss" scoped>
.calculator-tool-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

// 計算機開著時，除了計算機和右邊的工具列，其他地方點得到底下的題目
.calculator-tool-overlay--passthrough {
  pointer-events: none;

  .kid-calc-panel,
  .control-panel {
    pointer-events: auto;
  }
}

.kid-calc-panel {
  align-self: stretch;
  margin: 1rem 1rem 1rem auto;
  width: 20rem;
  max-width: 45%;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.5rem;
  background-color: #fffde7;
  border-radius: 20px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    font-size: 1.1rem;
    font-weight: bold;
    color: #5d4037;
  }

  &__close {
    padding: 0.3rem 0.8rem;
    font-size: 1rem;
    font-weight: bold;
    color: #ffffff;
    background-color: #fb8c00;
    border: none;
    border-radius: 10px;
  }

  :deep(.kid-calc) {
    flex: 1;
    min-height: 0;
  }
}

.tool-container {
  height: 100vh;
  width: 100vw;
  display: flex;
  background-color: rgba(0, 0, 0, 0);
  border: none;
  box-shadow: none;
  justify-content: center;
  align-items: center;
}

.content-area {
  width: 85%;
  height: 90%;
  align-self: end;
  display: flex;
  justify-content: center;
  align-items: center;
}

.calculator-panel,
.scratch-panel,
.multiplication-panel,
.empty-panel {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.control-panel {
  background-color: #d5dfe4;
  height: 90%;
  align-self: end;
  width: 15%;
  margin-top: 5%;
  display: flex;
  flex-direction: column;
}

.panel-header {
  width: 100%;
  height: 40px;
  background-color: #a5adb1;
  text-align: center;
  align-content: center;
  font-weight: bold;
  font-size: larger;
  display: flex;
  align-items: center;
  justify-content: center;

  h3 {
    margin: 0;
    color: #495057;
    font-size: 1.2rem;
  }
}

.tool-options {
  flex: 1;
  padding: 10px;
}

.option-container {
  margin-bottom: 20px;
}

.btn-title {
  width: 100%;
  height: 30px;
  background-color: #a5adb1;
  text-align: center;
  align-content: center;
  font-weight: bold;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
  color: #495057;
}

.tool-option {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tool-btn {
  width: 100%;
  height: 50px;
  background-color: #687174;
  color: #ffffff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s;

  &:hover {
    background-color: #494f52;
  }

  &.active {
    background-color: #007bff;
  }
}

.operation-option {
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 10px;
}

.exit-btn {
  width: 60%;
  height: 50px;
  background-color: #a5adb1;
  color: #495057;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s;

  &:hover {
    background-color: #687174;
  }
}

button {
  border: none;
}

.scratch-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.scratch-canvas {
  border: 2px solid #a5adb1;
  background: white;
  cursor: crosshair;
  max-width: 90%;
  max-height: 80%;
}

.scratch-controls {
  display: flex;
  gap: 10px;
}

.scratch-controls button {
  padding: 8px 16px;
  background-color: #a5adb1;
  color: #495057;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s;
}

.scratch-controls button:hover {
  background-color: #687174;
}

.empty-message {
  text-align: center;
  color: #6c757d;
  background-color: #f4c49f;
  border: 2px solid #e8a870;
  border-radius: 20px;
  padding: 2rem 2.5rem;

  h3 {
    margin-bottom: 10px;
    font-size: 1.5rem;
  }

  p {
    font-size: 1rem;
    margin: 0 0 20px 0;
  }

  .function-buttons {
    display: flex;
    flex-direction: column;
    gap: 15px;
    align-items: center;

    .function-btn {
      width: 200px;
      height: 60px;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1.1rem;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background-color: #0056b3;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      }

      &:active {
        transform: translateY(0);
      }
    }
  }
}
</style>

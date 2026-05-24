<template>
  <div :class="$attrs.class">
    <div ref="container" class="fraction-for-answer">
      <span v-if="componentConfig.prefix" class="prefix">{{
        componentConfig.prefix
      }}</span>
      <div class="fraction-container">
        <input
          ref="numerator"
          class="fraction-input numerator"
          type="text"
          @click="showNumPad('numerator', $event)"
        />
        <span class="line"></span>
        <input
          ref="denominator"
          class="fraction-input denominator"
          type="text"
          @click="showNumPad('denominator', $event)"
        />
      </div>
      <span v-if="componentConfig.suffix" class="suffix">{{
        componentConfig.suffix
      }}</span>
    </div>
    <FloatNumPad
      v-if="virtualNumpadSwitch"
      :component-config="numPadPosition"
      @button-clicked="numPadButtonClicked"
    />
  </div>
</template>

<script>
import { defineAsyncComponent } from "vue";

export default {
  name: "FractionForAnswer",
  components: {
    FloatNumPad: defineAsyncComponent(
      () => import("@/components/FloatNumPad.vue")
    ),
  },
  props: {
    componentConfig: {
      type: Object,
      required: true,
    },
  },
  emits: ["recordAnswer", "replyAnswer"],
  data() {
    return {
      virtualNumpadSwitch: false,
      numPadPosition: {
        top: 0,
        left: 0,
      },
      activeInputRef: "",
      // 定義常數
      numPadOffset: 10, // 虛擬鍵盤與目標輸入框的間距
    };
  },
  methods: {
    showNumPad(inputRef, event) {
      const inputRect = event.target.getBoundingClientRect();

      this.activeInputRef = inputRef;

      this.numPadPosition = {
        top: `${inputRect.top + window.scrollY}px`,
        left: `${inputRect.right + window.scrollX + this.numPadOffset}px`,
      };

      this.virtualNumpadSwitch = true;
    },
    numPadButtonClicked(label) {
      switch (label) {
        case "清除":
          this.clearActiveInput();
          break;
        case "關閉":
          this.closeNumPad();
          break;
        default:
          this.updateInputValue(label);
          this.validateAnswer();
          break;
      }
    },
    validateAnswer() {
      const userNumerator = parseInt(this.$refs.numerator.value, 10);
      const userDenominator = parseInt(this.$refs.denominator.value, 10);

      // 檢查是否有輸入值和分母不為0
      if (
        isNaN(userNumerator) ||
        isNaN(userDenominator) ||
        userDenominator === 0
      ) {
        this.$emit("replyAnswer", false);
        return;
      }

      // 計算實際的小數值來比較
      const correctValue =
        this.componentConfig.numerator / this.componentConfig.denominator;
      const userValue = userNumerator / userDenominator;

      const isCorrect = correctValue === userValue;

      const correctAnswer = `${this.componentConfig.numerator}/${this.componentConfig.denominator}`;
      const userAnswer = `${userNumerator}/${userDenominator}`;

      this.$emit("replyAnswer", isCorrect);
      this.$emit("recordAnswer", [
        correctAnswer,
        userAnswer,
        isCorrect ? "正確" : "錯誤",
      ]);
    },
    closeNumPad() {
      this.virtualNumpadSwitch = false;
    },
    clearActiveInput() {
      if (this.activeInputRef) {
        this.$refs[this.activeInputRef].value = "";
      }
    },
    updateInputValue(label) {
      if (this.activeInputRef) {
        const input = this.$refs[this.activeInputRef];
        input.value += label;
      }
    },
  },
};
</script>

<style scoped>
.fraction-for-answer {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin: 0 auto;
}

.fraction-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
}

.fraction-input {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80%;
  text-align: center;
  font-size: 1.5rem;
}

.line {
  display: block;
  border-top: 0.2rem solid black;
  width: 100%;
  margin: 2px 0;
}

.prefix,
.suffix {
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  align-items: center;
  white-space: nowrap;
}
</style>

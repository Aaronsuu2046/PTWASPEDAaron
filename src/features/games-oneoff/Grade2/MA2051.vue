<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <p class="question">{{ gameData.question }}</p>
      <p v-if="hintText" class="tip">
        {{ hintText }}<span class="tip__how">（拖過去，或點食物再點嘴巴）</span>
      </p>

      <div class="main">
        <!-- 左：河馬，頭上的數字由 0 開始，吃一份就加一份的數量 -->
        <div class="feeder" data-pad-avoid @click="feedSelected">
          <HungryHippo :count="eaten" :over="overMouth" />
        </div>

        <!-- 右上：還沒吃的食物，一份一個拖曳物件 -->
        <div class="tray" data-pad-avoid>
          <button
            v-for="p in portions"
            :key="p"
            type="button"
            class="portion"
            :class="{
              'portion--selected': selected === p,
              'portion--dragging': drag && drag.moved && drag.id === p,
            }"
            :data-portion="p"
            :aria-label="`第 ${p} 份食物`"
            :disabled="answered"
            @pointerdown="startDrag($event, p)"
            @pointermove="onDrag"
            @pointerup="endDrag"
            @pointercancel="drag = null"
            @click="toggleSelect(p)"
          >
            <FoodPortion :kind="gameData.kind" />
          </button>
          <p v-if="!portions.length" class="tray__empty">食物都吃完了！</p>
        </div>
      </div>

      <!-- 算式：關卡 1、2 只有連加；3～5 再加「幾的幾倍」 -->
      <div class="work">
        <div class="work__row">
          <template v-for="i in gameData.count" :key="i">
            <span class="num">{{ gameData.per }}</span>
            <span v-if="i < gameData.count" class="sign">＋</span>
          </template>
          <span class="sign">＝</span>
          <button v-bind="box('total')" @click="activate($event, 'total')">
            {{ values.total }}
          </button>
        </div>
        <div v-if="hasTimes" class="work__row work__row--times">
          <span
            >{{ gameData.per }} 有 {{ gameData.count }} 個，可以說是「{{
              gameData.per
            }}
            的</span
          >
          <button v-bind="box('times')" @click="activate($event, 'times')">
            {{ values.times }}
          </button>
          <span>倍」</span>
        </div>
      </div>

      <p v-if="feedback" class="feedback" :class="{ 'feedback--ok': answered }">
        {{ feedback }}
      </p>

      <FieldPad
        :field="active && !answered ? activeEl : null"
        @press="press"
        @close="closePad"
      />
    </div>

    <!-- 拖曳中的食物跟著手指走 -->
    <div
      v-if="drag && drag.moved"
      class="drag-ghost"
      :style="{ left: `${drag.x}px`, top: `${drag.y}px` }"
    >
      <FoodPortion :kind="gameData.kind" />
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import FieldPad from "../Grade4/games/Common/FieldPad.vue";
import FoodPortion from "./components/FoodPortion.vue";
import HungryHippo from "./components/HungryHippo.vue";

const DRAG_THRESHOLD = 8;
const MAX_LENGTH = 2;

// 「倍」的問題－河馬的「倍數」饗宴
// 題目 { code, question, kind, per（每份量）, count（份數）, unit, total, times? }
// 餵河馬只是數數輔助：拖進嘴巴（或點食物再點河馬）才吃掉一份、頭上數字加 per，放到別處就退回；
// 送出時檢查連加的和，有 times 的關卡再檢查「per 的 □ 倍」
export default {
  name: "MA2051",
  components: { FieldPad, FoodPortion, HungryHippo },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    const hasTimes = this.gameData.times !== undefined;
    return {
      hasTimes,
      portions: Array.from({ length: this.gameData.count }, (_, i) => i + 1),
      eaten: 0,
      selected: null,
      drag: null,
      overMouth: false,
      values: hasTimes ? { total: "", times: "" } : { total: "" },
      active: null,
      activeEl: null,
      wrongKeys: [],
      feedback: "",
      answered: false,
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "試試看用連加算式，算一算";
    },
    hintText() {
      return this.gameConfig?.Hint || "";
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    // ── 餵食 ──
    feed(id) {
      if (!this.portions.includes(id)) return;
      this.portions = this.portions.filter((p) => p !== id);
      this.eaten += this.gameData.per;
      if (this.selected === id) this.selected = null;
    },
    toggleSelect(id) {
      if (this.answered) return;
      if (this.suppressClick) {
        this.suppressClick = false;
        return;
      }
      this.selected = this.selected === id ? null : id;
    },
    // 點河馬：只有點到嘴巴才吃掉選好的那份
    feedSelected(event) {
      if (!this.selected || this.answered) return;
      if (!event.target.closest?.("[data-zone='mouth']")) return;
      this.feed(this.selected);
    },
    startDrag(event, id) {
      if (this.answered) return;
      if (event.button !== undefined && event.button !== 0) return;
      this.suppressClick = false;
      this.drag = {
        id,
        startX: event.clientX,
        startY: event.clientY,
        x: event.clientX,
        y: event.clientY,
        moved: false,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    isOverMouth(event) {
      const el = document.elementFromPoint(event.clientX, event.clientY);
      return !!el?.closest?.("[data-zone='mouth']");
    },
    onDrag(event) {
      if (!this.drag) return;
      this.drag.x = event.clientX;
      this.drag.y = event.clientY;
      if (
        !this.drag.moved &&
        Math.hypot(
          event.clientX - this.drag.startX,
          event.clientY - this.drag.startY
        ) > DRAG_THRESHOLD
      )
        this.drag.moved = true;
      if (this.drag.moved) this.overMouth = this.isOverMouth(event);
    },
    endDrag(event) {
      if (!this.drag) return;
      if (this.drag.moved) {
        this.suppressClick = true;
        // 放在嘴巴才吃掉；其他地方就退回原位
        if (this.isOverMouth(event)) this.feed(this.drag.id);
      }
      this.drag = null;
      this.overMouth = false;
    },

    // ── 填答 ──
    box(key) {
      return {
        type: "button",
        class: [
          "box",
          {
            "box--active": !this.answered && this.active === key,
            "box--wrong": this.wrongKeys.includes(key),
            "box--correct": this.answered,
          },
        ],
        "data-key": key,
        "data-pad-field": "",
        "aria-label": key === "total" ? "連加的答案" : "幾倍",
      };
    },
    activate(event, key) {
      if (this.answered) return;
      this.active = key;
      this.activeEl = event.currentTarget;
    },
    closePad() {
      this.active = null;
      this.activeEl = null;
    },
    press(key) {
      if (this.answered || !this.active) return;
      const k = this.active;
      const current = this.values[k];
      let next = current;
      if (key === "clear") next = "";
      else if (key === "←") next = current.slice(0, -1);
      else if (/^\d$/.test(key) && current.length < MAX_LENGTH)
        next = current === "0" ? key : current + key;
      this.values = { ...this.values, [k]: next };
      this.wrongKeys = this.wrongKeys.filter((w) => w !== k);
      this.feedback = "";
    },
    expression(total, times) {
      const { per, count } = this.gameData;
      const sum = `${Array(count).fill(per).join("+")}=${total}`;
      return this.hasTimes ? `${sum}；${per}的${times}倍` : sum;
    },
    checkAnswer() {
      if (this.answered) return;
      const empty = Object.keys(this.values).filter(
        (k) => this.values[k] === ""
      );
      if (empty.length) {
        this.wrongKeys = empty;
        this.feedback = "格子都要填喔！";
        return;
      }
      const { code, question, total, times } = this.gameData;
      const wrong = [];
      if (Number(this.values.total) !== total) wrong.push("total");
      if (this.hasTimes && Number(this.values.times) !== times)
        wrong.push("times");
      this.wrongKeys = wrong;
      const isCorrect = wrong.length === 0;
      this.$emit("add-record", [
        `${code} ${question} ${this.expression(total, times)}`,
        this.expression(this.values.total || "_", this.values.times || "_"),
        isCorrect ? "正確" : "錯誤",
      ]);
      if (isCorrect) {
        this.answered = true;
        this.feedback = "答對了！";
        this.closePad();
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
      } else {
        this.feedback = wrong.includes("total")
          ? "紅色的格子不對，餵餵看河馬，看看頭上的數字！"
          : "紅色的格子不對，數一數有幾份？";
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
  padding: $padding--small $padding--medium;
}

.question {
  margin: 0;
  font-size: 1.8rem;
  font-weight: $font-bold;
  color: #3e2723;
  text-align: center;
}

.tip {
  margin: -0.2rem 0 0;
  font-size: 1.1rem;
  font-weight: $font-bold;
  color: #6d4c41;
  text-align: center;

  &__how {
    font-weight: normal;
    color: #8d6e63;
  }
}

.main {
  flex: 1;
  min-height: 0;
  width: 100%;
  display: flex;
  gap: 1rem;
}

.feeder {
  flex: 0 0 15rem;
  min-height: 0;
  padding: 0.4rem;
  background-color: #e3f2fd;
  border: 3px solid #90caf9;
  border-radius: 18px;
}

.tray {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 0.6rem;
  background-color: #fffde7;
  border: 3px dashed #ffcc80;
  border-radius: 18px;

  &__empty {
    margin: 0;
    font-size: 1.4rem;
    font-weight: $font-bold;
    color: #8d6e63;
  }
}

.portion {
  width: 8.2rem;
  height: 6.8rem;
  padding: 0.2rem;
  background-color: #ffffff;
  border: 3px solid #ffe0b2;
  border-radius: 14px;
  cursor: grab;
  touch-action: none;
  transition: transform 0.12s;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  &--selected {
    border-color: #1e88e5;
    box-shadow: 0 0 0 4px #90caf9;
  }

  &--dragging {
    opacity: 0.3;
  }
}

.work {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 1.4rem;
  background-color: #ffffff;
  border-radius: 16px;
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.1);

  &__row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    font-size: 2rem;
    font-weight: $font-bold;
    color: #0d47a1;

    &--times {
      font-size: 1.6rem;
      color: #4e342e;
    }
  }
}

.sign {
  color: #333333;
}

.box {
  min-width: 4rem;
  height: 3.2rem;
  padding: 0 0.4rem;
  font-size: 2rem;
  font-weight: $font-bold;
  color: #1565c0;
  background-color: #ffffff;
  border: 3px dashed #90a4ae;
  border-radius: 10px;
  cursor: pointer;

  &--active {
    border-style: solid;
    border-color: #1e88e5;
    box-shadow: 0 0 0 3px #90caf9;
  }

  &--wrong {
    border-style: solid;
    border-color: #e53935;
    background-color: #ffebee;
  }

  &--correct {
    border-style: solid;
    border-color: #43a047;
    background-color: #e8f5e9;
    color: #2e7d32;
  }
}

.feedback {
  margin: 0;
  padding: 0.2rem 1rem;
  font-size: 1.3rem;
  font-weight: $font-bold;
  color: #c62828;
  background-color: #fff8e1;
  border-radius: 12px;

  &--ok {
    color: #2e7d32;
    background-color: #e8f5e9;
  }
}

.drag-ghost {
  position: fixed;
  z-index: 1000;
  width: 8.2rem;
  height: 6.8rem;
  transform: translate(-50%, -50%) scale(1.05);
  pointer-events: none;
}

@media (max-width: 1100px), (max-height: 760px) {
  .question {
    font-size: 1.4rem;
  }

  .tip {
    font-size: 1rem;
  }

  .feeder {
    flex-basis: 12.5rem;
  }

  .portion,
  .drag-ghost {
    width: 7rem;
    height: 5.8rem;
  }

  .work__row {
    font-size: 1.7rem;

    &--times {
      font-size: 1.4rem;
    }
  }

  .box {
    height: 2.8rem;
    font-size: 1.7rem;
  }
}
</style>

<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <!-- 正式題圖；空格位置疊一個放置區，放入的選項圖畫在空格裡 -->
      <div class="picture">
        <svg
          class="picture__svg"
          :viewBox="gameData.area.join(' ')"
          role="img"
          :aria-label="`規律圖形，第 ${blankRow + 1} 列第 ${blankCol + 1} 格是空格`"
        >
          <image
            :href="imageOf(gameData.image)"
            :width="gameData.size[0]"
            :height="gameData.size[1]"
          />
          <g
            class="slot"
            :class="{
              'slot--hover': overBlank,
              'slot--wrong': wrong,
              'slot--filled': placedOption,
            }"
            data-blank
          >
            <rect
              :x="slot.x"
              :y="slot.y"
              :width="slot.w"
              :height="slot.h"
              class="slot__bg"
            />
            <svg
              v-if="placedOption"
              :x="slot.x"
              :y="slot.y"
              :width="slot.w"
              :height="slot.h"
              :viewBox="placedOption.view.join(' ')"
              preserveAspectRatio="none"
            >
              <image
                :href="imageOf(placedOption.image)"
                :width="placedOption.size[0]"
                :height="placedOption.size[1]"
              />
            </svg>
            <rect
              :x="slot.x"
              :y="slot.y"
              :width="slot.w"
              :height="slot.h"
              class="slot__frame"
            />
          </g>
        </svg>
      </div>

      <!-- 選項：點一下或拖曳到空格都可以放入 -->
      <div class="option-area">
        <p class="option-hint">點選或拖曳圖形放入空格</p>
        <div class="option-list">
          <button
            v-for="(option, index) in options"
            :key="option.key"
            type="button"
            class="option-tile"
            :class="{ 'option-tile--selected': selected === option.key }"
            :data-option="option.key"
            :aria-label="`選項 ${index + 1}`"
            @click="onOptionClick(option.key)"
            @pointerdown="startDrag($event, option.key)"
            @pointermove="onDrag"
            @pointerup="endDrag"
            @pointercancel="cancelDrag"
          >
            <svg class="option-tile__svg" :viewBox="option.view.join(' ')">
              <image
                :href="imageOf(option.image)"
                :width="option.size[0]"
                :height="option.size[1]"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 拖曳中跟著手指／滑鼠移動的圖塊 -->
    <div
      v-if="drag && drag.moved"
      class="option-tile drag-ghost"
      :style="{ left: `${drag.x}px`, top: `${drag.y}px` }"
    >
      <svg
        class="option-tile__svg"
        :viewBox="optionOf(drag.key).view.join(' ')"
      >
        <image
          :href="imageOf(optionOf(drag.key).image)"
          :width="optionOf(drag.key).size[0]"
          :height="optionOf(drag.key).size[1]"
        />
      </svg>
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import { getGameAssets } from "@/lib/get-assets.js";

// 移動超過這個距離（px）才算拖曳，否則視為點選
const DRAG_THRESHOLD = 8;

function shuffle(list) {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 觀察圖形規律填空：正式題圖（src/assets/games/MA4171/關卡-題號.png）的方格中有一格空白，
// 從四張選項圖（關卡-A～D.png）選一張放進去
// 題目 { code, image, size, area: 方格範圍 [x, y, 寬, 高], grid: [列, 欄], blank: [列, 欄],
//        options: [{ key, image, size, view }], answer: 選項 key }
export default {
  name: "MA4171",
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      // 選項順序每次洗牌；判定與紀錄都用選項 key（對應檔名 A～D），不受順序影響
      options: shuffle(this.gameData.options),
      selected: null,
      wrong: false,
      answered: false,
      drag: null,
      overBlank: false,
      suppressClick: false,
    };
  },
  computed: {
    gameIntroText() {
      return (
        this.introText?.Content || "觀察圖形的規律，在空格處放入正確的答案"
      );
    },
    blankRow() {
      return this.gameData.blank[0];
    },
    blankCol() {
      return this.gameData.blank[1];
    },
    // 空格在原圖上的位置（與 viewBox 同一座標）
    slot() {
      const [x, y, w, h] = this.gameData.area;
      const [rows, cols] = this.gameData.grid;
      const cw = w / cols;
      const ch = h / rows;
      return {
        x: x + this.blankCol * cw,
        y: y + this.blankRow * ch,
        w: cw,
        h: ch,
      };
    },
    placedOption() {
      return this.selected ? this.optionOf(this.selected) : null;
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
      return getGameAssets("MA4171", name);
    },
    optionOf(key) {
      return this.gameData.options.find((o) => o.key === key);
    },
    select(key) {
      this.selected = key;
      this.wrong = false;
    },
    onOptionClick(key) {
      // 拖曳結束時瀏覽器仍會送出 click，略過這一次
      if (this.suppressClick) {
        this.suppressClick = false;
        return;
      }
      this.select(key);
    },
    startDrag(event, key) {
      if (event.button !== undefined && event.button !== 0) return;
      this.suppressClick = false;
      this.drag = {
        key,
        startX: event.clientX,
        startY: event.clientY,
        x: event.clientX,
        y: event.clientY,
        moved: false,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
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
      ) {
        this.drag.moved = true;
      }
      if (this.drag.moved) this.overBlank = this.isOverBlank(event);
    },
    endDrag(event) {
      if (!this.drag) return;
      if (this.drag.moved) {
        this.suppressClick = true;
        if (this.isOverBlank(event)) this.select(this.drag.key);
      }
      this.cancelDrag();
    },
    cancelDrag() {
      this.drag = null;
      this.overBlank = false;
    },
    isOverBlank(event) {
      const target = document.elementFromPoint(event.clientX, event.clientY);
      return !!target?.closest("[data-blank]");
    },
    checkAnswer() {
      if (this.answered) return;
      const isCorrect = this.selected === this.gameData.answer;
      this.wrong = !isCorrect;
      const where = `${this.gameData.code} 第 ${this.blankRow + 1} 列第 ${this.blankCol + 1} 格`;
      this.$emit("add-record", [
        `${where}：選項 ${this.gameData.answer}`,
        this.selected ? `選項 ${this.selected}` : "未作答",
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
  gap: 0.8rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small;
}

// 題圖等比例完整顯示（SVG 預設 xMidYMid meet）
.picture {
  flex: 1;
  min-height: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  &__svg {
    width: 100%;
    height: 100%;
  }
}

.slot {
  &__bg {
    fill: #ffffff;
  }

  &__frame {
    fill: none;
    stroke: #fb8c00;
    stroke-width: 6;
    stroke-dasharray: 14 8;
  }

  &--filled &__frame {
    stroke: #1e88e5;
    stroke-dasharray: none;
  }

  &--hover &__frame {
    stroke: #43a047;
    stroke-width: 9;
    stroke-dasharray: none;
  }

  &--wrong &__frame {
    stroke: #e53935;
    stroke-width: 9;
    stroke-dasharray: none;
  }
}

.option-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
}

.option-hint {
  margin: 0;
  font-size: 1.2rem;
  font-weight: $font-bold;
  color: #5d4037;
}

.option-list {
  display: flex;
  gap: 1.4rem;
}

.option-tile {
  width: 6.5rem;
  height: 6.5rem;
  padding: 0.35rem;
  background-color: #ffffff;
  border: 4px solid #bdbdbd;
  border-radius: 12px;
  cursor: grab;
  touch-action: none;
  user-select: none;

  &__svg {
    width: 100%;
    height: 100%;
    display: block;
    pointer-events: none;
  }

  &--selected {
    border-color: #1e88e5;
    box-shadow: 0 0 0 4px #90caf9;
  }
}

.drag-ghost {
  position: fixed;
  z-index: 1000;
  transform: translate(-50%, -50%);
  pointer-events: none;
  opacity: 0.85;
}

@media (max-width: 1100px) {
  .option-tile {
    width: 5.5rem;
    height: 5.5rem;
  }
}
</style>

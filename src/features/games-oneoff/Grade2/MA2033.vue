<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <p class="question">{{ gameData.question }}</p>

      <div class="scene-wrap">
        <svg
          ref="svg"
          class="scene"
          :viewBox="`0 0 1000 ${height}`"
          role="img"
          :aria-label="gameData.question"
          @pointermove="onDrag"
          @pointerup="endDrag"
          @pointercancel="endDrag"
        >
          <!-- 橫尺（關卡 1、2、4、5）：0～15 公分 -->
          <template v-if="!vertical">
            <g
              :class="{ draggable: canDrag }"
              data-drag="object"
              data-object
              @pointerdown="canDrag && startDrag($event, 'object')"
            >
              <g :transform="`translate(${X0 + start * CM}, ${OBJ_Y})`">
                <ObjectShape
                  :shape="obj.shape"
                  :w="obj.length * CM"
                  :color="obj.color"
                  :cm="CM"
                />
              </g>
            </g>
            <line
              v-for="(c, k) in [start, start + obj.length]"
              :key="`g${k}`"
              :x1="X0 + c * CM"
              :y1="OBJ_Y - 6"
              :x2="X0 + c * CM"
              :y2="RULER_Y"
              class="guide"
              :data-guide="k"
            />
            <g
              :transform="`translate(${rulerOff * CM}, 0)`"
              :class="{ draggable: canDrag }"
              data-ruler
              @pointerdown="canDrag && startDrag($event, 'ruler')"
            >
              <rect
                :x="X0 - 18"
                :y="RULER_Y"
                :width="15 * CM + 36"
                height="74"
                rx="8"
                class="ruler"
              />
              <template v-for="n in 31" :key="`t${n}`">
                <line
                  :x1="X0 + ((n - 1) * CM) / 2"
                  :y1="RULER_Y"
                  :x2="X0 + ((n - 1) * CM) / 2"
                  :y2="RULER_Y + (n % 2 ? 26 : 14)"
                  class="ruler__tick"
                  :data-tick="n % 2 ? (n - 1) / 2 : null"
                />
                <text
                  v-if="n % 2"
                  :x="X0 + ((n - 1) * CM) / 2"
                  :y="RULER_Y + 54"
                  class="ruler__num"
                >
                  {{ (n - 1) / 2 }}
                </text>
              </template>
            </g>
          </template>

          <!-- 直尺（關卡 3）：0～10 公分，0 在下面；物件立在右邊 -->
          <template v-else>
            <g
              :class="{ draggable: canDrag }"
              data-drag="object"
              data-object
              @pointerdown="canDrag && startDrag($event, 'object')"
            >
              <g
                :transform="`translate(${VX_OBJ}, ${VY0 - start * VCM}) rotate(-90)`"
              >
                <ObjectShape
                  :shape="obj.shape"
                  :w="obj.length * VCM"
                  :color="obj.color"
                  :cm="VCM"
                />
              </g>
            </g>
            <line
              v-for="(c, k) in [start, start + obj.length]"
              :key="`g${k}`"
              :x1="VX_RULER"
              :y1="VY0 - c * VCM"
              :x2="VX_OBJ + 50"
              :y2="VY0 - c * VCM"
              class="guide"
              :data-guide="k"
            />
            <line
              :x1="VX_RULER - 90"
              :y1="VY0"
              :x2="VX_OBJ + 160"
              :y2="VY0"
              class="ground"
            />
            <g
              :transform="`translate(0, ${-rulerOff * VCM})`"
              :class="{ draggable: canDrag }"
              data-ruler
              @pointerdown="canDrag && startDrag($event, 'ruler')"
            >
              <rect
                :x="VX_RULER - 80"
                :y="VY0 - 10 * VCM - 16"
                width="80"
                :height="10 * VCM + 32"
                rx="8"
                class="ruler"
              />
              <template v-for="n in 21" :key="`v${n}`">
                <line
                  :x1="VX_RULER"
                  :y1="VY0 - ((n - 1) * VCM) / 2"
                  :x2="VX_RULER - (n % 2 ? 26 : 14)"
                  :y2="VY0 - ((n - 1) * VCM) / 2"
                  class="ruler__tick"
                  :data-tick="n % 2 ? (n - 1) / 2 : null"
                />
                <text
                  v-if="n % 2"
                  :x="VX_RULER - 52"
                  :y="VY0 - ((n - 1) * VCM) / 2 + 8"
                  class="ruler__num"
                >
                  {{ (n - 1) / 2 }}
                </text>
              </template>
            </g>
          </template>
        </svg>
      </div>

      <p class="answer" data-pad-avoid>
        {{ obj.name }}{{ vertical ? "高" : "長" }}（<button
          type="button"
          class="answer__box"
          :class="{
            'answer__box--active': padOpen && !answered,
            'answer__box--wrong': wrong,
            'answer__box--correct': answered,
          }"
          data-input="0"
          data-pad-field
          :aria-label="`${obj.name}的公分數`"
          @click="openPad"
        >
          {{ value }}</button
        >）公分
      </p>

      <p v-if="feedback" class="feedback" :class="{ 'feedback--ok': answered }">
        {{ feedback }}
      </p>

      <FieldPad
        :field="padOpen && !answered ? padEl : null"
        @press="press"
        @close="padOpen = false"
      />
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import FieldPad from "../Grade4/games/Common/FieldPad.vue";
import ObjectShape from "./components/MeasureObject.js";

// 橫尺：1 公分＝CM 單位，尺的 0 在 X0
const CM = 56;
const X0 = 70;
const OBJ_Y = 60;
const RULER_Y = 128;
// 直尺：1 公分＝VCM 單位，0 在 VY0，尺的刻度邊在 VX_RULER，物件立在 VX_OBJ
const VCM = 40;
const VY0 = 440;
const VX_RULER = 400;
const VX_OBJ = 560;

// 量長度－精準測量師
// 題目 { code, question, vertical?, draggable?, object: { name, shape, color, length, start }, answer }
// 關卡 1～3 物件和尺都可以拖（以 1 公分對齊）；關卡 4 固定在非零起點，要用刻度差
export default {
  name: "MA2033",
  components: { FieldPad, ObjectShape },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      CM,
      X0,
      OBJ_Y,
      RULER_Y,
      VCM,
      VY0,
      VX_RULER,
      VX_OBJ,
      start: this.gameData.object.start,
      rulerOff: 0,
      drag: null,
      value: "",
      padOpen: false,
      padEl: null,
      wrong: false,
      answered: false,
      feedback: "",
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "用尺量量看，當個精準測量師！";
    },
    obj() {
      return this.gameData.object;
    },
    vertical() {
      return !!this.gameData.vertical;
    },
    canDrag() {
      return !!this.gameData.draggable && !this.answered;
    },
    rulerMax() {
      return this.vertical ? 10 : 15;
    },
    height() {
      return this.vertical ? VY0 + 40 : RULER_Y + 84;
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    toSvg(event) {
      const svg = this.$refs.svg;
      const pt = svg.createSVGPoint();
      pt.x = event.clientX;
      pt.y = event.clientY;
      return pt.matrixTransform(svg.getScreenCTM().inverse());
    },
    startDrag(event, key) {
      if (!this.canDrag) return;
      if (event.button !== undefined && event.button !== 0) return;
      const p = this.toSvg(event);
      this.drag = {
        key,
        p0: this.vertical ? -p.y : p.x,
        from: key === "ruler" ? this.rulerOff : this.start,
      };
      this.$refs.svg.setPointerCapture?.(event.pointerId);
    },
    // 拖動以 1 公分為單位；尺最多左右（上下）移 2 公分，物件不會跑出尺的範圍
    onDrag(event) {
      if (!this.drag) return;
      const p = this.toSvg(event);
      const unit = this.vertical ? VCM : CM;
      const d = Math.round(
        ((this.vertical ? -p.y : p.x) - this.drag.p0) / unit
      );
      if (this.drag.key === "ruler") {
        this.rulerOff = Math.max(-2, Math.min(2, this.drag.from + d));
        return;
      }
      this.start = Math.max(
        0,
        Math.min(this.rulerMax - this.obj.length, this.drag.from + d)
      );
    },
    endDrag() {
      this.drag = null;
    },
    openPad(event) {
      if (this.answered) return;
      this.padEl = event.currentTarget;
      this.padOpen = true;
    },
    press(key) {
      if (this.answered) return;
      this.wrong = false;
      this.feedback = "";
      if (key === "clear") this.value = "";
      else if (key === "←") this.value = this.value.slice(0, -1);
      else if (/^\d$/.test(key) && this.value.length < 2)
        this.value = this.value === "0" ? key : this.value + key;
    },
    checkAnswer() {
      if (this.answered) return;
      const q = this.gameData;
      if (this.value === "") {
        this.wrong = true;
        this.feedback = "（　）裡還沒填喔！";
        return;
      }
      const isCorrect = Number(this.value) === q.answer;
      const what = `${this.obj.name}${this.vertical ? "高" : "長"}`;
      this.$emit("add-record", [
        `${q.code} ${what} ${q.answer} 公分`,
        `${this.value} 公分`,
        isCorrect ? "正確" : "錯誤",
      ]);
      this.padOpen = false;
      if (isCorrect) {
        this.answered = true;
        this.wrong = false;
        this.feedback = "答對了！";
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
        return;
      }
      this.wrong = true;
      this.feedback = q.draggable
        ? "再量一次：把尺的 0 對齊物件的一端，再看另一端對到幾公分。"
        : "再量一次：物件沒有從 0 開始，要用後面的刻度減前面的刻度。";
      this.$emit("play-effect", "WrongSound");
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
  text-align: center;
  font-size: 1.5rem;
  font-weight: $font-bold;
  color: #4e342e;
}

.scene-wrap {
  flex: 1;
  min-height: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.4rem;
  background-color: #ffffff;
  border-radius: 18px;
}

.scene {
  width: 100%;
  height: 100%;
  touch-action: none;
}

.draggable {
  cursor: grab;
}

.guide {
  stroke: #e65100;
  stroke-width: 2.5;
  stroke-dasharray: 7 5;
}

.ground {
  stroke: #8d6e63;
  stroke-width: 4;
}

.ruler {
  fill: #fff59d;
  stroke: #f9a825;
  stroke-width: 3;

  &__tick {
    stroke: #3e2723;
    stroke-width: 2.5;
  }

  &__num {
    font-size: 22px;
    font-weight: bold;
    text-anchor: middle;
    fill: #3e2723;
  }
}

.answer {
  margin: 0;
  font-size: 1.6rem;
  font-weight: $font-bold;
  line-height: 2.2;
  color: #4e342e;

  &__box {
    display: inline-block;
    min-width: 3.6rem;
    height: 3rem;
    vertical-align: middle;
    font-size: 1.9rem;
    font-weight: $font-bold;
    line-height: 1;
    color: #0d47a1;
    background-color: #fffde7;
    border: 4px dashed #fb8c00;
    border-radius: 12px;
    cursor: pointer;

    &--active {
      border-style: solid;
      border-color: #1e88e5;
      box-shadow: 0 0 0 4px #90caf9;
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
    }
  }
}

.feedback {
  margin: 0;
  padding: 0.2rem 1rem;
  font-size: 1.2rem;
  font-weight: $font-bold;
  color: #c62828;
  background-color: #fff8e1;
  border-radius: 12px;

  &--ok {
    color: #2e7d32;
    background-color: #e8f5e9;
  }
}

@media (max-width: 1100px) {
  .question {
    font-size: 1.25rem;
  }

  .answer {
    font-size: 1.35rem;
  }
}
</style>

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
          :viewBox="`0 0 1000 ${RULER_Y + 84}`"
          role="img"
          :aria-label="gameData.question"
          @pointermove="onDrag"
          @pointerup="endDrag"
          @pointercancel="endDrag"
        >
          <!-- 兩個物件：和尺同一個公分比例，可以拖（以 1 公分對齊） -->
          <g
            v-for="(obj, i) in gameData.objects"
            :key="obj.name"
            class="draggable"
            :data-object="i"
            @pointerdown="startDrag($event, i)"
          >
            <text :x="X0 + starts[i] * CM" :y="laneY(i) - 6" class="label">
              {{ obj.name }}
            </text>
            <g :transform="`translate(${X0 + starts[i] * CM}, ${laneY(i)})`">
              <ObjectShape
                :shape="obj.shape"
                :w="obj.length * CM"
                :color="obj.color"
                :cm="CM"
              />
            </g>
            <line
              v-for="(c, k) in [starts[i], starts[i] + obj.length]"
              :key="`g${k}`"
              :x1="X0 + c * CM"
              :y1="laneY(i) + 2"
              :x2="X0 + c * CM"
              :y2="RULER_Y"
              class="guide"
              :data-guide="`${i}-${k}`"
            />
          </g>

          <!-- 尺：0～15 公分，有公分、半公分與毫米刻度 -->
          <g
            :transform="`translate(${rulerOff * CM}, 0)`"
            class="draggable"
            data-ruler
            @pointerdown="startDrag($event, 'ruler')"
          >
            <rect
              :x="X0 - 18"
              :y="RULER_Y"
              :width="15 * CM + 36"
              height="74"
              rx="8"
              class="ruler"
            />
            <line
              v-for="n in 151"
              :key="`t${n}`"
              :x1="X0 + ((n - 1) * CM) / 10"
              :y1="RULER_Y"
              :x2="X0 + ((n - 1) * CM) / 10"
              :y2="RULER_Y + tickLen(n - 1)"
              class="ruler__tick"
              :class="{ 'ruler__tick--mm': (n - 1) % 5 }"
              :data-tick="(n - 1) % 10 ? null : (n - 1) / 10"
            />
            <text
              v-for="c in 16"
              :key="`n${c}`"
              :x="X0 + (c - 1) * CM"
              :y="RULER_Y + 56"
              class="ruler__num"
            >
              {{ c - 1 }}
            </text>
          </g>
        </svg>
      </div>

      <div class="option-group">
        <button
          v-for="opt in options"
          :key="opt"
          type="button"
          :class="{
            'button--onclick': choice === opt,
            'option--wrong': wrong && choice === opt,
            'option--correct': answered && choice === opt,
          }"
          :data-option="opt"
          @click="pick(opt)"
        >
          {{ opt }}
        </button>
      </div>

      <p v-if="feedback" class="feedback" :class="{ 'feedback--ok': answered }">
        {{ feedback }}
      </p>
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import ObjectShape from "./components/MeasureObject.js";

const CM = 56;
const X0 = 70;
const LANE_H = 74;
const RULER_Y = 34 + 2 * LANE_H;

function shuffle(list) {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 量長度－長度估算師：兩個物件與尺（都可以拖），選出剛好或最接近指定長度的物件
// 題目 { code, question, target, mode: "exact"|"near", objects: [{ name, shape, color, length, start }], answer: 物件名稱 }
// 選項左右每次洗牌，判定用物件名稱
export default {
  name: "MA2034",
  components: { ObjectShape },
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
      RULER_Y,
      starts: this.gameData.objects.map((o) => o.start),
      rulerOff: 0,
      drag: null,
      options: shuffle(this.gameData.objects.map((o) => o.name)),
      choice: null,
      wrong: false,
      answered: false,
      feedback: "",
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "量量看，找出符合長度的物品。";
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    laneY(i) {
      return 34 + i * LANE_H;
    },
    // 公分刻度最長、半公分次之、毫米最短
    tickLen(mm) {
      if (mm % 10 === 0) return 28;
      if (mm % 5 === 0) return 18;
      return 10;
    },
    toSvgX(event) {
      const svg = this.$refs.svg;
      const pt = svg.createSVGPoint();
      pt.x = event.clientX;
      pt.y = event.clientY;
      return pt.matrixTransform(svg.getScreenCTM().inverse()).x;
    },
    startDrag(event, key) {
      if (this.answered) return;
      if (event.button !== undefined && event.button !== 0) return;
      this.drag = {
        key,
        x0: this.toSvgX(event),
        from: key === "ruler" ? this.rulerOff : this.starts[key],
      };
      this.$refs.svg.setPointerCapture?.(event.pointerId);
    },
    onDrag(event) {
      if (!this.drag) return;
      const d = Math.round((this.toSvgX(event) - this.drag.x0) / CM);
      if (this.drag.key === "ruler") {
        this.rulerOff = Math.max(-3, Math.min(3, this.drag.from + d));
        return;
      }
      const i = this.drag.key;
      const max = Math.floor(15 - this.gameData.objects[i].length);
      const next = Math.max(0, Math.min(max, this.drag.from + d));
      this.starts = this.starts.map((s, k) => (k === i ? next : s));
    },
    endDrag() {
      this.drag = null;
    },
    pick(opt) {
      if (this.answered) return;
      this.choice = opt;
      this.wrong = false;
      this.feedback = "";
    },
    checkAnswer() {
      if (this.answered) return;
      const q = this.gameData;
      if (!this.choice) {
        this.feedback = "先選一個答案喔！";
        return;
      }
      const isCorrect = this.choice === q.answer;
      const lens = q.objects
        .map((o) => `${o.name} ${o.length} 公分`)
        .join("、");
      this.$emit("add-record", [
        `${q.code} ${q.question}（${lens}）${q.answer}`,
        this.choice,
        isCorrect ? "正確" : "錯誤",
      ]);
      if (isCorrect) {
        this.answered = true;
        this.feedback = "答對了！";
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
        return;
      }
      this.wrong = true;
      this.feedback =
        q.mode === "near"
          ? `再量一次：兩個都量量看，哪一個和 ${q.target} 公分差得比較少？`
          : `再量一次：把尺的 0 對齊物品的一端，看看哪一個剛好是 ${q.target} 公分。`;
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
  font-size: 1.6rem;
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

.label {
  font-size: 20px;
  font-weight: bold;
  fill: #5d4037;
}

.guide {
  stroke: #e65100;
  stroke-width: 2.5;
  stroke-dasharray: 7 5;
}

.ruler {
  fill: #fff59d;
  stroke: #f9a825;
  stroke-width: 3;

  &__tick {
    stroke: #3e2723;
    stroke-width: 2.5;

    &--mm {
      stroke-width: 1.2;
    }
  }

  &__num {
    font-size: 22px;
    font-weight: bold;
    text-anchor: middle;
    fill: #3e2723;
  }
}

.option-group {
  display: flex;
  gap: 2rem;

  button {
    @extend .button-basic;
    border: none;
    min-width: 10rem;
    padding: 0.45rem 1.4rem;
    font-size: 1.5rem;
    font-weight: $font-bold;
    background-color: $primary-btn-bg;
  }
}

.button--onclick {
  background-color: $primary-btn-hover-bg !important;
  scale: 1.05;
}

.option--wrong {
  outline: 5px solid #e53935;
}

.option--correct {
  outline: 5px solid #43a047;
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
    font-size: 1.3rem;
  }

  .option-group button {
    font-size: 1.25rem;
  }
}
</style>

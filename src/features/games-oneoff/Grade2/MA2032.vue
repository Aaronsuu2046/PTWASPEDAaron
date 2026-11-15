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
          <!-- 物件：和尺用同一個公分比例（CM 單位／公分） -->
          <g
            v-for="(obj, i) in gameData.objects"
            :key="obj.name"
            :class="{ draggable: obj.draggable && !answered }"
            :data-object="i"
            :data-drag="obj.draggable ? `obj${i}` : null"
            @pointerdown="obj.draggable && startDrag($event, `obj${i}`)"
          >
            <!-- 名稱寫在物件左端的上方，不擋住物件 -->
            <text
              v-if="gameData.objects.length > 1"
              :x="xOf(starts[i])"
              :y="laneY(i) - 4"
              class="scene__label"
            >
              {{ obj.name }}
            </text>
            <g :transform="`translate(${xOf(starts[i])}, ${laneY(i)})`">
              <ObjectShape
                :shape="obj.shape"
                :w="obj.length * CM"
                :color="obj.color"
                :cm="CM"
              />
            </g>
            <!-- 左右兩端的輔助線，一直畫到尺上 -->
            <line
              v-for="(x, k) in [starts[i], starts[i] + obj.length]"
              :key="`g${k}`"
              :x1="xOf(x)"
              :y1="laneY(i) + 2"
              :x2="xOf(x)"
              :y2="rulerY"
              class="guide"
              :data-guide="`${i}-${k}`"
            />
          </g>

          <!-- 尺：0～15 公分，每 1 公分有數字、每半公分有短刻度 -->
          <g
            :transform="`translate(${rulerOff * CM}, 0)`"
            :class="{ draggable: gameData.rulerDraggable && !answered }"
            :data-drag="gameData.rulerDraggable ? 'ruler' : null"
            data-ruler
            @pointerdown="gameData.rulerDraggable && startDrag($event, 'ruler')"
          >
            <rect
              :x="X0 - 18"
              :y="rulerY"
              :width="15 * CM + 36"
              height="74"
              rx="8"
              class="ruler"
            />
            <template v-for="n in 31" :key="`t${n}`">
              <line
                :x1="X0 + ((n - 1) * CM) / 2"
                :y1="rulerY"
                :x2="X0 + ((n - 1) * CM) / 2"
                :y2="rulerY + (n % 2 ? 26 : 14)"
                class="ruler__tick"
                :data-tick="n % 2 ? (n - 1) / 2 : null"
              />
              <text
                v-if="n % 2"
                :x="X0 + ((n - 1) * CM) / 2"
                :y="rulerY + 54"
                class="ruler__num"
              >
                {{ (n - 1) / 2 }}
              </text>
            </template>
            <text :x="X0 + 15 * CM + 4" :y="rulerY + 54" class="ruler__unit">
              公分
            </text>
          </g>
        </svg>
      </div>

      <div class="answers" data-pad-avoid>
        <p
          v-for="(obj, i) in gameData.objects.slice(0, answerCount)"
          :key="obj.name"
          class="answers__line"
        >
          <span v-if="answerCount > 1">{{ obj.name }}：</span>（<button
            type="button"
            class="answers__box"
            :class="{
              'answers__box--active': active === i && !answered,
              'answers__box--wrong': wrongInputs.includes(i),
              'answers__box--correct': answered,
            }"
            :data-input="i"
            data-pad-field
            :aria-label="`${answerLabel(i)}長幾公分`"
            @click="activate($event, i)"
          >
            {{ values[i] ?? "" }}</button
          >）公分
        </p>
      </div>

      <p v-if="feedback" class="feedback" :class="{ 'feedback--ok': answered }">
        {{ feedback }}
      </p>

      <FieldPad
        :field="active !== null && !answered ? activeEl : null"
        @press="press"
        @close="active = null"
      />
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import FieldPad from "../Grade4/games/Common/FieldPad.vue";
import ObjectShape from "./components/MeasureObject.js";

const CM = 56;
const X0 = 70;
const LANE_H = 70;

// 認識公分－新手測量師：尺為 0～15 公分，物件和尺同一個比例，物件兩端有輔助線
// 題目 { code, mode: "fixed"|"drag"|"join", question, objects: [{ name, shape, color, start, length, draggable? }],
//        rulerDraggable?, answers: [各物件或總長的公分數] }
// mode=join：第二排貼紙可以拖到第一排後面接起來，只填一格（總長）；拖動只是輔助、不計分
export default {
  name: "MA2032",
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
      starts: this.gameData.objects.map((o) => o.start),
      rulerOff: 0,
      drag: null,
      values: {},
      active: null,
      activeEl: null,
      wrongInputs: [],
      answered: false,
      feedback: "",
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "用尺量量看，當個新手測量師！";
    },
    // join 題只問總長，只有一格
    answerCount() {
      return this.gameData.mode === "join" ? 1 : this.gameData.objects.length;
    },
    lanes() {
      return this.gameData.mode === "join" ? 2 : this.gameData.objects.length;
    },
    rulerY() {
      return 34 + this.lanes * LANE_H + 14;
    },
    height() {
      return this.rulerY + 84;
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    xOf(cm) {
      return X0 + cm * CM;
    },
    laneY(i) {
      // join 題兩排貼紙放在同一高度，接起來才看得出總長
      if (this.gameData.mode === "join") return 34 + LANE_H;
      return 34 + i * LANE_H;
    },
    answerLabel(i) {
      if (this.gameData.mode === "join") return "兩排貼紙接起來";
      return this.gameData.objects[i].name;
    },
    // SVG 座標（viewBox）
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
      const i = key.startsWith("obj") ? Number(key.slice(3)) : null;
      this.drag = {
        key,
        i,
        x0: this.toSvgX(event),
        from: i === null ? this.rulerOff : this.starts[i],
      };
      this.$refs.svg.setPointerCapture?.(event.pointerId);
    },
    // 拖動時以 1 公分為單位對齊刻度
    onDrag(event) {
      if (!this.drag) return;
      const d = Math.round((this.toSvgX(event) - this.drag.x0) / CM);
      if (this.drag.i === null) {
        this.rulerOff = Math.max(-1, Math.min(1, this.drag.from + d));
        return;
      }
      const obj = this.gameData.objects[this.drag.i];
      const next = Math.max(0, Math.min(15 - obj.length, this.drag.from + d));
      this.starts = this.starts.map((s, k) => (k === this.drag.i ? next : s));
    },
    endDrag() {
      this.drag = null;
    },
    activate(event, i) {
      if (this.answered) return;
      this.active = i;
      this.activeEl = event.currentTarget;
    },
    press(key) {
      if (this.answered || this.active === null) return;
      const i = this.active;
      const cur = this.values[i] || "";
      let next = cur;
      if (key === "clear") next = "";
      else if (key === "←") next = cur.slice(0, -1);
      else if (/^\d$/.test(key) && cur.length < 2)
        next = cur === "0" ? key : cur + key;
      this.values = { ...this.values, [i]: next };
      this.wrongInputs = this.wrongInputs.filter((k) => k !== i);
      this.feedback = "";
    },
    checkAnswer() {
      if (this.answered) return;
      const q = this.gameData;
      const idx = Array.from({ length: this.answerCount }, (_, i) => i);
      const empty = idx.filter((i) => !this.values[i]);
      if (empty.length) {
        this.wrongInputs = empty;
        this.feedback = "（　）裡還沒填喔！";
        return;
      }
      this.wrongInputs = idx.filter(
        (i) => Number(this.values[i]) !== q.answers[i]
      );
      const text = (pick) =>
        idx.map((i) => `${this.answerLabel(i)} ${pick(i)} 公分`).join("、");
      const isCorrect = this.wrongInputs.length === 0;
      this.$emit("add-record", [
        `${q.code} ${q.question} ${text((i) => q.answers[i])}`,
        text((i) => this.values[i]),
        isCorrect ? "正確" : "錯誤",
      ]);
      this.active = null;
      if (isCorrect) {
        this.answered = true;
        this.feedback = "答對了！";
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
        return;
      }
      this.feedback =
        q.mode === "fixed" && q.objects.some((o) => o.start > 0)
          ? "紅色的格子不對喔！沒有從 0 開始時，要用後面的刻度減前面的刻度。"
          : "紅色的格子不對喔！看看兩條輔助線分別對到尺上的幾公分。";
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

  &__label {
    font-size: 20px;
    font-weight: bold;
    fill: #5d4037;
  }
}

.draggable {
  cursor: grab;
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
  }

  &__num {
    font-size: 22px;
    font-weight: bold;
    text-anchor: middle;
    fill: #3e2723;
  }

  &__unit {
    font-size: 16px;
    fill: #5d4037;
  }
}

.answers {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.2rem 2rem;

  &__line {
    margin: 0;
    font-size: 1.6rem;
    font-weight: $font-bold;
    line-height: 2.2;
    color: #4e342e;
  }

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

  .answers__line {
    font-size: 1.35rem;
  }
}
</style>

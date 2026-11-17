<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <p class="question">{{ gameData.question }}</p>

      <!-- 算式：運算符號與答案由學生填 -->
      <p class="equation" data-pad-avoid>
        <span>{{ gameData.a }}</span>
        <button
          type="button"
          class="box box--op"
          :class="boxClass('op')"
          data-input="op"
          data-pad-field
          aria-label="運算符號"
          @click="activate($event, 'op')"
        >
          {{ OP_SHOW[values.op] || "" }}
        </button>
        <span>{{ gameData.b }}</span>
        <span>＝</span>
        <button
          type="button"
          class="box"
          :class="boxClass('ans')"
          data-input="ans"
          data-pad-field
          aria-label="答案"
          @click="activate($event, 'ans')"
        >
          {{ values.ans || "" }}
        </button>
        <span>公分</span>
      </p>

      <!-- 驗證用的圖與尺（只是輔助，不計分）：物件預設和尺的 0 對齊 -->
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
          <g
            v-for="piece in pieces"
            :key="piece.id"
            :class="{ draggable: piece.draggable && !answered }"
            :data-piece="piece.id"
            @pointerdown="piece.draggable && startDrag($event)"
          >
            <text
              :x="xOf(piece.start)"
              :y="laneY(piece.lane) - 6"
              class="label"
            >
              {{ piece.label }}
            </text>
            <g
              :transform="`translate(${xOf(piece.start)}, ${laneY(piece.lane)})`"
            >
              <ObjectShape
                :shape="piece.shape"
                :w="piece.length * CM"
                :color="piece.color"
                :cm="CM"
                :opacity="piece.faded ? 0.45 : 1"
              />
            </g>
            <line
              v-for="(c, k) in [piece.start, piece.start + piece.length]"
              :key="`g${k}`"
              :x1="xOf(c)"
              :y1="laneY(piece.lane) + 2"
              :x2="xOf(c)"
              :y2="RULER_Y"
              class="guide"
              :data-guide="`${piece.id}-${k}`"
            />
          </g>
          <!-- 剪刀線 -->
          <line
            v-if="gameData.type === 'cut' && !cut"
            :x1="xOf(gameData.a - gameData.b)"
            :y1="laneY(0) - 14"
            :x2="xOf(gameData.a - gameData.b)"
            :y2="laneY(0) + 54"
            class="cutline"
          />

          <g data-ruler>
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
        </svg>
      </div>

      <div class="tools">
        <button
          v-if="gameData.type === 'join'"
          type="button"
          class="tools__btn"
          data-action="join"
          :disabled="joined || answered"
          @click="join"
        >
          把{{ gameData.objects[1].name }}接上去
        </button>
        <button
          v-if="gameData.type === 'cut'"
          type="button"
          class="tools__btn"
          data-action="cut"
          :disabled="cut || answered"
          @click="cut = true"
        >
          ✂ 剪掉 {{ gameData.b }} 公分
        </button>
        <span v-if="gameData.type === 'compare'" class="tools__hint">
          兩樣東西都從 0 開始，看看差多少
        </span>
      </div>

      <p v-if="feedback" class="feedback" :class="{ 'feedback--ok': answered }">
        {{ feedback }}
      </p>

      <FieldPad
        :field="active && !answered ? activeEl : null"
        :kind="active === 'op' ? 'operator' : 'number'"
        :operators="['+', '-']"
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
const LANE_H = 74;
const RULER_Y = 34 + 2 * LANE_H;
const OP_SHOW = { "+": "＋", "-": "－" };

// 長度的加減－長度計算家：依題意填運算符號與答案，再用尺與圖驗證
// 題目 { code, type: "join"|"compare"|"cut", question, a, b, op, answer, objects: [{ name, shape, color, length }] }
// join：第二段可以拖（或按鈕）接到第一段後面；compare：兩樣都從 0 對齊；cut：按剪刀把後面一段剪下來
// 圖只是輔助，判定運算符號與答案兩格
export default {
  name: "MA2035",
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
      RULER_Y,
      OP_SHOW,
      // join 題第二段的起點（預設也從 0 對齊尺）
      bStart: 0,
      cut: false,
      drag: null,
      values: {},
      active: null,
      activeEl: null,
      wrongKeys: [],
      answered: false,
      feedback: "",
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "先算一算，再用尺和圖驗證看看。";
    },
    joined() {
      return this.bStart === this.gameData.a;
    },
    // 圖上要畫的每一段
    pieces() {
      const q = this.gameData;
      const [o1, o2] = q.objects;
      const piece = (id, o, start, lane, extra = {}) => ({
        id,
        label: o.name,
        shape: o.shape,
        color: o.color,
        length: o.length,
        start,
        lane,
        ...extra,
      });
      if (q.type === "join")
        return [
          piece("a", o1, 0, 0),
          piece("b", o2, this.bStart, this.joined ? 0 : 1, {
            draggable: true,
          }),
        ];
      if (q.type === "compare")
        return [piece("a", o1, 0, 0), piece("b", o2, 0, 1)];
      // cut：前面留下的一段與後面要剪掉的一段；剪下後移到下面一排
      const keep = q.a - q.b;
      return [
        piece("keep", { ...o1, length: keep }, 0, 0),
        piece(
          "cut",
          { ...o1, name: this.cut ? `剪下的 ${q.b} 公分` : "", length: q.b },
          keep,
          this.cut ? 1 : 0,
          { faded: this.cut }
        ),
      ];
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
    laneY(lane) {
      return 34 + lane * LANE_H;
    },
    join() {
      if (this.answered) return;
      this.bStart = this.gameData.a;
    },
    toSvgX(event) {
      const svg = this.$refs.svg;
      const pt = svg.createSVGPoint();
      pt.x = event.clientX;
      pt.y = event.clientY;
      return pt.matrixTransform(svg.getScreenCTM().inverse()).x;
    },
    startDrag(event) {
      if (this.answered) return;
      if (event.button !== undefined && event.button !== 0) return;
      this.drag = { x0: this.toSvgX(event), from: this.bStart };
      this.$refs.svg.setPointerCapture?.(event.pointerId);
    },
    // 第二段以 1 公分為單位左右拖，最遠接到第一段後面
    onDrag(event) {
      if (!this.drag) return;
      const d = Math.round((this.toSvgX(event) - this.drag.x0) / CM);
      const max = 15 - this.gameData.objects[1].length;
      this.bStart = Math.max(0, Math.min(max, this.drag.from + d));
    },
    endDrag() {
      this.drag = null;
    },
    boxClass(key) {
      return {
        "box--active": this.active === key && !this.answered,
        "box--wrong": this.wrongKeys.includes(key),
        "box--correct": this.answered,
      };
    },
    activate(event, key) {
      if (this.answered) return;
      this.active = key;
      this.activeEl = event.currentTarget;
    },
    press(key) {
      if (this.answered || !this.active) return;
      const k = this.active;
      const values = { ...this.values };
      if (k === "op") {
        if (key === "+" || key === "-") values.op = key;
        else if (key === "clear" || key === "←") delete values.op;
      } else {
        const cur = values.ans || "";
        if (key === "clear") values.ans = "";
        else if (key === "←") values.ans = cur.slice(0, -1);
        else if (/^\d$/.test(key) && cur.length < 2)
          values.ans = cur === "0" ? key : cur + key;
      }
      this.values = values;
      this.wrongKeys = this.wrongKeys.filter((w) => w !== k);
      this.feedback = "";
    },
    checkAnswer() {
      if (this.answered) return;
      const q = this.gameData;
      const empty = ["op", "ans"].filter((k) => !this.values[k]);
      if (empty.length) {
        this.wrongKeys = empty;
        this.feedback = "運算符號和答案都要填喔！";
        return;
      }
      this.wrongKeys = [];
      if (this.values.op !== q.op) this.wrongKeys.push("op");
      if (Number(this.values.ans) !== q.answer) this.wrongKeys.push("ans");
      const isCorrect = this.wrongKeys.length === 0;
      const eq = (op, ans) =>
        `${q.a}${OP_SHOW[op] || "_"}${q.b}＝${ans || "_"} 公分`;
      this.$emit("add-record", [
        `${q.code} ${q.question} ${eq(q.op, q.answer)}`,
        eq(this.values.op, this.values.ans),
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
      const tips = [];
      if (this.wrongKeys.includes("op"))
        tips.push("接起來用加法；比長短、剪掉用減法");
      if (this.wrongKeys.includes("ans"))
        tips.push("再算一次，也可以看圖量量看");
      this.feedback = `紅色的格子不對喔！${tips.join("；")}。`;
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
  gap: 0.45rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small $padding--medium;
}

.question {
  margin: 0;
  text-align: center;
  font-size: 1.45rem;
  font-weight: $font-bold;
  color: #4e342e;
}

.equation {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 2.2rem;
  font-weight: $font-bold;
  color: #0d47a1;
}

.box {
  min-width: 4rem;
  height: 3.4rem;
  font-size: 2.1rem;
  font-weight: $font-bold;
  color: #0d47a1;
  background-color: #fffde7;
  border: 4px dashed #fb8c00;
  border-radius: 12px;
  cursor: pointer;

  &--op {
    min-width: 3.4rem;
    color: #e65100;
  }

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

.scene-wrap {
  flex: 1;
  min-height: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.3rem;
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

.cutline {
  stroke: #d32f2f;
  stroke-width: 4;
  stroke-dasharray: 6 5;
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

.tools {
  min-height: 2.6rem;
  display: flex;
  align-items: center;
  gap: 1rem;

  &__btn {
    padding: 0.35rem 1.2rem;
    font-size: 1.2rem;
    font-weight: $font-bold;
    color: #ffffff;
    background-color: #8e24aa;
    border: none;
    border-radius: 14px;
    box-shadow: 0 4px 0 #6a1b9a;
    cursor: pointer;

    &:disabled {
      background-color: #bdbdbd;
      box-shadow: none;
      cursor: not-allowed;
    }
  }

  &__hint {
    font-size: 1.15rem;
    font-weight: $font-bold;
    color: #6d4c41;
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
    font-size: 1.2rem;
  }

  .equation {
    font-size: 1.8rem;
  }
}
</style>

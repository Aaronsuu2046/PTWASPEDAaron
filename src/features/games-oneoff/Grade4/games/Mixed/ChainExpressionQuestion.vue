<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <div
        class="work-panel"
        :class="{ 'work-panel--word': gameData.question }"
      >
        <div class="top-row">
          <!-- 題目文字：輸入板盡量不要蓋住 -->
          <p v-if="gameData.question" class="question-text" data-pad-avoid>
            {{ gameData.question }}
          </p>
          <!-- 計算紙：畫筆或定位版直式，只是算算看，不計分 -->
          <button
            type="button"
            class="scratch-toggle"
            data-scratch-toggle
            @click="toggleScratch"
          >
            {{ scratchOpen ? "收起計算紙" : "打開計算紙" }}
          </button>
        </div>

        <div class="main-row">
          <div class="work-col">
            <!-- 遞等式：每一列是固定文字與空格，點空格出現輸入板 -->
            <div class="work-block">
              <div
                v-for="(line, l) in parsedLines"
                :key="`line-${l}`"
                class="work-row"
              >
                <template v-for="(part, k) in line" :key="`${l}-${k}`">
                  <!-- 算式文字也標 data-pad-field：輸入板把它當成欄位避開，
                   會放到整個算式右邊，不會蓋住同一列的數字 -->
                  <span
                    v-if="part.text !== undefined"
                    class="work-text"
                    data-pad-field
                    >{{ part.text }}</span
                  >
                  <button
                    v-else
                    type="button"
                    class="fill-box"
                    :class="boxClass(part.key, part.isOp)"
                    :data-key="part.key"
                    data-pad-field
                    :aria-label="part.isOp ? '運算符號' : '數字'"
                    @click="activate(part.key)"
                  >
                    {{ display(part.key) }}
                  </button>
                </template>
              </div>

              <!-- 選填 answers：答案列，前後有固定文字與單位 -->
              <div v-if="gameData.answers" class="work-row work-row--answer">
                <span class="work-label">答：</span>
                <template
                  v-for="(ans, k) in gameData.answers"
                  :key="`ans-${k}`"
                >
                  <span v-if="ans.prefix" class="work-unit">{{
                    ans.prefix
                  }}</span>
                  <button
                    type="button"
                    class="fill-box fill-box--answer"
                    :class="boxClass(`answer${k}`, false)"
                    :data-key="`answer${k}`"
                    data-pad-field
                    aria-label="答案"
                    @click="activate(`answer${k}`)"
                  >
                    {{ display(`answer${k}`) }}
                  </button>
                  <span class="work-unit">{{ ans.unit }}</span>
                </template>
              </div>
            </div>

            <p class="feedback" :class="{ 'feedback--hint': showHint }">
              {{ feedback }}
            </p>
          </div>
          <!-- 選填 scene：應用題情境圖，放在最右邊（中間留給輸入板；打開計算紙時先收起來） -->
          <MixedScene
            v-if="gameData.scene && !scratchOpen"
            class="scene"
            :scene="gameData.scene"
          />
        </div>
      </div>

      <div v-if="scratchMounted" v-show="scratchOpen" class="scratch">
        <div class="scratch__head">
          <span>計算紙（不計分）</span>
          <button
            type="button"
            class="scratch__close"
            data-pad-avoid
            @click="toggleScratch"
          >
            關閉
          </button>
        </div>
        <div class="scratch__tabs">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            type="button"
            class="scratch__tab"
            :class="{ 'scratch__tab--on': scratchTab === tab.value }"
            :data-scratch-tab="tab.value"
            data-pad-avoid
            @click="pickTab(tab.value)"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- 畫筆：自由寫寫畫畫 -->
        <div v-show="scratchTab === 'pen'" class="scratch__pen">
          <div class="pen-tools">
            <button
              type="button"
              :class="{ 'pen-tools--on': penTool === 'pen' }"
              @click="setPenTool('pen')"
            >
              畫筆
            </button>
            <button
              type="button"
              :class="{ 'pen-tools--on': penTool === 'eraser' }"
              @click="setPenTool('eraser')"
            >
              橡皮擦
            </button>
            <button type="button" @click="$refs.drawingBoard.clear()">
              清除
            </button>
          </div>
          <div class="pen-paper">
            <DrawingBoard ref="drawingBoard" :component-config="brush" />
          </div>
        </div>

        <!-- 定位版：選一步，用直式算算看 -->
        <div v-show="scratchTab === 'board'" class="scratch__board">
          <div v-if="scratchSteps.length > 1" class="scratch__steps">
            <button
              v-for="(_, s) in scratchSteps"
              :key="`scratch-step-${s}`"
              type="button"
              class="scratch__step"
              :class="{ 'scratch__step--on': scratchStep === s }"
              data-pad-avoid
              @click="pickScratchStep(s)"
            >
              第 {{ s + 1 }} 步
            </button>
          </div>
          <!-- 輸入板不要蓋住直式本身 -->
          <div class="scratch__body" data-pad-avoid>
            <KeepAlive>
              <DivisionFill
                v-if="scratchExpr && scratchExpr.op === '÷'"
                ref="scratch"
                :key="scratchExpr.sig"
                :dividend="scratchExpr.a"
                :divisor="scratchExpr.b"
                @focus="onScratchFocus"
              />
              <VerticalScratch
                v-else-if="scratchExpr"
                ref="scratch"
                :key="scratchExpr.sig"
                :a="scratchExpr.a"
                :op="scratchExpr.op"
                :b="scratchExpr.b"
                @focus="onScratchFocus"
              />
            </KeepAlive>
            <p v-if="!scratchExpr" class="scratch__tip">
              先在算式填好這一步的數和符號，這裡就會出現直式喔！
            </p>
          </div>
        </div>

        <!-- 選填 GameConfig.TimesTable：九九乘法表，點一格會標出那一列和那一行 -->
        <div v-if="hasTimesTable" v-show="scratchTab === 'table'" class="times">
          <table class="times__table" aria-label="九九乘法表">
            <tr>
              <th class="times__corner">×</th>
              <th
                v-for="c in 9"
                :key="`th-${c}`"
                :class="{ times__on: pickedCell && pickedCell[1] === c }"
              >
                {{ c }}
              </th>
            </tr>
            <tr v-for="r in 9" :key="`tr-${r}`">
              <th :class="{ times__on: pickedCell && pickedCell[0] === r }">
                {{ r }}
              </th>
              <td
                v-for="c in 9"
                :key="`td-${r}-${c}`"
                :class="{
                  times__line:
                    pickedCell && (pickedCell[0] === r || pickedCell[1] === c),
                  times__picked:
                    pickedCell && pickedCell[0] === r && pickedCell[1] === c,
                }"
                :data-times="`${r}x${c}`"
                @click="pickedCell = [r, c]"
              >
                {{ r * c }}
              </td>
            </tr>
          </table>
          <p class="times__text">
            {{
              pickedCell
                ? `${pickedCell[0]} × ${pickedCell[1]} ＝ ${pickedCell[0] * pickedCell[1]}`
                : "點一格看看"
            }}
          </p>
        </div>
      </div>

      <FieldPad
        :field="answered ? null : activeEl"
        :kind="activeIsOp ? 'operator' : 'number'"
        :operators="OPS"
        @press="press"
        @close="closePad"
      />
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import DrawingBoard from "@/components/DrawingBoard.vue";
import FieldPad from "../Common/FieldPad.vue";
import VerticalScratch from "../Vertical/VerticalScratch.vue";
import DivisionFill from "../Vertical/DivisionFill.vue";
import MixedScene from "./MixedScene.vue";

const OPS = ["+", "-", "×", "÷"];
// 空格裡的運算符號顯示成和題目一樣的全形字
const OP_SHOW = { "+": "＋", "-": "－", "×": "×", "÷": "÷" };
const TABS = [
  { value: "pen", label: "畫筆" },
  { value: "board", label: "定位版" },
];
const PEN = { color: "#1565c0", size: 4 };
const ERASER = { color: "eraser", size: 26 };
const MAX_LENGTH = 6;

// 遞等式填空共用（併式計算題、應用題）：
// 題目 { lines: ["300－(115＋7)", "＝300－[122]", "＝[178]"], scratch, answers?, question? }
// lines 裡 [ ] 是要填的空格（依出現順序 b0、b1…），內容是數字或運算符號（+ - × ÷）；
// 數字以數值比對，符號要完全相同，每格各自判定
// scratch: [{ a, op, b }] 計算紙定位版可選的每一步，a／op／b 寫 "#0" 表示用學生填在第 0 格的內容
// （符號也要學生填時，直式跟著學生填的符號，不會先洩漏答案）
// 選填 answers: [{ prefix, value, unit }]：答案列；選填 question：題目文字（應用題）
// 選填 scene：情境圖（MixedScene），放在題目右邊
// GameConfig.Hint：答錯時的提示；GameConfig.TimesTable: true 時計算紙多一個「九九表」分頁
// 定位版的步驟是除法時用 DivisionFill 畫除法直式
export default {
  name: "ChainExpressionQuestion",
  components: {
    DrawingBoard,
    FieldPad,
    VerticalScratch,
    DivisionFill,
    MixedScene,
  },
  props: {
    gameData: { type: Object, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      OPS,
      pickedCell: null,
      values: {},
      active: null,
      activeEl: null,
      wrongKeys: [],
      answered: false,
      showHint: false,
      feedback: "",
      scratchOpen: false,
      scratchMounted: false,
      scratchTab: "pen",
      scratchStep: 0,
      penTool: "pen",
      brush: { ...PEN },
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "把算式中的空格填完整。";
    },
    // 每列拆成 { text } 與 { key, value, isOp }
    parsedLines() {
      let n = 0;
      return this.gameData.lines.map((line) =>
        line
          .split(/(\[[^\]]+\])/)
          .filter((piece) => piece !== "")
          .map((piece) => {
            const m = piece.match(/^\[([^\]]+)\]$/);
            if (!m) return { text: piece };
            const key = `b${n}`;
            n += 1;
            return { key, value: m[1], isOp: OPS.includes(m[1]) };
          })
      );
    },
    blanks() {
      return this.parsedLines.flat().filter((part) => part.key);
    },
    fieldOrder() {
      const keys = this.blanks.map((b) => b.key);
      (this.gameData.answers || []).forEach((_, k) => keys.push(`answer${k}`));
      return keys;
    },
    activeIsOp() {
      return Boolean(this.blanks.find((b) => b.key === this.active)?.isOp);
    },
    hasTimesTable() {
      return Boolean(this.gameConfig?.TimesTable);
    },
    tabs() {
      return this.hasTimesTable
        ? [...TABS, { value: "table", label: "九九表" }]
        : TABS;
    },
    scratchSteps() {
      return this.gameData.scratch || [];
    },
    // 定位版要畫的直式；用到學生還沒填好的數時先不畫
    scratchExpr() {
      const step = this.scratchSteps[this.scratchStep];
      if (!step) return null;
      const resolve = (v) => {
        const m = String(v).match(/^#(\d+)$/);
        return m ? this.values[`b${m[1]}`] || "" : String(v);
      };
      const a = resolve(step.a);
      const op = resolve(step.op);
      const b = resolve(step.b);
      if (!/^\d+$/.test(a) || !/^\d+$/.test(b)) return null;
      if (!OPS.includes(op)) return null;
      // 除法直式：被除數、除數都要是正整數
      if (op === "÷" && !(/^[1-9]\d*$/.test(a) && /^[1-9]\d*$/.test(b)))
        return null;
      return { a, op, b, sig: `${this.scratchStep}:${a}${op}${b}` };
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    display(key) {
      const value = this.values[key] || "";
      return OP_SHOW[value] || value;
    },
    boxClass(key, isOp) {
      return {
        "fill-box--op": isOp,
        "fill-box--active": !this.answered && this.active === key,
        "fill-box--wrong": this.wrongKeys.includes(key),
        "fill-box--correct": this.answered,
      };
    },
    toggleScratch() {
      this.scratchMounted = true;
      this.scratchOpen = !this.scratchOpen;
      if (this.active === "scratch") this.closePad();
    },
    pickTab(tab) {
      if (this.active === "scratch") this.closePad();
      this.scratchTab = tab;
    },
    pickScratchStep(s) {
      if (this.active === "scratch") this.closePad();
      this.scratchStep = s;
    },
    setPenTool(tool) {
      this.penTool = tool;
      this.brush = tool === "eraser" ? { ...ERASER } : { ...PEN };
    },
    onScratchFocus() {
      this.active = "scratch";
      this.syncScratchPad();
    },
    syncScratchPad() {
      this.$nextTick(() => {
        const id = this.$refs.scratch?.active;
        this.activeEl = id
          ? this.$el.querySelector(`.scratch [data-cell="${id}"]`)
          : null;
      });
    },
    activate(key) {
      if (this.answered) return;
      if (this.active === "scratch") this.$refs.scratch?.blur();
      this.active = key;
      this.activeEl = this.$el.querySelector(`[data-key="${key}"]`);
    },
    closePad() {
      if (this.active === "scratch") this.$refs.scratch?.blur();
      this.active = null;
      this.activeEl = null;
    },
    setValue(key, value) {
      this.values = { ...this.values, [key]: value };
      this.wrongKeys = this.wrongKeys.filter((k) => k !== key);
    },
    press(key) {
      if (this.answered || !this.active) return;
      if (this.active === "scratch") {
        if (/^\d$/.test(key)) this.$refs.scratch?.input(key);
        else if (key === "←" || key === "clear") this.$refs.scratch?.input("←");
        this.syncScratchPad();
        return;
      }
      const current = this.values[this.active] || "";
      if (key === "clear") {
        this.setValue(this.active, "");
      } else if (OPS.includes(key)) {
        if (!this.activeIsOp) return;
        this.setValue(this.active, key);
        // 選完符號自動跳到下一格
        const next = this.fieldOrder[this.fieldOrder.indexOf(this.active) + 1];
        if (next) this.activate(next);
      } else if (key === "←") {
        this.setValue(this.active, current.slice(0, -1));
      } else if (!this.activeIsOp && /^\d$/.test(key)) {
        if (current.length >= MAX_LENGTH) return;
        this.setValue(this.active, current === "0" ? key : current + key);
      }
    },
    sameNumber(input, expected) {
      return (
        input !== undefined &&
        input !== "" &&
        !Number.isNaN(Number(input)) &&
        Number(input) === Number(expected)
      );
    },
    findWrongKeys() {
      const wrong = [];
      this.blanks.forEach((b) => {
        const v = this.values[b.key];
        const ok = b.isOp ? v === b.value : this.sameNumber(v, b.value);
        if (!ok) wrong.push(b.key);
      });
      (this.gameData.answers || []).forEach((ans, k) => {
        if (!this.sameNumber(this.values[`answer${k}`], ans.value))
          wrong.push(`answer${k}`);
      });
      return wrong;
    },
    // 把整個遞等式寫成一行文字（紀錄用）
    formatWork(pick) {
      const lines = this.parsedLines
        .map((line) =>
          line
            .map((part) =>
              part.text !== undefined
                ? part.text
                : OP_SHOW[pick(part)] || pick(part) || "_"
            )
            .join("")
        )
        .join("");
      const answers = (this.gameData.answers || [])
        .map(
          (ans, k) =>
            `${ans.prefix || ""}${pick({ key: `answer${k}`, value: ans.value }) || "_"}${ans.unit}`
        )
        .join("，");
      return answers ? `${lines}，答：${answers}` : lines;
    },
    checkAnswer() {
      if (this.answered) return;
      this.wrongKeys = this.findWrongKeys();
      const isCorrect = this.wrongKeys.length === 0;
      this.$emit("add-record", [
        this.formatWork((part) => part.value),
        this.formatWork((part) => this.values[part.key]),
        isCorrect ? "正確" : "錯誤",
      ]);
      if (isCorrect) {
        this.answered = true;
        this.showHint = false;
        this.feedback = "";
        this.closePad();
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
        return;
      }
      const empty = this.fieldOrder.some((k) => !this.values[k]);
      this.showHint = true;
      this.feedback = empty
        ? "還有空格沒填喔！紅色的格子要再填一填。"
        : `紅色的格子再算算看！${this.gameConfig?.Hint || ""}`;
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
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: stretch;
  gap: 1rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small;
}

.work-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: safe center;
  gap: 0.8rem;
}

.top-row {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 0.8rem;

  .question-text {
    flex: 1;
  }
}

.scratch-toggle {
  flex-shrink: 0;
  padding: 0.35rem 1rem;
  font-size: 1.2rem;
  font-weight: $font-bold;
  color: #ffffff;
  background-color: #26a69a;
  border: none;
  border-radius: 12px;
  box-shadow: 0 3px 0 #00796b;
  cursor: pointer;
}

.main-row {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  gap: 1rem;
}

// 算式靠左放，右邊留空間給輸入板
.work-col {
  min-width: 0;
  margin-left: clamp(0.5rem, 5%, 4rem);
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.scene {
  flex-shrink: 0;
  width: 17rem;
  height: auto;
  margin-left: auto;
}

.question-text {
  margin: 0;
  padding: 0.8rem 1.2rem;
  font-size: 1.7rem;
  font-weight: $font-bold;
  line-height: 1.6;
  background-color: #fff8e1;
  border: 3px solid #ffcc80;
  border-radius: 14px;
}

.work-block {
  align-self: flex-start;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 1rem 2rem;
  background-color: #ffffff;
  border-radius: 18px;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.08);
}

.work-row {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 2.6rem;
  font-weight: $font-bold;
  color: #0d47a1;
  white-space: nowrap;
}

.work-text {
  letter-spacing: 0.04em;
}

.work-row--answer {
  margin-top: 0.4rem;
  padding-top: 0.6rem;
  border-top: 2px dashed #cfd8dc;
  font-size: 2rem;
  color: #333333;
}

.work-label,
.work-unit {
  font-size: 1.8rem;
}

.fill-box {
  min-width: 5.6rem;
  height: 3.8rem;
  padding: 0 0.5rem;
  font-size: 2.4rem;
  font-weight: $font-bold;
  color: #1565c0;
  background-color: #fffde7;
  border: 3px dashed #ffb300;
  border-radius: 12px;
  cursor: pointer;

  &--op {
    min-width: 3.6rem;
    color: #ef6c00;
  }

  &--active {
    border: 4px solid #1e88e5;
    background-color: #e3f2fd;
  }

  &--wrong {
    color: #c62828;
    border: 4px solid #e53935;
    background-color: #ffebee;
  }

  &--correct {
    color: #2e7d32;
    border: 3px solid #43a047;
    background-color: #e8f5e9;
  }
}

.feedback {
  align-self: flex-start;
  min-height: 3.2rem;
  max-width: 40rem;
  margin: 0;
  text-align: center;
  font-size: 1.25rem;
  font-weight: $font-bold;
  color: #c62828;

  &--hint {
    padding: 0.3rem 1rem;
    background-color: #fff8e1;
    border: 2px solid #ffca28;
    border-radius: 12px;
  }
}

.scratch {
  flex-shrink: 0;
  width: 21rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.5rem;
  background-color: #e0f2f1;
  border: 3px solid #80cbc4;
  border-radius: 18px;

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 1.05rem;
    font-weight: $font-bold;
    color: #00695c;
  }

  &__close {
    padding: 0.2rem 0.8rem;
    font-size: 1.1rem;
    font-weight: $font-bold;
    color: #ffffff;
    background-color: #ef5350;
    border: none;
    border-radius: 10px;
    cursor: pointer;
  }

  &__tabs,
  &__steps {
    display: flex;
    gap: 0.4rem;
  }

  &__tab,
  &__step {
    flex: 1;
    padding: 0.2rem 0.4rem;
    font-size: 1.15rem;
    font-weight: $font-bold;
    color: #00695c;
    background-color: #ffffff;
    border: 2px solid #80cbc4;
    border-radius: 10px;
    cursor: pointer;

    &--on {
      color: #ffffff;
      background-color: #26a69a;
      border-color: #00796b;
    }
  }

  &__pen,
  &__board {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  &__body {
    flex: 1;
    min-height: 0;
    overflow: auto;
    display: flex;
    align-items: flex-start;
    justify-content: center;
  }

  &__tip {
    margin: 1rem 0.5rem;
    font-size: 1.25rem;
    font-weight: $font-bold;
    line-height: 1.5;
    color: #00695c;
  }

  :deep(.vfill) {
    --cell: 2.3rem;
  }

  :deep(.vfill__cell) {
    font-size: 1.5rem;
  }

  :deep(.vfill__grid) {
    padding: 0.4rem 0.6rem;
    row-gap: 0.1rem;
  }
}

.times {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;

  &__table {
    border-collapse: collapse;
    background-color: #ffffff;
    border-radius: 10px;
    font-weight: $font-bold;

    th,
    td {
      width: 1.9rem;
      height: 1.9rem;
      text-align: center;
      font-size: 1rem;
      border: 1px solid #b2dfdb;
    }

    th {
      color: #ffffff;
      background-color: #26a69a;
    }

    td {
      color: #37474f;
      cursor: pointer;
    }
  }

  &__corner {
    background-color: #00796b !important;
  }

  &__on {
    background-color: #ff9800 !important;
  }

  &__line {
    background-color: #fff3e0;
  }

  &__picked {
    color: #ffffff !important;
    background-color: #ef6c00;
  }

  &__text {
    margin: 0;
    font-size: 1.3rem;
    font-weight: $font-bold;
    color: #00695c;
  }
}

@media (max-width: 1100px), (max-height: 760px) {
  .times__table {
    th,
    td {
      width: 1.6rem;
      height: 1.6rem;
      font-size: 0.9rem;
    }
  }
}

.pen-tools {
  display: flex;
  gap: 0.4rem;

  button {
    flex: 1;
    padding: 0.2rem 0.4rem;
    font-size: 1.05rem;
    font-weight: $font-bold;
    color: #4e342e;
    background-color: #ffffff;
    border: 2px solid #bcaaa4;
    border-radius: 10px;
    cursor: pointer;
  }

  &--on {
    background-color: #ffe082 !important;
    border-color: #ffb300 !important;
  }
}

.pen-paper {
  flex: 1;
  min-height: 0;
  background-color: #ffffff;
  background-image:
    linear-gradient(#e0f2f1 1px, transparent 1px),
    linear-gradient(90deg, #e0f2f1 1px, transparent 1px);
  background-size: 24px 24px;
  border-radius: 12px;
  cursor: crosshair;
  touch-action: none;
}

// 應用題：上面有題目和情境圖，算式格子小一點
.work-panel--word {
  gap: 0.5rem;

  .question-text {
    font-size: 1.5rem;
    line-height: 1.5;
    padding: 0.6rem 1rem;
  }

  .work-block {
    gap: 0.35rem;
    padding: 0.6rem 1.6rem;
  }

  .work-row {
    font-size: 2.1rem;
  }

  .fill-box {
    min-width: 4.6rem;
    height: 3.1rem;
    font-size: 2rem;

    &--op {
      min-width: 3rem;
    }
  }

  .work-row--answer {
    margin-top: 0.2rem;
    padding-top: 0.4rem;
  }

  .feedback {
    min-height: 2.6rem;
    font-size: 1.15rem;
  }
}

@media (max-width: 1100px), (max-height: 760px) {
  .scene {
    width: 14rem;
  }

  .work-panel--word {
    .question-text {
      font-size: 1.3rem;
      padding: 0.4rem 0.8rem;
    }

    .work-block {
      gap: 0.2rem;
      padding: 0.4rem 1.2rem;
    }

    .work-row {
      font-size: 1.8rem;
    }

    .fill-box {
      min-width: 4rem;
      height: 2.7rem;
      font-size: 1.7rem;

      &--op {
        min-width: 2.6rem;
      }
    }

    .work-label,
    .work-unit {
      font-size: 1.5rem;
    }

    .feedback {
      font-size: 1.05rem;
    }
  }

  .work-row {
    font-size: 2.2rem;
  }

  .fill-box {
    min-width: 4.8rem;
    height: 3.3rem;
    font-size: 2rem;

    &--op {
      min-width: 3rem;
    }
  }

  .work-block {
    padding: 0.8rem 1.4rem;
  }

  .scratch {
    width: 17rem;

    :deep(.vfill) {
      --cell: 1.9rem;
    }

    :deep(.vfill__cell) {
      font-size: 1.3rem;
    }
  }
}
</style>

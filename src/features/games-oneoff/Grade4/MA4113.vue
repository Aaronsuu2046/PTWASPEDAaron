<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <!-- 關卡 1～4：除法直式 -->
      <template v-if="!isWord">
        <!-- 橫式：括號裡也要填答案 -->
        <div class="equation">
          <span>{{ gameData.dividend }} ÷ {{ gameData.divisor }} =</span>
          <template v-for="(id, i) in hKeys" :key="id">
            <span v-if="i > 0" class="equation__dots">…</span>
            <button
              type="button"
              class="equation__box"
              :class="hClass(id)"
              :data-cell="id"
              data-pad-field
              @click="focusH(id)"
            >
              {{ h[id] }}
            </button>
          </template>
        </div>
        <div class="work">
          <DivisionFill
            ref="division"
            :dividend="gameData.dividend"
            :divisor="gameData.divisor"
            @change="feedback = ''"
            @focus="onDivisionFocus"
          />
          <p class="side__hint">點格子會出現數字板，填好會自動跳到右邊下一格</p>
        </div>
      </template>

      <!-- 關卡 5：應用題 -->
      <template v-else>
        <p class="question">{{ gameData.question }}</p>
        <div class="work">
          <div class="word">
            <div class="word__row">
              <span class="word__label">做法：</span>
              <template v-for="part in FORMULA" :key="part.id">
                <span v-if="part.sign" class="word__sign">{{ part.sign }}</span>
                <button
                  v-else
                  type="button"
                  class="word__box"
                  :class="boxClass(part.id)"
                  :data-cell="part.id"
                  data-pad-field
                  @click="openWord(part.id)"
                >
                  {{ values[part.id] }}
                </button>
              </template>
            </div>
            <div class="word__row">
              <span class="word__label">答：</span>
              <span>每人最多可以分到</span>
              <button
                type="button"
                class="word__box"
                :class="boxClass('each')"
                data-cell="each"
                data-pad-field
                @click="openWord('each')"
              >
                {{ values.each }}
              </button>
              <span>{{ gameData.unit }}</span>
            </div>
            <div class="word__row">
              <span class="word__label" />
              <span>剩下</span>
              <button
                type="button"
                class="word__box"
                :class="boxClass('left')"
                data-cell="left"
                data-pad-field
                @click="openWord('left')"
              >
                {{ values.left }}
              </button>
              <span>{{ gameData.unit }}</span>
            </div>
          </div>
          <p class="side__hint">
            點格子會出現數字板；可以用右邊的「計算工具」幫忙算
          </p>
        </div>
      </template>

      <p v-if="feedback" class="feedback">{{ feedback }}</p>

      <!-- 點格子才出現的數字板，會跟著目前的格子移動 -->
      <FieldPad
        :field="padOpen && !answered ? padEl : null"
        @press="onPadKey"
        @close="closePad"
      />
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import DivisionFill from "./games/Vertical/DivisionFill.vue";
import FieldPad from "./games/Common/FieldPad.vue";

const FORMULA = [
  { id: "a" },
  { id: "div", sign: "÷" },
  { id: "b" },
  { id: "eq", sign: "=" },
  { id: "q" },
  { id: "dots", sign: "…" },
  { id: "r" },
];
const MAX_LEN = 5;

// 三、四位數÷三位數：關卡 1～4 用除法直式（商要放在正確位值，直式每一步都要填），
// 關卡 5 應用題填橫式與「每人最多分到／剩下」
export default {
  name: "MA4113",
  components: { DivisionFill, FieldPad },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      FORMULA,
      feedback: "",
      answered: false,
      active: null,
      // 浮動數字板：是否開著、目前對準的格子
      padOpen: false,
      padEl: null,
      values: { a: "", b: "", q: "", r: "", each: "", left: "" },
      wrongKeys: [],
      // 橫式括號：hq 商、hr 餘數
      h: { hq: "", hr: "" },
      hActive: null,
      hWrong: [],
    };
  },
  computed: {
    isWord() {
      return this.gameData.kind === "word";
    },
    gameIntroText() {
      return this.introText?.Content || "用除法直式算算看";
    },
    // 整除題只有一格，有餘數的題目是「商 … 餘數」兩格
    hKeys() {
      return this.gameData.remainder === "0" ? ["hq"] : ["hq", "hr"];
    },
    wordExpected() {
      const { dividend, divisor, quotient, remainder } = this.gameData;
      return {
        a: dividend,
        b: divisor,
        q: quotient,
        r: remainder,
        each: quotient,
        left: remainder,
      };
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  mounted() {
    window.addEventListener("keydown", this.onKey);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
    window.removeEventListener("keydown", this.onKey);
  },
  methods: {
    boxClass(id) {
      return {
        "word__box--active": this.active === id && !this.answered,
        "word__box--wrong": this.wrongKeys.includes(id),
        "word__box--correct": this.answered,
      };
    },
    typeWord(key, cell = this.active) {
      if (this.answered || !(cell in this.values)) return;
      this.active = cell;
      const cur = this.values[cell];
      const next =
        key === "←" ? cur.slice(0, -1) : (cur + key).slice(0, MAX_LEN);
      this.values = { ...this.values, [cell]: next };
      this.wrongKeys = this.wrongKeys.filter((k) => k !== cell);
      this.feedback = "";
    },
    onKey(event) {
      const key = /^[0-9]$/.test(event.key)
        ? event.key
        : event.key === "Backspace"
          ? "←"
          : null;
      if (!key) return;
      if (this.isWord) this.typeWord(key);
      else if (this.hActive) this.typeH(key);
    },
    hClass(id) {
      return {
        "equation__box--active": this.hActive === id && !this.answered,
        "equation__box--wrong": this.hWrong.includes(id),
        "equation__box--correct": this.answered,
      };
    },
    focusH(id) {
      if (this.answered) return;
      this.hActive = id;
      this.$refs.division.blur();
      this.padOpen = true;
      this.syncPad();
    },
    onDivisionFocus() {
      this.hActive = null;
      this.padOpen = true;
      this.syncPad();
    },
    openWord(id) {
      if (this.answered) return;
      this.active = id;
      this.padOpen = true;
      this.syncPad();
    },
    // 數字板對準目前的格子（直式填完一格會自動跳到下一格）
    syncPad() {
      this.$nextTick(() => {
        const id = this.isWord
          ? this.active
          : this.hActive || this.$refs.division?.active;
        this.padEl = id ? this.$el.querySelector(`[data-cell="${id}"]`) : null;
      });
    },
    closePad() {
      this.padOpen = false;
      this.padEl = null;
      if (this.isWord) this.active = null;
      else {
        this.hActive = null;
        this.$refs.division?.blur();
      }
    },
    onPadKey(key) {
      if (this.isWord) {
        if (key === "clear") {
          if (this.active) this.values = { ...this.values, [this.active]: "" };
        } else {
          this.typeWord(key);
        }
      } else if (key === "clear") {
        if (this.hActive) this.h = { ...this.h, [this.hActive]: "" };
        else this.$refs.division.input("←");
      } else {
        this.pressKey(key);
      }
      this.syncPad();
    },
    typeH(key, id = this.hActive) {
      if (this.answered || !id) return;
      if (this.hActive !== id) this.focusH(id);
      const cur = this.h[id];
      const next =
        key === "←" ? cur.slice(0, -1) : (cur + key).slice(0, MAX_LEN);
      this.h = { ...this.h, [id]: next };
      this.hWrong = this.hWrong.filter((k) => k !== id);
      this.feedback = "";
    },
    // 數字鍵：拖到橫式括號或目前選在括號時填橫式，否則填直式
    pressKey(key, cell) {
      if (cell ? cell.startsWith("h") : this.hActive) this.typeH(key, cell);
      else this.$refs.division.input(key, cell);
    },
    finish(isCorrect, expected, actual) {
      this.$emit("add-record", [expected, actual, isCorrect ? "正確" : "錯誤"]);
      if (isCorrect) {
        this.answered = true;
        this.feedback = "";
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
      } else {
        this.$emit("play-effect", "WrongSound");
      }
    },
    checkAnswer() {
      if (this.answered) return;
      const { quotient, remainder, unit } = this.gameData;
      if (!this.isWord) {
        const result = this.$refs.division.check();
        const hExp = { hq: quotient, hr: remainder };
        const hEmpty = this.hKeys.some((k) => !this.h[k]);
        this.hWrong = this.hKeys.filter(
          (k) => this.h[k] && this.h[k] !== hExp[k]
        );
        if (result.wrong)
          this.feedback = "紅色的格子不對，再算算看！商要寫在正確的位置上";
        else if (!result.complete)
          this.feedback = "黃色格子還沒填完喔！商前面沒有數字的格子可以空著";
        else if (this.hWrong.length)
          this.feedback = "上面括號裡的答案不對，再看看直式算出的商和餘數！";
        else if (hEmpty) this.feedback = "別忘了在上面的括號裡寫出答案！";
        const isCorrect = result.correct && !hEmpty && !this.hWrong.length;
        const hText = this.hKeys.map((k) => this.h[k] || "_").join("…");
        this.finish(
          isCorrect,
          `商 ${quotient}，餘數 ${remainder}；橫式 ${this.hKeys
            .map((k) => hExp[k])
            .join("…")}`,
          `商 ${result.quotient || "_"}，餘數 ${
            result.remainder || "_"
          }；橫式 ${hText}`
        );
        return;
      }
      const exp = this.wordExpected;
      const empty = Object.keys(exp).filter((k) => !this.values[k]);
      this.wrongKeys = Object.keys(exp).filter(
        (k) => this.values[k] && this.values[k] !== exp[k]
      );
      const isCorrect = !empty.length && !this.wrongKeys.length;
      if (empty.length) this.feedback = "每個格子都要填喔！";
      else if (!isCorrect) this.feedback = "紅色的格子不對，再算算看！";
      const text = (v) =>
        `${v.a || "_"}÷${v.b || "_"}=${v.q || "_"}…${v.r || "_"}；每人 ${
          v.each || "_"
        } ${unit}，剩下 ${v.left || "_"} ${unit}`;
      this.finish(isCorrect, text(exp), text(this.values));
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
  padding: $padding--small;
}

.equation {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.9rem;
  font-weight: $font-bold;
  color: #333333;

  &__dots {
    color: #e65100;
  }

  &__box {
    min-width: 6rem;
    height: 3.1rem;
    padding: 0 0.5rem;
    font-size: 1.9rem;
    font-weight: $font-bold;
    color: #e65100;
    background-color: #fff176;
    border: 3px solid #fbc02d;
    border-radius: 10px;
    cursor: pointer;

    &--active {
      border-color: #1e88e5;
      box-shadow: 0 0 0 3px #90caf9;
    }

    &--wrong {
      color: #c62828;
      border-color: #e53935;
      box-shadow: 0 0 0 3px #ffcdd2;
    }

    &--correct {
      color: #2e7d32;
      background-color: #c8e6c9;
      border-color: #43a047;
    }
  }
}

.question {
  margin: 0;
  max-width: 50rem;
  font-size: 1.6rem;
  font-weight: $font-bold;
  line-height: 1.5;
  color: #333333;
}

.work {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2.5rem;
}

.side {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;

  &__hint {
    margin: 0;
    max-width: 11rem;
    font-size: 1.05rem;
    line-height: 1.4;
    text-align: center;
    color: #6d4c41;
  }
}

.word {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem 1.4rem;
  background-color: #ffffff;
  border-radius: 16px;
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.1);
  font-size: 1.6rem;
  font-weight: $font-bold;
  color: #333333;

  &__row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  &__label {
    min-width: 4.5rem;
    white-space: nowrap;
    color: #6d4c41;
  }

  &__sign {
    font-size: 1.9rem;
    color: #e65100;
  }

  &__box {
    min-width: 5rem;
    height: 3.2rem;
    padding: 0 0.4rem;
    font-size: 1.8rem;
    font-weight: $font-bold;
    color: #e65100;
    background-color: #fff176;
    border: 3px solid #fbc02d;
    border-radius: 10px;
    cursor: pointer;

    &--active {
      border-color: #1e88e5;
      box-shadow: 0 0 0 3px #90caf9;
    }

    &--wrong {
      color: #c62828;
      border-color: #e53935;
      box-shadow: 0 0 0 3px #ffcdd2;
    }

    &--correct {
      color: #2e7d32;
      background-color: #c8e6c9;
      border-color: #43a047;
    }
  }
}

.feedback {
  margin: 0;
  font-size: 1.3rem;
  font-weight: $font-bold;
  color: #c62828;
}

@media (max-width: 1100px) {
  .work {
    gap: 1.2rem;
  }

  .word {
    font-size: 1.35rem;

    &__box {
      min-width: 4.2rem;
      height: 2.8rem;
      font-size: 1.5rem;
    }
  }
}
</style>

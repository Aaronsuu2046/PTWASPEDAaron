<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <p class="question">
        <span>{{ partsText }}</span
        >，是多少？把數填進定位板。
      </p>

      <div class="work">
        <!-- 左：積木與換算（只是輔助，不計分） -->
        <div class="left">
          <div ref="board" class="board">
            <BaseTenBlocks
              :hundreds="counts.hundreds"
              :tens="counts.tens"
              :ones="counts.ones"
              :unit="unit"
              :highlight="merging"
            />
          </div>
          <div class="trade">
            <button
              type="button"
              class="trade__btn"
              data-trade="ones"
              :disabled="counts.ones < 10 || !!merging || answered"
              @click="trade('one')"
            >
              10 個一 ➜ 1 條十
            </button>
            <button
              type="button"
              class="trade__btn"
              data-trade="tens"
              :disabled="counts.tens < 10 || !!merging || answered"
              @click="trade('ten')"
            >
              10 條十 ➜ 1 個百
            </button>
          </div>
        </div>

        <!-- 右：定位板（密碼鎖），百、十、個各填一個數字 -->
        <div class="place" data-pad-avoid>
          <div class="place__heads">
            <span v-for="p in PLACES" :key="p.key">{{ p.label }}</span>
          </div>
          <div class="place__cells">
            <button
              v-for="p in PLACES"
              :key="p.key"
              type="button"
              class="place__box"
              :class="{
                'place__box--active': active === p.key && !answered,
                'place__box--wrong': wrongPlaces.includes(p.key),
                'place__box--correct': answered,
              }"
              :data-place="p.key"
              data-pad-field
              :aria-label="`${p.label}`"
              @click="activate($event, p.key)"
            >
              {{ values[p.key] ?? "" }}
            </button>
          </div>
        </div>
      </div>

      <p v-if="feedback" class="feedback" :class="{ 'feedback--ok': answered }">
        {{ feedback }}
      </p>

      <FieldPad
        :field="active && !answered ? activeEl : null"
        @press="press"
        @close="active = null"
      />
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import FieldPad from "../Grade4/games/Common/FieldPad.vue";
import BaseTenBlocks from "./components/BaseTenBlocks.vue";

const PLACES = [
  { key: "h", label: "百位" },
  { key: "t", label: "十位" },
  { key: "o", label: "個位" },
];
const UNIT_MAX = 24;
const UNIT_MIN = 9;
const MERGE_MS = 700;

// 幾個百、幾個十、幾個一－定位板與十進位換算
// 題目 { code, hundreds, tens, ones, answer }；積木可以「10 個一換 1 條十」「10 條十換 1 個百」（不能換回來），
// 換算只是輔助、總量不變；判定定位板百、十、個三格（空位值要填 0）
export default {
  name: "MA2016",
  components: { FieldPad, BaseTenBlocks },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    const { hundreds, tens, ones } = this.gameData;
    return {
      PLACES,
      counts: { hundreds, tens, ones },
      merging: null,
      unit: 16,
      values: {},
      active: null,
      activeEl: null,
      wrongPlaces: [],
      answered: false,
      feedback: "",
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "數數看積木，把數填進定位板。";
    },
    // 題目文字，例如「1 個百、5 個十、11 個一」（0 個的不寫）
    partsText() {
      const { hundreds, tens, ones } = this.gameData;
      return [
        hundreds && `${hundreds} 個百`,
        tens && `${tens} 個十`,
        ones && `${ones} 個一`,
      ]
        .filter(Boolean)
        .join("、");
    },
    // 正確的定位板：百、十、個各一位
    digits() {
      const n = this.gameData.answer;
      return {
        h: Math.floor(n / 100),
        t: Math.floor((n % 100) / 10),
        o: n % 10,
      };
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  mounted() {
    this.fit();
    this.observer = new ResizeObserver(() => this.fit());
    this.observer.observe(this.$refs.board);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
    this.observer?.disconnect();
    clearTimeout(this.mergeTimer);
  },
  methods: {
    // 依板子大小算一小格多大：取「題目一開始」與「全部換算完」兩種擺法中較寬、較高的，換算後也放得下
    fit() {
      const board = this.$refs.board;
      if (!board) return;
      const { answer, hundreds, tens, ones } = this.gameData;
      const size = (h, t, o) => {
        const groups = [h, t, o].filter(Boolean).length;
        return {
          w:
            h * 10.35 +
            t * 1.35 +
            Math.min(o, 5) * 1.3 +
            Math.max(groups - 1, 0) * 1.2 +
            1,
          h: Math.max(h || t ? 10 : 0, Math.ceil(o / 5) * 1.3),
        };
      };
      const start = size(hundreds, tens, ones);
      const end = size(
        Math.floor(answer / 100),
        Math.floor(answer / 10) % 10,
        answer % 10
      );
      const width = Math.max(start.w, end.w);
      const height = Math.max(start.h, end.h);
      const u = Math.floor(
        Math.min(
          (board.clientWidth - 24) / width,
          (board.clientHeight - 20) / height
        )
      );
      this.unit = Math.max(UNIT_MIN, Math.min(UNIT_MAX, u));
    },
    // 換算：先讓要合併的 10 個閃動縮小，再變成 1 個上一位的積木
    trade(kind) {
      if (this.merging || this.answered) return;
      const c = this.counts;
      if (kind === "one" && c.ones < 10) return;
      if (kind === "ten" && c.tens < 10) return;
      this.merging = { kind, count: 10 };
      this.mergeTimer = setTimeout(() => {
        if (kind === "one") {
          this.counts = { ...c, ones: c.ones - 10, tens: c.tens + 1 };
        } else {
          this.counts = { ...c, tens: c.tens - 10, hundreds: c.hundreds + 1 };
        }
        this.merging = null;
      }, MERGE_MS);
    },
    activate(event, key) {
      if (this.answered) return;
      this.active = key;
      this.activeEl = event.currentTarget;
    },
    // 每格只放一個數字，按新的數字就換掉
    press(key) {
      if (this.answered || !this.active) return;
      const k = this.active;
      let next = this.values[k];
      if (key === "clear" || key === "←") next = undefined;
      else if (/^\d$/.test(key)) next = key;
      const values = { ...this.values };
      if (next === undefined) delete values[k];
      else values[k] = next;
      this.values = values;
      this.wrongPlaces = this.wrongPlaces.filter((p) => p !== k);
      this.feedback = "";
    },
    boardText(pick) {
      return PLACES.map((p) => `${p.label}${pick(p.key)}`).join(" ");
    },
    checkAnswer() {
      if (this.answered) return;
      const empty = PLACES.map((p) => p.key).filter(
        (k) => this.values[k] === undefined
      );
      if (empty.length) {
        this.wrongPlaces = empty;
        this.feedback = "定位板每一格都要填，沒有的位要填 0 喔！";
        return;
      }
      this.wrongPlaces = PLACES.map((p) => p.key).filter(
        (k) => Number(this.values[k]) !== this.digits[k]
      );
      const isCorrect = this.wrongPlaces.length === 0;
      const { code, answer } = this.gameData;
      this.$emit("add-record", [
        `${code} ${this.partsText}＝${answer}（${this.boardText((k) => this.digits[k])}）`,
        this.boardText((k) => this.values[k]),
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
      const names = PLACES.filter((p) => this.wrongPlaces.includes(p.key))
        .map((p) => p.label)
        .join("、");
      this.feedback = `${names}不對喔！超過 10 個一或 10 條十，可以先換算再數。`;
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
  gap: 0.6rem;
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

  span {
    color: #0d47a1;
  }
}

.work {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 1rem;
}

.left {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.board {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.6rem 0.75rem;
  background-color: #ffffff;
  border-radius: 20px;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.trade {
  display: flex;
  justify-content: center;
  gap: 1rem;

  &__btn {
    padding: 0.4rem 1rem;
    font-size: 1.25rem;
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
}

.place {
  flex: 0 0 auto;
  align-self: center;
  padding: 0.8rem;
  background-color: #fff3e0;
  border: 4px solid #ffb74d;
  border-radius: 18px;

  &__heads,
  &__cells {
    display: grid;
    grid-template-columns: repeat(3, 5rem);
    gap: 0.5rem;
  }

  &__heads span {
    text-align: center;
    font-size: 1.3rem;
    font-weight: $font-bold;
    color: #6d4c41;
  }

  &__box {
    height: 5.6rem;
    font-size: 3rem;
    font-weight: $font-bold;
    color: #0d47a1;
    background-color: #ffffff;
    border: 4px dashed #fb8c00;
    border-radius: 14px;
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
  align-self: center;
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

@media (max-width: 1100px) {
  .question {
    font-size: 1.4rem;
  }

  .place {
    &__heads,
    &__cells {
      grid-template-columns: repeat(3, 4.2rem);
    }

    &__box {
      height: 4.6rem;
      font-size: 2.5rem;
    }
  }

  .trade__btn {
    font-size: 1.1rem;
  }
}
</style>

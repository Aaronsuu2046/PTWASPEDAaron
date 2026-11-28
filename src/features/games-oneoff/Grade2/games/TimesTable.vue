<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <p v-if="hintText" class="tip">{{ hintText }}</p>

      <div class="main">
        <!-- 左：一組圖案 × 份數（密碼鎖 1～9），下面畫出同樣份數的圖組；只是觀察輔助，不計分 -->
        <div class="observe" data-pad-avoid>
          <div class="observe__head">
            <div class="one-group">
              <CountGroup :kind="icon" />
            </div>
            <span class="observe__sign">×</span>
            <div class="lock" role="group" aria-label="份數">
              <button
                type="button"
                class="lock__btn"
                data-lock="up"
                aria-label="份數加 1"
                @click="spin(1)"
              >
                ▲
              </button>
              <span class="lock__digit" data-lock-value>{{ groups }}</span>
              <button
                type="button"
                class="lock__btn"
                data-lock="down"
                aria-label="份數減 1"
                @click="spin(-1)"
              >
                ▼
              </button>
            </div>
            <span class="observe__unit">份</span>
          </div>
          <div
            class="observe__groups"
            :style="{ '--cols': Math.min(groups, PER_ROW) }"
          >
            <div v-for="i in groups" :key="i" class="group-cell" data-group>
              <CountGroup :kind="icon" />
            </div>
          </div>
        </div>

        <!-- 右：三個等式，已知的積直接顯示，只有 □ 可以填 -->
        <div class="table">
          <div
            v-for="(row, r) in gameData.rows"
            :key="r"
            class="table__row"
            :data-row="r"
          >
            <span class="num">{{ row.a }}</span>
            <span class="sign">×</span>
            <span class="num">{{ row.b }}</span>
            <span class="sign">＝</span>
            <span v-if="!row.blank" class="num num--given">{{ row.p }}</span>
            <button
              v-else
              type="button"
              class="box"
              :class="{
                'box--active': !answered && active === r,
                'box--wrong': wrongRows.includes(r),
                'box--correct': answered,
              }"
              :data-key="`r${r}`"
              data-pad-field
              :aria-label="`${row.a} 乘 ${row.b} 的積`"
              @click="activate($event, r)"
            >
              {{ values[r] }}
            </button>
          </div>
        </div>
      </div>

      <p v-if="feedback" class="feedback" :class="{ 'feedback--ok': answered }">
        {{ feedback }}
      </p>

      <FieldPad
        :field="active !== null && !answered ? activeEl : null"
        @press="press"
        @close="closePad"
      />
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import FieldPad from "../../Grade4/games/Common/FieldPad.vue";
import CountGroup from "../components/CountGroup.vue";

const PER_ROW = 5;
const MAX_LENGTH = 2;

// 2、5、4、8 的乘法表共用版型（MA2052～MA2055）
// GameConfig { Icon（CountGroup 的 kind）, Hint }；題目 { code, rows: [{ a, b, p, blank }] }
// 左邊份數用密碼鎖 1～9 調整（預設 1），即時畫出同樣份數的圖組，每列最多 5 組；
// 送出只檢查右邊空格（各格分別判定，答錯標出錯格），左邊不列入判定
export default {
  name: "TimesTable",
  components: { FieldPad, CountGroup },
  props: {
    gameData: { type: Object, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    const values = {};
    this.gameData.rows.forEach((row, r) => {
      if (row.blank) values[r] = "";
    });
    return {
      PER_ROW,
      groups: 1,
      values,
      active: null,
      activeEl: null,
      wrongRows: [],
      feedback: "",
      answered: false,
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "完成乘法表吧！";
    },
    hintText() {
      return this.gameConfig?.Hint || "";
    },
    icon() {
      return this.gameConfig?.Icon || "cherries";
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    // 密碼鎖：1～9 循環
    spin(step) {
      this.groups = ((this.groups - 1 + step + 9) % 9) + 1;
    },
    activate(event, r) {
      if (this.answered) return;
      this.active = r;
      this.activeEl = event.currentTarget;
    },
    closePad() {
      this.active = null;
      this.activeEl = null;
    },
    press(key) {
      if (this.answered || this.active === null) return;
      const r = this.active;
      const current = this.values[r];
      let next = current;
      if (key === "clear") next = "";
      else if (key === "←") next = current.slice(0, -1);
      else if (/^\d$/.test(key) && current.length < MAX_LENGTH)
        next = current === "0" ? key : current + key;
      this.values = { ...this.values, [r]: next };
      this.wrongRows = this.wrongRows.filter((w) => w !== r);
      this.feedback = "";
    },
    rowText(row, r, typed) {
      const p = row.blank && typed ? this.values[r] || "_" : row.p;
      return `${row.a}×${row.b}=${p}`;
    },
    checkAnswer() {
      if (this.answered) return;
      const { code, rows } = this.gameData;
      const blanks = Object.keys(this.values).map(Number);
      const empty = blanks.filter((r) => this.values[r] === "");
      if (empty.length) {
        this.wrongRows = empty;
        this.feedback = "空格都要填喔！";
        return;
      }
      const wrong = blanks.filter((r) => Number(this.values[r]) !== rows[r].p);
      this.wrongRows = wrong;
      const isCorrect = wrong.length === 0;
      this.$emit("add-record", [
        `${code} ${rows.map((row, r) => this.rowText(row, r, false)).join("；")}`,
        rows.map((row, r) => this.rowText(row, r, true)).join("；"),
        isCorrect ? "正確" : "錯誤",
      ]);
      if (isCorrect) {
        this.answered = true;
        this.feedback = "答對了！";
        this.closePad();
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
      } else {
        this.feedback = "紅色的格子不對，用左邊的圖數數看！";
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

.tip {
  margin: 0;
  font-size: 1.3rem;
  font-weight: $font-bold;
  color: #6d4c41;
}

.main {
  flex: 1;
  min-height: 0;
  width: 100%;
  display: flex;
  gap: 1rem;
}

.observe {
  flex: 1.5;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem;
  background-color: #ffffff;
  border: 3px solid #ffcc80;
  border-radius: 18px;

  &__head {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    font-size: 2.2rem;
    font-weight: $font-bold;
    color: #4e342e;
  }

  &__unit {
    font-size: 1.6rem;
  }

  &__groups {
    flex: 1;
    min-height: 0;
    display: grid;
    width: 100%;
    // 每格依面板寬度放大（一列 5 格剛好排滿），最大 --cell
    grid-template-columns: repeat(
      var(--cols),
      minmax(0, min(var(--cell), calc((100% - 2rem) / 5)))
    );
    align-content: center;
    justify-content: center;
    gap: 0.5rem;
    --cell: 7rem;
  }
}

.one-group {
  width: 4.6rem;
  height: 4.6rem;
  padding: 0.2rem;
  background-color: #fff8e1;
  border: 2px solid #ffcc80;
  border-radius: 12px;
}

.group-cell {
  aspect-ratio: 1;
  padding: 0.25rem;
  background-color: #fffde7;
  border: 2px solid #ffe082;
  border-radius: 12px;
}

.lock {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.2rem;
  background-color: #37474f;
  border-radius: 14px;

  &__btn {
    width: 3.4rem;
    height: 2rem;
    font-size: 1.1rem;
    color: #ffffff;
    background-color: #546e7a;
    border: none;
    border-radius: 8px;
    cursor: pointer;

    &:active {
      background-color: #78909c;
    }
  }

  &__digit {
    width: 3.4rem;
    margin: 0.2rem 0;
    font-size: 2.4rem;
    line-height: 1.2;
    text-align: center;
    color: #263238;
    background-color: #ffffff;
    border-radius: 8px;
  }
}

.table {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1rem;
  padding: 0.8rem 1.4rem;
  background-color: #ffffff;
  border-radius: 18px;
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.1);

  &__row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    font-size: 2.6rem;
    font-weight: $font-bold;
    color: #0d47a1;
  }
}

.sign {
  color: #333333;
}

.num--given {
  min-width: 4.4rem;
  text-align: center;
  color: #2e7d32;
}

.box {
  width: 4.6rem;
  height: 3.6rem;
  font-size: 2.4rem;
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

@media (max-width: 1100px), (max-height: 760px) {
  .observe__groups {
    --cell: 6rem;
  }

  .observe__head {
    font-size: 1.8rem;
  }

  .one-group {
    width: 3.8rem;
    height: 3.8rem;
  }

  .table {
    flex: 0.75;
    padding: 0.6rem 0.8rem;
  }

  .table__row {
    font-size: 2.1rem;
  }

  .box {
    width: 4rem;
    height: 3.1rem;
    font-size: 2rem;
  }
}
</style>

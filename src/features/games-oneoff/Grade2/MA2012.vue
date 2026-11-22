<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <div class="heads" :class="`heads--${heads.length}`">
        <span v-for="head in heads" :key="head">{{ head }}</span>
      </div>
      <div
        class="board"
        :class="`board--${heads.length}`"
        @click="onBoardClick"
      >
        <MatchThree ref="match" :columns="columns" @change="feedback = ''">
          <template #item="{ item, col }">
            <span v-if="kindOf(col) === 'number'" class="card-number">{{
              item.value
            }}</span>
            <span v-else-if="kindOf(col) === 'text'" class="card-reading">{{
              item.reading
            }}</span>
            <!-- 語音卡：點一下就播放（同時選取），可以一直重播；卡片上不寫數字（播放在 onBoardClick） -->
            <span
              v-else
              class="card-voice"
              :class="{ 'card-voice--playing': playing === item.id }"
              :data-voice="item.id"
            >
              <svg viewBox="0 0 48 48" aria-hidden="true">
                <path d="M8 18h8l11-9v30l-11-9H8z" fill="#ef6c00" />
                <path
                  d="M32 17c3 2 4 4.5 4 7s-1 5-4 7M36 12c5 3 7 7.5 7 12s-2 9-7 12"
                  fill="none"
                  stroke="#ef6c00"
                  stroke-width="3.5"
                  stroke-linecap="round"
                />
              </svg>
              <span class="card-voice__label">聽聽看</span>
            </span>
          </template>
        </MatchThree>
      </div>
      <p class="hint">點一張卡再點旁邊的卡就會連線，也可以拖過去</p>
      <p v-if="feedback" class="feedback">{{ feedback }}</p>
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import MatchThree from "../Grade4/games/Fraction/MatchThree.vue";
import { readNumber, pickDistinct, range } from "./lib/numberReading.js";

// 每關數字的範圍：zero＝十位是 0 的 100～200（100～109 與 200）；any＝100～200
const POOLS = {
  zero: [...range(100, 109), 200],
  any: range(100, 200),
};
// 每種欄位的標題
const HEADS = { number: "數字", text: "讀法", voice: "聲音" };

// 數到 200－讀法連連看：每次隨機產生 3 個不重複的數，把數字和讀法（文字或語音）連起來
// 題目 { code, pool: "zero"|"any", columns: ["number", "text"|"voice", ...] }
// 選填 values：直接指定這題的 3 個數（MA2111 等固定題庫用），不從 pool 隨機產生；紀錄前面會加題號
// 第 5 關三欄：數字－語音－讀法，同一個數的三張卡連成一組
export default {
  name: "MA2012",
  components: { MatchThree },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    const values =
      this.gameData.values || pickDistinct(POOLS[this.gameData.pool], 3);
    return {
      items: values.map((value) => ({
        id: String(value),
        value,
        reading: readNumber(value),
      })),
      feedback: "",
      answered: false,
      playing: null,
    };
  },
  computed: {
    gameIntroText() {
      return (
        this.introText?.Content || "把一樣的數連起來，聲音卡可以點一下聽聽看。"
      );
    },
    heads() {
      return this.gameData.columns.map((kind) => HEADS[kind]);
    },
    columns() {
      return this.gameData.columns.map(() => this.items);
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
    window.speechSynthesis?.cancel();
    clearTimeout(this.playTimer);
  },
  methods: {
    kindOf(col) {
      return this.gameData.columns[col];
    },
    // 卡片按鈕有 pointer capture，click 只會送到按鈕本身，所以在外層判斷是不是語音卡
    onBoardClick(event) {
      const card = event.target.closest?.(".match3__item");
      if (!card || this.kindOf(Number(card.dataset.col)) !== "voice") return;
      const item = this.find(card.dataset.id);
      if (item) this.speak(item);
    },
    // 用瀏覽器的語音（臺灣國語）念出讀法，重按就重新念
    speak(item) {
      const synth = window.speechSynthesis;
      this.playing = item.id;
      clearTimeout(this.playTimer);
      this.playTimer = setTimeout(() => (this.playing = null), 1500);
      if (!synth || typeof window.SpeechSynthesisUtterance !== "function") {
        // 沒有語音功能：提示請大人幫忙念，不在卡片上顯示答案
        this.feedback = "這台裝置不能播放聲音，請老師或家長幫忙念出來。";
        return;
      }
      synth.cancel();
      const utter = new window.SpeechSynthesisUtterance(item.reading);
      utter.lang = "zh-TW";
      utter.rate = 0.85;
      const voice = synth
        .getVoices()
        .find(
          (v) => /zh[-_]TW/i.test(v.lang) || /臺灣|台灣|Taiwan/.test(v.name)
        );
      if (voice) utter.voice = voice;
      synth.speak(utter);
    },
    find(id) {
      return this.items.find((item) => item.id === id);
    },
    // 紀錄裡每張卡寫成看得懂的樣子
    label(kind, item) {
      if (!item) return "未連";
      if (kind === "number") return String(item.value);
      if (kind === "text") return item.reading;
      return `聲音「${item.reading}」`;
    },
    checkAnswer() {
      if (this.answered) return;
      const result = this.$refs.match.check();
      const isCorrect = result.complete && result.wrong === 0;
      if (!result.complete) this.feedback = "每一張卡都要連起來喔！";
      else if (!isCorrect) this.feedback = "紅色虛線連錯了，點卡片重新連看看！";
      const kinds = this.gameData.columns;
      const expected = this.items
        .map((item) => kinds.map((k) => this.label(k, item)).join("－"))
        .join("；");
      // MatchThree：中欄是 columns[1]；links[0]＝中欄→左欄、links[1]＝中欄→右欄
      const actual = this.items
        .map((mid) => {
          const left = this.find(result.links[0][mid.id]);
          const parts = [this.label(kinds[0], left), this.label(kinds[1], mid)];
          if (kinds.length === 3)
            parts.push(
              this.label(kinds[2], this.find(result.links[1][mid.id]))
            );
          return parts.join("－");
        })
        .join("；");
      const code = this.gameData.values ? `${this.gameData.code} ` : "";
      this.$emit("add-record", [
        `${code}${expected}`,
        actual,
        isCorrect ? "正確" : "錯誤",
      ]);
      if (isCorrect) {
        this.answered = true;
        this.feedback = "";
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
  gap: 0.5rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small $padding--large;
}

.heads,
.board :deep(.match3) {
  display: grid;
  column-gap: 5rem;
}

.heads--2,
.board--2 :deep(.match3) {
  grid-template-columns: 1fr 1fr;
}

.heads--3,
.board--3 :deep(.match3) {
  grid-template-columns: 1fr 1fr 1fr;
}

.heads span {
  text-align: center;
  font-size: 1.4rem;
  font-weight: $font-bold;
  color: #6d4c41;
}

.board {
  flex: 1;
  min-height: 0;
}

.board :deep(.match3__item) {
  min-height: 0;
}

.card-number {
  font-size: 2.6rem;
  font-weight: $font-bold;
  color: #0d47a1;
}

.card-reading {
  white-space: nowrap;
  font-size: 2rem;
  font-weight: $font-bold;
  color: #4e342e;
}

.card-voice {
  display: flex;
  align-items: center;
  gap: 0.4rem;

  svg {
    width: 3rem;
    height: 3rem;
  }

  &__label {
    font-size: 1.4rem;
    font-weight: $font-bold;
    color: #ef6c00;
  }

  &--playing svg {
    animation: pulse 0.5s ease-in-out infinite alternate;
  }
}

@keyframes pulse {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(1.2);
  }
}

.hint {
  margin: 0;
  text-align: center;
  font-size: 1.1rem;
  color: #5d4037;
}

.feedback {
  margin: 0;
  text-align: center;
  font-size: 1.3rem;
  font-weight: $font-bold;
  color: #c62828;
}

@media (max-width: 1100px) {
  .heads,
  .board :deep(.match3) {
    column-gap: 3rem;
  }

  .card-number {
    font-size: 2.2rem;
  }

  .card-reading {
    font-size: 1.4rem;
  }
}
</style>

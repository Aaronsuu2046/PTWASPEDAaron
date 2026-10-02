<template>
  <!-- 關卡 1～3：沿用 LinkGame，把算式和答案連起來（答案每次隨機排列） -->
  <LinkGame
    v-if="isLink"
    :game-data="linkData"
    :game-config="LINK_CONFIG"
    :game-id="gameId"
    @play-effect="$emit('play-effect', $event)"
    @add-record="$emit('add-record', $event)"
    @next-question="$emit('next-question')"
  />

  <!-- 關卡 4：劃掉末尾的 0，再用除法直式算 -->
  <div v-else class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>
    <div class="game-area">
      <p class="equation">
        {{ gameData.dividend }} ÷ {{ gameData.divisor }} =
        <span class="equation__answer">{{
          answered ? gameData.answer : "？"
        }}</span>
      </p>
      <p class="hint">
        先點末尾藍色框的 0，兩邊劃掉一樣多個，再用直式算（點劃掉的 0 可以取消）
      </p>
      <div class="work">
        <DivisionFill
          ref="division"
          :dividend="gameData.dividend"
          :divisor="gameData.divisor"
          crossable
          @change="feedback = ''"
          @focus="openPad"
        />
      </div>
      <!-- 點直式格子才出現的數字板，填好一格會跟著跳到下一格 -->
      <FieldPad
        :field="padOpen && !answered ? padEl : null"
        @press="onPadKey"
        @close="closePad"
      />
      <p v-if="feedback" class="feedback">{{ feedback }}</p>
    </div>
  </div>
</template>

<script>
import { defineAsyncComponent } from "vue";
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import DivisionFill from "./games/Vertical/DivisionFill.vue";
import FieldPad from "./games/Common/FieldPad.vue";

function shuffle(list) {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 洗牌但避開原本的順序，免得答案剛好和算式一一對齊
function shuffleNotIdentity(list) {
  let result = shuffle(list);
  while (list.length > 1 && result.every((v, i) => v === list[i])) {
    result = shuffle(list);
  }
  return result;
}

// 末幾位為 0 的除法
// mode "link"：base 為提示用的基準算式，pairs [{ expression, answer }] 右欄答案隨機排列後交給 LinkGame
// mode "division"：兩邊劃掉一樣多個末尾的 0，再用除法直式定位版算
export default {
  name: "MA4114",
  components: {
    LinkGame: defineAsyncComponent(
      () => import("@/features/game-templates/link-game/LinkGame.vue")
    ),
    DivisionFill,
    FieldPad,
  },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    const isLink = this.gameData.mode === "link";
    return {
      LINK_CONFIG: { CheckingMode: "OnSubmit" },
      answerOrder: isLink
        ? shuffleNotIdentity(this.gameData.pairs.map((_, i) => i))
        : [],
      feedback: "",
      answered: false,
      padOpen: false,
      padEl: null,
    };
  },
  computed: {
    isLink() {
      return this.gameData.mode === "link";
    },
    gameIntroText() {
      return this.introText?.Content || "試試看末幾位為0的除法簡便算法";
    },
    linkData() {
      const text = (value) => ({
        Name: "TextOnly",
        Data: { Text: value, Size: "2.2rem" },
      });
      const pairs = this.gameData.pairs;
      return {
        Question: {
          text: `想想看 ${this.gameData.base}，把算式和正確答案連起來`,
          RowData: [
            pairs.map((pair) => text(pair.expression)),
            this.answerOrder.map((i) => text(pairs[i].answer)),
          ],
        },
        Answer: pairs.map((_, i) => [
          [0, i],
          [1, this.answerOrder.indexOf(i)],
        ]),
      };
    },
  },
  created() {
    if (!this.isLink) emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    // 點直式格子：數字板對準目前的格子（填完一格會自動跳到下一格）
    openPad() {
      this.padOpen = true;
      this.syncPad();
    },
    syncPad() {
      this.$nextTick(() => {
        const id = this.$refs.division?.active;
        this.padEl = id ? this.$el.querySelector(`[data-cell="${id}"]`) : null;
      });
    },
    closePad() {
      this.padOpen = false;
      this.padEl = null;
      this.$refs.division?.blur();
    },
    onPadKey(key) {
      this.$refs.division.input(key === "clear" ? "←" : key);
      this.syncPad();
    },
    checkAnswer() {
      if (this.answered) return;
      const division = this.$refs.division;
      const { crossA, crossB } = division;
      const result = division.check();
      if (!result.ready)
        this.feedback =
          crossA === crossB
            ? "先把兩邊末尾的 0 劃掉，再用直式算喔！"
            : "兩邊要劃掉一樣多個 0";
      else if (result.wrong)
        this.feedback = "紅色的格子不對，再算算看！商要寫在正確的位置上";
      else if (!result.complete)
        this.feedback = "黃色格子還沒填完喔！商前面沒有數字的格子可以空著";
      const { maxCross, answer } = this.gameData;
      const expected = `兩邊各劃掉 ${maxCross} 個 0；商 ${answer}，餘數 0`;
      const actual = `劃掉 ${crossA}／${crossB} 個 0；商 ${
        result.quotient || "_"
      }，餘數 ${result.remainder || "_"}`;
      this.$emit("add-record", [
        expected,
        actual,
        result.correct ? "正確" : "錯誤",
      ]);
      if (result.correct) {
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
  align-items: center;
  gap: 0.5rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small;
}

.equation {
  margin: 0;
  font-size: 1.9rem;
  font-weight: $font-bold;
  color: #333333;

  &__answer {
    color: #2e7d32;
  }
}

.hint {
  margin: 0;
  font-size: 1.1rem;
  color: #6d4c41;
}

.work {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2.5rem;
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
}
</style>

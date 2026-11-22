<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area">
      <div class="top">
        <div class="product-card">
          <ProductIcon class="product-card__img" :type="gameData.product" />
          <div class="product-card__text">
            <p class="product-card__name">{{ gameData.name }}</p>
            <p class="product-card__price" data-price>
              {{ gameData.price }} 元
            </p>
          </div>
        </div>
        <div class="tips">
          <p class="tips__ask">
            要買{{ gameData.name }}，把剛好 {{ gameData.price }}
            元的錢放到付款盤。
          </p>
          <p class="tips__hint">先看百位數，再拿十位數，最後再看個位數。</p>
        </div>
      </div>

      <!-- 錢包與付款盤：點一下就移過去，也可以拖過去 -->
      <div class="zones">
        <section
          v-for="zone in ZONES"
          :key="zone.id"
          class="zone"
          :class="[
            `zone--${zone.id}`,
            { 'zone--over': drag && drag.moved && drag.over === zone.id },
          ]"
          :data-zone="zone.id"
        >
          <div class="zone__head">
            <span>{{ zone.label }}</span>
            <button
              v-if="zone.id === 'tray'"
              type="button"
              class="zone__clear"
              data-clear
              :disabled="!inZone('tray').length || answered"
              @click="clearTray"
            >
              {{ gameConfig?.ClearLabel || "全部拿回錢包" }}
            </button>
          </div>
          <div class="zone__coins">
            <div
              v-for="group in groupsIn(zone.id)"
              :key="group.value"
              class="zone__group"
            >
              <button
                v-for="coin in group.coins"
                :key="coin.id"
                type="button"
                class="coin"
                :class="{
                  'coin--dragging': drag && drag.moved && drag.id === coin.id,
                }"
                :data-coin="coin.id"
                :data-value="coin.value"
                :aria-label="`${coin.value} 元`"
                @pointerdown="startDrag($event, coin)"
                @pointermove="onDrag"
                @pointerup="endDrag"
                @pointercancel="drag = null"
                @click="onCoinClick(coin)"
              >
                <MoneyItem :value="coin.value" :size="size" />
              </button>
            </div>
          </div>
          <p v-if="zone.id === 'tray'" class="zone__total">
            付款盤：{{ trayTotal }} 元
          </p>
        </section>
      </div>

      <p v-if="feedback" class="feedback" :class="{ 'feedback--ok': answered }">
        {{ feedback }}
      </p>
    </div>

    <div
      v-if="drag && drag.moved"
      class="drag-ghost"
      :style="{ left: `${drag.x}px`, top: `${drag.y}px` }"
    >
      <MoneyItem :value="drag.value" :size="size" />
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import MoneyItem from "./components/MoneyItem.vue";
import ProductIcon from "./components/ProductIcon.vue";

const DENOMS = [1000, 500, 100, 50, 10, 5, 1];
const ZONES = [
  { id: "wallet", label: "錢包" },
  { id: "tray", label: "付款盤" },
];
const DRAG_THRESHOLD = 8;

// 使用錢幣－拿出正確的錢幣：從錢包（每種錢幣有數量上限）把錢移到付款盤，湊出商品價格
// 題目 { code, product, name, price, wallet: { 面額: 數量 } }；總額剛好等於價格就對（可用的配置不只一種）
// 面額可到 500、1000。選填 GameConfig.ClearLabel：清空付款盤按鈕的文字；
// GameConfig.WarnOver：付款盤超過價格時立刻提示（不自動送出）
export default {
  name: "MA2018",
  components: { MoneyItem, ProductIcon },
  props: {
    gameData: { type: Object, required: true },
    gameId: { type: String, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    const coins = [];
    DENOMS.forEach((d) => {
      for (let i = 0; i < (this.gameData.wallet[d] || 0); i += 1)
        coins.push({ id: `${d}-${i}`, value: d, zone: "wallet" });
    });
    return {
      ZONES,
      coins,
      size: 52,
      drag: null,
      suppressClick: false,
      answered: false,
      feedback: "",
    };
  },
  computed: {
    gameIntroText() {
      return this.introText?.Content || "從錢包拿出剛好的錢買東西。";
    },
    trayTotal() {
      return this.inZone("tray").reduce((s, c) => s + c.value, 0);
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  mounted() {
    this.fit();
    window.addEventListener("resize", this.fit);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
    window.removeEventListener("resize", this.fit);
  },
  methods: {
    // 錢包裡的錢最多 15 枚：依視窗寬度決定錢幣大小
    fit() {
      const w = this.gameData.wallet;
      // 鈔票比硬幣寬，每種鈔票多算一格
      const n = this.coins.length + [100, 500, 1000].filter((d) => w[d]).length;
      const wide = window.innerWidth > 1100;
      const base = wide ? 76 : 62;
      this.size = n > 13 ? base - 8 : base;
      this.shrinkToFit();
    },
    // 畫出來若錢包或付款盤放不下（例如 6 種錢幣全放進付款盤），就每次縮小一點直到放得下；放得下就不變
    async shrinkToFit() {
      for (let i = 0; i < 12; i += 1) {
        await this.$nextTick();
        const over = [
          ...(this.$el?.querySelectorAll?.(".zone__coins") || []),
        ].some((el) => el.scrollHeight > el.clientHeight + 1);
        if (!over || this.size <= 34) return;
        this.size -= 4;
      }
    },
    inZone(zone) {
      return this.coins.filter((c) => c.zone === zone);
    },
    groupsIn(zone) {
      return DENOMS.map((d) => ({
        value: d,
        coins: this.coins.filter((c) => c.zone === zone && c.value === d),
      })).filter((g) => g.coins.length);
    },
    move(coin, zone) {
      if (this.answered) return;
      coin.zone = zone;
      this.feedback = "";
      this.shrinkToFit();
      if (this.gameConfig?.WarnOver && this.trayTotal > this.gameData.price)
        this.feedback = this.gameConfig.WarnOver;
    },
    onCoinClick(coin) {
      if (this.suppressClick) {
        this.suppressClick = false;
        return;
      }
      this.move(coin, coin.zone === "wallet" ? "tray" : "wallet");
    },
    clearTray() {
      if (this.answered) return;
      this.coins.forEach((c) => (c.zone = "wallet"));
      this.feedback = "";
    },
    startDrag(event, coin) {
      if (this.answered) return;
      if (event.button !== undefined && event.button !== 0) return;
      this.suppressClick = false;
      this.drag = {
        id: coin.id,
        value: coin.value,
        startX: event.clientX,
        startY: event.clientY,
        x: event.clientX,
        y: event.clientY,
        moved: false,
        over: null,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    zoneAt(event) {
      const el = document.elementFromPoint(event.clientX, event.clientY);
      return el?.closest("[data-zone]")?.dataset.zone || null;
    },
    onDrag(event) {
      if (!this.drag) return;
      this.drag.x = event.clientX;
      this.drag.y = event.clientY;
      if (
        !this.drag.moved &&
        Math.hypot(
          event.clientX - this.drag.startX,
          event.clientY - this.drag.startY
        ) > DRAG_THRESHOLD
      )
        this.drag.moved = true;
      if (this.drag.moved) this.drag.over = this.zoneAt(event);
    },
    endDrag(event) {
      if (!this.drag) return;
      if (this.drag.moved) {
        this.suppressClick = true;
        const zone = this.zoneAt(event);
        const coin = this.coins.find((c) => c.id === this.drag.id);
        if (zone && coin) this.move(coin, zone);
      }
      this.drag = null;
    },
    zoneText(zone) {
      const groups = this.groupsIn(zone);
      if (!groups.length) return "（空）";
      return groups.map((g) => `${g.value}元×${g.coins.length}`).join("＋");
    },
    checkAnswer() {
      if (this.answered) return;
      const { code, name, price, wallet } = this.gameData;
      const total = this.trayTotal;
      if (!this.inZone("tray").length) {
        this.feedback = "先把錢放到付款盤喔！";
        return;
      }
      const isCorrect = total === price;
      const can = DENOMS.filter((d) => wallet[d])
        .map((d) => `${d}元×${wallet[d]}`)
        .join("、");
      this.$emit("add-record", [
        `${code} ${name} ${price} 元（可用：${can}）`,
        `${this.zoneText("tray")}＝${total} 元`,
        isCorrect ? "正確" : "錯誤",
      ]);
      if (isCorrect) {
        this.answered = true;
        this.feedback = "答對了！剛好付清。";
        this.$emit("play-effect", "CorrectSound");
        this.$emit("next-question");
        return;
      }
      // 答錯：保留目前放的錢，告訴學生還差多少或多了多少
      this.feedback =
        total < price
          ? `付款盤有 ${total} 元，還差 ${price - total} 元喔！`
          : `付款盤有 ${total} 元，多了 ${total - price} 元喔！`;
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
  gap: 0.5rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small $padding--medium;
}

.top {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.product-card {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.3rem 1rem;
  background-color: #ffffff;
  border: 4px solid #ffb74d;
  border-radius: 18px;

  &__img {
    width: 6rem;
    height: 5rem;
  }

  &__text p {
    margin: 0;
    font-weight: $font-bold;
  }

  &__name {
    font-size: 1.3rem;
    color: #6d4c41;
  }

  &__price {
    font-size: 2.1rem;
    color: #c62828;
  }
}

.tips {
  flex: 1;

  p {
    margin: 0;
    font-weight: $font-bold;
  }

  &__ask {
    font-size: 1.4rem;
    color: #4e342e;
  }

  &__hint {
    font-size: 1.15rem;
    color: #1565c0;
  }
}

.zones {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.8rem;
}

.zone {
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0.4rem 0.6rem;
  background-color: #fff8e1;
  border: 4px solid #ffcc80;
  border-radius: 18px;
  overflow: hidden;

  &--tray {
    background-color: #e3f2fd;
    border: 4px dashed #64b5f6;
  }

  &--over {
    border-style: solid;
    border-color: #1e88e5;
    box-shadow: 0 0 0 4px #bbdefb;
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 1.25rem;
    font-weight: $font-bold;
    color: #6d4c41;
  }

  &__clear {
    padding: 0.15rem 0.7rem;
    font-size: 1rem;
    font-weight: $font-bold;
    color: #ffffff;
    background-color: #fb8c00;
    border: none;
    border-radius: 10px;
    cursor: pointer;

    &:disabled {
      background-color: #bdbdbd;
      cursor: not-allowed;
    }
  }

  &__coins {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: 0.4rem 0.8rem;
    padding-top: 0.3rem;
  }

  &__group {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 0.15rem;
  }

  &__total {
    margin: 0;
    text-align: right;
    font-size: 1.3rem;
    font-weight: $font-bold;
    color: #0d47a1;
  }
}

.coin {
  padding: 0;
  background: none;
  border: none;
  cursor: grab;
  touch-action: none;
  user-select: none;

  &--dragging {
    opacity: 0.3;
  }
}

.drag-ghost {
  position: fixed;
  z-index: 1000;
  transform: translate(-50%, -50%) scale(1.1);
  pointer-events: none;
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
  .tips__ask {
    font-size: 1.2rem;
  }

  .product-card__price {
    font-size: 1.8rem;
  }
}
</style>

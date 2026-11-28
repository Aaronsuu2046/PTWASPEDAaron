<template>
  <div class="outer-container">
    <div class="title">
      <p>{{ gameIntroText }}</p>
    </div>

    <div class="game-area" :class="{ 'game-area--word': isWord }">
      <div class="left">
        <template v-if="isWord">
          <!-- 應用題：先讀題目，自己把橫式填出來 -->
          <p class="word" data-word>{{ gameData.text }}</p>
          <p class="step">① 依照題目完成橫式</p>
          <div class="hrow" data-hrow>
            <template v-for="f in H_FIELDS" :key="f.key">
              <span v-if="f.key === 'hans'" class="hrow__eq">＝</span>
              <button
                type="button"
                class="hcell"
                :class="[
                  inputClass(f.key),
                  `hcell--${f.size}`,
                  { 'hcell--op': f.key === 'hop' },
                ]"
                :data-input="f.key"
                data-pad-field
                :aria-label="f.label"
                @click="activate($event, f.key)"
              >
                {{ hShow(f.key) }}
              </button>
            </template>
          </div>
          <!-- 積木輔助：先放第一個數，再把十條、方塊拖進來（或點一下）加上去；不計分 -->
          <div class="aid" data-pad-avoid>
            <div
              class="aid__board"
              :class="{ 'aid__board--over': aidOver }"
              data-aid
            >
              <BaseTenBlocks
                :tens="aid.tens"
                :ones="aid.ones"
                :unit="aidUnit"
                variant="orange"
              />
              <!-- 減法：積木圖上可以用畫筆圈、劃掉（計算紙），不計分 -->
              <DrawingBoard
                v-if="isSub"
                ref="paper"
                class="aid__paper"
                :component-config="brush"
              />
            </div>
            <div v-if="isSub" class="aid__side aid__side--tools">
              <span class="aid__label">計算紙</span>
              <button
                v-for="t in PAPER_TOOLS"
                :key="t.id"
                type="button"
                class="aid__tool"
                :class="{ 'aid__tool--on': tool === t.id }"
                :data-paper="t.id"
                @click="useTool(t.id)"
              >
                {{ t.label }}
              </button>
            </div>
            <div v-else class="aid__side">
              <button
                v-for="k in ['ten', 'one']"
                :key="k"
                type="button"
                class="aid__src"
                :data-aid-src="k"
                :aria-label="k === 'ten' ? '加一條十' : '加一個一'"
                @pointerdown="startAidDrag($event, k)"
                @pointermove="onAidDrag"
                @pointerup="endAidDrag($event, k)"
                @pointercancel="aidDrag = null"
              >
                <BaseTenBlocks
                  :tens="k === 'ten' ? 1 : 0"
                  :ones="k === 'one' ? 1 : 0"
                  :unit="aidUnit"
                  variant="orange"
                />
              </button>
              <button
                type="button"
                class="aid__reset"
                data-aid-reset
                @click="resetAid"
              >
                重來
              </button>
            </div>
          </div>
          <p class="step">② 把橫式的數字和符號拖到直式（或點一下再點格子）</p>
        </template>
        <template v-else>
          <p class="equation" data-equation>
            {{ gameData.a }} {{ OP_SHOW }} {{ gameData.b }} ＝
          </p>
          <p class="step">① 把數字和符號拖到直式（或點一下再點格子）</p>
        </template>
        <div class="tiles" data-zone="tiles">
          <button
            v-for="tile in trayTiles"
            :key="tile.id"
            type="button"
            class="tile"
            :class="{
              'tile--op': tile.id === 'op',
              'tile--selected': selected === tile.id,
            }"
            :data-tile="tile.id"
            @pointerdown="startDrag($event, tile.id)"
            @pointermove="onDrag"
            @pointerup="endDrag"
            @pointercancel="drag = null"
            @click="onTileClick(tile.id)"
          >
            {{ tile.text }}
          </button>
          <span v-if="!trayTiles.length" class="tiles__done">{{
            isWord && !hReady ? "先完成上面的橫式" : "都放好了！"
          }}</span>
        </div>
        <p class="step">
          {{ isWord ? "③" : "②" }} 用直式算算看，答案填在最下面一列
        </p>
        <p
          v-if="feedback"
          class="feedback"
          :class="{ 'feedback--ok': answered }"
        >
          {{ feedback }}
        </p>
      </div>

      <!-- 直式：第 0 欄放運算符號，後面是位值欄（加法：百、十、個；減法：十、個） -->
      <div class="form" :style="{ '--cols': cols }" data-pad-avoid>
        <div class="form__heads">
          <span />
          <span v-for="h in heads" :key="h">{{ h }}</span>
        </div>
        <!-- 加法：十位、百位上方的進位格；減法：十位、個位上方的退位標記 -->
        <div class="form__row form__row--carry">
          <span />
          <template v-for="col in cols" :key="`m${col}`">
            <button
              v-if="markCols.includes(col)"
              type="button"
              class="cell cell--carry"
              :class="[inputClass(`mark${col}`), { 'cell--borrow': isSub }]"
              :data-input="`mark${col}`"
              data-pad-field
              :aria-label="markLabel(col)"
              @click="activate($event, `mark${col}`)"
            >
              {{ values[`mark${col}`] ?? "" }}
            </button>
            <span v-else />
          </template>
        </div>
        <!-- 兩列算式：學生拖進來的數 -->
        <div v-for="row in 2" :key="`r${row}`" class="form__row">
          <span
            class="cell cell--op"
            :class="{
              'cell--target': row === 2 && dropHint === 'op',
              'cell--wrong': row === 2 && wrongKeys.includes('op'),
            }"
            :data-cell="row === 2 ? 'op' : null"
            @click="row === 2 && placeSelected('op')"
          >
            <span
              v-if="row === 2 && placed.op"
              class="placed placed--op"
              data-placed="op"
              @click.stop="unplace('op')"
              >{{ OP_SHOW }}</span
            >
          </span>
          <span
            v-for="col in cols"
            :key="`r${row}c${col}`"
            class="cell cell--digit"
            :class="{
              'cell--struck': isStruck(row, col),
              'cell--target': dropHint === `r${row}c${col}`,
              'cell--wrong':
                wrongRows.includes(row) && digitAt(row, col) !== '',
            }"
            :data-cell="`r${row}c${col}`"
            @click="placeSelected(`r${row}c${col}`)"
          >
            <span
              v-if="digitAt(row, col) !== ''"
              class="placed"
              :data-placed="tileAt(row)"
              @click.stop="unplace(tileAt(row))"
              >{{ digitAt(row, col) }}</span
            >
          </span>
        </div>
        <div class="form__line" />
        <!-- 答案列 -->
        <div class="form__row">
          <span class="cell cell--op">＝</span>
          <button
            v-for="col in cols"
            :key="`a${col}`"
            type="button"
            class="cell cell--answer"
            :class="inputClass(`ans${col}`)"
            :data-input="`ans${col}`"
            data-pad-field
            :aria-label="`答案的${heads[col - 1]}`"
            @click="activate($event, `ans${col}`)"
          >
            {{ values[`ans${col}`] ?? "" }}
          </button>
        </div>
      </div>

      <FieldPad
        :field="active && !answered ? activeEl : null"
        :kind="active === 'hop' ? 'operator' : 'number'"
        :operators="['+', '-']"
        @press="press"
        @close="active = null"
      />
    </div>

    <div
      v-if="drag && drag.moved"
      class="tile drag-ghost"
      :class="{ 'tile--op': drag.id === 'op' }"
      :style="{ left: `${drag.x}px`, top: `${drag.y}px` }"
    >
      {{ textOf(drag.id) }}
    </div>
  </div>
</template>

<script>
import { subComponentsVerifyAnswer as emitter } from "@/lib/mitt.js";
import FieldPad from "../../Grade4/games/Common/FieldPad.vue";
import BaseTenBlocks from "../components/BaseTenBlocks.vue";
import DrawingBoard from "@/components/DrawingBoard.vue";

const HEADS = ["百位", "十位", "個位"];
const DRAG_THRESHOLD = 8;
// 應用題模式（GameConfig.WordProblem）的橫式欄位
const H_FIELDS = [
  { key: "ha", label: "第一個數", size: "2" },
  { key: "hop", label: "運算符號", size: "op" },
  { key: "hb", label: "第二個數", size: "2" },
  { key: "hans", label: "答案", size: "3" },
];
const H_MAX = { ha: 2, hb: 2, hans: 3 };
const OP_TEXT = { "+": "＋", "-": "－" };
// 減法應用題的計算紙工具
const PAPER_TOOLS = [
  { id: "pen", label: "畫筆" },
  { id: "eraser", label: "橡皮擦" },
  { id: "clear", label: "清除" },
];
const PEN = { color: "#e53935", size: 3 };
const ERASER = { color: "eraser", size: 18 };

// 二位數加減法：橫式轉直式與計算（GameConfig.Op＝"+" 加法、"-" 減法）
// 減法：被減數放上面，只有十、個兩欄；個位不夠減時，十位上方填借 1 後的數（被減數的十位會畫線）、個位上方填 10
// 題目 { code, a, b, answer }
// ① 把 a、b 兩張數字卡與「＋」拖進直式：數字卡放下的那一格是它的最高位，所以要讓個位對齊個位欄；
//    兩個數放哪一列都可以，「＋」放在第二列左邊
// ② 在答案列填百、十、個位（答案只有兩位時百位空著），要進位的位在上方進位格填 1、不進位就空著
// 送出時全部都要完成；答錯只標示錯的地方
// 選填 GameConfig.WordProblem：題目 { text, a, b, answer } 先讀文字題、用數字鍵盤／符號鍵盤填橫式
// （加法兩個數前後對調也算對），直式的數字卡改用學生填的數；積木輔助可加十條、方塊，不計分
export default {
  name: "VerticalCalc",
  components: { FieldPad, BaseTenBlocks, DrawingBoard },
  props: {
    gameData: { type: Object, required: true },
    gameConfig: { type: Object, default: () => ({}) },
    introText: { type: Object, default: null },
  },
  emits: ["play-effect", "next-question", "add-record"],
  data() {
    return {
      HEADS,
      H_FIELDS,
      aid: this.initialAid(),
      aidUnit: 7,
      PAPER_TOOLS,
      tool: "pen",
      brush: { ...PEN },
      aidDrag: null,
      aidOver: false,
      // 每張數字卡放在哪一列、從哪一欄開始（1～3）
      placed: { a: null, b: null, op: false },
      selected: null,
      drag: null,
      dropHint: null,
      suppressClick: false,
      values: {},
      active: null,
      activeEl: null,
      wrongKeys: [],
      wrongRows: [],
      answered: false,
      feedback: "",
    };
  },
  computed: {
    isWord() {
      return !!this.gameConfig?.WordProblem;
    },
    // 橫式的兩個數和符號都填了，才拿得到數字卡
    hReady() {
      return !!(this.values.ha && this.values.hb && this.values.hop);
    },
    isSub() {
      return this.gameConfig?.Op === "-";
    },
    OP_SHOW() {
      return this.isSub ? "－" : "＋";
    },
    // 位值欄數：加法有百、十、個；減法（二位數）只有十、個
    cols() {
      return this.isSub ? 2 : 3;
    },
    heads() {
      return HEADS.slice(3 - this.cols);
    },
    // 上方標記格放在第 1、2 欄：加法是百、十位的進位；減法是十位借 1 後的數、個位加的 10
    markCols() {
      return [1, 2];
    },
    gameIntroText() {
      return (
        this.introText?.Content ||
        "把橫式的數字與符號，拖到直式中。接著，練習用直式計算。"
      );
    },
    trayTiles() {
      if (this.isWord && !this.hReady) return [];
      return ["a", "op", "b"]
        .filter((id) => (id === "op" ? !this.placed.op : !this.placed[id]))
        .map((id) => ({ id, text: this.textOf(id) }));
    },
    // 正確的標記格與答案；沒有的位是空字串
    expected() {
      const { a, b, answer } = this.gameData;
      if (this.isSub) {
        const borrow = a % 10 < b % 10;
        return {
          mark1: borrow ? String(Math.floor(a / 10) - 1) : "",
          mark2: borrow ? "10" : "",
          ans1: answer >= 10 ? String(Math.floor(answer / 10)) : "",
          ans2: String(answer % 10),
        };
      }
      const carryT = (a % 10) + (b % 10) >= 10;
      const tensSum =
        (Math.floor(a / 10) % 10) +
        (Math.floor(b / 10) % 10) +
        (carryT ? 1 : 0);
      const carryH = tensSum >= 10;
      return {
        mark1: carryH ? "1" : "",
        mark2: carryT ? "1" : "",
        ans1: answer >= 100 ? String(Math.floor(answer / 100)) : "",
        ans2: String(Math.floor(answer / 10) % 10),
        ans3: String(answer % 10),
      };
    },
  },
  created() {
    emitter.on("submitAnswer", this.checkAnswer);
  },
  beforeUnmount() {
    emitter.off("submitAnswer", this.checkAnswer);
  },
  methods: {
    markLabel(col) {
      if (this.isSub)
        return col === 1 ? "十位借 1 之後剩下的數" : "個位加上的 10";
      return `${this.heads[col - 1]}的進位`;
    },
    // 減法：十位上方填了借位後的數，就把被減數的十位畫一條線
    isStruck(row, col) {
      return (
        this.isSub &&
        col === 1 &&
        this.tileAt(row) === "a" &&
        !!this.values.mark1
      );
    },
    textOf(id) {
      if (this.isWord) {
        if (id === "op") return OP_TEXT[this.values.hop] || "";
        return this.values[id === "a" ? "ha" : "hb"] || "";
      }
      if (id === "op") return this.OP_SHOW;
      return String(this.gameData[id]);
    },
    hShow(key) {
      const v = this.values[key] || "";
      return key === "hop" ? OP_TEXT[v] || "" : v;
    },
    // ── 積木輔助（應用題模式）──
    initialAid() {
      const a = Number(this.gameData.a) || 0;
      return { tens: Math.floor(a / 10), ones: a % 10 };
    },
    addAid(kind) {
      if (this.answered) return;
      const aid = { ...this.aid };
      if (kind === "ten") aid.tens = Math.min(aid.tens + 1, 30);
      else aid.ones = Math.min(aid.ones + 1, 30);
      this.aid = aid;
    },
    useTool(id) {
      if (id === "clear") {
        this.$refs.paper?.clear();
        return;
      }
      this.tool = id;
      this.brush = id === "eraser" ? { ...ERASER } : { ...PEN };
    },
    resetAid() {
      this.aid = this.initialAid();
    },
    startAidDrag(event, kind) {
      if (this.answered) return;
      if (event.button !== undefined && event.button !== 0) return;
      this.aidDrag = { kind, x: event.clientX, y: event.clientY, moved: false };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    onAidDrag(event) {
      if (!this.aidDrag) return;
      if (
        Math.hypot(
          event.clientX - this.aidDrag.x,
          event.clientY - this.aidDrag.y
        ) > DRAG_THRESHOLD
      )
        this.aidDrag.moved = true;
      if (this.aidDrag.moved) {
        const el = document.elementFromPoint(event.clientX, event.clientY);
        this.aidOver = !!el?.closest?.("[data-aid]");
      }
    },
    // 點一下或拖到積木板上都加一塊；拖到別處不算
    endAidDrag(event, kind) {
      if (!this.aidDrag) return;
      const { moved } = this.aidDrag;
      const el = document.elementFromPoint(event.clientX, event.clientY);
      if (!moved || el?.closest?.("[data-aid]")) this.addAid(kind);
      this.aidDrag = null;
      this.aidOver = false;
    },
    tileAt(row) {
      return ["a", "b"].find((id) => this.placed[id]?.row === row) || null;
    },
    // 某列某欄顯示的數字（沒有就是空字串）
    digitAt(row, col) {
      const id = this.tileAt(row);
      if (!id) return "";
      const text = this.textOf(id);
      const i = col - this.placed[id].col;
      return i >= 0 && i < text.length ? text[i] : "";
    },
    // 放到某一格：數字卡要放得下（不能超出個位欄），已經有卡的列會把舊的卡退回
    place(id, cell) {
      if (this.answered || !id) return false;
      if (id === "op") {
        if (cell !== "op") return false;
        this.placed = { ...this.placed, op: true };
      } else {
        const m = /^r(\d)c(\d)$/.exec(cell || "");
        if (!m) return false;
        const row = Number(m[1]);
        const col = Number(m[2]);
        if (col + this.textOf(id).length - 1 > this.cols) {
          this.feedback = "放不下喔！數字卡放下的那一格是它的最高位。";
          return false;
        }
        const placed = { ...this.placed };
        const other = this.tileAt(row);
        if (other && other !== id) placed[other] = null;
        placed[id] = { row, col };
        this.placed = placed;
        this.wrongRows = this.wrongRows.filter((r) => r !== row);
      }
      this.wrongKeys = this.wrongKeys.filter((k) => k !== id && k !== "op");
      this.feedback = "";
      return true;
    },
    unplace(id) {
      if (this.answered || !id) return;
      if (this.suppressClick) {
        this.suppressClick = false;
        return;
      }
      if (id === "op") this.placed = { ...this.placed, op: false };
      else {
        const row = this.placed[id]?.row;
        this.placed = { ...this.placed, [id]: null };
        this.wrongRows = this.wrongRows.filter((r) => r !== row);
      }
    },
    onTileClick(id) {
      if (this.suppressClick) {
        this.suppressClick = false;
        return;
      }
      this.selected = this.selected === id ? null : id;
    },
    placeSelected(cell) {
      if (!this.selected) return;
      if (this.place(this.selected, cell)) this.selected = null;
    },
    startDrag(event, id) {
      if (this.answered) return;
      if (event.button !== undefined && event.button !== 0) return;
      this.suppressClick = false;
      this.drag = {
        id,
        startX: event.clientX,
        startY: event.clientY,
        x: event.clientX,
        y: event.clientY,
        moved: false,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    cellAt(event) {
      const el = document.elementFromPoint(event.clientX, event.clientY);
      return el?.closest("[data-cell]")?.dataset.cell || null;
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
      if (this.drag.moved) this.dropHint = this.cellAt(event);
    },
    endDrag(event) {
      if (!this.drag) return;
      if (this.drag.moved) {
        this.suppressClick = true;
        this.place(this.drag.id, this.cellAt(event));
        this.selected = null;
      }
      this.drag = null;
      this.dropHint = null;
    },
    inputClass(key) {
      return {
        "cell--active": this.active === key && !this.answered,
        "cell--wrong": this.wrongKeys.includes(key),
        "cell--correct": this.answered,
      };
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
      const values = { ...this.values };
      // 減法個位上方要填 10，可以放兩位；橫式的數可以放兩、三位；其他格只放一位
      const max = H_MAX[k] || (this.isSub && k === "mark2" ? 2 : 1);
      const cur = values[k] || "";
      if (k === "hop") {
        if (key === "clear" || key === "←") delete values[k];
        else if (OP_TEXT[key]) values[k] = key;
      } else if (key === "clear") delete values[k];
      else if (key === "←") {
        if (cur.length > 1) values[k] = cur.slice(0, -1);
        else delete values[k];
      } else if (/^\d$/.test(key))
        values[k] = max > 1 && cur.length < max ? cur + key : key;
      this.values = values;
      this.wrongKeys = this.wrongKeys.filter((w) => w !== k);
      this.feedback = "";
    },
    // 直式的樣子寫成一行（紀錄用）
    formText() {
      const row = (r) => {
        const id = this.tileAt(r);
        if (!id) return "（空）";
        const pad = this.placed[id].col - 1;
        return `${"_".repeat(pad)}${this.textOf(id)}${"_".repeat(
          this.cols - pad - this.textOf(id).length
        )}`;
      };
      return `${row(1)}／${this.placed.op ? this.OP_SHOW : ""}${row(2)}`;
    },
    answerText(pick) {
      const marks = this.markCols.map((c) => pick(`mark${c}`) || "_");
      const ans = Array.from(
        { length: this.cols },
        (_, i) => pick(`ans${i + 1}`) || "_"
      ).join("");
      const label = this.isSub ? "退位" : "進位";
      return `${label} ${marks.join(this.isSub ? "、" : "")}，答案 ${ans}`;
    },
    // 答案前面沒有的位：空著或填 0 都可以
    sameValue(key, expected) {
      const v = this.values[key] || "";
      if (expected === "" && key.startsWith("ans"))
        return v === "" || v === "0";
      return v === expected;
    },
    // 應用題：橫式各格對不對（加法兩個數對調也可以）
    hWrongKeys() {
      const { a, b, answer } = this.gameData;
      const v = this.values;
      const op = this.isSub ? "-" : "+";
      const wrong = [];
      const na = Number(v.ha);
      const nb = Number(v.hb);
      const inOrder = na === a && nb === b;
      const swapped = !this.isSub && na === b && nb === a;
      if (!inOrder && !swapped) {
        if (na !== a && !(!this.isSub && na === b)) wrong.push("ha");
        if (nb !== b && !(!this.isSub && nb === a)) wrong.push("hb");
        if (!wrong.length) wrong.push("ha", "hb");
      }
      if (v.hop !== op) wrong.push("hop");
      if (Number(v.hans) !== answer) wrong.push("hans");
      return wrong;
    },
    checkAnswer() {
      if (this.answered) return;
      const { code, a, b, answer } = this.gameData;
      if (this.isWord) {
        const empty = H_FIELDS.map((f) => f.key).filter((k) => !this.values[k]);
        if (empty.length) {
          this.wrongKeys = empty;
          this.feedback = "先依照題目把橫式填完喔！";
          return;
        }
      }
      if (!this.placed.a || !this.placed.b || !this.placed.op) {
        this.feedback = `先把兩個數和「${this.OP_SHOW}」都放進直式喔！`;
        return;
      }
      const exp = this.expected;
      const needed = Object.keys(exp).filter(
        (k) => k.startsWith("ans") && exp[k] !== ""
      );
      const empty = needed.filter((k) => !this.values[k]);
      if (empty.length) {
        this.wrongKeys = empty;
        this.feedback = "答案還沒填完喔！";
        return;
      }
      // 對齊：數字卡的個位要在個位欄（最後一欄）
      this.wrongRows = [1, 2].filter((r) => {
        const id = this.tileAt(r);
        return this.placed[id].col + this.textOf(id).length - 1 !== this.cols;
      });
      // 減法：被減數要放在上面
      const swapped = this.isSub && this.tileAt(1) !== "a";
      if (swapped) this.wrongRows = [1, 2];
      this.wrongKeys = Object.keys(exp).filter(
        (k) => !this.sameValue(k, exp[k])
      );
      if (this.isWord) this.wrongKeys.push(...this.hWrongKeys());
      const isCorrect = !this.wrongRows.length && !this.wrongKeys.length;
      this.$emit("add-record", [
        `${code} ${a}${this.OP_SHOW}${b}＝${answer}（${this.answerText((k) => exp[k])}）`,
        `${
          this.isWord
            ? `橫式 ${this.values.ha}${OP_TEXT[this.values.hop] || "?"}${this.values.hb}＝${this.values.hans}；`
            : ""
        }直式 ${this.formText()}，${this.answerText((k) => this.values[k])}`,
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
      if (this.wrongKeys.some((k) => k.startsWith("h")))
        tips.push("再讀一次題目，橫式紅色的格子不對");
      if (swapped) tips.push("被減數要放在上面");
      else if (this.wrongRows.length) tips.push("個位要對齊個位");
      if (this.wrongKeys.some((k) => k.startsWith("mark")))
        tips.push(
          this.isSub
            ? "個位不夠減時，十位借 1（十位寫少 1 的數）、個位加 10；不用退位就空著"
            : "滿 10 要進位，沒進位的格子空著"
        );
      if (this.wrongKeys.some((k) => k.startsWith("ans")))
        tips.push("再算一次紅色的格子");
      this.feedback = `紅色的地方不對喔！${tips.join("；")}。`;
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
  align-items: center;
  gap: 1.6rem;
  background-color: $sub-color;
  border-radius: $border-radius;
  padding: $padding--small $padding--medium;
}

.left {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
}

.equation {
  margin: 0;
  padding: 0.2rem 1.6rem;
  font-size: 3rem;
  font-weight: $font-bold;
  color: #0d47a1;
  background-color: #ffffff;
  border-radius: 18px;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.08);
}

// 應用題模式：內容較多，靠上排、間距小一點
.game-area--word {
  align-items: flex-start;

  .left {
    gap: 0.35rem;
    align-self: stretch;
    justify-content: center;
  }

  .tiles {
    min-height: 3.8rem;
  }

  .tile {
    height: 3.6rem;
    min-width: 4.2rem;
    font-size: 2rem;
  }

  .form {
    align-self: center;
  }

  @media (max-width: 1100px), (max-height: 760px) {
    .word {
      font-size: 1.15rem;
    }

    .step {
      font-size: 1rem;
    }

    .tiles {
      min-height: 3.2rem;
    }

    .tile {
      height: 3rem;
      font-size: 1.7rem;
    }

    .hcell {
      height: 2.9rem;
      font-size: 1.7rem;
    }
  }
}

.word {
  margin: 0;
  padding: 0.3rem 1rem;
  font-size: 1.4rem;
  font-weight: $font-bold;
  line-height: 1.4;
  color: #3e2723;
  background-color: #ffffff;
  border-radius: 14px;
}

.hrow {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-right: 0.2rem;

  &__eq {
    font-size: 2rem;
    color: #333333;
  }
}

.hcell {
  position: relative;
  height: 3.4rem;
  font-size: 2rem;
  font-weight: $font-bold;
  color: #1565c0;
  background-color: #ffffff;
  border: 3px dashed #90a4ae;
  border-radius: 10px;
  cursor: pointer;

  &--2 {
    width: 4.6rem;
  }

  &--3 {
    width: 5.6rem;
  }

  &--op {
    width: 3.4rem;
    color: #e65100;
  }

  &.cell--active {
    border-style: solid;
    border-color: #1e88e5;
    box-shadow: 0 0 0 3px #90caf9;
  }

  &.cell--wrong {
    border-style: solid;
    border-color: #e53935;
    background-color: #ffebee;
  }

  &.cell--correct {
    border-style: solid;
    border-color: #43a047;
    background-color: #e8f5e9;
  }
}

.aid {
  display: flex;
  align-items: stretch;
  gap: 0.5rem;
  max-width: 100%;

  &__board {
    position: relative;
    min-width: 12rem;
    min-height: 4.8rem;
    max-width: 24rem;
    padding: 0.3rem 0.5rem;
    display: flex;
    align-items: center;
    background-color: #ffffff;
    border: 3px solid #ffcc80;
    border-radius: 12px;

    &--over {
      background-color: #fff9c4;
      border-color: #fbc02d;
    }
  }

  &__side {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
  }

  &__src {
    padding: 0.2rem 0.4rem;
    background-color: #fff3e0;
    border: 2px dashed #ffb74d;
    border-radius: 10px;
    cursor: grab;
    touch-action: none;
  }

  &__paper {
    position: absolute;
    inset: 0;
    cursor: crosshair;
    touch-action: none;
  }

  &__side--tools {
    justify-content: center;
  }

  &__label {
    font-size: 0.95rem;
    font-weight: $font-bold;
    color: #6d4c41;
  }

  &__tool {
    width: 4.8rem;
    white-space: nowrap;
    padding: 0.2rem 0;
    font-size: 1rem;
    font-weight: $font-bold;
    color: #ffffff;
    background-color: #90a4ae;
    border: none;
    border-radius: 8px;
    cursor: pointer;

    &--on {
      background-color: #e53935;
    }
  }

  &__reset {
    padding: 0.15rem 0.6rem;
    font-size: 1rem;
    font-weight: $font-bold;
    color: #ffffff;
    background-color: #90a4ae;
    border: none;
    border-radius: 8px;
    cursor: pointer;
  }
}

.step {
  margin: 0;
  font-size: 1.2rem;
  font-weight: $font-bold;
  color: #5d4037;

  &--hint {
    font-weight: normal;
    color: #8d6e63;
  }
}

.tiles {
  min-height: 5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;

  &__done {
    font-size: 1.3rem;
    font-weight: $font-bold;
    color: #43a047;
  }
}

.tile {
  min-width: 5rem;
  height: 4.4rem;
  padding: 0 0.8rem;
  font-size: 2.4rem;
  font-weight: $font-bold;
  color: #ffffff;
  background-color: #1e88e5;
  border: none;
  border-radius: 14px;
  box-shadow: 0 5px 0 #1565c0;
  cursor: grab;
  touch-action: none;
  user-select: none;

  &--op {
    min-width: 4.4rem;
    background-color: #fb8c00;
    box-shadow: 0 5px 0 #e65100;
  }

  &--selected {
    outline: 5px solid #ffeb3b;
  }
}

.drag-ghost {
  position: fixed;
  z-index: 1000;
  transform: translate(-50%, -50%);
  pointer-events: none;
  opacity: 0.9;
}

.form {
  flex: 0 0 auto;
  padding: 0.6rem 1rem 1rem;
  background-color: #ffffff;
  border-radius: 20px;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.08);

  &__heads,
  &__row {
    display: grid;
    grid-template-columns: 3.6rem repeat(var(--cols), 4.2rem);
    gap: 0.4rem;
    justify-items: center;
    align-items: center;
  }

  &__heads span {
    font-size: 1.1rem;
    font-weight: $font-bold;
    color: #6d4c41;
  }

  &__row {
    margin-top: 0.4rem;

    &--carry {
      margin-top: 0.1rem;
    }
  }

  &__line {
    height: 5px;
    margin: 0.5rem 0 0.1rem;
    background-color: #455a64;
    border-radius: 3px;
  }
}

.cell {
  width: 4.2rem;
  height: 4.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.4rem;
  font-weight: $font-bold;
  border-radius: 12px;

  &--op {
    width: 3.6rem;
    color: #e65100;
    border: 3px dashed #ffcc80;
  }

  &--digit {
    color: #0d47a1;
    background-color: #f5f5f5;
    border: 3px dashed #bdbdbd;
  }

  &--carry {
    width: 3rem;
    height: 2.6rem;
    font-size: 1.6rem;
    color: #d81b60;
    background-color: #fce4ec;
    border: 3px dashed #f48fb1;
    cursor: pointer;
  }

  // 減法的退位標記：藍色
  &--borrow {
    color: #1565c0;
    background-color: #e3f2fd;
    border-color: #90caf9;
  }

  // 被減數十位借走 1：畫一條斜線
  &--struck .placed {
    text-decoration: line-through;
    text-decoration-color: #e53935;
    text-decoration-thickness: 4px;
  }

  &--answer {
    color: #0d47a1;
    background-color: #fffde7;
    border: 4px dashed #fb8c00;
    cursor: pointer;
  }

  &--target {
    border-style: solid;
    border-color: #1e88e5;
    background-color: #e3f2fd;
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

.placed {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &--op {
    color: #e65100;
  }
}

.feedback {
  margin: 0;
  padding: 0.3rem 1rem;
  text-align: center;
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
  .equation {
    font-size: 2.4rem;
  }

  .form {
    &__heads,
    &__row {
      grid-template-columns: 3rem repeat(var(--cols), 3.6rem);
    }
  }

  .cell {
    width: 3.6rem;
    height: 3.6rem;
    font-size: 2rem;

    &--op {
      width: 3rem;
    }

    &--carry {
      width: 2.6rem;
      height: 2.2rem;
      font-size: 1.4rem;
    }
  }

  .tile {
    min-width: 4.2rem;
    height: 3.8rem;
    font-size: 2rem;
  }
}
</style>

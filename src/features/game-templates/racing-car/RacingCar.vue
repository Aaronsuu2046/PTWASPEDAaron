<template>
  <div
    ref="container"
    class="gameContainer"
    :class="{ 'gameContainer--race': cfg }"
  >
    <div>
      <h2 v-if="!cfg || gameData.Question">{{ gameData.Question }}</h2>
      <v-stage :config="configKonva">
        <v-layer>
          <v-image
            v-for="(road, index) in configRoad"
            :key="index"
            :config="road"
          />
          <!-- 選填 racingConfig.obstacles：路中段的三角錐 -->
          <v-group
            v-for="ob in configObstacles"
            :key="`ob-${ob.id}`"
            :config="{ x: ob.x, y: ob.y }"
          >
            <v-rect
              :config="{
                x: 0,
                y: ob.s * 0.8,
                width: ob.s,
                height: ob.s * 0.18,
                fill: '#455a64',
                cornerRadius: ob.s * 0.05,
              }"
            />
            <v-line
              :config="{
                points: [
                  ob.s * 0.5,
                  0,
                  ob.s * 0.86,
                  ob.s * 0.82,
                  ob.s * 0.14,
                  ob.s * 0.82,
                ],
                closed: true,
                fill: '#ff7043',
                stroke: '#bf360c',
                strokeWidth: 2,
              }"
            />
            <v-line
              :config="{
                points: [
                  ob.s * 0.36,
                  ob.s * 0.34,
                  ob.s * 0.64,
                  ob.s * 0.34,
                  ob.s * 0.71,
                  ob.s * 0.5,
                  ob.s * 0.29,
                  ob.s * 0.5,
                ],
                closed: true,
                fill: '#ffffff',
              }"
            />
          </v-group>
        </v-layer>

        <v-layer>
          <v-image :config="configCar" />
        </v-layer>

        <v-layer>
          <v-image
            v-for="(tunnel, index) in configTunnel"
            :key="index"
            :config="tunnel"
          />
          <v-rect
            v-for="(box, index) in configTextBox"
            :key="index"
            :config="box"
          />
          <v-text
            v-for="(option, index) in configOption"
            :key="index"
            :config="option"
          />
        </v-layer>
        <v-layer>
          <v-image
            v-for="(smoke, index) in configSmoke"
            :key="index"
            :config="smoke"
          />
          <v-image :config="configEndingImage" />
          <template v-if="banner">
            <v-rect :config="banner.rect" />
            <v-text :config="banner.text" />
          </template>
        </v-layer>
      </v-stage>
    </div>
    <!-- 選填 racingConfig：車子自動前進，只用大的「上／下」鍵換車道 -->
    <div v-if="cfg" ref="drivePanel" class="drivePanel">
      <button
        type="button"
        class="driveBtn"
        aria-label="換到上面的車道"
        @click="getCurrentOptionId('up')"
      >
        <span class="driveBtn__arrow">▲</span>上
      </button>
      <svg class="driveWheel" viewBox="0 0 100 100" aria-hidden="true">
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="#37474f"
          stroke-width="10"
        />
        <circle cx="50" cy="50" r="11" fill="#37474f" />
        <path
          d="M12 46 L39 50 M88 46 L61 50 M50 61 L50 90"
          stroke="#37474f"
          stroke-width="10"
          stroke-linecap="round"
        />
      </svg>
      <button
        type="button"
        class="driveBtn"
        aria-label="換到下面的車道"
        @click="getCurrentOptionId('down')"
      >
        下<span class="driveBtn__arrow">▼</span>
      </button>
    </div>
    <div v-else id="btnContainer">
      <img :src="upBtn" class="controlBtn" @click="getCurrentOptionId('up')" />
      <br />
      <img
        :src="rightBtn"
        class="controlBtn"
        @click="getCurrentOptionId('right')"
      />
      <br />
      <img
        :src="downBtn"
        class="controlBtn"
        @click="getCurrentOptionId('down')"
      />
    </div>
  </div>
</template>

<script>
import { getGameAssets, getGameStaticAssets } from "@/lib/get-assets.js";
import * as canvasTools from "@/lib/canvasTools.js";

// 選填 racingConfig 用：終點隧道在第幾個畫面寬的位置、三角錐的範圍與間距（都以畫面寬為單位）
const TUNNEL_AT = 1.3;
const OB_MIN = 0.42;
const OB_MAX = 0.95;
const OB_GAP = 0.42;
const OB_GAP_SAME = 0.2;
// 車子出發的那條車道，三角錐至少放這麼遠，來得及反應
const OB_MIN_START_LANE = 0.62;

export default {
  props: {
    gameData: {
      type: Object,
      required: true,
    },
    gameId: {
      type: String,
      required: true,
    },
    // 選填：開啟「自動前進、上下換道、障礙物、答對先停住」玩法；不傳就是原本的行為
    // { obstacles: true, holdOnCorrect: true, heightRatio: 0.42 }
    racingConfig: {
      type: Object,
      default: null,
    },
  },

  emits: [
    "play-effect",
    "add-record",
    "next-question",
    "race-correct",
    "race-wrong",
    "race-crash",
  ],
  data() {
    return {
      configKonva: {},
      configRoad: [],
      configTunnel: [],
      configOption: [],
      configTextBox: [],
      configCar: {},
      configEndingImage: null,
      configSmoke: [],

      speed: 1,
      canMove: true,
      movement: "idle",
      currentOptionId: 0,
      configObstacles: [],
      bannerText: "",
      bannerColor: "#c62828",
      raceState: "run",
      inputLocked: false,
      paused: false,

      upBtn: getGameStaticAssets("RacingCar", "arrowUp.jpg"),
      rightBtn: getGameStaticAssets("RacingCar", "arrowRight.jpg"),
      downBtn: getGameStaticAssets("RacingCar", "arrowDown.jpg"),
    };
  },

  computed: {
    cfg() {
      if (!this.racingConfig) return null;
      return {
        obstacles: true,
        holdOnCorrect: true,
        heightRatio: 0.42,
        ...this.racingConfig,
      };
    },
    banner() {
      if (!this.bannerText) return null;
      const fs = this.laneHeight * 0.26;
      const box = {
        x: this.gameWidth * 0.15,
        y: this.gameHeight / 2 - fs * 1.1,
        width: this.gameWidth * 0.7,
        height: fs * 2.2,
      };
      return {
        rect: {
          ...box,
          fill: "rgba(255,255,255,0.94)",
          stroke: this.bannerColor,
          strokeWidth: 5,
          cornerRadius: fs * 0.5,
        },
        text: {
          ...box,
          text: this.bannerText,
          fontSize: fs,
          fontStyle: "bold",
          fontFamily: "sans-serif",
          fill: this.bannerColor,
          align: "center",
          verticalAlign: "middle",
        },
      };
    },
  },

  mounted() {
    this.timers = [];
    this.initializeScene();
    window.addEventListener("keydown", this.input);
    if (this.cfg) {
      window.addEventListener("blur", this.onBlur);
      window.addEventListener("focus", this.onFocus);
    }
    requestAnimationFrame(this.moveRoad);
  },

  beforeUnmount() {
    // 離開時停掉動畫迴圈、計時器和鍵盤監聽
    this.destroyed = true;
    window.removeEventListener("keydown", this.input);
    window.removeEventListener("blur", this.onBlur);
    window.removeEventListener("focus", this.onFocus);
    this.timers.forEach((t) => clearTimeout(t));
  },

  methods: {
    initializeScene() {
      this.options = canvasTools.shuffleOptions(this.gameData.Options);
      this.currentOptionId = Math.floor(Math.random() * this.options.length);
      if (this.cfg) {
        // 寬度扣掉右邊的駕駛區，高度不超過容器
        const el = this.$refs.container;
        const panel = (this.$refs.drivePanel?.offsetWidth || 150) + 24;
        const fitW = el.clientWidth - panel;
        const fitH = (el.clientHeight || fitW) / this.cfg.heightRatio;
        this.gameWidth = Math.max(300, Math.min(fitW, fitH));
        this.gameHeight = this.gameWidth * this.cfg.heightRatio;
        this.speed = this.gameWidth * 0.003;
      } else {
        this.gameWidth = this.$refs.container.clientWidth * 0.8;
        this.gameHeight = this.gameWidth / 2;
      }
      this.configKonva.width = this.gameWidth;
      this.configKonva.height = this.gameHeight;
      this.drawRoad();
      this.drawTunnel();
      this.drawTextBox();
      this.drawOptions();
      this.drawCar();
      if (this.cfg) this.makeObstacles();
      else this.setBtnStyle();
    },
    drawRoad() {
      const roadImg = new window.Image();
      roadImg.src = getGameStaticAssets("RacingCar", "road.png");
      this.laneHeight = this.gameHeight / this.options.length;
      this.roadX = 0;
      for (let i = 0; i < this.options.length; i++) {
        const road = {
          x: 0,
          y: this.laneHeight * i,
          width: this.gameWidth * (this.cfg ? 3 : 2.225),
          height: this.laneHeight,
          image: roadImg,
        };
        this.configRoad.push(road);
      }
    },
    drawTunnel() {
      const tunnelImg = new window.Image();
      tunnelImg.src = getGameStaticAssets("RacingCar", "tunnel.png");
      // 選填 racingConfig：終點放遠一點，中段才有空間放障礙物
      this.tunnelOffset = {
        x: this.gameWidth * (this.cfg ? TUNNEL_AT : 1),
        y: 0,
      };
      for (let i = 0; i < this.options.length; i++) {
        const tunnel = {
          x: canvasTools.offset(this.configRoad[i], this.tunnelOffset).x,
          y: this.laneHeight * i,
          width: this.laneHeight * 2,
          height: this.laneHeight,
          image: tunnelImg,
        };
        this.configTunnel.push(tunnel);
      }
    },
    drawTextBox() {
      this.boxWidth = this.laneHeight * 1;
      this.boxHeight = this.laneHeight * 0.5;
      this.textBoxOffset = {
        x: this.gameWidth + this.laneHeight * 0.75,
        y: this.laneHeight * 0.25,
      };
      if (this.cfg) {
        // 答案框大一點，長的選項可以排兩行
        this.boxWidth = this.laneHeight * 1.5;
        this.boxHeight = this.laneHeight * 0.64;
        this.textBoxOffset = {
          x: this.tunnelOffset.x + this.laneHeight * 0.3,
          y: this.laneHeight * 0.18,
        };
      }
      for (let i = 0; i < this.options.length; i++) {
        const box = {
          cornerRadius: this.laneHeight * 0.1,
          stroke: "black",
          strokeWidth: this.cfg ? 3 : 1,
          fill: this.cfg ? "#fffde7" : "white",
          x: canvasTools.offset(this.configRoad[i], this.textBoxOffset).x,
          y: canvasTools.offset(this.configRoad[i], this.textBoxOffset).y,
          width: this.boxWidth,
          height: this.boxHeight,
        };
        this.configTextBox.push(box);
      }
    },
    drawOptions() {
      this.optionOffset = {
        x: this.gameWidth + this.laneHeight * 0.85,
        y: this.laneHeight * 0.325,
      };
      if (this.cfg) {
        this.optionOffset = { ...this.textBoxOffset };
        for (let i = 0; i < this.options.length; i++) {
          this.configOption.push({
            x: canvasTools.offset(this.configRoad[i], this.optionOffset).x,
            y: canvasTools.offset(this.configRoad[i], this.optionOffset).y,
            width: this.boxWidth,
            height: this.boxHeight,
            fontSize: this.optionFontSize(),
            fontStyle: "bold",
            fontFamily: "sans-serif",
            fill: "#0d47a1",
            text: this.optionLines(this.options[i]),
            wrap: "none",
            align: "center",
            verticalAlign: "middle",
            padding: this.laneHeight * 0.05,
            lineHeight: 1.2,
          });
        }
        return;
      }
      for (let i = 0; i < this.options.length; i++) {
        const len = this.options[i].toString().length;
        const fontSize = this.boxWidth / len;
        const option = {
          x: canvasTools.offset(this.configRoad[i], this.optionOffset).x,
          y: canvasTools.offset(this.configRoad[i], this.optionOffset).y,
          fontSize,
          text: this.options[i],
          wrap: "word",
          width: this.boxWidth * 0.8,
          align: "center",
          padding: 5,
          lineHeight: 1.2,
        };
        this.configOption.push(option);
      }
    },
    drawCar() {
      const carImg = new window.Image();
      carImg.src = getGameStaticAssets("RacingCar", "car.png");
      this.configCar.image = carImg;
      this.configCar.height = this.laneHeight * 0.8;
      this.configCar.width = this.laneHeight * 0.8;
      this.carOffset = { x: this.laneHeight * 0.2, y: this.laneHeight * 0.1 };
      this.configCar.x = canvasTools.offset(
        this.configRoad[this.currentOptionId],
        this.carOffset
      ).x;
      this.configCar.y = canvasTools.offset(
        this.configRoad[this.currentOptionId],
        this.carOffset
      ).y;
    },
    setBtnStyle() {
      const btnCon = document.getElementById("btnContainer");
      btnCon.style.height = this.configKonva.height + "px";
    },
    moveRoad() {
      if (this.destroyed) return;
      if (this.cfg) {
        this.raceStep();
        return;
      }
      if (this.roadX < this.gameWidth * -1.2) {
        this.checkAnswer();
      } else {
        this.roadX -= this.speed;
        this.syncRoadX();
        requestAnimationFrame(this.moveRoad);
      }
    },
    syncRoadX() {
      for (const road in this.configRoad) this.configRoad[road].x = this.roadX;
      for (const tunnel in this.configTunnel)
        this.configTunnel[tunnel].x = canvasTools.offset(
          this.configRoad[0],
          this.tunnelOffset
        ).x;
      for (const option in this.configOption)
        this.configOption[option].x = canvasTools.offset(
          this.configRoad[0],
          this.optionOffset
        ).x;
      for (const box in this.configTextBox)
        this.configTextBox[box].x = canvasTools.offset(
          this.configRoad[0],
          this.textBoxOffset
        ).x;
      for (const ob of this.configObstacles) ob.x = this.roadX + ob.ox;
    },
    moveCar() {
      if (this.destroyed) return;
      if (this.cfg) {
        this.moveCarSmooth();
        return;
      }
      switch (this.movement) {
        case "up":
          if (
            this.configCar.y >
            canvasTools.offset(
              this.configRoad[this.currentOptionId],
              this.carOffset
            ).y
          ) {
            this.configCar.y -= this.speed * 4;
            this.configCar.rotation = -10;
            requestAnimationFrame(this.moveCar);
          } else {
            this.configCar.rotation = 0;
            this.canMove = true;
            this.movement = "idle";
          }
          break;
        case "down":
          if (
            this.configCar.y <
            canvasTools.offset(
              this.configRoad[this.currentOptionId],
              this.carOffset
            ).y
          ) {
            this.configCar.y += this.speed * 4;
            this.configCar.rotation = 10;
            requestAnimationFrame(this.moveCar);
          } else {
            this.configCar.rotation = 0;
            this.canMove = true;
            this.movement = "idle";
          }
          break;
      }
    },
    input(e) {
      //W = 38/87; A = 37/65; S = 40/83; D = 39/68
      //console.log(e.keyCode);
      if (this.cfg) {
        // 只有上下換道；方向鍵不要捲動頁面
        if ([38, 87].includes(e.keyCode)) {
          e.preventDefault();
          this.getCurrentOptionId("up");
        } else if ([40, 83].includes(e.keyCode)) {
          e.preventDefault();
          this.getCurrentOptionId("down");
        }
        return;
      }
      switch (e.keyCode) {
        case 38:
        case 87:
          this.getCurrentOptionId("up");
          break;

        case 40:
        case 83:
          this.getCurrentOptionId("down");
          break;

        case 32:
        case 39:
        case 68:
          this.getCurrentOptionId("right");
          break;
      }
    },
    getCurrentOptionId(direction) {
      if (
        this.cfg &&
        (direction === "right" ||
          this.inputLocked ||
          this.paused ||
          this.raceState !== "run")
      )
        return;
      if (this.canMove) {
        switch (direction) {
          case "up":
            this.currentOptionId--;
            if (this.currentOptionId < 0) this.currentOptionId = 0;
            else {
              this.movement = "up";
              this.canMove = false;
              requestAnimationFrame(this.moveCar);
            }
            break;
          case "down":
            this.currentOptionId++;
            if (this.currentOptionId > this.options.length - 1)
              this.currentOptionId = this.options.length - 1;
            else {
              this.movement = "down";
              this.canMove = false;
              requestAnimationFrame(this.moveCar);
            }
            break;
          case "right":
            this.speed = 10;
            this.canMove = false;
        }
      }
    },
    checkAnswer() {
      if (this.cfg) {
        this.raceJudge();
        return;
      }
      if (
        this.options[this.currentOptionId] ===
        this.gameData.Options[this.gameData.Answer]
      ) {
        this.$emit("play-effect", "CorrectSound");
        this.$emit("add-record", [
          this.gameData.Options[this.gameData.Answer],
          this.options[this.currentOptionId],
          "正確",
        ]);
        this.drawSmoke();
        this.endingFrameCount = 0;
        requestAnimationFrame(this.endingAnimation);
      } else {
        this.$emit("play-effect", "WrongSound");
        this.$emit("add-record", [
          this.gameData.Options[this.gameData.Answer],
          this.options[this.currentOptionId],
          "錯誤",
        ]);
        this.replay();
      }
    },

    replay() {
      this.roadX = 0;
      this.speed = 1;
      this.canMove = true;
      requestAnimationFrame(this.moveRoad);
    },
    endingAnimation() {
      if (this.destroyed) return;
      if (this.cfg) {
        // 答對：車子開進隧道，停住等外面顯示解題過程
        if (this.configCar.x > this.gameWidth) return;
        this.configCar.x += this.speed * 2;
        requestAnimationFrame(this.endingAnimation);
        return;
      }
      if (
        this.configCar.x > this.gameWidth &&
        this.configEndingImage === null
      ) {
        this.$emit("next-question");
      } else {
        this.configCar.x += this.speed;
        this.moveSmoke();
        requestAnimationFrame(this.endingAnimation);
      }
      this.endingFrameCount++;
      if (this.endingFrameCount % 20 === 0 && this.configCar.x < this.gameWidth)
        this.drawSmoke();
    },
    // ---------- 以下只有選填 racingConfig 會用到 ----------
    later(fn, ms) {
      const t = setTimeout(() => {
        this.timers = this.timers.filter((x) => x !== t);
        if (!this.destroyed) fn();
      }, ms);
      this.timers.push(t);
    },
    onBlur() {
      this.paused = true;
    },
    onFocus() {
      this.paused = false;
      if (this.waitingResume) {
        this.waitingResume = false;
        requestAnimationFrame(this.moveRoad);
      }
    },
    // 長的選項拆成兩行（選項裡有換行字元就照它斷），字級取所有選項都放得下的大小
    optionLines(text) {
      const str = String(text);
      if (str.includes("\n") || str.length <= 6) return str;
      const cut = Math.ceil(str.length / 2);
      return `${str.slice(0, cut)}\n${str.slice(cut)}`;
    },
    optionFontSize() {
      const lines = this.options.map((o) => this.optionLines(o).split("\n"));
      const longest = Math.max(...lines.flat().map((l) => l.length));
      const rows = Math.max(...lines.map((l) => l.length));
      return Math.min(
        this.laneHeight * 0.22,
        (this.boxWidth * 0.86) / longest,
        (this.boxHeight * 0.8) / (rows * 1.2)
      );
    },
    laneY(lane) {
      return this.laneHeight * lane + this.carOffset.y;
    },
    // 每題 0～2 個三角錐，只放在道路中段；同一個位置不會把上下兩條路都擋住，
    // 擋在不同車道的兩個錐子前後至少隔一段距離，來得及換道
    makeObstacles() {
      this.configObstacles = [];
      if (!this.cfg.obstacles) return;
      const r = Math.random();
      const count = r < 0.3 ? 0 : r < 0.7 ? 1 : 2;
      const gw = this.gameWidth;
      const size = this.laneHeight * 0.5;
      const lanes = this.options.length;
      const list = [];
      for (let tries = 0; list.length < count && tries < 60; tries++) {
        const ox = gw * (OB_MIN + Math.random() * (OB_MAX - OB_MIN));
        const lane = Math.floor(Math.random() * lanes);
        if (lane === this.currentOptionId && ox < gw * OB_MIN_START_LANE)
          continue;
        const ok = list.every(
          (o) =>
            Math.abs(o.ox - ox) >= gw * (o.lane === lane ? OB_GAP_SAME : OB_GAP)
        );
        if (ok) list.push({ ox, lane });
      }
      this.configObstacles = list.map((o, k) => ({
        id: `${Date.now()}-${k}`,
        ox: o.ox,
        lane: o.lane,
        s: size,
        x: this.roadX + o.ox,
        y: this.laneHeight * o.lane + (this.laneHeight - size) / 2,
      }));
    },
    hitObstacle() {
      const c = this.configCar;
      const cx1 = c.x + c.width * 0.08;
      const cx2 = c.x + c.width * 0.92;
      const cy1 = c.y + c.height * 0.28;
      const cy2 = c.y + c.height * 0.72;
      return this.configObstacles.some((ob) => {
        const ox1 = ob.x + ob.s * 0.18;
        const ox2 = ob.x + ob.s * 0.82;
        const oy1 = ob.y + ob.s * 0.05;
        const oy2 = ob.y + ob.s * 0.98;
        return cx1 < ox2 && cx2 > ox1 && cy1 < oy2 && cy2 > oy1;
      });
    },
    raceStep() {
      if (this.paused) {
        this.waitingResume = true;
        return;
      }
      if (this.raceState !== "run") return;
      const boxLeft = this.roadX + this.textBoxOffset.x;
      const car = this.configCar;
      // 車頭碰到答案框就鎖住操作；整台車進到答案框才判定
      if (!this.inputLocked && boxLeft <= car.x + car.width * 0.95)
        this.inputLocked = true;
      if (boxLeft <= car.x + car.width * 0.05) {
        if (this.movement !== "idle") {
          requestAnimationFrame(this.moveRoad);
          return;
        }
        this.raceJudge();
        return;
      }
      this.roadX -= this.speed;
      this.syncRoadX();
      if (this.hitObstacle()) {
        this.raceCrash();
        return;
      }
      requestAnimationFrame(this.moveRoad);
    },
    moveCarSmooth() {
      const target = this.laneY(this.currentOptionId);
      const step = this.laneHeight / 14;
      const dy = target - this.configCar.y;
      if (Math.abs(dy) <= step) {
        this.configCar.y = target;
        this.configCar.rotation = 0;
        this.canMove = true;
        this.movement = "idle";
        return;
      }
      this.configCar.y += Math.sign(dy) * step;
      this.configCar.rotation = Math.sign(dy) * 10;
      requestAnimationFrame(this.moveCar);
    },
    showBanner(text, color) {
      this.bannerText = text;
      this.bannerColor = color;
    },
    raceCrash() {
      this.raceState = "crash";
      this.$emit("race-crash");
      this.showBanner("撞到了！回到起點", "#e65100");
      this.later(() => this.raceReset(), 1400);
    },
    raceJudge() {
      if (this.raceState !== "run") return;
      this.inputLocked = true;
      const chosen = this.options[this.currentOptionId];
      const answer = this.gameData.Options[this.gameData.Answer];
      const isCorrect = chosen === answer;
      this.$emit("play-effect", isCorrect ? "CorrectSound" : "WrongSound");
      this.$emit("add-record", [answer, chosen, isCorrect ? "正確" : "錯誤"]);
      if (isCorrect) {
        this.raceState = "done";
        if (this.cfg.holdOnCorrect) this.$emit("race-correct", chosen);
        this.endingFrameCount = 0;
        requestAnimationFrame(this.endingAnimation);
        return;
      }
      this.raceState = "wrong";
      this.$emit("race-wrong", chosen);
      this.showBanner("再試一次！", "#c62828");
      this.later(() => {
        // 重試：答案位置和障礙物重新洗牌
        this.options = canvasTools.shuffleOptions(this.gameData.Options);
        this.configOption.forEach((o, i) => {
          o.text = this.optionLines(this.options[i]);
        });
        this.raceReset(true);
      }, 1400);
    },
    raceReset(newObstacles = false) {
      this.roadX = 0;
      if (newObstacles) this.makeObstacles();
      this.syncRoadX();
      this.configCar.y = this.laneY(this.currentOptionId);
      this.configCar.rotation = 0;
      this.canMove = true;
      this.movement = "idle";
      this.inputLocked = false;
      this.bannerText = "";
      this.raceState = "run";
      requestAnimationFrame(this.moveRoad);
    },
    drawSmoke() {
      const smokeImg = new window.Image();
      smokeImg.src = getGameStaticAssets("RacingCar", "smoke.png");
      const smoke = {
        x: canvasTools.center(this.configCar).x,
        y: canvasTools.center(this.configCar).y,
        height: this.laneHeight * 0.1,
        width: this.laneHeight * 0.1,
        image: smokeImg,
        opacity: 1,
      };
      smoke.x = canvasTools.corner(smoke).x;
      smoke.y = canvasTools.corner(smoke).y;
      this.configSmoke.push(smoke);
    },
    moveSmoke() {
      for (const i in this.configSmoke) {
        if (this.gameData.EndingImage && Number(i) === 3) {
          if (this.configEndingImage) {
            this.moveImageSmoke();
            this.moveEndingImage();
          } else {
            this.drawEndingImage();
            this.moveImageSmoke();
            this.moveEndingImage();
          }
        } else {
          this.configSmoke[i].x -= 2;
          if (this.configSmoke[i].width < this.laneHeight) {
            this.configSmoke[i].width++;
            this.configSmoke[i].height++;
            this.configSmoke[i].y = canvasTools.center(this.configCar).y;
            this.configSmoke[i].y = canvasTools.corner(this.configSmoke[i]).y;
          } else if (this.configSmoke[i].opacity > 0) {
            this.configSmoke[i].opacity -= 0.05;
          } else {
            this.configSmoke[i].visible = false;
          }
        }
      }
    },
    drawEndingImage() {
      const img = new window.Image();
      img.src = getGameAssets(this.gameId, this.gameData.EndingImage);
      this.configEndingImage = {
        image: img,
      };
    },
    moveImageSmoke() {
      const center = {
        x: this.gameWidth * 0.5,
        y: this.gameWidth * 0.25,
      };
      this.configSmoke[3].x +=
        canvasTools.unitVector(canvasTools.center(this.configSmoke[3]), center)
          .x * 5;
      this.configSmoke[3].y +=
        canvasTools.unitVector(canvasTools.center(this.configSmoke[3]), center)
          .y * 5;
      if (this.configSmoke[3].height <= this.gameWidth * 0.5)
        this.configSmoke[3].height += 3;
      if (this.configSmoke[3].width <= this.gameWidth)
        this.configSmoke[3].width += 6;
      else
        setTimeout(() => {
          this.$emit("next-question");
        }, 2000);
    },
    moveEndingImage() {
      this.configEndingImage.x = canvasTools.center(this.configSmoke[3]).x;
      this.configEndingImage.y = canvasTools.center(this.configSmoke[3]).y;
      if (
        this.configEndingImage.image.height * 2 >
        this.configEndingImage.image.width
      ) {
        this.configEndingImage.height = this.configSmoke[3].height * 0.75;
        this.configEndingImage.width =
          (this.configEndingImage.height * this.configEndingImage.image.width) /
          this.configEndingImage.image.height;
      } else {
        this.configEndingImage.width = this.configSmoke[3].width * 0.75;
        this.configEndingImage.height =
          (this.configEndingImage.width * this.configEndingImage.image.height) /
          this.configEndingImage.image.width;
      }
      this.configEndingImage.x = canvasTools.corner(this.configEndingImage).x;
      this.configEndingImage.y = canvasTools.corner(this.configEndingImage).y;
    },
  },
};
</script>

<style lang="scss" scoped>
.gameContainer {
  display: flex;
  width: 100%;
  overflow-x: hidden;
  overflow-y: hidden;
}

.gameContainer--race {
  height: 100%;
  align-items: center;
  justify-content: center;
  gap: 24px;
}

.drivePanel {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
  padding: 0.8rem;
  background-color: #eceff1;
  border-radius: 20px;
}

.driveBtn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 7.5rem;
  height: 6rem;
  font-size: 1.9rem;
  font-weight: 700;
  line-height: 1.1;
  color: #ffffff;
  background-color: #1e88e5;
  border: none;
  border-radius: 18px;
  box-shadow: 0 5px 0 #0d47a1;
  cursor: pointer;
  touch-action: manipulation;
  user-select: none;

  &:active {
    transform: translateY(3px);
    box-shadow: 0 2px 0 #0d47a1;
  }

  &__arrow {
    font-size: 1.6rem;
  }
}

.driveWheel {
  width: 4.5rem;
  height: 4.5rem;
}

@media (max-width: 1100px), (max-height: 760px) {
  .drivePanel {
    gap: 0.5rem;
    padding: 0.5rem;
  }

  .driveBtn {
    width: 6.4rem;
    height: 4.6rem;
    font-size: 1.6rem;

    &__arrow {
      font-size: 1.3rem;
    }
  }

  .driveWheel {
    width: 3.2rem;
    height: 3.2rem;
  }
}

#btnContainer {
  height: 100%;
  margin: 10px;
}

.controlBtn {
  height: 30%;
  aspect-ratio: 1/1;
  margin: 5%;
  border: 5px solid black;
}
</style>

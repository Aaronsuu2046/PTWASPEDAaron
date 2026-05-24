<template>
  <div ref="container">
    <canvas
      ref="canvas"
      @pointerdown="handlePointer"
      @pointermove="handlePointer"
      @pointerup="handlePointer"
      @pointerout="handlePointer"
    />
  </div>
</template>

<script>
export default {
  components: {},

  props: {
    componentConfig: {
      type: Object,
      required: true,
    },
  },

  emits: [],
  data() {
    return {
      drawing: false,
      previousPos: { x: 0, y: 0 },
    };
  },

  mounted() {
    this.initializeScene();
  },

  methods: {
    initializeScene() {
      this.canvas = this.$refs.canvas;
      this.ctx = this.canvas.getContext("2d");
      this.gameWidth = this.$refs.container.clientWidth;
      this.gameHeight = this.$refs.container.clientHeight;
      this.canvas.width = this.gameWidth;
      this.canvas.height = this.gameHeight;

      this.ctx.lineCap = "round";
    },
    handlePointer(e) {
      const pos = this.getPositon(e);
      if (this.componentConfig.color === "eraser") {
        switch (e.type) {
          case "pointerdown":
            this.drawing = true;
            this.erase(pos);
            break;
          case "pointermove":
            if (this.drawing) this.erase(pos);
            break;
          case "pointerup":
          case "pointerout":
            this.drawing = false;
            break;
        }
      } else {
        switch (e.type) {
          case "pointerdown":
            this.drawing = true;
            this.previousPos = pos;
            break;
          case "pointermove":
            if (this.drawing) this.draw(pos);
            break;
          case "pointerup":
          case "pointerout":
            this.drawing = false;
            break;
        }
      }
    },
    getPositon(e) {
      return {
        x: e.clientX - this.canvas.getBoundingClientRect().left,
        y: e.clientY - this.canvas.getBoundingClientRect().top,
      };
    },
    draw(pos) {
      this.ctx.strokeStyle = this.componentConfig.color;
      this.ctx.lineWidth = this.componentConfig.size;
      this.ctx.beginPath();
      this.ctx.moveTo(this.previousPos.x, this.previousPos.y);
      this.ctx.lineTo(pos.x, pos.y);
      this.ctx.stroke();
      this.ctx.closePath();
      this.previousPos = pos;
    },
    erase(pos) {
      this.ctx.beginPath();
      this.ctx.clearRect(
        pos.x - this.componentConfig.size * 0.5,
        pos.y - this.componentConfig.size * 0.5,
        this.componentConfig.size,
        this.componentConfig.size
      );
      this.ctx.closePath();
    },
  },
};
</script>

<style lang="scss" scoped>
div {
  width: 100%;
  height: 100%;
}
</style>

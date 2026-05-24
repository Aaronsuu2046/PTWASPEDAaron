<template>
  <!-- Your component's HTML template goes here -->
  <table class="NumberBoard">
    <tr class="EachRow">
      <td v-for="(unit, uIndex) in Unit" :key="uIndex" class="UnitEachBlanket">
        {{ unit }}
      </td>
    </tr>
    <tr class="EachRow">
      <td v-for="(number, index) in Number" :key="index" class="EachBlanket">
        <input
          v-model="Number[index]"
          class="inside-input"
          type="text"
          @input="checkAnswer"
        />
      </td>
    </tr>
  </table>
</template>

<script>
export default {
  name: "NumberBoard",
  props: {
    componentConfig: {
      type: Object,
      required: true,
    },
  },
  emits: ["replyAnswer"],
  data() {
    return {
      Number: null,
      Unit: null,
    };
  },
  created() {
    // 如果單位和數字的長度不一樣，則補齊。
    this.Unit = this.componentConfig.Unit;
    this.Number = this.componentConfig.Number;
    if (typeof this.componentConfig.Number === "number") {
      this.Number = this.componentConfig.Number.toString().split("");
    }
    if (this.componentConfig.Unit.length !== this.Number.length) {
      if (this.componentConfig.Unit.length > this.Number.length) {
        const diff = this.componentConfig.Unit.length - this.Number.length;
        for (let i = 0; i < diff; i++) {
          this.Number.unshift(" ");
        }
      } else {
        const diff = this.Number.length - this.componentConfig.Unit.length;
        for (let i = 0; i < diff; i++) {
          this.Unit.unshift(" ");
        }
      }
    }
    for (const i in this.Number) {
      this.Number[i] = "";
    }
  },
  methods: {
    checkAnswer() {
      let check = true;
      for (
        let i = this.componentConfig.Number.toString().split("").length;
        i >= 0;
        i--
      ) {
        if (
          this.componentConfig.Number.toString().split("")[i] !== this.Number[i]
        ) {
          check = false;
          break;
        }
      }
      if (check) {
        this.$emit("replyAnswer", true);
      } else {
        this.$emit("replyAnswer", false);
      }
    },
  },
};
</script>
<style scoped lang="scss">
/* Your component's CSS styles go here */

.NumberBoard {
  border: solid;
  border-color: blue;
  display: grid;
  grid-template-rows: 2fr 1fr;
}
.EachRow {
  width: 100%;
  display: flex;
  justify-content: space-around;
  height: 100%;
  /* min-height: 70px;
  max-height: 140px; */
  font-family: "YuanQuan";
}
.EachBlanket {
  border: solid;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 2em;
  /* width: 70px; */
  text-align: center;
}
.UnitEachBlanket {
  border: solid;
  width: 100%;
  height: 100%;
  /* Font Size */
  /* width: 70px; */
  display: flex;
  font-size: 1.5em;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.inside-input {
  width: 100%;
  height: 100%;
}
</style>

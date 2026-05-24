<template>
  <span class="fraction-text">
    <template v-for="(part, index) in textParts" :key="index">
      <template v-if="part.type === 'text'">{{ part.content }}</template>
      <span v-else class="inline-math" v-html="renderMath(part.content)"></span>
    </template>
  </span>
</template>

<script>
import katex from "katex";
import "katex/dist/katex.min.css";
import DOMPurify from "dompurify";

export default {
  name: "FractionText",
  props: {
    text: {
      type: String,
      required: true,
    },
  },
  computed: {
    textParts() {
      const parts = [];
      let currentText = "";
      let currentIndex = 0;

      while (currentIndex < this.text.length) {
        if (this.text[currentIndex] === "\\") {
          if (currentText) {
            parts.push({ type: "text", content: currentText });
            currentText = "";
          }

          // 尋找完整的分數格式
          const fractionRegex = /\\frac\{(\d+)\}\{(\d+)\}/;
          const match = this.text.substring(currentIndex).match(fractionRegex);

          if (match) {
            const fractionContent = match[0];
            parts.push({
              type: "math",
              content: fractionContent,
            });
            currentIndex += fractionContent.length;
          } else {
            // 如果沒有找到完整的分數格式，就當作普通文字處理
            currentText += this.text[currentIndex];
            currentIndex++;
          }
        } else {
          currentText += this.text[currentIndex];
          currentIndex++;
        }
      }

      if (currentText) {
        parts.push({ type: "text", content: currentText });
      }

      return parts;
    },
  },
  methods: {
    renderMath(content) {
      try {
        const html = katex.renderToString(content, {
          displayMode: false,
          throwOnError: false,
        });
        return DOMPurify.sanitize(html);
      } catch (e) {
        console.error("KaTeX rendering error:", e);
        return content;
      }
    },
  },
};
</script>

<style scoped>
.fraction-text {
  display: inline;
  line-height: 1.5;
}

.inline-math {
  display: inline-block;
  vertical-align: middle;
}

:deep(.katex) {
  font-size: 1.1em;
}
</style>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";

// 取得當前路由
const route = useRoute();

// 動態取得當前匹配的路由組件
const currentComponent = computed(() => {
  const matched = route.matched;
  if (matched.length > 0) {
    return matched[matched.length - 1].components.default;
  }
  return null;
});

// 提取路由參數
const currentParams = computed(() => route.params);
</script>

<template>
  <!-- eslint-disable-next-line vue/no-template-shadow -->
  <router-view v-slot="{ route }">
    <transition :name="route.meta.transition || 'fade'">
      <!-- 動態渲染組件，並傳遞路由參數 -->
      <component
        :is="currentComponent"
        :key="route.path"
        v-bind="currentParams"
      />
    </transition>
  </router-view>
</template>

<style lang="scss">
@font-face {
  font-family: "YuanQuan";
  src: url("@/assets/fonts/YuanQuan/BpmfGenSenRounded-M.ttf") format("truetype");
}
/* 四年級用的無注音圓體（源泉圓體 Medium，已子集化為常用繁中字） */
@font-face {
  font-family: "Grade4Sans";
  src: url("@/assets/fonts/Grade4Sans/GenSenMaruGothicTW-Medium.subset.woff2")
    format("woff2");
  font-display: swap;
  /* 行高對齊 YuanQuan（ascent 900、descent 124，每 em 1024），換字型不改變版面高度 */
  ascent-override: 87.9%;
  descent-override: 12.1%;
  line-gap-override: 0%;
}
/* 預設用帶注音的 YuanQuan；路由進入四年級時 body 加上 no-bpmf 改用無注音字型
   （用 html body 提高優先權，蓋過 Bootstrap 對 body 的字型設定） */
html body {
  --app-font: "YuanQuan";
  font-family: var(--app-font), sans-serif;
}
html body.no-bpmf {
  --app-font: "Grade4Sans";
}
.navbar {
  background-color: #57b9d9;
  height: 10vh;
  width: 100%;
  margin: 0;
  .navbar-brand {
    img {
      max-width: 70%;
    }
  }
  img {
    max-width: 80%;
  }
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

import { createRouter, createWebHashHistory } from "vue-router";

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "Home",
      meta: {
        requiresAuth: false,
        transition: "fade",
      },
      component: () => import("@/features/home/pages/HomePage.vue"),
    },
    {
      path: "/:grade",
      name: "browser",
      meta: { transition: "fade" },
      component: () => import("@/features/game-browser/pages/GameBrowser.vue"),
    },
    {
      path: "/:grade/:subject/:id/:gameName",
      name: "game",
      meta: { transition: "fade" },
      component: () => import("@/features/game-runtime/pages/GamePlayPage.vue"),
    },
    {
      path: "/DrawImage",
      name: "DrawImage",
      component: () => import("@/components/DrawImage.vue"),
    },
    {
      path: "/NumberBoard",
      name: "NumberBoard",
      component: () => import("@/components/NumberBoard.vue"),
    },
    {
      path: "/Numberline",
      name: "Numberline",
      component: () => import("@/components/NumberLine.vue"),
    },
    {
      path: "/tester",
      component: () =>
        import(
          "@/features/game-templates/component-testers/componentTesters.vue"
        ),
    },
    {
      path: "/LinktoImageGameMaker",
      component: () => import("@/components/maker/LinktoImageGameMaker.vue"),
    },
  ],
});
// 不顯示注音的年級（改用無注音的 Grade4Sans）
const NO_BPMF_GRADES = [4];
const NO_BPMF_FONT = '1em "Grade4Sans"';
const FONT_WAIT_MS = 3000;

// 先把無注音字型載好再顯示頁面，避免先用別的字型排版、再換字型重排
function waitForNoBpmfFont() {
  if (!document.fonts || document.fonts.check(NO_BPMF_FONT)) {
    return Promise.resolve();
  }
  return Promise.race([
    document.fonts.load(NO_BPMF_FONT, "四年級數學").catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, FONT_WAIT_MS)),
  ]);
}

router.beforeEach(async (to, from, next) => {
  console.warn(`route: ${from.path} -> ${to.path}`);
  const normalizeParam = (value) => (Array.isArray(value) ? value[0] : value);
  const grade = parseInt(normalizeParam(to.params.grade), 10);
  // 低年級需要注音，使用 YuanQuan；四年級改用無注音字型。離開四年級時移除 class 還原字型
  const noBpmf = NO_BPMF_GRADES.includes(grade);
  if (noBpmf) await waitForNoBpmfFont();
  document.body.style.removeProperty("font-family");
  document.body.classList.toggle("no-bpmf", noBpmf);
  next();
});

export default router;

import js from "@eslint/js";
import vue from "eslint-plugin-vue";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default [
  {
    ignores: [
      "dist/**/*",
      "release/**/*",
      "node_modules/**/*"
    ]
  },
  js.configs.recommended,
  ...vue.configs["flat/recommended"],
  {
    files: ["**/*.vue", "**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parser: vue.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      vue,
    },
    rules: {
      // Vue：邏輯/安全
      "vue/require-v-for-key": "warn", // 先 warn，修完再改 error
      "vue/no-duplicate-attributes": "warn",
      "vue/no-mutating-props": "warn",
      "vue/no-side-effects-in-computed-properties": "warn",
      "vue/no-use-v-if-with-v-for": "warn",
      "vue/valid-v-for": "warn",
      "vue/valid-v-model": "warn",
      "vue/no-unused-properties": [
        "warn",
        { groups: ["props", "data", "computed", "methods"] },
      ],
      "vue/no-unused-components": "warn",

      // JS：常見安全/整潔
      "no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-undef": "warn",
      eqeqeq: ["warn", "always", { null: "ignore" }],
      "no-redeclare": "warn",
      "no-useless-return": "warn",
      "no-var": "warn",
      "prefer-const": "warn",
      "object-shorthand": ["warn", "always"],
      "no-constant-binary-expression": "warn",

      // 建議：依環境切換
      "no-console":
        process.env.NODE_ENV === "production"
          ? ["warn", { allow: ["warn", "error"] }]
          : "off",
      "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off",
    },
  },
  {
    files: ["**/FractionText.vue"],
    rules: {
      "vue/no-v-html": "off",
    },
  },
  {
    files: ["electron/**/*.{js,ts}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node, // 這行會讓 ESLint 認得 process、__dirname 等 Node 全域
      },
    },
  },
  prettier,
];

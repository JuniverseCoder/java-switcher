// eslint.config.js

// 导入已有的 TS 模块
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

// --- 新增：导入 JSON 检查需要的模块 ---
import jsoncPlugin from "eslint-plugin-jsonc";
import jsoncParser from "jsonc-eslint-parser";


export default [
  // --- 这是您原有的 TypeScript 配置块，保持不变 ---
  {
    files: ["**/*.ts"],
    plugins: {
      "@typescript-eslint": typescriptEslint,
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      "@typescript-eslint/naming-convention": ["warn", {
        selector: "import",
        format: ["camelCase", "PascalCase"],
      }],
      curly: "warn",
      eqeqeq: "warn",
      "no-throw-literal": "warn",
      semi: "warn",
    },
  },

  // --- 新增：专门用于检查 JSON 文件的配置块 ---
  {
    files: ["**/*.json", "**/*.jsonc"], // 应用于所有 .json 和 .jsonc 文件
    plugins: {
      jsonc: jsoncPlugin, // 加载 JSON 插件
    },
    languageOptions: {
      parser: jsoncParser, // 为这些文件指定使用 JSON 解析器
    },
    rules: {
      // --- 这里是关键的 JSON 规则 ---

      // 捕获并报错：尾随逗号 (您遇到的问题)
      'jsonc/no-trailing-commas': 'error',

      // 捕获并报错：JSON 中的注释 (package.json 不允许注释)
      'jsonc/no-comments': 'error',

      // 捕获并报错：重复的键
      'jsonc/no-dupe-keys': 'error',

      // 确保所有字符串都使用双引号，这是 JSON 的标准
      'jsonc/quotes': ['error', 'double'],

      // 确保顶层值是对象或数组
      'jsonc/valid-json-string': 'error',
    },
  }
];
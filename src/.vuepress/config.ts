import { defineUserConfig } from "vuepress";

import theme from "./theme.js";

export default defineUserConfig({
  base: "/",

  lang: "zh-CN",
  title: "阿成的春天和我的太阳",
  description: "阿成的春天和我的太阳",

  theme,

  // 和 PWA 一起启用
  // shouldPrefetch: false,
});

const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  // 在這裡添加需要暴露給渲染進程的 API
});

// 极简测试版本 - 只测试是否能加载

console.log("🔥🔥🔥🔥🔥 测试文件已加载！🔥🔥🔥🔥🔥");
console.log("🔥🔥🔥🔥🔥 如果你看到这个，说明 app-side 可以工作！🔥🔥🔥🔥🔥");

import { BaseSideService } from "@zeppos/zml/base-side";

console.log("🔥🔥🔥 BaseSideService 导入成功！🔥🔥🔥");

AppSideService(
  BaseSideService({
    onInit() {
      console.log("🔥🔥🔥🔥🔥 ONINIT 测试成功！🔥🔥🔥🔥🔥");
    },
    onRun() {
      console.log("🔥🔥🔥 ONRUN 测试成功！🔥🔥🔥");
    },
    onDestroy() {
      console.log("🔥🔥🔥 ONDESTROY 测试🔥🔥🔥");
    },
  })
);

console.log("🔥🔥🔥 AppSideService 调用成功！🔥🔥🔥");


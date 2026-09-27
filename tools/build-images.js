// 重新生成 web/js/images.js：把 img/ 下的箱子图内嵌为 data URI
// 用途：仓库/APK 等无二进制分发场景下图片仍可显示；新增箱子图后跑一次即可
// 用法：node tools/build-images.js
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "img");
const files = [
  "kilowatt.png",
  "recoil.png",
  "revolution.png",
  "fracture.png",
  "dreams.png",
  "genesis.png",
  "doom.png",
];

let out = "/* 箱子图片 data URI 映射（由 tools/build-images.js 生成，勿手改） */\n";
out += "const ITEM_IMAGE_DATA = {\n";
for (const f of files) {
  const p = path.join(dir, f);
  if (!fs.existsSync(p)) {
    console.error("MISSING:", f);
    process.exit(1);
  }
  out += `  "img/${f}": "data:image/png;base64,${fs.readFileSync(p).toString("base64")}",\n`;
}
out += "};\n";

const target = path.join(__dirname, "..", "js", "images.js");
fs.writeFileSync(target, out);
console.log("images.js regenerated:", target);

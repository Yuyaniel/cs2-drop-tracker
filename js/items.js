/* CS2 常见掉落物品名称库（用于搜索候选 + 快捷打卡） */
const ITEM_LIBRARY = [
  // 武器箱（有图，文件名用英文避免中文路径兼容性问题）
  { name: "千瓦武器箱", alias: "Kilowatt Case", img: "img/kilowatt.png", cat: "case" },
  { name: "反冲武器箱", alias: "Recoil Case", img: "img/recoil.png", cat: "case" },
  { name: "变革武器箱", alias: "Revolution Case", img: "img/revolution.png", cat: "case" },
  { name: "裂空武器箱", alias: "Fracture Case", img: "img/fracture.png", cat: "case" },
  { name: "梦魇武器箱", alias: "Dreams & Nightmares Case", img: "img/dreams.png", cat: "case" },
  { name: "封装的创世终端机", alias: "Genesis Terminal", img: "img/genesis.png", cat: "case" },
  { name: "封装的毁灭之手终端机", alias: "Doom Hand Terminal", img: "img/doom.png", cat: "case" },

  // 常见掉落皮肤（无图，用 emoji 兜底）
  { name: "格洛克 18 型 | 清透聚合物", alias: "Glock-18 | Clear Polymer", cat: "skin" },
  { name: "AK-47 | 石板", alias: "AK-47 | Slate", cat: "skin" },
  { name: "M4A1 消音型 | 泥浆", alias: "M4A1-S | Mud-Spec", cat: "skin" },
  { name: "P250 | 佳酿", alias: "P250 | Vino Primo", cat: "skin" },
  { name: "Tec-9 | 叛逆者", alias: "Tec-9 | Rebel", cat: "skin" },
  { name: "FN57 | 冷却液", alias: "Five-SeveN | Coolant", cat: "skin" },

  // 其他
  { name: "纪念品包", alias: "Souvenir Package", cat: "other" },
  { name: "涂鸦", alias: "Graffiti", cat: "graffiti" },
  { name: "贴纸", alias: "Sticker", cat: "sticker" },
];

/* 按名称/别名查找物品 */
function findItem(name) {
  if (!name) return null;
  return ITEM_LIBRARY.find((it) =>
    it.name === name || (it.alias && it.alias.toLowerCase() === String(name).toLowerCase())
  ) || null;
}

/* 快捷打卡的箱子列表（有图） */
function getQuickPickItems() {
  return ITEM_LIBRARY.filter((it) => it.img);
}

/* 类型 -> 图标 & 中文 */
const CATEGORY_META = {
  case:    { label: "武器箱", ico: "📦" },
  skin:    { label: "皮肤",   ico: "🔫" },
  sticker: { label: "贴纸",   ico: "🏷️" },
  graffiti:{ label: "涂鸦",   ico: "🎨" },
  other:   { label: "其他",   ico: "🎁" },
};

/* 品质 -> 中文 & 颜色类 */
const RARITY_META = {
  consumer:   { label: "消费级", cls: "r-consumer" },
  industrial: { label: "工业级", cls: "r-industrial" },
  "mil-spec": { label: "军规级", cls: "r-mil-spec" },
  restricted: { label: "受限",   cls: "r-restricted" },
  classified: { label: "保密",   cls: "r-classified" },
  covert:     { label: "隐秘",   cls: "r-covert" },
  rare:       { label: "特殊",   cls: "r-rare" },
  base:       { label: "无",     cls: "r-base" },
};

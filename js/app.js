/* CS2 掉落记录 - 主逻辑 */
(function () {
  "use strict";

  const STORAGE_KEY = "cs2_drops_v1";
  const SETTINGS_KEY = "cs2_drops_settings_v1";
  const CURRENCY = "¥";

  // ---------- 数据 ----------
  let drops = load();
  let settings = loadSettings();

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drops));
  }

  function defaultSettings() {
    // 默认第 1 期从 2026-09-23 开始，每期 7 天
    return { periodStart: "2026-09-23", periodDays: 7 };
  }
  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.periodStart && (+s.periodDays > 0)) return s;
      }
    } catch (e) {}
    return defaultSettings();
  }
  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  // ---------- 工具 ----------
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function fmt(n) {
    return Number(n || 0).toLocaleString("zh-CN", { maximumFractionDigits: 2 });
  }
  function money(n) {
    return Number(n || 0).toFixed(2).replace(/\.00$/, "");
  }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function dateStr(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function parseDate(s) {
    const p = String(s).split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }
  function todayStr() { return dateStr(new Date()); }
  function addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  }
  function daysBetween(a, b) { // b - a 的天数（本地 0 点）
    const da = new Date(a); da.setHours(0, 0, 0, 0);
    const db = new Date(b); db.setHours(0, 0, 0, 0);
    return Math.round((db - da) / 86400000);
  }
  function shortLabel(d) {
    return pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  // ---------- 期（周期）计算 ----------
  function periodDays() {
    return Math.max(1, parseInt(settings.periodDays, 10) || 7);
  }

  // 计算某日期所属的期；daysLeft 为该日期距下一期开始的天数
  function getPeriod(date) {
    const days = periodDays();
    const start = parseDate(settings.periodStart);
    const d = new Date(date); d.setHours(0, 0, 0, 0);
    const diff = daysBetween(start, d);
    const idx = Math.floor(diff / days); // 可为负（早于第 1 期）
    const pStart = addDays(start, idx * days);
    const pEnd = addDays(pStart, days - 1);
    const nextStart = addDays(pStart, days);
    return {
      index: idx + 1,
      key: dateStr(pStart),
      start: pStart,
      end: pEnd,
      nextStart: nextStart,
      daysLeft: daysBetween(d, nextStart),
      // 期范围显示完整年份，如 2025-08-20 ~ 2025-08-26
      label: dateStr(pStart) + " ~ " + dateStr(pEnd),
    };
  }

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);

  // ---------- 日历渲染 ----------
  let calYear = null, calMonth = null;

  function renderCalendar() {
    const now = new Date();
    if (calYear == null) { calYear = now.getFullYear(); calMonth = now.getMonth(); }
    const first = new Date(calYear, calMonth, 1);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const cur = getPeriod(now);
    const today = todayStr();

    $("calTitle").innerHTML = (calMonth + 1) + "月 <span class=\"cal-sub\">" + calYear + "</span>";

    const inPeriodOf = (d) => daysBetween(cur.start, d) >= 0 && daysBetween(d, cur.end) >= 0;

    // 前导空格 + 每天（按网格索引，便于判断胶囊左右邻）
    const cells = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(calYear, calMonth, d));

    let html = "";
    cells.forEach((date, i) => {
      if (!date) { html += `<div class="cal-cell empty"></div>`; return; }
      const ds = dateStr(date);
      const inPeriod = inPeriodOf(date);
      const isToday = ds === today;
      const col = i % 7;
      const leftIn = col > 0 && cells[i - 1] && inPeriodOf(cells[i - 1]);
      const rightIn = col < 6 && cells[i + 1] && inPeriodOf(cells[i + 1]);

      let cls = "cal-cell";
      if (inPeriod) {
        cls += " in-period";
        if (!leftIn && !rightIn) cls += " period-single";
        else {
          if (!leftIn) cls += " period-start";
          if (!rightIn) cls += " period-end";
        }
      }
      if (isToday) cls += " today";
      html += `<div class="${cls}"><span>${date.getDate()}</span></div>`;
    });
    $("calGrid").innerHTML = html;
  }

  function calPrevMonth() {
    calMonth--;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    renderCalendar();
  }
  function calNextMonth() {
    calMonth++;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    renderCalendar();
  }

  // ---------- 掉落物格子（快捷打卡样式） ----------
  function dropCellHtml(d) {
    const cat = CATEGORY_META[d.category] || CATEGORY_META.other;
    const qty = +d.qty || 1;
    const price = +d.price || 0;
    const total = price * qty;
    // 数量为 1 不显示 ×1；无价格且数量为 1 时不显示副行
    const subParts = [];
    if (qty > 1) subParts.push(`×${qty}`);
    if (price > 0) subParts.push(`${CURRENCY}${money(total)}`);
    const sub = subParts.join(" · ");

    // 有图显示图片，无图用 emoji 图标；图片加载失败时回退到 emoji
    const item = findItem(d.name);
    let iconHtml;
    if (item && item.img) {
      iconHtml =
        `<img src="${imgSrc(item.img)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='grid';">` +
        `<div class="pc-ico" style="display:none">${cat.ico}</div>`;
    } else {
      iconHtml = `<div class="pc-ico">${cat.ico}</div>`;
    }

    return `
      <div class="pc-item" data-id="${d.id}">
        ${iconHtml}
        <span class="pc-name">${escapeHtml(d.name)}</span>
        ${sub ? `<span class="pc-sub">${sub}</span>` : ""}
        <span class="pc-date">${d.date}</span>
      </div>`;
  }

  function bindCellClicks(container) {
    container.querySelectorAll(".pc-item").forEach((el) => {
      el.addEventListener("click", () => openEdit(el.dataset.id));
    });
  }

  // ---------- 顶部统计条渲染 ----------
  function renderTopStats() {
    const cur = getPeriod(new Date());
    const totalValue = drops.reduce((s, d) => s + (+d.price || 0) * (+d.qty || 1), 0);
    $("tsDaysLeft").textContent = cur.daysLeft;
    $("tsTotalValue").textContent = money(totalValue);
  }

  // ---------- 总打卡框渲染（最新期在上方） ----------
  function renderPeriodBlocks() {
    const curKey = getPeriod(new Date()).key;

    const groups = new Map();
    drops.forEach((d) => {
      const k = getPeriod(parseDate(d.date)).key;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(d);
    });
    if (!groups.has(curKey)) groups.set(curKey, []); // 当前期始终显示

    const keys = Array.from(groups.keys()).sort((a, b) => (a < b ? 1 : -1));
    $("totalCard").innerHTML = keys.map((k) =>
      periodBlockHtml(k, groups.get(k), k === curKey)
    ).join("");
    bindCellClicks($("totalCard"));
  }

  function periodBlockHtml(key, items, isCur) {
    const p = getPeriod(parseDate(key));
    const sorted = items.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    const count = sorted.reduce((s, d) => s + (+d.qty || 1), 0);
    const value = sorted.reduce((s, d) => s + (+d.price || 0) * (+d.qty || 1), 0);
    const title = isCur ? `当前第 <span>${p.index}</span> 期` : `第 <span>${p.index}</span> 期`;
    return `<div class="pb-block${isCur ? " cur" : ""}">
      <div class="pc-head">
        <div class="pc-left">
          <div class="pc-title${isCur ? "" : " past"}">${title}</div>
          <div class="pc-range">${p.label}</div>
        </div>
        <div class="pc-right">
          <div class="pc-value"><span class="cur">${CURRENCY}</span>${money(value)}</div>
          <div class="pc-count">${count} 件</div>
        </div>
      </div>
      <div class="pc-grid">${sorted.map((d) => dropCellHtml(d)).join("")}</div>
      ${sorted.length === 0 ? `<div class="pc-empty">本期还没有掉落，点右下角 + 打卡</div>` : ""}
    </div>`;
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ---------- 添加/编辑弹窗 ----------
  const modal = $("modal");
  let editingId = null;

  function openAdd() {
    editingId = null;
    $("modalTitle").textContent = "添加掉落";
    $("btnDelete").hidden = true;
    renderDateSelect(todayStr());
    updateDatePeriodInfo();
    $("fName").value = "";
    $("fQty").value = 1;
    $("fPrice").value = "";
    $("fNote").value = "";
    setChip("fCategory", "case");
    setChip("fRarity", "base");
    clearQuickPickActive();
    hideSuggest();
    modal.hidden = false;
    $("fName").focus();
  }

  function openEdit(id) {
    const d = drops.find((x) => x.id === id);
    if (!d) return;
    editingId = id;
    $("modalTitle").textContent = "编辑掉落";
    $("btnDelete").hidden = false;
    renderDateSelect(d.date);
    updateDatePeriodInfo();
    $("fName").value = d.name;
    $("fQty").value = d.qty || 1;
    $("fPrice").value = d.price ? d.price : "";
    $("fNote").value = d.note || "";
    setChip("fCategory", d.category || "other");
    setChip("fRarity", d.rarity || "base");
    clearQuickPickActive();
    $("quickPick").querySelectorAll(".qp-item").forEach((x) => {
      if (x.dataset.name === d.name) x.classList.add("active");
    });
    hideSuggest();
    modal.hidden = false;
  }

  function closeModal() { modal.hidden = true; }

  function setChip(groupId, value) {
    const g = $(groupId);
    g.querySelectorAll(".chip").forEach((c) => {
      c.classList.toggle("active", c.dataset.v === value);
    });
  }
  function getChip(groupId) {
    const act = $(groupId).querySelector(".chip.active");
    return act ? act.dataset.v : null;
  }

  function saveDrop() {
    const name = $("fName").value.trim();
    if (!name) { alert("请填写饰品名称"); return; }
    const date = $("fDate").value || todayStr();
    const qty = Math.max(1, parseInt($("fQty").value, 10) || 1);
    const price = parseFloat($("fPrice").value) || 0;
    const note = $("fNote").value.trim();
    const category = getChip("fCategory");
    const rarity = getChip("fRarity");

    if (editingId) {
      const d = drops.find((x) => x.id === editingId);
      if (d) Object.assign(d, { name, date, qty, price, note, category, rarity });
    } else {
      drops.push({ id: uid(), name, date, qty, price, note, category, rarity });
    }
    save();
    closeModal();
    refresh();
  }

  function deleteDrop() {
    if (!editingId) return;
    if (!confirm("确定删除这条掉落记录吗？")) return;
    drops = drops.filter((x) => x.id !== editingId);
    save();
    closeModal();
    refresh();
  }

  // ---------- 搜索候选 ----------
  const suggest = $("suggest");
  function showSuggest() {
    const q = $("fName").value.trim().toLowerCase();
    if (!q) { hideSuggest(); return; }
    const matches = ITEM_LIBRARY.filter((it) =>
      it.name.toLowerCase().includes(q) || (it.alias && it.alias.toLowerCase().includes(q))
    ).slice(0, 8);
    if (matches.length === 0) { hideSuggest(); return; }
    suggest.innerHTML = matches.map((it) =>
      `<div data-n="${escapeHtml(it.name)}">${escapeHtml(it.name)}${it.alias ? ` <span class="sug-hint">${escapeHtml(it.alias)}</span>` : ""}</div>`
    ).join("");
    suggest.hidden = false;
    suggest.querySelectorAll("div").forEach((el) => {
      el.addEventListener("click", () => {
        $("fName").value = el.dataset.n;
        hideSuggest();
      });
    });
  }
  function hideSuggest() { suggest.hidden = true; suggest.innerHTML = ""; }

  // ---------- 快捷打卡 ----------
  function renderQuickPick() {
    $("quickPick").innerHTML = getQuickPickItems().map((it) => `
      <div class="qp-item" data-name="${escapeHtml(it.name)}" data-cat="${it.cat}">
        <img src="${imgSrc(it.img)}" alt="${escapeHtml(it.name)}" loading="lazy">
        <span>${escapeHtml(it.name)}</span>
      </div>`).join("");
  }
  function clearQuickPickActive() {
    $("quickPick").querySelectorAll(".qp-item").forEach((x) => x.classList.remove("active"));
  }

  // 解析物品图片地址：优先内嵌 data URI（无二进制分发），回退本地文件
  function imgSrc(p) {
    return (typeof ITEM_IMAGE_DATA !== "undefined" && ITEM_IMAGE_DATA[p]) || encodeURI(p);
  }

  // 生成日期下拉列表：第 1 期起始日 ~ 今天，按期分组，最新在最上
  function renderDateSelect(selectedDate) {
    const sel = $("fDate");
    const today = todayStr();
    const selected = selectedDate || today;
    const start = parseDate(settings.periodStart);

    // 从今天倒序走到第 1 期起始日，按期分组（Map 保持倒序插入）
    const groups = new Map();
    let d = parseDate(today);
    while (daysBetween(start, d) >= 0) {
      const p = getPeriod(d);
      if (!groups.has(p.key)) groups.set(p.key, []);
      groups.get(p.key).push(dateStr(d));
      d = addDays(d, -1);
    }

    sel.innerHTML = Array.from(groups.entries()).map(([k, dates]) => {
      const p = getPeriod(parseDate(k));
      const opts = dates.map((ds) => {
        const dd = parseDate(ds);
        const wd = "日一二三四五六"[dd.getDay()];
        const mark = ds === today ? " · 今天" : "";
        return `<option value="${ds}"${ds === selected ? " selected" : ""}>${ds.slice(5).replace("-", "/")} 周${wd}${mark}</option>`;
      }).join("");
      return `<optgroup label="第 ${p.index} 期 · ${p.label}">${opts}</optgroup>`;
    }).join("");
  }

  // 根据所选日期更新「掉落期」信息条
  function updateDatePeriodInfo() {
    const d = $("fDate").value;
    if (!d) { $("fPeriodInfo").textContent = "-"; return; }
    const p = getPeriod(parseDate(d));
    $("fPeriodInfo").textContent = "第 " + p.index + " 期 · " + p.label;
  }

  // ---------- 统计页 ----------
  function showStats() {
    $("homeView").hidden = true;
    $("statsView").hidden = false;
    $("btnBack").hidden = false;
    $("homeActions").hidden = true;
    $("btnAdd").hidden = true;
    $("pageText").textContent = "统计";
    window.scrollTo(0, 0);
    renderStatsPage();
  }

  function goHome() {
    $("homeView").hidden = false;
    $("statsView").hidden = true;
    $("btnBack").hidden = true;
    $("homeActions").hidden = false;
    $("btnAdd").hidden = false;
    $("pageText").textContent = "CS2 掉落记录";
    refresh();
  }

  function renderStatsPage() {
    const byCat = {}, byRar = {}, byCase = {};
    let totalValue = 0;
    drops.forEach((d) => {
      const v = (+d.price || 0) * (+d.qty || 1);
      totalValue += v;
      const cat = d.category || "other";
      byCat[cat] = (byCat[cat] || 0) + v;
      byRar[d.rarity || "base"] = (byRar[d.rarity || "base"] || 0) + v;
      if (cat === "case") {
        if (!byCase[d.name]) byCase[d.name] = { qty: 0, val: 0 };
        byCase[d.name].qty += (+d.qty || 1);
        byCase[d.name].val += v;
      }
    });

    $("sCurrency").textContent = CURRENCY;
    $("sTotal").textContent = money(totalValue);

    // 累计件数 + 最贵掉落
    const totalQty = drops.reduce((s, d) => s + (+d.qty || 1), 0);
    let best = null;
    drops.forEach((d) => { const v = +d.price || 0; if (!best || v > (+best.price || 0)) best = d; });
    $("statMini").textContent = "累计 " + totalQty + " 件 · 最贵掉落 " + (best && best.price > 0 ? best.name : "-");

    renderCaseCounts(byCase);
    renderBars("statByCategory", byCat, (k) => (CATEGORY_META[k] || CATEGORY_META.other).label);
    renderBars("statByRarity", byRar, (k) => (RARITY_META[k] || RARITY_META.base).label);

    // 年份下拉：数据中出现的年份 + 当前年
    const years = new Set();
    drops.forEach((d) => years.add(parseDate(d.date).getFullYear()));
    years.add(new Date().getFullYear());
    const yearList = Array.from(years).sort((a, b) => b - a);
    const sel = $("statYear");
    sel.innerHTML = yearList.map((y) => `<option value="${y}">${y} 年</option>`).join("");
    sel.value = String(new Date().getFullYear());
    renderPeriodStats(parseInt(sel.value, 10));
  }

  // 各武器箱掉落次数
  function renderCaseCounts(byCase) {
    const entries = Object.entries(byCase).sort((a, b) => b[1].qty - a[1].qty);
    if (entries.length === 0) {
      $("statCases").innerHTML = `<div class="case-empty">还没有武器箱掉落记录</div>`;
      return;
    }
    $("statCases").innerHTML = entries.map(([name, s]) => {
      const item = findItem(name);
      let icon;
      if (item && item.img) {
        icon =
          `<img src="${imgSrc(item.img)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='grid';">` +
          `<div class="case-ico" style="display:none">${CATEGORY_META.case.ico}</div>`;
      } else {
        icon = `<div class="case-ico">${CATEGORY_META.case.ico}</div>`;
      }
      return `<div class="case-row">
        ${icon}
        <div class="case-main">
          <div class="case-name">${escapeHtml(name)}</div>
          <div class="case-val">${CURRENCY}${money(s.val)}</div>
        </div>
        <div class="case-count">${s.qty} 次</div>
      </div>`;
    }).join("");
  }

  function renderPeriodStats(year) {
    const byPeriod = {};
    drops.forEach((d) => {
      const p = getPeriod(parseDate(d.date));
      if (p.start.getFullYear() !== year) return;
      const v = (+d.price || 0) * (+d.qty || 1);
      byPeriod[p.key] = (byPeriod[p.key] || 0) + v;
    });
    const keys = Object.keys(byPeriod).sort((a, b) => (a < b ? 1 : -1));
    $("statByWeek").innerHTML = keys.map((k) => {
      const p = getPeriod(parseDate(k));
      return `<div class="week-row">
        <span>第 ${p.index} 期 · ${p.label}</span>
        <span class="w-val">${CURRENCY}${money(byPeriod[k])}</span>
      </div>`;
    }).join("") || `<div class="week-row"><span>${year} 年暂无记录</span></div>`;
  }

  function renderBars(id, data, labelFn) {
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    const max = entries.length ? Math.max(...entries.map((e) => e[1])) : 1;
    const total = entries.reduce((s, e) => s + e[1], 0);
    $(id).innerHTML = entries.map(([k, v]) => {
      const pct = max ? (v / max * 100) : 0;
      const share = total ? (v / total * 100).toFixed(0) : 0;
      return `<div class="bar-row">
        <span class="bar-label">${labelFn(k)}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
        <span class="bar-val">${CURRENCY}${money(v)} · ${share}%</span>
      </div>`;
    }).join("") || `<div class="bar-row"><span class="bar-label">-</span><span>暂无数据</span></div>`;
  }

  // ---------- 设置弹窗 ----------
  const settingsModal = $("settingsModal");
  function openSettings() {
    $("sPeriodStart").value = settings.periodStart;
    $("sPeriodDays").value = settings.periodDays;
    updateSettingsPreview();
    settingsModal.hidden = false;
  }
  function updateSettingsPreview() {
    const s = $("sPeriodStart").value;
    const d = Math.max(1, parseInt($("sPeriodDays").value, 10) || 7);
    if (!s) { $("settingsPreview").innerHTML = ""; return; }
    const start = parseDate(s);
    const end = addDays(start, d - 1);
    $("settingsPreview").innerHTML =
      `第 1 期：<b>${dateStr(start)}</b> ~ <b>${dateStr(end)}</b>（每期 ${d} 天，之后按此周期循环）`;
  }
  function saveSettingsModal() {
    const s = $("sPeriodStart").value;
    const d = Math.max(1, parseInt($("sPeriodDays").value, 10) || 7);
    if (!s) { alert("请选择第 1 期起始日期"); return; }
    settings = { periodStart: s, periodDays: d };
    saveSettings();
    settingsModal.hidden = true;
    refresh();
  }

  // ---------- 导出 / 导入 ----------
  function exportData() {
    if (drops.length === 0) { alert("还没有可导出的数据"); return; }
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: settings,
      drops: drops,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8" });
    downloadBlob(blob, "cs2-drops-backup.json");
  }

  function importData() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          let imported = [];
          if (Array.isArray(data)) imported = data;
          else if (data && Array.isArray(data.drops)) imported = data.drops;
          else if (data && data.settings) imported = [];
          else throw new Error("bad format");

          // 合并：按 id 去重，跳过已存在的
          const map = new Map();
          drops.forEach((d) => map.set(d.id, d));
          let added = 0;
          imported.forEach((d) => {
            if (!d.id) d.id = uid();
            if (!map.has(d.id)) { map.set(d.id, d); added++; }
          });
          drops = Array.from(map.values());
          save();

          // 若文件带设置，一并恢复
          if (data && data.settings && data.settings.periodStart) {
            settings = data.settings;
            saveSettings();
          }

          refresh();
          alert(`导入完成：共 ${imported.length} 条，新增 ${added} 条，重复 ${imported.length - added} 条已跳过`);
        } catch (e) {
          alert("导入失败：文件格式无法识别，请选择之前导出的备份文件");
        }
      };
      reader.readAsText(file, "utf-8");
    };
    input.click();
  }

  // 导出 CSV（可读表格）
  function exportCsv() {
    if (drops.length === 0) { alert("还没有可导出的数据"); return; }
    const head = ["日期", "期", "名称", "类型", "品质", "数量", "到手价", "备注"];
    const rows = drops.map((d) => [
      d.date,
      "第 " + getPeriod(parseDate(d.date)).index + " 期",
      d.name,
      (CATEGORY_META[d.category] || {}).label || d.category,
      (RARITY_META[d.rarity] || {}).label || d.rarity,
      d.qty || 1,
      d.price || 0,
      d.note || "",
    ]);
    const csv = [head, ...rows].map((r) =>
      r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
    ).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    downloadBlob(blob, "cs2-drops.csv");
  }

  function clearAll() {
    if (!confirm("确定清空所有掉落记录吗？此操作不可恢复（建议先导出备份）。")) return;
    drops = [];
    save();
    refresh();
  }

  function downloadBlob(blob, filename) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  // ---------- 刷新 ----------
  function refresh() {
    renderTopStats();
    renderCalendar();
    renderPeriodBlocks();
  }

  // ---------- 事件绑定 ----------
  $("calPrev").addEventListener("click", calPrevMonth);
  $("calNext").addEventListener("click", calNextMonth);
  $("btnAdd").addEventListener("click", openAdd);
  $("btnClose").addEventListener("click", closeModal);
  $("btnSave").addEventListener("click", saveDrop);
  $("btnDelete").addEventListener("click", deleteDrop);
  $("btnStats").addEventListener("click", showStats);
  $("btnBack").addEventListener("click", goHome);
  $("btnSettings").addEventListener("click", openSettings);
  $("btnSettingsClose").addEventListener("click", () => (settingsModal.hidden = true));
  $("btnSettingsSave").addEventListener("click", saveSettingsModal);
  $("btnExportCsv").addEventListener("click", exportCsv);
  $("btnClearAll").addEventListener("click", clearAll);
  $("btnExport").addEventListener("click", exportData);
  $("btnImport").addEventListener("click", importData);

  $("sPeriodStart").addEventListener("change", updateSettingsPreview);
  $("sPeriodDays").addEventListener("input", updateSettingsPreview);
  $("statYear").addEventListener("change", (e) => renderPeriodStats(parseInt(e.target.value, 10)));

  $("fQtyMinus").addEventListener("click", () => {
    const i = $("fQty"); i.value = Math.max(1, (parseInt(i.value, 10) || 1) - 1);
  });
  $("fQtyPlus").addEventListener("click", () => {
    const i = $("fQty"); i.value = (parseInt(i.value, 10) || 1) + 1;
  });

  $("fName").addEventListener("input", showSuggest);
  $("fName").addEventListener("blur", () => setTimeout(hideSuggest, 200));
  $("fDate").addEventListener("change", updateDatePeriodInfo);

  $("quickPick").addEventListener("click", (e) => {
    const el = e.target.closest(".qp-item");
    if (!el) return;
    $("fName").value = el.dataset.name;
    setChip("fCategory", el.dataset.cat);
    clearQuickPickActive();
    el.classList.add("active");
    hideSuggest();
  });

  $("fCategory").addEventListener("click", (e) => {
    const c = e.target.closest(".chip"); if (c) setChip("fCategory", c.dataset.v);
  });
  $("fRarity").addEventListener("click", (e) => {
    const c = e.target.closest(".chip"); if (c) setChip("fRarity", c.dataset.v);
  });

  // 点击遮罩关闭
  [modal, settingsModal].forEach((m) => {
    m.addEventListener("click", (e) => { if (e.target === m) m.hidden = true; });
  });

  $("currency2").textContent = CURRENCY;

  // ---------- 启动 ----------
  renderQuickPick();
  refresh();
  if (location.hash === "#add") openAdd(); // 便于测试/快捷打开打卡弹窗
})();

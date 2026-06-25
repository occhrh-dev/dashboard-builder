// app.js
// จัดการ state หลักของแอป: แดชบอร์ดที่มีหลายแท็บ แต่ละแท็บมีกล่องที่แก้ไขได้

let boxIdCounter = 0;
function nextBoxId() {
  boxIdCounter += 1;
  return "box-" + boxIdCounter;
}

let tabIdCounter = 0;
function nextTabId() {
  tabIdCounter += 1;
  return "tab-" + tabIdCounter;
}

// โครง state หลัก: dashboard มีหลายแท็บ แต่ละแท็บมี grid + กล่อง
const appState = {
  tabs: [],          // [{ id, name, grid: {columns, rows}, boxes: [...] }]
  activeTabId: null,
  chartInstances: [] // เก็บ Chart.js instance ของแท็บที่กำลังแสดงอยู่ เพื่อ destroy ก่อน render ใหม่
};

const CHART_TYPE_OPTIONS = [
  { value: "stat", label: "ตัวเลขสรุป" },
  { value: "bar", label: "กราฟแท่ง" },
  { value: "line", label: "กราฟเส้น" },
  { value: "pie", label: "กราฟวงกลม" }
];

// สีเริ่มต้นของกราฟ (โทนราชการ: เขียวอมฟ้า, เหลืองดาวเรือง, ส้มแดง, ฟ้าอ่อน, ม่วงอ่อน)
// ใช้เป็น array เดียวกันทุกชนิดกราฟ (bar/line/pie) — แต่ละหมวดหมู่มีสีของตัวเองเสมอ
const DEFAULT_CHART_PALETTE = ["#0E7C7B", "#F2A93B", "#E85D4E", "#7FC6D9", "#B07BAC", "#5A8F3C", "#D4628F"];

// คืนสีตามตำแหน่ง idx โดยไล่วนซ้ำ palette ถ้าหมวดหมู่มากกว่าจำนวนสีที่มี
function colorAt(idx) {
  return DEFAULT_CHART_PALETTE[idx % DEFAULT_CHART_PALETTE.length];
}

// ---------- แปลง grid span string (เช่น "1 / 3" หรือ "2" หรือ "auto") เป็น {start, span} ----------
function parseGridSpan(value) {
  if (!value || value === "auto") return { start: 1, span: 1 };
  const parts = String(value).split("/").map(s => s.trim());
  if (parts.length === 2) {
    const start = parseInt(parts[0], 10) || 1;
    const end = parseInt(parts[1], 10) || (start + 1);
    return { start, span: Math.max(1, end - start) };
  }
  const single = parseInt(parts[0], 10) || 1;
  return { start: single, span: 1 };
}

// ---------- แปลง {start, span} กลับเป็น grid span string ----------
function formatGridSpan(start, span) {
  return `${start} / ${start + span}`;
}

// ---------- หาจำนวนคอลัมน์ทั้งหมดของแท็บ (จาก grid.columns เช่น "repeat(4, 1fr)") ----------
function getColumnCount(tab) {
  const match = tab.grid.columns.match(/repeat\((\d+)/);
  return match ? parseInt(match[1], 10) : 1;
}

// ---------- ปรับความกว้าง (จำนวนคอลัมน์) ของกล่อง ----------
function resizeBoxWidth(tabId, boxId, delta) {
  const tab = appState.tabs.find(t => t.id === tabId);
  if (!tab) return;
  const box = tab.boxes.find(b => b.id === boxId);
  if (!box) return;

  const totalCols = getColumnCount(tab);
  const { start, span } = parseGridSpan(box.col);
  const newSpan = Math.min(totalCols, Math.max(1, span + delta));

  box.col = formatGridSpan(start, newSpan);
  renderActiveTab();
}

// ---------- ปรับความสูง (จำนวนแถว) ของกล่อง ----------
function resizeBoxHeight(tabId, boxId, delta) {
  const tab = appState.tabs.find(t => t.id === tabId);
  if (!tab) return;
  const box = tab.boxes.find(b => b.id === boxId);
  if (!box) return;

  const { start, span } = parseGridSpan(box.row);
  const newSpan = Math.max(1, span + delta);

  box.row = formatGridSpan(start, newSpan);
  renderActiveTab();
}

// ---------- สร้างแท็บแรกจากเทมเพลตที่เลือก ----------
function createTabFromTemplate(template, tabName) {
  const boxes = template.boxes.map(b => ({
    id: nextBoxId(),
    type: b.type,
    col: b.col,
    row: b.row,
    label: b.label,
    value: b.value,
    unit: b.unit,
    labels: b.labels,
    data: b.data,
    color: b.type !== "stat" && b.labels
      ? b.labels.map((_, idx) => colorAt(idx))
      : undefined
  }));

  return {
    id: nextTabId(),
    name: tabName || template.name,
    grid: { columns: template.grid.columns, rows: template.grid.rows },
    boxes: boxes
  };
}

// ---------- Render รายการเทมเพลตให้เลือก (สำหรับสร้างแท็บใหม่) ----------
function renderTemplateGrid() {
  const grid = document.getElementById("templateGrid");
  grid.innerHTML = "";

  DASHBOARD_TEMPLATES.forEach(tpl => {
    const card = document.createElement("div");
    card.className = "template-card";
    card.dataset.templateId = tpl.id;

    const thumb = document.createElement("div");
    thumb.className = "template-thumb";
    thumb.style.gridTemplateColumns = tpl.grid.columns;
    thumb.style.gridTemplateRows = tpl.grid.rows;

    tpl.boxes.forEach(box => {
      const b = document.createElement("div");
      b.className = "thumb-box";
      b.style.gridColumn = box.col;
      b.style.gridRow = box.row;
      thumb.appendChild(b);
    });

    const name = document.createElement("p");
    name.className = "template-name";
    name.textContent = tpl.name;

    const meta = document.createElement("p");
    meta.className = "template-meta";
    meta.textContent = tpl.meta;

    card.appendChild(thumb);
    card.appendChild(name);
    card.appendChild(meta);

    card.addEventListener("click", () => {
      document.querySelectorAll(".template-card").forEach(c => c.classList.toggle("selected", c === card));
      addTabFromTemplateId(tpl.id);
    });

    grid.appendChild(card);
  });
}

// ---------- เพิ่มแท็บใหม่จากเทมเพลตที่เลือก ----------
function addTabFromTemplateId(templateId) {
  const tpl = DASHBOARD_TEMPLATES.find(t => t.id === templateId);
  if (!tpl) return;

  const tabName = "ชุดที่ " + (appState.tabs.length + 1);
  const newTab = createTabFromTemplate(tpl, tabName);
  appState.tabs.push(newTab);
  appState.activeTabId = newTab.id;

  renderTabBar();
  renderActiveTab();
}

// ---------- Render แถบแท็บด้านบนของพรีวิว ----------
function renderTabBar() {
  const tabBar = document.getElementById("tabBar");
  tabBar.innerHTML = "";

  appState.tabs.forEach(tab => {
    const tabEl = document.createElement("div");
    tabEl.className = "preview-tab" + (tab.id === appState.activeTabId ? " active" : "");

    const nameSpan = document.createElement("span");
    nameSpan.textContent = tab.name;
    nameSpan.className = "preview-tab-name";
    nameSpan.addEventListener("click", () => {
      appState.activeTabId = tab.id;
      renderTabBar();
      renderActiveTab();
    });

    const removeBtn = document.createElement("button");
    removeBtn.className = "preview-tab-remove";
    removeBtn.innerHTML = "&times;";
    removeBtn.title = "ลบแท็บนี้";
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      removeTab(tab.id);
    });

    tabEl.appendChild(nameSpan);
    tabEl.appendChild(removeBtn);
    tabBar.appendChild(tabEl);
  });

  const addTabBtn = document.createElement("button");
  addTabBtn.className = "preview-tab-add";
  addTabBtn.textContent = "+ เพิ่มแท็บ";
  addTabBtn.addEventListener("click", () => {
    document.getElementById("templateGrid").scrollIntoView({ behavior: "smooth", block: "center" });
  });
  tabBar.appendChild(addTabBtn);
}

// ---------- ลบแท็บ ----------
function removeTab(tabId) {
  const idx = appState.tabs.findIndex(t => t.id === tabId);
  if (idx === -1) return;

  appState.tabs.splice(idx, 1);

  if (appState.activeTabId === tabId) {
    appState.activeTabId = appState.tabs.length > 0 ? appState.tabs[Math.max(0, idx - 1)].id : null;
  }

  renderTabBar();
  renderActiveTab();
}

// ---------- เคลียร์ Chart.js instance เก่าก่อน render ใหม่ ----------
function destroyExistingCharts() {
  appState.chartInstances.forEach(chart => chart.destroy());
  appState.chartInstances = [];
}

// ---------- หาแท็บที่กำลังแสดงอยู่ ----------
function getActiveTab() {
  return appState.tabs.find(t => t.id === appState.activeTabId) || null;
}

// ---------- Render เนื้อหาของแท็บที่กำลังเลือกอยู่ ----------
function renderActiveTab() {
  const canvas = document.getElementById("previewCanvas");
  destroyExistingCharts();
  canvas.innerHTML = "";

  const tab = getActiveTab();

  if (!tab) {
    canvas.innerHTML = '<p class="preview-empty">เลือกรูปแบบหน้าด้านล่างเพื่อเริ่มสร้างแท็บแรก</p>';
    return;
  }

  const gridEl = document.createElement("div");
  gridEl.className = "preview-grid";
  gridEl.style.gridTemplateColumns = tab.grid.columns;
  gridEl.style.gridTemplateRows = tab.grid.rows;

  tab.boxes.forEach(box => {
    gridEl.appendChild(renderBoxElement(tab, box));
  });

  canvas.appendChild(gridEl);

  // เพิ่มปุ่ม "+ เพิ่มกล่อง" ท้ายแท็บ
  const addBoxRow = document.createElement("div");
  addBoxRow.className = "add-box-row";
  const addBoxBtn = document.createElement("button");
  addBoxBtn.className = "add-box-btn";
  addBoxBtn.textContent = "+ เพิ่มกล่อง";
  addBoxBtn.addEventListener("click", () => addBoxToTab(tab.id));
  addBoxRow.appendChild(addBoxBtn);
  canvas.appendChild(addBoxRow);

  // วาดกราฟ (ต้องทำหลังแปะ canvas เข้า DOM แล้ว)
  tab.boxes.forEach(box => {
    if (box.type === "bar" || box.type === "line" || box.type === "pie") {
      drawChartForBox(box);
    }
  });
}

// ---------- สร้าง element ของกล่องเดียว (รวม dropdown เปลี่ยนชนิด + ปุ่มลบ) ----------
function renderBoxElement(tab, box) {
  const boxEl = document.createElement("div");
  boxEl.className = "preview-box";
  boxEl.style.gridColumn = box.col;
  boxEl.style.gridRow = box.row;

  // แถบควบคุมด้านบนกล่อง: dropdown ชนิดกราฟ + ปุ่มลบ
  const controls = document.createElement("div");
  controls.className = "box-controls";

  const typeSelect = document.createElement("select");
  typeSelect.className = "box-type-select";
  CHART_TYPE_OPTIONS.forEach(opt => {
    const optionEl = document.createElement("option");
    optionEl.value = opt.value;
    optionEl.textContent = opt.label;
    if (opt.value === box.type) optionEl.selected = true;
    typeSelect.appendChild(optionEl);
  });
  typeSelect.addEventListener("change", (e) => {
    changeBoxType(tab.id, box.id, e.target.value);
  });

  const removeBoxBtn = document.createElement("button");
  removeBoxBtn.className = "box-remove-btn";
  removeBoxBtn.innerHTML = "&times;";
  removeBoxBtn.title = "ลบกล่องนี้";
  removeBoxBtn.addEventListener("click", () => removeBoxFromTab(tab.id, box.id));

  controls.appendChild(typeSelect);
  controls.appendChild(removeBoxBtn);
  boxEl.appendChild(controls);

  boxEl.appendChild(renderResizeControls(tab, box));

  if (box.type !== "stat") {
    boxEl.appendChild(renderColorPickerRow(tab, box));
  }

  const importBtn = document.createElement("button");
  importBtn.className = "box-import-btn";
  importBtn.textContent = box.sourceInfo ? "เปลี่ยนข้อมูล" : "นำเข้าข้อมูล";
  importBtn.addEventListener("click", () => openImportModal(tab.id, box.id));
  boxEl.appendChild(importBtn);

  if (box.type === "stat") {
    const body = document.createElement("div");
    body.innerHTML = `
      <p class="preview-box-label">${box.label}</p>
      <p class="preview-box-value">${box.value} <span style="font-size:14px;color:var(--color-text-muted);font-weight:400;">${box.unit || ""}</span></p>
    `;
    boxEl.appendChild(body);
  } else {
    const labelEl = document.createElement("p");
    labelEl.className = "preview-box-label";
    labelEl.textContent = box.label;
    const canvasEl = document.createElement("canvas");
    canvasEl.id = "chart-" + box.id;
    boxEl.appendChild(labelEl);
    boxEl.appendChild(canvasEl);
  }

  return boxEl;
}

// ---------- เปลี่ยนชนิดกราฟของกล่อง ----------
function changeBoxType(tabId, boxId, newType) {
  const tab = appState.tabs.find(t => t.id === tabId);
  if (!tab) return;
  const box = tab.boxes.find(b => b.id === boxId);
  if (!box) return;

  box.type = newType;

  // ถ้าเปลี่ยนเป็นกราฟแต่ยังไม่มี labels/data (เช่นเดิมเป็น stat) ใส่ค่าตัวอย่างให้
  if (newType !== "stat" && (!box.labels || !box.data)) {
    box.labels = ["หมวด A", "หมวด B", "หมวด C"];
    box.data = [10, 20, 15];
  }
  if (newType === "stat" && !box.value) {
    box.value = "0";
    box.unit = "";
  }
  // ตั้งสีเริ่มต้นให้กราฟตามจำนวนหมวดหมู่ (ทุกชนิดกราฟใช้ array สีเหมือนกัน)
  if (newType !== "stat") {
    const labelCount = (box.labels || []).length;
    if (!Array.isArray(box.color) || box.color.length < labelCount) {
      box.color = (box.labels || []).map((_, idx) =>
        (Array.isArray(box.color) && box.color[idx]) ? box.color[idx] : colorAt(idx)
      );
    }
  }

  renderActiveTab();
}

// ---------- เพิ่มกล่องใหม่เข้าแท็บ (ต่อแถวด้านล่างสุดเสมอ เพื่อไม่ชนกล่องเดิม) ----------
function addBoxToTab(tabId) {
  const tab = appState.tabs.find(t => t.id === tabId);
  if (!tab) return;

  const columnCount = (tab.grid.columns.match(/repeat\((\d+)/) || [null, "1"])[1];
  const newBox = {
    id: nextBoxId(),
    type: "stat",
    col: `1 / ${parseInt(columnCount, 10) + 1}`,
    row: "auto",
    label: "หัวข้อใหม่",
    value: "0",
    unit: ""
  };

  tab.boxes.push(newBox);
  renderActiveTab();
}

// ---------- ลบกล่องออกจากแท็บ ----------
function removeBoxFromTab(tabId, boxId) {
  const tab = appState.tabs.find(t => t.id === tabId);
  if (!tab) return;
  tab.boxes = tab.boxes.filter(b => b.id !== boxId);
  renderActiveTab();
}

// ---------- สร้างแถวปุ่มปรับขนาดกว้าง/สูงของกล่อง ----------
function renderResizeControls(tab, box) {
  const row = document.createElement("div");
  row.className = "box-resize-row";

  const widthGroup = document.createElement("div");
  widthGroup.className = "resize-group";
  const widthLabel = document.createElement("span");
  widthLabel.className = "resize-label";
  widthLabel.textContent = "กว้าง";
  const widthMinusBtn = document.createElement("button");
  widthMinusBtn.className = "resize-btn";
  widthMinusBtn.textContent = "−";
  widthMinusBtn.title = "ลดความกว้าง";
  widthMinusBtn.addEventListener("click", () => resizeBoxWidth(tab.id, box.id, -1));
  const widthPlusBtn = document.createElement("button");
  widthPlusBtn.className = "resize-btn";
  widthPlusBtn.textContent = "+";
  widthPlusBtn.title = "เพิ่มความกว้าง";
  widthPlusBtn.addEventListener("click", () => resizeBoxWidth(tab.id, box.id, 1));
  widthGroup.appendChild(widthLabel);
  widthGroup.appendChild(widthMinusBtn);
  widthGroup.appendChild(widthPlusBtn);

  const heightGroup = document.createElement("div");
  heightGroup.className = "resize-group";
  const heightLabel = document.createElement("span");
  heightLabel.className = "resize-label";
  heightLabel.textContent = "สูง";
  const heightMinusBtn = document.createElement("button");
  heightMinusBtn.className = "resize-btn";
  heightMinusBtn.textContent = "−";
  heightMinusBtn.title = "ลดความสูง";
  heightMinusBtn.addEventListener("click", () => resizeBoxHeight(tab.id, box.id, -1));
  const heightPlusBtn = document.createElement("button");
  heightPlusBtn.className = "resize-btn";
  heightPlusBtn.textContent = "+";
  heightPlusBtn.title = "เพิ่มความสูง";
  heightPlusBtn.addEventListener("click", () => resizeBoxHeight(tab.id, box.id, 1));
  heightGroup.appendChild(heightLabel);
  heightGroup.appendChild(heightMinusBtn);
  heightGroup.appendChild(heightPlusBtn);

  row.appendChild(widthGroup);
  row.appendChild(heightGroup);
  return row;
}

// ---------- สร้างแถว color picker สำหรับกล่องกราฟ (bar/line: สีเดียว, pie: หลายสีตามจำนวนหมวด) ----------
function renderColorPickerRow(tab, box) {
  const row = document.createElement("div");
  row.className = "box-color-row";

  const labels = box.labels || [];

  // ให้แน่ใจว่า color array มีจำนวนพอกับ labels เสมอ (เผื่อข้อมูลใหม่มีหมวดมากกว่าเดิม)
  if (!Array.isArray(box.color)) box.color = [];
  while (box.color.length < labels.length) {
    box.color.push(colorAt(box.color.length));
  }

  labels.forEach((label, idx) => {
    const swatchWrap = document.createElement("label");
    swatchWrap.className = "color-swatch-wrap";
    swatchWrap.title = label;

    const swatchInput = document.createElement("input");
    swatchInput.type = "color";
    swatchInput.className = "color-swatch-input";
    swatchInput.value = box.color[idx] || colorAt(idx);
    swatchInput.addEventListener("input", (e) => {
      box.color[idx] = e.target.value;
      redrawSingleChart(box);
    });

    swatchWrap.appendChild(swatchInput);
    row.appendChild(swatchWrap);
  });

  return row;
}

// ---------- วาดกราฟใหม่เฉพาะกล่องเดียว (ใช้ตอนเปลี่ยนสี ไม่ต้อง re-render กล่องอื่นทั้งหมด) ----------
function redrawSingleChart(box) {
  const existingIndex = appState.chartInstances.findIndex(c => c.canvas && c.canvas.id === "chart-" + box.id);
  if (existingIndex !== -1) {
    appState.chartInstances[existingIndex].destroy();
    appState.chartInstances.splice(existingIndex, 1);
  }
  drawChartForBox(box);
}

// ---------- วาดกราฟ Chart.js ให้กล่องเดียว ----------
function drawChartForBox(box) {
  const ctx = document.getElementById("chart-" + box.id);
  if (!ctx) return;

  // ทุกชนิดกราฟใช้ array สีตามจำนวนหมวดหมู่เสมอ (ความยาวควรเท่ากับ box.labels)
  const colorArray = Array.isArray(box.color) && box.color.length > 0
    ? box.color
    : (box.labels || []).map((_, idx) => colorAt(idx));

  let datasetConfig;

  if (box.type === "line") {
    // เส้นเชื่อมใช้สีกลางๆ (สีแรกในชุด) ส่วนจุดข้อมูลแต่ละจุดมีสีของตัวเองตามที่เลือก
    datasetConfig = {
      data: box.data,
      borderColor: colorArray[0] || DEFAULT_CHART_PALETTE[0],
      backgroundColor: colorArray,
      pointBackgroundColor: colorArray,
      pointBorderColor: colorArray,
      pointRadius: 5,
      pointHoverRadius: 7,
      borderWidth: 2,
      tension: 0.3,
      fill: false
    };
  } else if (box.type === "bar") {
    datasetConfig = {
      data: box.data,
      backgroundColor: colorArray,
      borderColor: colorArray,
      borderWidth: 0,
      borderRadius: 4
    };
  } else {
    // pie
    datasetConfig = {
      data: box.data,
      backgroundColor: colorArray,
      borderColor: "#ffffff",
      borderWidth: 2
    };
  }

  const chart = new Chart(ctx, {
    type: box.type,
    data: {
      labels: box.labels,
      datasets: [datasetConfig]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: box.type === "pie" } },
      scales: box.type === "pie" ? {} : {
        y: { beginAtZero: true, ticks: { font: { size: 11 } } },
        x: { ticks: { font: { size: 11 } } }
      }
    }
  });

  appState.chartInstances.push(chart);
}

// ---------- เริ่มต้นแอป ----------
document.addEventListener("DOMContentLoaded", () => {
  renderTemplateGrid();
  renderTabBar();
  // สร้างแท็บแรกอัตโนมัติจากเทมเพลตแรก เพื่อให้เห็นตัวอย่างทันทีที่เปิดหน้า
  if (DASHBOARD_TEMPLATES.length > 0) {
    addTabFromTemplateId(DASHBOARD_TEMPLATES[0].id);
  }
});

// expose สำหรับการทดสอบอัตโนมัติเท่านั้น (const top-level ไม่ leak เป็น window property ตาม JS spec)
if (typeof window !== "undefined") {
  window.__dashboardBuilderDebug = {
    getState: () => appState,
    addTabFromTemplateId,
    removeTab,
    changeBoxType,
    addBoxToTab,
    removeBoxFromTab,
    renderTabBar,
    renderActiveTab,
    resizeBoxWidth,
    resizeBoxHeight,
    parseGridSpan,
    getColumnCount
  };
}

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
    data: b.data
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

// ---------- วาดกราฟ Chart.js ให้กล่องเดียว ----------
function drawChartForBox(box) {
  const ctx = document.getElementById("chart-" + box.id);
  if (!ctx) return;

  const chart = new Chart(ctx, {
    type: box.type,
    data: {
      labels: box.labels,
      datasets: [{
        data: box.data,
        backgroundColor: box.type === "pie"
          ? ["#2563eb", "#60a5fa", "#bfdbfe", "#1d4ed8", "#93c5fd"]
          : "#2563eb",
        borderColor: "#2563eb",
        borderWidth: box.type === "line" ? 2 : 0,
        borderRadius: box.type === "bar" ? 4 : 0,
        tension: 0.3,
        fill: box.type === "line" ? false : true
      }]
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
    renderActiveTab
  };
}

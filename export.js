// export.js
// สร้างไฟล์ HTML แบบ standalone จาก state ปัจจุบันของ Builder
// ไฟล์ที่ export ออกไปต้องทำงานได้เองสมบูรณ์ ไม่พึ่ง app.js/data-import.js เดิม

// ---------- ฟังก์ชันหลัก: สร้างเนื้อหาไฟล์ HTML ทั้งไฟล์ ----------
function generateExportHTML(state) {
  // ตัด field ที่ไม่จำเป็นออกก่อนฝังลงไฟล์ (เช่น chartInstances ที่เป็น runtime object ของ Builder เอง)
  const exportState = {
    tabs: state.tabs.map(tab => ({
      id: tab.id,
      name: tab.name,
      grid: tab.grid,
      boxes: tab.boxes.map(box => ({
        id: box.id,
        type: box.type,
        col: box.col,
        row: box.row,
        label: box.label,
        value: box.value,
        unit: box.unit,
        labels: box.labels,
        data: box.data,
        color: box.color,
        sourceInfo: box.sourceInfo || null,
        sheetUrl: box.sheetUrl || null,      // ลิงก์ Google Sheet ต้นฉบับ ถ้ามี (สำหรับดึงข้อมูลสดตอนเปิดไฟล์)
        sheetName: box.sheetName || null,    // ชื่อชีตที่ใช้ ถ้ามาจากลิงก์หลายชีต
        aggMethod: box.aggMethod || null     // วิธีคำนวณ stat (sum/count/average/max/min) ถ้ามี
      }))
    })),
    activeTabId: state.activeTabId
  };

  const stateJSON = JSON.stringify(exportState);

  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>แดชบอร์ด</title>
<style>
${EXPORT_CSS}
</style>
</head>
<body>

<div class="dash-shell">
  <div class="dash-toolbar">
    <div class="dash-tabbar" id="dashTabBar"></div>
    <div class="dash-toolbar-actions">
      <span class="dash-live-note" id="dashLiveNote"></span>
      <button class="dash-edit-toggle" id="dashEditToggle">แก้ไข</button>
      <button class="dash-save-btn" id="dashSaveBtn" style="display:none;">บันทึกเป็นไฟล์ใหม่</button>
    </div>
  </div>
  <div class="dash-canvas" id="dashCanvas"></div>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
<script>
const DASH_STATE = ${stateJSON};
${EXPORT_RUNTIME_JS}
</script>
</body>
</html>`;
}

// ---------- CSS ของไฟล์ export (คัดมาจาก style.css เฉพาะส่วนที่ใช้แสดงผลแดชบอร์ดจริง) ----------
const EXPORT_CSS = `
:root {
  --color-bg: #FBF7EE;
  --color-surface: #ffffff;
  --color-border: #E5DCC8;
  --color-border-strong: #D4C7A8;
  --color-text: #1F2937;
  --color-text-muted: #6b6356;
  --color-text-faint: #a39a87;
  --color-accent: #0E7C7B;
  --color-accent-soft: #E3F1F0;
  --color-accent-text: #0a5f5e;
  --color-marigold: #F2A93B;
  --color-marigold-soft: #FDF1DD;
  --color-coral: #E85D4E;
  --color-coral-soft: #FBE9E6;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --font-main: "Sarabun", "Noto Sans Thai", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
* { box-sizing: border-box; }
body { margin: 0; font-family: var(--font-main); background: var(--color-bg); color: var(--color-text); }
.dash-shell { max-width: 1100px; margin: 0 auto; padding: 20px 24px 48px; }
.dash-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; flex-wrap: wrap; margin-bottom: 16px;
  border-top: 3px solid transparent;
  border-image: linear-gradient(90deg, var(--color-accent), var(--color-marigold), var(--color-coral)) 1;
  padding-top: 12px;
}
.dash-tabbar { display: flex; gap: 6px; flex-wrap: wrap; }
.dash-tab {
  padding: 8px 14px; font-size: 13px; border-radius: var(--radius-sm);
  border: 1px solid var(--color-border); background: var(--color-surface);
  color: var(--color-text-muted); cursor: pointer;
}
.dash-tab.active { background: var(--color-accent-soft); border-color: var(--color-accent); color: var(--color-accent-text); font-weight: 600; }
.dash-toolbar-actions { display: flex; align-items: center; gap: 10px; }
.dash-live-note { font-size: 12px; color: var(--color-text-faint); }
.dash-edit-toggle, .dash-save-btn {
  padding: 8px 16px; font-size: 13px; border-radius: var(--radius-sm); cursor: pointer; font-weight: 500;
}
.dash-edit-toggle { border: 1px solid var(--color-border); background: var(--color-surface); color: var(--color-text-muted); }
.dash-edit-toggle.active { background: var(--color-accent); color: white; border-color: var(--color-accent); }
.dash-save-btn { border: none; background: var(--color-coral); color: white; }
.dash-canvas { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 20px; }
.dash-grid { display: grid; grid-auto-flow: row dense; grid-auto-rows: 180px; gap: 12px; }
.dash-box {
  background: var(--color-surface); border: 1px solid var(--color-border); border-left: 4px solid var(--color-accent);
  border-radius: var(--radius-md); padding: 14px; height: 100%; display: flex; flex-direction: column;
}
.dash-grid > .dash-box:nth-child(2) { border-left-color: var(--color-marigold); }
.dash-grid > .dash-box:nth-child(3) { border-left-color: var(--color-coral); }
.dash-grid > .dash-box:nth-child(4) { border-left-color: #7FC6D9; }
.dash-grid > .dash-box:nth-child(5) { border-left-color: var(--color-accent); }
.dash-grid > .dash-box:nth-child(6) { border-left-color: var(--color-marigold); }
.dash-box-label { font-size: 12px; color: var(--color-text-muted); margin: 0 0 8px; }
.dash-box-value { font-size: 26px; font-weight: 600; color: var(--color-text); margin: 0; }
.dash-chart-wrap { position: relative; flex: 1; min-height: 0; width: 100%; }
.dash-chart-wrap canvas { position: absolute; top: 0; left: 0; width: 100% !important; height: 100% !important; }
.dash-edit-controls { display: none; margin-bottom: 8px; flex-wrap: wrap; gap: 10px; }
.dash-box.editing .dash-edit-controls { display: flex; }
.dash-resize-btn, .dash-align-btn {
  width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--color-border); border-radius: 4px; background: var(--color-bg);
  color: var(--color-text-muted); font-size: 12px; cursor: pointer; padding: 0;
}
.dash-edit-label { font-size: 11px; color: var(--color-text-faint); margin-right: 2px; }
.dash-edit-group { display: flex; align-items: center; gap: 4px; }
`;

// ---------- JavaScript runtime ที่ฝังในไฟล์ export (ทำงานเองสมบูรณ์ ไม่พึ่งไฟล์อื่น) ----------
const EXPORT_RUNTIME_JS = `
let dashEditMode = false;
let dashActiveTabId = DASH_STATE.activeTabId;
let dashChartInstances = [];

function dashGetActiveTab() {
  return DASH_STATE.tabs.find(t => t.id === dashActiveTabId) || DASH_STATE.tabs[0];
}

function dashRenderTabBar() {
  const bar = document.getElementById("dashTabBar");
  bar.innerHTML = "";
  DASH_STATE.tabs.forEach(tab => {
    const btn = document.createElement("button");
    btn.className = "dash-tab" + (tab.id === dashActiveTabId ? " active" : "");
    btn.textContent = tab.name;
    btn.addEventListener("click", () => { dashActiveTabId = tab.id; dashRenderTabBar(); dashRenderActiveTab(); });
    bar.appendChild(btn);
  });
}

function dashDestroyCharts() {
  dashChartInstances.forEach(c => c.destroy());
  dashChartInstances = [];
}

function dashColorAt(idx) {
  const palette = ["#0E7C7B", "#F2A93B", "#E85D4E", "#7FC6D9", "#B07BAC", "#5A8F3C", "#D4628F"];
  return palette[idx % palette.length];
}

function dashRenderActiveTab() {
  const canvas = document.getElementById("dashCanvas");
  dashDestroyCharts();
  canvas.innerHTML = "";
  const tab = dashGetActiveTab();
  if (!tab) return;

  const gridEl = document.createElement("div");
  gridEl.className = "dash-grid";
  gridEl.style.gridTemplateColumns = tab.grid.columns;

  tab.boxes.forEach(box => {
    gridEl.appendChild(dashRenderBox(tab, box));
  });

  canvas.appendChild(gridEl);

  requestAnimationFrame(() => {
    tab.boxes.forEach(box => {
      if (box.type === "bar" || box.type === "line" || box.type === "pie") {
        dashDrawChart(box);
      }
    });
  });
}

function dashRenderBox(tab, box) {
  const boxEl = document.createElement("div");
  boxEl.className = "dash-box" + (dashEditMode ? " editing" : "");
  boxEl.style.gridColumn = box.col;
  boxEl.style.gridRow = box.row;

  if (dashEditMode) {
    boxEl.appendChild(dashRenderEditControls(tab, box));
  }

  if (box.type === "stat") {
    const body = document.createElement("div");
    body.innerHTML = '<p class="dash-box-label">' + box.label + '</p><p class="dash-box-value">' + box.value + ' <span style="font-size:14px;color:var(--color-text-muted);font-weight:400;">' + (box.unit || "") + '</span></p>';
    boxEl.appendChild(body);
  } else {
    const labelEl = document.createElement("p");
    labelEl.className = "dash-box-label";
    labelEl.textContent = box.label;
    const wrap = document.createElement("div");
    wrap.className = "dash-chart-wrap";
    const canvasEl = document.createElement("canvas");
    canvasEl.id = "dchart-" + box.id;
    wrap.appendChild(canvasEl);
    boxEl.appendChild(labelEl);
    boxEl.appendChild(wrap);
  }

  return boxEl;
}

function dashParseSpan(value) {
  if (!value || value === "auto") return { start: 1, span: 1 };
  const parts = String(value).split("/").map(s => s.trim());
  if (parts.length === 2) {
    const start = parseInt(parts[0], 10) || 1;
    const end = parseInt(parts[1], 10) || (start + 1);
    return { start, span: Math.max(1, end - start) };
  }
  return { start: parseInt(parts[0], 10) || 1, span: 1 };
}

function dashFormatSpan(start, span) { return start + " / " + (start + span); }

function dashGetColCount(tab) {
  const m = tab.grid.columns.match(/repeat\\((\\d+)/);
  return m ? parseInt(m[1], 10) : 1;
}

function dashRenderEditControls(tab, box) {
  const wrap = document.createElement("div");
  wrap.className = "dash-edit-controls";

  function makeBtn(label, onClick) {
    const b = document.createElement("button");
    b.className = "dash-resize-btn";
    b.textContent = label;
    b.addEventListener("click", onClick);
    return b;
  }

  const widthGroup = document.createElement("div");
  widthGroup.className = "dash-edit-group";
  const widthLabel = document.createElement("span");
  widthLabel.className = "dash-edit-label";
  widthLabel.textContent = "กว้าง";
  widthGroup.appendChild(widthLabel);
  widthGroup.appendChild(makeBtn("−", () => dashResizeWidth(tab, box, -1)));
  widthGroup.appendChild(makeBtn("+", () => dashResizeWidth(tab, box, 1)));

  const heightGroup = document.createElement("div");
  heightGroup.className = "dash-edit-group";
  const heightLabel = document.createElement("span");
  heightLabel.className = "dash-edit-label";
  heightLabel.textContent = "สูง";
  heightGroup.appendChild(heightLabel);
  heightGroup.appendChild(makeBtn("−", () => dashResizeHeight(tab, box, -1)));
  heightGroup.appendChild(makeBtn("+", () => dashResizeHeight(tab, box, 1)));

  const alignGroup = document.createElement("div");
  alignGroup.className = "dash-edit-group";
  const alignLabel = document.createElement("span");
  alignLabel.className = "dash-edit-label";
  alignLabel.textContent = "ตำแหน่ง";
  alignGroup.appendChild(alignLabel);
  alignGroup.appendChild(makeBtn("⇤", () => dashAlign(tab, box, "left")));
  alignGroup.appendChild(makeBtn("⇔", () => dashAlign(tab, box, "center")));
  alignGroup.appendChild(makeBtn("⇥", () => dashAlign(tab, box, "right")));

  wrap.appendChild(widthGroup);
  wrap.appendChild(heightGroup);
  wrap.appendChild(alignGroup);
  return wrap;
}

function dashResizeWidth(tab, box, delta) {
  const total = dashGetColCount(tab);
  const { start, span } = dashParseSpan(box.col);
  box.col = dashFormatSpan(start, Math.min(total, Math.max(1, span + delta)));
  dashRenderActiveTab();
}

function dashResizeHeight(tab, box, delta) {
  const { start, span } = dashParseSpan(box.row);
  box.row = dashFormatSpan(start, Math.max(1, span + delta));
  dashRenderActiveTab();
}

function dashAlign(tab, box, alignment) {
  const total = dashGetColCount(tab);
  const { span } = dashParseSpan(box.col);
  let newStart;
  if (alignment === "left") newStart = 1;
  else if (alignment === "right") newStart = Math.max(1, total - span + 1);
  else newStart = Math.max(1, Math.floor((total - span) / 2) + 1);
  box.col = dashFormatSpan(newStart, span);
  dashRenderActiveTab();
}

function dashDrawChart(box) {
  const ctx = document.getElementById("dchart-" + box.id);
  if (!ctx) return;
  const colorArray = Array.isArray(box.color) && box.color.length > 0 ? box.color : (box.labels || []).map((_, i) => dashColorAt(i));

  let datasetConfig;
  if (box.type === "line") {
    datasetConfig = { data: box.data, borderColor: colorArray[0] || "#0E7C7B", backgroundColor: colorArray, pointBackgroundColor: colorArray, pointBorderColor: colorArray, pointRadius: 5, pointHoverRadius: 7, borderWidth: 2, tension: 0.3, fill: false };
  } else if (box.type === "bar") {
    datasetConfig = { data: box.data, backgroundColor: colorArray, borderColor: colorArray, borderWidth: 0, borderRadius: 4 };
  } else {
    datasetConfig = { data: box.data, backgroundColor: colorArray, borderColor: "#ffffff", borderWidth: 2 };
  }

  const chart = new Chart(ctx, {
    type: box.type,
    data: { labels: box.labels, datasets: [datasetConfig] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: box.type === "pie" } },
      scales: box.type === "pie" ? {} : { y: { beginAtZero: true, ticks: { font: { size: 11 } } }, x: { ticks: { font: { size: 11 } } } }
    }
  });
  dashChartInstances.push(chart);
}

// ---------- ดึงข้อมูลสดจาก Google Sheet สำหรับกล่องที่ผูกลิงก์ไว้ (ทำงานตอนเปิดไฟล์ทุกครั้ง) ----------
function dashRefreshLiveData() {
  const liveBoxes = [];
  DASH_STATE.tabs.forEach(tab => {
    tab.boxes.forEach(box => {
      if (box.sheetUrl) liveBoxes.push(box);
    });
  });

  if (liveBoxes.length === 0) {
    document.getElementById("dashLiveNote").textContent = "";
    return;
  }

  document.getElementById("dashLiveNote").textContent = "กำลังอัปเดตข้อมูลสด...";

  const uniqueUrls = [...new Set(liveBoxes.map(b => b.sheetUrl))];
  const fetchPromises = uniqueUrls.map(url =>
    fetch(url).then(r => r.ok ? r.arrayBuffer() : Promise.reject(new Error("fetch failed"))).then(buf => ({ url, workbook: XLSX.read(new Uint8Array(buf), { type: "array" }) })).catch(() => ({ url, workbook: null }))
  );

  Promise.all(fetchPromises).then(results => {
    const workbookByUrl = {};
    results.forEach(r => { workbookByUrl[r.url] = r.workbook; });

    liveBoxes.forEach(box => {
      const wb = workbookByUrl[box.sheetUrl];
      if (!wb) return;
      const sheetName = box.sheetName && wb.SheetNames.includes(box.sheetName) ? box.sheetName : wb.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: null });
      if (rows.length === 0) return;

      if (box.type === "stat" && box.aggMethod && box.sourceInfo && box.sourceInfo.column) {
        const values = rows.map(r => Number(r[box.sourceInfo.column])).filter(v => !isNaN(v));
        if (values.length === 0) return;
        let result = 0;
        if (box.aggMethod === "sum") result = values.reduce((a, b) => a + b, 0);
        else if (box.aggMethod === "count") result = values.length;
        else if (box.aggMethod === "average") result = values.reduce((a, b) => a + b, 0) / values.length;
        else if (box.aggMethod === "max") result = Math.max(...values);
        else if (box.aggMethod === "min") result = Math.min(...values);
        box.value = box.aggMethod === "average" ? result.toLocaleString("th-TH", { maximumFractionDigits: 2 }) : Math.round(result).toLocaleString("th-TH");
      } else if (box.sourceInfo && box.sourceInfo.labelColumn && box.sourceInfo.valueColumn) {
        const grouped = {};
        rows.forEach(r => {
          const label = r[box.sourceInfo.labelColumn];
          const value = Number(r[box.sourceInfo.valueColumn]);
          if (label === null || label === undefined || isNaN(value)) return;
          const key = String(label);
          grouped[key] = (grouped[key] || 0) + value;
        });
        box.labels = Object.keys(grouped);
        box.data = Object.values(grouped);
      }
    });

    document.getElementById("dashLiveNote").textContent = "อัปเดตข้อมูลสดล่าสุดแล้ว";
    dashRenderActiveTab();
  });
}

// ---------- สลับโหมดแก้ไข ----------
document.getElementById("dashEditToggle").addEventListener("click", () => {
  dashEditMode = !dashEditMode;
  document.getElementById("dashEditToggle").classList.toggle("active", dashEditMode);
  document.getElementById("dashEditToggle").textContent = dashEditMode ? "กำลังแก้ไข" : "แก้ไข";
  document.getElementById("dashSaveBtn").style.display = dashEditMode ? "inline-block" : "none";
  dashRenderActiveTab();
});

// ---------- บันทึกเป็นไฟล์ใหม่ (ดาวน์โหลดไฟล์ HTML ที่มีการแก้ไขฝังอยู่) ----------
document.getElementById("dashSaveBtn").addEventListener("click", () => {
  const newState = { tabs: DASH_STATE.tabs, activeTabId: dashActiveTabId };
  const newHTML = document.documentElement.outerHTML.replace(
    /const DASH_STATE = .*?;\\n/,
    "const DASH_STATE = " + JSON.stringify(newState) + ";\\n"
  );
  const blob = new Blob(["<!DOCTYPE html>\\n" + newHTML], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "แดชบอร์ด-แก้ไขแล้ว.html";
  a.click();
  URL.revokeObjectURL(url);
});

dashRenderTabBar();
dashRenderActiveTab();
dashRefreshLiveData();
`;

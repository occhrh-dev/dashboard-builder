// data-import.js
// จัดการอ่านไฟล์ Excel/CSV ด้วย SheetJS (อ่านฝั่ง browser ทั้งหมด ไม่มี server)

// state ของ modal นำเข้าข้อมูลที่กำลังเปิดอยู่ (ผูกกับกล่องเดียว ณ ขณะนั้น)
const importState = {
  targetTabId: null,
  targetBoxId: null,
  workbook: null,        // SheetJS workbook object
  sheetNames: [],
  selectedSheet: null,
  columns: [],            // ชื่อคอลัมน์จากหัวตาราง (แถวแรก)
  rows: []                // ข้อมูลทั้งหมดของชีตที่เลือก (array of objects)
};

// ---------- เปิด modal นำเข้าข้อมูลสำหรับกล่องใดกล่องหนึ่ง ----------
function openImportModal(tabId, boxId) {
  importState.targetTabId = tabId;
  importState.targetBoxId = boxId;
  importState.workbook = null;
  importState.sheetNames = [];
  importState.selectedSheet = null;
  importState.columns = [];
  importState.rows = [];

  renderImportModal();
  document.getElementById("importModalOverlay").style.display = "flex";
}

// ---------- ปิด modal ----------
function closeImportModal() {
  document.getElementById("importModalOverlay").style.display = "none";
}

// ---------- อ่านไฟล์ที่ผู้ใช้เลือก ----------
function handleFileSelected(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      importState.workbook = workbook;
      importState.sheetNames = workbook.SheetNames;
      importState.selectedSheet = workbook.SheetNames[0];
      loadSheetData(importState.selectedSheet);
      renderImportModal();
    } catch (err) {
      showImportError("ไม่สามารถอ่านไฟล์นี้ได้ — กรุณาตรวจสอบว่าเป็นไฟล์ .xlsx, .xls หรือ .csv ที่ถูกต้อง");
    }
  };
  reader.readAsArrayBuffer(file);
}

// ---------- โหลดข้อมูลจากชีตที่เลือก ----------
function loadSheetData(sheetName) {
  const sheet = importState.workbook.Sheets[sheetName];
  const jsonRows = XLSX.utils.sheet_to_json(sheet, { defval: null });

  if (jsonRows.length === 0) {
    importState.columns = [];
    importState.rows = [];
    return;
  }

  importState.columns = Object.keys(jsonRows[0]);
  importState.rows = jsonRows;
}

// ---------- เปลี่ยนชีตที่เลือก ----------
function handleSheetChange(sheetName) {
  importState.selectedSheet = sheetName;
  loadSheetData(sheetName);
  renderImportModal();
}

// ---------- เดาว่าคอลัมน์เป็นตัวเลขหรือไม่ (สำหรับช่วยแนะนำตอนเลือก) ----------
function isColumnNumeric(columnName) {
  const sample = importState.rows.slice(0, 20);
  if (sample.length === 0) return false;
  const numericCount = sample.filter(row => {
    const v = row[columnName];
    return v !== null && v !== "" && !isNaN(Number(v));
  }).length;
  return numericCount >= sample.length * 0.7;
}

// ---------- คำนวณค่าสรุปสำหรับกล่อง stat ----------
function computeAggregate(columnName, method) {
  const values = importState.rows
    .map(row => Number(row[columnName]))
    .filter(v => !isNaN(v));

  if (values.length === 0) return 0;

  switch (method) {
    case "sum": return values.reduce((a, b) => a + b, 0);
    case "count": return values.length;
    case "average": return values.reduce((a, b) => a + b, 0) / values.length;
    case "max": return Math.max(...values);
    case "min": return Math.min(...values);
    default: return 0;
  }
}

// ---------- รวมข้อมูลตาม label column (สำหรับกราฟ ถ้า label ซ้ำกันให้รวมค่ากัน) ----------
function buildChartDataFromColumns(labelColumn, valueColumn) {
  const grouped = {};
  importState.rows.forEach(row => {
    const label = row[labelColumn];
    const value = Number(row[valueColumn]);
    if (label === null || label === undefined || isNaN(value)) return;
    const key = String(label);
    grouped[key] = (grouped[key] || 0) + value;
  });

  return {
    labels: Object.keys(grouped),
    data: Object.values(grouped)
  };
}

function showImportError(message) {
  const errorEl = document.getElementById("importError");
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = "block";
  }
}

function clearImportError() {
  const errorEl = document.getElementById("importError");
  if (errorEl) errorEl.style.display = "none";
}

// ---------- Render เนื้อหาภายใน modal ตาม state ปัจจุบัน ----------
function renderImportModal() {
  clearImportError();

  const tab = appState.tabs.find(t => t.id === importState.targetTabId);
  const box = tab ? tab.boxes.find(b => b.id === importState.targetBoxId) : null;
  const isStatBox = box && box.type === "stat";

  const body = document.getElementById("importModalBody");
  body.innerHTML = "";

  // ----- ขั้นที่ 1: เลือกไฟล์ -----
  const fileSection = document.createElement("div");
  fileSection.className = "import-section";
  const fileLabel = document.createElement("label");
  fileLabel.className = "import-label";
  fileLabel.textContent = "1. เลือกไฟล์ (.xlsx, .xls, .csv)";
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".xlsx,.xls,.csv";
  fileInput.className = "import-file-input";
  fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  });
  fileSection.appendChild(fileLabel);
  fileSection.appendChild(fileInput);
  body.appendChild(fileSection);

  if (!importState.workbook) {
    appendImportFooter(body, false);
    return;
  }

  // ----- ขั้นที่ 2: เลือกชีต (ถ้ามีหลายชีต) -----
  if (importState.sheetNames.length > 1) {
    const sheetSection = document.createElement("div");
    sheetSection.className = "import-section";
    const sheetLabel = document.createElement("label");
    sheetLabel.className = "import-label";
    sheetLabel.textContent = "2. เลือกชีตที่ต้องการใช้";
    const sheetSelect = document.createElement("select");
    sheetSelect.className = "import-select";
    importState.sheetNames.forEach(name => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      if (name === importState.selectedSheet) opt.selected = true;
      sheetSelect.appendChild(opt);
    });
    sheetSelect.addEventListener("change", (e) => handleSheetChange(e.target.value));
    sheetSection.appendChild(sheetLabel);
    sheetSection.appendChild(sheetSelect);
    body.appendChild(sheetSection);
  }

  if (importState.columns.length === 0) {
    showImportError("ไม่พบข้อมูลในชีตนี้ — กรุณาตรวจสอบว่าแถวแรกเป็นหัวตาราง (ชื่อคอลัมน์)");
    appendImportFooter(body, false);
    return;
  }

  // ----- ขั้นที่ 3: preview ข้อมูล 3 แถวแรก -----
  const previewSection = document.createElement("div");
  previewSection.className = "import-section";
  const previewLabel = document.createElement("label");
  previewLabel.className = "import-label";
  previewLabel.textContent = "ตัวอย่างข้อมูล (3 แถวแรก)";
  previewSection.appendChild(previewLabel);

  const previewTable = document.createElement("table");
  previewTable.className = "import-preview-table";
  const headRow = document.createElement("tr");
  importState.columns.forEach(col => {
    const th = document.createElement("th");
    th.textContent = col;
    headRow.appendChild(th);
  });
  previewTable.appendChild(headRow);

  importState.rows.slice(0, 3).forEach(row => {
    const tr = document.createElement("tr");
    importState.columns.forEach(col => {
      const td = document.createElement("td");
      td.textContent = row[col] === null ? "—" : row[col];
      tr.appendChild(td);
    });
    previewTable.appendChild(tr);
  });
  previewSection.appendChild(previewTable);
  body.appendChild(previewSection);

  // ----- ขั้นที่ 4: เลือกคอลัมน์ -----
  if (isStatBox) {
    appendStatColumnPicker(body);
  } else {
    appendChartColumnPicker(body);
  }

  appendImportFooter(body, true);
}

// ---------- ตัวเลือกคอลัมน์สำหรับกล่อง stat: คอลัมน์ตัวเลข + วิธีคำนวณ ----------
function appendStatColumnPicker(body) {
  const section = document.createElement("div");
  section.className = "import-section import-grid-2";

  const colWrap = document.createElement("div");
  const colLabel = document.createElement("label");
  colLabel.className = "import-label";
  colLabel.textContent = "3. คอลัมน์ตัวเลข";
  const colSelect = document.createElement("select");
  colSelect.className = "import-select";
  colSelect.id = "statColumnSelect";
  importState.columns.forEach(col => {
    const opt = document.createElement("option");
    opt.value = col;
    opt.textContent = col + (isColumnNumeric(col) ? "" : " (อาจไม่ใช่ตัวเลข)");
    colSelect.appendChild(opt);
  });
  colWrap.appendChild(colLabel);
  colWrap.appendChild(colSelect);

  const methodWrap = document.createElement("div");
  const methodLabel = document.createElement("label");
  methodLabel.className = "import-label";
  methodLabel.textContent = "4. วิธีคำนวณ";
  const methodSelect = document.createElement("select");
  methodSelect.className = "import-select";
  methodSelect.id = "statMethodSelect";
  [
    { value: "sum", label: "รวมยอด (sum)" },
    { value: "count", label: "นับจำนวนแถว (count)" },
    { value: "average", label: "ค่าเฉลี่ย (average)" },
    { value: "max", label: "ค่าสูงสุด (max)" },
    { value: "min", label: "ค่าต่ำสุด (min)" }
  ].forEach(opt => {
    const optionEl = document.createElement("option");
    optionEl.value = opt.value;
    optionEl.textContent = opt.label;
    methodSelect.appendChild(optionEl);
  });
  methodWrap.appendChild(methodLabel);
  methodWrap.appendChild(methodSelect);

  section.appendChild(colWrap);
  section.appendChild(methodWrap);
  body.appendChild(section);
}

// ---------- ตัวเลือกคอลัมน์สำหรับกล่องกราฟ: label column + value column ----------
function appendChartColumnPicker(body) {
  const section = document.createElement("div");
  section.className = "import-section import-grid-2";

  const labelWrap = document.createElement("div");
  const labelLabel = document.createElement("label");
  labelLabel.className = "import-label";
  labelLabel.textContent = "3. คอลัมน์ที่ใช้เป็นหมวดหมู่ (แกน X)";
  const labelSelect = document.createElement("select");
  labelSelect.className = "import-select";
  labelSelect.id = "chartLabelSelect";
  importState.columns.forEach(col => {
    const opt = document.createElement("option");
    opt.value = col;
    opt.textContent = col;
    labelSelect.appendChild(opt);
  });
  labelWrap.appendChild(labelLabel);
  labelWrap.appendChild(labelSelect);

  const valueWrap = document.createElement("div");
  const valueLabel = document.createElement("label");
  valueLabel.className = "import-label";
  valueLabel.textContent = "4. คอลัมน์ตัวเลข (แกน Y)";
  const valueSelect = document.createElement("select");
  valueSelect.className = "import-select";
  valueSelect.id = "chartValueSelect";
  let defaultSet = false;
  importState.columns.forEach(col => {
    const opt = document.createElement("option");
    opt.value = col;
    opt.textContent = col + (isColumnNumeric(col) ? "" : " (อาจไม่ใช่ตัวเลข)");
    if (isColumnNumeric(col) && !defaultSet) {
      opt.selected = true;
      defaultSet = true;
    }
    valueSelect.appendChild(opt);
  });
  valueWrap.appendChild(valueLabel);
  valueWrap.appendChild(valueSelect);

  section.appendChild(labelWrap);
  section.appendChild(valueWrap);
  body.appendChild(section);
}

// ---------- ปุ่ม ยืนยัน / ยกเลิก ด้านล่าง modal ----------
function appendImportFooter(body, canConfirm) {
  const footer = document.createElement("div");
  footer.className = "import-footer";

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "import-cancel-btn";
  cancelBtn.textContent = "ยกเลิก";
  cancelBtn.addEventListener("click", closeImportModal);

  const confirmBtn = document.createElement("button");
  confirmBtn.className = "import-confirm-btn";
  confirmBtn.textContent = "ยืนยันนำเข้าข้อมูล";
  confirmBtn.disabled = !canConfirm;
  confirmBtn.addEventListener("click", confirmImport);

  footer.appendChild(cancelBtn);
  footer.appendChild(confirmBtn);
  body.appendChild(footer);
}

// ---------- ยืนยันการนำเข้าข้อมูล: เขียนค่าลงกล่องจริง แล้ว re-render ----------
function confirmImport() {
  const tab = appState.tabs.find(t => t.id === importState.targetTabId);
  if (!tab) return;
  const box = tab.boxes.find(b => b.id === importState.targetBoxId);
  if (!box) return;

  if (box.type === "stat") {
    const column = document.getElementById("statColumnSelect").value;
    const method = document.getElementById("statMethodSelect").value;
    const result = computeAggregate(column, method);

    box.value = formatStatValue(result, method);
    box.unit = "";
    box.sourceInfo = { column, method };
  } else {
    const labelColumn = document.getElementById("chartLabelSelect").value;
    const valueColumn = document.getElementById("chartValueSelect").value;
    const chartData = buildChartDataFromColumns(labelColumn, valueColumn);

    box.labels = chartData.labels;
    box.data = chartData.data;
    box.sourceInfo = { labelColumn, valueColumn };
  }

  closeImportModal();
  renderActiveTab();
}

// ---------- จัดรูปแบบตัวเลขผลลัพธ์ของ stat ให้อ่านง่าย ----------
function formatStatValue(value, method) {
  if (method === "average") {
    return value.toLocaleString("th-TH", { maximumFractionDigits: 2 });
  }
  return Math.round(value).toLocaleString("th-TH");
}

// expose สำหรับการทดสอบอัตโนมัติเท่านั้น (const top-level ไม่ leak เป็น window property ตาม JS spec)
if (typeof window !== "undefined") {
  window.importState = importState;
  window.openImportModal = openImportModal;
  window.handleFileSelected = handleFileSelected;
  window.handleSheetChange = handleSheetChange;
  window.confirmImport = confirmImport;
}

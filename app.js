// app.js
// จัดการ state หลักของแอป: เทมเพลตที่เลือก, การ render พรีวิว

const appState = {
  currentStep: 2,        // เริ่มที่ step 2 ตามที่ตกลงกัน (ข้ามนำเข้าข้อมูลไปก่อน)
  selectedTemplateId: null,
  chartInstances: []     // เก็บ Chart.js instance ไว้ destroy ตอนเปลี่ยนเทมเพลต
};

// ---------- Render รายการเทมเพลตให้เลือก ----------
function renderTemplateGrid() {
  const grid = document.getElementById("templateGrid");
  grid.innerHTML = "";

  DASHBOARD_TEMPLATES.forEach(tpl => {
    const card = document.createElement("div");
    card.className = "template-card";
    card.dataset.templateId = tpl.id;

    // thumbnail ย่อ: แสดงสัดส่วนกล่องคร่าวๆ ตาม grid จริง
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

    card.addEventListener("click", () => selectTemplate(tpl.id));

    grid.appendChild(card);
  });
}

// ---------- เลือกเทมเพลต ----------
function selectTemplate(templateId) {
  appState.selectedTemplateId = templateId;

  document.querySelectorAll(".template-card").forEach(card => {
    card.classList.toggle("selected", card.dataset.templateId === templateId);
  });

  renderPreview(templateId);
}

// ---------- เคลียร์ Chart.js instance เก่าก่อน render ใหม่ ----------
function destroyExistingCharts() {
  appState.chartInstances.forEach(chart => chart.destroy());
  appState.chartInstances = [];
}

// ---------- Render พรีวิวจริงของเทมเพลตที่เลือก ----------
function renderPreview(templateId) {
  const tpl = DASHBOARD_TEMPLATES.find(t => t.id === templateId);
  const canvas = document.getElementById("previewCanvas");

  destroyExistingCharts();
  canvas.innerHTML = "";

  if (!tpl) {
    canvas.innerHTML = '<p class="preview-empty">เลือกรูปแบบหน้าด้านบนเพื่อดูตัวอย่าง</p>';
    return;
  }

  const gridEl = document.createElement("div");
  gridEl.className = "preview-grid";
  gridEl.style.gridTemplateColumns = tpl.grid.columns;
  gridEl.style.gridTemplateRows = tpl.grid.rows;

  tpl.boxes.forEach((box, index) => {
    const boxEl = document.createElement("div");
    boxEl.className = "preview-box";
    boxEl.style.gridColumn = box.col;
    boxEl.style.gridRow = box.row;

    if (box.type === "stat") {
      boxEl.innerHTML = `
        <p class="preview-box-label">${box.label}</p>
        <p class="preview-box-value">${box.value} <span style="font-size:14px;color:var(--color-text-muted);font-weight:400;">${box.unit || ""}</span></p>
      `;
    } else {
      const labelEl = document.createElement("p");
      labelEl.className = "preview-box-label";
      labelEl.textContent = box.label;
      const canvasEl = document.createElement("canvas");
      canvasEl.id = `chart-${index}`;
      boxEl.appendChild(labelEl);
      boxEl.appendChild(canvasEl);
    }

    gridEl.appendChild(boxEl);
  });

  canvas.appendChild(gridEl);

  // วาดกราฟหลังจากแปะ canvas เข้า DOM แล้ว
  tpl.boxes.forEach((box, index) => {
    if (box.type === "bar" || box.type === "line" || box.type === "pie") {
      const ctx = document.getElementById(`chart-${index}`);
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
  });
}

// ---------- เริ่มต้นแอป ----------
document.addEventListener("DOMContentLoaded", () => {
  renderTemplateGrid();
  // เลือกเทมเพลตแรกให้อัตโนมัติเพื่อให้เห็นตัวอย่างทันที
  if (DASHBOARD_TEMPLATES.length > 0) {
    selectTemplate(DASHBOARD_TEMPLATES[0].id);
  }
});

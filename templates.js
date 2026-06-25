// templates.js
// นิยามรูปแบบ layout สำเร็จรูป (เทมเพลต) ที่ผู้ใช้เลือกได้
// แต่ละเทมเพลตมี: id, name, meta (คำอธิบายสั้น), grid (โครง CSS grid),
// boxes (รายการกล่อง: ตำแหน่ง gridColumn/gridRow, ชนิด, ข้อมูลตัวอย่าง)

const DASHBOARD_TEMPLATES = [

  {
    id: "summary-4-1",
    name: "สรุปตัวเลข 4 + กราฟใหญ่ 1",
    meta: "เหมาะกับภาพรวม KPI ด้านบน กราฟหลักด้านล่าง",
    grid: {
      columns: "repeat(4, 1fr)",
      rows: "auto auto"
    },
    boxes: [
      { type: "stat", col: "1 / 2", row: "1", label: "จำนวนสถานประกอบการ", value: "3,025", unit: "แห่ง" },
      { type: "stat", col: "2 / 3", row: "1", label: "จำนวนแรงงาน", value: "722,589", unit: "คน" },
      { type: "stat", col: "3 / 4", row: "1", label: "ตรวจสุขภาพแล้ว", value: "2,345", unit: "ราย" },
      { type: "stat", col: "4 / 5", row: "1", label: "อุบัติเหตุจากงาน", value: "234", unit: "ราย" },
      { type: "bar", col: "1 / 5", row: "2", label: "จำนวนเคสตามหน่วยงาน",
        labels: ["อำเภอ A", "อำเภอ B", "อำเภอ C", "อำเภอ D"],
        data: [42, 31, 25, 18] }
    ]
  },

  {
    id: "big-small-grid",
    name: "กล่องใหญ่ 1 + กล่องเล็ก 4",
    meta: "เน้นกราฟหลักตรงกลาง ล้อมด้วยตัวเลขย่อย",
    grid: {
      columns: "repeat(4, 1fr)",
      rows: "repeat(2, auto)"
    },
    boxes: [
      { type: "line", col: "1 / 3", row: "1 / 3", label: "แนวโน้มรายเดือน",
        labels: ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย."],
        data: [12, 19, 14, 22, 18, 25] },
      { type: "stat", col: "3 / 5", row: "1", label: "ยอดสะสมปีนี้", value: "1,204", unit: "ราย" },
      { type: "stat", col: "3 / 4", row: "2", label: "เพิ่มขึ้นจากเดือนก่อน", value: "+8.2", unit: "%" },
      { type: "stat", col: "4 / 5", row: "2", label: "หน่วยงานที่รายงาน", value: "13", unit: "อำเภอ" }
    ]
  },

  {
    id: "grid-3x2",
    name: "ตาราง 3 × 2 เท่ากันหมด",
    meta: "เหมาะเมื่อมีหลายหัวข้อสำคัญเท่าๆ กัน",
    grid: {
      columns: "repeat(3, 1fr)",
      rows: "repeat(2, auto)"
    },
    boxes: [
      { type: "stat", col: "1 / 2", row: "1", label: "สถานประกอบการ", value: "3,025", unit: "แห่ง" },
      { type: "stat", col: "2 / 3", row: "1", label: "แรงงานทั้งหมด", value: "722,589", unit: "คน" },
      { type: "pie", col: "3 / 4", row: "1 / 3", label: "สัดส่วนตามขนาดธุรกิจ",
        labels: ["ขนาดเล็ก", "ขนาดกลาง", "ขนาดใหญ่"],
        data: [55, 30, 15] },
      { type: "bar", col: "1 / 3", row: "2", label: "โรคจากการทำงานตามระบบ",
        labels: ["ระบบหายใจ", "ผิวหนัง", "กระดูก/กล้ามเนื้อ", "การได้ยิน"],
        data: [14, 9, 21, 6] }
    ]
  },

  {
    id: "single-focus",
    name: "กราฟเดียวเต็มหน้า",
    meta: "เน้นเรื่องเดียว ใช้พรีเซนต์หรือจอแสดงผลรวม",
    grid: {
      columns: "1fr",
      rows: "auto"
    },
    boxes: [
      { type: "bar", col: "1 / 2", row: "1", label: "เคสอุบัติเหตุจากการทำงาน รายอำเภอ",
        labels: ["อ.เมือง", "อ.บ้านฉาง", "อ.แกลง", "อ.วังจันทร์", "อ.ปลวกแดง", "อ.นิคมพัฒนา"],
        data: [58, 22, 34, 11, 47, 19] }
    ]
  }

];

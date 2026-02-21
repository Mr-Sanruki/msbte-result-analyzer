import ExcelJS from "exceljs";

function normalizeCell(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && value.text) return String(value.text).trim();
  return String(value).trim();
}

export async function extractEnrollmentNumbersFromXlsx(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    const err = new Error("No worksheet found in Excel file");
    err.statusCode = 400;
    throw err;
  }

  // Find enrollment column by header row (row 1)
  const headerRow = worksheet.getRow(1);
  let enrollmentCol = null;

  headerRow.eachCell((cell, colNumber) => {
    const header = normalizeCell(cell.value).toLowerCase();
    if (!enrollmentCol && header.includes("seat")) {
      enrollmentCol = colNumber;
    }
    if (!enrollmentCol && header.includes("enroll")) {
      enrollmentCol = colNumber;
    }
  });

  // Fallback: first column
  if (!enrollmentCol) enrollmentCol = 1;

  const enrollments = [];
  const seen = new Set();

  // Start from row 2 assuming header exists
  for (let r = 2; r <= worksheet.rowCount; r++) {
    const row = worksheet.getRow(r);
    const raw = normalizeCell(row.getCell(enrollmentCol).value);
    if (!raw) continue;

    const enrollment = raw.replace(/\s+/g, "");
    if (!enrollment) continue;

    if (!seen.has(enrollment)) {
      seen.add(enrollment);
      enrollments.push(enrollment);
    }
  }

  if (enrollments.length === 0) {
    const err = new Error(
      "No seat/enrollment numbers found. Ensure the first sheet has a header with 'Seat'/'Enrollment' or the numbers in the first column."
    );
    err.statusCode = 400;
    throw err;
  }

  return { enrollments, enrollmentColumn: enrollmentCol, sheetName: worksheet.name };
}

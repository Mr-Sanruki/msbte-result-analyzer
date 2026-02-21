import multer from "multer";

import { ResultBatch } from "../models/ResultBatch.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { extractEnrollmentNumbersFromXlsx } from "../services/excel.service.js";
import { parseMsbteResultHtml } from "../services/msbteParse.service.js";
import { msbteJobService } from "../services/msbtePuppeteer.service.js";
import ExcelJS from "exceljs";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
});

export const uploadMiddleware = upload.single("file");

export const uploadBatch = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: { message: "Excel file is required" } });
  }

  const extOk = req.file.originalname.toLowerCase().endsWith(".xlsx");
  if (!extOk) {
    return res.status(400).json({ error: { message: "Only .xlsx files are allowed" } });
  }

  const { enrollments, enrollmentColumn, sheetName } = await extractEnrollmentNumbersFromXlsx(req.file.buffer);

  const batch = await ResultBatch.create({
    teacherId: req.user.sub,
    uploadDate: new Date(),
    totalStudents: enrollments.length,
    passCount: 0,
    failCount: 0,
    results: enrollments.map((en) => ({ enrollmentNumber: en })),
    status: "created",
  });

  return res.status(201).json({
    batch: {
      id: batch._id,
      uploadDate: batch.uploadDate,
      totalStudents: batch.totalStudents,
      status: batch.status,
      sheetName,
      enrollmentColumn,
    },
    enrollments,
  });
});

export const reparseBatch = asyncHandler(async (req, res) => {
  const batch = await ResultBatch.findOne({ _id: req.params.id, teacherId: req.user.sub });
  if (!batch) {
    return res.status(404).json({ error: { message: "Batch not found" } });
  }

  let parsedCount = 0;
  let skippedCount = 0;

  for (const r of batch.results || []) {
    if (!r.rawHtml) {
      skippedCount++;
      continue;
    }

    const parsed = parseMsbteResultHtml(r.rawHtml);
    r.errorMessage = parsed.ok ? null : parsed.errorMessage || "Parse failed";
    if (parsed.name) r.name = parsed.name;
    if (parsed.enrollmentNumber) r.marksheetEnrollmentNumber = parsed.enrollmentNumber;
    if (parsed.seatNumber) r.seatNumber = parsed.seatNumber;
    if (typeof parsed.totalMarks === "number") r.totalMarks = parsed.totalMarks;
    if (typeof parsed.percentage === "number") r.percentage = parsed.percentage;
    if (parsed.resultStatus) r.resultStatus = parsed.resultStatus;
    if (parsed.resultClass) r.resultClass = parsed.resultClass;
    if (parsed.subjectMarks) r.subjectMarks = parsed.subjectMarks;
    parsedCount++;
  }

  await batch.save();

  return res.json({
    ok: true,
    parsedCount,
    skippedCount,
  });
});

export const resetFailedOrUnknown = asyncHandler(async (req, res) => {
  const batch = await ResultBatch.findOne({ _id: req.params.id, teacherId: req.user.sub });
  if (!batch) {
    return res.status(404).json({ error: { message: "Batch not found" } });
  }

  const includeUnknown = req.body?.includeUnknown !== false;

  let resetCount = 0;
  let skippedCount = 0;

  for (const r of batch.results || []) {
    const isFailed = Boolean(r.errorMessage);
    const isUnknown = includeUnknown && (r.resultStatus === "Unknown" || (!r.fetchedAt && !r.errorMessage));

    if (!isFailed && !isUnknown) {
      skippedCount++;
      continue;
    }

    r.fetchedAt = null;
    r.errorMessage = null;
    r.rawHtml = null;

    r.name = null;
    r.seatNumber = null;
    r.totalMarks = null;
    r.percentage = null;
    r.resultStatus = "Unknown";
    r.resultClass = null;
    r.subjectMarks = null;

    resetCount++;
  }

  await batch.save();

  return res.json({
    ok: true,
    includeUnknown,
    resetCount,
    skippedCount,
  });
});

export const batchAnalytics = asyncHandler(async (req, res) => {
  const batch = await ResultBatch.findOne({ _id: req.params.id, teacherId: req.user.sub }).lean();
  if (!batch) {
    return res.status(404).json({ error: { message: "Batch not found" } });
  }

  const results = batch.results || [];
  let totalStudents = results.length;
  let pass = 0;
  let fail = 0;

  const classDist = new Map();
  const subjectAgg = new Map();

  let topper = { name: null, percentage: null, enrollmentNumber: null, seatNumber: null };

  for (const r of results) {
    const status = (r.resultStatus || "Unknown").toLowerCase();
    if (status === "pass") pass++;
    if (status === "fail") fail++;

    const cls = (r.resultClass || r.resultStatus || "Unknown").trim();
    classDist.set(cls, (classDist.get(cls) || 0) + 1);

    if (typeof r.percentage === "number") {
      if (topper.percentage === null || r.percentage > topper.percentage) {
        topper = {
          name: r.name || null,
          percentage: r.percentage,
          enrollmentNumber: r.enrollmentNumber || null,
          seatNumber: r.seatNumber || null,
        };
      }
    }

    const sm = r.subjectMarks;
    if (sm && typeof sm === "object") {
      for (const [subjectName, entry] of Object.entries(sm)) {
        const e = entry || {};
        const obt = typeof e.totalObt === "number" ? e.totalObt : null;
        const max = typeof e.totalMax === "number" ? e.totalMax : null;
        if (obt === null || max === null || max <= 0) continue;

        const cur = subjectAgg.get(subjectName) || { sumObt: 0, sumMax: 0, count: 0 };
        cur.sumObt += obt;
        cur.sumMax += max;
        cur.count += 1;
        subjectAgg.set(subjectName, cur);
      }
    }
  }

  const passRate = pass + fail > 0 ? Math.round((pass / (pass + fail)) * 100) : 0;

  const classDistribution = Array.from(classDist.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  const subjectAverages = Array.from(subjectAgg.entries())
    .map(([subject, v]) => ({
      subject,
      avgPercentage: v.sumMax > 0 ? Number(((v.sumObt / v.sumMax) * 100).toFixed(2)) : null,
      samples: v.count,
    }))
    .sort((a, b) => (b.avgPercentage || 0) - (a.avgPercentage || 0));

  return res.json({
    totals: {
      totalStudents,
      pass,
      fail,
      passRate,
    },
    topper,
    classDistribution,
    subjectAverages,
  });
});

export const getStudentInBatch = asyncHandler(async (req, res) => {
  const batch = await ResultBatch.findOne({ _id: req.params.id, teacherId: req.user.sub }).lean();
  if (!batch) {
    return res.status(404).json({ error: { message: "Batch not found" } });
  }

  const enrollment = String(req.params.enrollment || "").trim();
  if (!enrollment) {
    return res.status(400).json({ error: { message: "Enrollment number is required" } });
  }

  const r = (batch.results || []).find((x) => String(x.enrollmentNumber || "").trim() === enrollment);
  if (!r) {
    return res.status(404).json({ error: { message: "Student not found in this batch" } });
  }

  return res.json({
    batch: {
      id: String(batch._id),
      uploadDate: batch.uploadDate,
      status: batch.status,
      totalStudents: batch.totalStudents,
    },
    student: r,
  });
});

export const analyticsSummary = asyncHandler(async (req, res) => {
  const batches = await ResultBatch.find({ teacherId: req.user.sub }).sort({ uploadDate: -1 }).lean();

  let totalStudents = 0;
  let pass = 0;
  let fail = 0;

  const classDist = new Map();
  const subjectAgg = new Map();

  let topper = { name: null, percentage: null, enrollmentNumber: null, seatNumber: null, batchId: null };

  for (const b of batches) {
    for (const r of b.results || []) {
      totalStudents++;

      const status = (r.resultStatus || "Unknown").toLowerCase();
      if (status === "pass") pass++;
      if (status === "fail") fail++;

      const cls = (r.resultClass || r.resultStatus || "Unknown").trim();
      classDist.set(cls, (classDist.get(cls) || 0) + 1);

      if (typeof r.percentage === "number") {
        if (topper.percentage === null || r.percentage > topper.percentage) {
          topper = {
            name: r.name || null,
            percentage: r.percentage,
            enrollmentNumber: r.enrollmentNumber || null,
            seatNumber: r.seatNumber || null,
            batchId: String(b._id),
          };
        }
      }

      const sm = r.subjectMarks;
      if (sm && typeof sm === "object") {
        for (const [subjectName, entry] of Object.entries(sm)) {
          const e = entry || {};
          const obt = typeof e.totalObt === "number" ? e.totalObt : null;
          const max = typeof e.totalMax === "number" ? e.totalMax : null;
          if (obt === null || max === null || max <= 0) continue;

          const cur = subjectAgg.get(subjectName) || { sumObt: 0, sumMax: 0, count: 0 };
          cur.sumObt += obt;
          cur.sumMax += max;
          cur.count += 1;
          subjectAgg.set(subjectName, cur);
        }
      }
    }
  }

  const passRate = pass + fail > 0 ? Math.round((pass / (pass + fail)) * 100) : 0;

  const classDistribution = Array.from(classDist.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  const subjectAverages = Array.from(subjectAgg.entries())
    .map(([subject, v]) => ({
      subject,
      avgPercentage: v.sumMax > 0 ? Number(((v.sumObt / v.sumMax) * 100).toFixed(2)) : null,
      samples: v.count,
    }))
    .sort((a, b) => (b.avgPercentage || 0) - (a.avgPercentage || 0));

  return res.json({
    totals: {
      batches: batches.length,
      totalStudents,
      pass,
      fail,
      passRate,
    },
    topper,
    classDistribution,
    subjectAverages,
  });
});

export const exportBatchXlsx = asyncHandler(async (req, res) => {
  const batch = await ResultBatch.findOne({ _id: req.params.id, teacherId: req.user.sub }).lean();
  if (!batch) {
    return res.status(404).json({ error: { message: "Batch not found" } });
  }

  function extractResultClassFromRawHtml(rawHtml) {
    const html = String(rawHtml || "");
    if (!html) return null;

    const dvIdx = html.toLowerCase().indexOf("id=\"dvtotal0\"");
    const dvIdx2 = dvIdx >= 0 ? dvIdx : html.toLowerCase().indexOf("id='dvtotal0'");
    if (dvIdx2 >= 0) {
      const divEnd = html.toLowerCase().indexOf("</div>", dvIdx2);
      const slice = html.slice(
        dvIdx2,
        divEnd > dvIdx2 ? divEnd + "</div>".length : Math.min(html.length, dvIdx2 + 12000)
      );

      const keywordRe = /(distinction|\bclass\b|\bpass\b|\bfail\b|\bkt\b|atkt)/i;

      // Prefer the dvTotal0 class line cell (colspan=4). There may be multiple colspan=4 cells,
      // so pick the one that looks like a class/result.
      const candidates = Array.from(
        slice.matchAll(/colspan\s*=\s*"?4"?[^>]*>\s*<strong[^>]*>([^<]+)<\/strong>/gi)
      )
        .map((m) => (m && m[1] ? String(m[1]).trim() : ""))
        .filter(Boolean);

      const best = candidates.find((t) => keywordRe.test(t));
      if (best) return best;

      // Fallback: take the last <strong> in dvTotal0 div that looks like a class/result
      const strongMatches = Array.from(slice.matchAll(/<strong[^>]*>([^<]+)<\/strong>/gi))
        .map((m) => (m && m[1] ? String(m[1]).trim() : ""))
        .filter(Boolean);

      const lastKeyword = [...strongMatches].reverse().find((t) => keywordRe.test(t));
      if (lastKeyword) return lastKeyword;

      if (strongMatches.length) return strongMatches[strongMatches.length - 1] || null;
    }

    const strongMatches = Array.from(html.matchAll(/<strong[^>]*>([^<]+)<\/strong>/gi))
      .map((m) => (m && m[1] ? String(m[1]).trim() : ""))
      .filter(Boolean);
    return strongMatches.length ? strongMatches[strongMatches.length - 1] : null;
  }

  function buildAnalysisWorksheet(wb) {
    const sheet = wb.addWorksheet("analysis");
    const results = batch.results || [];

    const appeared = results.filter((r) => r.fetchedAt && !r.errorMessage).length || results.length;
    const pass = results.filter((r) => String(r.resultStatus || "").toLowerCase() === "pass").length;
    const fail = results.filter((r) => String(r.resultStatus || "").toLowerCase() === "fail").length;
    const getEffectiveResultClass = (r) => {
      if (r?.resultClass) return r.resultClass;

      // First try our HTML parser (keeps behavior consistent)
      if (r?.rawHtml) {
        try {
          const parsed = parseMsbteResultHtml(r.rawHtml);
          if (parsed?.resultClass) return parsed.resultClass;
        } catch {
          // ignore
        }
      }

      // Guaranteed fallback: extract from the exact dvTotal0 markup
      if (r?.rawHtml) {
        const extracted = extractResultClassFromRawHtml(r.rawHtml);
        if (extracted) return extracted;
      }

      return null;
    };

    const normalizeClassText = (s) =>
      String(s || "")
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

    const deriveClassFromPercentage = (r) => {
      const raw = r?.percentage;
      const p =
        typeof raw === "number"
          ? raw
          : typeof raw === "string"
            ? Number.parseFloat(raw)
            : Number.NaN;
      if (!Number.isFinite(p)) return null;
      if (p >= 75) return "first class with distinction";
      if (p >= 60) return "first class";
      if (p >= 50) return "second class";
      if (p >= 40) return "pass class";
      return "fail";
    };

    const classText = (r) => {
      const storedOrHtml = normalizeClassText(getEffectiveResultClass(r));
      if (storedOrHtml) return storedOrHtml;
      const derived = deriveClassFromPercentage(r);
      return normalizeClassText(derived);
    };

    const atkt = results.filter((r) => {
      const c = classText(r);
      return c === "kt" || c.includes(" atkt") || c.includes("atkt") || c.includes(" kt");
    }).length;

    const firstDist = results.filter((r) => {
      const c = classText(r);
      return c.includes("first class with distinction") || (c.includes("distinction") && c.includes("first"));
    }).length;

    const first = results.filter((r) => {
      const c = classText(r);
      return (c.includes("first class") || c.includes("first")) && !c.includes("distinction");
    }).length;

    const second = results.filter((r) => {
      const c = classText(r);
      return c.includes("second class") || c.includes("second");
    }).length;

    const passClass = results.filter((r) => {
      const c = classText(r);
      return (c.includes("pass class") || c === "pass") && !c.includes("fail");
    }).length;

    const passPct = appeared > 0 ? Number(((pass / appeared) * 100).toFixed(2)) : 0;
    const passWithAtktPct = appeared > 0 ? Number((((pass + atkt) / appeared) * 100).toFixed(2)) : 0;

    // Header rows (match reference layout)
    // Row 1-3 contain wrapped header labels, Row 4 contains column numbering (1)-(10)
    sheet.getRow(1).height = 20;
    sheet.getRow(2).height = 20;
    sheet.getRow(3).height = 20;
    sheet.getRow(4).height = 18;

    // Single headers merged vertically across rows 1-3
    sheet.mergeCells("A1:A3");
    sheet.getCell("A1").value = "Class/\nYear";

    sheet.mergeCells("B1:B3");
    sheet.getCell("B1").value = "No. of\nStudents\nregistered for";

    sheet.mergeCells("C1:C3");
    sheet.getCell("C1").value = "No. of\nstudents\nactually\nappeared";

    sheet.mergeCells("D1:D3");
    sheet.getCell("D1").value = "1st class\nwith\nDistinction";

    // Group header: No. of students passed (E-G)
    sheet.mergeCells("E1:G1");
    sheet.getCell("E1").value = "No. of students passed";
    sheet.mergeCells("E2:E3");
    sheet.getCell("E2").value = "1st class";
    sheet.mergeCells("F2:F3");
    sheet.getCell("F2").value = "2nd\nclass";
    sheet.mergeCells("G2:G3");
    sheet.getCell("G2").value = "Pass\nclass";

    sheet.mergeCells("H1:H3");
    sheet.getCell("H1").value = "Pass\nWithout\nATKT";

    sheet.mergeCells("I1:I3");
    sheet.getCell("I1").value = "With\nATKT";

    sheet.mergeCells("J1:J3");
    sheet.getCell("J1").value = "Total\nstudent\npassed";

    sheet.mergeCells("K1:K3");
    sheet.getCell("K1").value = "Total\nNo. of\nstudent\nFailed";

    sheet.mergeCells("L1:L3");
    sheet.getCell("L1").value = "Total\npassing\n%\nwithout";

    sheet.mergeCells("M1:M3");
    sheet.getCell("M1").value = "Total\npassing\n%\nwith\nATKT";

    // Row 4 numbering
    const nums = {
      A4: "(1)",
      B4: "(2)",
      C4: "(3)",
      D4: "(4)",
      E4: "(5)",
      F4: "(6)",
      G4: "(7)",
      H4: "(8) =",
      I4: "(9)",
      J4: "(10)",
    };
    for (const [addr, v] of Object.entries(nums)) {
      sheet.getCell(addr).value = v;
    }

    // Data row (Row 5)
    sheet.getRow(5).height = 18;
    sheet.getCell("A5").value = String(batch._id);
    sheet.getCell("B5").value = "";
    sheet.getCell("C5").value = appeared;
    sheet.getCell("D5").value = firstDist;
    sheet.getCell("E5").value = first;
    sheet.getCell("F5").value = second;
    sheet.getCell("G5").value = passClass;
    sheet.getCell("H5").value = pass;
    sheet.getCell("I5").value = atkt;
    sheet.getCell("J5").value = pass + atkt;
    sheet.getCell("K5").value = fail;
    sheet.getCell("L5").value = `${passPct}%`;
    sheet.getCell("M5").value = `${passWithAtktPct}%`;

    // Styling: bold headers, wrap, center, borders
    const headerRows = [1, 2, 3, 4];
    for (const r of headerRows) {
      sheet.getRow(r).font = { bold: true };
      sheet.getRow(r).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    }
    sheet.getRow(5).alignment = { horizontal: "center", vertical: "middle", wrapText: true };

    const allRows = 5;
    const allCols = 13; // A-M
    for (let r = 1; r <= allRows; r++) {
      for (let c = 1; c <= allCols; c++) {
        const cell = sheet.getRow(r).getCell(c);
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      }
    }

    // Column widths tuned to reference image
    sheet.columns = [
      { key: "A", width: 12 },
      { key: "B", width: 14 },
      { key: "C", width: 16 },
      { key: "D", width: 14 },
      { key: "E", width: 12 },
      { key: "F", width: 10 },
      { key: "G", width: 10 },
      { key: "H", width: 12 },
      { key: "I", width: 10 },
      { key: "J", width: 14 },
      { key: "K", width: 14 },
      { key: "L", width: 16 },
      { key: "M", width: 16 },
    ];

    sheet.views = [{ state: "frozen", ySplit: 4 }];
  }

  function buildSubjectWiseFormattedWorkbook() {
    const wb = new ExcelJS.Workbook();
    buildAnalysisWorksheet(wb);

    // Debug/verification sheet: show actual MSBTE class text extracted from rawHtml
    const classSheet = wb.addWorksheet("msbte class");
    classSheet.addRow(["ROLL NO", "SEAT NO", "ENROLLMENT NO", "NAME", "PERCENTAGE", "MSBTE CLASS (HTML)"]);
    classSheet.getRow(1).font = { bold: true };
    classSheet.columns = [
      { width: 10 },
      { width: 16 },
      { width: 18 },
      { width: 28 },
      { width: 12 },
      { width: 30 },
    ];

    const results = batch.results || [];
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const extracted = r?.rawHtml ? extractResultClassFromRawHtml(r.rawHtml) : null;
      classSheet.addRow([
        i + 1,
        r.enrollmentNumber || "",
        r.marksheetEnrollmentNumber || "",
        r.name || "",
        typeof r.percentage === "number" ? r.percentage : r.percentage || "",
        extracted || "",
      ]);
    }

    const sheet = wb.addWorksheet("subject wise");

    // Note: keep using the same results array for subject-wise export

    // Determine subject order: use the first row that has subjectMarks as the primary order,
    // then append any new subjects encountered later.
    const subjects = [];
    const subjectSet = new Set();
    for (const r of results) {
      const sm = r.subjectMarks;
      if (sm && typeof sm === "object") {
        for (const k of Object.keys(sm)) {
          if (!subjectSet.has(k)) {
            subjectSet.add(k);
            subjects.push(k);
          }
        }
      }
    }

    const startSubjectCol = 5;

    function hasAnyValueFor(subject, keys) {
      for (const r of results) {
        const sm = r.subjectMarks && r.subjectMarks[subject];
        if (!sm) continue;
        for (const k of keys) {
          const v = sm[k];
          if (v === null || v === undefined || v === "") continue;
          return true;
        }
      }
      return false;
    }

    // Build per-subject column layout, omitting empty groups
    // Each pair contributes 2 cols (MAX/OBT), credits contributes 1.
    const layout = subjects.map((subj) => {
      const groups = [];
      const hasFaTh = hasAnyValueFor(subj, ["faThMax", "faThObt"]);
      const hasSaTh = hasAnyValueFor(subj, ["saThMax", "saThObt"]);
      const hasTotal = hasAnyValueFor(subj, ["totalMax", "totalObt"]);
      const hasFaPr = hasAnyValueFor(subj, ["faPrMax", "faPrObt"]);
      const hasSaPr = hasAnyValueFor(subj, ["saPrMax", "saPrObt"]);
      const hasSla = hasAnyValueFor(subj, ["slaMax", "slaObt"]);
      const hasCredits = hasAnyValueFor(subj, ["credits"]);

      if (hasFaTh) groups.push({ key: "faTh", label: "FA-TH", kind: "pair", max: "faThMax", obt: "faThObt", section: "theory" });
      if (hasSaTh) groups.push({ key: "saTh", label: "SA-TH", kind: "pair", max: "saThMax", obt: "saThObt", section: "theory" });
      if (hasTotal) groups.push({ key: "total", label: "TOTAL", kind: "pair", max: "totalMax", obt: "totalObt", section: "theory" });
      if (hasFaPr) groups.push({ key: "faPr", label: "FA-PR", kind: "pair", max: "faPrMax", obt: "faPrObt", section: "practical" });
      if (hasSaPr) groups.push({ key: "saPr", label: "SA-PR", kind: "pair", max: "saPrMax", obt: "saPrObt", section: "practical" });
      if (hasSla) groups.push({ key: "sla", label: "SLA", kind: "pair", max: "slaMax", obt: "slaObt", section: "sla" });
      if (hasCredits) groups.push({ key: "credits", label: "CREDITS", kind: "single", field: "credits", section: "credits" });

      const width = groups.reduce((acc, g) => acc + (g.kind === "pair" ? 2 : 1), 0);
      return { subject: subj, groups, width };
    });

    const marksWidth = layout.reduce((acc, s) => acc + s.width, 0);
    const totalCol = startSubjectCol + marksWidth;
    const percentageCol = totalCol + 1;
    const resultCol = totalCol + 2;
    const lastCol = resultCol;

    // Title row (Row 1)
    sheet.getRow(1).getCell(1).value = "Subject Wise Marks";
    sheet.mergeCells(1, 1, 1, lastCol);
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).alignment = { horizontal: "center" };

    // Row 2: Base headers + MARKS merged
    sheet.getRow(2).getCell(1).value = "ROLL NO";
    sheet.getRow(2).getCell(2).value = "SEAT NO";
    sheet.getRow(2).getCell(3).value = "ENROLLMENT NO";
    sheet.getRow(2).getCell(4).value = "NAME";
    if (marksWidth > 0) {
      sheet.getRow(2).getCell(startSubjectCol).value = "MARKS";
      sheet.mergeCells(2, startSubjectCol, 2, totalCol - 1);
    }
    sheet.getRow(2).getCell(totalCol).value = "TOTAL";
    sheet.getRow(2).getCell(percentageCol).value = "PERCENTAGE";
    sheet.getRow(2).getCell(resultCol).value = "RESULT";

    // Row 3: Subject names merged across their block
    let cursor = startSubjectCol;
    for (const s of layout) {
      if (s.width <= 0) continue;
      sheet.getRow(3).getCell(cursor).value = s.subject;
      sheet.mergeCells(3, cursor, 3, cursor + s.width - 1);
      cursor += s.width;
    }
    // Merge TOTAL/PERCENTAGE/RESULT across rows 2-5 (like template)
    sheet.mergeCells(2, totalCol, 5, totalCol);
    sheet.mergeCells(2, percentageCol, 5, percentageCol);
    sheet.mergeCells(2, resultCol, 5, resultCol);

    // Row 4: THEORY/PRACTICALS/SLA/CREDITS blocks (dynamic per subject)
    cursor = startSubjectCol;
    for (const s of layout) {
      if (s.width <= 0) continue;

      const sectionSpans = {
        theory: 0,
        practical: 0,
        sla: 0,
        credits: 0,
      };
      for (const g of s.groups) {
        sectionSpans[g.section] += g.kind === "pair" ? 2 : 1;
      }

      let offset = 0;
      if (sectionSpans.theory) {
        sheet.getRow(4).getCell(cursor + offset).value = "THEORY";
        sheet.mergeCells(4, cursor + offset, 4, cursor + offset + sectionSpans.theory - 1);
        offset += sectionSpans.theory;
      }
      if (sectionSpans.practical) {
        sheet.getRow(4).getCell(cursor + offset).value = "PRACTICALS";
        sheet.mergeCells(4, cursor + offset, 4, cursor + offset + sectionSpans.practical - 1);
        offset += sectionSpans.practical;
      }
      if (sectionSpans.sla) {
        sheet.getRow(4).getCell(cursor + offset).value = "SLA";
        sheet.mergeCells(4, cursor + offset, 4, cursor + offset + sectionSpans.sla - 1);
        offset += sectionSpans.sla;
      }
      if (sectionSpans.credits) {
        sheet.getRow(4).getCell(cursor + offset).value = "CREDITS";
        sheet.mergeCells(4, cursor + offset, 6, cursor + offset);
        offset += sectionSpans.credits;
      }

      cursor += s.width;
    }

    // Row 5: Component group headers (each pair spans MAX/OBT)
    cursor = startSubjectCol;
    for (const s of layout) {
      if (s.width <= 0) continue;
      for (const g of s.groups) {
        if (g.kind === "pair") {
          sheet.getRow(5).getCell(cursor).value = g.label;
          sheet.mergeCells(5, cursor, 5, cursor + 1);
          cursor += 2;
        } else {
          // Credits column already merged (row 4 to row 6) and has no MAX/OBT
          cursor += 1;
        }
      }
    }

    // Row 6: MAX / OBT labels (only for pairs)
    cursor = startSubjectCol;
    for (const s of layout) {
      if (s.width <= 0) continue;
      for (const g of s.groups) {
        if (g.kind === "pair") {
          sheet.getRow(6).getCell(cursor).value = "MAX";
          sheet.getRow(6).getCell(cursor + 1).value = "OBT";
          cursor += 2;
        } else {
          cursor += 1;
        }
      }
    }

    // Style header rows
    for (const r of [2, 3, 4, 5, 6]) {
      sheet.getRow(r).font = { bold: true };
      sheet.getRow(r).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    }
    sheet.views = [{ state: "frozen", ySplit: 6 }];

    // Fill data rows starting from row 7
    const startRow = 7;
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const row = sheet.getRow(startRow + i);
      row.getCell(1).value = i + 1;
      row.getCell(2).value = r.enrollmentNumber || "";
      row.getCell(3).value = r.marksheetEnrollmentNumber || "";
      row.getCell(4).value = r.name || "";

      cursor = startSubjectCol;
      for (const s of layout) {
        if (s.width <= 0) continue;
        const sm = r.subjectMarks && r.subjectMarks[s.subject];
        for (const g of s.groups) {
          if (g.kind === "pair") {
            row.getCell(cursor).value = sm ? sm[g.max] ?? "" : "";
            row.getCell(cursor + 1).value = sm ? sm[g.obt] ?? "" : "";
            cursor += 2;
          } else {
            row.getCell(cursor).value = sm ? sm[g.field] ?? "" : "";
            cursor += 1;
          }
        }
      }

      row.getCell(totalCol).value = typeof r.totalMarks === "number" ? r.totalMarks : "";
      row.getCell(percentageCol).value =
        typeof r.percentage === "number" ? r.percentage : r.resultClass === "KT" ? "KT" : "";
      row.getCell(resultCol).value = r.resultClass || r.resultStatus || (r.errorMessage ? "Error" : "");
      row.commit();
    }

    return wb;
  }

  const formattedWb = buildSubjectWiseFormattedWorkbook();
  const buffer = await formattedWb.xlsx.writeBuffer();

  const filename = `msbte_batch_${String(batch._id)}.xlsx`;

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.send(Buffer.from(buffer));
});

export const recentBatches = asyncHandler(async (req, res) => {
  const batches = await ResultBatch.find({ teacherId: req.user.sub })
    .sort({ uploadDate: -1 })
    .limit(5)
    .lean();

  return res.json({
    batches: batches.map((b) => ({
      id: b._id,
      uploadDate: b.uploadDate,
      totalStudents: b.totalStudents,
      passCount: (b.results || []).filter((r) => String(r.resultStatus || "").toLowerCase() === "pass").length,
      failCount: (b.results || []).filter((r) => String(r.resultStatus || "").toLowerCase() === "fail").length,
      topperName:
        (b.results || []).reduce(
          (best, r) => (typeof r?.percentage === "number" && (best.p === null || r.percentage > best.p) ? { n: r.name || null, p: r.percentage } : best),
          { n: null, p: null }
        ).n || null,
      topperPercentage:
        (b.results || []).reduce(
          (best, r) => (typeof r?.percentage === "number" && (best.p === null || r.percentage > best.p) ? { n: r.name || null, p: r.percentage } : best),
          { n: null, p: null }
        ).p,
      status: b.status,
    })),
  });
});

export const getBatch = asyncHandler(async (req, res) => {
  const batch = await ResultBatch.findOne({ _id: req.params.id, teacherId: req.user.sub }).lean();
  if (!batch) {
    return res.status(404).json({ error: { message: "Batch not found" } });
  }

  return res.json({
    batch: {
      id: batch._id,
      uploadDate: batch.uploadDate,
      totalStudents: batch.totalStudents,
      passCount: batch.passCount,
      failCount: batch.failCount,
      topperName: batch.topperName || null,
      topperPercentage: batch.topperPercentage || null,
      status: batch.status,
      results: batch.results,
      errors: batch.errors,
    },
  });
});

export const deleteBatch = asyncHandler(async (req, res) => {
  const batch = await ResultBatch.findOne({ _id: req.params.id, teacherId: req.user.sub }).lean();
  if (!batch) {
    return res.status(404).json({ error: { message: "Batch not found" } });
  }

  await msbteJobService.stop({ batchId: req.params.id, teacherId: req.user.sub });
  await ResultBatch.deleteOne({ _id: req.params.id, teacherId: req.user.sub });
  return res.json({ ok: true });
});

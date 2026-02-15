import multer from "multer";

import { ResultBatch } from "../models/ResultBatch.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { extractEnrollmentNumbersFromXlsx } from "../services/excel.service.js";
import { parseMsbteResultHtml } from "../services/msbteParse.service.js";
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

  function buildSubjectWiseFormattedWorkbook() {
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet("subject wise");

    const results = batch.results || [];

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
    sheet.getRow(2).getCell(2).value = "ENROLLMENT";
    sheet.getRow(2).getCell(3).value = "SEAT NO";
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
      row.getCell(3).value = r.seatNumber || "";
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
      row.getCell(percentageCol).value = typeof r.percentage === "number" ? r.percentage : "";
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
      passCount: b.passCount,
      failCount: b.failCount,
      topperName: b.topperName || null,
      topperPercentage: b.topperPercentage || null,
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

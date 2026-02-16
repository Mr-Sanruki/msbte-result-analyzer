import * as cheerio from "cheerio";

function pickFirstNumber(text) {
  const m = String(text || "").replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

function pickCleanText(nodeText) {
  const s = normalizeSpaces(nodeText);
  return s || null;
}

function pickIntOrText(s) {
  const t = normalizeSpaces(s);
  if (!t) return null;
  if (t === "-" || t === "--") return null;
  // Preserve MSBTE special symbols (e.g. 020@, 022*, 037#) by only converting
  // to number when the value is purely numeric.
  const numericOnly = /^\d+(?:\.\d+)?$/.test(t);
  if (numericOnly) return Number(t);
  return t;
}

function normalizeSpaces(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

export function parseMsbteResultHtml(html) {
  if (!html) return { ok: false, errorMessage: "Empty HTML" };

  const $ = cheerio.load(html);
  const text = normalizeSpaces($("body").text());

  function findSummaryByHeaderRow() {
    let out = null;
    $("table").each((_, table) => {
      if (out) return;
      const rows = $(table).find("tr").toArray();
      for (let i = 0; i < rows.length - 1; i++) {
        const headerCells = $(rows[i]).find("th,td").toArray();
        const valueCells = $(rows[i + 1]).find("th,td").toArray();
        if (headerCells.length < 3 || valueCells.length < 3) continue;

        const headers = headerCells.map((c) => normalizeSpaces($(c).text()).toLowerCase());
        const idxObt = headers.findIndex((h) => h.includes("total") && h.includes("marks") && h.includes("obt"));
        const idxPct = headers.findIndex((h) => h.includes("percent"));
        const idxMax = headers.findIndex(
          (h) => h.includes("total") && h.includes("max") && h.includes("marks")
        );

        // Handle rowspan/colspan cases (like dvTotal0) where header row contains extra cells
        // (DATE/SECRETARY with rowspan) but the value row has fewer cells.
        const offset = Math.max(0, headerCells.length - valueCells.length);
        const mapIdx = (idx) => (idx === -1 ? -1 : idx - offset);
        const vidxObt = mapIdx(idxObt);
        const vidxPct = mapIdx(idxPct);
        const vidxMax = mapIdx(idxMax);

        // This pattern matches the marksheet summary block (header row then a numeric row)
        if (idxObt === -1 && idxPct === -1) continue;

        const vObt = vidxObt >= 0 && vidxObt < valueCells.length ? normalizeSpaces($(valueCells[vidxObt]).text()) : null;
        const vPct = vidxPct >= 0 && vidxPct < valueCells.length ? normalizeSpaces($(valueCells[vidxPct]).text()) : null;
        const vMax = vidxMax >= 0 && vidxMax < valueCells.length ? normalizeSpaces($(valueCells[vidxMax]).text()) : null;

        const obt = vObt ? pickFirstNumber(vObt) : null;
        const pct = vPct ? pickFirstNumber(vPct) : null;
        const max = vMax ? pickFirstNumber(vMax) : null;

        if (typeof obt === "number" || typeof pct === "number") {
          out = { totalMarksObtained: obt, percentage: pct, totalMaxMarks: max };
          return;
        }
      }
    });
    return out;
  }

  function pickValueFromLabelValueTable(rootSelector, labelIncludes) {
    let out = null;
    $(rootSelector)
      .find("tr")
      .each((_, tr) => {
        if (out) return;
        const tds = $(tr).find("td,th");
        if (tds.length < 2) return;
        const k = normalizeSpaces($(tds[0]).text()).toLowerCase();
        if (!k) return;
        const match = labelIncludes.some((p) => k.includes(p));
        if (!match) return;
        const v = normalizeSpaces($(tds[1]).text());
        if (v) out = v;
      });
    return out;
  }

  function pickValueFromAnyTable(labelIncludes) {
    let out = null;
    $("tr").each((_, tr) => {
      if (out) return;
      const tds = $(tr).find("td,th");
      if (tds.length < 2) return;
      const k = normalizeSpaces($(tds[0]).text()).toLowerCase();
      if (!k) return;
      const match = labelIncludes.some((p) => k.includes(p));
      if (!match) return;
      const v = normalizeSpaces($(tds[1]).text());
      if (v) out = v;
    });
    return out;
  }

  function pickFromTextNeighborhood(anchorIncludes, valueRegex, windowSize = 350) {
    const hay = text.toLowerCase();
    let idx = -1;
    for (const a of anchorIncludes) {
      idx = hay.indexOf(a);
      if (idx !== -1) break;
    }
    if (idx === -1) return null;
    const slice = text.slice(idx, idx + windowSize);
    const m = slice.match(valueRegex);
    return m ? m[1] : null;
  }

  // Detect explicit error messages. Do NOT fail just because the word "captcha" exists on the page.
  const errorNodes = [
    "#lblError",
    "#lblMessage",
    "span[id*='lbl'][id*='Err']",
    "span[id*='lbl'][id*='Error']",
    ".text-danger",
    ".error",
  ];

  const explicitErrorText = normalizeSpaces(
    errorNodes
      .map((sel) => $(sel).text())
      .filter(Boolean)
      .join(" ")
  );

  const explicitErrorLower = explicitErrorText.toLowerCase();
  const explicitErrorLike =
    explicitErrorLower.length > 0 &&
    [
      "invalid",
      "not found",
      "no record",
      "record not",
      "incorrect",
      "try again",
      "please enter",
      "captcha",
    ].some((w) => explicitErrorLower.includes(w));

  const bodyLower = text.toLowerCase();
  const strongBodyErrorLike =
    bodyLower.includes("please enter valid captcha") ||
    bodyLower.includes("invalid captcha") ||
    bodyLower.includes("incorrect captcha") ||
    bodyLower.includes("record not found");

  const errorLike = explicitErrorLike || strongBodyErrorLike;

  // Try common patterns in tables: Label : Value
  const kv = new Map();
  $("tr").each((_, tr) => {
    const cells = $(tr).find("td,th");
    if (cells.length < 2) return;
    const k = normalizeSpaces($(cells[0]).text()).replace(/\s*:\s*$/, "");
    const v = normalizeSpaces($(cells[1]).text());
    if (!k || !v) return;
    if (!kv.has(k.toLowerCase())) kv.set(k.toLowerCase(), v);
  });

  function getByKeys(keys) {
    for (const k of keys) {
      const v = kv.get(k);
      if (v) return v;
    }
    return null;
  }

  // MSBTE Statement of Marks layout parsing
  // Name appears in the first header table row next to MR./MS.
  const nameFromHeader = pickCleanText(
    $("table").first().find("tr").first().find("td").eq(1).text()
  );
  const enrollmentFromHeader = pickCleanText(
    $("table").first().find("tr").eq(1).find("td").eq(1).text()
  );
  const seatFromHeader = pickCleanText(
    $("table").first().find("tr").eq(1).find("td").eq(5).text()
  );

  const name = nameFromHeader || getByKeys(["name", "student name", "candidate name"]) || null;
  const seatNumber = seatFromHeader || getByKeys(["seat no", "seat no.", "seat number"]) || null;

  const summaryByHeaderRow = findSummaryByHeaderRow();

  const percentageText =
    getByKeys(["percentage", "percent"]) ||
    (() => {
      const m = text.match(/percentage\s*:?\s*(\d+(?:\.\d+)?)\s*%/i);
      return m ? m[0] : null;
    })();

  const percentage = percentageText ? pickFirstNumber(percentageText) : null;

  // Avoid generic keys like "total"/"grand total" because they can match TOTAL MAX MARKS (not obtained)
  const totalMarksText = getByKeys(["total marks obtained", "marks obtained"]) || null;
  const totalMarks = totalMarksText ? pickFirstNumber(totalMarksText) : null;

  // Total/Perc/Class appear in dvTotal0 table in this layout
  const dvTotalText = normalizeSpaces($("#dvTotal0").text());

  const totalObtFromDvTotalTableText = pickValueFromLabelValueTable("#dvTotal0", [
    "total marks obtained",
    "total marks",
    "grand total",
    "total obtained",
  ]);
  const percentageFromDvTotalTableText = pickValueFromLabelValueTable("#dvTotal0", ["percentage", "percent"]);

  // Some MSBTE layouts show summary in a separate block (e.g. TOTAL MAX. MARKS / TOTAL MARKS OBTAINED / PERCENTAGE %)
  const totalMarksObtainedSummaryText =
    pickValueFromAnyTable(["total marks obtained"]) ||
    pickFromTextNeighborhood(["total marks obtained"], /total\s*marks\s*obtained\s*[:\-]?\s*(\d+)/i);

  const percentageSummaryText =
    pickValueFromAnyTable(["percentage"]) ||
    pickFromTextNeighborhood(["percentage"], /percentage\s*%?\s*[:\-]?\s*(\d+(?:\.\d+)?)/i);

  const totalObtFromDvTotal = (() => {
    if (typeof summaryByHeaderRow?.totalMarksObtained === "number") return summaryByHeaderRow.totalMarksObtained;

    const summary = totalMarksObtainedSummaryText ? pickFirstNumber(totalMarksObtainedSummaryText) : null;
    if (typeof summary === "number") return summary;

    const direct = totalObtFromDvTotalTableText ? pickFirstNumber(totalObtFromDvTotalTableText) : null;
    if (typeof direct === "number") return direct;
    const m1 = dvTotalText.match(/total\s*marks\s*obtained\s*[:\-]?\s*(\d+)/i);
    if (m1) return Number(m1[1]);
    const m2 = dvTotalText.match(/grand\s*total\s*[:\-]?\s*(\d+)/i);
    return m2 ? Number(m2[1]) : null;
  })();
  const percentageFromDvTotal = (() => {
    if (typeof summaryByHeaderRow?.percentage === "number") return summaryByHeaderRow.percentage;

    const summary = percentageSummaryText ? pickFirstNumber(percentageSummaryText) : null;
    if (typeof summary === "number") return summary;

    const direct = percentageFromDvTotalTableText ? pickFirstNumber(percentageFromDvTotalTableText) : null;
    if (typeof direct === "number") return direct;
    const m1 = dvTotalText.match(/percentage\s*%\s*[:\-]?\s*(\d+(?:\.\d+)?)/i);
    if (m1) return Number(m1[1]);
    const m2 = dvTotalText.match(/percentage\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*%?/i);
    return m2 ? Number(m2[1]) : null;
  })();
  const classFromDvTotal = (() => {
    // Usually the last row contains the class line e.g. FIRST CLASS WITH DISTINCTION
    const lastStrong = $("#dvTotal0 strong").last().text();
    return pickCleanText(lastStrong);
  })();

  const resultFromDvTotal = (() => {
    const m = dvTotalText.match(/\bresult\b\s*:?\s*(pass|fail)\b/i);
    return m ? m[1] : null;
  })();

  const statusText = getByKeys([
    "result",
    "status",
    "result status",
    "class",
    "result class",
  ]);
  let resultStatus = "Unknown";
  const statusCandidates = [resultFromDvTotal, statusText, text];
  for (const candidate of statusCandidates) {
    if (!candidate) continue;
    const statusHay = normalizeSpaces(candidate).toLowerCase();
    if (statusHay.includes("pass")) {
      resultStatus = "Pass";
      break;
    }
    if (statusHay.includes("fail")) {
      resultStatus = "Fail";
      break;
    }
  }
  if (errorLike) resultStatus = "Error";

  const resultClass = classFromDvTotal || getByKeys(["class", "result class"]) || null;

  // Parse subject-wise obtained marks from the main marks table
  // Rows look like: [SubjectName, FA-TH max, FA-TH obt, SA-TH max, SA-TH obt, TOTAL max, TOTAL obt, FA-PR max, FA-PR obt, SA-PR max, SA-PR obt, SLA max, SLA obt, Credits]
  const subjectMarks = {};
  const marksTable = $("#dvMain0 table").first();
  marksTable
    .find("tr")
    .toArray()
    .forEach((tr, idx) => {
      // Skip header rows (first 3)
      if (idx < 3) return;
      const tds = $(tr).find("td");
      if (tds.length < 8) return;
      const subjectName = pickCleanText($(tds[0]).text());
      if (!subjectName) return;

      const cells = tds
        .toArray()
        .slice(1)
        .map((td) => normalizeSpaces($(td).text()));

      const entry = {
        faThMax: pickIntOrText(cells[0]),
        faThObt: pickIntOrText(cells[1]),
        saThMax: pickIntOrText(cells[2]),
        saThObt: pickIntOrText(cells[3]),
        totalMax: pickIntOrText(cells[4]),
        totalObt: pickIntOrText(cells[5]),
        faPrMax: pickIntOrText(cells[6]),
        faPrObt: pickIntOrText(cells[7]),
        saPrMax: pickIntOrText(cells[8]),
        saPrObt: pickIntOrText(cells[9]),
        slaMax: pickIntOrText(cells[10]),
        slaObt: pickIntOrText(cells[11]),
        credits: pickIntOrText(cells[12]),
      };

      subjectMarks[subjectName] = entry;
    });

  const derivedTotals = (() => {
    let sumObt = 0;
    let sumMax = 0;
    let any = false;

    for (const entry of Object.values(subjectMarks)) {
      const obt = entry?.totalObt;
      const max = entry?.totalMax;
      if (typeof obt === "number" && typeof max === "number" && max > 0) {
        sumObt += obt;
        sumMax += max;
        any = true;
      }
    }

    if (!any || sumMax <= 0) return null;
    const pct = Number(((sumObt / sumMax) * 100).toFixed(2));
    return { totalMarks: sumObt, percentage: pct };
  })();

  const finalTotalMarks =
    typeof totalObtFromDvTotal === "number"
      ? totalObtFromDvTotal
      : typeof totalMarks === "number"
        ? totalMarks
        : derivedTotals?.totalMarks ?? null;

  const finalPercentage =
    typeof percentageFromDvTotal === "number"
      ? percentageFromDvTotal
      : typeof percentage === "number"
        ? percentage
        : derivedTotals?.percentage ?? null;

  const hasKtStar = (() => {
    for (const entry of Object.values(subjectMarks)) {
      if (!entry || typeof entry !== "object") continue;
      for (const v of Object.values(entry)) {
        if (typeof v === "string" && v.includes("*")) return true;
      }
    }
    return false;
  })();

  const isKt = !errorLike && (finalPercentage === null || hasKtStar);
  if (isKt) {
    resultStatus = "Fail";
  }

  return {
    ok: !errorLike,
    name,
    enrollmentNumber: enrollmentFromHeader || null,
    seatNumber,
    percentage: finalPercentage,
    totalMarks: finalTotalMarks,
    resultStatus,
    resultClass: isKt ? "KT" : resultClass,
    subjectMarks: Object.keys(subjectMarks).length ? subjectMarks : null,
    errorMessage: errorLike
      ? explicitErrorText || "MSBTE page indicates an error (possibly wrong CAPTCHA or invalid enrollment)"
      : null,
  };
}

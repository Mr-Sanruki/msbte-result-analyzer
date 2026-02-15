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
  const n = pickFirstNumber(t);
  return n === null ? t : n;
}

function normalizeSpaces(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

export function parseMsbteResultHtml(html) {
  if (!html) return { ok: false, errorMessage: "Empty HTML" };

  const $ = cheerio.load(html);
  const text = normalizeSpaces($("body").text());

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

  const percentageText =
    getByKeys(["percentage", "percent", "%"]) ||
    (() => {
      const m = text.match(/percentage\s*:?\s*(\d+(?:\.\d+)?)\s*%/i);
      return m ? m[0] : null;
    })();

  const percentage = percentageText ? pickFirstNumber(percentageText) : null;

  const totalMarksText = getByKeys(["total", "total marks", "grand total"]) || null;
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

  const totalObtFromDvTotal = (() => {
    const direct = totalObtFromDvTotalTableText ? pickFirstNumber(totalObtFromDvTotalTableText) : null;
    if (typeof direct === "number") return direct;
    const m1 = dvTotalText.match(/total\s*marks\s*obtained\s*[:\-]?\s*(\d+)/i);
    if (m1) return Number(m1[1]);
    const m2 = dvTotalText.match(/grand\s*total\s*[:\-]?\s*(\d+)/i);
    return m2 ? Number(m2[1]) : null;
  })();
  const percentageFromDvTotal = (() => {
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

  return {
    ok: !errorLike,
    name,
    enrollmentNumber: enrollmentFromHeader || null,
    seatNumber,
    percentage: typeof percentageFromDvTotal === "number" ? percentageFromDvTotal : percentage,
    totalMarks: typeof totalObtFromDvTotal === "number" ? totalObtFromDvTotal : totalMarks,
    resultStatus,
    resultClass,
    subjectMarks: Object.keys(subjectMarks).length ? subjectMarks : null,
    errorMessage: errorLike
      ? explicitErrorText || "MSBTE page indicates an error (possibly wrong CAPTCHA or invalid enrollment)"
      : null,
  };
}

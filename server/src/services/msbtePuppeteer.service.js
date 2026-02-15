import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

import { env } from "../config/env.js";
import { ResultBatch } from "../models/ResultBatch.js";
import { parseMsbteResultHtml } from "./msbteParse.service.js";

function defaultSelectors() {
  return {
    modeSelect: "select#ddlEnrollOrSeatNo",
    enrollmentInput: "input#txtEnrollOrSeatNo",
    captchaInput: "input#txtCaptcha, input[id*='captcha' i], input[name*='captcha' i]",
    submitButton: "input#btnShowResult, input[name='btnShowResult']",
    resultContainer: "#pnlResult, #UpdatePanel1, table",
  };
}

function loadSelectors() {
  if (!env.MSBTE_SELECTORS_JSON) return defaultSelectors();
  try {
    return { ...defaultSelectors(), ...JSON.parse(env.MSBTE_SELECTORS_JSON) };
  } catch {
    return defaultSelectors();
  }
}

async function fillInputValue(page, selector, value) {
  await page.waitForSelector(selector, { timeout: 15000 });
  await page.evaluate(
    (sel, v) => {
      const el = document.querySelector(sel);
      if (!el) return;
      el.focus();
      el.value = "";
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.value = v;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    },
    selector,
    value
  );
}

class MsBteFetchJob {
  constructor({ batchId, teacherId }) {
    this.batchId = batchId;
    this.teacherId = teacherId;
    this.status = "idle";
    this.currentIndex = 0;
    this.total = 0;
    this.currentEnrollment = null;
    this.lastError = null;
    this.selectors = loadSelectors();
  }

  async getCaptchaPngBase64() {
    if (!this.page) {
      const err = new Error("Job not started");
      err.statusCode = 400;
      throw err;
    }
    if (!this.selectors.captchaInput) {
      const err = new Error("CAPTCHA selector not configured");
      err.statusCode = 500;
      throw err;
    }

    // Try to capture the captcha image near the captcha input. MSBTE pages sometimes render
    // captcha as an <img> next to the input.
    const handle = await this.page
      .evaluateHandle((captchaSel) => {
        const input = document.querySelector(captchaSel);
        if (!input) return null;
        const row = input.closest("tr") || input.parentElement;
        if (!row) return null;
        const img = row.querySelector("img");
        return img || input;
      }, this.selectors.captchaInput)
      .catch(() => null);

    const element = handle ? handle.asElement() : null;
    if (!element) {
      const err = new Error("CAPTCHA element not found");
      err.statusCode = 404;
      throw err;
    }

    await element.scrollIntoViewIfNeeded?.().catch(() => null);
    const buf = await element.screenshot({ type: "png" });
    await handle.dispose?.().catch(() => null);
    return Buffer.from(buf).toString("base64");
  }

  async setCaptchaValue(captcha) {
    if (!this.page) {
      const err = new Error("Job not started");
      err.statusCode = 400;
      throw err;
    }
    if (!this.selectors.captchaInput) {
      const err = new Error("CAPTCHA selector not configured");
      err.statusCode = 500;
      throw err;
    }
    const value = String(captcha || "").trim();
    if (!value) {
      const err = new Error("CAPTCHA is empty");
      err.statusCode = 409;
      err.code = "CAPTCHA_EMPTY";
      throw err;
    }
    await fillInputValue(this.page, this.selectors.captchaInput, value);
  }

  async init() {
    const batch = await ResultBatch.findOne({ _id: this.batchId, teacherId: this.teacherId });
    if (!batch) {
      const err = new Error("Batch not found");
      err.statusCode = 404;
      throw err;
    }

    if (env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.log("[MSBTE] Using selectors:", this.selectors);
    }

    this.total = batch.results.length;

    const isProd = env.NODE_ENV === "production";
    const executablePath = isProd
      ? (process.env.PUPPETEER_EXECUTABLE_PATH || (await chromium.executablePath()))
      : undefined;

    this.browser = await puppeteer.launch({
      headless: isProd ? chromium.headless : false,
      defaultViewport: isProd ? chromium.defaultViewport : null,
      executablePath,
      args: isProd ? chromium.args : ["--start-maximized"],
    });

    this.page = await this.browser.newPage();

    if (!env.MSBTE_RESULT_URL) {
      const err = new Error("MSBTE_RESULT_URL is not set in server .env");
      err.statusCode = 500;
      throw err;
    }

    await this.page.goto(env.MSBTE_RESULT_URL, { waitUntil: "domcontentloaded" });

    this.status = "ready_for_captcha";
    await ResultBatch.updateOne(
      { _id: this.batchId, teacherId: this.teacherId },
      { $set: { status: "fetching" } }
    );

    await this._prepareCurrent();
  }

  async _prepareCurrent() {
    const batch = await ResultBatch.findOne({ _id: this.batchId, teacherId: this.teacherId }).lean();
    if (!batch) return;

    while (this.currentIndex < batch.results.length) {
      const r = batch.results[this.currentIndex];
      if (!r || r.fetchedAt || r.errorMessage) {
        this.currentIndex++;
        continue;
      }
      this.currentEnrollment = r.enrollmentNumber;
      break;
    }

    if (this.currentIndex >= batch.results.length) {
      this.status = "completed";
      await ResultBatch.updateOne(
        { _id: this.batchId, teacherId: this.teacherId },
        { $set: { status: "completed" } }
      );
      await this.close();
      return;
    }

    // Ensure mode is set to Enrollment No if a mode dropdown selector is provided.
    // MSBTE uses value "2" for Enrollment No.
    if (this.selectors.modeSelect) {
      try {
        await this.page.waitForSelector(this.selectors.modeSelect, { timeout: 15000 });
        await this.page.select(this.selectors.modeSelect, "2");
        await this.page.waitForFunction(
          (sel) => {
            const el = document.querySelector(sel);
            return !!el && el.value === "2";
          },
          { timeout: 15000 },
          this.selectors.modeSelect
        );
      } catch {
        // ignore and continue; page might not have the dropdown in some sessions
      }
    }

    const enrollmentSel = this.selectors.enrollmentInput;

    const attempts = 3;
    for (let i = 0; i < attempts; i++) {
      await fillInputValue(this.page, enrollmentSel, this.currentEnrollment);

      const currentValue = await this.page.$eval(enrollmentSel, (el) => (el?.value ? String(el.value) : ""));
      if (currentValue.replace(/\s+/g, "") === this.currentEnrollment) {
        break;
      }

      if (i === attempts - 1) {
        throw new Error(
          "Failed to fill enrollment input. The page might be clearing the field after selection; re-check selectors for txtEnrollOrSeatNo."
        );
      }

      await this.page.waitForTimeout(500);
    }

    this.status = "ready_for_captcha";
  }

  async continueAfterCaptcha({ captcha } = {}) {
    if (!this.page) {
      const err = new Error("Job not started");
      err.statusCode = 400;
      throw err;
    }

    if (this.status !== "ready_for_captcha") {
      const err = new Error("Job is not waiting for CAPTCHA");
      err.statusCode = 400;
      throw err;
    }

    this.status = "submitting";

    try {
      if (captcha) {
        await this.setCaptchaValue(captcha);
      }

      // In auto-continue mode we should not submit unless CAPTCHA is actually filled.
      // If captcha selector is configured and the input value is empty, throw a typed error.
      if (this.selectors.captchaInput) {
        try {
          const captchaValue = await this.page
            .$eval(this.selectors.captchaInput, (el) => (el?.value ? String(el.value) : ""))
            .catch(() => "");

          if (!String(captchaValue || "").trim()) {
            const err = new Error("CAPTCHA is empty");
            err.statusCode = 409;
            err.code = "CAPTCHA_EMPTY";
            throw err;
          }
        } catch (e) {
          if (e?.code === "CAPTCHA_EMPTY") throw e;
          // if selector doesn't exist, don't block
        }
      }

      const submit = await this.page.$(this.selectors.submitButton);
      if (!submit) {
        throw new Error("Submit button not found. Configure MSBTE_SELECTORS_JSON.");
      }

      await Promise.all([
        this.page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => null),
        submit.click(),
      ]);

      await this.page.waitForSelector(this.selectors.resultContainer, { timeout: 30000 });

      const html = await this.page.content();
      const parsed = parseMsbteResultHtml(html);

      await ResultBatch.updateOne(
        { _id: this.batchId, teacherId: this.teacherId, "results.enrollmentNumber": this.currentEnrollment },
        {
          $set: {
            "results.$.rawHtml": html,
            "results.$.fetchedAt": new Date(),
            "results.$.errorMessage": parsed.ok ? null : parsed.errorMessage || "Parse failed",
            ...(parsed.name ? { "results.$.name": parsed.name } : {}),
            ...(parsed.seatNumber ? { "results.$.seatNumber": parsed.seatNumber } : {}),
            ...(typeof parsed.totalMarks === "number" ? { "results.$.totalMarks": parsed.totalMarks } : {}),
            ...(typeof parsed.percentage === "number" ? { "results.$.percentage": parsed.percentage } : {}),
            ...(parsed.resultStatus ? { "results.$.resultStatus": parsed.resultStatus } : {}),
            ...(parsed.resultClass ? { "results.$.resultClass": parsed.resultClass } : {}),
            ...(parsed.subjectMarks ? { "results.$.subjectMarks": parsed.subjectMarks } : {}),
          },
        }
      );

      this.currentIndex++;

      // Go back to form page for next enrollment
      await this.page.goto(env.MSBTE_RESULT_URL, { waitUntil: "domcontentloaded" });

      await this._prepareCurrent();
    } catch (e) {
      if (e?.code === "CAPTCHA_EMPTY") {
        // User hasn't typed CAPTCHA yet. Do not mark this enrollment as failed.
        this.lastError = null;
        this.status = "ready_for_captcha";
        return;
      }

      this.lastError = e?.message || "Fetch failed";

      await ResultBatch.updateOne(
        { _id: this.batchId, teacherId: this.teacherId, "results.enrollmentNumber": this.currentEnrollment },
        {
          $set: {
            "results.$.errorMessage": this.lastError,
            "results.$.fetchedAt": new Date(),
          },
          $push: { errors: `${this.currentEnrollment}: ${this.lastError}` },
        }
      );

      this.currentIndex++;
      await this.page.goto(env.MSBTE_RESULT_URL, { waitUntil: "domcontentloaded" });
      await this._prepareCurrent();
    }
  }

  getState() {
    return {
      batchId: this.batchId,
      status: this.status,
      currentIndex: this.currentIndex,
      total: this.total,
      currentEnrollment: this.currentEnrollment,
      lastError: this.lastError,
    };
  }

  async close() {
    try {
      if (this.page) await this.page.close();
    } catch {}
    try {
      if (this.browser) await this.browser.close();
    } catch {}
    this.page = null;
    this.browser = null;
  }
}

const jobs = new Map();

export const msbteJobService = {
  async start({ batchId, teacherId }) {
    const key = `${teacherId}:${batchId}`;
    if (jobs.has(key)) return jobs.get(key);

    const job = new MsBteFetchJob({ batchId, teacherId });
    jobs.set(key, job);

    try {
      await job.init();
      return job;
    } catch (e) {
      jobs.delete(key);
      throw e;
    }
  },

  get({ batchId, teacherId }) {
    return jobs.get(`${teacherId}:${batchId}`) || null;
  },

  async stop({ batchId, teacherId }) {
    const key = `${teacherId}:${batchId}`;
    const job = jobs.get(key);
    if (!job) return;
    await job.close();
    jobs.delete(key);
    await ResultBatch.updateOne(
      { _id: batchId, teacherId },
      { $set: { status: "failed" }, $push: { errors: "Job stopped by user" } }
    );
  },
};

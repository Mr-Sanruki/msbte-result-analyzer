import { asyncHandler } from "../utils/asyncHandler.js";
import { msbteJobService } from "../services/msbtePuppeteer.service.js";

export const startFetch = asyncHandler(async (req, res) => {
  const job = await msbteJobService.start({
    batchId: req.params.id,
    teacherId: req.user.sub,
  });

  return res.json({ state: job.getState() });
});

export const getFetchStatus = asyncHandler(async (req, res) => {
  const job = msbteJobService.get({ batchId: req.params.id, teacherId: req.user.sub });
  if (!job) {
    return res.json({ state: { batchId: req.params.id, status: "not_started" } });
  }
  return res.json({ state: job.getState() });
});

export const continueFetch = asyncHandler(async (req, res) => {
  const job = msbteJobService.get({ batchId: req.params.id, teacherId: req.user.sub });
  if (!job) {
    return res.status(400).json({ error: { message: "Job not started" } });
  }

  try {
    const captcha = req.body?.captcha;
    await job.continueAfterCaptcha({ captcha });
    return res.json({ state: job.getState() });
  } catch (e) {
    if (e?.code === "CAPTCHA_EMPTY") {
      return res.json({ state: job.getState(), info: "captcha_empty" });
    }
    throw e;
  }
});

export const getCaptcha = asyncHandler(async (req, res) => {
  const job = msbteJobService.get({ batchId: req.params.id, teacherId: req.user.sub });
  if (!job) {
    return res.status(400).json({ error: { message: "Job not started" } });
  }

  const pngBase64 = await job.getCaptchaPngBase64();
  return res.json({ pngBase64 });
});

export const stopFetch = asyncHandler(async (req, res) => {
  await msbteJobService.stop({ batchId: req.params.id, teacherId: req.user.sub });
  return res.json({ ok: true });
});

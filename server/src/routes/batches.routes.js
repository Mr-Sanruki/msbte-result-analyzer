import { Router } from "express";

import { requireAuth } from "../middleware/auth.js";
import {
  analyticsSummary,
  batchAnalytics,
  deleteBatch,
  exportBatchXlsx,
  getBatch,
  getStudentInBatch,
  recentBatches,
  reparseBatch,
  resetFailedOrUnknown,
  uploadBatch,
  uploadMiddleware,
} from "../controllers/batches.controller.js";

const router = Router();

router.post("/batches/upload", requireAuth, uploadMiddleware, uploadBatch);
router.get("/batches/recent", requireAuth, recentBatches);
router.get("/batches/analytics/summary", requireAuth, analyticsSummary);
router.get("/batches/:id", requireAuth, getBatch);
router.get("/batches/:id/analytics", requireAuth, batchAnalytics);
router.get("/batches/:id/students/:enrollment", requireAuth, getStudentInBatch);
router.post("/batches/:id/reparse", requireAuth, reparseBatch);
router.post("/batches/:id/reset", requireAuth, resetFailedOrUnknown);
router.get("/batches/:id/export.xlsx", requireAuth, exportBatchXlsx);
router.delete("/batches/:id", requireAuth, deleteBatch);

export default router;

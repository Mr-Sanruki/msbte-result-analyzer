import { Router } from "express";

import { requireAuth } from "../middleware/auth.js";
import { continueFetch, getFetchStatus, startFetch, stopFetch } from "../controllers/fetch.controller.js";

const router = Router();

router.post("/batches/:id/fetch/start", requireAuth, startFetch);
router.get("/batches/:id/fetch/status", requireAuth, getFetchStatus);
router.post("/batches/:id/fetch/continue", requireAuth, continueFetch);
router.post("/batches/:id/fetch/stop", requireAuth, stopFetch);

export default router;

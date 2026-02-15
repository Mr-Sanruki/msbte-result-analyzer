import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { env } from "./config/env.js";
import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import batchesRoutes from "./routes/batches.routes.js";
import fetchRoutes from "./routes/fetch.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    })
  );

  app.use(helmet());

  app.use(
    rateLimit({
      windowMs: env.NODE_ENV === "production" ? 15 * 60 * 1000 : 60 * 1000,
      limit: env.NODE_ENV === "production" ? 300 : 5000,
      standardHeaders: "draft-7",
      legacyHeaders: false,
    })
  );

  app.use(express.json({ limit: "2mb" }));

  app.use("/api", healthRoutes);
  app.use("/api", authRoutes);
  app.use("/api", batchesRoutes);
  app.use("/api", fetchRoutes);

  app.use((req, res) => {
    res.status(404).json({
      error: { message: "Not found" },
    });
  });

  app.use(errorHandler);

  return app;
}

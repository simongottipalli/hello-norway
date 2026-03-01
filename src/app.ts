import express from "express";
import taskRoutes from "./routes/taskRoutes";
import otpRoutes from "./routes/otpRoutes";
import { requestLogger } from "./middleware/requestLogger";
import { errorLogger } from "./middleware/errorLogger";

export const createApp = () => {
  const app = express();

  app.use(express.json());

  // Request logging middleware (before routes)
  app.use(requestLogger);

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use(taskRoutes);
  app.use(otpRoutes);

  // Error logging middleware (after routes)
  app.use(errorLogger);

  return app;
};

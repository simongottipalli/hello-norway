import express from "express";
import cookieParser from "cookie-parser";
import taskRoutes from "./routes/taskRoutes";
import otpRoutes from "./routes/otpRoutes";
import authRoutes from "./routes/authRoutes";
import { authenticateSession } from "./middleware/authMiddleware";
import { requestLogger } from "./middleware/requestLogger";
import { errorLogger } from "./middleware/errorLogger";

export const createApp = () => {
  const app = express();
  const apiBaseUrl = "/api";

  app.use(express.json());
  app.use(cookieParser());

  // Request logging middleware (before routes)
  app.use(requestLogger);

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use(apiBaseUrl, authenticateSession, taskRoutes);
  app.use(apiBaseUrl, otpRoutes);
  app.use(apiBaseUrl, authRoutes);

  // Error logging middleware (after routes)
  app.use(errorLogger);

  return app;
};

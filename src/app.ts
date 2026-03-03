import express, { Router } from "express";
import cookieParser from "cookie-parser";
import taskRoutes from "./routes/taskRoutes";
import otpRoutes from "./routes/otpRoutes";
import authRoutes from "./routes/authRoutes";
import { authenticateSession } from "./middleware/authMiddleware";
import { requestLogger } from "./middleware/requestLogger";
import { errorLogger } from "./middleware/errorLogger";

// Routes accessible without a session cookie.
const publicApiRoutes = [otpRoutes, authRoutes];

// Routes that require a valid session — add new protected routers here.
const protectedApiRoutes = [taskRoutes];

export const createApp = () => {
  const app = express();
  const apiBaseUrl = "/api";

  app.use(express.json());
  app.use(cookieParser());

  // Request logging middleware (before routes)
  app.use(requestLogger);

  app.get("/health", (_req, res) => res.json({ ok: true }));

  publicApiRoutes.forEach((router) => app.use(apiBaseUrl, router));

  const protectedRouter = Router();
  protectedRouter.use(authenticateSession);
  protectedApiRoutes.forEach((router) => protectedRouter.use(router));
  app.use(apiBaseUrl, protectedRouter);

  // Error logging middleware (after routes)
  app.use(errorLogger);

  return app;
};

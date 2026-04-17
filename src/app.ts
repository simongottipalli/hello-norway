import express, { Router } from "express";
import cookieParser from "cookie-parser";
import taskRoutes from "./routes/taskRoutes";
import otpRoutes from "./routes/otpRoutes";
import authRoutes from "./routes/authRoutes";
import { RegisterRoutes } from "./generated/routes";
import { authenticateSession } from "./middleware/authMiddleware";
import { requestLogger } from "./middleware/requestLogger";
import { errorLogger } from "./middleware/errorLogger";
import { tsoaErrorHandler } from "./middleware/tsoaErrorHandler";

// Routes accessible without a session cookie.
const publicApiRoutes = [authRoutes];

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

  // Register tsoa-generated routes (includes OTP endpoints)
  RegisterRoutes(app);

  publicApiRoutes.forEach((router) => app.use(apiBaseUrl, router));

  // Legacy test-only route — must be before the protected router so
  // authenticateSession does not intercept it
  if (process.env.NODE_ENV === "test") {
    app.use(apiBaseUrl, otpRoutes);
  }

  const protectedRouter = Router();
  protectedRouter.use(authenticateSession);
  protectedApiRoutes.forEach((router) => protectedRouter.use(router));
  app.use(apiBaseUrl, protectedRouter);

  // tsoa validation error handler (before generic error logger)
  app.use(tsoaErrorHandler);

  // Error logging middleware (after routes)
  app.use(errorLogger);

  return app;
};

import express from "express";
import cookieParser from "cookie-parser";
import otpRoutes from "./routes/otpRoutes";
import authRoutes from "./routes/authRoutes";
import { RegisterRoutes } from "./generated/routes";
import { requestLogger } from "./middleware/requestLogger";
import { errorLogger } from "./middleware/errorLogger";
import { tsoaErrorHandler } from "./middleware/tsoaErrorHandler";

export const createApp = () => {
  const app = express();
  const apiBaseUrl = "/api";

  app.use(express.json());
  app.use(cookieParser());

  // Request logging middleware (before routes)
  app.use(requestLogger);

  app.get("/health", (_req, res) => res.json({ ok: true }));

  // Register tsoa-generated routes (auth, tasks, onboarding, otp)
  RegisterRoutes(app);

  // Keep the placeholder auth router mount; auth API endpoints are registered via tsoa above.
  app.use(apiBaseUrl, authRoutes);

  // Legacy test-only route — OTP peek endpoint used in tests
  if (process.env.NODE_ENV === "test") {
    app.use(apiBaseUrl, otpRoutes);
  }

  // tsoa validation error handler (before generic error logger)
  app.use(tsoaErrorHandler);

  // Error logging middleware (after routes)
  app.use(errorLogger);

  return app;
};

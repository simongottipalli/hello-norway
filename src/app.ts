import express from "express";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import otpRoutes from "./routes/otpRoutes";
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

  // Legacy test-only route — OTP peek endpoint used in tests
  if (process.env.NODE_ENV === "test") {
    app.use(apiBaseUrl, otpRoutes);
  }

  // Swagger UI
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(undefined, {
      swaggerOptions: {
        url: "/api-docs/swagger.json",
      },
    })
  );

  // Serve OpenAPI spec as JSON
  app.get("/api-docs/swagger.json", (_req, res) => {
    res.sendFile("swagger.json", { root: "./src/generated" });
  });

  // tsoa validation + auth error handler (before generic error logger)
  app.use(tsoaErrorHandler);

  // Error logging middleware (after routes)
  app.use(errorLogger);

  return app;
};

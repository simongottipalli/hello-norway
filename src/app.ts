import express from "express";
import taskRoutes from "./routes/taskRoutes";
import otpRoutes from "./routes/otpRoutes";

export const createApp = () => {
  const app = express();

  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use(taskRoutes);
  app.use(otpRoutes);

  return app;
};

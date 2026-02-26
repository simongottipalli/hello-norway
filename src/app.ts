import express from "express";
import taskRoutes from "./routes/taskRoutes";

export const createApp = () => {
  const app = express();

  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use(taskRoutes);

  return app;
};

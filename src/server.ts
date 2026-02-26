import express from "express";

const app = express();

app.get("/health", (_req, res) => res.json({ ok: true }));

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on :${port}`);
});

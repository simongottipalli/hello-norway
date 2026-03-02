import "dotenv/config";
import { createApp } from "./app";
import { logger } from "./lib/logger";

const app = createApp();

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  logger.info(`Server listening on :${port}`);
});

import express from "express";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { apiRouter } from "./routes.js";
import { ensureDemoSeed, initDb } from "./db.js";

initDb();
ensureDemoSeed();

const app = express();
const clientDistPath = join(process.cwd(), "dist");

app.use("/api", apiRouter);

if (existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(join(clientDistPath, "index.html"));
  });
}

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";
app.listen(port, host, () => {
  console.log(`API listening on http://${host}:${port}`);
});
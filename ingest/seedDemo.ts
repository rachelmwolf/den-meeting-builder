import { initDb, ensureDemoSeed } from "../server/db.js";

initDb();
ensureDemoSeed();
console.log("Demo data is ready.");
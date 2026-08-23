

import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { testDbConnection } from "./db";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json()); 


app.get("/api/health", async (_req: Request, res: Response) => {
  try {
    await testDbConnection();
    res.status(200).json({ status: "ok", database: "connected" });
  } catch (err) {
    console.error("Health check DB error:", err);
    res.status(500).json({ status: "error", database: "unreachable" });
  }
});


async function start() {
  try {
    await testDbConnection();
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server — database connection failed:");
    console.error(err);
    process.exit(1);
  }
}

start();
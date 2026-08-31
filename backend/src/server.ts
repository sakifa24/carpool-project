import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import bcrypt from "bcrypt";
import { testDbConnection, pool } from "./db";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: "http://127.0.0.1:5500", // Live Server default — adjust if different
  credentials: true,
}));


app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET as string,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 }, // 1 hour
  })
);

// --- Health check ---
app.get("/api/health", async (_req: Request, res: Response) => {
  try {
    await testDbConnection();
    res.status(200).json({ status: "ok", database: "connected" });
  } catch (err) {
    console.error("Health check DB error:", err);
    res.status(500).json({ status: "error", database: "unreachable" });
  }
});

// --- Signup ---
app.post("/api/signup", async (req: Request, res: Response) => {
  const { university_id, name, email, phone, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO student (university_id, name, email, phone, password) VALUES (?, ?, ?, ?, ?)",
      [university_id, name, email, phone, hashedPassword]
    );
    res.status(201).json({ message: "Signup successful" });
  } catch (err: any) {
    console.error("Signup error:", err);
    if (err.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ error: "Email or University ID already registered" });
    }
    res.status(500).json({ error: "Signup failed" });
  }
});

// --- Login ---
app.post("/api/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const [rows]: any = await pool.query(
      "SELECT * FROM student WHERE email = ?",
      [email]
    );
    const student = rows[0];
    if (!student) return res.status(401).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, student.password);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    (req.session as any).studentId = student.student_id;
    res.status(200).json({
      message: "Login successful",
      student: {
        id: student.student_id,
        name: student.name,
        email: student.email,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// --- Logout ---
app.post("/api/logout", (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Logout failed" });
    res.status(200).json({ message: "Logged out successfully" });
  });
});

// --- Search / Browse Rides (by destination) ---
app.get("/api/rides", async (req: Request, res: Response) => {
  const { destination } = req.query;

  try {
    let query = `
      SELECT rg.ride_group_id, rg.departure_time, rg.max_capacity, rg.current_count,
             rg.status, rg.total_fare, rg.vehicle_id, rg.host_id,
             (rg.max_capacity - rg.current_count) AS seats_available,
             s.name AS host_name,
             dest.location_name AS destination
      FROM ride_group rg
      JOIN student s ON rg.host_id = s.student_id
      JOIN ride_stop dest ON rg.ride_group_id = dest.ride_group_id AND dest.stop_type = 'dropoff'
      WHERE rg.status = 'open'
    `;
    const params: any[] = [];

    if (destination) {
      query += " AND dest.location_name LIKE ?";
      params.push(`%${destination}%`);
    }

    query += " ORDER BY rg.departure_time ASC";

    const [rows] = await pool.query(query, params);
    res.status(200).json(rows);
  } catch (err) {
    console.error("Error fetching rides:", err);
    res.status(500).json({ error: "Failed to fetch rides" });
  }
});
// --- Start server ---
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

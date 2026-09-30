const express = require("express");
const cors = require("cors");
const jobSearchRoutes = require("./routes/jobSearchRoutes");
require("dotenv").config();

const pool = require("./db/database");
const authRoutes = require("./routes/authRoutes");
const jobRoutes = require("./routes/jobRoutes");

const app = express();

const PORT = process.env.PORT || 5000;

const allowedOrigins = [
    "http://localhost:5173",
    process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));
app.use(express.json());
app.use("/api/job-search", jobSearchRoutes);

app.get("/", (req, res) => {
    res.json({
        message: "JobTrack Backend is running!"
    });
});

app.get("/api/health", (req, res) => {
    res.json({
        status: "OK",
        database: "PostgreSQL"
    });
});

app.use("/api/auth", authRoutes);

app.use("/api/jobs", jobRoutes);

app.listen(PORT, () => {
    console.log(`JobTrack server running on http://localhost:${PORT}`);
});
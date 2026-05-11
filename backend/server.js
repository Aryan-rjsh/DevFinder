const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const dns = require("dns");

// Force IPv4 first to avoid 'fetch failed' on systems with broken IPv6
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder("ipv4first");
}

// Bypass restrictive local DNS that might be blocking Neon
try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
    console.warn("Could not set custom DNS servers:", e.message);
}

dotenv.config();



// Global Error Handlers to catch silent crashes
process.on("uncaughtException", (err) => console.error("CRITICAL ERROR:", err));
process.on("unhandledRejection", (reason) => console.error("PROMISE REJECTION:", reason));


const authRoutes = require("./routes/auth");
const teamRoutes = require("./routes/teams");
const userRoutes = require("./routes/users");
const applicationRoutes = require("./routes/applications");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/users", userRoutes);
app.use("/api/applications", applicationRoutes);

app.get("/", (req, res) => res.send("DevFinder API running ✅"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server started on port ${PORT}`);
    console.log("Server is staying ");
});

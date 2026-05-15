const express = require("express");
const pool = require("./db");
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
const chatRoutes = require("./routes/chat");
const notificationRoutes = require("./routes/notifications");
const hackathonRoutes    = require("./routes/hackathons");
const adminRoutes        = require("./routes/admin");

const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
    cors: { origin: "*" }
});

// Set socketio globally so routes can access it
app.set("socketio", io);

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    req.io = io;
    next();
});

app.use("/api/auth", authRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/users", userRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/hackathons", hackathonRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => res.send("DevFinder API running ✅"));

// ── SOCKET.IO LOGIC ─────────────────────────────────────
io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("join_room", (teamId) => {
        socket.join(`team_${teamId}`);
    });

    socket.on("join_user", (userId) => {
        socket.join(`user_${userId}`);
    });

    socket.on("send_message", async (data) => {
        try {
            await pool.query(
                "INSERT INTO messages (team_id, sender_id, content) VALUES ($1, $2, $3)",
                [data.teamId, data.senderId, data.message]
            );
            const broadcastData = { ...data, timestamp: new Date().toLocaleTimeString() };
            io.to(`team_${data.teamId}`).emit("receive_message", broadcastData);
        } catch (err) {
            console.error("Socket save message error:", err.message);
        }
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

const PORT = process.env.PORT || 5000;
http.listen(PORT, "0.0.0.0", () => {
    console.log(`Server started on port ${PORT}`);
    console.log("Real-time Chat enabled via Socket.io");
});

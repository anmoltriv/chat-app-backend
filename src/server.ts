import "dotenv/config";
import express from "express";
import authRouter from "./routes/auth.routes.js";
import roomRouter from "./routes/room.routes.js";
import { connectDB } from "./db/db.js";
import { authMiddleware } from "./middleware/authMiddleware.js";
import { initializeWsServer } from "./sockets/index.js";
import { verifyToken } from "./middleware/wsauthUtil.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ message: "The game is On" });
});

app.use("/api/auth", authRouter);
app.use("/api/room", authMiddleware, roomRouter);

async function startServer() {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
    initializeWsServer(server);
  } catch (error) {
    console.error("Failed to initialize server:", error);
    process.exit(1);
  }
}

startServer();

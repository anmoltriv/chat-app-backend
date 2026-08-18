import "dotenv/config"; 
import express from "express";
import authRouter from "./routes/auth.routes.js";
import roomRouter from "./routes/room.routes.js";
import { connectDB } from "./db/db.js";
import { authMiddleware } from "./middleware/authMiddleware.js";

const app = express();
const PORT = process.env.PORT || 4000;


app.use(express.json());


app.get("/health", (req, res) => {
  res.json({ message: "The game is On" });
});

app.use("/api/auth", authRouter);
app.use("/api/rooms",authMiddleware, roomRouter);


async function startServer() {
  try {
    
    await connectDB();

    
    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use. Stop the other process or pick a different PORT.`);
        process.exit(1);
      }
      throw err;
    });
  } catch (error) {
    console.error("Failed to initialize server:", error);
    process.exit(1);
  }
}

startServer();
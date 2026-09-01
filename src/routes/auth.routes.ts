import { Router } from "express";
import {
  getMe,
  loginUser,
  logoutUser,
  signupUser,
} from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const authRouter = Router();

authRouter.post("/signup", signupUser);
authRouter.post("/login", loginUser);
authRouter.get("/me", authMiddleware, getMe);
authRouter.post("/logout", authMiddleware, logoutUser);

export default authRouter;

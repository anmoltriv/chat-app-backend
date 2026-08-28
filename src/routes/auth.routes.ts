import { Router } from "express";
import { loginUser, logoutUser, signupUser } from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const authRouter = Router();

authRouter.post("/signup", signupUser);
authRouter.post("/login", loginUser);
authRouter.post("/logout", authMiddleware, logoutUser);

export default authRouter;
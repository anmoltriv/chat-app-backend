
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";


export interface AuthRequest extends Request {
  userId?: string;
}


export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    
    res.status(401).json({ message: "Access token missing or malformed" });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    req.userId = decoded.id;
    next();
  } catch (error) {
    res.status(403).json({ message: "Invalid or expired token" });
  }
};
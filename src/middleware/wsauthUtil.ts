import jwt from "jsonwebtoken";
import { isTokenRevoked } from "../utils/tokenDenylist.js";

type JwtPayload = {
  id: string;
};

export const verifyToken = (token: string): number => {
  if (isTokenRevoked(token)) {
    throw new Error("Token has been revoked");
  }

  const decoded = jwt.verify(
    token,
    process.env.JWT_SECRET!,
  ) as JwtPayload;

  return Number(decoded.id);
};
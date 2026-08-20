import jwt from "jsonwebtoken";

type JwtPayload = {
  id: string;
};

export const verifyToken = (token: string): number => {
  const decoded = jwt.verify(
    token,
    process.env.JWT_SECRET!,
  ) as JwtPayload;

  return Number(decoded.id);
};
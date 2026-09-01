import bcrypt from "bcryptjs";
import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import z from "zod";
import "dotenv/config";
import { pool } from "../db/db.js";
import { revokeToken } from "../utils/tokenDenylist.js";
import { disconnectUserSockets } from "../sockets/socketManager.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "7d";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
}

const usersignupSchema = z.object({
  name: z.string().min(2).max(20),
  email: z.string().email(),
  password: z
    .string()
    .min(5, "password must be at least 5 chars")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[a-z]/, "Must contain a lowercase letter")
    .regex(/[0-9]/, "Must contain a digit"),
  user_name: z.string().max(20).min(2),
});

const userloginSchema = z.object({
  user_name: z.string().max(20).min(2),
  password: z
    .string()
    .min(5, "password must be at least 5 chars")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[a-z]/, "Must contain a lowercase letter")
    .regex(/[0-9]/, "Must contain a digit"),
});

export const signupUser: RequestHandler = async (req, res, next) => {
  const result = usersignupSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid Input",
      error: result.error,
    });
    return;
  }

  const { name, email, password, user_name } = result.data;

  try {
    const ifexists = await pool.query(
      `SELECT id
       FROM users
       WHERE email = $1 OR user_name = $2`,
      [email, user_name],
    );

    if (ifexists.rows.length > 0) {
      res.status(400).json({
        message: "Email or username is already registered",
      });
      return;
    }

    const hashpassword = await bcrypt.hash(password, 10);

    const userResult = await pool.query(
      `INSERT INTO users (name, email, user_name, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, user_name`,
      [name, email, user_name, hashpassword],
    );

    const created = userResult.rows[0];
    const token = jwt.sign({ id: created.id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    res.status(201).json({
      message: "You have successfully registered",
      token,
      user: {
        id: created.id,
        name: created.name,
        email: created.email,
        username: created.user_name,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const loginUser: RequestHandler = async (req, res) => {
  const result = userloginSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid Input",
      error: result.error,
    });
    return;
  }

  const { user_name, password } = result.data;

  try {
    const userResult = await pool.query(
      `SELECT id, name, email, user_name, password_hash
       FROM users
       WHERE user_name = $1`,
      [user_name],
    );

    const findUser = userResult.rows[0];

    if (!findUser) {
      res.status(400).json({
        success: false,
        message: "No Account is registered with this username",
      });
      return;
    }

    const checkPassword = await bcrypt.compare(
      password,
      findUser.password_hash,
    );

    if (!checkPassword) {
      res.status(400).json({
        success: false,
        message: "Incorrect password for this account",
      });
      return;
    }

    const token = jwt.sign(
      { id: findUser.id },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    );

    res.status(200).json({
      message: "You have successfully signed in",
      token,
      user: {
        id: findUser.id,
        name: findUser.name,
        email: findUser.email,
        username: findUser.user_name,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const logoutUser: RequestHandler = async (req, res) => {
  const userId = req.userId;
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  if (!token) {
    res.status(401).json({
      success: false,
      message: "Access token missing or malformed",
    });
    return;
  }

  try {
    revokeToken(token);
    disconnectUserSockets(userId!);

    res.status(200).json({
      success: true,
      message: "You have been logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getMe: RequestHandler = async (req, res) => {
  try {
    const userResult = await pool.query(
      `SELECT id, name, email, user_name
       FROM users
       WHERE id = $1`,
      [req.userId],
    );

    const user = userResult.rows[0];

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.user_name,
      },
    });
  } catch (error) {
    console.error("Get me error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
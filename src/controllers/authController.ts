import bcrypt from "bcryptjs";
import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import z from "zod";
import "dotenv/config";
import { pool } from "../db/db.js";

const JWT_SECRET = process.env.JWT_SECRET;

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
       RETURNING id`,
      [name, email, user_name, hashpassword],
    );

    const id = userResult.rows[0].id;

    const token = jwt.sign({ id }, JWT_SECRET);

    res.status(201).json({
      message: "You have successfully registered",
      token,
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
      `SELECT id, password_hash
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
    );

    res.status(200).json({
      message: "You have successfully signed in",
      token,
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const forgotPassword: RequestHandler = async (req, res) => {
  // Setup mail system using Brevo API
};
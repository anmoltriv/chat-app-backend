import bcrypt from "bcryptjs";
import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = "my_secret"; //make this secure in env

const signupUser: RequestHandler = (req, res, next) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ message: "Name, email, and password are required" });
    return;
  }

  const ifexists = 0; //find user from email in our table
  if (ifexists) {
    res.status(400).json({
      message: "user already registered with this email",
    });
    return;
  }
  const hashpassword = bcrypt.hash(password, 5);
  const user = {
    name,
    email,
    hashpassword,
  };
  // await query of registering the user WITH and fetching it's user id;
  const id = 0;
  const token = jwt.sign({ id: id }, JWT_SECRET);
  res.status(200).json({
    message: "You have succesfully registered",
    token: token,
  });
  return;
};

const loginUser: RequestHandler = (req, res) => {};

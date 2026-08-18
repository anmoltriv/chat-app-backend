import type { NextFunction, Request, Response } from "express";
import { pool } from "../db/db.js";
import { fetchroomsquery } from "../queries/rooms.queries.js";

export const getRooms = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.userId;
    const result = await pool.query(fetchroomsquery, [userId]);
    res.status(200).json({
      success: true,
      rooms: result.rows,
    });
  } catch (error) {
    console.error("Error fetching rooms:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch rooms",
    });
  }
};

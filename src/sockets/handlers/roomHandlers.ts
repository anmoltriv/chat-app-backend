import { pool } from "../../db/db.js";
import type { MessageHandlerType } from "../../types/messages.js";
import { joinRoom, leaveRoom } from "../socketManager.js";
import { connections } from "../socketStore.js";

export const handleJoinRoom: MessageHandlerType = async (ws, data) => {
  if (data.type !== "JOIN_ROOM") return;

  const connection = connections.get(ws);
  if (!connection) return;
  const userId = connection.userId;
  const roomId = data.data.roomId;
  const result = await pool.query(
    `
    INSERT INTO room_members (room_id, user_id, role)
    VALUES ($1, $2, 'MEMBER')
    ON CONFLICT (room_id, user_id) DO NOTHING
    RETURNING user_id
    `,
    [roomId, userId],
  );
  if (result) {
    joinRoom(ws, roomId);
  }
};

export const handleLeaveRoom: MessageHandlerType = async (ws, data) => {
  if (data.type !== "LEAVE_ROOM") return;

  const connection = connections.get(ws);
  if (!connection) return;

  const userId = connection.userId;
  const roomId = data.data.roomId;

  await pool.query(
    `
    DELETE FROM room_members
    WHERE room_id = $1 AND user_id = $2
    `,
    [roomId, userId],
  );

  leaveRoom(ws, roomId);
};

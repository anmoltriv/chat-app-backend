import { pool } from "../db/db.js";
import { getRooms } from "../queries/rooms.queries.js";
import {
  connections,
  roomSockets,
  userSockets,
  type Connection,
} from "./socketStore.js";
import { WebSocket } from "ws";

export async function addConnection(
  socket: WebSocket,
  userId: number
) {
  const rooms = await getRooms(userId);
  // remember in js the objects are pointer/reference based so the changes are propogated even if they are stored somewhere
  const connection: Connection = {
    userId,
    rooms: new Set(),
  };
  connections.set(socket, connection);

  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }

  userSockets.get(userId)!.add(socket);

  for (const room of rooms) {
    const roomId = room.id;

    connection.rooms.add(roomId);

    if (!roomSockets.has(roomId)) {
      roomSockets.set(roomId, new Set());
    }
    roomSockets.get(roomId)!.add(socket);
  }
}

export function removeConnection(socket: WebSocket) {
  const connection = connections.get(socket);
  if (!connection) {
    return;
  }
  const { userId, rooms } = connection;
  connections.delete(socket);
  if (userSockets.get(userId)) {
    const totalSockets = userSockets.get(userId);
    totalSockets!.delete(socket);
    if (!totalSockets?.size) {
      userSockets.delete(userId);
    }
  }
  for (const roomid of connection.rooms) {
    const sockets = roomSockets.get(roomid);
    if (sockets) {
      sockets.delete(socket);
      if (sockets.size === 0) {
        roomSockets.delete(roomid);
      }
    }
  }
}

export function joinRoom() {}

export function leaveRoom() {}

export function broadcastToRoom() {}

export function sendToUser() {}

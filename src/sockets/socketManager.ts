import { getRooms } from "../queries/rooms.queries.js";
import {
  connections,
  roomSockets,
  userSockets,
  type Connection,
} from "./socketStore.js";
import { WebSocket } from "ws";

export async function addConnection(ws: WebSocket, userId: number) {
  userId = Number(userId);
  const rooms = await getRooms(userId);
  // remember in js the objects are pointer/reference based so the changes are propogated even if they are stored somewhere
  const connection: Connection = {
    userId,
    rooms: new Set(),
  };
  connections.set(ws, connection);

  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }

  userSockets.get(userId)!.add(ws);

  for (const room of rooms) {
    const roomId = Number(room.id);

    connection.rooms.add(roomId);

    if (!roomSockets.has(roomId)) {
      roomSockets.set(roomId, new Set());
    }
    roomSockets.get(roomId)!.add(ws);
  }
}

export function removeConnection(ws: WebSocket) {
  const connection = connections.get(ws);
  if (!connection) {
    return;
  }
  const { userId, rooms } = connection;
  connections.delete(ws);
  if (userSockets.get(userId)) {
    const totalSockets = userSockets.get(userId);
    totalSockets!.delete(ws);
    if (!totalSockets?.size) {
      userSockets.delete(userId);
    }
  }
  for (const roomid of connection.rooms) {
    const sockets = roomSockets.get(roomid);
    if (sockets) {
      sockets.delete(ws);
      if (sockets.size === 0) {
        roomSockets.delete(roomid);
      }
    }
  }
}

export function subscribeSocketToRoom(ws: WebSocket, roomId: number) {
  const connection = connections.get(ws);
  if (!connection) {
    return;
  }

  const id = Number(roomId);
  connection.rooms.add(id);

  if (!roomSockets.has(id)) {
    roomSockets.set(id, new Set());
  }

  roomSockets.get(id)!.add(ws);
}

export function unsubscribeSocketFromRoom(ws: WebSocket, roomId: number) {
  const connection = connections.get(ws);
  if (!connection) {
    return;
  }

  const id = Number(roomId);
  connection.rooms.delete(id);

  const sockets = roomSockets.get(id);
  if (!sockets) {
    return;
  }

  sockets.delete(ws);

  if (sockets.size === 0) {
    roomSockets.delete(roomId);
  }
}

export function subscribeUserSocketsToRoom(userId: number, roomId: number) {
  const sockets = userSockets.get(Number(userId));
  if (!sockets) {
    return;
  }

  for (const socket of sockets) {
    subscribeSocketToRoom(socket, Number(roomId));
  }
}

export function unsubscribeUserSocketsFromRoom(userId: number, roomId: number) {
  const sockets = userSockets.get(Number(userId));
  if (!sockets) {
    return;
  }

  for (const socket of sockets) {
    unsubscribeSocketFromRoom(socket, Number(roomId));
  }
}

export function broadcastToRoom(roomId: number, message: object) {
  const sockets = roomSockets.get(Number(roomId));
  if (!sockets) {
    return;
  }

  const payload = JSON.stringify(message);

  for (const socket of sockets) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(payload);
    }
  }
}

export function sendToUser(userId: number, message: object) {
  const sockets = userSockets.get(userId);
  if (!sockets) {
    return;
  }

  const payload = JSON.stringify(message);

  for (const socket of sockets) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(payload);
    }
  }
}

export function disconnectUserSockets(userId: number) {
  const sockets = userSockets.get(userId);
  if (!sockets) {
    return;
  }

  for (const socket of [...sockets]) {
    socket.close(1000, "Logged out");
  }
}

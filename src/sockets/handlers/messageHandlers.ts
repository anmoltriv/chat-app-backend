import type { MessageHandlerType } from "../../types/messages.js";
import { createMessageInRoom } from "../../queries/rooms.queries.js";
import { broadcastToRoom } from "../socketManager.js";
import { connections } from "../socketStore.js";

export const handleSendMessage: MessageHandlerType = async (ws, data) => {
  if (data.type !== "SEND_MESSAGE") return;

  const connection = connections.get(ws);
  if (!connection) return;

  const { roomId, content } = data.data;

  if (!connection.rooms.has(roomId)) {
    return;
  }

  const message = await createMessageInRoom(roomId, connection.userId, content);

  broadcastToRoom(roomId, {
    type: "SEND_MESSAGE",
    data: message,
  });
};

export const handleEditMessage: MessageHandlerType = async (_ws, data) => {
  if (data.type !== "EDIT_MESSAGE") return;
};

export const handleDeleteMessage: MessageHandlerType = async (_ws, data) => {
  if (data.type !== "DELETE_MESSAGE") return;
};

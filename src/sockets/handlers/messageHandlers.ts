import type { MessageHandlerType } from "../../types/messages.js";
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

  broadcastToRoom(roomId, {
    type: "SEND_MESSAGE",
    data: {
      roomId,
      content,
      senderId: connection.userId,
    },
  });
};

export const handleEditMessage: MessageHandlerType = async (_ws, data) => {
  if (data.type !== "EDIT_MESSAGE") return;
};

export const handleDeleteMessage: MessageHandlerType = async (_ws, data) => {
  if (data.type !== "DELETE_MESSAGE") return;
};

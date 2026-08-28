import type { MessageHandlerType } from "../../types/messages.js";
import {
  createMessageInRoom,
  deleteMessageFromRoom,
  getMessageById,
  updateMessageInRoom,
} from "../../queries/rooms.queries.js";
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

export const handleEditMessage: MessageHandlerType = async (ws, data) => {
  if (data.type !== "EDIT_MESSAGE") return;

  const connection = connections.get(ws);
  if (!connection) return;

  const { messageId, content } = data.data;

  const existing = await getMessageById(messageId);
  if (!existing) return;

  if (!connection.rooms.has(existing.room_id)) return;

  const message = await updateMessageInRoom(
    messageId,
    connection.userId,
    content,
  );
  if (!message) return;

  broadcastToRoom(message.roomId, {
    type: "EDIT_MESSAGE",
    data: message,
  });
};

export const handleDeleteMessage: MessageHandlerType = async (ws, data) => {
  if (data.type !== "DELETE_MESSAGE") return;

  const connection = connections.get(ws);
  if (!connection) return;

  const { messageId } = data.data;

  const existing = await getMessageById(messageId);
  if (!existing) return;

  if (!connection.rooms.has(existing.room_id)) return;

  const deleted = await deleteMessageFromRoom(messageId, connection.userId);
  if (!deleted) return;

  broadcastToRoom(deleted.roomId, {
    type: "DELETE_MESSAGE",
    data: deleted,
  });
};

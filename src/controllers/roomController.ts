import type { NextFunction, Request, Response } from "express";
import z from "zod";
import {
  addUserToRoom,
  createRoomForUser,
  getMemberRole,
  getMembersForRoom,
  getMessagesForRoom,
  getRoomForUser,
  getRoomsWithLastMessage,
  promoteMemberInRoom,
  removeUserFromRoom,
  roomExists,
} from "../queries/rooms.queries.js";
import {
  subscribeUserSocketsToRoom,
  unsubscribeUserSocketsFromRoom,
} from "../sockets/socketManager.js";

const createRoomSchema = z.object({
  name: z.string().trim().min(2).max(50),
});

function parseId(raw: string | string[] | undefined) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const id = Number(value);
  return Number.isInteger(id) ? id : null;
}

// get rooms controller fetches the data of the user(rooms involved + last message reveived on each room with sender info)
export const getRooms = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.userId;
    res.status(200).json({
      success: true,
      rooms: await getRoomsWithLastMessage(userId!),
    });
  } catch (error) {
    console.error("Error fetching rooms:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch rooms",
    });
  }
};

export const createRoom = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const parsedBody = createRoomSchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid room input",
      error: parsedBody.error,
    });
  }

  try {
    const userId = req.userId;
    const roomId = await createRoomForUser(userId!, parsedBody.data.name);

    subscribeUserSocketsToRoom(userId!, roomId);

    const room = await getRoomForUser(userId!, roomId);

    return res.status(201).json({
      success: true,
      room,
    });
  } catch (error) {
    console.error("Error creating room:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create room",
    });
  }
};

export const joinRoomHttp = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.userId;
    const roomId = parseId(req.params.roomId);

    if (roomId === null) {
      return res.status(400).json({
        success: false,
        message: "Invalid room id",
      });
    }

    if (!(await roomExists(roomId))) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    await addUserToRoom(userId!, roomId);
    subscribeUserSocketsToRoom(userId!, roomId);

    const room = await getRoomForUser(userId!, roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    return res.status(200).json({
      success: true,
      room,
    });
  } catch (error) {
    console.error("Error joining room:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to join room",
    });
  }
};

export const getRoomMessages = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.userId;
    const roomId = parseId(req.params.roomId);

    if (roomId === null) {
      return res.status(400).json({
        success: false,
        message: "Invalid room id",
      });
    }

    const room = await getRoomForUser(userId!, roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    return res.status(200).json({
      success: true,
      messages: await getMessagesForRoom(roomId),
    });
  } catch (error) {
    console.error("Error fetching room messages:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch room messages",
    });
  }
};

export const leaveRoomHttp = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.userId;
    const roomId = parseId(req.params.roomId);

    if (roomId === null) {
      return res.status(400).json({
        success: false,
        message: "Invalid room id",
      });
    }

    await removeUserFromRoom(userId!, roomId);
    unsubscribeUserSocketsFromRoom(userId!, roomId);

    return res.status(200).json({
      success: true,
      roomId,
    });
  } catch (error) {
    console.error("Error leaving room:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to leave room",
    });
  }
};

export const getRoomMembers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.userId;
    const roomId = parseId(req.params.roomId);

    if (roomId === null) {
      return res.status(400).json({
        success: false,
        message: "Invalid room id",
      });
    }

    const room = await getRoomForUser(userId!, roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    return res.status(200).json({
      success: true,
      members: await getMembersForRoom(roomId),
    });
  } catch (error) {
    console.error("Error fetching room members:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch members",
    });
  }
};

export const promoteMemberHttp = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.userId;
    const roomId = parseId(req.params.roomId);
    const memberId = parseId(req.params.memberId);

    if (roomId === null || memberId === null) {
      return res.status(400).json({
        success: false,
        message: "Invalid room or member id",
      });
    }

    const role = await getMemberRole(userId!, roomId);
    if (role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can promote members",
      });
    }

    const promoted = await promoteMemberInRoom(roomId, memberId);
    if (!promoted) {
      return res.status(404).json({
        success: false,
        message: "Member not found in this room",
      });
    }

    return res.status(200).json({
      success: true,
      memberId,
    });
  } catch (error) {
    console.error("Error promoting member:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to promote member",
    });
  }
};

export const removeMemberHttp = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.userId;
    const roomId = parseId(req.params.roomId);
    const memberId = parseId(req.params.memberId);

    if (roomId === null || memberId === null) {
      return res.status(400).json({
        success: false,
        message: "Invalid room or member id",
      });
    }

    if (memberId === userId) {
      return res.status(400).json({
        success: false,
        message: "Use leave room to remove yourself",
      });
    }

    const role = await getMemberRole(userId!, roomId);
    if (role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can remove members",
      });
    }

    const targetRole = await getMemberRole(memberId, roomId);
    if (!targetRole) {
      return res.status(404).json({
        success: false,
        message: "Member not found in this room",
      });
    }

    await removeUserFromRoom(memberId, roomId);
    unsubscribeUserSocketsFromRoom(memberId, roomId);

    return res.status(200).json({
      success: true,
      memberId,
    });
  } catch (error) {
    console.error("Error removing member:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to remove member",
    });
  }
};

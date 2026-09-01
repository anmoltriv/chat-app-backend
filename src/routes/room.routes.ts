import { Router } from "express";
import {
  createRoom,
  getRooms,
  getRoomMessages,
  getRoomMembers,
  joinRoomHttp,
  leaveRoomHttp,
  promoteMemberHttp,
  removeMemberHttp,
} from "../controllers/roomController.js";

const roomRouter = Router();

roomRouter.post("/", createRoom);
roomRouter.get("/my-rooms", getRooms);
roomRouter.get("/:roomId/messages", getRoomMessages);
roomRouter.get("/:roomId/members", getRoomMembers);
roomRouter.post("/:roomId/members/:memberId/promote", promoteMemberHttp);
roomRouter.delete("/:roomId/members/:memberId", removeMemberHttp);
roomRouter.post("/:roomId/join", joinRoomHttp);
roomRouter.post("/:roomId/leave", leaveRoomHttp);

export default roomRouter;

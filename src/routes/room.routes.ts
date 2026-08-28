import { Router } from "express";
import {
  createRoom,
  getRooms,
  getRoomMessages,
  joinRoomHttp,
  leaveRoomHttp,
} from "../controllers/roomController.js";


const roomRouter = Router();

roomRouter.post("/", createRoom);
roomRouter.get("/my-rooms", getRooms);
roomRouter.get("/:roomId/messages", getRoomMessages);
roomRouter.post("/:roomId/join", joinRoomHttp);
roomRouter.post("/:roomId/leave", leaveRoomHttp);

export default roomRouter;

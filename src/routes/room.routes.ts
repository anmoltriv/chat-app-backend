import { Router } from "express";
import {
  getRooms,
  joinRoomHttp,
  leaveRoomHttp,
} from "../controllers/roomController.js";


const roomRouter = Router();

roomRouter.get("/my-rooms", getRooms);
roomRouter.post("/:roomId/join", joinRoomHttp);
roomRouter.post("/:roomId/leave", leaveRoomHttp);

export default roomRouter;

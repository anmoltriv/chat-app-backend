import { Router } from "express";
import { getRooms } from "../controllers/roomController.js";


const roomRouter = Router();

roomRouter.get("/my-rooms",getRooms);





export default roomRouter;
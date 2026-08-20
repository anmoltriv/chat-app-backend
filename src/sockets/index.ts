import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import { verifyToken } from "../middleware/wsauthUtil.js";

let wss: WebSocketServer;

export const initializeWsServer = (server: Server) => {
    wss = new WebSocketServer({ noServer: true });

    server.on("upgrade", (req, tcpSocket, head) => {
        try {
            const url = new URL(
                req.url!,
                `http://${req.headers.host}`
            );

            const token = url.searchParams.get("token");

            if (!token) {
                tcpSocket.destroy();
                return;
            }

            const userId = verifyToken(token);
            req.userId = userId;
            wss.handleUpgrade(
                req,
                tcpSocket,
                head,
                (ws) => {
                    wss.emit("connection", ws, req);
                }
            );

        } catch (error) {
            console.error(
                "WebSocket authentication failed:",
                error
            );

            tcpSocket.destroy();
        }
    });

    // wss.on("connection", (ws, req, userId) => {
         
    //     console.log(`User ${userId} connected`);

    //     ws.on("message", (data) => {
    //         console.log(
    //             `Message from ${userId}:`,
    //             data.toString()
    //         );
    //     });

    //     ws.on("close", () => {
    //         console.log(`User ${userId} disconnected`);
    //     });

    //     ws.on("error", (error) => {
    //         console.error(
    //             `Socket error for user ${userId}:`,
    //             error
    //         );
    //     });
    // });
};
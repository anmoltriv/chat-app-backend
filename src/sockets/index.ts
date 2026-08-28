import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import { verifyToken } from "../middleware/wsauthUtil.js";
import { addConnection, removeConnection } from "./socketManager.js";
import type {
  ClientMessage,
  MessageHandlerType,
  MessageType,
} from "../types/messages.js";
import {
  handleSendMessage,
  handleEditMessage,
  handleDeleteMessage,
} from "./handlers/messageHandlers.js";
let wss: WebSocketServer;

const handlers: Record<MessageType, MessageHandlerType> = {
  SEND_MESSAGE: handleSendMessage,
  EDIT_MESSAGE: handleEditMessage,
  DELETE_MESSAGE: handleDeleteMessage,
};

export const initializeWsServer = (server: Server) => {
  wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, tcpSocket, head) => {
    try {
      const url = new URL(req.url!, `http://${req.headers.host}`);

      const token = url.searchParams.get("token");

      if (!token) {
        tcpSocket.destroy();
        return;
      }

      const userId = verifyToken(token);
      req.userId = userId;
      wss.handleUpgrade(req, tcpSocket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } catch (error) {
      console.error("WebSocket authentication failed:", error);

      tcpSocket.destroy();
    }
  });

  wss.on("connection", async (ws: WebSocket, req) => {
    const userId = req.userId!;
    await addConnection(ws, userId);

    ws.on("message", async (rawdata) => {
      try {
        const data = JSON.parse(rawdata.toString());
        const handler = handlers[data.type];

        if (!handler) {
          return;
        }

        await handler(ws, data);
      } catch (err) {
        console.error("WebSocket message handling failed:", err);
      }
    });

    ws.on("close", () => {
      removeConnection(ws);
    });

    ws.on("error", (error) => {
      console.error(`Socket error for user ${userId}:`, error);
    });
  });
};

// '''This file is responsible for **creating and authenticating the WebSocket server during the HTTP upgrade process**. First, we import `WebSocketServer` and `WebSocket` from `ws`, and the Node.js `Server` type so that our WebSocket server can attach to the existing HTTP server. We also import `verifyToken`, which will validate the JWT and return the authenticated user's ID. The `wss` variable stores the WebSocket server instance. When `initializeWsServer(server)` is called, we create a `WebSocketServer` with `noServer: true`, meaning the WebSocket server will **not automatically handle HTTP upgrades**; instead, we manually control the upgrade process. We then listen for the HTTP server's `"upgrade"` event, which fires when a client requests to change an HTTP connection into a WebSocket connection. Inside this handler, we first construct a `URL` from the request URL, then extract the `token` from the query parameters. If no token is provided, we immediately destroy the underlying TCP socket because the client cannot be authenticated. If a token exists, `verifyToken(token)` validates it and gives us the corresponding `userId`. We attach that `userId` to the request object using `req.userId`, so the authenticated identity can later be accessed when handling the WebSocket connection. Next, `wss.handleUpgrade()` completes the HTTP → WebSocket protocol upgrade. Once the upgrade succeeds, its callback gives us the newly created `ws` connection, and we manually emit the `"connection"` event on `wss`, passing both the WebSocket connection and the original request. This eventually triggers our connection handler, where we can use `req.userId` to know **which authenticated user owns that socket**. The commented-out section shows the next layer of the architecture: when a user connects, we can log their connection, listen for incoming messages, handle disconnections, and handle socket errors. So the overall flow is: **Client sends WebSocket request → server receives upgrade → extract token → verify JWT → obtain userId → attach userId to request → upgrade HTTP connection to WebSocket → emit connection event → handle authenticated user's socket.

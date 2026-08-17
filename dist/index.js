import WebSocket, { WebSocketServer } from "ws";
const wss = new WebSocketServer({ port: 8080 });
let userCount = 0;
let allSockets = [];
wss.on("connection", (socket) => {
    console.log("user connected");
    userCount++;
    console.log("user connected #", userCount);
    allSockets.push(socket);
    socket.on("message", (message) => {
        console.log("message received:", message.toString());
        for (const s of allSockets) {
            if (s.readyState === WebSocket.OPEN) {
                s.send(message.toString());
            }
        }
    });
    socket.on("close", () => {
        console.log("user disconnected");
        allSockets = allSockets.filter((s) => s !== socket);
        userCount--;
        console.log("users:", userCount);
    });
});
//# sourceMappingURL=index.js.map
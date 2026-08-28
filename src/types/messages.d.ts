import { WebSocket } from "ws";
export type ClientMessage =
  | {
      type: "SEND_MESSAGE";
      data: {
        roomId: number;
        content: string;
      };
    }
  | {
      type: "EDIT_MESSAGE";
      data: {
        messageId: number;
        content: string;
      };
    }
  | {
      type: "DELETE_MESSAGE";
      data: {
        messageId: number;
      };
    };

export type MessageType = ClientMessage["type"];
export type MessageHandlerType = (
  ws: WebSocket,
  message: ClientMessage,
) => void | Promise<void>;


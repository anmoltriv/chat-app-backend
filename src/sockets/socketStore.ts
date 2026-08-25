export type Connection = {
  userId: number;
  rooms: Set<number>;
};

export const connections = new Map<WebSocket, Connection>();

export const userSockets = new Map<number, Set<WebSocket>>();

export const roomSockets = new Map<number, Set<WebSocket>>();


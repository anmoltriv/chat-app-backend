import "http";

declare module "http" {
  interface IncomingMessage {
    userId?: number;
  }
}
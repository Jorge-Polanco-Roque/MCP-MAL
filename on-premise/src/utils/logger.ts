import pino from "pino";

export const logger = pino({
  transport: undefined,
  level: process.env.LOG_LEVEL || "info",
}, pino.destination(2)); // stderr for stdio compatibility

import pino, { type Logger, type LoggerOptions } from "pino";

const isProd = process.env.NODE_ENV === "production";
const level = process.env.LOG_LEVEL || (isProd ? "info" : "debug");

const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.password',
  'req.body.currentPassword',
  'req.body.newPassword',
  'req.body.refreshToken',
  'req.body.accessToken',
  '*.password',
  '*.refreshToken',
  '*.accessToken',
  '*.apiKey',
  '*.secret',
  '*.token',
];

const options: LoggerOptions = {
  level,
  base: {
    service: "b4skills",
    env: process.env.NODE_ENV || "development",
  },
  redact: { paths: redactPaths, censor: "[REDACTED]" },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
};

if (!isProd) {
  options.transport = {
    target: "pino-pretty",
    options: { colorize: true, translateTime: "SYS:HH:MM:ss.l", ignore: "pid,hostname,service,env" },
  };
}

export const logger: Logger = pino(options);

export const child = (bindings: Record<string, unknown>) => logger.child(bindings);

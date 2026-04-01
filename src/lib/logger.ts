type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getMinLevel(): number {
  const env = process.env.LOG_LEVEL?.toLowerCase();
  if (env && env in LOG_LEVELS) return LOG_LEVELS[env as LogLevel];
  return LOG_LEVELS.info; // default: info
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function log(
  level: LogLevel,
  context: string,
  message: string,
  data?: Record<string, unknown>,
) {
  if (LOG_LEVELS[level] < getMinLevel()) return;

  const prefix = `${formatTimestamp()} [${level.toUpperCase()}] [${context}]`;
  const fn =
    level === "error"
      ? console.error
      : level === "warn"
        ? console.warn
        : console.log;

  if (data) {
    fn(prefix, message, JSON.stringify(data));
  } else {
    fn(prefix, message);
  }
}

export const logger = {
  debug: (ctx: string, msg: string, data?: Record<string, unknown>) =>
    log("debug", ctx, msg, data),
  info: (ctx: string, msg: string, data?: Record<string, unknown>) =>
    log("info", ctx, msg, data),
  warn: (ctx: string, msg: string, data?: Record<string, unknown>) =>
    log("warn", ctx, msg, data),
  error: (ctx: string, msg: string, data?: Record<string, unknown>) =>
    log("error", ctx, msg, data),
};

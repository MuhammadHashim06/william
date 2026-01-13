import pino from "pino";
import type { Bindings } from "pino";

export const logger = pino({
    level: process.env.LOG_LEVEL ?? "info",
    transport:
        process.env.APP_ENV === "development"
            ? { target: "pino-pretty", options: { colorize: true } }
            : undefined,
});

export function withCtx(ctx: Bindings) {
    return logger.child(ctx);
}

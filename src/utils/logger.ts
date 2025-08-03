import morgan from "morgan";
import { config } from "./config";

export interface LogLevel {
  ERROR: "error";
  WARN: "warn";
  INFO: "info";
  DEBUG: "debug";
}

export const LOG_LEVELS: LogLevel = {
  ERROR: "error",
  WARN: "warn",
  INFO: "info",
  DEBUG: "debug",
};

class Logger {
  private logLevel: string;
  private isDevelopment: boolean;

  constructor() {
    this.logLevel = config.logging.level;
    this.isDevelopment = config.server.nodeEnv === "development";
  }

  private shouldLog(level: string): boolean {
    const levels = ["error", "warn", "info", "debug"];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex <= currentLevelIndex;
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const baseLog = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(meta && { meta }),
    };

    if (this.isDevelopment) {
      // Pretty print for development
      return `[${timestamp}] ${level.toUpperCase()}: ${message}${meta ? ` | ${JSON.stringify(meta, null, 2)}` : ""}`;
    } else {
      // JSON format for production
      return JSON.stringify(baseLog);
    }
  }

  error(message: string, meta?: any): void {
    if (this.shouldLog("error")) {
      console.error(this.formatMessage("error", message, meta));
    }
  }

  warn(message: string, meta?: any): void {
    if (this.shouldLog("warn")) {
      console.warn(this.formatMessage("warn", message, meta));
    }
  }

  info(message: string, meta?: any): void {
    if (this.shouldLog("info")) {
      console.info(this.formatMessage("info", message, meta));
    }
  }

  debug(message: string, meta?: any): void {
    if (this.shouldLog("debug")) {
      console.debug(this.formatMessage("debug", message, meta));
    }
  }

  // HTTP request logging middleware
  getHttpLogger() {
    const format = this.isDevelopment ? "dev" : config.logging.format;

    return morgan(format, {
      stream: {
        write: (message: string) => {
          // Remove trailing newline from morgan
          this.info(message.trim(), { type: "http" });
        },
      },
      skip: (req, _res) => {
        // Skip logging for health checks in production
        if (!this.isDevelopment && req.url === "/health") {
          return true;
        }
        return false;
      },
    });
  }

  // Request ID middleware helper
  logRequest(requestId: string, method: string, url: string, ip: string): void {
    this.info("Incoming request", {
      requestId,
      method,
      url,
      ip,
      type: "request",
    });
  }

  logResponse(
    requestId: string,
    statusCode: number,
    responseTime: number,
  ): void {
    this.info("Request completed", {
      requestId,
      statusCode,
      responseTime: `${responseTime}ms`,
      type: "response",
    });
  }

  logError(error: Error, requestId?: string, context?: any): void {
    this.error("Application error", {
      requestId,
      error: {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined,
      },
      context,
      type: "error",
    });
  }

  logCKBFSOperation(
    operation: string,
    uri: string,
    network: string,
    success: boolean,
    duration?: number,
    error?: string,
  ): void {
    const message = `CKBFS ${operation} ${success ? "completed" : "failed"}`;

    const meta = {
      operation,
      uri,
      network,
      success,
      ...(duration && { duration: `${duration}ms` }),
      ...(error && { error }),
      type: "ckbfs",
    };

    if (success) {
      this.info(message, meta);
    } else {
      this.error(message, meta);
    }
  }

  logServiceHealth(
    serviceName: string,
    status: "up" | "down" | "degraded",
    responseTime?: number,
    details?: string,
  ): void {
    const message = `Service ${serviceName} is ${status}`;
    this.info(message, {
      service: serviceName,
      status,
      ...(responseTime && { responseTime: `${responseTime}ms` }),
      ...(details && { details }),
      type: "health",
    });
  }

  logStartup(port: number, network: string, nodeEnv: string): void {
    this.info("Server starting up", {
      port,
      network,
      nodeEnv,
      version: process.env["npm_package_version"] || "unknown",
      nodeVersion: process.version,
      type: "startup",
    });
  }

  logShutdown(signal?: string): void {
    this.info("Server shutting down", {
      signal,
      uptime: process.uptime(),
      type: "shutdown",
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export types for use in other modules
export type LoggerInstance = typeof logger;

export default logger;

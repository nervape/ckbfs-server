import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import { config } from "../utils/config";
import {
  ApiResponse,
  ErrorResponse,
  HttpStatus,
  ErrorCode,
} from "../types/responses";

// Custom error classes
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;
  public details?: string;

  constructor(
    message: string,
    statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
    code: string = ErrorCode.INTERNAL_SERVER_ERROR,
    details?: string,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    if (details) {
      this.details = details;
    }

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  public validationErrors: Array<{
    field: string;
    message: string;
    value?: any;
  }>;

  constructor(
    message: string,
    validationErrors: Array<{
      field: string;
      message: string;
      value?: any;
    }> = [],
    details?: string,
  ) {
    super(
      message,
      HttpStatus.BAD_REQUEST,
      ErrorCode.MISSING_REQUIRED_FIELD,
      details,
    );
    this.validationErrors = validationErrors;
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found", details?: string) {
    super(message, HttpStatus.NOT_FOUND, ErrorCode.FILE_NOT_FOUND, details);
  }
}

export class NetworkError extends AppError {
  constructor(message: string = "Network error occurred", details?: string) {
    super(message, HttpStatus.BAD_GATEWAY, ErrorCode.NETWORK_ERROR, details);
  }
}

export class TimeoutError extends AppError {
  constructor(message: string = "Request timeout", details?: string) {
    super(
      message,
      HttpStatus.GATEWAY_TIMEOUT,
      ErrorCode.TIMEOUT_ERROR,
      details,
    );
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(
    message: string = "Service temporarily unavailable",
    details?: string,
  ) {
    super(
      message,
      HttpStatus.SERVICE_UNAVAILABLE,
      ErrorCode.SERVICE_UNAVAILABLE,
      details,
    );
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = "Rate limit exceeded", details?: string) {
    super(
      message,
      HttpStatus.TOO_MANY_REQUESTS,
      ErrorCode.RATE_LIMIT_EXCEEDED,
      details,
    );
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized access", details?: string) {
    super(message, HttpStatus.UNAUTHORIZED, ErrorCode.UNAUTHORIZED, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Access forbidden", details?: string) {
    super(message, HttpStatus.FORBIDDEN, ErrorCode.FORBIDDEN, details);
  }
}

// Error handler middleware
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const requestId = req.headers["x-request-id"] as string;
  const startTime = Date.now();

  // Skip if response already sent
  if (res.headersSent) {
    return next(error);
  }

  let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
  let errorCode: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR;
  let message = "An internal server error occurred";
  let details: string | undefined;

  // Handle custom application errors
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    errorCode = error.code as ErrorCode;
    message = error.message;
    details = error.details;

    // Log operational errors as warnings, others as errors
    if (error.isOperational) {
      logger.warn("Operational error occurred", {
        requestId,
        code: errorCode,
        message,
        details,
        statusCode,
        url: req.url,
        method: req.method,
      });
    } else {
      logger.logError(error, requestId, {
        url: req.url,
        method: req.method,
        body: req.body,
        query: req.query,
      });
    }
  }
  // Handle validation errors from Joi
  else if (error.name === "ValidationError") {
    statusCode = HttpStatus.BAD_REQUEST;
    errorCode = ErrorCode.MISSING_REQUIRED_FIELD;
    message = "Validation failed";
    details = error.message;

    logger.warn("Validation error", {
      requestId,
      message: error.message,
      url: req.url,
      method: req.method,
    });
  }
  // Handle JSON syntax errors
  else if (error instanceof SyntaxError && "body" in error) {
    statusCode = HttpStatus.BAD_REQUEST;
    errorCode = ErrorCode.MISSING_REQUIRED_FIELD;
    message = "Invalid JSON in request body";
    details = error.message;

    logger.warn("JSON syntax error", {
      requestId,
      message: error.message,
      url: req.url,
      method: req.method,
    });
  }
  // Handle MongoDB/Database errors
  else if (error.name === "MongoError" || error.name === "MongooseError") {
    statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    errorCode = ErrorCode.INTERNAL_SERVER_ERROR;
    message = "Database error occurred";
    details = config.development.debug ? error.message : undefined;

    logger.logError(error, requestId, {
      type: "database",
      url: req.url,
      method: req.method,
    });
  }
  // Handle network/timeout errors
  else if (
    error.message.includes("timeout") ||
    error.message.includes("ETIMEDOUT") ||
    error.message.includes("ECONNRESET")
  ) {
    statusCode = HttpStatus.GATEWAY_TIMEOUT;
    errorCode = ErrorCode.TIMEOUT_ERROR;
    message = "Request timeout";
    details = config.development.debug
      ? error.message
      : "The request took too long to complete";

    logger.error("Timeout error", {
      requestId,
      message: error.message,
      url: req.url,
      method: req.method,
    });
  }
  // Handle network connection errors
  else if (
    error.message.includes("ECONNREFUSED") ||
    error.message.includes("ENOTFOUND") ||
    error.message.includes("network")
  ) {
    statusCode = HttpStatus.BAD_GATEWAY;
    errorCode = ErrorCode.NETWORK_ERROR;
    message = "Network error occurred";
    details = config.development.debug
      ? error.message
      : "Unable to connect to external service";

    logger.error("Network error", {
      requestId,
      message: error.message,
      url: req.url,
      method: req.method,
    });
  }
  // Handle all other errors
  else {
    logger.logError(error, requestId, {
      url: req.url,
      method: req.method,
      body: req.body,
      query: req.query,
    });
  }

  // Create error response
  const errorResponse: ErrorResponse = {
    code: errorCode,
    message,
    ...(details && { details }),
    ...(config.development.debug && error.stack && { stack: error.stack }),
  };

  const response: ApiResponse = {
    success: false,
    error: errorResponse,
    timestamp: new Date().toISOString(),
    requestId,
  };

  // Add additional headers for debugging
  if (config.development.debug) {
    res.setHeader("X-Error-Type", error.constructor.name);
    res.setHeader("X-Error-Code", errorCode);
  }

  const duration = Date.now() - startTime;
  logger.info("Error response sent", {
    requestId,
    statusCode,
    errorCode,
    duration: `${duration}ms`,
  });

  res.status(statusCode).json(response);
}

// Async error wrapper for route handlers
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// 404 handler
export function notFoundHandler(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const error = new NotFoundError(
    `Route ${req.method} ${req.originalUrl} not found`,
    `The requested endpoint does not exist`,
  );
  next(error);
}

// Unhandled rejection handler
export function handleUnhandledRejection(): void {
  process.on("unhandledRejection", (reason: unknown, promise: Promise<any>) => {
    logger.error("Unhandled promise rejection", {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
      promise: promise.toString(),
    });

    // Gracefully close the server
    process.exit(1);
  });
}

// Uncaught exception handler
export function handleUncaughtException(): void {
  process.on("uncaughtException", (error: Error) => {
    logger.error("Uncaught exception", {
      error: error.message,
      stack: error.stack,
    });

    // Gracefully close the server
    process.exit(1);
  });
}

// Rate limiting error handler
export function rateLimitHandler(req: Request, res: Response): void {
  const requestId = req.headers["x-request-id"] as string;

  const errorResponse: ErrorResponse = {
    code: ErrorCode.RATE_LIMIT_EXCEEDED,
    message: "Too many requests, please try again later",
    details: "Rate limit exceeded. Please wait before making more requests.",
  };

  const response: ApiResponse = {
    success: false,
    error: errorResponse,
    timestamp: new Date().toISOString(),
    requestId,
  };

  logger.warn("Rate limit exceeded", {
    requestId,
    ip: req.ip,
    url: req.url,
    method: req.method,
  });

  res.status(HttpStatus.TOO_MANY_REQUESTS).json(response);
}

// Error logging helper
export function logErrorDetails(
  error: Error,
  context?: Record<string, any>,
): void {
  logger.error("Detailed error information", {
    name: error.name,
    message: error.message,
    stack: config.development.debug ? error.stack : undefined,
    context,
    timestamp: new Date().toISOString(),
  });
}

// Error response helper
export function createErrorResponse(
  error: AppError | Error,
  requestId?: string,
): ApiResponse {
  let errorCode: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR;
  let message = "An internal server error occurred";
  let details: string | undefined;

  if (error instanceof AppError) {
    errorCode = error.code as ErrorCode;
    message = error.message;
    details = error.details;
  }

  const errorResponse: ErrorResponse = {
    code: errorCode,
    message,
    ...(details && { details }),
    ...(config.development.debug && error.stack && { stack: error.stack }),
  };

  return {
    success: false,
    error: errorResponse,
    timestamp: new Date().toISOString(),
    ...(requestId && { requestId }),
  };
}

export default {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  handleUnhandledRejection,
  handleUncaughtException,
  rateLimitHandler,
  logErrorDetails,
  createErrorResponse,
  AppError,
  ValidationError,
  NotFoundError,
  NetworkError,
  TimeoutError,
  ServiceUnavailableError,
  RateLimitError,
  UnauthorizedError,
  ForbiddenError,
};

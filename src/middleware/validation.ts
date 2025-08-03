import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import {
  ApiResponse,
  ErrorResponse,
  HttpStatus,
  ErrorCode,
} from "../types/responses";
import { logger } from "../utils/logger";

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export class RequestValidationError extends Error {
  public code: string;
  public validationErrors: ValidationError[];

  constructor(message: string, validationErrors: ValidationError[]) {
    super(message);
    this.name = "RequestValidationError";
    this.code = ErrorCode.MISSING_REQUIRED_FIELD;
    this.validationErrors = validationErrors;
  }
}

// Joi schemas for validation
export const schemas = {
  // CKBFS URI validation - supports multiple formats
  ckbfsUri: Joi.alternatives()
    .try(
      // CKBFS OutPoint URI: ckbfs://{tx_hash}i{output_index}
      Joi.string()
        .pattern(/^ckbfs:\/\/[a-fA-F0-9]{64}i\d+$/)
        .message(
          "Invalid CKBFS OutPoint URI format. Expected: ckbfs://{tx_hash}i{output_index}",
        ),
      // CKBFS TypeID URI: ckbfs://{CKBFS_ID}
      Joi.string()
        .pattern(/^ckbfs:\/\/[a-fA-F0-9]{64}$/)
        .message(
          "Invalid CKBFS TypeID URI format. Expected: ckbfs://{type_id}",
        ),
      // TypeID hex: 0x{CKBFS_ID}
      Joi.string()
        .pattern(/^(0x)?[a-fA-F0-9]{64}$/)
        .message(
          "Invalid TypeID hex format. Expected: 0x{type_id} or {type_id}",
        ),
    )
    .required()
    .messages({
      "alternatives.match":
        "URI must be a valid CKBFS URI format (ckbfs://{tx_hash}i{index}, ckbfs://{type_id}, 0x{type_id}, or {type_id})",
      "any.required": "URI parameter is required",
    }),

  // Network validation
  network: Joi.string()
    .valid("mainnet", "testnet")
    .default("testnet")
    .messages({
      "any.only": 'Network must be either "mainnet" or "testnet"',
    }),

  // Response format validation
  format: Joi.string().valid("json", "raw").default("json").messages({
    "any.only": 'Format must be either "json" or "raw"',
  }),

  // Boolean flags
  includeContent: Joi.boolean().default(true).messages({
    "boolean.base": "includeContent must be a boolean value",
  }),

  includeMetadata: Joi.boolean().default(true).messages({
    "boolean.base": "includeMetadata must be a boolean value",
  }),

  // Batch request validation
  uris: Joi.array()
    .items(
      Joi.alternatives().try(
        Joi.string().pattern(/^ckbfs:\/\/[a-fA-F0-9]{64}i\d+$/),
        Joi.string().pattern(/^ckbfs:\/\/[a-fA-F0-9]{64}$/),
        Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/),
        Joi.string().pattern(/^[a-fA-F0-9]{64}$/),
      ),
    )
    .min(1)
    .max(10)
    .required()
    .messages({
      "array.min": "At least one URI is required",
      "array.max": "Maximum 10 URIs allowed per batch request",
      "any.required": "URIs array is required",
    }),

  // Pagination
  page: Joi.number().integer().min(1).default(1).messages({
    "number.base": "Page must be a number",
    "number.integer": "Page must be an integer",
    "number.min": "Page must be at least 1",
  }),

  limit: Joi.number().integer().min(1).max(100).default(20).messages({
    "number.base": "Limit must be a number",
    "number.integer": "Limit must be an integer",
    "number.min": "Limit must be at least 1",
    "number.max": "Limit cannot exceed 100",
  }),
};

// Validation middleware factory
export function validateQuery(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const validationErrors: ValidationError[] = error.details.map(
        (detail) => ({
          field: detail.path.join("."),
          message: detail.message,
          value: detail.context?.value,
        }),
      );

      const requestId = req.headers["x-request-id"] as string;

      logger.warn("Query validation failed", {
        requestId,
        url: req.url,
        query: req.query,
        errors: validationErrors,
      });

      const errorResponse: ErrorResponse = {
        code: ErrorCode.MISSING_REQUIRED_FIELD,
        message: "Query parameter validation failed",
        details: validationErrors
          .map((err) => `${err.field}: ${err.message}`)
          .join("; "),
      };

      const response: ApiResponse = {
        success: false,
        error: errorResponse,
        timestamp: new Date().toISOString(),
        requestId,
      };

      res.status(HttpStatus.BAD_REQUEST).json(response);
      return;
    }

    // Replace req.query with validated and transformed values
    req.query = value;
    next();
  };
}

export function validateBody(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const validationErrors: ValidationError[] = error.details.map(
        (detail) => ({
          field: detail.path.join("."),
          message: detail.message,
          value: detail.context?.value,
        }),
      );

      const requestId = req.headers["x-request-id"] as string;

      logger.warn("Body validation failed", {
        requestId,
        url: req.url,
        body: req.body,
        errors: validationErrors,
      });

      const errorResponse: ErrorResponse = {
        code: ErrorCode.MISSING_REQUIRED_FIELD,
        message: "Request body validation failed",
        details: validationErrors
          .map((err) => `${err.field}: ${err.message}`)
          .join("; "),
      };

      const response: ApiResponse = {
        success: false,
        error: errorResponse,
        timestamp: new Date().toISOString(),
        requestId,
      };

      res.status(HttpStatus.BAD_REQUEST).json(response);
      return;
    }

    // Replace req.body with validated and transformed values
    req.body = value;
    next();
  };
}

export function validateParams(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const validationErrors: ValidationError[] = error.details.map(
        (detail) => ({
          field: detail.path.join("."),
          message: detail.message,
          value: detail.context?.value,
        }),
      );

      const requestId = req.headers["x-request-id"] as string;

      logger.warn("Params validation failed", {
        requestId,
        url: req.url,
        params: req.params,
        errors: validationErrors,
      });

      const errorResponse: ErrorResponse = {
        code: ErrorCode.MISSING_REQUIRED_FIELD,
        message: "URL parameter validation failed",
        details: validationErrors
          .map((err) => `${err.field}: ${err.message}`)
          .join("; "),
      };

      const response: ApiResponse = {
        success: false,
        error: errorResponse,
        timestamp: new Date().toISOString(),
        requestId,
      };

      res.status(HttpStatus.BAD_REQUEST).json(response);
      return;
    }

    // Replace req.params with validated and transformed values
    req.params = value;
    next();
  };
}

// Predefined validation schemas for common endpoints
export const validationSchemas = {
  // GET /api/v1/ckbfs?uri=...&network=...&format=...
  getCKBFSFile: Joi.object({
    uri: schemas.ckbfsUri,
    network: schemas.network,
    format: schemas.format,
    includeContent: schemas.includeContent,
    includeMetadata: schemas.includeMetadata,
  }),

  // GET /api/v1/ckbfs/metadata?uri=...&network=...
  getCKBFSMetadata: Joi.object({
    uri: schemas.ckbfsUri,
    network: schemas.network,
  }),

  // POST /api/v1/ckbfs/batch
  batchCKBFSRequest: Joi.object({
    uris: schemas.uris,
    network: schemas.network,
    format: schemas.format,
    includeContent: schemas.includeContent,
    includeMetadata: schemas.includeMetadata,
  }),

  // GET /api/v1/ckbfs/validate?uri=...&network=...
  validateCKBFSURI: Joi.object({
    uri: schemas.ckbfsUri,
    network: schemas.network,
  }),

  // Pagination schema
  pagination: Joi.object({
    page: schemas.page,
    limit: schemas.limit,
  }),
};

// Middleware for specific endpoints
export const validateCKBFSQuery = validateQuery(validationSchemas.getCKBFSFile);
export const validateCKBFSMetadataQuery = validateQuery(
  validationSchemas.getCKBFSMetadata,
);
export const validateBatchBody = validateBody(
  validationSchemas.batchCKBFSRequest,
);
export const validateURIQuery = validateQuery(
  validationSchemas.validateCKBFSURI,
);
export const validatePaginationQuery = validateQuery(
  validationSchemas.pagination,
);

// Custom validation helpers
export const isValidCKBFSURI = (uri: string): boolean => {
  const { error } = schemas.ckbfsUri.validate(uri);
  return !error;
};

export const isValidNetwork = (network: string): boolean => {
  const { error } = schemas.network.validate(network);
  return !error;
};

export const isValidFormat = (format: string): boolean => {
  const { error } = schemas.format.validate(format);
  return !error;
};

// Rate limiting validation (for future use)
export const rateLimitSchema = Joi.object({
  windowMs: Joi.number().integer().min(1000).default(900000), // 15 minutes
  maxRequests: Joi.number().integer().min(1).default(100),
});

export default {
  schemas,
  validateQuery,
  validateBody,
  validateParams,
  validationSchemas,
  validateCKBFSQuery,
  validateCKBFSMetadataQuery,
  validateBatchBody,
  validateURIQuery,
  validatePaginationQuery,
  isValidCKBFSURI,
  isValidNetwork,
  isValidFormat,
  RequestValidationError,
};

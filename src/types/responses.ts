export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ErrorResponse;
  timestamp: string;
  requestId?: string;
}

export interface ErrorResponse {
  code: string;
  message: string;
  details?: string;
  stack?: string;
}

export interface FileResponse {
  uri: string;
  filename: string;
  contentType: string;
  size: number;
  content?: string; // UTF-8 string for text files, base64 for binary files
  parsedId: ParsedIdentifier;
  checksum?: number;
  backLinks?: BackLink[];
  metadata?: FileMetadata;
}

export interface CompatibleFileResponse {
  content_type: string;
  content: string; // hex encoded
  filename: string;
}

export interface FileMetadata {
  created?: string;
  modified?: string;
  version?: string;
  protocol?: string;
  network?: string;
}

export interface ParsedIdentifier {
  type: "typeId" | "outPoint";
  txHash?: string;
  index?: number;
  typeId?: string;
  raw: string;
}

export interface BackLink {
  txHash: string;
  index: number;
}

export interface HealthResponse {
  status: "healthy" | "unhealthy";
  uptime: number;
  timestamp: string;
  version: string;
  network: string;
  services: ServiceStatus[];
}

export interface ServiceStatus {
  name: string;
  status: "up" | "down" | "degraded";
  responseTime?: number;
  lastCheck: string;
  details?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Request types
export interface CKBFSRequest {
  uri: string;
  network?: "mainnet" | "testnet";
  format?: "json" | "raw";
  includeContent?: boolean;
  includeMetadata?: boolean;
}

export interface CKBFSBatchRequest {
  uris: string[];
  network?: "mainnet" | "testnet";
  format?: "json" | "raw";
  includeContent?: boolean;
  includeMetadata?: boolean;
}

// Error codes enum
export enum ErrorCode {
  // Validation errors
  INVALID_URI = "INVALID_URI",
  INVALID_NETWORK = "INVALID_NETWORK",
  INVALID_FORMAT = "INVALID_FORMAT",
  MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",

  // CKBFS errors
  FILE_NOT_FOUND = "FILE_NOT_FOUND",
  CKBFS_DECODE_ERROR = "CKBFS_DECODE_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  BLOCKCHAIN_ERROR = "BLOCKCHAIN_ERROR",

  // Server errors
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",

  // Rate limiting
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",

  // Authentication/Authorization
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
}

// Network types
export type NetworkType = "mainnet" | "testnet";

// Response format types
export type ResponseFormat = "json" | "raw";

// HTTP status codes
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
}

import { Request, Response, NextFunction } from "express";
import { CKBFSService, CKBFSError } from "../services/CKBFSService";
import { logger } from "../utils/logger";
import { config } from "../utils/config";
import {
  ApiResponse,
  ErrorResponse,
  FileResponse,
  HttpStatus,
  ErrorCode,
  NetworkType,
  ResponseFormat,
} from "../types/responses";

export interface CKBFSQuery {
  uri: string;
  network?: NetworkType;
  format?: ResponseFormat;
  includeContent?: boolean;
  includeMetadata?: boolean;
}

export interface CKBFSBatchBody {
  uris: string[];
  network?: NetworkType;
  format?: ResponseFormat;
  includeContent?: boolean;
  includeMetadata?: boolean;
}

export class CKBFSController {
  private ckbfsService: CKBFSService;

  constructor() {
    this.ckbfsService = new CKBFSService({
      defaultNetwork: config.ckb.network,
      ...(config.ckb.mainnetUrl && { mainnetUrl: config.ckb.mainnetUrl }),
      ...(config.ckb.testnetUrl && { testnetUrl: config.ckb.testnetUrl }),
    });

    // Bind methods to preserve 'this' context
    this.getFileByURI = this.getFileByURI.bind(this);
    this.getFileMetadata = this.getFileMetadata.bind(this);
    this.validateURI = this.validateURI.bind(this);
    this.batchGetFiles = this.batchGetFiles.bind(this);
    this.getServiceHealth = this.getServiceHealth.bind(this);
    this.parseURI = this.parseURI.bind(this);
    this.getFileCompatible = this.getFileCompatible.bind(this);
  }

  /**
   * GET /api/v1/ckbfs?uri=...&network=...&format=...
   * Main endpoint for retrieving CKBFS files
   */
  public async getFileByURI(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const requestId = req.headers["x-request-id"] as string;
    const startTime = Date.now();

    try {
      const query = req.query as unknown as CKBFSQuery;
      const {
        uri,
        network,
        format,
        includeContent = true,
        includeMetadata = true,
      } = query;

      logger.info("Processing CKBFS file request", {
        requestId,
        uri,
        network,
        format,
        includeContent,
        includeMetadata,
      });

      // Handle raw format response
      if (format === "raw") {
        const rawFile = await this.ckbfsService.getRawFileContent(uri, network);

        // Set appropriate headers for raw content
        res.setHeader("Content-Type", rawFile.contentType);
        res.setHeader("Content-Length", rawFile.size.toString());
        res.setHeader(
          "Content-Disposition",
          `inline; filename="${rawFile.filename}"`,
        );
        res.setHeader("X-CKBFS-URI", uri);
        res.setHeader("X-CKBFS-Network", network || "testnet");
        res.setHeader("X-CKBFS-Filename", rawFile.filename);
        res.setHeader("X-CKBFS-Size", rawFile.size.toString());

        const duration = Date.now() - startTime;
        logger.info("Raw file response sent", {
          requestId,
          uri,
          filename: rawFile.filename,
          size: rawFile.size,
          duration: `${duration}ms`,
        });

        res.status(HttpStatus.OK).send(Buffer.from(rawFile.content));
        return;
      }

      // Handle JSON format response
      const fileData = await this.ckbfsService.getFileContent(
        uri,
        network,
        includeContent,
      );

      // Remove content if not requested
      if (!includeContent) {
        delete fileData.content;
      }

      // Remove metadata if not requested
      if (!includeMetadata) {
        delete fileData.metadata;
        delete fileData.backLinks;
        delete fileData.checksum;
      }

      const response: ApiResponse<FileResponse> = {
        success: true,
        data: fileData,
        timestamp: new Date().toISOString(),
        requestId,
      };

      const duration = Date.now() - startTime;
      logger.info("CKBFS file request completed", {
        requestId,
        uri,
        filename: fileData.filename,
        size: fileData.size,
        duration: `${duration}ms`,
      });

      res.status(HttpStatus.OK).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/ckbfs/metadata?uri=...&network=...
   * Get file metadata without content
   */
  public async getFileMetadata(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const requestId = req.headers["x-request-id"] as string;
    const startTime = Date.now();

    try {
      const { uri, network } = req.query as {
        uri: string;
        network?: NetworkType;
      };

      logger.info("Processing CKBFS metadata request", {
        requestId,
        uri,
        network,
      });

      const metadata = await this.ckbfsService.getFileMetadata(uri, network);

      const response: ApiResponse<Omit<FileResponse, "content">> = {
        success: true,
        data: metadata,
        timestamp: new Date().toISOString(),
        requestId,
      };

      const duration = Date.now() - startTime;
      logger.info("CKBFS metadata request completed", {
        requestId,
        uri,
        filename: metadata.filename,
        size: metadata.size,
        duration: `${duration}ms`,
      });

      res.status(HttpStatus.OK).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/ckbfs/validate?uri=...&network=...
   * Validate CKBFS URI without retrieving content
   */
  public async validateURI(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const requestId = req.headers["x-request-id"] as string;
    const startTime = Date.now();

    try {
      const { uri, network } = req.query as {
        uri: string;
        network?: NetworkType;
      };

      logger.info("Processing CKBFS URI validation", {
        requestId,
        uri,
        network,
      });

      const isValid = await this.ckbfsService.validateURI(uri, network);
      let parsedId;

      try {
        parsedId = this.ckbfsService.parseURI(uri);
      } catch (parseError) {
        // URI format is invalid
      }

      const validationResult = {
        uri,
        valid: isValid,
        network: network || "testnet",
        ...(parsedId && { parsedId }),
        checkedAt: new Date().toISOString(),
      };

      const response: ApiResponse = {
        success: true,
        data: validationResult,
        timestamp: new Date().toISOString(),
        requestId,
      };

      const duration = Date.now() - startTime;
      logger.info("CKBFS URI validation completed", {
        requestId,
        uri,
        valid: isValid,
        duration: `${duration}ms`,
      });

      res.status(HttpStatus.OK).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/ckbfs/batch
   * Batch retrieve multiple CKBFS files
   */
  public async batchGetFiles(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const requestId = req.headers["x-request-id"] as string;
    const startTime = Date.now();

    try {
      const body = req.body as CKBFSBatchBody;
      const {
        uris,
        network,
        format,
        includeContent = true,
        includeMetadata = true,
      } = body;

      logger.info("Processing CKBFS batch request", {
        requestId,
        uriCount: uris.length,
        network,
        format,
        includeContent,
        includeMetadata,
      });

      // For raw format, we can't return multiple files in one response
      if (format === "raw") {
        const errorResponse: ErrorResponse = {
          code: ErrorCode.INVALID_FORMAT,
          message: "Raw format is not supported for batch requests",
          details:
            "Use JSON format for batch requests or make individual requests for raw format",
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

      const results = await this.ckbfsService.getMultipleFiles(
        uris,
        network,
        includeContent,
      );

      // Process results to remove unwanted fields
      const processedResults = results.map((result) => {
        if ("error" in result) {
          return result; // Error result, return as-is
        }

        const fileResult = { ...result };

        // Remove content if not requested
        if (!includeContent) {
          delete fileResult.content;
        }

        // Remove metadata if not requested
        if (!includeMetadata) {
          delete fileResult.metadata;
          delete fileResult.backLinks;
          delete fileResult.checksum;
        }

        return fileResult;
      });

      const successCount = processedResults.filter(
        (r) => !("error" in r),
      ).length;
      const errorCount = processedResults.length - successCount;

      const batchResult = {
        total: uris.length,
        successful: successCount,
        failed: errorCount,
        results: processedResults,
        processedAt: new Date().toISOString(),
      };

      const response: ApiResponse = {
        success: true,
        data: batchResult,
        timestamp: new Date().toISOString(),
        requestId,
      };

      const duration = Date.now() - startTime;
      logger.info("CKBFS batch request completed", {
        requestId,
        total: uris.length,
        successful: successCount,
        failed: errorCount,
        duration: `${duration}ms`,
      });

      res.status(HttpStatus.OK).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/ckbfs/parse?uri=...
   * Parse CKBFS URI and return structure information
   */
  public async parseURI(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const requestId = req.headers["x-request-id"] as string;

    try {
      const { uri } = req.query as { uri: string };

      logger.info("Processing CKBFS URI parse request", {
        requestId,
        uri,
      });

      const parsedId = this.ckbfsService.parseURI(uri);

      const parseResult = {
        uri,
        parsed: parsedId,
        valid: true,
        parsedAt: new Date().toISOString(),
      };

      const response: ApiResponse = {
        success: true,
        data: parseResult,
        timestamp: new Date().toISOString(),
        requestId,
      };

      logger.info("CKBFS URI parse completed", {
        requestId,
        uri,
        type: parsedId.type,
      });

      res.status(HttpStatus.OK).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/ckbfs/health
   * Get CKBFS service health status
   */
  public async getServiceHealth(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const requestId = req.headers["x-request-id"] as string;

    try {
      logger.info("Processing CKBFS health check", { requestId });

      const healthStatus = await this.ckbfsService.getHealthStatus();

      const response: ApiResponse = {
        success: true,
        data: healthStatus,
        timestamp: new Date().toISOString(),
        requestId,
      };

      const statusCode =
        healthStatus.status === "healthy"
          ? HttpStatus.OK
          : HttpStatus.SERVICE_UNAVAILABLE;

      logger.info("CKBFS health check completed", {
        requestId,
        status: healthStatus.status,
        networks: healthStatus.networks,
      });

      res.status(statusCode).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Error handler for CKBFS-specific errors
   */
  public static handleCKBFSError(
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const requestId = req.headers["x-request-id"] as string;

    if (error instanceof CKBFSError) {
      let statusCode: number;

      switch (error.code) {
        case ErrorCode.INVALID_URI:
        case ErrorCode.INVALID_NETWORK:
        case ErrorCode.INVALID_FORMAT:
          statusCode = HttpStatus.BAD_REQUEST;
          break;
        case ErrorCode.FILE_NOT_FOUND:
          statusCode = HttpStatus.NOT_FOUND;
          break;
        case ErrorCode.NETWORK_ERROR:
        case ErrorCode.TIMEOUT_ERROR:
          statusCode = HttpStatus.BAD_GATEWAY;
          break;
        case ErrorCode.SERVICE_UNAVAILABLE:
          statusCode = HttpStatus.SERVICE_UNAVAILABLE;
          break;
        default:
          statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      }

      const errorResponse: ErrorResponse = {
        code: error.code,
        message: error.message,
        ...(error.details && { details: error.details }),
      };

      const response: ApiResponse = {
        success: false,
        error: errorResponse,
        timestamp: new Date().toISOString(),
        requestId,
      };

      logger.error("CKBFS operation failed", {
        requestId,
        code: error.code,
        message: error.message,
        details: error.details,
      });

      res.status(statusCode).json(response);
      return;
    }

    // Pass to next error handler if not a CKBFS error
    next(error);
  }
  /**
   * GET /api/v1/ckbfs/compatible?uri=...&network=...
   * Compatible endpoint that returns content as hex string
   */
  public async getFileCompatible(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const requestId = req.headers["x-request-id"] as string;
    const startTime = Date.now();

    try {
      const { uri, network } = req.query as {
        uri: string;
        network?: NetworkType;
      };

      logger.info("Processing CKBFS compatible request", {
        requestId,
        uri,
        network,
      });

      // Get raw file content
      const rawFile = await this.ckbfsService.getRawFileContent(uri, network);

      // Convert content to hex string
      const contentHex = Buffer.from(rawFile.content).toString("hex");

      // Return in compatible format
      const compatibleResponse = {
        content_type: rawFile.contentType,
        content: contentHex,
        filename: rawFile.filename,
      };

      const duration = Date.now() - startTime;
      logger.info("CKBFS compatible request completed", {
        requestId,
        uri,
        filename: rawFile.filename,
        size: rawFile.size,
        duration: `${duration}ms`,
      });

      res.status(HttpStatus.OK).json(compatibleResponse);
    } catch (error) {
      next(error);
    }
  }
}

export default CKBFSController;

import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { config, validateConfig } from "./utils/config";
import { logger } from "./utils/logger";
import { ErrorResponse, ApiResponse, HttpStatus } from "./types/responses";
import routes from "./routes";

export class Server {
  private app: Application;
  private server: any;

  constructor() {
    this.app = express();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Security middleware
    if (config.security.helmetEnabled) {
      this.app.use(
        helmet({
          contentSecurityPolicy: {
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              scriptSrc: ["'self'"],
              imgSrc: ["'self'", "data:", "https:"],
            },
          },
          crossOriginEmbedderPolicy: false,
        }),
      );
    }

    // CORS configuration
    this.app.use(
      cors({
        origin:
          config.cors.origin === "*" ? true : config.cors.origin.split(","),
        methods: config.cors.methods.split(","),
        allowedHeaders: config.cors.headers.split(","),
        credentials: false,
      }),
    );

    // Request parsing middleware
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // HTTP request logging
    this.app.use(logger.getHttpLogger());

    // Request ID middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const requestId = this.generateRequestId();
      req.headers["x-request-id"] = requestId;
      res.setHeader("X-Request-ID", requestId);

      const startTime = Date.now();

      // Log incoming request
      logger.logRequest(requestId, req.method, req.url, req.ip || "unknown");

      // Log response when finished
      res.on("finish", () => {
        const responseTime = Date.now() - startTime;
        logger.logResponse(requestId, res.statusCode, responseTime);
      });

      next();
    });

    // Trust proxy for accurate IP addresses
    this.app.set("trust proxy", true);
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get("/health", (req: Request, res: Response) => {
      const healthResponse = {
        status: "healthy",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        version: process.env["npm_package_version"] || "1.0.0",
        network: config.ckb.network,
        services: [
          {
            name: "ckbfs-api",
            status: "up",
            lastCheck: new Date().toISOString(),
          },
        ],
      };

      const response: ApiResponse = {
        success: true,
        data: healthResponse,
        timestamp: new Date().toISOString(),
        requestId: req.headers["x-request-id"] as string,
      };

      res.status(HttpStatus.OK).json(response);
    });

    // API info endpoint
    this.app.get(
      `${config.server.apiPrefix}/${config.server.apiVersion}/info`,
      (req: Request, res: Response) => {
        const infoResponse = {
          name: "CKBFS Server",
          version: process.env["npm_package_version"] || "1.0.0",
          description:
            "RESTful server for CKBFS URI decoding and file retrieval",
          network: config.ckb.network,
          apiVersion: config.server.apiVersion,
          endpoints: {
            health: "/health",
            ckbfs: `${config.server.apiPrefix}/${config.server.apiVersion}/ckbfs`,
            info: `${config.server.apiPrefix}/${config.server.apiVersion}/info`,
          },
          supportedFormats: ["json", "raw"],
          supportedNetworks: ["mainnet", "testnet"],
          uriFormats: [
            "ckbfs://{tx_hash}i{output_index}",
            "ckbfs://{CKBFS_ID}",
            "0x{CKBFS_ID}",
          ],
        };

        const response: ApiResponse = {
          success: true,
          data: infoResponse,
          timestamp: new Date().toISOString(),
          requestId: req.headers["x-request-id"] as string,
        };

        res.status(HttpStatus.OK).json(response);
      },
    );

    // Root endpoint
    this.app.get("/", (_req: Request, res: Response) => {
      res.redirect(
        `${config.server.apiPrefix}/${config.server.apiVersion}/info`,
      );
    });

    // Mount API routes
    this.app.use(
      `${config.server.apiPrefix}/${config.server.apiVersion}`,
      routes,
    );
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use("*", (req: Request, res: Response) => {
      const errorResponse: ErrorResponse = {
        code: "NOT_FOUND",
        message: `Route ${req.method} ${req.originalUrl} not found`,
      };

      const response: ApiResponse = {
        success: false,
        error: errorResponse,
        timestamp: new Date().toISOString(),
        requestId: req.headers["x-request-id"] as string,
      };

      res.status(HttpStatus.NOT_FOUND).json(response);
    });

    // Global error handler
    this.app.use(
      (error: Error, req: Request, res: Response, _next: NextFunction) => {
        const requestId = req.headers["x-request-id"] as string;

        // Log the error
        logger.logError(error, requestId, {
          method: req.method,
          url: req.url,
          body: req.body,
          query: req.query,
        });

        // Determine error response
        let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        let errorCode = "INTERNAL_SERVER_ERROR";
        let message = "An internal server error occurred";

        // Handle specific error types
        if (error.name === "ValidationError") {
          statusCode = HttpStatus.BAD_REQUEST;
          errorCode = "VALIDATION_ERROR";
          message = error.message;
        } else if (error.name === "SyntaxError" && "body" in error) {
          statusCode = HttpStatus.BAD_REQUEST;
          errorCode = "INVALID_JSON";
          message = "Invalid JSON in request body";
        }

        const errorResponse: ErrorResponse = {
          code: errorCode,
          message,
          ...(config.development.debug && { stack: error.stack }),
        };

        const response: ApiResponse = {
          success: false,
          error: errorResponse,
          timestamp: new Date().toISOString(),
          requestId,
        };

        res.status(statusCode).json(response);
      },
    );
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Validate configuration before starting
        validateConfig();

        this.server = this.app.listen(config.server.port, () => {
          logger.logStartup(
            config.server.port,
            config.ckb.network,
            config.server.nodeEnv,
          );
          resolve();
        });

        // Handle server errors
        this.server.on("error", (error: Error) => {
          logger.error("Server error", { error: error.message });
          reject(error);
        });

        // Graceful shutdown handlers
        process.on("SIGTERM", () => this.gracefulShutdown("SIGTERM"));
        process.on("SIGINT", () => this.gracefulShutdown("SIGINT"));
      } catch (error) {
        logger.error("Failed to start server", {
          error: (error as Error).message,
        });
        reject(error);
      }
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          logger.info("Server stopped");
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  private gracefulShutdown(signal: string): void {
    logger.logShutdown(signal);

    this.stop()
      .then(() => {
        process.exit(0);
      })
      .catch((error) => {
        logger.error("Error during graceful shutdown", {
          error: error.message,
        });
        process.exit(1);
      });
  }

  public getApp(): Application {
    return this.app;
  }
}

export default Server;

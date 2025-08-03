import {
  getFileContentFromChainByIdentifier,
  parseIdentifier,
  IdentifierType,
} from "@ckbfs/api";
import { ClientPublicMainnet, ClientPublicTestnet } from "@ckb-ccc/core";
import Joi from "joi";
import { logger } from "../utils/logger";
import {
  FileResponse,
  ParsedIdentifier,
  NetworkType,
  ErrorCode,
} from "../types/responses";
import { convertContentToString } from "../utils/contentType";

export interface CKBFSServiceOptions {
  defaultNetwork?: NetworkType;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  mainnetUrl?: string;
  testnetUrl?: string;
}

export interface FileContentResult {
  filename: string;
  contentType: string;
  size: number;
  content: Uint8Array;
  parsedId: any;
  checksum?: number;
  backLinks?: any[];
}

export class CKBFSError extends Error {
  public code: string;
  public details?: string;

  constructor(code: string, message: string, details?: string) {
    super(message);
    this.name = "CKBFSError";
    this.code = code;
    if (details) {
      this.details = details;
    }
  }
}

export class CKBFSService {
  private mainnetClient: ClientPublicMainnet;
  private testnetClient: ClientPublicTestnet;
  private options: CKBFSServiceOptions & {
    defaultNetwork: NetworkType;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  };

  // URI validation schemas
  private readonly uriSchema = Joi.alternatives().try(
    // CKBFS OutPoint URI: ckbfs://{tx_hash}i{output_index}
    Joi.string().pattern(/^ckbfs:\/\/[a-fA-F0-9]{64}i\d+$/),
    // CKBFS TypeID URI: ckbfs://{CKBFS_ID}
    Joi.string().pattern(/^ckbfs:\/\/[a-fA-F0-9]{64}$/),
    // TypeID hex: 0x{CKBFS_ID}
    Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/),
    // TypeID without prefix: {CKBFS_ID}
    Joi.string().pattern(/^[a-fA-F0-9]{64}$/),
  );

  private readonly networkSchema = Joi.string().valid("mainnet", "testnet");

  constructor(options: CKBFSServiceOptions = {}) {
    this.options = {
      defaultNetwork: options.defaultNetwork || "testnet",
      timeout: options.timeout || 30000,
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 1000,
      ...(options.mainnetUrl && { mainnetUrl: options.mainnetUrl }),
      ...(options.testnetUrl && { testnetUrl: options.testnetUrl }),
    };

    // Initialize CKB clients with optional custom URLs
    this.mainnetClient = new ClientPublicMainnet(
      this.options.mainnetUrl ? { url: this.options.mainnetUrl } : undefined,
    );
    this.testnetClient = new ClientPublicTestnet(
      this.options.testnetUrl ? { url: this.options.testnetUrl } : undefined,
    );

    logger.info("CKBFSService initialized", {
      defaultNetwork: this.options.defaultNetwork,
      timeout: this.options.timeout,
      retryAttempts: this.options.retryAttempts,
      mainnetUrl: this.options.mainnetUrl || "default",
      testnetUrl: this.options.testnetUrl || "default",
    });
  }

  /**
   * Parse and validate a CKBFS URI
   */
  public parseURI(uri: string): ParsedIdentifier {
    const startTime = Date.now();

    try {
      // Validate URI format
      const { error } = this.uriSchema.validate(uri);
      if (error) {
        throw new CKBFSError(
          ErrorCode.INVALID_URI,
          `Invalid CKBFS URI format: ${uri}`,
          error.details[0]?.message,
        );
      }

      // Use the SDK's parseIdentifier function
      const parsed = parseIdentifier(uri);

      const result: ParsedIdentifier = {
        type: parsed.type as "typeId" | "outPoint",
        raw: uri,
      };

      if (parsed.type === IdentifierType.OutPoint) {
        if (parsed.txHash) {
          result.txHash = parsed.txHash;
        }
        if (parsed.index !== undefined) {
          result.index = parsed.index;
        }
      } else if (parsed.type === IdentifierType.TypeID) {
        if (parsed.typeId) {
          result.typeId = parsed.typeId;
        }
      }

      const duration = Date.now() - startTime;
      logger.debug("URI parsed successfully", {
        uri,
        type: result.type,
        duration: `${duration}ms`,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error("Failed to parse URI", {
        uri,
        error: (error as Error).message,
        duration: `${duration}ms`,
      });

      if (error instanceof CKBFSError) {
        throw error;
      }

      throw new CKBFSError(
        ErrorCode.INVALID_URI,
        `Failed to parse URI: ${uri}`,
        (error as Error).message,
      );
    }
  }

  /**
   * Validate network parameter
   */
  public validateNetwork(network?: string): NetworkType {
    const networkToValidate = network || this.options.defaultNetwork;
    const { error } = this.networkSchema.validate(networkToValidate);

    if (error) {
      throw new CKBFSError(
        ErrorCode.INVALID_NETWORK,
        `Invalid network: ${networkToValidate}. Must be 'mainnet' or 'testnet'`,
        error.details[0]?.message,
      );
    }

    return networkToValidate as NetworkType;
  }

  /**
   * Get the appropriate CKB client for the network
   */
  private getClient(
    network: NetworkType,
  ): ClientPublicMainnet | ClientPublicTestnet {
    return network === "mainnet" ? this.mainnetClient : this.testnetClient;
  }

  /**
   * Retry mechanism for network operations
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    context: string,
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.options.retryAttempts; attempt++) {
      try {
        return await Promise.race([
          operation(),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("Operation timeout")),
              this.options.timeout,
            ),
          ),
        ]);
      } catch (error) {
        lastError = error as Error;

        logger.warn(
          `${context} failed (attempt ${attempt}/${this.options.retryAttempts})`,
          {
            error: lastError.message,
            attempt,
          },
        );

        if (attempt < this.options.retryAttempts) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.options.retryDelay * attempt),
          );
        }
      }
    }

    throw lastError!;
  }

  /**
   * Get file content from CKBFS URI
   */
  public async getFileContent(
    uri: string,
    network?: NetworkType,
    includeContent: boolean = true,
  ): Promise<FileResponse> {
    const startTime = Date.now();
    const validatedNetwork = this.validateNetwork(network);

    logger.logCKBFSOperation("retrieve", uri, validatedNetwork, false);

    try {
      // Parse and validate URI
      const parsedId = this.parseURI(uri);

      // Get appropriate client
      const client = this.getClient(validatedNetwork);

      // Retrieve file content with retry mechanism
      const fileData = await this.withRetry(
        () =>
          getFileContentFromChainByIdentifier(client, uri, {
            network: validatedNetwork,
            version: "20241025.db973a8e8032", // Use V2 by default
            useTypeID: false,
          }),
        `File retrieval for ${uri}`,
      );

      if (!fileData) {
        throw new CKBFSError(
          ErrorCode.FILE_NOT_FOUND,
          `File not found for URI: ${uri}`,
          `No data found on ${validatedNetwork} network`,
        );
      }

      // Convert content based on content type
      let processedContent: string | undefined;
      if (includeContent && fileData.content) {
        const conversionResult = convertContentToString(
          fileData.content,
          fileData.contentType,
          fileData.filename,
        );
        processedContent = conversionResult.content;
      }

      const result: FileResponse = {
        uri,
        filename: fileData.filename,
        contentType: fileData.contentType,
        size: fileData.size,
        parsedId,
        ...(processedContent && { content: processedContent }),
        ...(fileData.checksum && { checksum: fileData.checksum }),
        ...(fileData.backLinks && { backLinks: fileData.backLinks }),
        metadata: {
          network: validatedNetwork,
          protocol: "ckbfs",
          version: "20241025.db973a8e8032",
        },
      };

      const duration = Date.now() - startTime;
      logger.logCKBFSOperation(
        "retrieve",
        uri,
        validatedNetwork,
        true,
        duration,
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.logCKBFSOperation(
        "retrieve",
        uri,
        validatedNetwork,
        false,
        duration,
        (error as Error).message,
      );

      if (error instanceof CKBFSError) {
        throw error;
      }

      // Handle specific SDK errors
      if ((error as Error).message.includes("not found")) {
        throw new CKBFSError(
          ErrorCode.FILE_NOT_FOUND,
          `File not found for URI: ${uri}`,
          (error as Error).message,
        );
      }

      if (
        (error as Error).message.includes("network") ||
        (error as Error).message.includes("timeout")
      ) {
        throw new CKBFSError(
          ErrorCode.NETWORK_ERROR,
          `Network error while retrieving file: ${uri}`,
          (error as Error).message,
        );
      }

      if (
        (error as Error).message.includes("decode") ||
        (error as Error).message.includes("parse")
      ) {
        throw new CKBFSError(
          ErrorCode.CKBFS_DECODE_ERROR,
          `Failed to decode CKBFS data for URI: ${uri}`,
          (error as Error).message,
        );
      }

      throw new CKBFSError(
        ErrorCode.BLOCKCHAIN_ERROR,
        `Blockchain error while retrieving file: ${uri}`,
        (error as Error).message,
      );
    }
  }

  /**
   * Get file metadata without content
   */
  public async getFileMetadata(
    uri: string,
    network?: NetworkType,
  ): Promise<Omit<FileResponse, "content">> {
    return this.getFileContent(uri, network, false);
  }

  /**
   * Get raw file content as Uint8Array
   */
  public async getRawFileContent(
    uri: string,
    network?: NetworkType,
  ): Promise<{
    content: Uint8Array;
    filename: string;
    contentType: string;
    size: number;
  }> {
    const startTime = Date.now();
    const validatedNetwork = this.validateNetwork(network);

    try {
      // Parse and validate URI
      this.parseURI(uri);

      // Get appropriate client
      const client = this.getClient(validatedNetwork);

      // Retrieve file content with retry mechanism
      const fileData = await this.withRetry(
        () =>
          getFileContentFromChainByIdentifier(client, uri, {
            network: validatedNetwork,
            version: "20241025.db973a8e8032",
            useTypeID: false,
          }),
        `Raw file retrieval for ${uri}`,
      );

      if (!fileData || !fileData.content) {
        throw new CKBFSError(
          ErrorCode.FILE_NOT_FOUND,
          `File content not found for URI: ${uri}`,
          `No content data found on ${validatedNetwork} network`,
        );
      }

      const duration = Date.now() - startTime;
      logger.logCKBFSOperation(
        "retrieve-raw",
        uri,
        validatedNetwork,
        true,
        duration,
      );

      return {
        content: fileData.content,
        filename: fileData.filename,
        contentType: fileData.contentType,
        size: fileData.size,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.logCKBFSOperation(
        "retrieve-raw",
        uri,
        validatedNetwork,
        false,
        duration,
        (error as Error).message,
      );
      throw error;
    }
  }

  /**
   * Batch retrieve multiple files
   */
  public async getMultipleFiles(
    uris: string[],
    network?: NetworkType,
    includeContent: boolean = true,
  ): Promise<(FileResponse | { uri: string; error: string })[]> {
    const validatedNetwork = this.validateNetwork(network);

    logger.info("Starting batch file retrieval", {
      count: uris.length,
      network: validatedNetwork,
      includeContent,
    });

    const results = await Promise.allSettled(
      uris.map((uri) =>
        this.getFileContent(uri, validatedNetwork, includeContent),
      ),
    );

    return results.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        return {
          uri: uris[index]!,
          error: result.reason.message || "Unknown error",
        };
      }
    });
  }

  /**
   * Check if a URI is valid without retrieving content
   */
  public async validateURI(
    uri: string,
    network?: NetworkType,
  ): Promise<boolean> {
    try {
      await this.getFileMetadata(uri, network);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get service health status
   */
  public async getHealthStatus(): Promise<{
    status: "healthy" | "unhealthy";
    networks: Record<NetworkType, "up" | "down">;
    lastCheck: string;
  }> {
    const healthChecks = await Promise.allSettled([
      this.testnetClient.getTipHeader(),
      this.mainnetClient.getTipHeader(),
    ]);

    const testnetStatus =
      healthChecks[0]?.status === "fulfilled" ? "up" : "down";
    const mainnetStatus =
      healthChecks[1]?.status === "fulfilled" ? "up" : "down";

    const overallStatus =
      testnetStatus === "up" || mainnetStatus === "up"
        ? "healthy"
        : "unhealthy";

    return {
      status: overallStatus,
      networks: {
        testnet: testnetStatus,
        mainnet: mainnetStatus,
      },
      lastCheck: new Date().toISOString(),
    };
  }
}

export default CKBFSService;

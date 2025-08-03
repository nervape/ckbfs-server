import { Router } from "express";
import ckbfsRoutes from "./ckbfs";
import { config } from "../utils/config";

const router = Router();

// Mount CKBFS routes
router.use("/ckbfs", ckbfsRoutes);

// API documentation endpoint
router.get("/docs", (req, res) => {
  const apiDocs = {
    name: "CKBFS Server API",
    version: process.env["npm_package_version"] || "1.0.0",
    description: "RESTful API for CKBFS URI decoding and file retrieval",
    baseUrl: `${req.protocol}://${req.get("host")}${config.server.apiPrefix}/${config.server.apiVersion}`,
    endpoints: {
      // Main CKBFS endpoints
      getFile: {
        method: "GET",
        path: "/ckbfs",
        description: "Retrieve CKBFS file by URI",
        parameters: {
          uri: {
            type: "string",
            required: true,
            description:
              "CKBFS URI (ckbfs://{tx_hash}i{index}, ckbfs://{type_id}, 0x{type_id}, or {type_id})",
            examples: [
              "ckbfs://431c9d668c1815d26eb4f7ac6256eb350ab351474daea8d588400146ab228780i0",
              "ckbfs://bce89252cece632ef819943bed9cd0e2576f8ce26f9f02075b621b1c9a28056a",
              "0xbce89252cece632ef819943bed9cd0e2576f8ce26f9f02075b621b1c9a28056a",
            ],
          },
          network: {
            type: "string",
            required: false,
            default: "testnet",
            enum: ["mainnet", "testnet"],
            description: "CKB network to query",
          },
          format: {
            type: "string",
            required: false,
            default: "json",
            enum: ["json", "raw"],
            description: "Response format",
          },
          includeContent: {
            type: "boolean",
            required: false,
            default: true,
            description: "Include file content in response",
          },
          includeMetadata: {
            type: "boolean",
            required: false,
            default: true,
            description: "Include metadata in response",
          },
        },
        examples: {
          json: `${req.protocol}://${req.get("host")}${config.server.apiPrefix}/${config.server.apiVersion}/ckbfs?uri=ckbfs://431c9d668c1815d26eb4f7ac6256eb350ab351474daea8d588400146ab228780i0&network=testnet&format=json`,
          raw: `${req.protocol}://${req.get("host")}${config.server.apiPrefix}/${config.server.apiVersion}/ckbfs?uri=ckbfs://431c9d668c1815d26eb4f7ac6256eb350ab351474daea8d588400146ab228780i0&network=testnet&format=raw`,
        },
      },
      getMetadata: {
        method: "GET",
        path: "/ckbfs/metadata",
        description: "Get file metadata without content",
        parameters: {
          uri: {
            type: "string",
            required: true,
            description: "CKBFS URI",
          },
          network: {
            type: "string",
            required: false,
            default: "testnet",
            enum: ["mainnet", "testnet"],
            description: "CKB network to query",
          },
        },
        example: `${req.protocol}://${req.get("host")}${config.server.apiPrefix}/${config.server.apiVersion}/ckbfs/metadata?uri=ckbfs://431c9d668c1815d26eb4f7ac6256eb350ab351474daea8d588400146ab228780i0`,
      },
      getCompatible: {
        method: "GET",
        path: "/ckbfs/compatible",
        description: "Get CKBFS file in compatible format with hex content",
        parameters: {
          uri: {
            type: "string",
            required: true,
            description: "CKBFS URI",
          },
          network: {
            type: "string",
            required: false,
            default: "testnet",
            enum: ["mainnet", "testnet"],
            description: "CKB network to query",
          },
        },
        responseFormat: {
          content_type: "string (MIME type)",
          content: "string (hex encoded file content)",
          filename: "string (original filename)",
        },
        example: `${req.protocol}://${req.get("host")}${config.server.apiPrefix}/${config.server.apiVersion}/ckbfs/compatible?uri=ckbfs://431c9d668c1815d26eb4f7ac6256eb350ab351474daea8d588400146ab228780i0`,
      },
      validateURI: {
        method: "GET",
        path: "/ckbfs/validate",
        description: "Validate CKBFS URI without retrieving content",
        parameters: {
          uri: {
            type: "string",
            required: true,
            description: "CKBFS URI to validate",
          },
          network: {
            type: "string",
            required: false,
            default: "testnet",
            enum: ["mainnet", "testnet"],
            description: "CKB network to validate against",
          },
        },
        example: `${req.protocol}://${req.get("host")}${config.server.apiPrefix}/${config.server.apiVersion}/ckbfs/validate?uri=ckbfs://431c9d668c1815d26eb4f7ac6256eb350ab351474daea8d588400146ab228780i0`,
      },
      parseURI: {
        method: "GET",
        path: "/ckbfs/parse",
        description: "Parse CKBFS URI and return structure information",
        parameters: {
          uri: {
            type: "string",
            required: true,
            description: "CKBFS URI to parse",
          },
        },
        example: `${req.protocol}://${req.get("host")}${config.server.apiPrefix}/${config.server.apiVersion}/ckbfs/parse?uri=ckbfs://431c9d668c1815d26eb4f7ac6256eb350ab351474daea8d588400146ab228780i0`,
      },
      batchGetFiles: {
        method: "POST",
        path: "/ckbfs/batch",
        description: "Batch retrieve multiple CKBFS files",
        contentType: "application/json",
        body: {
          uris: {
            type: "array",
            required: true,
            minItems: 1,
            maxItems: 10,
            description: "Array of CKBFS URIs (max 10)",
          },
          network: {
            type: "string",
            required: false,
            default: "testnet",
            enum: ["mainnet", "testnet"],
            description: "CKB network to query",
          },
          format: {
            type: "string",
            required: false,
            default: "json",
            enum: ["json"],
            description: "Response format (only json supported for batch)",
          },
          includeContent: {
            type: "boolean",
            required: false,
            default: true,
            description: "Include file content in response",
          },
          includeMetadata: {
            type: "boolean",
            required: false,
            default: true,
            description: "Include metadata in response",
          },
        },
        example: {
          url: `${req.protocol}://${req.get("host")}${config.server.apiPrefix}/${config.server.apiVersion}/ckbfs/batch`,
          body: {
            uris: [
              "ckbfs://431c9d668c1815d26eb4f7ac6256eb350ab351474daea8d588400146ab228780i0",
              "ckbfs://bce89252cece632ef819943bed9cd0e2576f8ce26f9f02075b621b1c9a28056a",
            ],
            network: "testnet",
            includeContent: true,
            includeMetadata: true,
          },
        },
      },
      getHealth: {
        method: "GET",
        path: "/ckbfs/health",
        description: "Get CKBFS service health status",
        example: `${req.protocol}://${req.get("host")}${config.server.apiPrefix}/${config.server.apiVersion}/ckbfs/health`,
      },
    },
    supportedURIFormats: [
      {
        format: "ckbfs://{tx_hash}i{output_index}",
        description: "OutPoint format using transaction hash and output index",
        example:
          "ckbfs://431c9d668c1815d26eb4f7ac6256eb350ab351474daea8d588400146ab228780i0",
      },
      {
        format: "ckbfs://{type_id}",
        description: "TypeID format using CKBFS type ID",
        example:
          "ckbfs://bce89252cece632ef819943bed9cd0e2576f8ce26f9f02075b621b1c9a28056a",
      },
      {
        format: "0x{type_id}",
        description: "Hex TypeID format with 0x prefix",
        example:
          "0xbce89252cece632ef819943bed9cd0e2576f8ce26f9f02075b621b1c9a28056a",
      },
      {
        format: "{type_id}",
        description: "Raw TypeID format without prefix",
        example:
          "bce89252cece632ef819943bed9cd0e2576f8ce26f9f02075b621b1c9a28056a",
      },
    ],
    responseFormats: {
      json: {
        description:
          "JSON response with file metadata and intelligent content encoding",
        contentType: "application/json",
        structure: {
          success: "boolean",
          data: {
            uri: "string",
            filename: "string",
            contentType: "string",
            size: "number",
            content: "string (UTF-8 for text files, base64 for binary files)",
            parsedId: "object",
            checksum: "number (optional)",
            backLinks: "array (optional)",
            metadata: "object (optional)",
          },
          timestamp: "string (ISO 8601)",
          requestId: "string",
        },
        contentEncoding: {
          textFiles:
            "UTF-8 string for text/*, application/json, application/xml, etc.",
          binaryFiles: "Base64 string for images, executables, archives, etc.",
        },
      },
      raw: {
        description: "Raw file content with appropriate Content-Type header",
        contentType: "varies (based on file type)",
        headers: {
          "Content-Type": "MIME type of the file",
          "Content-Length": "File size in bytes",
          "Content-Disposition": 'inline; filename="..."',
          "X-CKBFS-URI": "Original CKBFS URI",
          "X-CKBFS-Network": "Network used",
          "X-CKBFS-Filename": "Original filename",
          "X-CKBFS-Size": "File size",
        },
      },
    },
    errorCodes: {
      INVALID_URI: "Invalid CKBFS URI format",
      INVALID_NETWORK: "Invalid network parameter",
      INVALID_FORMAT: "Invalid format parameter",
      MISSING_REQUIRED_FIELD: "Missing required parameter",
      FILE_NOT_FOUND: "File not found on blockchain",
      CKBFS_DECODE_ERROR: "Failed to decode CKBFS data",
      NETWORK_ERROR: "Network communication error",
      BLOCKCHAIN_ERROR: "Blockchain query error",
      INTERNAL_SERVER_ERROR: "Internal server error",
      SERVICE_UNAVAILABLE: "Service temporarily unavailable",
      TIMEOUT_ERROR: "Request timeout",
    },
    limits: {
      batchSize: 10,
      maxFileSize: "10MB",
      timeout: "30 seconds",
      rateLimit: "100 requests per 15 minutes",
    },
  };

  res.json({
    success: true,
    data: apiDocs,
    timestamp: new Date().toISOString(),
    requestId: req.headers["x-request-id"],
  });
});

export default router;

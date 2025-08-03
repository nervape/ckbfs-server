import { Router } from "express";
import { CKBFSController } from "../controllers/CKBFSController";
import {
  validateCKBFSQuery,
  validateCKBFSMetadataQuery,
  validateBatchBody,
  validateURIQuery,
  validateQuery,
  schemas,
} from "../middleware/validation";
import Joi from "joi";

const router = Router();
const ckbfsController = new CKBFSController();

// Validation schema for parse endpoint
const parseQuerySchema = Joi.object({
  uri: schemas.ckbfsUri,
});

/**
 * @route GET /ckbfs
 * @desc Get CKBFS file by URI
 * @query uri - CKBFS URI (required)
 * @query network - Network type (mainnet|testnet, default: testnet)
 * @query format - Response format (json|raw, default: json)
 * @query includeContent - Include file content (boolean, default: true)
 * @query includeMetadata - Include metadata (boolean, default: true)
 */
router.get("/", validateCKBFSQuery, ckbfsController.getFileByURI);

/**
 * @route GET /ckbfs/metadata
 * @desc Get CKBFS file metadata without content
 * @query uri - CKBFS URI (required)
 * @query network - Network type (mainnet|testnet, default: testnet)
 */
router.get(
  "/metadata",
  validateCKBFSMetadataQuery,
  ckbfsController.getFileMetadata,
);

/**
 * @route GET /ckbfs/validate
 * @desc Validate CKBFS URI without retrieving content
 * @query uri - CKBFS URI (required)
 * @query network - Network type (mainnet|testnet, default: testnet)
 */
router.get("/validate", validateURIQuery, ckbfsController.validateURI);

/**
 * @route GET /ckbfs/compatible
 * @desc Get CKBFS file in compatible format with hex content
 * @query uri - CKBFS URI (required)
 * @query network - Network type (mainnet|testnet, default: testnet)
 */
router.get("/compatible", validateURIQuery, ckbfsController.getFileCompatible);

/**
 * @route GET /ckbfs/parse
 * @desc Parse CKBFS URI and return structure information
 * @query uri - CKBFS URI (required)
 */
router.get("/parse", validateQuery(parseQuerySchema), ckbfsController.parseURI);

/**
 * @route POST /ckbfs/batch
 * @desc Batch retrieve multiple CKBFS files
 * @body uris - Array of CKBFS URIs (required, max 10)
 * @body network - Network type (mainnet|testnet, default: testnet)
 * @body format - Response format (json only for batch)
 * @body includeContent - Include file content (boolean, default: true)
 * @body includeMetadata - Include metadata (boolean, default: true)
 */
router.post("/batch", validateBatchBody, ckbfsController.batchGetFiles);

/**
 * @route GET /ckbfs/health
 * @desc Get CKBFS service health status
 */
router.get("/health", ckbfsController.getServiceHealth);

// Add CKBFS-specific error handler
router.use(CKBFSController.handleCKBFSError);

export default router;

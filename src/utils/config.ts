import dotenv from "dotenv";
import { NetworkType } from "../types/responses";

// Load environment variables
dotenv.config();

export interface AppConfig {
  server: {
    port: number;
    nodeEnv: string;
    apiVersion: string;
    apiPrefix: string;
  };
  ckb: {
    network: NetworkType;
    mainnetUrl?: string;
    testnetUrl?: string;
  };
  cors: {
    origin: string;
    methods: string;
    headers: string;
  };
  logging: {
    level: string;
    format: string;
  };
  cache: {
    ttl: number;
    maxSize: number;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  security: {
    helmetEnabled: boolean;
  };
  development: {
    debug: boolean;
  };
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value;
};

const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid number`);
  }
  return parsed;
};

const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  return value.toLowerCase() === "true";
};

const validateNetwork = (network: string): NetworkType => {
  if (network !== "mainnet" && network !== "testnet") {
    throw new Error(
      `Invalid CKB_NETWORK: ${network}. Must be 'mainnet' or 'testnet'`,
    );
  }
  return network as NetworkType;
};

export const config: AppConfig = {
  server: {
    port: getEnvNumber("PORT", 6759),
    nodeEnv: getEnvVar("NODE_ENV", "development"),
    apiVersion: getEnvVar("API_VERSION", "v1"),
    apiPrefix: getEnvVar("API_PREFIX", "/api"),
  },
  ckb: {
    network: validateNetwork(getEnvVar("CKB_NETWORK", "testnet")),
    ...(process.env.CKB_MAINNET_URL && {
      mainnetUrl: process.env.CKB_MAINNET_URL,
    }),
    ...(process.env.CKB_TESTNET_URL && {
      testnetUrl: process.env.CKB_TESTNET_URL,
    }),
  },
  cors: {
    origin: getEnvVar("CORS_ORIGIN", "*"),
    methods: getEnvVar("CORS_METHODS", "GET,POST,PUT,DELETE,OPTIONS"),
    headers: getEnvVar("CORS_HEADERS", "Content-Type,Authorization"),
  },
  logging: {
    level: getEnvVar("LOG_LEVEL", "info"),
    format: getEnvVar("LOG_FORMAT", "combined"),
  },
  cache: {
    ttl: getEnvNumber("CACHE_TTL", 300),
    maxSize: getEnvNumber("CACHE_MAX_SIZE", 100),
  },
  rateLimit: {
    windowMs: getEnvNumber("RATE_LIMIT_WINDOW_MS", 900000), // 15 minutes
    maxRequests: getEnvNumber("RATE_LIMIT_MAX_REQUESTS", 100),
  },
  security: {
    helmetEnabled: getEnvBoolean("HELMET_ENABLED", true),
  },
  development: {
    debug: getEnvBoolean("DEBUG", false),
  },
};

// Validate configuration on startup
export const validateConfig = (): void => {
  const requiredEnvVars: string[] = [];

  // Add any required environment variables here
  // Example: if (!process.env.REQUIRED_VAR) requiredEnvVars.push('REQUIRED_VAR');

  if (requiredEnvVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${requiredEnvVars.join(", ")}`,
    );
  }

  // Validate port range
  if (config.server.port < 1 || config.server.port > 65535) {
    throw new Error("PORT must be between 1 and 65535");
  }

  // Validate log level
  const validLogLevels = ["error", "warn", "info", "debug"];
  if (!validLogLevels.includes(config.logging.level)) {
    throw new Error(`LOG_LEVEL must be one of: ${validLogLevels.join(", ")}`);
  }

  console.log("Configuration validated successfully");
  console.log(
    `Server will run on port ${config.server.port} in ${config.server.nodeEnv} mode`,
  );
  console.log(`CKB Network: ${config.ckb.network}`);
};

export default config;

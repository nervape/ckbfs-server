import { config } from "../src/utils/config";

// Mock environment variables for testing
process.env.NODE_ENV = "test";
process.env.CKB_NETWORK = "testnet";
process.env.PORT = "3001";
process.env.LOG_LEVEL = "error";
process.env.DEBUG = "false";

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise during tests
const originalConsole = global.console;

beforeAll(() => {
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
});

afterAll(() => {
  global.console = originalConsole;
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global test helpers
global.testHelpers = {
  // Mock CKBFS URIs for testing
  validOutPointURI:
    "ckbfs://431c9d668c1815d26eb4f7ac6256eb350ab351474daea8d588400146ab228780i0",
  validTypeIdURI:
    "ckbfs://bce89252cece632ef819943bed9cd0e2576f8ce26f9f02075b621b1c9a28056a",
  validHexTypeIdURI:
    "0xbce89252cece632ef819943bed9cd0e2576f8ce26f9f02075b621b1c9a28056a",
  validRawTypeIdURI:
    "bce89252cece632ef819943bed9cd0e2576f8ce26f9f02075b621b1c9a28056a",
  invalidURI: "invalid://not-a-valid-uri",

  // Mock file data
  mockFileData: {
    filename: "test-file.txt",
    contentType: "text/plain",
    size: 13,
    content: new Uint8Array([
      72, 101, 108, 108, 111, 44, 32, 87, 111, 114, 108, 100, 33,
    ]), // "Hello, World!"
    parsedId: {
      type: "outPoint" as const,
      txHash:
        "0x431c9d668c1815d26eb4f7ac6256eb350ab351474daea8d588400146ab228780",
      index: 0,
      raw: "ckbfs://431c9d668c1815d26eb4f7ac6256eb350ab351474daea8d588400146ab228780i0",
    },
    checksum: 123456789,
    backLinks: [],
  },

  // Create mock request object
  createMockRequest: (overrides: any = {}) => ({
    headers: { "x-request-id": "test-request-id" },
    query: {},
    body: {},
    params: {},
    method: "GET",
    url: "/test",
    ip: "127.0.0.1",
    ...overrides,
  }),

  // Create mock response object
  createMockResponse: () => {
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      headersSent: false,
    };
    return res;
  },

  // Create mock next function
  createMockNext: () => jest.fn(),

  // Wait for async operations
  waitFor: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),

  // Generate test request ID
  generateTestRequestId: () =>
    `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
};

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidCKBFSResponse(): R;
      toBeErrorResponse(): R;
    }
  }

  var testHelpers: {
    validOutPointURI: string;
    validTypeIdURI: string;
    validHexTypeIdURI: string;
    validRawTypeIdURI: string;
    invalidURI: string;
    mockFileData: any;
    createMockRequest: (overrides?: any) => any;
    createMockResponse: () => any;
    createMockNext: () => jest.Mock;
    waitFor: (ms: number) => Promise<void>;
    generateTestRequestId: () => string;
  };
}

// Custom Jest matchers
expect.extend({
  toBeValidCKBFSResponse(received) {
    const pass =
      received &&
      typeof received === "object" &&
      received.success === true &&
      received.data &&
      typeof received.timestamp === "string" &&
      typeof received.requestId === "string";

    if (pass) {
      return {
        message: () =>
          `Expected ${JSON.stringify(received)} not to be a valid CKBFS response`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `Expected ${JSON.stringify(received)} to be a valid CKBFS response`,
        pass: false,
      };
    }
  },

  toBeErrorResponse(received) {
    const pass =
      received &&
      typeof received === "object" &&
      received.success === false &&
      received.error &&
      typeof received.error.code === "string" &&
      typeof received.error.message === "string" &&
      typeof received.timestamp === "string";

    if (pass) {
      return {
        message: () =>
          `Expected ${JSON.stringify(received)} not to be an error response`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `Expected ${JSON.stringify(received)} to be an error response`,
        pass: false,
      };
    }
  },
});

export {};

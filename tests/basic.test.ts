import { CKBFSService } from "../src/services/CKBFSService";
import { validateCKBFSQuery } from "../src/middleware/validation";
import { config } from "../src/utils/config";

describe("Basic Setup Tests", () => {
  describe("CKBFSService", () => {
    let service: CKBFSService;

    beforeEach(() => {
      service = new CKBFSService();
    });

    it("should initialize with default options", () => {
      expect(service).toBeDefined();
    });

    it("should parse valid OutPoint URI", () => {
      const uri =
        "ckbfs://431c9d668c1815d26eb4f7ac6256eb350ab351474daea8d588400146ab228780i0";
      const parsed = service.parseURI(uri);

      expect(parsed.type).toBe("outPoint");
      expect(parsed.txHash).toBe(
        "0x431c9d668c1815d26eb4f7ac6256eb350ab351474daea8d588400146ab228780",
      );
      expect(parsed.index).toBe(0);
      expect(parsed.raw).toBe(uri);
    });

    it("should parse valid TypeID URI", () => {
      const uri =
        "ckbfs://bce89252cece632ef819943bed9cd0e2576f8ce26f9f02075b621b1c9a28056a";
      const parsed = service.parseURI(uri);

      expect(parsed.type).toBe("typeId");
      expect(parsed.typeId).toBe(
        "0xbce89252cece632ef819943bed9cd0e2576f8ce26f9f02075b621b1c9a28056a",
      );
      expect(parsed.raw).toBe(uri);
    });

    it("should parse valid hex TypeID", () => {
      const uri =
        "0xbce89252cece632ef819943bed9cd0e2576f8ce26f9f02075b621b1c9a28056a";
      const parsed = service.parseURI(uri);

      expect(parsed.type).toBe("typeId");
      expect(parsed.raw).toBe(uri);
    });

    it("should throw error for invalid URI", () => {
      const invalidUri = "invalid://not-a-valid-uri";

      expect(() => {
        service.parseURI(invalidUri);
      }).toThrow();
    });

    it("should validate network parameter", () => {
      expect(service.validateNetwork("mainnet")).toBe("mainnet");
      expect(service.validateNetwork("testnet")).toBe("testnet");
      expect(service.validateNetwork()).toBe("testnet"); // default

      expect(() => {
        service.validateNetwork("invalid");
      }).toThrow();
    });
  });

  describe("Configuration", () => {
    it("should have valid configuration", () => {
      expect(config).toBeDefined();
      expect(config.server.port).toBeGreaterThan(0);
      expect(config.server.port).toBeLessThanOrEqual(65535);
      expect(["mainnet", "testnet"]).toContain(config.ckb.network);
      expect(["development", "production", "test"]).toContain(
        config.server.nodeEnv,
      );
    });
  });

  describe("Validation Middleware", () => {
    it("should export validation functions", () => {
      expect(validateCKBFSQuery).toBeDefined();
      expect(typeof validateCKBFSQuery).toBe("function");
    });
  });

  describe("Environment", () => {
    it("should be in test environment", () => {
      expect(process.env.NODE_ENV).toBe("test");
    });
  });
});

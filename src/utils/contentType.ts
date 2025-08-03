/**
 * Utility functions for content type detection and handling
 */

/**
 * List of MIME types that should be treated as text content
 */
const TEXT_CONTENT_TYPES = new Set([
  // Standard text types
  "text/plain",
  "text/html",
  "text/css",
  "text/javascript",
  "text/typescript",
  "text/csv",
  "text/xml",
  "text/markdown",
  "text/rtf",

  // Application types that are text-based
  "application/json",
  "application/xml",
  "application/javascript",
  "application/typescript",
  "application/x-javascript",
  "application/x-typescript",
  "application/ecmascript",
  "application/rss+xml",
  "application/atom+xml",
  "application/xhtml+xml",
  "application/soap+xml",
  "application/mathml+xml",
  "application/xslt+xml",
  "application/rdf+xml",
  "application/ld+json",
  "application/hal+json",
  "application/vnd.api+json",
  "application/x-yaml",
  "application/yaml",
  "application/toml",
  "application/x-toml",
  "application/ini",
  "application/x-ini",
  "application/x-properties",
  "application/x-sh",
  "application/x-shellscript",
  "application/x-perl",
  "application/x-python",
  "application/x-ruby",
  "application/x-php",
  "application/x-sql",
  "application/sql",
]);

/**
 * MIME type patterns that indicate text content
 */
const TEXT_CONTENT_PATTERNS = [
  /^text\//,
  /\+xml$/,
  /\+json$/,
  /\+yaml$/,
  /\+toml$/,
];

/**
 * File extensions that are typically text-based
 */
const TEXT_FILE_EXTENSIONS = new Set([
  "txt", "md", "markdown", "rst", "log", "cfg", "conf", "ini", "env",
  "json", "xml", "yaml", "yml", "toml", "csv", "tsv",
  "html", "htm", "xhtml", "css", "js", "ts", "jsx", "tsx",
  "py", "rb", "php", "pl", "sh", "bash", "zsh", "fish",
  "sql", "graphql", "gql", "proto", "thrift",
  "dockerfile", "makefile", "cmake", "gradle",
  "gitignore", "gitattributes", "editorconfig",
  "license", "readme", "changelog", "authors", "contributors",
]);

/**
 * Determines if a content type should be treated as text
 * @param contentType - The MIME type to check
 * @returns true if the content should be treated as text, false for binary
 */
export function isTextContentType(contentType: string): boolean {
  if (!contentType) {
    return false;
  }

  // Normalize content type (remove charset and other parameters)
  const normalizedType = contentType.toLowerCase().split(";")[0]?.trim();

  if (!normalizedType) {
    return false;
  }

  // Check exact matches first
  if (TEXT_CONTENT_TYPES.has(normalizedType)) {
    return true;
  }

  // Check patterns
  return TEXT_CONTENT_PATTERNS.some(pattern => pattern.test(normalizedType));
}

/**
 * Determines if a filename suggests text content based on its extension
 * @param filename - The filename to check
 * @returns true if the file extension suggests text content
 */
export function isTextFileExtension(filename: string): boolean {
  if (!filename) {
    return false;
  }

  const extension = filename.toLowerCase().split(".").pop();

  if (!extension) {
    return false;
  }

  return TEXT_FILE_EXTENSIONS.has(extension);
}

/**
 * Determines if content should be treated as text based on both content type and filename
 * @param contentType - The MIME type
 * @param filename - The filename (optional)
 * @returns true if content should be treated as text
 */
export function shouldTreatAsText(contentType: string, filename?: string): boolean {
  // Primary check: content type
  if (isTextContentType(contentType)) {
    return true;
  }

  // Fallback: check file extension if content type is generic
  if (filename && (
    contentType === "application/octet-stream" ||
    contentType === "binary/octet-stream" ||
    contentType === "application/unknown" ||
    !contentType
  )) {
    return isTextFileExtension(filename);
  }

  return false;
}

/**
 * Safely converts buffer content to UTF-8 string with fallback
 * @param content - The content buffer
 * @returns UTF-8 string or null if conversion fails
 */
export function safeBufferToUtf8(content: Uint8Array): string | null {
  try {
    const text = Buffer.from(content).toString("utf8");

    // Check if the conversion resulted in valid UTF-8
    // by looking for replacement characters that indicate invalid bytes
    if (text.includes("\uFFFD")) {
      return null;
    }

    return text;
  } catch (error) {
    return null;
  }
}

/**
 * Converts content to appropriate string format based on content type
 * @param content - The content buffer
 * @param contentType - The MIME type
 * @param filename - The filename (optional)
 * @returns Object with the converted content and encoding used
 */
export function convertContentToString(
  content: Uint8Array,
  contentType: string,
  filename?: string
): {
  content: string;
  encoding: "utf8" | "base64";
  isText: boolean;
} {
  const isText = shouldTreatAsText(contentType, filename);

  if (isText) {
    const utf8Content = safeBufferToUtf8(content);

    if (utf8Content !== null) {
      return {
        content: utf8Content,
        encoding: "utf8",
        isText: true,
      };
    }

    // Fallback to base64 if UTF-8 conversion fails
    console.warn(`Failed to convert content to UTF-8 for ${contentType}, falling back to base64`);
  }

  // Return as base64 for binary content or failed UTF-8 conversion
  return {
    content: Buffer.from(content).toString("base64"),
    encoding: "base64",
    isText: false,
  };
}

/**
 * Gets a human-readable description of the content encoding
 * @param encoding - The encoding used
 * @param contentType - The MIME type
 * @returns Description string
 */
export function getEncodingDescription(encoding: "utf8" | "base64", contentType: string): string {
  if (encoding === "utf8") {
    return `UTF-8 text content (${contentType})`;
  } else {
    return `Base64-encoded binary content (${contentType})`;
  }
}

export default {
  isTextContentType,
  isTextFileExtension,
  shouldTreatAsText,
  safeBufferToUtf8,
  convertContentToString,
  getEncodingDescription,
};

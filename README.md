# CKBFS Server

A RESTful server for CKBFS (CKB File System) URI decoding and file retrieval. This server provides a simple HTTP API to interact with files stored on the Nervos CKB blockchain using the CKBFS protocol.

## Features

- **URI Decoding**: Support for multiple CKBFS URI formats
- **File Retrieval**: Get files with metadata or raw content
- **Batch Operations**: Retrieve multiple files in a single request
- **Network Support**: Both CKB mainnet and testnet
- **Response Formats**: JSON with metadata or raw file content
- **Validation**: Comprehensive input validation and error handling
- **Health Monitoring**: Service health checks and monitoring

## Supported URI Formats

The server supports multiple CKBFS URI formats:

1. **OutPoint Format**: `ckbfs://{tx_hash}i{output_index}`
   - Example: `ckbfs://431c9d668c1815d26eb4f7ac6256eb350ab351474daea8d588400146ab228780i0`

2. **TypeID Format**: `ckbfs://{type_id}`
   - Example: `ckbfs://bce89252cece632ef819943bed9cd0e2576f8ce26f9f02075b621b1c9a28056a`

3. **Hex TypeID**: `0x{type_id}`
   - Example: `0xbce89252cece632ef819943bed9cd0e2576f8ce26f9f02075b621b1c9a28056a`

4. **Raw TypeID**: `{type_id}`
   - Example: `bce89252cece632ef819943bed9cd0e2576f8ce26f9f02075b621b1c9a28056a`

## Quick Start

### Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ckbfs-server
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Build the project:
```bash
npm run build
```

5. Start the server:
```bash
npm start
```

For development:
```bash
npm run dev
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Server Configuration
PORT=6750
NODE_ENV=development

# CKB Network Configuration
CKB_NETWORK=testnet

# API Configuration
API_VERSION=v1
API_PREFIX=/api

# CORS Configuration
CORS_ORIGIN=*
CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_HEADERS=Content-Type,Authorization

# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=combined

# Security Headers
HELMET_ENABLED=true

# Development Settings
DEBUG=false
```

## API Documentation

### Base URL

```
http://localhost:3000/api/v1
```

### Endpoints

#### 1. Get File by URI

**GET** `/ckbfs`

Retrieve a CKBFS file by URI.

**Query Parameters:**
- `uri` (required): CKBFS URI
- `network` (optional): `mainnet` or `testnet` (default: `testnet`)
- `format` (optional): `json` or `raw` (default: `json`)
- `includeContent` (optional): Include file content (default: `true`)
- `includeMetadata` (optional): Include metadata (default: `true`)

**Examples:**

```bash
# Get file as JSON
curl "http://localhost:3000/api/v1/ckbfs?uri=ckbfs://431c9d668c1815d26eb4f7ac6256eb350ab351474daea8d588400146ab228780i0&network=testnet&format=json"

# Get raw file content
curl "http://localhost:3000/api/v1/ckbfs?uri=ckbfs://431c9d668c1815d26eb4f7ac6256eb350ab351474daea8d588400146ab228780i0&network=testnet&format=raw"

# Get metadata only
curl "http://localhost:3000/api/v1/ckbfs?uri=ckbfs://431c9d668c1815d26eb4f7ac6256eb350ab351474daea8d588400146ab228780i0&includeContent=false"
```

**JSON Response:**
```json
{
  "success": true,
  "data": {
    "uri": "ckbfs://431c9d668c1815d26eb4f7ac6256eb350ab351474daea8d588400146ab228780i0",
    "filename": "example.txt",
    "contentType": "text/plain",
    "size": 1024,
    "content": "Hello, CKBFS!",
    "parsedId": {
      "type": "outPoint",
      "txHash": "0x431c9d668c1815d26eb4f7ac6256eb350ab351474daea8d588400146ab228780",
      "index": 0,
      "raw": "ckbfs://431c9d668c1815d26eb4f7ac6256eb350ab351474daea8d588400146ab228780i0"
    },
    "checksum": 123456789,
    "metadata": {
      "network": "testnet",
      "protocol": "ckbfs",
      "version": "20241025.db973a8e8032"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "req_1234567890_abcdef123"
}
```

#### 2. Get File Metadata

**GET** `/ckbfs/metadata`

Get file metadata without content.

**Query Parameters:**
- `uri` (required): CKBFS URI
- `network` (optional): `mainnet` or `testnet` (default: `testnet`)

**Example:**
```bash
curl "http://localhost:3000/api/v1/ckbfs/metadata?uri=ckbfs://431c9d668c1815d26eb4f7ac6256eb350ab351474daea8d588400146ab228780i0"
```

#### 3. Get File (Compatible Format)

**GET** `/ckbfs/compatible`

Get CKBFS file in compatible format with hex-encoded content.

**Query Parameters:**
- `uri` (required): CKBFS URI
- `network` (optional): `mainnet` or `testnet` (default: `testnet`)

**Example:**
```bash
curl "http://localhost:3000/api/v1/ckbfs/compatible?uri=ckbfs://431c9d668c1815d26eb4f7ac6256eb350ab351474daea8d588400146ab228780i0"
```

**Response:**
```json
{
  "content_type": "text/plain",
  "content": "48656c6c6f2c20576f726c6421",
  "filename": "example.txt"
}
```

#### 4. Validate URI

**GET** `/ckbfs/validate`

Validate a CKBFS URI without retrieving content.

**Query Parameters:**
- `uri` (required): CKBFS URI to validate
- `network` (optional): `mainnet` or `testnet` (default: `testnet`)

**Example:**
```bash
curl "http://localhost:3000/api/v1/ckbfs/validate?uri=ckbfs://431c9d668c1815d26eb4f7ac6256eb350ab351474daea8d588400146ab228780i0"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "uri": "ckbfs://431c9d668c1815d26eb4f7ac6256eb350ab351474daea8d588400146ab228780i0",
    "valid": true,
    "network": "testnet",
    "parsedId": {
      "type": "outPoint",
      "txHash": "0x431c9d668c1815d26eb4f7ac6256eb350ab351474daea8d588400146ab228780",
      "index": 0,
      "raw": "ckbfs://431c9d668c1815d26eb4f7ac6256eb350ab351474daea8d588400146ab228780i0"
    },
    "checkedAt": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "req_1234567890_abcdef123"
}
```

#### 5. Parse URI

**GET** `/ckbfs/parse`

Parse a CKBFS URI and return structure information.

**Query Parameters:**
- `uri` (required): CKBFS URI to parse

**Example:**
```bash
curl "http://localhost:3000/api/v1/ckbfs/parse?uri=ckbfs://431c9d668c1815d26eb4f7ac6256eb350ab351474daea8d588400146ab228780i0"
```

#### 6. Batch Retrieve Files

**POST** `/ckbfs/batch`

Retrieve multiple CKBFS files in a single request.

**Request Body:**
```json
{
  "uris": [
    "ckbfs://431c9d668c1815d26eb4f7ac6256eb350ab351474daea8d588400146ab228780i0",
    "ckbfs://bce89252cece632ef819943bed9cd0e2576f8ce26f9f02075b621b1c9a28056a"
  ],
  "network": "testnet",
  "includeContent": true,
  "includeMetadata": true
}
```

**Example:**
```bash
curl -X POST "http://localhost:3000/api/v1/ckbfs/batch" \
  -H "Content-Type: application/json" \
  -d '{
    "uris": [
      "ckbfs://431c9d668c1815d26eb4f7ac6256eb350ab351474daea8d588400146ab228780i0"
    ],
    "network": "testnet"
  }'
```

#### 7. Service Health

**GET** `/ckbfs/health`

Get CKBFS service health status.

**Example:**
```bash
curl "http://localhost:3000/api/v1/ckbfs/health"
```

### Additional Endpoints

#### API Information

**GET** `/api/v1/info`

Get API information and documentation.

#### Health Check

**GET** `/health`

Basic server health check.

#### API Documentation

**GET** `/api/v1/docs`

Interactive API documentation.

## Response Formats

### JSON Format

Default response format with metadata and base64-encoded content:

```json
{
  "success": true,
  "data": {
    "uri": "ckbfs://...",
    "filename": "example.txt",
    "contentType": "text/plain",
    "size": 1024,
    "content": "base64-encoded-content",
    "parsedId": {...},
    "checksum": 123456789,
    "metadata": {...}
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "req_..."
}
```

### Compatible Format
### JSON Format

Default response format with intelligent content encoding:

```json
{
  "success": true,
  "data": {
    "uri": "ckbfs://...",
    "filename": "example.txt",
    "contentType": "text/plain",
    "size": 1024,
    "content": "Hello, World!",
    "parsedId": {...},
    "checksum": 123456789,
    "metadata": {...}
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "req_..."
}
```

**Content Encoding:**
- **Text files**: UTF-8 string (for `text/*`, `application/json`, `application/xml`, etc.)
- **Binary files**: Base64-encoded string (for images, executables, etc.)

### Compatible Format

Returns a simplified JSON response with hex-encoded content:

```json
{
  "content_type": "text/plain",
  "content": "48656c6c6f2c20576f726c6421",
  "filename": "example.txt"
}
```

**Fields:**
- `content_type`: File's MIME type
- `content`: Hex-encoded file content
- `filename`: Original filename

### Raw Format

Returns the actual file content with appropriate headers:

**Headers:**
- `Content-Type`: File's MIME type
- `Content-Length`: File size in bytes
- `Content-Disposition`: `inline; filename="..."`
- `X-CKBFS-URI`: Original CKBFS URI
- `X-CKBFS-Network`: Network used
- `X-CKBFS-Filename`: Original filename
- `X-CKBFS-Size`: File size

## Content Encoding Details

The API uses intelligent content encoding based on the file's MIME type:

### Text Content (UTF-8 String)
Files with these content types are returned as UTF-8 strings:
- `text/*` (text/plain, text/html, text/css, etc.)
- `application/json`
- `application/xml`
- `application/javascript`
- `application/typescript`
- Any content type containing "xml" or "json"

**Example for text file:**
```json
{
  "content": "Hello, World!\nThis is a text file."
}
```

### Binary Content (Base64 String)
All other files are returned as base64-encoded strings:
- Images (image/png, image/jpeg, etc.)
- Executables and binaries
- Archives (zip, tar, etc.)
- Audio/video files

**Example for binary file:**
```json
{
  "content": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
}
```

## Error Handling

All errors return a standardized JSON response:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": "Additional error details"
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "req_..."
}
```

### Error Codes

- `INVALID_URI`: Invalid CKBFS URI format
- `INVALID_NETWORK`: Invalid network parameter
- `INVALID_FORMAT`: Invalid format parameter
- `MISSING_REQUIRED_FIELD`: Missing required parameter
- `FILE_NOT_FOUND`: File not found on blockchain
- `CKBFS_DECODE_ERROR`: Failed to decode CKBFS data
- `NETWORK_ERROR`: Network communication error
- `BLOCKCHAIN_ERROR`: Blockchain query error
- `INTERNAL_SERVER_ERROR`: Internal server error
- `SERVICE_UNAVAILABLE`: Service temporarily unavailable
- `TIMEOUT_ERROR`: Request timeout
- `RATE_LIMIT_EXCEEDED`: Rate limit exceeded

## Development

### Scripts

```bash
# Development with hot reload
npm run dev

# Build the project
npm run build

# Start production server
npm start

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Project Structure

```
src/
├── controllers/     # Request handlers
├── services/        # Business logic
├── middleware/      # Express middleware
├── routes/          # Route definitions
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
├── server.ts        # Express server setup
└── index.ts         # Application entry point
```

### Adding New Features

1. **Controllers**: Add new request handlers in `src/controllers/`
2. **Services**: Add business logic in `src/services/`
3. **Routes**: Define new routes in `src/routes/`
4. **Middleware**: Add custom middleware in `src/middleware/`
5. **Types**: Define TypeScript types in `src/types/`

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Test Structure

```
tests/
├── services/        # Service layer tests
├── controllers/     # Controller tests
├── middleware/      # Middleware tests
├── routes/          # Route integration tests
└── setup.ts         # Test setup configuration
```

### Writing Tests

Example test file:

```typescript
import { CKBFSService } from '../src/services/CKBFSService';

describe('CKBFSService', () => {
  let service: CKBFSService;

  beforeEach(() => {
    service = new CKBFSService();
  });

  it('should parse valid CKBFS URI', () => {
    const uri = 'ckbfs://431c9d668c1815d26eb4f7ac6256eb350ab351474daea8d588400146ab228780i0';
    const parsed = service.parseURI(uri);

    expect(parsed.type).toBe('outPoint');
    expect(parsed.txHash).toBe('0x431c9d668c1815d26eb4f7ac6256eb350ab351474daea8d588400146ab228780');
    expect(parsed.index).toBe(0);
  });
});
```

## Deployment

### Docker

Build and run with Docker:

```bash
# Build Docker image
docker build -t ckbfs-server .

# Run container
docker run -p 3000:3000 --env-file .env ckbfs-server
```

### Docker Compose

```yaml
version: '3.8'
services:
  ckbfs-server:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - CKB_NETWORK=mainnet
      - PORT=3000
    restart: unless-stopped
```

### Production Deployment

1. **Environment Setup**:
   ```bash
   NODE_ENV=production
   CKB_NETWORK=mainnet
   PORT=3000
   LOG_LEVEL=info
   ```

2. **Process Management**:
   Use PM2 or similar process manager:
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name ckbfs-server
   ```

3. **Reverse Proxy**:
   Configure nginx or similar reverse proxy:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }
   }
   ```

## Monitoring

### Health Checks

- **Server Health**: `GET /health`
- **Service Health**: `GET /api/v1/ckbfs/health`

### Logging

The server provides structured logging with different levels:

- `error`: Error conditions
- `warn`: Warning conditions
- `info`: Informational messages
- `debug`: Debug messages

### Metrics

Monitor these key metrics:

- Request rate and response times
- Error rates by endpoint
- CKBFS service availability
- Memory and CPU usage

## Security

### Headers

The server includes security headers via Helmet:

- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy

### CORS

CORS is configurable via environment variables:

```env
CORS_ORIGIN=https://your-frontend.com
CORS_METHODS=GET,POST
CORS_HEADERS=Content-Type,Authorization
```

### Rate Limiting

Configure rate limiting to prevent abuse:

```env
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100  # 100 requests per window
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes
4. Add tests for new functionality
5. Run tests: `npm test`
6. Commit your changes: `git commit -am 'Add new feature'`
7. Push to the branch: `git push origin feature/new-feature`
8. Submit a pull request

### Code Style

- Use TypeScript for all new code
- Follow ESLint configuration
- Add JSDoc comments for public APIs
- Write tests for new features
- Update documentation as needed

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:

1. Check the [API documentation](#api-documentation)
2. Review [error codes](#error-codes)
3. Check existing GitHub issues
4. Create a new issue with detailed information

## Changelog

### v1.0.0

- Initial release
- Support for all CKBFS URI formats
- JSON and raw response formats
- Batch file retrieval
- Comprehensive error handling
- Health monitoring
- Full TypeScript support

# CKBFS Compatible Endpoint Usage Examples

This document provides examples of how to use the compatible endpoint that returns CKBFS file content in hex format.

## Endpoint

```
GET /api/v1/ckbfs/compatible?uri={ckbfs_uri}&network={network}
```

## Response Format

The compatible endpoint returns a simplified JSON response:

```json
{
  "content_type": "text/plain",
  "content": "48656c6c6f2c20576f726c6421",
  "filename": "example.txt"
}
```

Where:
- `content_type`: The MIME type of the file
- `content`: Hex-encoded file content
- `filename`: Original filename

## Examples

### Example 1: Text File

**Request:**
```bash
curl "http://localhost:3000/api/v1/ckbfs/compatible?uri=ckbfs://431c9d668c1815d26eb4f7ac6256eb350ab351474daea8d588400146ab228780i0&network=testnet"
```

**Response:**
```json
{
  "content_type": "text/plain",
  "content": "48656c6c6f2c20576f726c6421",
  "filename": "hello.txt"
}
```

**Decoded content:** "Hello, World!" (hex `48656c6c6f2c20576f726c6421` decoded)

### Example 2: Image File

**Request:**
```bash
curl "http://localhost:3000/api/v1/ckbfs/compatible?uri=ckbfs://bce89252cece632ef819943bed9cd0e2576f8ce26f9f02075b621b1c9a28056a&network=testnet"
```

**Response:**
```json
{
  "content_type": "image/png",
  "content": "89504e470d0a1a0a0000000d49484452...",
  "filename": "image.png"
}
```

### Example 3: JSON File

**Request:**
```bash
curl "http://localhost:3000/api/v1/ckbfs/compatible?uri=0xabc123def456789012345678901234567890123456789012345678901234567890&network=mainnet"
```

**Response:**
```json
{
  "content_type": "application/json",
  "content": "7b226e616d65223a224a6f686e222c2261676522323a33307d",
  "filename": "data.json"
}
```

**Decoded content:** `{"name":"John","age":30}` (hex decoded)

## Supported URI Formats

The compatible endpoint supports all CKBFS URI formats:

1. **OutPoint Format**: `ckbfs://{tx_hash}i{output_index}`
   ```
   ckbfs://431c9d668c1815d26eb4f7ac6256eb350ab351474daea8d588400146ab228780i0
   ```

2. **TypeID Format**: `ckbfs://{type_id}`
   ```
   ckbfs://bce89252cece632ef819943bed9cd0e2576f8ce26f9f02075b621b1c9a28056a
   ```

3. **Hex TypeID**: `0x{type_id}`
   ```
   0xbce89252cece632ef819943bed9cd0e2576f8ce26f9f02075b621b1c9a28056a
   ```

4. **Raw TypeID**: `{type_id}`
   ```
   bce89252cece632ef819943bed9cd0e2576f8ce26f9f02075b621b1c9a28056a
   ```

## Converting Hex Content

### JavaScript/Node.js

```javascript
// Convert hex string to text
function hexToText(hex) {
  return Buffer.from(hex, 'hex').toString('utf8');
}

// Convert hex string to binary data
function hexToBuffer(hex) {
  return Buffer.from(hex, 'hex');
}

// Example usage
const response = await fetch('/api/v1/ckbfs/compatible?uri=ckbfs://...');
const data = await response.json();

const textContent = hexToText(data.content);
console.log('File content:', textContent);
```

### Python

```python
import binascii
import requests

# Fetch file
response = requests.get('/api/v1/ckbfs/compatible?uri=ckbfs://...')
data = response.json()

# Convert hex to text
text_content = binascii.unhexlify(data['content']).decode('utf-8')
print('File content:', text_content)

# Convert hex to binary
binary_content = binascii.unhexlify(data['content'])
```

### Bash/Shell

```bash
# Using xxd to convert hex to text
echo "48656c6c6f2c20576f726c6421" | xxd -r -p

# Using python one-liner
echo "48656c6c6f2c20576f726c6421" | python3 -c "import sys, binascii; print(binascii.unhexlify(sys.stdin.read().strip()).decode())"
```

## Error Handling

The compatible endpoint returns standard error responses:

```json
{
  "success": false,
  "error": {
    "code": "FILE_NOT_FOUND",
    "message": "File not found for URI: ckbfs://...",
    "details": "No data found on testnet network"
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "req_..."
}
```

Common error codes:
- `INVALID_URI`: Invalid CKBFS URI format
- `FILE_NOT_FOUND`: File not found on blockchain
- `NETWORK_ERROR`: Network communication error
- `CKBFS_DECODE_ERROR`: Failed to decode CKBFS data

## Integration Examples

### Frontend Integration

```javascript
class CKBFSClient {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async getFile(uri, network = 'testnet') {
    const url = `${this.baseUrl}/api/v1/ckbfs/compatible?uri=${encodeURIComponent(uri)}&network=${network}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch file');
      }
      
      return {
        filename: data.filename,
        contentType: data.content_type,
        content: Buffer.from(data.content, 'hex')
      };
    } catch (error) {
      console.error('Error fetching CKBFS file:', error);
      throw error;
    }
  }
}

// Usage
const client = new CKBFSClient();
const file = await client.getFile('ckbfs://...');
console.log('Downloaded:', file.filename);
```

### Backend Integration

```javascript
const express = require('express');
const axios = require('axios');

const app = express();

app.get('/proxy-ckbfs/:uri', async (req, res) => {
  try {
    const { uri } = req.params;
    const { network = 'testnet' } = req.query;
    
    const response = await axios.get(`http://localhost:3000/api/v1/ckbfs/compatible`, {
      params: { uri, network }
    });
    
    const { content_type, content, filename } = response.data;
    const buffer = Buffer.from(content, 'hex');
    
    res.setHeader('Content-Type', content_type);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Performance Considerations

- The compatible endpoint returns hex-encoded content, which is approximately 2x larger than binary
- For large files, consider using the raw format endpoint instead: `/api/v1/ckbfs?format=raw`
- Implement caching for frequently accessed files
- Use appropriate network timeouts for blockchain queries

## Comparison with Other Endpoints

| Endpoint | Response Format | Content Encoding | Use Case |
|----------|----------------|------------------|----------|
| `/ckbfs/compatible` | Simple JSON | Hex string | Legacy systems, simple integration |
| `/ckbfs?format=json` | Full JSON | Base64 string | Complete metadata needed |
| `/ckbfs?format=raw` | Binary | Raw bytes | Direct file serving |

## Security Notes

- Always validate the `content_type` before processing content
- Be cautious when executing or interpreting file content
- Implement appropriate rate limiting for public endpoints
- Validate URI format before making requests
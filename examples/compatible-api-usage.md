# Compatible API Endpoint Usage Examples

This document provides examples of how to use the compatible CKBFS API endpoint that returns file content in hex format.

## Endpoint Overview

**URL:** `GET /api/v1/ckbfs/compatible`

**Response Format:**
```json
{
  "content_type": "image/png",
  "content": "89504e470d0a1a0a0000000d49484452...",
  "filename": "example.png"
}
```

## Basic Usage Examples

### 1. Retrieve a Text File

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

**Decoded content:** "Hello, World!" (hex: 48656c6c6f2c20576f726c6421)

### 2. Retrieve an Image File

```bash
curl "http://localhost:3000/api/v1/ckbfs/compatible?uri=ckbfs://bce89252cece632ef819943bed9cd0e2576f8ce26f9f02075b621b1c9a28056a&network=testnet"
```

**Response:**
```json
{
  "content_type": "image/png",
  "content": "89504e470d0a1a0a0000000d49484452000000100000001008060000001ff3ff61000000017352474200aece1ce90000000467414d410000b18f0bfc6105000000097048597300000ec300000ec301c76fa8640000001e49444154384f6350dae914b9"
}
```

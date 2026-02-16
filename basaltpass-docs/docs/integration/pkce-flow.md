---
sidebar_position: 4
---

# PKCE Authorization Flow

Proof Key for Code Exchange (PKCE) is **mandatory** for public clients (SPAs, Mobile Apps) and recommended for all clients to prevent authorization code interception attacks.

## How it Works

1.  **Client** creates a high-entropy cryptographically random string called `code_verifier`.
2.  **Client** calculates the `code_challenge` from the `code_verifier`.
3.  **Client** sends `code_challenge` with the Authorization Request.
4.  **BasaltPass** stores the `code_challenge`.
5.  **BasaltPass** returns an `authorization_code`.
6.  **Client** sends `authorization_code` AND the original `code_verifier` to the Token Endpoint.
7.  **BasaltPass** verifies that `TRANSFORM(code_verifier) == code_challenge`.

## Implementation Details (Crucial)

BasaltPass has a specific requirement for the `code_challenge` calculation that differs slightly from the standard base64url encoding in some libraries.

### Requirement
-   **Algorithm**: SHA-256 (`S256`)
-   **Encoding**: **Hexadecimal** (Lower case) string.

> **Warning**: Do NOT use Base64Url encoding for the SHA-256 hash. Use Hex encoding.

### Code Examples

#### JavaScript / TypeScript

```javascript
async function generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // Convert buffer to Hex String
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
}
```

#### Python

```python
import hashlib

def generate_challenge(verifier: str) -> str:
    # Use hexdigest(), NOT base64 encoding
    return hashlib.sha256(verifier.encode('ascii')).hexdigest()
```

## Common Errors

-   `invalid_grant`: Often caused by sending a Base64Url encoded challenge or verifier mismatch.
-   `invalid_request`: Missing `code_challenge` when it is required.

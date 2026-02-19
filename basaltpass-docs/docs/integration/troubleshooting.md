---
sidebar_position: 7
---

# Troubleshooting Integration

Common issues encountered when integrating with BasaltPass and how to solve them.

## 1. Redirect URI Mismatch
**Error**: `invalid_grant` or redirection fails.
**Cause**: The `redirect_uri` sent in the `authorize` request does NOT exactly match one registered in the console.
**Fix**: Ensure protocols (`http` vs `https`), ports, and trailing slashes match exactly.

## 2. PKCE Verification Failed
**Error**: `invalid_grant` during token exchange.
**Cause**: Sending Base64Url encoded challenge instead of Hex encoded.
**Fix**: See [PKCE Flow Implementation](./pkce-flow.md) for the correct Hex encoding algorithm.

## 3. CORS Error in Browser
**Error**: Login page or token endpoint blocked by CORS policy.
**Cause**: Your frontend origin is not whitelisted.
**Resolution**: Add your domain (e.g., `http://localhost:8101`) to the **Allowed Origins** list in client configuration.

## 4. Invalid Scope
**Error**: `invalid_scope`.
**Cause**: Requesting a scope that the client is not authorized for.
**Fix**: Check the client settings in the Admin Console and ensure the requested scopes are enabled.

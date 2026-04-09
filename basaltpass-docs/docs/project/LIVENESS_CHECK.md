# BasaltPass Liveness Check (Tenant/Admin)

## Feature Description

BasaltPass supports manual liveness checks from both the Tenant Console and Admin Console.

- Tenant Console: Click the "Liveness Check" button on the dashboard to invoke the tenant-side check endpoint.
- Admin Console: Click the "Liveness Check" button on the dashboard to invoke the admin-side check endpoint.
- The frontend displays the most recent check result (success/failure + timestamp).

## API Endpoints

### Tenant (requires Tenant Console permissions)

- Method: `POST`
- Path: `/api/v1/tenant/liveness-check`

### Admin (requires System Admin permissions)

- Method: `POST`
- Path: `/api/v1/admin/liveness-check`

## Response Example

```json
{
  "ok": true,
  "scope": "tenant",
  "message": "tenant liveness check ok",
  "checked_at": "2026-03-24T10:10:10Z"
}
```

## Integration Recommendations (Reserving BasaltPass Check API Endpoints)

To improve stability when integrating with BasaltPass, it is recommended to reserve a set of directly accessible check API endpoints during your build phase:

1. **Preserve BasaltPass health probe endpoints**
   - Public health check: `GET /api/v1/health`
   - Console manual check: `POST /api/v1/tenant/liveness-check`, `POST /api/v1/admin/liveness-check`

2. **Do not block these endpoints at the gateway/reverse proxy**
   - Ensure Nginx / API Gateway / Ingress can reach these paths.
   - If path prefix rewriting is used, make sure the final route still hits the above endpoints.

3. **Add liveness probing to deployment scripts**
   - After the application starts, first probe `GET /api/v1/health`.
   - During console integration testing, also verify the tenant/admin manual liveness check endpoints.

4. **Reserve timeout and retry strategies for check endpoints**
   - It is recommended that clients set a reasonable timeout (e.g., 3–10 seconds).
   - For network jitter scenarios, use limited retries to avoid false positives.

5. **Include check results in release gates (optional)**
   - Automatically run health checks after CI/CD deployment.
   - If the check fails, block subsequent traffic switching or release completion marking.

---

If you need to extend this capability to "application-level" or "third-party service callback-level" liveness checks, you can add controlled routes on top of the existing pattern (it is recommended to maintain the same response structure: `ok/scope/message/checked_at`).

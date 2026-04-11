# BasaltPass Backend Security Review (DTO Refactor Follow-up)

## Scope

This review was performed after the DTO centralization/refactor and focused on backend code under `internal/**`.

- Target: `basaltpass-backend`
- Primary concern: potential security regressions and pre-existing high-risk issues
- Methods used:
  - Targeted source review of auth, middleware, migration, email, and payment-related code paths
  - Pattern-based grep checks for common risky sinks/sources (`Exec`, `Raw`, `client_secret`, `InsecureSkipVerify`, weak crypto markers)
  - Compile-only validation of touched packages

> Note: full static scanner execution (for example `gosec`) was not available in this environment during this pass.

---

## Findings Summary

| ID | Severity | Status | Area |
|---|---|---|---|
| SR-001 | Medium | Open (config hardening) | S2S auth middleware |
| SR-002 | Low | Fixed | Admin email handler |
| SR-003 | Info | Reviewed / no immediate vuln | Migration SQL/index DDL |
| SR-004 | Info | Reviewed / no secret leak | Mock payment examples |

---

## Detailed Findings

### SR-001: Query-string credential fallback in S2S auth

- Location: `internal/middleware/s2s/chain.go`
- Description:
  - S2S authentication accepts `client_id`/`client_secret` from query parameters **when** `s2s.allow_query_credentials` is enabled.
  - Query credentials are more likely to leak through logs, browser history, reverse proxies, and monitoring systems.
- Current risk posture:
  - Default configuration sets `s2s.allow_query_credentials = false` in `internal/config/config.go`.
  - Risk becomes medium if enabled in staging/production.
- Recommendation:
  1. Keep `s2s.allow_query_credentials = false` in all non-dev environments.
  2. Prefer `Authorization: Basic` or secure headers/form body for machine-to-machine auth.
  3. Add startup warning/fail-fast if query credentials are enabled in production.

### SR-002: Weak recipient presence validation in test email endpoint

- Location: `internal/handler/admin/email/handler.go`
- Description:
  - Validation previously only checked `req.To == " "`, so other empty/blank forms could bypass validation.
- Impact:
  - Input validation weakness (low severity), could lead to noisy failures and reduced defensive robustness.
- Fix applied in this pass:
  - Updated to `strings.TrimSpace(req.To) == ""` and imported `strings`.
- Status: **Fixed**.

### SR-003: Dynamic SQL in index drop helper (migration path)

- Location: `internal/migration/migrate.go`
- Description:
  - `fmt.Sprintf` is used to assemble DDL statements for dropping indexes.
- Assessment:
  - Current call sites use static/internal table/index names, not user-controlled input.
  - No direct SQL injection path identified from request data.
- Recommendation:
  - Keep this helper restricted to internal constants.
  - Do not pass runtime user-derived identifiers into these helpers.

### SR-004: Stripe authorization strings in mock/demo responses

- Locations:
  - `internal/service/payment/service.go`
  - `internal/handler/public/payment/handler.go`
- Description:
  - Strings such as `Bearer sk_test_...` / `Bearer sk_live_...` appear in mock/demo payloads.
- Assessment:
  - No real credentials detected in reviewed code; placeholders only.
- Recommendation:
  - Keep placeholders clearly non-functional and avoid accidental replacement with real keys.

---

## Regression Check for DTO Refactor

No security regressions specific to the DTO centralization were identified in reviewed handler/service paths.

---

## Hardening Checklist (Next Actions)

1. Add a startup guard: refuse `s2s.allow_query_credentials=true` when `env=production`.
2. Run full static analysis in CI (for example `gosec ./...`) and keep reports as build artifacts.
3. Add focused tests for security-sensitive input validation (email endpoint and S2S credential extraction behavior).

---

## Validation Notes

- Compile-only checks were used to verify code health for touched packages where applicable.
- Full runtime security testing (DAST/pentest) was out of scope for this pass.

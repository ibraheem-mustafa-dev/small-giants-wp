# Three-Test Gate for CF Access Bypass (shared pattern)

Used by: `cloudflare-vps-webhook` Stage 6. Can be reused by any skill that routes through a Cloudflare Access path-specific bypass.

## Why three tests

A correctly-scoped bypass must pass ALL three:

1. The intended caller can reach the endpoint.
2. Unauthorised clients are still challenged by CF Access.
3. The whole-domain auth is unchanged.

Missing any of these means the scope slipped. Failures in each test map to a specific fix.

## Test 1 — from the VPS, bypass works

```bash
ssh -i C:/Users/Bean/.claude/secrets/dot-secrets/ibraheem-vps root@72.62.212.169 \
  "curl -sI -X POST https://DASHBOARD_DOMAIN/WEBHOOK_PATH \
    -H 'X-Webhook-Secret: ...' \
    -H 'X-Idempotency-Key: \$(uuidgen)' \
    -H 'Content-Type: application/json' \
    -d '{\"event_type\":\"test\",\"source\":\"manual\",\"timestamp\":1,\"payload\":{}}'"
```

| Result | Meaning | Fix |
|---|---|---|
| `200` | Endpoint reached AND shared-secret correct | PASS |
| `401` | Endpoint reached, shared-secret wrong | Fix the secret, re-test |
| `302` to CF login | **Bypass did not match** — IP wrong, policy shape wrong, or JWT required | Check IPv6, verify `include` array |
| `403` | Source-IP allowlist in Flask handler blocked the caller | VPS IP changed — update ALLOWED_IPS |
| `404` | Endpoint path wrong | Fix WEBHOOK_PATH |
| `422` | Endpoint reached, schema wrong | Match the required payload schema |

## Test 2 — from your laptop, bypass does NOT leak

```bash
curl -sI -X POST https://DASHBOARD_DOMAIN/WEBHOOK_PATH -d '{}'
```

| Result | Meaning | Fix |
|---|---|---|
| `302` to CF login | PASS — Access still protects the path | PASS |
| `200` | **Policy is too permissive — path is public** | Review Stage 2 (was `domain` wrong?) or Stage 3 (IP range too wide?) |
| `401` | Bypass matched on your laptop IP (rare; check you're not on the VPS network) | Narrow the `include` range |

## Test 3 — whole-domain auth still challenges

Open `https://DASHBOARD_DOMAIN/` in a browser.

| Result | Meaning | Fix |
|---|---|---|
| CF Access login page | PASS — whole-domain app untouched | PASS |
| Direct page load (no login) | **Whole-domain app broken** — path-specific app conflicts | Delete the new app, recreate with a more specific `domain` |

## Pass criterion

All three tests must pass before the skill invocation is marked complete. If a run exposes a new, non-obvious failure in how this check works, add it as one line to the calling skill's Common Mistakes section; a project-specific lesson goes to that project's auto memory.

## Regression check

Re-run this gate whenever:
- The VPS IP is suspected to have changed.
- A new Access app is added to the same domain (can conflict).
- A user reports unexpected auth behaviour on the dashboard.

# `/delegate` — Deferred Gaps (backlog)

Gaps worth fixing when a related change lands.

## Open

- **Untested signal rules (B):** `test_route.py` covers every rule except `pii_detected` → inline and `jailbreak_signal` → Sonnet. Fix: add two scenarios.
- **Dormant content signals (C):** `route.py` accepts the content-signal flags, but no detector ships, so the rules fire only when a consumer sets them. Fix: either ship `scripts/detect-signals.py`, or state in each consumer that detection is its job.
- **Fan-out is advisory past the concurrency ceiling (C):** `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS=4` caps subagents running at once, but nothing enforces the per-session soft cap of 12. Fix if sessions keep overshooting: a PreToolUse hook on the Agent tool that counts dispatches per session and warns past the cap.

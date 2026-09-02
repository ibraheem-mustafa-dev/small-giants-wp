# Detector findings — 22 — Placement-rule-surfaces manifest path

**Rule:** `22-placement-rule-surfaces` (`plugins/sgs-blocks/scripts/inspector-scan/rules/22-placement-rule-surfaces.js`)
**Validated:** 2026-09-02, via `/dispatching-parallel-agents` cross-checked against decisions.md, specs, `dev-setup.md`'s tooling catalogue.

**Problem:** `placement-rule-surfaces.json`'s own manifest points at a doc path that doesn't exist on disk (a section label got appended to the path instead of being a proper anchor).

**Effect:** A future reader following this manifest reference hits a dead link — no client-facing impact, pure doc/tooling hygiene.

**Validated count:** 1 genuine finding(s)

## Your call

- [ ] Fix now (this session)
- [ ] Fix later (park it)
- [ ] Not worth it — leave as accepted backlog

**Menu:**
1. **[Recommended] One-line fix** — correct the path in `plugins/sgs-blocks/scripts/inspector-scan/placement-rule-surfaces.json` (or wherever it's declared) to point at the real spec file, with the section as a separate anchor field if the manifest schema supports one.
2. Leave as-is (cosmetic only).

---

### None (1)
- `C:/Users/Bean/Projects/small-giants-wp/.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md PART O` — it was renamed or deleted, so this rule no longer guards it and the drift it would have caught is now invisible.


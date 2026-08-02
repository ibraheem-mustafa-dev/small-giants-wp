---
doc_type: session
project: small-giants-wp
created: 2026-08-02
track: Track 1 — cloning pipeline
---

# Track 1 — Phase 0/1/2 full narrative (swept from LEDGER 2026-08-02)

Swept to keep LEDGER.md under its 24,576-byte cap. Decisions D464, D468–D474 in
`.claude/decisions.md` are authoritative; this is the narrative.

- **⭐ Track 1 — PHASE 0 COMPLETE 2026-08-02 (D464). Phase 1 COMPLETE (D468–**D472**) —
  every converter-load-bearing table rebuilds from git; T1.4–T1.7 all closed.**
  12 commits `78347070`→`2500b3c3`, pushed. **Full narrative swept to
  `memory/session-2026-08-02-track1-phase0.md` — read it before acting.** T1.1 also closed
  same day (D461, `8cdc1460`; evidence `reports/2026-08-02-t1.1-evidence-pack.md`).
  **`--rebuild` from an EMPTY file: exit 0, table set 39/39 IDENTICAL** (12 exact, 10 partial,
  3 real gaps). `scripts/dbschema/` holds schema.sql · sandbox.py · migrate.py+`schema_migrations` ·
  check_schema_drift.py · rebuild_compare.py · wp_reference_archive.py · refresh_wp_reference.py.
  Registers: `plans/phase-0-db-rebuildable.md` (CLOSED) ·
  `plans/2026-08-01-db-derivation-and-converter-cleanup.md` (status block) ·
  **`reports/2026-08-02-phase1-table-classification.md` = Phase 1's measured scope**.
  ⛔ **MIGRATION REPLAY IS A DEAD END — proven.** The rebuild died on `no such table:
  slot_synonyms`: retired for `slots`, so 3 migrations reference a table the schema correctly lacks.
  A May migration cannot run against an August schema. **Void any step premised on replaying
  `migrations/`.**
  ✅ **Regenerative (D470):** `property_suffixes` 154 · `slots` 104 · `excluded_properties` 10 ·
  `roles` 29 · `modifier_suffixes` 19 · `html_tag_to_core_block` 17 · `legacy_role_lookup` 15 — all
  order-exact. **No converter-load-bearing table is unreproducible.** ⚠ ORDER IS LOAD-BEARING for
  `property_suffixes` + `modifier_suffixes` (`ORDER BY rowid`, `LIMIT 1` for the former) — compare-
  first + DELETE + ordered re-INSERT, NEVER `INSERT OR REPLACE`. ⚠ A shrinking seed file PRUNES the
  live DB on next import (cost the `attribution` slot once) — the seeder now warns before it does.
  ✅ **`hooks`/`docs` restored on `--rebuild`** from the committed gzip archive (offline +
  deterministic, NOT the GitHub scrape). ⛔ Do NOT re-register the MCP — the CLI is enough.
  ✅ **D468** `deploy_steps` no longer re-issues the D336 outage recipe (`/sgs-db deploy` reads those
  rows back as INSTRUCTIONS). ⚠ `populate-db.py` is at `~/.agents/…`, **NOT in any git repo** —
  D468 + its `.bak` are the only record. ⛔ Never run the whole script: it also writes `hooks` with
  an `INSERT OR IGNORE` omitting `plugin_slug`.
  ✅ **D469** `variations` retired + dropped. ⛔ **`variant_slots` is NOT affected — one character
  apart, opposite consequences; it feeds `detect_variant` for 5 blocks.**
  ⛔ **Carried, binding:** do NOT delete `scalar-media` or Loop 2 · never delete a migration before
  its seeder is PROVEN · **scope every DB stat to `sgs/%`** · `sgs-card-grid` "cardRadius 12→18px"
  WITHDRAWN as a probe artefact · do NOT alias `trigger`→`tab` · ⛔ do NOT retry the T1.1 Task A
  composite-var classifier fix (1→3 violations, reverted). Conformance **30 fail/20 pass**; suite
  587/1 skip. Bean's 4 settled decisions live in the parent plan.

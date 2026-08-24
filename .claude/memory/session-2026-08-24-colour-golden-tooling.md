---
doc_type: session
track: colour-golden / tooling
date: 2026-08-24
---

# colour-golden / tooling — 2026-08-24 (full narrative)

Swept from `LEDGER.md` to keep it inside its 24,576-byte cap. The LEDGER holds the condensed
status; this is the detail. Nothing here is pending unless the LEDGER section says so.

## ▶ COLOUR-GOLDEN TRACK — 2026-08-24 (Gate A ALIVE · container_kind refreshed · 6 tables traced)

**Plan:** `.claude/plans/2026-08-23-colour-capability-grant-PLAN.md`. Decisions **D761 + D762**.
Commits `2d5cb4e3` · `6eb2814b` · `fccb6ae4` · `e101c279` · `9eb408c1`.

✅ **GATE A IS ALIVE AND GREEN.** Trigger repointed off the directory deleted at D276 and
**PROVEN FIRING** (staged a `converter/` change, watched it run and print `COMMIT BLOCKED`).
The 37 stale goldens are `xfail(strict=True)` via `tests/fixtures/conformance/quarantine.json`;
**no golden content was changed — nothing is blessed.** Now **13 passed, 37 xfailed**.

⛔ **THE RE-SEED IS UNAVAILABLE BY DESIGN — do not re-attempt it.** The seeder demands a LANDED
proof; D554-C rules the converter stays flat with its output gated, so a clone touching an
object-migrated property hard-halts before deploy. **Measured: the Mama's homepage clone produced
97 flat-tier violations and did not deploy.** Bean rejected a shim at D554-C. **Un-quarantining is
a Spec 39 deliverable**, not something this track can force.

⚠ **"37/39" HAS A WRONG DENOMINATOR** — it is 37 fail / 13 pass of **50** tests (39 goldens +
11 others). Only `mamas-munches-homepage__header` and `__footer` pass. Correct it wherever seen.

✅ **`container_kind` REFRESHED (D762).** Root cause: the writer only ever SETS, never clears — a
one-way ratchet, so **NULL means "never written", not "not container-bearing"**. 12 blocks were
wrong in BOTH directions (7 missing, 5 stale-and-unclearable). Now 38 rows, section 8 / layout 17 /
content 13, matching the roster exactly. **Still open: the never-clears writer — the drift recurs
the moment any block stops qualifying.**

⛔ **TWO PROMPT CLAIMS WERE WRONG.** (a) The "`sgs/modal` anomaly" is a NON-ISSUE — modal is
consistent; the stale rows were brand-strip / mega-panel / nav-drawer, stale by ABSENCE.
(b) `wraps_block` is a **hardcoded literal in the SQL**, false for 14 of 38 rows.

⚠ **D762's regression evidence is WEAK, and labelled so.** A before/after emit hash across all
39 fixtures showed zero change — but a negative control (`sgs/hero` section→content) ALSO showed
zero, so the instrument is **insensitive to this input**, not proof of no impact.

✅ **SIX DB TABLES TRACED** — folded into `generate-db-catalogue.py`'s `COLUMN_MEANING`, never
the markdown. `--check` proven able to fail (exit 1 stale → 0 fresh).

⭐ **TWO REAL BUGS FOUND, ONE FIXED:**
- **`design_tokens` shadow typing — FIXED** (`e101c279` + DB correction). Two writers disagreed;
  `enrich-db.py` wrote `token_type='size'` on the strength of a comment claiming the CHECK
  constraint had no `shadow` member — it always had. All 7 `shadow-%` rows now `shadow`;
  `test_outer_box_background_shadow.py` 6 failed → **24 passed**. `shadow-sm/md/lg` are dead slugs
  absent from theme.json (**deletion is Bean's call, not done**); `shadow-glow` is live, was mistyped.
- **`wp_version_indexed` is stale BY CONSTRUCTION — NOT FIXED.** `--wp-version` defaults to
  `WP_VERSION_DEFAULT = "7.0"`, a literal at `sgs-update-v2.py:97` never bumped after the canary
  moved to 7.1. **Every full run re-asserts the wrong value.** `stage_8_drift_gate` would catch it,
  does run, and only `print()`s — its own TODO to wire it into a deploy hook is unactioned and
  **nothing outside `sgs-update-v2.py` calls it**.

**FOSSILS NAMED** (written, read by nothing operational; each confirmed by negative grep):
`fx_effects.reduced_motion`/`editor_story`/`tier`/`created_at` · `design_tokens.css_var`/`description`
· `animation_tokens` (the live `animation.js` hardcodes its own 17-entry vocabulary) ·
`schema_metadata.last_full_refresh_ts`. **`block_selectors` is a PASSIVE MIRROR** — WordPress reads
block.json directly and never consults it; its one reader is a docs generator.

⛔ **`array_item_schema.role` is a SEPARATE 3-value vocabulary** (icon-slug/text-content/url-href).
**Never join it to `block_attributes.role`** (34 values) despite the shared name.

✅ **Rescued:** `scratch/cloning-pipeline-flow-pre-split-backup.md` was **40 days old against a
30-day retention** — already overdue, 141 KB, no counterpart. Copied to `reports/` (`fccb6ae4`,
md5 verified). It holds the ONLY per-stage FILES(R)/FILES(W) data.

### ▶ ALL FIVE TASKS CLOSED — what remains is NOT this track's

✅ **3b — `components` rebuilt as the adoption ledger (D763).** 83 surfaces, 15 with ZERO
adopters, refreshed automatically by `/sgs-update` Stage 1. `getSharedOwnerScan` extracted to
`inspector-scan/core/` so there is ONE resolver with two callers.
✅ **4 — script inputs/outputs.** 71 scripts across both gate chains documented from code.
⭐ **Only 3 of the "6 false headers" were genuinely false** — the other 3 were the generator's
own false positives. The detector needed the correction, not the scripts.
✅ **5 — three READMEs written** for `inspector-scan/` (**333** files), `orchestrator/` (**59**)
and `cheat-gate/` (**29**). Every count is larger than the prompt claimed.

⛔ **DO NOT trust an adoption zero without checking the mechanism.** The one-hop resolver only
sees `<ComponentName` JSX and never recurses into subdirectories, so it reports
fillRow/textRow/borderRow as 0-0-0 when they are **22 / 7 / 0**. Conversely `SgsLinkControl`,
`StateToggleControl`, `SgsLengthControl` and `DeviceTabs` ARE real zeros — checked at every
depth, and `DeviceTabs`' own comments record its consumers being removed 2026-08-19.

### ▶ OPEN, and each belongs to someone

1. **Spec 39's converter rework** — the pacing item. It unblocks cloning (97 flat-tier
   violations today) AND un-quarantines Gate A's 37 goldens. Not this track's to start:
   D554-C deliberately sequenced it after the standard.
2. **The never-clears `container_kind` writer** (D762). Until it recomputes rather than only
   setting, the drift recurs the moment a block stops qualifying.
3. **`WP_VERSION_DEFAULT = "7.0"`** at `sgs-update-v2.py:97` — every full run re-asserts the
   wrong version. `stage_8_drift_gate` catches it, runs, and only `print()`s; nothing calls it.
4. **Orphaned `shadow-sm`/`md`/`lg` slugs** — absent from theme.json. Deletion is Bean's call.
5. **7 F5 baseline keys** still pointing at `orchestrator/converter_v2/convert.py` — the same
   deleted directory that killed Gate A. Same fossil class, different gate.
6. **15 zero-adoption surfaces** now visible in `components` — a migration backlog, not a bug.


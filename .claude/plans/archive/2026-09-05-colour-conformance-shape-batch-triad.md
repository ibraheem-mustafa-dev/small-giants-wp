---
doc_type: plan
title: Colour-conformance — shape-batched remediation, now driven by classify-end-shape.js
created: 2026-09-05
updated: 2026-09-06 — Phase 1 superseded by a rewrite; svg-paint-gradient CLOSED; fill-custom-property-gradient codemod hardened
governs: plugins/sgs-blocks/scripts/colour-codemod/{classify-end-shape,migrate-fill-custom-property-gradient}.js
supersedes: .claude/prompts/2026-09-04-colour-conformance-remaining-8-hard-rows.md (deleted 2026-09-05, was already consumed/historical per LEDGER.md)
---

# Status (read this first — everything below "Original plan" is historical)

**The tool this doc originally called for in Phase 1 — one script that finds, categorises, AND
fixes colour rows — now exists, built by a separate concurrent session between 2026-09-05 and
2026-09-06.** It did NOT extend `survey.js`/`fix.js` as Phase 1 proposed; it replaced their
approach outright with `classify-end-shape.js`, a DB-driven classifier reading each row's REAL
`css_property` (via `block_attributes.css_property`, not a hand-maintained bucket-letter
taxonomy) against 12 named end-shapes (`plugins/sgs-blocks/CLAUDE.md`'s "Colour EMISSION
helpers" / "Known precedent-function registry" sections are the canonical shape definitions —
read those, not the Bucket A-F table below, which is now historical only).

**Full current census (run 2026-09-06):** `node classify-end-shape.js --json` — **136 rows
across 7 populated end-shapes** (5 more exist in the enum with 0 rows this run):

| end-shape | rows | status |
|---|---:|---|
| `text-gradient` | 38 | open — next category to take |
| `fill-custom-property-gradient` | 37 (was counted 36 before a manifest fix reclassified 1 row in) | 2 rows fixed this session; 35 open |
| `text-gradient-needs-bg-layer` | 25 | open |
| `fill-base-hover-flat` | 17 | open |
| `border-base-hover` | 15 | open |
| `svg-paint-gradient` | 1 (was counted 2 until a stale manifest entry was fixed) | **CLOSED 2026-09-06** |
| `per-item-loop` | 2 | open |

**This session (2026-09-06) closed:**
- **`svg-paint-gradient`, the FULL category (1 row):** `before-after.handleIconColour` converted
  from a bespoke hand-rolled SVG to the shared `IconPicker`/Lucide + `sgs_svg_stroke_gradient()`
  mechanism 11 other blocks already use. The category's OTHER apparent row,
  `timeline.connectorFillColour`, turned out to be a misclassification —
  `timeline/block.json`'s attrMap wrongly claimed `"css:stroke"` when every real CSS consumer is
  `background-color`/border/composed-gradient (zero real `stroke:` sites). Fixing that manifest
  entry reclassified it into `fill-custom-property-gradient`, where it belonged all along. Commit
  `e8d296bf9`.
- **`fill-custom-property-gradient` codemod hardening + 2 rows fixed:**
  `migrate-fill-custom-property-gradient.js`'s CSS-consumer regex required a fallback default
  inside `var(...)` — real, plain `background-color:` sites with no fallback (exactly
  `timeline`'s 3 fill sites) were invisible to it. Widened, with a negative control confirming
  `business-info.linkHoverBackgroundImage`'s composed-gradient-colour-stop shape still correctly
  refuses. Also added a second edit.js detection path for a bare `DesignTokenPicker` row
  (`before-after.dividerColour`'s real shape — confirmed common across many other rows in this
  category too, not a one-off), and fixed a pre-existing bug in the ALREADY-WORKING detection
  path along the way (its regex stopped at the first comma inside `label: __('Normal', ...)`).
  Ran for real on exactly `before-after.dividerColour` + `timeline.connectorFillColour` — no
  scope creep to the other 35 rows. Commit `0fd0f8f66`.
- **`business-info` link/hover/attribution — a real design flaw, NOT a codemod row.** Bean
  spotted by reading the actual controls that `linkHoverBackgroundImage`/`linkHoverTextColour`
  painted nothing for the phone/email links they appeared under (their real target was the
  unrelated "Powered by SGS" credit-line hover sweep, gated behind the wrong `displayType`), that
  `linkPhone`/`linkEmail` toggles had no real use case, and that the "What to display" dropdown
  silently misreported "Phone Number" for attribution instances. All three fixed by hand — this
  was never going to be a `classify-end-shape.js` row because the bug was in WHERE the controls
  were exposed, not in the CSS-emission mechanism. Commit `15237d85a`.
- Shared DB-reseed artifacts (`attr-role-map.json`, `roster.json`) regenerated after the above
  block.json changes. Commit `0e511be6d`.
- All 4 commits merged to `main` via PR #43 (`1eb344ad0`), live-verified on the sandybrown canary
  (gradient rendering + negative controls for both fixed rows, plus business-info's phone/email/
  attribution behaviour).

**Bean's directed cadence going forward: one end-shape category per session**, not a rush to
clear all 136 rows. `text-gradient` (38 rows) is next in line, no ordering requirement beyond
that stated preference.

# Method learnings from this session (see also the session's own reply on this)

1. **A prior session's summary handoff is not ground truth — the classifier had drifted from the
   real code.** The prompt this session opened from named ~7 specific rows across 3 blocks as
   "what's left." Running `classify-end-shape.js` fresh found the real scope was 136 rows / 7
   categories, and that 5 of those 7 named rows were themselves misclassified by the tool's OWN
   stale manifest data. Always re-run the census live rather than trusting a cached row list,
   however recent it looks.
2. **A classifier's shape match is only as good as the manifest data it reads — verify against
   the REAL CSS, not just the tool's output.** `svg-paint-gradient`'s apparent 2nd row existed
   purely because one block.json attrMap entry said `"css:stroke"` when the block never emits a
   `stroke:` rule anywhere. The tell was in the ATTRIBUTE NAME itself
   (`connectorFillColour` — "fill" already says background, not stroke) before any code was even
   read.
3. **A codemod's per-row refusal reason is a hypothesis to verify, not a verdict to trust.**
   Two rows refused with the identical error string (`no-style-css-consumer-found-for-custom-
   property`) for OPPOSITE reasons — one was a real detector limitation (missing-fallback-default
   regex), the other was a structurally correct refusal (a composed-gradient colour-stop, not a
   plain consumer). Reading the actual CSS for both, rather than trusting the refusal string
   alone, is what told them apart.
4. **Widen the codemod, don't hand-patch the row, when the bug is in the tool.** Both fixes this
   session (missing-fallback-default regex, `DesignTokenPicker` row detection) were shipped as
   detector widenings verified against the WHOLE row set via `--survey`, not as one-off patches
   for the two target rows — matching this project's own no-carve-out rule, and setting up the
   next category's session to benefit for free.

# Original plan (2026-09-05, historical — Phase 1's mechanism was superseded, see Status above)

**Problem (as understood 2026-09-05):** this session opened from a copy of the "8 genuinely hard
rows" dispatch prompt. Two read-only investigation agents verified every file:line citation in it
before any code was touched. Result: the prompt was stale — `LEDGER.md` already recorded it as
"FULLY CLOSED — D964 ... consumed/historical", but the file itself had never been deleted.
Deleted 2026-09-05.

**Shape buckets (from the live `fix.js --fix` run, 52 refused rows — HISTORICAL, superseded by
the `classify-end-shape.js` END_SHAPES table in Status above):**

| Bucket | Shape | Outcome |
|---|---|---|
| A — `no-explicit-normal-state` | Hover-only, no sibling normal-state attr | Reclassified EXEMPT |
| B — `standalone-DesignTokenPicker-row-shape-not-supported` | Raw `DesignTokenPicker` row | Superseded — `migrate-fill-custom-property-gradient.js` now has this detection path (2026-09-06) |
| C — `no-sgs_resolve_text_colour_or_gradient-call-for-attr` | post-grid/product-card text rows | Folded into `text-gradient` end-shape, still open |
| D — `gradient-no-attribute-assignment-found` | nav-menu/post-grid/product-card/tabs | Folded into `fill-custom-property-gradient`/other end-shapes, still open |
| E — `fill-gradient-value-not-directly-embedded` | mega-panel/option-picker | `option-picker.pillBgColour` closed separately (D964); mega-panel's slug-derivation shape still needs its own read before any fix |
| F — `gradient-path-deferred` (text) | product-card picker rows | Folded into `text-gradient-needs-bg-layer`, still open |

# Verification (still current)

- After every category's fixes: re-run `node classify-end-shape.js --json` — the fixed category's
  row count should drop to what remains genuinely unfixable (documented, not silently dropped).
- `npm run gate:fast` + `node scripts/check-text-gradient-companion.js --check` +
  `node scripts/check-element-manifest-conformance.js --check` after any block.json/render.php
  change.
- Path-scoped commits only, branch re-checked immediately before each one.
- Deploy only after coordinating via `ListAgents` — this tree runs concurrent sessions (proven
  live this session: a separate tier-object migration was actively editing ~40 other blocks'
  block.json files in the same working tree while this work was in flight).

# Detector findings — index (validated + partly fixed, 2026-09-02)

Every detector reporting findings, validated against decisions.md / the specs /
`dev-setup.md`'s tooling catalogue before its count was trusted — the discipline that caught
`scattered-element-controls.js` producing ~600 false positives earlier the same day.

**Six fixes already landed** (commit `06497afac`). What remains below is real work for you to
direct.

---

## ✅ Closed this session — no action needed

| Detector | Was | Now | What happened |
|---|---|---|---|
| `dead-api-calls` | 253 | **0** | All 96 names were real WP/WC functions; promoted to the allowlist (321→417). **Also promoted to a hard `prebuild` (fast-tier) gate 2026-09-02 — no longer advisory.** [Report](2026-09-02-findings-dead-api-calls.md) |
| `23-content-width-needs-inner-band` | 1 | **0** | Detector bug: comment-stripper read a `/*` inside a `//` comment as a block comment, blanking ~50KB of `hero/render.php`. Order fixed. |
| `26-responsive-duplicate` | 2 | **0** | Both were the sanctioned Spec 35 Part D5 art-direction shape. Exemption added, with a paired negative-control fixture proven non-vacuous. |

---

## ✅ Closed 2026-09-02 (part 3) — the decide-first batch below

All four items in this table are now CLOSED — see `.claude/decisions.md` D919 for the full
account, and `.claude/prompts/2026-09-03-detector-backlog-continuation.md` for what's still open.
Kept here for the historical count/shape record, not as an active menu.

| Report | Count | What it needed | Status |
|---|---|---|---|
| [07-preset-only-shadow](2026-09-02-findings-07-preset-only-shadow.md) | 1 | Swap `site-header`'s shadow dropdown for the shared `ShadowControl` | ✅ Done (`79c910d2f`) |
| [22-placement-rule-surfaces](2026-09-02-findings-22-placement-rule-surfaces.md) | 1 | A manifest path typo — no code change | ✅ Done (`2cc9cbc56`) |
| [34-declared-attr-unrendered](2026-09-02-findings-34-declared-attr-unrendered.md) | 7 | Investigated further — 5 were real resolver false positives (3 fixed), 2 are legitimate cloning-pipeline anchors (now exempted, not deleted) | ✅ Done (`2cc9cbc56` + a3065f47969ac follow-up) |
| [border-control-migration](2026-09-02-findings-border-control-migration.md) | 4 blocks | 1 easy swap (`media`), 3 bigger migrations (card-grid / multi-button / trust-bar) | ✅ `media` done (`2cc9cbc56`, was already correctly wired via its atom composition, no swap needed) — 3 blocks remain open |

## Real backlog — needs your direction on approach

| Report | Count | Notes |
|---|---|---|
| [03-dense-panel-candidate](2026-09-02-findings-03-dense-panel-candidate.md) | 13 | A template exists — `team-member`'s approved ToolsPanel pilot. Apply it 13 more times |
| [18-decorative-image-aria](2026-09-02-findings-18-decorative-image-aria.md) | 16 (15 real) | Accessibility; naming (`{element}Decorative`) already settled, ready to bulk-script |
| [21-render-without-control](2026-09-02-findings-21-render-without-control.md) | 68 (**54 real + 14 new, unrelated, not yet triaged**) | The 51 (turned out to be 46) residual false positives from the 1-arg-literal wrapper shape are **now closed** — the detector learned to trace the wrapper indirection structurally, without the over-suppression risk that blocked a generic fix. A live re-scan also surfaced 14 new findings on `sgs/hero`/`sgs/media`/`sgs/testimonial-slider` (framework grew those attrs since this report was written) — listed in the report's appendix, not yet validated |
| [37-media-no-handroll](2026-09-02-findings-37-media-no-handroll.md) | 71 | Genuine atom-migration backlog, now with the false positives gated out |
| [01-tab-group](2026-09-02-findings-01-tab-group.md) | 57 | Real, but the check is a coarse proxy (tests for a `group=` prop, not real TIER 1/2 restructuring) — verify any "fix" by eye |
| [31-golden-colour-control](2026-09-02-findings-31-golden-colour-control.md) | 277 | The big one. Scope already ruled (D752); most of it is blocked on a capability-grant design pass (D754), not hand-fixable row by row |

---

## ✅ RESOLVED 2026-09-02 — what does "baselined" mean?

Raised by Bean 2026-09-02, verified against all 35 baseline files: **"baselined" conflated at
least two opposite meanings**, with no machine-readable field separating them. Two entries, two
files, identical shape under the same `accepted` key — `sgs/before-after.afterImageAlt` ("fully
unused", a real problem) and `sgs/accordion-item.textColour` ("BOTH — Bean's ruling 2026-08-21",
correct by design) — were indistinguishable without reading prose.

**Fix shipped same day:** a required `disposition` field, closed vocabulary — `by-design` /
`accepted-debt` / `detector-limitation` / `blocked` — back-filled across all **360** entries in
the 8 non-empty baseline files (the "~165" figure above had drifted; the real count is more than
double). "Resolve all violations including baselined ones" is now a runnable filter, not 360
prose judgement calls.

| Disposition | Count |
|---|---|
| `accepted-debt` | 222 |
| `by-design` | 104 |
| `detector-limitation` | 31 |
| `blocked` | 3 |

**⚠ New decision needed: the 31 `detector-limitation` entries.** The project's own rule says *"a
false positive is a DETECTOR BUG, never baseline fodder"* — so every one of these 31 is already a
rule violation sitting in a baseline, not a normal outcome. They span 3 files/checks:

- `block-file-consistency-baseline.json` (12): `sgs/decorative-image.fx` (the `fx` extension
  family isn't caught by the exemption regex); `sgs/product-card` ×4 dynamic-key font-family
  attrs; `sgs/hero` ×7 dynamic-key gradient/object-position attrs.
- `editor-render-parity-baseline.json` (15): 7× form-field `fieldName` (cross-file consumption
  blind spot), `sgs/post-grid` transition attrs, `sgs/form-field-file.allowedTypes` (sprintf
  blind spot), `sgs/icon-list.renderLandmark`, `sgs/image-sequence.thumbnailAlt`,
  `sgs/site-header` `headerShrink`/`headerHideOnScroll` (named as needing a future 5th
  structural signal), `sgs/tabs.blockLabel` (sprintf blind spot).
- `hardcoded-render-defaults-baseline.json` (4): `sgs/card-grid`/`pricing-table`/`process-steps`/
  `team-member` — the same "resolves through `sgs_colour_value()`, gate's `isLiteralConstant()`
  doesn't recognise a token slug as var()-bound" false-positive class, all one fix.

None of these were fixed as part of the disposition pass — flagging them is what the pass was
for. Bean's call: fix each detector (per the project's own rule), or accept the baseline entries
as a documented, bounded exception to it.

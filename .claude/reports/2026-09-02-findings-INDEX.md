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
| `dead-api-calls` | 253 | **0** | All 96 names were real WP/WC functions; promoted to the allowlist (321→417). [Report](2026-09-02-findings-dead-api-calls.md) |
| `23-content-width-needs-inner-band` | 1 | **0** | Detector bug: comment-stripper read a `/*` inside a `//` comment as a block comment, blanking ~50KB of `hero/render.php`. Order fixed. |
| `26-responsive-duplicate` | 2 | **0** | Both were the sanctioned Spec 35 Part D5 art-direction shape. Exemption added, with a paired negative-control fixture proven non-vacuous. |

---

## Decide first — smallest effort, clearest fix

| Report | Count | What it needs |
|---|---|---|
| [07-preset-only-shadow](2026-09-02-findings-07-preset-only-shadow.md) | 1 | Swap `site-header`'s shadow dropdown for the shared `ShadowControl` |
| [22-placement-rule-surfaces](2026-09-02-findings-22-placement-rule-surfaces.md) | 1 | A manifest path typo — no code change |
| [34-declared-attr-unrendered](2026-09-02-findings-34-declared-attr-unrendered.md) | 7 | **Nothing.** All 7 already explained and correctly tracked — informational only |
| [border-control-migration](2026-09-02-findings-border-control-migration.md) | 4 blocks | 1 easy swap (`media`), 3 bigger migrations (card-grid / multi-button / trust-bar) |

## Real backlog — needs your direction on approach

| Report | Count | Notes |
|---|---|---|
| [03-dense-panel-candidate](2026-09-02-findings-03-dense-panel-candidate.md) | 13 | A template exists — `team-member`'s approved ToolsPanel pilot. Apply it 13 more times |
| [18-decorative-image-aria](2026-09-02-findings-18-decorative-image-aria.md) | 16 (15 real) | Accessibility; naming (`{element}Decorative`) already settled, ready to bulk-script |
| [21-render-without-control](2026-09-02-findings-21-render-without-control.md) | 105 (**54 real**) | 51 residual false positives remain from a 1-arg-literal wrapper shape — deliberately not fixed, as a generic pattern would over-suppress tree-wide. **Only the 54 are listed** |
| [37-media-no-handroll](2026-09-02-findings-37-media-no-handroll.md) | 71 | Genuine atom-migration backlog, now with the false positives gated out |
| [01-tab-group](2026-09-02-findings-01-tab-group.md) | 57 | Real, but the check is a coarse proxy (tests for a `group=` prop, not real TIER 1/2 restructuring) — verify any "fix" by eye |
| [31-golden-colour-control](2026-09-02-findings-31-golden-colour-control.md) | 277 | The big one. Scope already ruled (D752); most of it is blocked on a capability-grant design pass (D754), not hand-fixable row by row |

---

## ⚠ Open question that affects all of the above: what does "baselined" mean?

Raised by Bean 2026-09-02, verified against all 35 baseline files: **"baselined" currently
conflates at least two opposite meanings**, with no machine-readable field separating them.

Two entries, two files, identical shape under the same `accepted` key:

- `sgs/before-after.afterImageAlt` — *"fully unused"* → a **real problem**, deferred.
- `sgs/accordion-item.textColour` — *"BOTH — Bean's ruling 2026-08-21"* → **not a problem**, correct by design.

Only 8 of 35 files carry a `reason` field at all, and it is free-text prose. The single
`category` field that exists describes effect type (`scale`/`shadow`), not disposition, and is
null on 17 of 25 entries. There are four separate mechanisms in play (baseline `accepted` arrays,
`openBacklog` ratchet numbers, semantic allowlists like `EDITOR_ONLY_ATTRS`, and
deliberately-left-unbaselined findings) with no shared vocabulary.

**Why it matters here:** "resolve all violations including baselined ones" is not currently a
runnable instruction — you cannot tell which baselined entries are debt and which are by-design.

**Proposed fix:** a required `disposition` field, closed vocabulary — `by-design` /
`detector-limitation` / `accepted-debt` / `blocked` — back-filled across the ~165 entries in the
8 non-empty baseline files. Then the work list is a filter, not 165 prose judgement calls.

Note the project's own rule already says *"a false positive is a DETECTOR BUG, never baseline
fodder"* — so any `detector-limitation` entry found during that pass is already a rule violation,
which makes the triage itself worth doing.

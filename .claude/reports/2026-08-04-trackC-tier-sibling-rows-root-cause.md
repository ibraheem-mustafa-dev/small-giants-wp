# Track C — Tier-Sibling `css_property`/`css_tier` NULL Rows: Root-Cause Investigation

**Date:** 2026-08-04. **Scope:** `sgs/%` only. **DB access:** read-only (SELECT only, no seeder/reseed run).

## Summary of the four answers

1. **Mechanism: DERIVED, not cached — the NULLs are correct-by-design.** The CSS-property routing resolver (`plugins/sgs-blocks/scripts/converter/db/db_lookup.py`) explicitly resolves a tier sibling's `css_property` **at read time** from its BASE attribute, then string-appends the DB breakpoint suffix (`Mobile`/`Tablet`/`Desktop`) to build the sibling's attr name. It does not, and structurally cannot, read the sibling row's own `css_property`/`css_tier` columns for this purpose — `declared_attrs_for_css_property(..., base_only=True)` deliberately **excludes** rows with `css_tier IN ('mobile','tablet')` (docstring, line ~1290: *"Tier siblings are re-appended by step 4... per Spec 31 §3.A step 4/4a"*). The seeder-side check (`db-consistency/check_css_property_reseed.py`) independently confirms these columns are DERIVED-on-reseed from two channels (classifier + override), never a bare `UPDATE`.
2. **Denominator + verified count: 145 confirmed, out of 238 eligible — NOT 554, NOT the whole table.** Full chain: 2,464 `sgs/%` `block_attributes` rows total → 554 carry a `Mobile`/`Tablet`/`Desktop` name suffix → 339 of those have a matching base-attr row on the same block → 238 of those 339 have a base row with `css_property` populated (the only ones where "should the sibling inherit?" is even a live question) → of those 238, **exactly 145** have both `css_property` AND `css_tier` NULL on the sibling (the remaining 93 already carry their own `css_property`). **145/238 verified exactly matches the inherited figure — it is correct, but only against the 238 denominator, not 554 or 339.**
3. **Mobile-parity link: REFUTED.** Traced the live parity artefact `pipeline-state/mamas-munches-homepage-2026-08-04-154529/computed-parity.json` at 375px: of 35 `font-size` mismatches, essentially all are the identical pair **draft `16px` → clone `14px`**, and of 36 `line-height` mismatches nearly all are **draft `26px` → clone `22px`** — occurring uniformly across unrelated blocks/tags (`p.sgs-text`, `p.wp-block-sgs-quote__attribution`, `div.sgs-hero__content`, `img` tags, `div.sgs-trust-bar__badge`, `div.sgs-product-card__body`…). A uniform shift identical across img tags (which have no own font-size, only inherited) and across completely unrelated composite blocks is the signature of a **global inherited base-font/line-height token mismatch** (theme-level root/body value), not a per-block responsive-attribute routing failure. If the 145 NULL tier rows were the cause, the affected set would be scoped to the ~12 rows whose base `css_property` is `font-size`/`line-height` (8 + 4, see below) and would differ between the 375 and 768 breakpoints (since Mobile vs Tablet are different attrs/rows) — instead the SAME 16px→14px / 26px→22px pair appears near-identically at BOTH 375 and 768, and drops away almost entirely at 1440 (7 font-size / 5 line-height, and those remaining desktop diffs are a different, unrelated 13px-vs-14px pill/button mismatch). That breakpoint-invariant, block-invariant signature is inconsistent with "missing tier attr on specific blocks" and consistent with a shared base-token difference. **I could not identify the actual root cause of the 16px→14px base shift** (out of scope for this investigation — it is not the tier-sibling defect); I can only state the 145-row hypothesis does not explain it.
4. **End condition: this is a REFINEMENT/no-op clarification of the EXISTING architecture, not a new fix requirement — and the risk is someone "fixing" the NULLs by mistake.** Proposed enforceable condition (already effectively encoded, but not documented as a rule anywhere central): *"A tier-suffixed `block_attributes` row (`css_tier` NULL, name ending `Mobile`/`Tablet`/`Desktop`) MUST NOT be seeded with its own `css_property`/`css_tier` UNLESS it diverges from its base attribute's resolved property (e.g. a sibling that legitimately maps to a different CSS property than its base) — the resolver at `db_lookup.py::declared_attrs_for_css_property`/`attr_for_property` derives it from the base row at read time by design, and populating it is redundant, not a bug."* This is **not** item 1–21/T1–T3 of `.claude/plans/spec-35-inspector-DONE-checklist.md` — that checklist governs inspector-control UX (tab structure, colour pickers, units, box-families), not the DB CSS-routing columns; none of its 24 items reference `css_property`/`css_tier` population. The natural home is `db-consistency/check_css_property_reseed.py`, which already tests the DERIVED-column invariants (checks A/B/C/D) but has **no check that a NULL tier sibling is expected-NULL** — it currently only flags rogue non-NULL values, never validates the NULL side. **Blind spots of this proposed rule, stated explicitly:** (a) it assumes the base row's own `css_property` is correct — if the base is wrong, the tier sibling silently inherits the same wrong routing, and no check catches that; (b) `db_lookup.py` itself documents (line ~5439, dated 2026-08-03 — one day before this investigation) that **331 of the 339 base/tier pairs are "one reclassification away"** from a real defect: if a base attr and its tier sibling are EVER given asymmetric `role` classifications (base reclassified, sibling not, or vice versa), the tier-exclusion logic can fail and the Mobile/Tablet attr can wrongly compete for/win the base lookup by rowid — this is a live, already-flagged fragility, not something this session discovered fresh; (c) this investigation checked only `css_property`-routed (CSS-layer) resolution; it did NOT check whether the CONTENT-router (`content_attr_for_element`) or any other consumer treats these NULLs differently — that code path was read (same file, ~line 5360) and uses the same base-then-suffix derivation, but was not independently traced end-to-end on a live block, so treat that as inferred-consistent, not proven-consistent.

## Denominator breakdown (verification queries, all `sgs/%`-scoped)

| Step | Count |
|---|---|
| Total `sgs/%` `block_attributes` rows | 2,464 |
| Rows with a `Mobile`/`Tablet`/`Desktop` name suffix | 554 |
| ...of those, with a matching base-attr row on the same block | 339 |
| ...of those, base row has `css_property` populated | 238 |
| ...of those, sibling has `css_property` NULL AND `css_tier` NULL | **145** |
| ...of those 238, sibling `css_property` NULL but `css_tier` NOT NULL (partial-NULL) | 0 |

145/238 = 61%. The prior audit's "145" figure is numerically correct but was reported without ever stating the 238 denominator, and (per point 4 above) was also reported as if it were a defect count rather than an expected-by-design count.

### Where the 145 NULLs actually sit (by base `css_property`)

```
grid-template-rows     30
gap                    29
grid-template-columns  28
width                  12
max-width              12
min-height              8
font-size               8
line-height             4
letter-spacing          4
top                     2
padding                 2
margin-top              2
left                    2
border-width            2
```

Only 12 of the 145 (8 font-size + 4 line-height) are even candidate contributors to the font-size/line-height mobile-parity gap the trap describes — far fewer than the 35 font-size / 36 line-height live mismatches, which is itself evidence against the link before even looking at the artefact (established the denominator issue independently, then confirmed via the actual diff data in point 3).

## What I could NOT determine

- The actual root cause of the uniform 16px→14px / 26px→22px base-font shift at mobile/tablet. This looks like a theme-level root font-size or a viewport-based clamp/fluid-type token mismatch between the draft's authored CSS and the clone's `theme.json`/theme-snapshot, but I did not trace it — it is out of this investigation's scope (I was asked to prove or refute the *tier-sibling-NULL* link, which I did; finding the real cause is separate work).
- Whether the content-router (`content_attr_for_element`) resolves tier siblings identically to the CSS router in a LIVE clone run (read the code, did not execute/observe it against a real page for this session, per the read-only DB constraint plus time budget).
- Whether any of the 145 rows are in the "331 of 339 one-reclassification-away" fragile set specifically (would need to cross-reference `role` values row-by-row against `db_lookup.py`'s exclusion logic — not done this session).

## Files read (no files written except this report)

- `plugins/sgs-blocks/scripts/db-consistency/check_css_property_reseed.py`
- `plugins/sgs-blocks/scripts/converter/db/db_lookup.py` (lines ~1140–1400, ~2340–2410, ~5360–5460)
- `.claude/plans/spec-35-inspector-DONE-checklist.md`
- `pipeline-state/mamas-munches-homepage-2026-08-04-154529/computed-parity.json`
- DB queries via `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "..."` (SELECT only)

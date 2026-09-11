# Spec 41 — QA-5 / qc-council #2 verdict (Step 10)

**Scope:** Step-9 manifest rewrite (`bb9df82dc`) to `plugins/sgs-blocks/src/blocks/nav-menu/block.json`
(79→132 attributes, 12 deletions, ~40 net-new). Highest blast-radius gate in the phase — nothing in
Wave B may start until this passes. Council mandate run as a direct empirical investigation in this
session (no `/qc-council` subagent panel spawned — disclosed per the task's own fallback clause).

## Council findings

**1. Every one of the 12 deleted attributes is still read live** — `edit.js` (destructured +
consumed by `ItemsPanel.js`, `UnderlinePanel.js`, `EffectsPanel.js`, `DropdownStylePanel.js`) and
`render.php` (full rendering logic for `hoverStyle`/`underline*`/`itemRadius*`/`indicatorStyle`/
`indicatorColour*`/`submenuRadius`) still reference all 12 names verbatim. This is **expected, not a
defect**: step 9's own brief explicitly forbade touching `edit.js`/`render.php`/`style.css` ("Do NOT
edit edit.js, render.php or style.css") — that rewiring is Wave B's job. But it means **the block is
currently in a broken interim state on `main`**: the editor mounts controls for 10 undeclared
attributes (WP drops them silently from the schema — `getBlockAttributes()` won't expose them, and
any in-session edit will not survive a reload), and `render.php` still branches on `indicatorStyle`/
`hoverStyle` reading values that can never again be written through the UI. **This must not be
deployed to the sandybrown canary until the corresponding Wave B step rewires `edit.js`/`render.php`
to the new attribute model** — flagging this explicitly for whoever picks up Wave B; it is not this
gate's job to fix.

**2. Type/default consistency across new attribute siblings** — checked every base/hover/current
trio the spec flags as risk-prone (`itemTextDecoration`/`Hover`, `itemTextTransform`/`Hover`,
`itemFontWeight`/`Hover`/`Current`, the `submenu` trio, all border-colour and marker/gradient
attributes). All are internally consistent with §8.4's stated asymmetry: base `itemTextDecoration`/
`itemTextTransform` keep real JSON `enum`s (existing attributes, unrestructured); every new state
sibling is a plain `"type":"string"` with no enum, PHP-validated only, matching the spec's explicit
instruction. No drift found.

**3. Element-state collision risk** — none found beyond what G4 already tests (see below).

## The three flagged items — settled, not deferred

**Item 1 — `submenuBorderColourGradient` and `sublinkMarkerColour`: REAL GAPS, now fixed.**
Read §8.4 (both declared as real, functional attributes — not withdrawn, not out-of-scope) and
§8.5(3)/§9.6/line 445/line 209 (submenu panel border deliberately keeps a gradient, unlike the item
border) and §8.6(c) (submenu-panel's attrMap listed 7 members, omitting the gradient). Confirmed via
a grep across ~20 other blocks that `css:border-color-gradient` is the established routing key for a
border-colour gradient sibling (`accordion`, `button`, `card-grid`, `container`, etc.), and
`css:fill` is the established key for an icon/glyph colour (`sgs/star-rating::starColour`
precedent). Both attributes were genuinely unroutable before this fix — a real manifest gap, not an
intentional omission. **Fixed** (2-line addition, narrowly scoped, same file step 9 touched):
- `submenu-panel.attrMap["css:border-color-gradient"] = "submenuBorderColourGradient"`
- `sublink.attrMap["css:fill"] = "sublinkMarkerColour"`

Verified post-fix: JSON valid, `audit:element-manifest` clean, `placement-reach.py` reports zero
CONTESTED attributes on `nav-menu`.

**Item 2 — the `indicator` element's fate: CORRECT AS BUILT, keep the element.**
FR-41-25 states the Highlight treatment folds `indicatorStyle:'pill'` into
`itemBgHoverTreatment==='highlight'`, painting from the item Background row's own Hover swatch
(`itemBgHover`/`itemBgHoverGradient`) rather than a standalone indicator-colour pair — this is
explicit at spec lines 1813, 2629-2630, 3086-3287. The step-9 agent's choice — keep the `indicator`
element (it is still a real rendered node, `.sgs-nav-menu__indicator`), empty its `attrMap`, and
rewrite its `_note` to explain it paints via `item.states.hover` rather than its own attributes — is
exactly what §8.6(a)'s pattern for the `indicator` `colourExemptions` entry already documents, and
matches `clusters:["fill"]` being retained (not `[]`) so the forward-resolution pass still visits it
honestly as a gap rather than silently. Deleting the element outright would be wrong: the spec's
§8.3 delete list only names the three attributes, never the element, and the element still exists in
markup.

**Item 3 — gate-state disclosures: BOTH VERIFIED TRUE.**
- `SGS_VISUAL_GATE_SKIP=nav-menu` ("render.php/edit.js/style.css untouched by this commit"):
  confirmed via `git show bb9df82dc --stat` — the commit touches exactly one file,
  `plugins/sgs-blocks/src/blocks/nav-menu/block.json`. True.
- `SGS_F5_SKIP=db-consistency/run.py` ("all 12 findings are pre-existing `sgs/nav-drawer`
  `variant_slots` staleness, unrelated to this commit"): confirmed by running
  `python plugins/sgs-blocks/scripts/db-consistency/run.py` AFTER the reseed this step performed —
  it now reports **`[F6] All checks passed — 0 violations.`** The pre-reseed 12 findings were staleness
  in the derived DB (a known artefact of a manifest change before `/sgs-update` runs), not real
  defects; running the reseed cleared them, corroborating the disclosure.

## Gate results (post-fix, post-reseed)

Reseed command run: `python plugins/sgs-blocks/scripts/sgs-update-v2.py` — completed clean (exit 0).
Reported 3 "unexpected" (not gated) metric swings — `block_attributes` +145, `block_attributes.role`
+102, `components` +5 — all consistent with a 53-attribute net manifest change plus the role-map
regeneration below; nothing indicates a stray writer.

| Gate | Result |
|---|---|
| **G11** — `SELECT COUNT(*) … css_element='underline'` | **0**. PASS. |
| **G4** — 18 typography triples, `(css_property, css_element, css_state)` | All **18 distinct**. `itemFontWeight` base row confirmed present at `css_state=NULL` (the highest-risk one, per the gate's own warning). PASS. |
| **G12a** — `npm run audit:element-manifest` | Initially **FAILED**: `orphan_unclassified=4` (`itemColourHoverTreatment`, `itemBgHoverTreatment`, `itemBorderHoverTreatment`, `burgerBgHoverTreatment` — the exact behaviour-selector attrs step 9's own commit message flagged and pre-disclosed as "cleared by the reseed plus `generate-attr-role-map.py`, which is step 10"). Ran `python plugins/sgs-blocks/scripts/generate-attr-role-map.py` (regenerates `attr-role-map.json` from the DB) — re-ran the gate: **exit 0, clean.** PASS (after the disclosed follow-up ran). |
| **G12b** — `placement-reach.py --block nav-menu` | **Zero CONTESTED attributes** for `nav-menu` (note: the plan's literal command used `--block sgs/nav-menu`, which silently matches nothing — the script's slug is the bare directory name, `nav-menu`, not the `sgs/`-prefixed form; re-run with the corrected argument). Also verified `supports.sgs.sweepEligibility` name-by-name: all attribute names in the three rows' `blockingBackgroundAttrs`/`blockingGradientAttrs`/`glyphGuard.attr` resolve to real declared attributes, and all three row keys are declared `…HoverTreatment` string attributes. PASS. |

## Verdict: **GO**, with one mandatory precondition for Wave B

The manifest itself — the thing this gate exists to certify — is correct: DB routing is
collision-free (G4), the deleted element is fully purged (G11), and the manifest is
conformance-clean with no ambiguous/contested attribute placement (G12), after one real gap (the two
missing attrMap entries) was found, fixed, and re-verified, and one disclosed follow-up
(`generate-attr-role-map.py`) was run to close the orphan-classification gate exactly as step 9's own
commit predicted it would need to be.

**Non-blocking but load-bearing finding for whoever starts Wave B:** `edit.js` and `render.php` still
reference all 12 deleted attribute names. This is the deliberate, disclosed sequencing of steps
9→10→Wave B, not a regression — but it means the block is presently in a broken interim state (10
editor controls silently write to nothing) and **must not be deployed to the sandybrown canary**
until the UI/render rewiring lands.

## Fix applied this step

`plugins/sgs-blocks/src/blocks/nav-menu/block.json` — 2 lines, `submenu-panel` and `sublink`
`attrMap` entries only. Committed separately per the git-hygiene rule, pathspec-scoped to this one
file.

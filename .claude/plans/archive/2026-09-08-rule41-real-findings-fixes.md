# Plan: fix the 3 real rule-41 findings the detector fix revealed

## Context

Root-causing two rule-41 (inspector-scan) false-positive classes (commit `61883b240`)
unmasked 3 genuine defects that had been hidden behind the noise: sgs/gallery,
sgs/hero, sgs/product-card. Bean has given exact direction for all three. No PRs,
no branches — commit straight to `main`, path-scoped, per this project's git-hygiene
rules. No git worktree isolation needed (single shared `main`, per project convention).

## Global constraints (apply to every task)

- Commit directly to `main`. Never open a PR. Path-scoped `git add` only — never `git add -A`,
  never a glob.
- Before committing: run `node plugins/sgs-blocks/scripts/inspector-scan/run.js --json`
  and confirm the specific target finding closed (read the block names, not just the count).
- Run `npm run build` (in `plugins/sgs-blocks`) before considering a task done; all gates
  must pass. If a gate fails on a file this task didn't touch, verify via `git diff` that
  it's pre-existing/another session's work, disclose with `[gates-ok:...]` in the commit
  message, and do not "fix" someone else's in-flight file.
- Verify `git branch --show-current` is `main` in the same breath as any commit.
- Do not touch attribute names (`ctaText`, `ctaColourBackground`, etc.) — only user-facing
  label/panel-title strings. Renaming attributes is a migration-scale change nobody asked for.

## Task 1 — sgs/gallery: fix Caption/Image dom-order

**File:** `plugins/sgs-blocks/src/blocks/gallery/edit.js` (and/or `block.json`)

**Finding:** `sgs/gallery`'s "Caption" panel (declared order 3) appears in edit.js BEFORE
"Image" (declared order 2) — DOM order contradicts the block's own declared element order.

**Fix:** Investigate both panels' real JSX position and content (same method used
throughout this session's earlier fixes — read the actual panel titles/content, not just
the finding text). Decide: reorder the JSX panels so "Image" renders before "Caption", OR
correct the declared `order` values in block.json to match the real, sensible intended
sequence. Follow the same judgement precedent already used this session (e.g. process-steps,
post-grid): whichever panel arrangement matches the natural authoring flow for an operator
wins; don't force a JSX move if the current order is actually the sensible one.

**Verify:** `node plugins/sgs-blocks/scripts/inspector-scan/run.js --json` shows zero
findings for `sgs/gallery`.

## Task 2 — sgs/hero: remove the incorrect gridTemplateColumns manifest claim

**File:** `plugins/sgs-blocks/src/blocks/hero/block.json`

**Root cause (already proven, not a guess):** the `inner` element's `attrMap` claims
`"css:grid-template-columns": "gridTemplateColumns"`, but `render.php:324-334` proves this
attribute is actually consumed for the split-media column RATIO (`$split_col_tiers =
sgs_responsive_normalise_object( $attributes['gridTemplateColumns'] ?? null )`), a
different, hero-specific concept — not a literal `grid-template-columns` CSS property on
the "Inner (grid/flex layout)" element. Bean confirmed: hero's columns are hard-coded per
variant (normal vs split), not a client-facing "Inner" grid control.

**Fix:** Remove the `"css:grid-template-columns": "gridTemplateColumns"` line from the
`inner` element's `attrMap` in `hero/block.json`. Do not add it anywhere else — this
attribute genuinely has no "Inner" grid-layout meaning in this block. After editing,
reseed the DB: `python plugins/sgs-blocks/scripts/sgs-update-v2.py --stage 1` (same
workflow already used this session for the breadcrumbs/text attrMap fixes) so
`block_attributes.css_property` picks up the manifest change.

**Verify:** `node plugins/sgs-blocks/scripts/inspector-scan/run.js --json` shows zero
findings for `sgs/hero` under rule `41-co2-element-grouping-order`. Also run
`python plugins/sgs-blocks/scripts/check-colour-attr-css-property.py --check` (unrelated
gate that broke once this session after a similar attrMap edit — confirm it's still clean).

## Task 3 — sgs/product-card: panel consolidation + picker + CTA→Button rename

**File:** `plugins/sgs-blocks/src/blocks/product-card/edit.js`

Four related changes, all in one file — do them as one task, one commit (or a small number
of commits), not split across agents, to avoid two agents colliding on the same file.

**3a. Merge "Card style" and "Price style" panels into ONE panel.**
Currently two separate `PanelBody`s (titled "Card style" ~line 1839, "Price style" ~line
1945), each holding one or more `<TypographyControls>` mounts (Card style: title/desc/tag
targets; Price style: price/priceNote/pill prefixes). Combine into a single panel — title
it "Typography" — containing all the TypographyControls mounts from both, in a sensible
order (title, description, tag, price, price note, pill — matching the card's own visual
top-to-bottom reading order). Delete the now-empty second `PanelBody` wrapper.

**3b. Convert the "Connected product" combobox into a plain dropdown.**
`ProductSourcePanel` (function defined ~line 82, the FIRST panel in the whole inspector)
currently uses a `ComboboxControl` (search-as-you-type) for choosing the connected
WooCommerce/SGS product. Replace it with a plain `SelectControl`, using the SAME `options`
array already built (`TYPED_VALUE` + `wcOptions` + `cptOptions`) and the same `onSelect`
handler for `onChange`. Drop the `onFilterValueChange`/search-typing behaviour — a
dropdown doesn't need it. If the options list needs to load before rendering (WooCommerce
fetch), keep the existing loading/spinner behaviour.

**3c. Merge the "Buttons" content panel and "Call to action" style panel into ONE panel.**
"Buttons" (~line 1590, in the Settings tab — holds `ctaText`/`ctaUrl`/`ctaBehaviour` +
secondary CTA fields) and "Call to action" (~line 2005, in the Styles tab — holds
colour/border/font/padding/width-type controls, already merged from "Button style" earlier
this session) currently sit in DIFFERENT InspectorControls tabs (Settings vs Styles) as
well as different panels. Consolidate them into ONE panel. Use judgement on which tab is
correct for a combined content+style panel — check how other blocks in this codebase
handle a single element's content+style controls together (e.g. option-picker's merged
"Appearance" panel from earlier this session) for precedent, and pick consistently. State
your reasoning in the commit message.

**3d. Rename "CTA"/"Call to action" to "Button" throughout the visible UI.**
"CTA" is internal jargon a client-facing operator won't recognise. Rename every USER-FACING
STRING in this file that says "CTA" or "Call to action" (panel titles, control labels, help
text, notices) to "Button" (e.g. "Call to action" panel title → "Button"; "CTA Behaviour" →
"Button behaviour"; any help text mentioning "CTA" → "button"). Do NOT rename attribute
names (`ctaText`, `ctaUrl`, `ctaColourBackground`, `ctaBehaviour`, etc.) — those are stored
data identifiers, out of scope. Do NOT rename internal variable/component names unless
trivial and low-risk (a rename that only affects readability, not behaviour).

**Verify:**
- `node plugins/sgs-blocks/scripts/inspector-scan/run.js --json` shows zero
  `co2-scattered-element`/`dom-order-vs-declared-order` findings for `sgs/product-card`.
- Live-verify in the block editor (Playwright/superpowers-chrome, credentials in
  `.claude/secrets/sandybrown.env`): insert a `sgs/product-card` block, confirm (a) the
  merged Typography panel shows all target typography controls and each still updates the
  canvas, (b) "Connected product" is now a plain dropdown that successfully selects a
  product, (c) the merged Button panel shows both content and style controls together and
  no "CTA" text remains visible anywhere in the inspector.

## Dispatch order

Task 1 (gallery) → Task 2 (hero) → Task 3 (product-card). Sequential, not parallel — they
touch different files so there's no real conflict risk, but this skill's own rule is never
dispatch multiple implementers in parallel. Each task: implementer → task reviewer → fix
loop until spec ✅ + quality approved → path-scoped commit → push to `origin/main` before
starting the next task (integrate after every completed task, per this project's git-hygiene
rules).

---
doc_type: design
title: Colour capability-grant — the three-layer enforcement tool
date: 2026-08-23
status: APPROVED (Bean, 2026-08-23) — approach B, triage first
supersedes: the "Step 4 — PLAN the two behemoths" placeholder in the colour-golden plan
governing: D542 (survey/fix/check triad), D744 (capability moves, never disappears), D750 (parse attribute JSON, never splice), D752 (hover everywhere), D753
---

# Colour capability-grant — the three-layer enforcement tool

## The problem, measured before designing

Rule 31 reports **292 findings across 58 blocks** in 181 distinct (block, row) pairs:
108 need both a hover state and a gradient path, 52 hover only, 21 gradient only.

Hand-fixing is not viable — that is the premise Bean stated and it holds. But the reason
a codemod has not already closed it is **not** shape recognition. Running the existing
`scripts/colour-codemod/survey.js`:

| Verdict | Rows |
|---|---|
| CONFORMANT | 77 |
| `AUTOFIXABLE:*` | **32** |
| `REFUSED:gradient-not-extensible:no-gradient-capable-paint-path-found` | 79 |
| `REFUSED:gradient-not-extensible:paints-via-colour-valued-custom-property` | 34 |
| `REFUSED:no-css_property` | 27 |
| `REFUSED:unresolvable-attr` | 15 |

**Only 17% of non-conformant rows are autofixable, and the refusals are CAPABILITY
refusals, not parsing refusals.** You cannot add a gradient control to a row whose
rendering has no way to paint a gradient: the control would exist, the client would pick
a gradient, and nothing would happen. That is the dead-control defect D751 spent a
session removing — mass-produced.

A separate shape census confirms recognition is the easy half: **90% of findings sit in
one shape** (a literal row object inside `SgsColourPanel rows`), 9% in the legacy
`DesignTokenPicker` single-value API, the rest already helper calls.

## What already exists — this is an extension, not a build

`scripts/colour-codemod/` already holds a disciplined triad. **Do not rebuild it.**

- **`survey.js`** — census, writes nothing, `--json` available. Every refusal carries a
  NAMED reason. Its docblock is emphatic that autofixability is gated on the block's own
  emission capability, and it records a hard-won trap: **never classify on
  `block_attributes.derived_selector`** — it is a synthetic per-attribute identifier, not
  a CSS target, and an earlier version reported a false 58% autofixable from it.
- **`fix.js`** — the writer. **TIER A ONLY**: rows verdicted
  `AUTOFIXABLE:helper-at-existing-selector` whose gradient dimension is ALREADY
  conformant. It deliberately refuses any row needing BOTH hover and gradient, on an
  "every required dimension or none" rule — which is exactly the 108.
- **`adopt.js`** — rewrites a literal row object into the helper call it already matches.
  `edit.js` ONLY, by explicit design.

Neither writer touches `render.php`. That boundary is the whole problem.

## Approach — B: a capability-grant pass, ahead of the existing triad

```
grant.js  ──►  survey.js  ──►  fix.js  ──►  adopt.js  ──►  check
(render)       (re-census)     (attrs +      (literal ->    (ratchet
THE RISKY                       controls)     helper)        + live)
PASS
```

**Why a separate pass rather than widening `fix.js`.** The render rewrite is the only
part that changes what a visitor sees. Isolating it gives it its own blast radius, its
own verification and its own revert, and leaves everything downstream additive and safe.
It also makes `survey.js` the honest arbiter: a successful grant shows up as refusals
turning into `AUTOFIXABLE` **without anyone editing the survey**. If the numbers do not
move, the grant did not work — there is no way to fake that.

**Why the grant's unit is the BLOCK, not the row.** Whether a background must move to an
`::after` layer depends on whether text and background share an element, because a text
gradient paints via `background-clip:text`, which clips the element's whole background
area to the glyph shapes. That is a per-block judgement a row-unit tool structurally
cannot make. Proven the hard way on 2026-08-23: five of six migrated blocks needed the
`::after` layer and `icon-list` did not, precisely because it scopes text to a descendant.

## `grant.js` — the new pass

**Job:** normalise ONE block's colour rendering onto the shared emitters, so
gradient-capable paint paths genuinely exist.

Per block, in order:

1. Resolve which element text paints on, and which background paints on.
2. **Shared element?** background moves to `sgs_block_background_layer_css()` (an
   `::after` layer). **Different elements?** `sgs_fill_states_css()` directly. State which
   case applied, and why, in the run output.
3. Text goes to `sgs_text_decls()` + `sgs_emit_state_colour_css()`, plus the
   **MANDATORY** `sgs_text_colour_gradient_fallback_rule()` for both states. Omitting it
   emits a bare `color:` carrying a gradient string — invalid CSS the browser drops
   silently. `check-text-gradient-companion.js` already gates this.
4. **DELETE the superseded paint** — the old style-engine colour args, any hand-rolled
   hover declarations. Not "leave it, the new rule wins": two owners for one element is
   the defect, and a rule that loses is indistinguishable from a rule that is absent.

**Named refusals — never a guess, each with a self-test fixture that reproduces it:**

| Refusal | Meaning |
|---|---|
| `refuse:paints-via-custom-property` | Colour leaves as a CSS variable VALUE; a gradient cannot substitute without changing the consumer too. Out of scope for the grant. |
| `refuse:no-element-selector` | Cannot determine which element the attribute paints on. |
| `refuse:multiple-paint-sites` | The attribute is painted in more than one place; picking one would silently drop the others. |
| `refuse:not-block-private` | Native or context-provided attribute, not the block's to own. |

## Identity preservation — its own module, because this is where a codemod does damage

Attribute names are the caller's by ruling. The tree legitimately uses `boxShadowColour`,
`cardShadowColour`, `tileShadowColour`, `navBg`, `backgroundColour`. A tool that
normalised names would rename stored attributes for zero user gain — and WordPress
silently discards any attribute a `block.json` does not declare (D338), so a rename that
misses one authoring is invisible until a client's colour vanishes.

`resolveIdentity(block, row)` runs ONCE and its output is consumed by all three layers,
so they cannot drift:

1. **Extract** the base attribute name from the existing code. Never assume a convention.
2. **Search `block.json` for existing siblings** before inventing any. If `navBgHover`
   already exists, it is used as-is.
3. **Create only what is genuinely absent**, using `{base}Hover` / `{base}Gradient` /
   `{base}HoverGradient`.
4. **Never rename or delete an existing attribute.**
5. **Update the element manifest in the same write** — `attrMap` for the resting state
   and `states.hover.attrMap` for hover. Learned 2026-08-23: `/sgs-update` seeds
   attribute ROWS, but `css_property` derives from the manifest, so an attribute added
   without its mapping leaves rule 31's mechanism axis blind to it. **Seeding the row is
   not seeding the mapping, and the run summary reports success either way.**

## Shape registry — the recognition half

A table of `{ id, match, transform, refuseIf }`, driven by the scanner's own findings
rather than a curated list of control names. The census found **132 distinct row keys
with a long tail** — the top 22 names cover only 108 of 292 — so any name-keyed shortcut
would silently miss the majority.

| Shape | Share | Transform |
|---|---|---|
| literal row object in `SgsColourPanel rows` | 90% | to `fillRow` / `textRow` / `borderRow` by resolved mechanism |
| legacy `DesignTokenPicker value=` | 9% | to a states-array row, then the same helper adoption |
| helper call missing attrs | ~1% | add the missing `attrs` keys in place |
| shared-panel mount | invisible to rule 31 today | refuse; the owner file is one edit for many blocks |
| anything else | — | `refuse:unknown-shape`, never a guess |

⛔ **Row resolution is NOT reimplemented.** `survey.js` and `adopt.js` both go through
`inspector-scan/core/golden.js`'s `describeRow()`, which already resolves rows built via
`.push()`, separately-declared consts, spreads and ternaries — a resolver that cost a
real 33-row undercount to get right. A second resolver would give the repo two answers to
the same question with no way to arbitrate.

## Step 1 — triage the 79, BEFORE anything writes

`no-gradient-capable-paint-path-found` is a **regex fallthrough**: it is what gets
returned when a sweep of `render.php` finds none of the known-good paint paths. It means
"I could not prove a path exists", not "no path is possible". This repo has been burned
repeatedly by false absence reading identically to a clean result.

**Deliverable:** each of the 79 classified as genuinely-absent vs detector-blind (a
shared helper, a computed variable, a path through the container wrapper), with a count
and a per-block list.

**Method:** resolve the attribute to its paint site through the same AST + DB route the
survey uses for its POSITIVE cases; anything still unresolved gets opened by hand. This
right-sizes the render work — the expensive part of the whole programme — before a line
of it is written.

## Quality bars

Inherited, each earned by a real failure:

- Exact **TOTAL-count** assertion in the self-test — per-fixture assertions catch
  under-matching; only a total catches OVER-matching.
- **Corpus-size** assertion — a findings count cannot detect a file never opened.
- **Fails CLOSED** — an unreadable or unparseable file is a COUNTED finding, never a skip.
- ⛔ **PARSE the attribute JSON, never string-splice it** (D750) — splicing at the first
  closing brace lands inside `"padding":{}`, WP drops every attribute to defaults, and it
  looks exactly like a render bug.
- **Conservation check**, enumerated finding-by-finding — a flat total hides a fix and a
  regression cancelling out.
- `prove-selftest-can-fail.py` must turn it RED with the break **confirmed landed**.

New, earned on 2026-08-23:

- **Element-manifest assertion** — after a grant, every new attribute must resolve to a
  `css_property`, or the mechanism axis is blind to it.
- **No-two-owners assertion** — the superseded paint must be GONE, not merely outranked.
- **Lift-aware verification** — SGS block CSS is LIFTED to `uploads/sgs-css/<hash>.css`,
  so grepping rendered HTML for a style tag proves nothing. Read computed style, or
  remove the `render_block` lift filter for the measurement.

## Verification per batch

1. Rule 31 measured **twice, requiring agreement** — the scanner reads a tree other
   sessions are writing.
2. Delta computed on a key **normalised to block + kind + rowKey**, never the raw key:
   the raw key embeds a LINE NUMBER, so untouched rows read as net-new when edits above
   them shift position.
3. Deploy, then a **live probe with a negative control** — a second instance carrying no
   colour attributes, which must show nothing.
   `scripts/qa/probe-native-colour-ui-close.js` generalises to this.
4. Bean's eye (R-31-13). Measurement is co-authoritative, never sufficient.

## Explicitly out of scope

⛔ **TWO OF THESE THREE WERE WRONG. Corrected 2026-08-23 — see the PLAN, which supersedes
this list. Left here with the corrections inline rather than deleted, so a reader who
arrives at the design first meets the correction instead of the original claim.**

- ~~The 34 `paints-via-colour-valued-custom-property` rows~~ — **NO LONGER OUT OF SCOPE.**
  Each of the four consumption shapes has a deterministic transform and every transform
  already exists as a shared helper. Background rows use
  `sgs_block_background_layer_css()` on `::after`, which needs NO wrapper. No fourth layer
  is required.
- ~~**Shared-panel rows.** Rule 31 reads per-block `edit.js` only~~ — **FALSE, AND IT WAS
  ALREADY FALSE WHEN WRITTEN.** Rule 31 carries the shared reach walk
  (`resolveComponentFiles` / `getSharedOwnerScan` / `emitSharedRow`, reaching 136
  components) since the 2026-08-20 widening. This claim was copied from
  `survey-golden-conformance.js`'s docblock, which predates that change — a doc going stale
  against what it governs, the D753 pattern. **Shared panels are IN scope and covered.**
- The 8 `linkColour*` attributes, which need a new `link` ELEMENT in the manifest rather
  than another mapping. **This one stands.**

**What actually keeps 292 a floor:** extension-owned rows. Extensions attach via
`addFilter()` — higher-order components with no literal JSX mount — so a reach WALK cannot
see them by construction. `fx.js` alone has 5 single-state `<DesignTokenPicker>` mounts
inherited by 15 blocks. Closing it needs a reach MAP keyed on
`supports.sgs.enabledExtensions`. That is U11 in the plan.

## Also sweep in

`breadcrumbs` and `table-of-contents` declare `linkColour` with no hover sibling, so they
trip the two-state floor and are inconsistent with `info-box` / `testimonial`.

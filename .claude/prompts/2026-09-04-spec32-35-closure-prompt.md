---
doc_type: prompt
title: Close the remaining Spec 32 + Spec 35 gaps
created: 2026-09-04
governs: .claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md, .claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md
retention: delete once consumed
---

# Session start: close the remaining Spec 32 + Spec 35 gaps

Invoke `/autopilot` first. Read `.claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` and
`.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` in full before touching code — both docs
carry the current true state as of 2026-09-04's `/qc-council` audit, not the state their own
older prose sections describe.

## Why this session exists

A `/qc-council` audit on 2026-09-04 confirmed the road-to-uniform backlog fully closed, then
checked whether Spec 32 and Spec 35 were complete framework-wide. They aren't. Five parallel
investigations (matching the shape of this session's own C5 investigation) then checked
whether five ungated Spec 35 anti-patterns could get a detector at all. Four can. This prompt
is the build session for everything the audit and the investigations found.

## Task 1 — Spec 32: build the CSS-injection sanitisation gate (§5 NFR)

A prior claim that this was closed was wrong — it cited evidence for a different requirement
(FR-32-1, not this one). No gate exists today.

Build a gate that checks, framework-wide:
1. Every free-text keyword attribute (`borderStyle`, `textTransform`, and any other enum-ish
   string attribute) concatenated into a CSS declaration is filtered to the CSS keyword
   alphabet first: `preg_replace('/[^a-zA-Z-]/', '', $value)`.
2. Every assembled `<style>` blob passes `wp_strip_all_tags()` before echo.

Start from the 9 `render.php` files Spec 32's own §5 names as unaudited (grep the spec for
"borderStyle" to find the list). `sgs/form/render.php` already does this correctly — read it
first as the reference shape.

## Task 2 — Spec 35: build 4 of the 5 investigated anti-pattern gates

Full investigation reports are in this session's transcript (not written to disk — re-derive
each verdict's evidence yourself with the commands each investigation names, don't take the
summary on faith). All four are advisory-mode on introduction, per this project's own rule:
never promote a rule to gate on the run that introduces it.

**2a — No-reset detector.** The cleanest of the four: zero false positives measured against
all 333 `ToolsPanelItem` mounts tree-wide. Flag a `hasValue` arrow function with zero
identifier references, or an `onDeselect` arrow function with zero call expressions. Reuse
`check-empty-inspector-containers.js`'s AST-walk technique and file scope.

**2b — Colour-only focus/selected state.** Reuse `check-shared-css-state-rules.js`'s
brace-matching CSS parser. Trigger selectors: `[aria-current]`, `[aria-selected="true"]`,
`[aria-checked="true"]`, `[aria-expanded="true"]`, `.is-active`, `.is-selected`, `.is-current`,
`[open]`, BEM `--active`/`--current`/`--selected` modifiers — explicitly excluding bare
`:hover` (transient, not the persisted state this anti-pattern targets). Union declared
properties across every rule block matching the same selector before judging colour-only-ness
(the `sgs/accordion` `[open]` case shows why a per-block check misses a paired rule). Fail
only when every property is colour-only (`color`, `background-color`, `border*-color`,
`outline-color`, `fill`, `stroke`, `text-decoration-color`); warn (never fail) on ambiguous
properties (`background`, `box-shadow`, `filter`, `opacity`). Three real failures already
found and named: `post-grid`'s pagination current-page state, `product-card`'s active thumb,
`buybox`'s current value-ladder row.

**2c — Help text not `aria-describedby`-linked.** Smaller than the spec's own prose suggests —
WP core already self-wires this for its own form controls (`TextControl`, `SelectControl`,
etc.); the real gap is only `BaseControl` mounts wrapping a NON-native child (a `Button`, a
`ColorPalette`, a repeater). Before building: confirm live in the editor that WP core really
does self-wire `aria-describedby` (one `browser_evaluate` check on an open `TextControl` — this
was inferred from documented convention, not verified against source, since
`@wordpress/components` isn't vendored locally). Then flag any `BaseControl` with a non-empty
`help` prop whose children include anything outside the self-wiring allowlist AND has no
literal `aria-describedby` anywhere in that subtree. `LinkPopoverControl.js` is a confirmed
candidate; check `DesignTokenPicker.js` too. `GradientCapableColourControl.js` is the reference
for what correctly-wired looks like.

**2d — Essential control only in sidebar (narrow slice).** Build only the mechanically sound
sub-case: a `role='text-content'` attribute with a `TextControl`/`TextareaControl` in the
sidebar, interpolated as plain text on canvas (`{ attrName }`) outside any `RichText` element.
Ship as a candidate list, not a hard gate — every hit still needs a human call on whether it's
actually essential. Do not attempt the broader claim (image/link/media controls, "no on-canvas
signal at all" heuristics) — the investigation measured that as the same false-positive shape
that got `scattered-element-controls.js` deleted.

**Skip — do not build:** "sidebar as home for every option." The investigation confirmed the
measurement is trustworthy but roughly half its zero-affordance results are *correct by
design* (blocks with no user-authored content at all), and nothing in the codebase can
mechanically separate those from the real candidates. Build the survey only if asked — never a
pass/fail gate — and seed it as a human-reviewed baseline from day one, the same shape as
`dead-controls-baseline.json`.

## Task 3 — Spec 35: continue the element-grouping backlog (rule 41)

`41-co2-element-grouping-order.js` (built 2026-09-04) found 61 live violations the moment it
ran. Triage and fix them, block by block. Re-run `node plugins/sgs-blocks/scripts/inspector-scan/run.js --json`
for the current list — don't trust a cached count.

## Task 4 — Spec 35: continue the colour-completeness rollout (rule 31)

Two live plans already own this — read both in full before touching a single row:
- `.claude/plans/phase-colour-conformance.md`
- `.claude/plans/2026-09-03-golden-colour-staged-rollout.md`

Both are mid-flight with multiple sessions working them concurrently. Re-run
`node plugins/sgs-blocks/scripts/colour-codemod/survey.js` for the current CONFORMANT count
before picking a next row — the plans' own cached counts are already stale by design (they say
so themselves, repeatedly). Follow whichever plan's own "next step" section is current.

## Task 5 — update both specs to the closing state

Once Tasks 1-4 land (or partially land), update `.claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md`
and `.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` themselves — not just a plan doc — with
the real command output behind each claim. Spec 32's §5 line should read DONE once Task 1
lands, with the gate script named. Spec 35's PART L checklist and PART F fail-list should
name each new rule once built, and record the colour/element-grouping backlog's live count
at session close, not the figure this prompt quotes (re-run the command).

## Method

`.claude/THE-MIGRATION-METHOD.md` applies to anything touching more than 3 files. Every new
rule ships advisory-mode first, self-tested with a positive and negative control, following
`check-empty-inspector-containers.js`'s and `41-co2-element-grouping-order.js`'s own shape.
Path-scope every commit; this is a shared tree — re-check `git status` and
`git branch --show-current` immediately before each commit and deploy.

## Tools

| Tool | Use for |
|---|---|
| `node plugins/sgs-blocks/scripts/inspector-scan/run.js --check` | Confirm a new rule's finding count before and after a fix batch |
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "..."` | Attribute-scoped census |
| `node plugins/sgs-blocks/scripts/colour-codemod/survey.js` | Current rule-31 CONFORMANT count |
| `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only --payload <path>` | The one deploy path — scope to what you actually changed |

## Hand back, don't improvise, if:

- Task 2c's live self-wiring check comes back false (WP core does NOT auto-wire
  `aria-describedby`) — that changes the scope from single digits to hundreds; re-plan before
  building.
- A shared-tree conflict can't be resolved by messaging the other session within a reasonable
  wait.
- Any of Tasks 1-4's cited counts have moved since this prompt was written — re-verify before
  assuming drift means something broke.

# Media element — Waves 6 and 7

**Invoke `/autopilot` before anything else.**

Wave 5 is done and merged (PR #36, commit `13286fc69`, main). `sgs/media` now runs entirely on
the shared atom system — all 16 atoms, not the original 10. `before-after` has object-fit and
focal-point wired, independently scoped per photo. Your job starts here: build the five quality
gates (Wave 6), then roll the atom system out to the remaining four surfaces (Wave 7).

Read `.claude/plans/2026-08-30-media-element-architecture-v2.md` §17 and §18 in full before
touching anything. §17 records exactly what Wave 5 shipped, the real bugs an independent review
caught before merge, and why. §18 is the panel design `sgs/media` already implements — reuse it,
don't redesign it.

## Read these first, in full

| # | File | Why |
|---|---|---|
| 1 | `.claude/plans/2026-08-30-media-element-architecture-v2.md` §17, §18 | current status and the panel design already built |
| 2 | `plugins/sgs-blocks/src/components/media/atoms/registry.js` | the 16-atom contract — read its docblock before touching any atom |
| 3 | `plugins/sgs-blocks/src/components/media/MediaPanelLayout.js` | the reference panel implementation; Wave 7 surfaces reuse this shape |
| 4 | `plugins/sgs-blocks/src/blocks/media/edit.js` and `render.php` | the finished reference block — every Wave 7 surface ends up looking like this |
| 5 | `plugins/sgs-blocks/CLAUDE.md`, "A control that doesn't work" | the working method: diff against a block where the control already works, never design from scratch |
| 6 | `.claude/STOP-CATALOGUE.md` §E19 | the same method, plus the pre-flight ritual |

Skip the cloning-pipeline spec (Spec 31) — it governs a different track and will mislead you here.

## Wave 6 — turn the remaining checks into gates

Five gate rules, each starting advisory (per this project's ratchet convention — a binary check
on a partly-migrated codebase just becomes an ignored rule):

- `media-attr-parity` — server-registered schema matches the JS keys
- `media-css-parity` — the JS and PHP value-setters agree on a fixture attribute set
- `media-control-coverage` — every declared attribute has a control, and no control shows for a
  media type it doesn't apply to
- `media-svg-sanitised` — every SVG mount path runs through the shared sanitiser
- `media-disclosure-coverage` — every gated control carries a `hiddenReason`

Ship each as a rule module under `scripts/inspector-scan/rules/`. Give each one a negative
control proving it doesn't overmatch, and a fixture proving it can fail. `sgs/media` and
`before-after` must return zero findings — they're already fully migrated, so any finding there
is a real defect, not a backlog item.

## Wave 7 — the remaining four surfaces

Order: `hero`, `container`'s `BackgroundPanel`, `decorative-image`, `product-card`. Then
`product-card`'s content migration (its `image` attribute is a bare URL string with no attachment
ID and no tiers — a genuine data migration, scoped separately, after the block itself adopts the
atom system).

Per surface, one commit: **insert, then verify, then gut.** Never gut first. A surface always has
either the old code or the new code, never neither, so a broken insert rolls back with one revert.

1. **Insert** — declare the atoms the surface needs in `block.json`, mount `MediaPanelLayout` (or
   a purpose-built layout following the same pattern) in `edit.js`, wire `SGS_Media_Element::style()`
   into `render.php`.
2. **Verify** — deploy, open the real block editor, confirm each control reads and writes its
   attribute, confirm the canvas preview updates live (`src/components/media/canvasStyle.js`
   handles this for `sgs/media` today — extend it to cover the new surface, or confirm it already
   does).
3. **Gut** — delete the surface's old hand-rolled controls and render code for that attribute,
   in the same commit.

`container`'s `BackgroundPanel` needs its own judgement call first: which atoms make sense on a
background that sits behind content, rather than a straight copy of the foreground set. Decide
this before wiring, not while wiring.

## Standing constraints

- Commit by exact file path. Never `git add -A`.
- Never rename a stored attribute — WordPress silently drops an attribute a block no longer
  declares.
- No inline `style="..."` (Spec 32). Values go through CSS custom properties; rules live in
  stylesheets.
- No block version bumps, no deprecations — this framework is pre-production.
- Before designing any control from scratch, check whether another block already has it working,
  and diff against that block's code.
- A default changing costs nothing right now. Never treat "this changes what the canary shows" as
  a reason not to fix something.
- Deploy only through `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown`.
  Never hand-build a file transfer.
- Verify every claim live. A subagent's "done" is not proof — check the actual commit, the actual
  deployed code, the actual rendered page.

## First action

Run the read-first list above, then open `plugins/sgs-blocks/src/components/media/MediaPanelLayout.js`
and `plugins/sgs-blocks/src/blocks/hero/edit.js` side by side. Hero's split-media already has most
of the attributes the atom system expects (§14 of the architecture doc names hero as one of the
two hardest cases already solved by `sgs/media` and `before-after`) — the gap between what hero
has today and what `MediaPanelLayout` expects is your first real piece of work.

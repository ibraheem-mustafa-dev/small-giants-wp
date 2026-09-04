---
doc_type: prompt
title: Dispatch prompt — colour conformance, the 8 genuinely hard rows
created: 2026-09-04
governs: .claude/plans/2026-09-03-golden-colour-staged-rollout.md
supersedes: .claude/prompts/2026-09-04-colour-conformance-session-11-continuation.md
retention: delete once consumed
---

# Session start: colour conformance — the 8 rows that need real design, with precedent already found for 6 of them

Read `c:\Users\Bean\Projects\small-giants-wp\CLAUDE.md` in full, then
`.claude/plans/2026-09-03-golden-colour-staged-rollout.md` in full — read its session 11
section (near the end) first, it is the direct predecessor to this prompt.

## What's already done — don't re-derive or re-attempt

Session 11 fixed the broken `sgs_text_decls()` primitive (7 blocks + the helper itself,
commits `a65d06927`/`da2b54583`, live-verified) and closed 4 more rows a QC council
validated as genuinely simple: `nav-menu.featuredColour` (`fb06b593d`),
`process-steps.backgroundColour`/`.textColour` (`a3e6a8a7f`), `button.colourText`
(`0376109be`). `survey.js` CONFORMANT moved 111 → well past that — re-run it for the
current number, never trust a cached figure.

**`fix.js --fix` originally flagged 12 rows `gradient-path-deferred`. 4 are closed
(above). This prompt covers the remaining 8**, each investigated by a dedicated
read-only agent this session. Every claim below cites a `file:line` — verify before
building. Treat this doc as a validated hypothesis, not an accepted spec (per this
project's own `council-fix-shapes-are-hypotheses-not-specs` rule).

## Group 1 — SVG fill gradient (1 row, precedent found, smallest scope)

**Row:** `google-reviews.starColour`. Same architecture gap also affects
`star-rating.starColour`/`.emptyColour` (found during precedent search, not yet
flagged by any detector — worth fixing in the same pass).

**Why it's hard:** SVG `fill:` cannot take a CSS `linear-gradient()` value — it only
accepts a colour, `url(#gradientId)` referencing an inline SVG
`<linearGradient>`/`<radialGradient>` def, or a few keywords. This is a different
mechanism from the `background-image`/`background-clip:text` gradient used everywhere
else in this codebase.

**Precedent found:** `sgs_svg_stroke_gradient()` + `sgs_svg_inject_defs()`
(`includes/helpers-svg-gradient.php:51,199`, called from `src/blocks/button/render.php`
around line 726 and `icon-list`) already builds the `<defs>` machinery this needs —
angle math, colour-stop parsing, `<linearGradient>`/`<radialGradient>` construction, id
sanitisation, fail-soft on invalid/conic/repeating gradients. It hardcodes the return
`'css' => 'stroke:url(#' . $id . ')'` on its last line (`helpers-svg-gradient.php:180`)
only because every current consumer paints via `stroke` (SGS icons are stroke-based,
`stroke="currentColor"`).

**Proposed fix:** add a `string $target = 'stroke'` parameter (accepting `'stroke'` or
`'fill'`) and change the return line to `'css' => $target . ':url(#' . $id . ')'`.
`sgs_svg_inject_defs()` needs no changes — it's already paint-target-agnostic.
`google-reviews.starColour` then calls `sgs_svg_stroke_gradient( $gradient_css, $id,
'fill' )` and gets `fill:url(#id)` scoped onto the star SVG selector. Renaming the
function (it's shared by button/icon-list too) is a judgement call, not a requirement.

**Files:** `includes/helpers-svg-gradient.php` (extend), `src/blocks/google-reviews/`
+ `src/blocks/star-rating/` (`block.json`, `render.php`, `edit.js` — add `starColourGradient`/
`emptyColourGradient` attrs, wire the extended helper, wire edit.js controls).

## Group 2 — Ancestor-hover + gradient (1 row, precedent found, straight lift)

**Row:** `process-steps.numberColour`'s HOVER state specifically (the base/normal state
is a simple scoped rule and can use `sgs_text_colour_decl()` directly — only the hover
companion is the hard part).

**Why it's hard:** the hover is an ANCESTOR-hover pattern
(`.sgs-process-steps__step:hover .sgs-process-steps__number{color:...}` — hovering the
PARENT step repaints a DESCENDANT element), built via `sgs_hover_state_rules()`'s 4-arg
form (`includes/helpers-hover-state.php` — takes an explicit `$suffix` descendant
selector). The convenience wrapper `sgs_text_states_css()` (built session 11, in
`includes/helpers-colour-variants.php:215`) only supports SELF-hover — it has no
`$suffix` parameter at all.

**Precedent found:** `sgs/post-grid`'s OWN `textColourHover` (`render.php:670-689`)
ALREADY combines ancestor-hover with full gradient support, using this exact
composition:
```php
$hover_effective = sgs_resolve_text_colour_or_gradient( $hover_raw, $hover_gradient_raw );
$hover_decl       = sgs_text_colour_decl( $hover_effective );
$scoped_css[]      = sgs_hover_state_rules( $card_sel, $hover_decl, ':focus-within', $target );
$scoped_css[]      = sgs_text_colour_gradient_fallback_rule(
    $card_sel . ':hover' . $target . ',' . $card_sel . ':focus-within' . $target,
    $hover_effective
);
```
`sgs_text_colour_gradient_fallback_rule( string $selector, ?string $value )`
(`includes/helpers-tokens.php:1124`) takes `$selector` as an OPAQUE string — it never
appends a pseudo-class itself. Ancestor-hover and gradient-fallback are structurally
compatible; post-grid already proves the composition, so nothing new needs building.

**Proposed fix:** lift the pattern above verbatim onto `process-steps.numberColour`,
substituting `.sgs-process-steps__step`/`.sgs-process-steps__number` for post-grid's
selectors. Needs `numberColourHoverGradient` declared as a sibling attribute in
`process-steps/block.json` first.

**Files:** `src/blocks/process-steps/` (`block.json`, `render.php` — read
`src/blocks/post-grid/render.php:670-689` as the literal template, `edit.js`).

## Group 3 — Dynamic loop / per-card colour (2 rows, no gradient precedent, but the surrounding mechanism is proven)

**Rows:** `post-grid.cardBgColour` (one shared custom property, block-level) and
`post-grid.categoryBadgeColour` (a per-card value inside a live `WP_Query` loop — two
DIFFERENT shapes, same block).

**`cardBgColour` — why it's hard:** `--sgs-card-bg` (`render.php:186-188,275`) is a
single custom-property VALUE emitted once at the block root, consumed by a FIXED
`background-color: var(--sgs-card-bg)` declaration in static compiled `style.css` — a
`var()` fallback chain feeding one fixed CSS property can't switch to `background-image`
for a gradient. No block anywhere routes a root-level custom property into a
gradient-capable static rule — every existing gradient row instead picks the CSS
property dynamically in PHP (`sgs_background_paint_decl()`) and writes it into a
per-instance `<style>` block, a different, easier shape.

**`cardBgColour` — proposed fix:** move its resolution off static CSS entirely, into
`render.php`, emitting a scoped `<style>` rule via the already-existing
`sgs_fill_states_css()` (`includes/helpers-colour-variants.php:109`) with the map
`['base'=>'cardBgColour','gradient'=>'cardBgColourGradient']` — the same primitive
every other gradient-capable fill row uses (e.g. `sgs/quote`'s `backgroundColourGradient`).
This reuses an existing helper once the emission site moves — no new mechanism, just
relocating where the paint happens.

**`categoryBadgeColour` — why it's hard:** resolved per-card inside a `foreach` over
live post-query results (`render.php:255,322` area, via a `$card_params` array), not a
single top-level block attribute — `fillRow()`/`textRow()` and the PHP primitives all
assume `attrs.base` names a top-level attribute, not a per-iteration value.

**`categoryBadgeColour` — precedent found:** `sgs/pricing-table`'s `ribbonColour`
(`render.php:171,223-248`) proves the mechanism half — a per-item value resolved inside
a `foreach ($plans as $plan_index => $plan)` loop, emitted as a `:nth-child(N)`-scoped
rule. It never needed a gradient sibling, so that half is unproven.

**`categoryBadgeColour` — proposed fix:** extend `post-grid`'s per-card param array with
a `categoryBadgeColourGradient` sibling, resolve it per-card via
`sgs_resolve_text_colour_or_gradient()`, emit via `sgs_fill_states_css()` into a
`:nth-child(N)`-scoped rule using pricing-table's proven mechanism — adding only the
gradient branch `ribbonColour` never needed, not a new per-item mechanism.

**Files:** `src/blocks/post-grid/` (`block.json`, `render.php`, `edit.js`) — read
`src/blocks/pricing-table/render.php:149-171,223-248` for the per-item `:nth-child(N)`
template.

## Group 4 — Bespoke multi-variant custom-property colour (4 rows, CONFIRMED no precedent — real new-mechanism work)

**Rows:** `sgs/tabs.tabTextColour` (`--sgs-tab-text`), `sgs/brand-strip.itemTextColourHover`
(`--sgs-tile-hover-text`), `sgs/mega-panel.iconColour` (`--sgs-mm-accent-text`),
`sgs/option-picker.pillTextColour` (`--sgs-op-text`).

**Why it's hard (checked exhaustively, not assumed):** all four paint via a bespoke
`--sgs-<block>-*` custom-property chain consumed by a fixed `color:` declaration in
static compiled `style.css` — the same structural problem as `cardBgColour` above, but
here no existing helper can absorb the emission, because the consuming selector isn't
unique-per-instance the way `cardBgColour`'s is. No internal precedent exists on any of
the four blocks:
- `option-picker`'s own OTHER bespoke row, `pillBgColour`/`pillBgColourHover`, has its
  OWN inline note (`block.json:107`, dated 2026-09-03) stating plainly: *"GRADIENT
  DEFERRED … a gradient needs `background-image` instead … that is a distinct design
  problem … needs its own pass."* Option-picker has NOT solved this on any axis.
- `mega-panel`'s other colour rows: none solve it either — this block is the plan doc's
  own reference example for the unsolved class.
- `tabs.tabBgColour`/`.panelBgColour` (background siblings on the same block) are
  independently confirmed in the identical unsolved bucket.

**Proposed mechanism (a proposal only — genuinely unbuilt, needs its own design pass,
not a quick swap):** define a SECOND custom property per row (e.g.
`--sgs-tab-text-gradient`), then in the static `style.css` selector emit BOTH
declarations unconditionally:
```css
.sgs-tabs__tab {
    color: var(--sgs-tab-text, <default>);
    background-image: var(--sgs-tab-text-gradient, none);
    background-clip: var(--sgs-tab-text-gradient-clip, initial);
}
```
so the gradient property naturally wins visually only when `render.php` actually
populates it (mirrors the cascade-fallback trick `sgs_text_colour_decl()`'s own
companion-rule contract already relies on, enforced by
`scripts/check-text-gradient-companion.js`). **This needs real verification before
building** — check it doesn't paint a visible seam/flash when only one of the two
properties is set, and check whether `background-clip:text` with `background-image:none`
degrades safely on every targeted browser. Do NOT treat this as validated — it is the
smallest idea a read-only investigation could generate, not a tested design.

**Recommended next step for this group specifically:** run a fresh `/qc-council` (or at
minimum a `/brainstorming` design-mode session) on the proposed mechanism ABOVE before
any subagent touches these 4 blocks — unlike Groups 1-3, this is new architecture, not
an existing-helper reuse, and this project's own rules require a design gate for
exactly this shape of change (`CLAUDE.md`: "DESIGN-GATE sensitive/high-blast-radius
changes... before building").

**Files (once designed):** `includes/helpers-colour-variants.php` or a new file (design
question), plus all 4 blocks' `block.json`/`render.php`/`edit.js`/`style.css`.

## Standing rules (carried forward, still true)

- Path-scoped commits only (`git commit ... -- <paths>`) — a bare commit is blocked by
  a gate on this shared tree, and will sweep in other sessions' staged files if forced.
  Re-check `git branch --show-current` and `git status --short` immediately before
  every commit.
- `npm run gate:fast` (89 gates) after every change; read the full output.
- `node scripts/check-text-gradient-companion.js --check` must show 0 findings after
  any text-gradient change.
- `node scripts/check-element-manifest-conformance.js --check` must stay GATE PASS.
- If `git commit` fails with "Unable to create .git/index.lock", another session is
  mid-commit on this actively shared tree — wait a few seconds and retry, never
  force-remove the lock.
- If the visual-diff pre-commit gate blocks a commit, use the sanctioned scoped bypass
  (`SGS_VISUAL_GATE_SKIP=<block> SGS_VISUAL_GATE_REASON="..."`) with an honest reason —
  never blanket `--no-verify`.
- Do NOT deploy without coordinating with whichever session is active — this tree runs
  3+ concurrent sessions routinely; check `ListAgents` and message before assuming the
  tree is quiet enough to deploy from.
- `google-reviews.starColour`'s companion gap (`star-rating` sharing the identical
  architecture) was found opportunistically during Group 1's investigation, not by any
  detector — worth a quick `grep -rn "css_property.*fill" ` via `sgs-db.py` after
  Group 1 ships, to check whether a THIRD block shares the same untracked gap.

## Skills to invoke

| Skill | When |
|---|---|
| `/autopilot` | First — every session |
| `/dispatching-parallel-agents` | Groups 1-3 are disjoint files (google-reviews+star-rating, process-steps, post-grid) — safe to parallelize directly |
| `/qc-council` or `/brainstorming` | MANDATORY before touching Group 4 — it is new architecture, not proven-pattern reuse |
| `/sgs-wp-engine` | Framework context for any of the 4 groups |
| `check-colour-gradient-roundtrip.js` | Live gradient-fires probe once each group is deployed — extend its `FIXTURES` object |
| `/handoff` | Session close |

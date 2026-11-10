---
paths:
  - "plugins/sgs-blocks/scripts/migrate-*"
  - "plugins/sgs-blocks/scripts/remove-*"
  - "plugins/sgs-blocks/scripts/extract-*"
  - "plugins/sgs-blocks/scripts/surveys/**"
  - "plugins/sgs-blocks/scripts/placement-reach.py"
---

# Migration and survey scripts

## The triad (Bean-locked)

The finder, the fixer and the keeper are the SAME detector: `--survey` (census, run before the design) → `--fix` (parameterised codemod) → `--check` (the gate). Method: `.claude/skills/migration-method/SKILL.md`; each phase builds its own `--fix` when it reaches its migration.

Survey scripts are census-only (no `--check`): never add one to `prebuild`, because a non-gating script in a gate chain is enforcement theatre. `npm run gate:list` shows what is actually wired.

## Tier-object migration taxonomy (Spec 35)

The flat-scalar-trio → tier-object migration (`<prop>`/`<prop>Tablet`/`<prop>Mobile` → `<prop>: {desktop,tablet,mobile}`) touches five layers, S1–S5, each with its own script and its own refuse-rather-than-guess discipline — a census must tell done from not-done, never report a raw hit-count that stays non-zero on an already-correct file.

- **S1 (block.json shape)** — `scripts/migrate-tier-object.py`. Full triad, auto-applied. Refuses rather than emit invalid JSON.
- **S2 (edit.js control wiring)** — same script. Classifies each block's control as `SHARED` (delegates to a shared panel, nothing to do), `OVERRIDDEN` (already on `<ResponsiveOverride>`), `LEGACY` (needs the edit), `NONE`, or `UNCLEAR` (refuses to guess). `--fix --apply` rewrites `LEGACY` blocks only when they match the exact known shape byte-for-byte; anything else is refused, never partially rewritten. Do not run a project-wide JS formatter as a post-step on this script's edit.js output — passing an out-of-tree scratch path to `wp-scripts lint-js --fix` silently falls back to its default `src/` glob and reformats the whole plugin.
- **S3 (render.php reads)** — detect only, deliberately not auto-applied. Classifies `DELEGATED`, `NORMALISED` (via `sgs_responsive_normalise_object()`), `RAW` (needs the edit), or `UNCLEAR`. What makes a read safe or unsafe isn't the read itself, it's what the surrounding code does with the value afterwards — an unguarded `trim((string)$attr)` PHP-coerces an object attr to the literal string `"Array"`. Stays a flagged judgement call, never a blind rewrite.
- **S4 (theme pattern/template folding)** — `scripts/migrate-theme-tier-scalars.py`. Full triad, auto-applied, but gated on the block's OWN schema, not just the theme text: a scalar is only a migration target when that block's `block.json` has already moved the prop to `"type":"object"` (S1 runs before S4, by design).
- **S5 (stored post_content)** — `scripts/migrate-stored-tier-scalars.py`. See the classification doctrine below.

## S5 classification doctrine (Bean-locked)

It folds only what it can prove, and the refusals are the point. Four buckets classify every object attribute in the tree for THIS script's question ("should a flat family be folded into an object?") (`surveys/survey-responsive-shape.py`, Spec 35 Phase 1.4):

- **BOX** — a closed, named set: `padding`/`margin`/`borderWidth`/`borderRadius` and their prefixed variants.
- **TIER** — anything else object-typed with declared tier siblings.
- **TIER-of-BOXES** — box-named but genuinely per-device (e.g. `gridItemPadding`), proven by render evidence, not by name.
- **RECORD/ASSET** — object-typed but neither a tier nor a box (e.g. `shapeDividerTopScale` `{x,y}`, `testimonial.orgLogo` `{id,url,alt}`).

The canonical TIER-of-BOXES envelope is always `{desktop:{...}, tablet:{...}, mobile:{...}}`, never a variant of it; inside each tier a SIDE-keyed property (padding, margin) is `{top,right,bottom,left}` read via `sgs_box_object_shorthand()` and a CORNER-keyed one (borderRadius) is `{topLeft,topRight,bottomRight,bottomLeft}`.

A tier object declares `{"type":"object","default":{}}` with no nested `properties`, so a malformed sub-key passes through `WP_Block_Type::prepare_attributes_for_render()` unchanged. The defence is the PHP normaliser (`sgs_responsive_normalise_object()`) plus the JS write helper: every write spreads the existing object first (a bare `setAttributes({attr:{tier:value}})` silently drops the other two tiers), and every PHP read guards a missing or wrong-typed sub-key itself.

ENUM violations are a separate class and are NEVER auto-fixed — a value can be the right type and still not a permitted one (`layout:"grid"` on a block whose enum is `["full","split"]` coerces to the default and can render at width 0). Reported and refused, not folded.

Companion gate: `audit-post-content-blocks.py` checks attribute TYPES (`type-mismatch`, `enum-violation` — separate classes), unparseable attrs, unknown blocks, undeclared attrs and stranded content. Runs on every deploy via `build-deploy.py`'s `step_oldshape_audit()`.

Never write `post_content` to a page open in the block editor — a save from the editor writes its in-memory state (loaded before your write) over everything; only the last write survives.

## Gotchas the scripts' own docstrings don't carry

- **Shared render helpers keep their guards** (`scripts/migrate-render-closures.py`). `sgs_box_object_shorthand( array $box )` is typed, so a caller passes it an array only; `helpers-box.php::sgs_corner_object_longhand_list` takes an untyped value and guards with `is_array()` itself, and `helpers-css-safety.php::sgs_css_length_value` takes an untyped value and casts it to a string; keep both untyped rather than "tidying" them to a typed parameter, because a typed parameter fatals on the first wrong-typed saved value.
- **Vacuous-guard shapes are not interchangeable** (`scripts/remove-vacuous-style-engine-guard.py`). STANDALONE (whole `if` goes) and COMPOUND (the dead call ANDed with a real condition) need different treatment — deleting the wrapper on a compound guard silently drops a live condition. `} else {` is brace-neutral, so depth-counting misses it; detect the real close structurally, not by the word "else". Never remove a polyfill definition (`if ( ! function_exists('x') ) { function x() {…} }` is correct code for standalone-CLI use) — grep `scripts/`/`tests/` for the filename before deleting any guard.
- **Comment-narrative detector has no `--fix` by design** (`scripts/extract-comment-narrative.py`): a wrong cut deletes knowledge irreversibly and silently (most removable lines are paragraph continuations with no detectable marker), so it is never a Haiku-model edit.

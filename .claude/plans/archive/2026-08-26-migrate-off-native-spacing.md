---
doc_type: plan
title: Migrate 5 blocks off native supports.spacing onto owned padding/margin attrs
date: 2026-08-26
status: PLAN ONLY — nothing has been edited, built, or deployed
spec_id: 32
applies_to: sgs/multi-button, sgs/physics-canvas, sgs/site-footer, sgs/site-header, sgs/trust-bar
---

# Migrate off native `supports.spacing` — plan

**Bean's ruling (verbatim, 2026-08-26):** *"We only chose that at the time because it was too
large to migrate everything, we're migrating off native now."* Target shape is `sgs/container`
post-D555: no `supports.spacing`, block owns `padding`/`margin` (+ Tablet/Mobile) as object
attrs, one control surface, no client-visible Dimensions/SGS duplication.

This document answers the six questions in the brief in order. All evidence below was gathered
by reading the actual tree on 2026-08-26 (`git rev-parse HEAD` at time of writing —
`b418db851`, per the session's git status). No file was edited to produce this plan.

---

## 1. Exact current state per block

### Reference: `sgs/container` (target shape, shipped D555)

- `block.json` (`plugins/sgs-blocks/src/blocks/container/block.json`): **`supports.spacing` is
  `None`/absent** — confirmed by direct read (`supports.get('spacing')` returned `None`).
  Declares its own object attrs: `padding` (object, default `{}`), `margin` (object, default
  `{}`), plus `paddingTablet`, `paddingMobile`, `marginTablet`, `marginMobile` (all object,
  default `{}`).
- `edit.js` lines 606–641: `PanelBody title="Padding & margin"` wraps two `<ResponsiveBoxControl>`
  instances. Base tier reads/writes `attributes.padding ?? {}` / `attributes.margin ?? {}`
  directly (lines 610, 623–624, 631, 637–638) — **no `attributes.style.spacing` reference
  anywhere in the file** (confirmed: `grep spacing container/edit.js` returns only the
  explanatory comment at lines 596–605, no live code path).
  The comment at lines 596–605 states the reason explicitly: *"a WP-native support cannot carry
  a framework default, which is exactly why `sgs/container` had no horizontal gutter and
  rendered flush to the viewport edge; see D555."*
- `render.php`: the shared `SGS_Container_Wrapper` (see below) reads `$attributes['padding']` /
  `$attributes['margin']` as an "owned" box first (`class-sgs-container-wrapper.php:1904–1919`),
  falling back to `$attributes['style']['spacing']['padding'/'margin']` only when the owned attr
  is empty (lines 1921–1936) — the **additive-only fallback that keeps the other 37
  still-native blocks working**.
- Comment at `class-sgs-container-wrapper.php:1888–1903` names the exact precedent this plan
  should follow, verbatim: *"D555 (2026-08-10) — sgs/container migrated its BASE padding/margin
  off WP-native `supports.spacing` onto block-owned box-object attrs... because a WP-native
  support cannot carry a framework default... ⛔ ADDITIVE ONLY — 37 other blocks still declare
  `supports.spacing` and rely on the native `style.spacing.padding`/`margin` read; that path is
  untouched below. Prefer the owned attr when the block actually declares it (non-empty), else
  fall back to native."*

### sgs/multi-button

- `block.json`: `supports.spacing = {margin: true, padding: true, __experimentalSkipSerialization: true}`
  (both native). `boxFamilies.padding = [paddingTablet, paddingMobile]` — **no `margin` entry
  in `boxFamilies` at all.** Declared object attrs: `paddingTablet`, `paddingMobile` only.
  **No `margin`, `marginTablet`, `marginMobile` attrs exist on this block.**
- `edit.js` (lines 258–294): ONE `PanelBody title="Padding"` (not "Padding & margin") wraps a
  single `<ResponsiveBoxControl>`. Base tier reads/writes `attributes.style?.spacing?.padding`
  (lines 275, 284); tablet/mobile write `paddingTablet`/`paddingMobile` (line 289). **There is
  no margin control anywhere in this file** — margin is invisible to the client except through
  WordPress's native Dimensions panel. Confirmed by the comment at lines 258–270: *"base
  padding/margin are meant to come from WP-native supports.spacing, but tablet/mobile overrides
  have no panel of their own at that kind."*
- `render.php` (`multi-button/render.php:181–195`): reads `$attributes['style']['spacing']['margin']`
  and `['padding']` directly into `$mb_spacing`, folded into `$mb_color_border['spacing']` — this
  is a **block-private read, not the shared wrapper** (multi-button renders `kind='content'`
  through the wrapper, per the H6/STOP-43 comment at edit.js:245–251, and owns its own flex
  layout CSS separately).
- **Live stored-content evidence:** 8 theme pattern/template files author a native `margin`
  style directly on `wp:sgs/multi-button` (`about-image-left.php`, `about-story.php`,
  `contact-minimal.php`, `cta-centred.php`, `hero-video-background.php`, `pricing-columns.php`,
  `templates/404.html`, `templates/search.html`) — enumerated by parsing every `wp:sgs/*`
  block comment in `theme/sgs-theme/{patterns,templates,parts}` for a `"spacing"` key. This is
  the ONLY one of the five blocks with confirmed live S4 (theme-file) usage of native **margin**
  specifically.

### sgs/physics-canvas

- `block.json`: `supports.spacing = {margin: true, padding: true, __experimentalSkipSerialization: true}`.
  `boxFamilies` declares BOTH `padding: [paddingTablet, paddingMobile]` AND
  `margin: [marginTablet, marginMobile]` — full Tablet/Mobile siblings for both, unlike
  multi-button.
- `edit.js` lines 270–353: `PanelBody title="Padding & margin"` (line 275) with two
  `<ResponsiveBoxControl>`s. Base padding at lines 276–297 writes
  `attributes.style?.spacing?.padding` (line 279, 288); base margin at lines 299–320 writes
  `attributes.style?.spacing?.margin` (line 302, 311). Symmetric with container's shape except
  for the native base-tier write.
- `render.php`: **no direct `style.spacing` read in this file** — confirmed by grep (only a
  contentBand/max-width comment at line 13 and an unrelated comment at line 160). physics-canvas
  is `containerKind: section`, so spacing is read entirely by the shared
  `SGS_Container_Wrapper` fallback path described above.
- No S4 (theme pattern) usage found — `physics-canvas` does not appear in any
  `theme/sgs-theme/{patterns,templates,parts}` file with a `"spacing"` key on its own block
  comment.

### sgs/site-footer

- `block.json`: `supports.spacing = {margin: true, padding: true, __experimentalSkipSerialization: true}`.
  `boxFamilies` has both `padding` and `margin` Tablet/Mobile families, plus
  `contentBandPadding`. Full Tablet/Mobile symmetry (like physics-canvas).
- `edit.js` lines 473–522 (`PanelBody title="Padding & margin"`): same shape as physics-canvas —
  base padding at 474–495 writes `attributes.style?.spacing?.padding`, base margin at 497–520
  writes `attributes.style?.spacing?.margin`.
- `render.php`: **no direct `style.spacing` read** — `containerKind: section`, rendered via
  `SGS_Container_Wrapper` (composite-mirror rule, D152), same fallback path as physics-canvas.
- **Live stored-content evidence:** `theme/sgs-theme/patterns/framework-footer-default.php` line
  36 authors `wp:sgs/site-footer` with
  `"style":{"spacing":{"padding":{"top":"var:preset|spacing|70","right":"...|40","bottom":"...|40","left":"...|40"}}}`
  directly on the block comment.

### sgs/site-header

- `block.json`: same shape as site-footer — `supports.spacing` both native,
  full Tablet/Mobile `boxFamilies` for padding + margin, plus `contentBandPadding`.
- `edit.js` is materially more complex than the other four. Lines 100–200 contain an EXISTING
  migration-adjacent mechanism: a `hasRestSpacing` destructure (`const { spacing = {}, ...restStyle } = style; const { padding, ...restSpacing } = spacing;`, lines 155–156) that strips
  `padding` out of `style.spacing` while leaving `margin` inside it, used by a "Transparent"
  colour-behaviour reset path (lines 160–190) that already manipulates `style.spacing` shape —
  **this pre-existing logic must be read in full before editing this block**, since it already
  branches on `style.spacing.padding` vs the rest of `style.spacing` for an unrelated reason
  (header colour-behaviour reset, not spacing itself).
  The actual "Padding & margin" panel is at lines 789–864: base padding (818–836) writes
  `attributes.style?.spacing?.padding`; base margin (841–864) writes
  `attributes.style?.spacing?.margin`. A reset-all handler at lines 789–815 also touches
  `attributes.style?.spacing` directly (checking `Object.keys(...).length > 0`, lines 791–792).
- `render.php`: `site-header/render.php:320–366` reads and hand-writes `padding-block` CSS
  literals into `@keyframes`/transition strings for the scroll-shrink behaviour — these are
  **hardcoded shrink-preset values** (`var(--wp--preset--spacing--30/10)`), NOT reads of the
  block's own padding attribute, and are out of scope for this migration (they are a separate,
  unrelated feature). The block's OWN base padding/margin is not read directly in
  `site-header/render.php` — it goes through the shared wrapper fallback, same as footer.
- **Live stored-content evidence:** FOUR pattern files author `wp:sgs/site-header` with a native
  `style.spacing.padding` object directly: `framework-header-default.php`,
  `header-search-bar-above.php`, `header-search-bar-below.php`, `header-search-icon.php` —
  confirmed by reading the actual block comment text, e.g.
  `framework-header-default.php:18`:
  `<!-- wp:sgs/site-header {"align":"full","backgroundColour":"surface","headerSticky":{"desktop":"on"},"style":{"spacing":{"padding":{"top":"var:preset|spacing|30","bottom":"var:preset|spacing|30","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}}} -->`.
  This is the **framework's own default header pattern** — every new client site that starts
  from `framework-header-default.php` inherits this native-spacing authoring.

### sgs/trust-bar

- `block.json`: `supports.spacing` both native. `boxFamilies` has full padding + margin
  Tablet/Mobile, plus `contentBandPadding`, `gridItemPadding`, `gridItemBorderRadius` (it is the
  most attribute-dense of the five — a variant-bearing grid composite).
- `edit.js` lines 640–706 (`PanelBody title="Padding & margin"`): same shape as
  physics-canvas/footer — base padding (647–668) and base margin (670–705) both write
  `attributes.style?.spacing?.{padding,margin}`.
- `render.php`: comment at line 155–156 states explicitly: *"Base spacing (padding/margin) is a
  SEPARATE mechanism the wrapper already handles scoped internally (reads
  `$attributes['style']['spacing']` directly) — not duplicated [here]."* Confirms trust-bar's
  own `render.php` deliberately does NOT re-read spacing — it is 100% delegated to
  `SGS_Container_Wrapper`.
- No S4 (theme pattern) usage found — trust-bar does not appear in any theme pattern/template
  with a `"spacing"` key on its own block comment.

### Summary table

| Block | `boxFamilies.margin`? | Margin UI panel? | render.php reads spacing itself? | S4 theme-pattern hits |
|---|---|---|---|---|
| `sgs/container` (ref) | n/a — owns `margin` directly | Yes (owns padding+margin) | No (delegates to wrapper's owned-attr branch) | n/a |
| `sgs/multi-button` | **absent** | **No — padding only** | Yes, block-private (`render.php:181-195`) | 8 files (margin only) |
| `sgs/physics-canvas` | present | Yes | No (wrapper fallback) | 0 |
| `sgs/site-footer` | present | Yes | No (wrapper fallback) | 1 file (padding) |
| `sgs/site-header` | present | Yes, plus extra colour-reset logic touching `style.spacing` | Hardcoded shrink CSS only, unrelated | 4 files (padding) |
| `sgs/trust-bar` | present | Yes | No, explicitly delegated (comment says so) | 0 |

---

## 2. What breaks if `supports.spacing` is simply removed (no other change)

Tracing the WordPress mechanism directly, not inferring it:

**(a) Values already stored in `post_content` on the canary.** A stored block comment carrying
`"style":{"spacing":{"padding":{...}}}` is JSON on an attribute path (`style`) the block still
declares generically (every block declares `style` implicitly as part of the WP block-supports
attribute merge) — but once `supports.spacing` is gone, WordPress's
`register_block_type()`/`WP_Block_Type::prepare_attributes_for_render()` no longer knows the
`spacing` sub-key of `style` is meaningful for this block. Per this project's own corrected D338
note (`plugins/sgs-blocks/CLAUDE.md`, "WordPress silently DROPS any block attribute the
block.json does not declare — but only on the EDITOR/JS surface... PHP does NOT drop it"): the
stored value **survives in `$attributes['style']['spacing']` at render time** (PHP does not
prune an unrecognised nested key inside a still-declared generic `style` attribute — this is
different from an entirely undeclared top-level attr, but the effect for this migration is the
same in practice: nothing strips it server-side). **The risk is entirely on the READ side, not
storage**: if nothing in the new code reads `style.spacing` any more, the stored value becomes
inert — visually, the padding/margin silently disappears from the live page, with no error, no
log line, and a green build (this is exactly the class of bug `check-editor-render-parity.js`
and the D338 corrections in this file exist to catch).

**(b) `render.php`'s current read path.** For physics-canvas, site-footer, site-header,
trust-bar, the block's own `render.php` never reads spacing directly — `SGS_Container_Wrapper`
does, via the owned-attr-first/native-fallback logic at
`class-sgs-container-wrapper.php:1904-1936`. **This is the single most important fact for
sequencing (see §3 and §5): the shared wrapper ALREADY supports the owned-attr shape today**,
because it was built for D555's container migration. Nothing in the wrapper needs to change —
it already prefers `$attributes['padding']`/`$attributes['margin']` when present and falls back
to native only when they are empty. For multi-button, `render.php:181-195` reads
`style.spacing` directly and must be edited to also prefer an owned attr (this file does NOT
delegate to the wrapper's spacing branch the same way — multi-button renders its own flex layout
separately per the H6 comment).

**(c) The editor control binding.** Every one of the five blocks' "Padding & margin" panel
already renders a `<ResponsiveBoxControl>` bound to `attributes.style?.spacing?.padding` /
`margin` for the BASE tier (tablet/mobile already write to owned `paddingTablet`/`marginTablet`
etc. — those are unaffected). If `supports.spacing` is removed but the `onChange` still writes
`attributes.style.spacing.padding`, WordPress's registered-attribute merge will simply not save
that write anywhere meaningful (the `style` attribute is still generically declared by every
block that has ANY native support, e.g. colour or border, so the write may still round-trip
through `attributes.style` without error, but the value becomes semantically orphaned — nothing
reads it once the migration's read side changes). The base-tier write must be redirected to the
new owned `padding`/`margin` attr in the SAME commit as the block.json change, or there is a
window where the client silently loses their base-tier edits.

**(d) `wp_style_engine_get_styles()` and `__experimentalSkipSerialization`.** All five blocks
currently declare `__experimentalSkipSerialization: true` on `supports.spacing` — this is what
stops WordPress auto-inlining `style="padding:...;margin:...;"` onto the block wrapper (which
would violate Spec 32's no-inline-styling contract). Once `supports.spacing` is removed
entirely, `__experimentalSkipSerialization` is moot (there is nothing left to skip-serialise) —
this is a **no-op removal**, not a behaviour change, PROVIDED the CSS is still emitted some
other way. That "some other way" is exactly what `SGS_Container_Wrapper`'s owned-attr branch
already does: it builds `$base_spacing_padding`/`$base_spacing_margin` arrays and emits them as
a scoped `.{uid}` rule (not inline), which is how `sgs/container` renders correctly today with
zero `supports.spacing` declaration. `wp_style_engine_get_styles()` itself is called elsewhere
in the wrapper for OTHER properties (border, colour) — verify no other emission path assumes
`supports.spacing` exists before shipping (see §4 gates).

**Ordering implication (ties directly to the brief's ⚠ about D338):** because PHP does **not**
drop an attribute the editor silently discards, but the EDITOR does drop anything undeclared —
**the schema change (block.json) and the code that reads/writes it (edit.js + render.php/wrapper)
must land in the SAME commit.** If block.json ships first (declaring the new `padding`/`margin`
object attrs) but edit.js still writes to `style.spacing`, the editor will show the client a
"Padding & margin" panel that writes to a place nothing reads — silent breakage, invisible until
someone edits the block. If edit.js/render.php ship first reading the owned attr before
block.json declares it, the editor discards any attempt to set it (D338) and render.php reads an
always-empty attribute — same silent breakage, opposite direction. **There is no safe order
except atomic: block.json + edit.js + render.php-consuming-code land together, per block, in one
commit** (or, if using the census/fix/check triad from §5, one BATCH commit for all five,
generated by the same script run).

---

## 3. The stored-content migration

**Does `migrate-stored-tier-scalars.py` (S5) fit, or is a sibling script needed?**

Read in full (`plugins/sgs-blocks/scripts/migrate-stored-tier-scalars.py`). **It does not fit,
and should not be extended to fit.** Its entire purpose, stated in its own docblock and enforced
by its `_shape_kind()` classifier (lines ~140-220), is folding a **FLAT scalar into a TIER
OBJECT** for an attribute the block.json **already declares as object-typed** — e.g.
`"minHeight":"48px"` → `"minHeight":{"desktop":"48px"}`. Crucially, it has an explicit, tested,
name-based **BOX refusal**: `BOX_BASES = ('padding', 'margin', 'borderwidth', 'borderradius')`
(line 137) — any property whose base name matches this closed set is classified `'BOX'` and is
**"NEVER folded, needs human decision"** (line 669). The script's own self-test (lines 532-540,
593-601) proves this using `sgs/container.padding` as the exact regression fixture: a flat
`"padding":"22px"` on `sgs/container` is refused, not folded, because container's `padding` is a
4-side box shape, not a tier shape. This migration's stored-content problem is the **opposite**
transformation: moving a value from `style.spacing.padding` (a WP-native nested path) to a
top-level `padding` box attr (a same-shape box-to-box relocation, not a scalar-to-tier fold).
`migrate-stored-tier-scalars.py`'s classifier would either refuse it outright (name-matches
`BOX_BASES`) or, worse, silently mis-handle it if the refusal were bypassed — it has no code
path at all for "relocate this nested native key to a new top-level attr name."

**A sibling script is needed** — call it `migrate-stored-native-spacing.py` (or extend
`migrate-theme-tier-scalars.py`'s sibling family with a fourth member, since S4/S5 already split
by input-corpus per the existing convention: S4 = theme files on disk, S5 = exported
`post_content` dumps). Its job, per block in the 5-block roster:

1. Parse every `wp:sgs/{block}` comment's attributes JSON (same `json.JSONDecoder().raw_decode()`
   robust-parse approach `migrate-theme-tier-scalars.py` already uses — do not hand-roll brace
   matching, per that script's own documented lesson).
2. If `style.spacing.padding` exists: write it to a new top-level `padding` key (merge, don't
   overwrite, in case a `padding` key already exists from a race — refuse and report if so,
   never silently clobber).
3. Same for `style.spacing.margin` → `margin`.
4. Remove the migrated keys from `style.spacing`; drop `spacing` entirely from `style` if it's
   now empty; drop `style` entirely if it's now empty.
5. Refuse (report, don't touch) anything that doesn't parse, anything where a `padding`/`margin`
   top-level key already has a conflicting non-empty value, and any block instance not in the
   5-block roster.

This is genuinely a **different shape of migration** from every existing member of the S1-S5
triad (S1-S4 all fold a FLAT sibling into a TIER OBJECT on the SAME base name; this one
RELOCATES a value across a namespace boundary — `style.spacing.X` → top-level `X`). Trying to
force it through the existing script's `--property` flag would mean pretending `padding` is
being folded from a non-existent `styleSpacingPadding` sibling, which is not what's happening and
would corrupt the refusal logic that currently protects `sgs/container.padding` from exactly this
class of accidental mis-classification.

**Companion gate:** `audit-post-content-blocks.py` already checks attribute TYPES
(type-mismatch, enum-violation) per the plugin's own `CLAUDE.md` S5 section. Once block.json
declares `padding`/`margin` as object attrs and `supports.spacing` is gone, this existing
auditor will (with no changes needed) start flagging any stored `style.spacing.padding` left
over on these 5 blocks as an **undeclared/orphaned key** — useful as a verification gate AFTER
the new relocator script runs, not a substitute for building it.

### Ordering — schema vs content migration, and the breakage window

Given §2's ordering conclusion (schema + code must land atomically) and this section's finding
(stored content needs its own relocator, not `migrate-stored-tier-scalars.py`), the safe
sequence is:

1. **Ship the relocator script FIRST, run in `--survey` mode only** — inventory every stored
   instance across every environment that matters (canary `post_content` export + all 33
   theme-pattern/template files found in §1 for multi-button/site-header/site-footer). This
   produces the census with zero code risk (nothing is written yet).
2. **Land the block.json + edit.js + render.php/wrapper-consuming-code change** (§2's atomic
   commit) for all 5 blocks in one batch, deployed together.
3. **Immediately after that deploy** (same session, not a later one — see §5's live-check
   requirement), run the relocator's `--fix --apply` against:
   - the 33 theme pattern/template files (these are files in THIS repo — safe, reviewable,
     git-diffable, deploy carries them automatically);
   - a fresh `post_content` export from the canary for any live pages using these 5 blocks
     (per S5's established WP-CLI pull convention: `wp post list --format=json` then per-post
     `wp post get --field=post_content`), followed by writing the fixed content back via the
     REST/WP-CLI content-guard path the plugin's own `CLAUDE.md` already documents as the
     approved write mechanism for `sgs/*` dynamic blocks (advisory-gated `wp-content-guard.py`,
     not blocking, since all 5 target blocks are dynamic per that section).
4. **Run `audit-post-content-blocks.py` against the same export afterward** as the closing gate
   — zero `type-mismatch`/orphaned-key findings for `style.spacing` on these 5 blocks is the
   done-when.

**The window of breakage if done in the wrong order:** if block.json ships (step 2) before the
theme-file relocation (step 3) happens, every page freshly rendered from
`framework-header-default.php`, `framework-footer-default.php`, or any of the other 8
multi-button-touching patterns, and any of the header-search-bar-* patterns, **loses its
padding/margin visually** the moment the new code deploys — because `style.spacing.padding` is
still what's stored there, and nothing reads it any more. This is a genuinely live risk: these
are the FRAMEWORK'S OWN DEFAULT patterns, used as the starting point for new client sites, not
edge cases. The theme-file relocation (step 3, first half) must be committed in the SAME PR/
deploy as step 2, not "soon after" — there is no safe gap for the pattern files specifically,
since they ship with the plugin/theme deploy itself and are read on every fresh page-render, not
just on next-save. The canary `post_content` (second half of step 3) has a shorter but real
window too: any already-published page using these blocks will render stripped until the
relocator runs against the live export and the fix is written back.

---

## 4. Gates and scripts that apply

| Gate | Applies? | What it will do |
|---|---|---|
| `check-dead-controls.js` | **Yes, will fire and must be satisfied.** | Currently `padding`/`margin` are consumed via `style.spacing` reads inside the wrapper/render.php — once the read moves to the new `padding`/`margin` top-level attrs, the gate needs to see a real consumer for the NEW attr names. Since `SGS_Container_Wrapper` already consumes `$attributes['padding']`/`$attributes['margin']` (D555's owned-attr branch, `class-sgs-container-wrapper.php:1904-1919`), physics-canvas/site-footer/site-header/trust-bar get this for free the moment block.json declares the attrs — the wrapper already reads them generically, not per-block. `multi-button` needs its own `render.php:181-195` edited to read the owned attr (§2c), or this gate will flag `padding`/`margin` as declared-but-unconsumed on that block specifically. |
| `check-duplicate-controls.js` | **Indirectly relevant, not a blocker.** | This gate's three checks (universal-hover-vs-private-hover, same-attr-two-controls, parent-child) do not currently have a check for "native WP support duplicated by an SGS panel" — that duplication (the whole reason this migration exists) is a WordPress-native-vs-block-owned duplication, a different axis from what this gate scans. It will not fire either for or against this migration; do not rely on it to prove the fix landed. |
| `check-dead-pattern-attrs.py` | **Yes, will fire — this is the primary regression gate for §3's ordering risk.** | It parses every `wp:sgs/*` instance in theme patterns/parts against the CURRENT block.json and flags any authored attribute the block.json doesn't declare. Once `supports.spacing` is removed from block.json, `style.spacing.padding` authored on `wp:sgs/site-header` (and the other affected files) is now an attribute path the schema no longer recognises for that generic support — **this is exactly the class of drift D683 already recorded for a sibling migration** ("Retiring native colour broke 7 header patterns silently... `check-dead-pattern-attrs.py` MISSES it because it asks whether `supports.color` is declared, not whether its sub-flags are on"). ⚠ Read that D683 note carefully before assuming this gate catches everything: it may have the SAME blind spot for `supports.spacing` sub-keys that it had for `supports.color` sub-flags — the gate needs to be checked (or its logic re-verified) against a `style.spacing` finding specifically before trusting a green run here as proof nothing was missed. This is a concrete open question for Bean (see §6). |
| `check-box-family-guard.py` | **No direct hit expected, but worth running.** | This gate scans the CONVERTER tree and `sgs-update-v2.py` for regex/string-literal side/corner matching not gated on `box_family` — it is about the cloning pipeline's classification logic, not block.json/edit.js authoring. This migration doesn't touch the converter. Run it anyway as a no-op sanity check (cheap, already in the gate chain). |
| `audit-inline-styling.js` | **Should stay green, but is the gate that would catch a mistake here.** | If the migration accidentally reintroduces an inline `style="padding:...;"` (e.g. by keeping `supports.spacing` declared without `__experimentalSkipSerialization`, or by hand-writing an inline style in edit.js's canvas preview instead of a scoped rule), this gate fails the build. The plan's target shape (owned attr, emitted via the wrapper's scoped `.{uid}` rule, matching container) is inline-styling-clean by construction, matching the currently-verified "0 inline styling violations across 83 blocks" baseline this repo's `CLAUDE.md` already documents. |
| `check-editor-render-parity.js` | **Yes, directly relevant — run it as a positive check, not just a gate.** | SHAPE A of this gate (editor-canvas desync) is precisely the failure mode in §2c: a control that writes an attribute correctly but whose canvas preview doesn't reflect it. Since `sgs/container`'s own `edit.js` canvas preview already handles the owned `padding`/`margin` shape (it shipped D555), the pattern to copy for the other five is proven, not novel — but this gate is the correct tool to prove each of the five's canvas preview genuinely re-renders on a base-tier padding/margin change post-migration. |
| `detector-first-commit-gate.py` (PreToolUse Bash hook) | **Will fire — this touches 5 blocks with a substantially similar change.** | `MIN_FILES = 4` (method's threshold is "more than 3") and `SHARE_RATIO = 0.60` — a `git commit` touching all 5 blocks' `block.json` + `edit.js` (10 files minimum, plus `render.php` for multi-button) with near-identical normalised diff lines (`"padding":{"type":"object","default":{}}` repeating, `base: attributes.padding ?? {}` repeating) will be classified as "the same change" and DENIED unless the commit also contains a detector script. **What satisfies it:** commit the census/fix/check script from §5 in the SAME commit as the block edits — the hook's own docblock states this is deliberate ("a warning printed to a terminal nobody reads is not a control... it denies rather than warns"). There is no legitimate bypass token to reach for here; building the detector is cheaper than arguing with the gate (per THE-MIGRATION-METHOD.md's own cost table: a detector at 5 instances is "typical 242-362" lines vs an edit that touches 10+ files by hand). |

### S4 theme-file scope confirmed live (not assumed)

Enumerated by parsing every `wp:sgs/*` block comment in `theme/sgs-theme/{patterns,templates,parts}`
for a `"spacing"` key on the five target blocks specifically (method: regex-match each block
comment's JSON, check for `"spacing"` substring — full command reproducible, not estimated):

- `sgs/site-header`: 4 files — `framework-header-default.php`, `header-search-bar-above.php`,
  `header-search-bar-below.php`, `header-search-icon.php`.
- `sgs/site-footer`: 1 file — `framework-footer-default.php`.
- `sgs/multi-button`: 8 files — `about-image-left.php`, `about-story.php`, `contact-minimal.php`,
  `cta-centred.php`, `hero-video-background.php`, `pricing-columns.php`, `templates/404.html`,
  `templates/search.html`.
- `sgs/physics-canvas`: 0 files.
- `sgs/trust-bar`: 0 files.

**Total: 13 files across the theme tree carry live native-spacing authoring on these 5 blocks.**
This is an ENUMERATED count from a script run, not an estimate.

---

## 5. Recommended sequence

Per `THE-MIGRATION-METHOD.md` Step 0/3: this is a **client-visible, 5-block change** — Step 3
(settle the target shape) applies before Step 1's tool-check, and both must happen before any
edit. The target shape is already settled (this document, §1's "Reference" subsection, ratified
by Bean's opening ruling) — so Step 3 is satisfied by this plan itself. The detector-first rule
(>3 blocks) applies squarely: **the first deliverable is the detector, not the edit.**

1. **Build the detector — `scripts/migrate-off-native-spacing.py`** (new script; the closest
   existing sibling, `migrate-stored-tier-scalars.py`, does not fit per §3, but its
   `--survey/--fix/--check/--self-test` shape and refuse-rather-than-guess discipline should be
   copied). Scope: TWO responsibilities in one script (mirroring how `migrate-theme-tier-scalars.py`
   and its S5 sibling split by corpus, not by responsibility) —
   - **Schema-and-code mode** — census across `plugins/sgs-blocks/src/blocks/{multi-button,physics-canvas,site-footer,site-header,trust-bar}`: does `block.json` still declare `supports.spacing`? Does `edit.js` still write `attributes.style.spacing.{padding,margin}` for the base tier? Does `render.php` (multi-button only) still read `style.spacing` directly? `--fix --apply` rewrites all three per block, refusing (not guessing) on any block whose edit.js panel doesn't match one of the two known shapes documented in §1 (the "padding-only" shape for multi-button vs the "padding-and-margin" shape for the other four).
   - **Stored-content relocator mode** (§3) — the theme-file + post_content-dump relocation, `--survey/--fix/--check` against the enumerated 13 files (§4) plus any canary export supplied.
   Done-when: `--survey` reports the exact 5-block/13-file inventory from §1/§4 with zero
   `unrecognised` entries (per THE-MIGRATION-METHOD.md's STOP rule #1 — hand back if
   `unrecognised > 0` and the shape can't be classified from the file alone).

2. **Design-gate check (Rule 7, CLAUDE.md).** This migration touches `SGS_Container_Wrapper`
   indirectly (relies on its EXISTING owned-attr-first branch, doesn't change it) and touches 5
   composite blocks' shared "Padding & margin" panel shape — borderline on Rule 7's "shared
   mechanism" trigger. Given the wrapper mechanism is UNCHANGED (only consumed differently) and
   the panel shape is a proven, already-shipped pattern (container/D555), this plan treats the
   wrapper itself as out of blast radius — but flag this judgement to Bean explicitly (§6) since
   THE-MIGRATION-METHOD.md Step ⛔#9 says "if you are deciding whether your change qualifies, it
   qualifies: ask."

3. **Run `--survey`.** Done-when: exact match against §1's per-block table and §4's 13-file
   list, zero unrecognised.

4. **Run `--fix` (dry-run diff) and review by hand** — specifically checking the two
   known-asymmetric cases: multi-button (needs a NEW margin panel built from scratch, not just a
   base-tier redirect, since one never existed) and site-header (needs the pre-existing
   `hasRestSpacing`/colour-reset logic at lines 100-200 re-read to confirm the fix doesn't
   collide with it).

5. **Land the atomic commit** (§2's ordering conclusion): block.json + edit.js +
   render.php/wrapper-consuming-code for all 5 blocks + the detector script itself, in one
   commit (satisfies `detector-first-commit-gate.py`, §4). Do NOT split by block across separate
   commits per R-31-5's phase-splitting rule — R-31-5 governs declared Spec 31 PHASES; this is a
   standalone Spec 32 codemod, and THE-MIGRATION-METHOD.md's "single landing commit" default
   applies (its own text: "the single-landing-commit assumption... describes a standalone
   codemod, not a phase").

6. **Build (`npm run build`), run the full gate chain** (`npm run gate:list` first, per this
   repo's own repeated caution not to assume a gate is wired — do not trust `grep package.json`).
   Verify `check-dead-controls.js`, `check-dead-pattern-attrs.py`, `audit-inline-styling.js`,
   `check-editor-render-parity.js` all green.

7. **Deploy** via `build-deploy.py --target sandybrown` (the one path) — this ships the theme
   pattern-file relocation automatically as part of the theme payload, satisfying §3's "no safe
   gap" requirement for the 13 theme files.

8. **Immediately post-deploy, run the stored-content relocator's `--fix --apply`** against a
   fresh canary `post_content` export for any live pages using these 5 blocks (§3 step 3, second
   half). Done-when: `audit-post-content-blocks.py` reports zero `type-mismatch`/orphan-key
   findings for `style.spacing` on these 5 blocks against the same export.

9. **Live verification (R-31-11/R-31-13 — live DOM + Bean's eye, not the gate alone).** For each
   of the 5 blocks: open the live canary page carrying it (framework-header-default /
   framework-footer-default patterns cover site-header/site-footer directly; find or create a
   probe page for multi-button/physics-canvas/trust-bar), confirm via Playwright
   `getComputedStyle` that base-tier padding/margin renders identically pre/post migration (this
   IS a visible-output check per `measurement-vs-eye.md` — computed style is the correct primary
   signal here since padding/margin have no background-image/pseudo-element/filter complications,
   but confirm the scoped `.{uid}` rule is actually painting, not just present in the stylesheet).
   Confirm the client now sees exactly ONE "Padding & margin"-equivalent control (WP's native
   Dimensions panel must be gone from the block's Styles tab) — this is the actual client-facing
   proof the duplication is fixed, screenshot it.

10. **`/sgs-update`** to reseed `sgs-framework.db` (the 5 blocks' attribute rosters changed —
    `padding`/`margin` added, native spacing sub-flags gone) so DB-first queries (R-31-1) stay
    accurate for future sessions.

---

## 6. Risks and open questions for Bean

1. **`check-dead-pattern-attrs.py`'s D683 blind spot may recur here — needs a decision before
   relying on it as the gate.** D683 (documented in `plugins/sgs-blocks/CLAUDE.md`) is the exact
   sibling incident: retiring native COLOUR broke 7 header patterns silently because that gate
   "asks whether `supports.color` is declared, not whether its sub-flags are on." This migration
   removes `supports.spacing` OUTRIGHT (not just a sub-flag), which is a cleaner signal than
   D683's case — but this needs to be VERIFIED against the gate's actual logic (not assumed
   fixed) before trusting a green run as proof the 13 theme files were caught. **Ask: should
   someone read `check-dead-pattern-attrs.py`'s source and confirm it detects a fully-removed
   `supports.spacing` correctly before this migration ships, given its sibling gate already
   missed an analogous case once?**

2. **multi-button's margin gap is a scope decision, not just a mechanical fix.** multi-button
   currently has ZERO margin UI (native Dimensions panel only) and ZERO `marginTablet`/
   `marginMobile` attrs — unlike the other four, which already have full Tablet/Mobile margin
   parity. Migrating it "off native" requires BUILDING a margin panel + Tablet/Mobile attrs from
   scratch, not just redirecting an existing one. **Ask: does multi-button get FULL padding+margin
   parity with the other four in this same pass (matches "one system, not carve-outs", Rule 3),
   or does this pass scope to padding-only (matching its CURRENT UI) and margin parity becomes a
   separate follow-up?** The brief's own framing ("matching sgs/container, which... owns
   padding/margin") argues for full parity in one pass; flagging because it changes the
   detector's scope and the live-stored-content risk (8 files already author native margin on
   this block — see §1/§4).

3. **site-header's pre-existing `hasRestSpacing` colour-reset logic (edit.js lines 100-200) is a
   genuine complication, not just noise.** It already manipulates `style.spacing` shape for an
   UNRELATED reason (stripping padding out of spacing during a "Transparent" colour-behaviour
   reset). This must be read and understood in full before editing — there is a real risk of
   this migration's redirect colliding with that existing logic in a way that's easy to miss on
   a quick pass. No conflicting evidence found in the tree, but this is the one block where "just
   copy the container pattern" is not a safe mechanical operation.

4. **Conflicting evidence found: none material.** The one soft ambiguity is
   `check-duplicate-controls.js`'s docblock, which describes three specific duplicate-control
   checks (hover, same-attr-two-controls, parent-child) and does not mention native-vs-SGS
   duplication as a fourth category — so this gate genuinely will not detect either the current
   bug (duplication) or its fix. Noting this so nobody later assumes a green
   `check-duplicate-controls.js` run means this migration's core problem was validated by that
   gate — it wasn't designed to see it.

5. **Design-gate judgement call (§5 step 2) — flagged per THE-MIGRATION-METHOD.md's own
   "if in doubt, it qualifies" rule.** This plan's read is that `SGS_Container_Wrapper` itself
   doesn't need editing (its owned-attr-first branch already exists, built for D555) — only
   NEW CONSUMERS use it. If that read is wrong (e.g. the wrapper needs a change to handle
   multi-button's block-private read path, since multi-button doesn't route spacing through the
   wrapper at all), this becomes a genuine shared-wrapper change and Rule 7's design-gate
   applies before building. **Ask: confirm the wrapper-unchanged assumption, or flag this for a
   pre-build design-gate.**

---

# BEAN'S RULINGS — 2026-08-27

**The migration is APPROVED.** Verbatim: *"We only chose that at the time because it was too large
to migrate everything, we're migrating off native now."* Do not re-litigate whether to do it.

**Q2 — ANSWERED: `sgs/multi-button` gets BOTH padding and margin.** Full parity with the other
four, in this same pass. No padding-only carve-out (Rule 3).

⚠ Know what that buys. Unlike the other four, multi-button has ZERO margin UI and ZERO
`marginTablet`/`marginMobile` attrs today, so this means BUILDING a margin panel and tier attrs
from scratch rather than redirecting an existing one. It also raises the stored-content risk:
**8 theme files already author native margin on this block.** Bean was shown this cost and chose
parity anyway.

**Q1, Q3, Q4 — STILL OPEN.** Carried forward verbatim in §6:
- Q1: verify `check-dead-pattern-attrs.py` actually detects a fully-removed `supports.spacing`
  before trusting a green run — its sibling gate missed the analogous native-colour case (D683).
- Q3: `sgs/site-header`'s pre-existing `hasRestSpacing` logic already manipulates `style.spacing`
  for an unrelated reason. It is the one block where "copy the container pattern" is not safe.
- Q4: confirm `SGS_Container_Wrapper` needs no changes. ⚠ Now MORE likely to bite, because Q2's
  answer scopes multi-button up — and multi-button is the one block that does not route spacing
  through the wrapper at all. If the wrapper does need a change, Rule 7's design-gate applies
  BEFORE building.

**Status: NOT STARTED.** Nothing in this plan has been executed.

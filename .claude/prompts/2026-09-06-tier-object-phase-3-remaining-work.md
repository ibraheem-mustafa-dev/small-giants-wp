# Phase 3 — finish the tier-object migration (continued)

Invoke `/autopilot` first. Read this whole file before touching anything — it supersedes
the previous version of this same filename (that version was this session's OWN starting
prompt; Group 0 and Group 1 below are now done, several of its "how to do it" sections
turned out to describe a mechanism that didn't exist, and the real one is documented here
instead). `git rm` nothing extra — this file replacing itself is the only cleanup needed.

## Where things stand (verified, not assumed)

**Group 0 — DONE, merged to `main`.** A live regression: `class-sgs-container-wrapper.php`'s
`$has_object_tier_value` check (the thing that decides whether a block needs a scoped uid
for its no-inline CSS) covered `maxWidth`/`contentWidth`/`gap`/grid*/`columns`/
`contentBandPadding` but never `padding`/`margin`. Any of the 7 already-tier-object blocks
(container, hero, multi-button, physics-canvas, site-footer, site-header, trust-bar) with
ONLY padding/margin set (no gap, no maxWidth) silently rendered zero padding. Fixed —
commit `abf301700`, merged via PR #46.

**Group 1 — DONE, on `main` (commits `65f7abf02` + `c4d9cc6d8`).** All 32 remaining blocks
(accordion, audio, brand-strip, breadcrumbs, business-info, button, collapsible-text,
countdown-timer, counter, cta-section, form, heading, icon, icon-list, info-box, nav-menu,
notice-banner, option-picker, process-steps, product-faq, product-search, quote,
responsive-logo, separator, social-icons, star-rating, table-of-contents, team-member,
testimonial, text, timeline, whatsapp-cta) migrated off native `supports.spacing` onto
owned tier-object `padding`/`margin`. **Ground-truth correction from this session:** the
prompt this session started from claimed a shared `ContainerWrapperControls`/`LayoutPanel`
JS aggregator wired these 32 blocks' padding controls. That was wrong — verified directly,
that component doesn't touch padding/margin at all (deleted 2026-08-11). The real shape was
a HYBRID: base value in native `supports.spacing`, only `paddingTablet`/`paddingMobile` as
custom object attrs, each block hand-rolling its own `<ResponsiveBoxControl>`. The actual
fix chain (all three pieces reusable for any future native-spacing block):

1. `scripts/migrate-off-native-spacing.py` — pre-existing script, ROSTER widened from 5
   blocks (already done) to all 32. Removes `supports.spacing`, declares an owned flat
   `padding`/`margin` box attr, relocates stored `style.spacing.{padding,margin}` in theme
   pattern/template files.
2. New `scripts/redirect-native-spacing-reads.py` — redirects every `edit.js`/`render.php`
   read+write off `style.spacing.{padding,margin}` onto the new owned attrs. Found and
   fixed 3 real regex bugs in its own substitution patterns during the build (all now
   self-test fixtures) — every one was a formatting variant (a trailing comma between two
   closing braces, or a destructured-`style` vs `attributes.style` prefix) the first
   version of the regex didn't anticipate. **Lesson: a codemod's own `--check` passing is
   not proof its output is correct — verify a sample of the ACTUAL files it touched, not
   just its self-reported summary.** Three real "PASS" claims during this build turned out
   to be wrong before being caught by exactly this kind of spot-check.
3. `scripts/migrate-box-control-wiring.py` — extended with a `POST_REDIRECT` classifier
   (the existing `LEGACY` shape assumes a shared `attrFor` map; these 32 blocks write via a
   direct `if/else`, a different-but-more-common shape) to fold the flat
   `padding`/`paddingTablet`/`paddingMobile` trio into the tier object and swap
   `ResponsiveBoxControl` for `ResponsiveOverride` + `SgsBoxControl`. Found and fixed 2 more
   regex bugs (write-key had the wrong prefix; another trailing-comma miss) before all 32
   blocks matched cleanly.

`table-of-contents` needed one hand edit (`buildRootPreviewStyle()`, an editor-canvas
preview helper that read `style?.spacing.{padding,margin}` directly with no `attributes`
parameter) — given the owned attributes explicitly instead of forcing it through the
codemod.

**NOT done yet, in priority order:**

## Priority 1 — live verification of Group 0 + Group 1 (do this FIRST)

Neither Group 0 nor Group 1 has been checked on the actual sandybrown canary. Everything so
far is: `php -l` clean, phpcs no new violations, `check-box-family-guard.py --check` clean,
`check-dead-controls.js --check` 0 net-new, `migrate-box-control-wiring.py --check` clean
for both padding and margin, and the converter pytest suite unaffected (same 2 pre-existing
unrelated failures as before this work, both in `test_variant_detect.py`/
`test_array_content.py`, both about `sgs/nav-drawer` variant detection — not this
migration). None of that is a live-DOM check. Per this project's own rule 5 ("VERIFY ON THE
REAL HOMEPAGE"), that's the one thing actually missing before this can be called done.

**How:** build + deploy (`python plugins/sgs-blocks/scripts/build-deploy.py --target
sandybrown`), then Playwright/live-DOM-check a representative sample — at minimum:
- One of Group 0's 7 blocks (`sgs/container` is the natural pick) with ONLY padding/margin
  set, nothing else object-tiered — this is the exact negative-control-then-positive case
  the Group 0 bug needed. Confirm it now renders padding/margin; if you can find or recreate
  the pre-fix state, confirm it silently rendered none there first.
- One block from each of Group 1's two source shapes: `sgs/accordion` (`attributes.X` read
  shape) and `sgs/button` (destructured local-variable read shape) — set padding+margin at
  desktop, tablet, and mobile independently and confirm three genuinely different `@media`
  rules render, matching what was set at each tier.
- `sgs/table-of-contents` specifically, since it got a hand edit — confirm the EDITOR CANVAS
  preview (not just the frontend) shows padding/margin correctly, since that was the whole
  point of `buildRootPreviewStyle()`.

If anything is wrong, this is a shared-mechanism migration already on `main` — fix forward
with a small scoped commit, don't revert 107 files.

## Priority 2 — the stale-comment cleanup (may already be done)

A Sonnet subagent was dispatched this session (via `/delegate`) to fix ~37 stale JSX
comments across the 32 Group-1 blocks that still describe the old native-spacing
architecture (found via `migrate-off-native-spacing.py --check`'s comment-only findings —
confirmed these are prose, not live code, before dispatching). Check `git log` for a commit
titled roughly "docs(edit.js): fix stale native-spacing comments" — if it's not there, the
dispatch didn't land; re-run it (comment-only, low-risk, no need to re-verify the whole
migration, just diff-review that it touched only comment lines: `git show --stat <commit>`
should show no `+`/`-` outside comment blocks).

## Priority 3 — Group 1b: mediaPadding shared atom (hero + media, small)

Same class of bug as Group 0/1, found by a deeper shared-mechanism audit this session, NOT
yet fixed. `includes/media/atoms/media-padding.php`'s `sgs_media_atom_media_padding_css()`
hand-reads three separate stored keys (`Padding`/`PaddingTablet`/`PaddingMobile`) — never
normalised, same bug shape as Group 0's wrapper fix. Paired JS-side offender:
`src/components/media/atoms/media-padding.js` writes the same flat trio (its own docblock
even says it deliberately mirrors the OLD `ResponsiveBoxControl` flat-trio contract — that
precedent is gone now). `box_family='mediaPadding'` in the DB confirms this is meant to be
tier-capable. Affects `sgs/hero` and `sgs/media` only (2 blocks, confirmed callers).

Fix: PHP → `sgs_responsive_normalise_object($attributes[$padding_attr_name] ?? null, true)`
matching Group 0's pattern. JS → same `<ResponsiveBoxControl>` → `<ResponsiveOverride>` +
`SgsBoxControl` swap, writing via `patchTier()`. block.json → fold `{prefix}Padding`/
`{prefix}PaddingTablet`/`{prefix}PaddingMobile` into one owned tier object per element
prefix. Small enough (2 blocks) to hand-verify rather than needing a new codemod — but
CHECK whether `migrate-box-control-wiring.py`'s `POST_REDIRECT` or `LEGACY` matcher already
fits this shape before hand-writing anything; the media-atom naming convention
(`mediaStoredAttrName()`) may need the same regex adapted, not reinvented.

## Priority 4 — Group 1c: box-shape.control.js border-radius (10 blocks, medium)

`src/components/media/atoms/box-shape.control.js` stores border-radius as three flat keys
(`BorderRadiusKey`/`BorderRadiusTabletKey`/`BorderRadiusMobileKey`) even though it already
assembles them into a `{base,tablet,mobile}`-shaped prop locally before handing off to
`MediaBoxShapeControls` — the tier shape exists only in a local JS variable, not in storage.
Affects the shared media-element mixin used by `container`, `cta-section`, `gallery`,
`hero`, `media`, `physics-canvas`, `site-footer`, `site-header`, `text`, `trust-bar`.

**Before fixing:** identify the PHP-side reader for this specific family — grep for
`BorderRadiusTablet`/`BorderRadiusMobile` scoped to media-element prefixes (NOT the
root-level `sgs_border_radius_tiers()` path in `helpers-box.php`, which is a confirmed
shape-agnostic DIFFERENT function for a different attribute). This was flagged but not
resolved this session — don't assume it's the same function as the root-level one.

Do this in the same working session as Group 3 below (media-atom migration) — same file
family, avoids opening `box-shape.control.js` twice.

## Priority 5 — Group 2: the border-radius stragglers + a compliance gate

Investigated directly this session (`migrate-border-radius-render.py` read in full, all 8
originally-flagged render.php files read) — this is a CORRECTION of the earlier prompt's
"8 blocks need Pattern C" framing:

| Block | Real shape (confirmed by reading the file) | Action |
|---|---|---|
| `accordion`, `container`, `product-card` | Functionally identical to the codemod's existing Pattern A, but feeds a block-prefixed array (`$border_args['radius']`, `$sgs_container_style_engine_input['border']['radius']`, `$sgs_pc_radius_args['radius']`) into `wp_style_engine_get_styles()` instead of a bare `$base_border_radius` scalar | Extend the codemod with a new **Pattern C**: same string/array branch + corner loop, generalised to write into any `$var['radius']`/`$nested['border']['radius']` target |
| `icon-list`, `whatsapp-cta` | Byte-identical Pattern A, but tablet/mobile lines are interleaved with padding/margin tier lines instead of immediately following the radius block's closing `}` | Relax Pattern A's regex to allow intervening statements, not strict adjacency |
| `label` | Single flat scalar, no corner object, no tier siblings — by design (Spec 32 §6.1(c): not a 4-corner family) | **No migration** — was never in scope |
| `mega-panel` | Single flat scalar with a `'20px'` default, no corner/tier handling | **No migration** — same reasoning as `label` |
| `media` | Old flat read already deleted; radius owned by the shared `box-shape` media atom — see Priority 4 above | **Belongs to Group 1c, not here** |

So the REAL remaining work is only 5 blocks (`accordion`, `container`, `product-card`,
`icon-list`, `whatsapp-cta`), not 8. Extend `migrate-border-radius-render.py` with Pattern C
+ the relaxed-adjacency Pattern A variant, run `--fix --apply`, verify `--survey` shows zero
`UNCLEAR` except `label`/`mega-panel`/`media` (reclassify those three as a `NOT_APPLICABLE`
bucket rather than leaving them looking like unfinished `UNCLEAR` work).

**Then build the compliance gate** (not yet built): a new-code-only checker mirroring
`check-box-family-guard.py`'s baseline-diff pattern (stable dedup key, hash-verified
baseline, fail only on NEW findings) — any newly-added per-device box attribute must be
tier-of-boxes shaped from the start, keyed off the `box_family` DB column, never a name
regex. Ship with an empty baseline. **Wire it into `scripts/gates.json` in the SAME commit
that builds it** — this project has a recorded, repeated failure mode (D338, D493, D643) of
building a gate and leaving it unwired for weeks. Verify with `npm run gate:list` before
considering this done.

## Priority 6 — Group 3: media-atom migration (pilot first)

Untouched this session. Pilot `splitMediaObjectPosition` on `sgs/hero` (single consumer,
lowest blast radius) through the FULL chain before generalising:

1. Fold block.json: `splitMediaObjectPosition`/`Tablet`/`Mobile` (three flat strings) into
   one `{desktop,tablet,mobile}` object attr (string-valued tiers, same envelope as any
   other tier attribute).
2. `focal-point.control.js`: replace the three-key `mediaStoredAttrName()`-based read/write
   with `attributes[baseKey]?.[tier]` reads and `patchTier(attributes, setAttributes,
   baseKey, tier, value)` writes.
3. Fix the render.php read (find wherever the focal-point atom's PHP twin reads the three
   flat attrs).
4. Add a fixture to `sgs-update-v2.py`'s `_self_test_is_responsive` for this specific
   attribute — don't trust the heuristic by analogy, it's been proven wrong twice already
   in this project's history.
5. Confirm `check_flat_tier_regression.py` doesn't false-positive on the mid-migration
   state.
6. Live-check the rendered CSS on the canary: a real `@media` rule for the migrated tier,
   plus a negative control (desktop-only set, confirm no spurious tablet rule).

Only after that one property is fully green, generalise to the other properties confirmed
still flat this session: `thumbnail`, the six video-toggle booleans, `splitMediaType`,
`splitMediaWidth`. (`splitMediaPadding`/`splitMediaBorderRadius` on `sgs/hero` are already
tier-object — confirmed this session, don't re-migrate them. `mediaPadding` is Priority 3
above, NOT already done — an earlier version of this session's own notes wrongly claimed it
was; verified false, it's still flat-trio on both JS and PHP.)

**After generalisation**, extract the 4+ duplicated inherit-cascade implementations
(`BooleanResponsiveControl.resolveEffective()`/`video-behaviour.control.js`'s own
un-exported copy, `focal-point.control.js`'s `resolveInheritedPosition()`,
`object-fit.control.js`'s `resolveInheritedFit()`, `MediaOverlayControls.js`'s
`resolveInheritedOpacity()`) into one shared resolver, exported properly this time. Add a
parity test proving the PHP-side cascade agrees with the JS resolver.

**Also in this group:** audit `MediaElementControls.js`'s `STORED_AS` table for any entry
keyed on a tier-suffixed name belonging to a property this group migrates, and confirm
`sgs_register_media_element_attrs()` still correctly refuses to inject a flat tier sibling
onto a base attribute once it's object-typed.

## Working rules from this session (real bugs found, not theoretical)

**A codemod's own `--check` passing is not proof its output is correct — verify a sample of
the actual files.** Happened three times in one session on this same track. Each time, a
regex missed a formatting variant (a trailing comma between two closing braces; a
destructured-`style` vs `attributes.style` prefix on the write side) that the self-test's
synthetic fixtures didn't reproduce because they were typed by hand, not copied from real
files. **When you write a self-test fixture, copy-paste it from a real file's exact
whitespace/formatting — never retype it from memory**, or the fixture proves the regex
matches itself, not the real target.

**A shared PHP mechanism's own inline comment can be stale and wrong.**
`migrate-box-control-wiring.py`'s docblock claimed `class-sgs-container-wrapper.php`
"already reads either shape correctly via `sgs_responsive_normalise_object()`" — false; that
was true for `contentBandPadding` but not for plain `padding`/`margin`, which is exactly
Group 0's bug. Read the actual code path end-to-end before trusting a comment's claim about
what a shared mechanism does, even one written earlier in the same migration.

**`git stash` + re-run a gate is a fast, safe way to prove "is this finding pre-existing or
did I cause it?"** in an ISOLATED worktree only (never in the shared main working tree —
that's still banned). Used this session to prove a `sgs-gates.sh` "13 gating findings"
scare was actually ALL parse-errors from a missing `@babel/parser` dependency (confirmed
repo-wide, not this migration) by stashing the migration's changes and re-running the same
gate against the clean baseline.

**This repo's commit gates have (at least) two independent layers that both need a bypass
token when a finding is genuinely pre-existing/unrelated:** the real git `pre-commit` hook
(env vars: `SGS_F5_SKIP=<script>`, `SGS_INSPECTOR_GATE_SKIP=1`, `SGS_VISUAL_GATE_SKIP=<block
list>`, each with a matching `_REASON` var, mandatory) AND a separate Claude-Code-side
PreToolUse hook that additionally requires the literal `[gates-ok:<reason>]` token
IN THE COMMIT MESSAGE TEXT itself. Missing either one blocks the commit with a DIFFERENT
error each time, which looks like two separate failures — it's one thing needing both.
Never fabricate a bypass reason; every one used this session was verified against a stash
test or a direct reproduction first.

**The `@babel/parser` gap is real and repo-wide, not just this worktree.** Confirmed absent
from BOTH the main repo's `node_modules` and a fresh worktree junctioned to it. It's not a
declared devDependency of `plugins/sgs-blocks/package.json` (pulled in transitively via
`@wordpress/scripts`, which itself may be incompletely installed — `node_modules/.bin/wp-
scripts` didn't resolve either). This breaks `db-consistency/run.py` (Check #5, `sgs/nav-
drawer` variant_slots) and `inspector-scan` (fails closed on all 83 blocks' parse step)
identically. Worth a real `npm install` at some point rather than bypassing both every
session — but do that as ITS OWN change, verified it doesn't disrupt other concurrent
sessions' installed state, not bundled into a feature commit.

**Path-scope every commit and re-check branch immediately before it.** This tree runs many
concurrent sessions. Before every commit: `git branch --show-current`, `git status
--porcelain`, and stage only the files the task actually touched — never `git add -A`.

**Merge to `main` after every shared-mechanism fix, not at the end of a work group.** Group
0's wrapper fix went up as its own PR/merge before Group 1's 32-block codemod started —
kept the diff reviewable and gave every other concurrent session a smaller rebase window.

## Codemod completeness — a schema fold is not a finished migration step

Folding `block.json`'s schema for a property is step 1 of N, never the whole job. Before
calling ANY attribute-shape migration step done, run the REAL build
(`npm run build` inside `plugins/sgs-blocks/`) — not just the individual codemod's own
`--check` mode. Confirmed this session: only the full gate chain
(`check-undeclared-attrs.py`, `check-undefined-refs.js`, `check-render-undefined-vars.py`
via PHPStan, `check-duplicate-controls.js`) catches these bug classes — no individual
codemod's self-test does:

- **Dead destructured attrs** — `check-undeclared-attrs.py` found ~150 findings where old
  flat sibling names (`paddingTablet`, `paddingMobile`, `borderRadiusTablet`, etc.) were
  still destructured in `edit.js` after `block.json` stopped declaring them.
- **Second, un-migrated read site** — `check-undefined-refs.js` found real
  `ReferenceError` bugs: some blocks have TWO separate controls for the same attribute
  family (one correctly migrated, a second still reading the old flat/native shape — e.g.
  a second `<ResponsiveBorderRadiusControl>` mount, or a `ToolsPanelItem`'s
  `hasValue`/`onDeselect` reset handler). An automated codemod matching one exact JSX shape
  will silently miss a differently-shaped second occurrence in the same file. After any
  codemod run, re-grep the WHOLE file for the old attribute names — don't just re-run the
  codemod's own survey.
- **Use-before-define** — `check-render-undefined-vars.py` (PHPStan) found 4 render.php
  files where a variable (`$radius_tiers`) was read before the line that assigns it later
  in the same file — required a manual move, not a regex fix.
- **A "prettify" pass is not safe just because it ran clean.** A regex-based reformat of a
  manual fix matched the WRONG occurrence in a file with two similar controls, and
  separately corrupted whitespace into literal control characters elsewhere. Both were
  caught only by running `node --check` AND reading the actual `git diff` — never trust a
  tool's own "success" exit code on a reformat of already-correct code.
- **Worktree tooling gaps mask real failures.** Missing `node_modules` packages or an
  un-run `composer install` can hide gate failures for a long time. A worktree needs the
  same junctioned `node_modules`/`vendor/` as the main tree before its gate output means
  anything.

## Verification checklist (every remaining group)

1. `git branch --show-current` immediately before every commit; stage only touched files.
2. `python -m pytest plugins/sgs-blocks/scripts/converter/tests/ -q` — must stay at the same
   808 passed / 2 pre-existing-unrelated-failed / 1 skipped / 10 xfailed baseline (the 2
   failures are `test_array_content.py::test_slot_name_match_fills_icon` and
   `test_variant_detect.py::test_detect_variant_two_column_editorial_is_honestly_undetectable`
   — both `sgs/nav-drawer`-related, both pre-existing on `main` before this whole migration
   started, confirmed via direct comparison).
3. `python plugins/sgs-blocks/scripts/check-box-family-guard.py --check` and `node
   plugins/sgs-blocks/scripts/check-dead-controls.js --check` — 0 net-new.
4. A live check on the sandybrown canary for at least one migrated block per group — a green
   static gate proves nothing was missed by the tool; it never proves the fix is visually
   correct.

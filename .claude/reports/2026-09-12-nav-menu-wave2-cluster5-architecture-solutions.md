# Nav-menu Wave 2 — Cluster 5 architecture solutions (G6, orphaned-slug, E2)

**Date:** 2026-09-12. **Status:** PROPOSAL ONLY — no product code touched in this pass.
Source register: `.claude/reports/2026-09-12-nav-menu-visual-review-register.md` (G6,
Group E2). Source diagnostics read in full: `.claude/verify/nav-review-reinvestigate-burger-colour.md`,
`.claude/verify/nav-review-wave1-cluster2-hierarchy.md`, `.claude/verify/nav-review-wave1-cluster6-border-fixtures.md`.

---

## G6 — `drawerRef` defaults to an unscoped literal, silently colliding

### The mechanism, stated precisely

`nav-drawer/block.json::attributes.drawerRef.default` and
`nav-menu/block.json::attributes.drawerRef.default` are **both** the literal string
`"sgs-nav-drawer"`. This is not an oversight — `class-sgs-drawer-render.php`'s own
docblock (`Sgs_Drawer_Render::render_active_drawer`, the "LANDMARK GUARD" comment) states
the shared literal is **deliberate**: it lets an operator add a burger and a drawer to a
header with zero configuration and have them pair automatically, and 9 shipped patterns
(`theme/sgs-theme/patterns/header-*.php`, `framework-header-default.php`,
`framework-drawer-default.php`, `drawer-scratch.php`) rely on exactly this zero-config
pairing today.

The bug only appears once a **second, independent** drawer exists anywhere the operator
did not explicitly re-key it — e.g. a mega-menu test page, a per-page custom drawer, or (as
Wave 1 found it) a scratch QA page's `sgs/nav-drawer` colliding with the site's real Active
header drawer. Both resolve to the same `id="sgs-nav-drawer"`, so the FIRST `<dialog>` in
document order always wins and the burger opens the wrong one — confirmed live in Wave 1.

**This means the two options the brief posed (auto-generate-always vs validate-and-warn)
are both wrong in their pure form**, and I checked the codebase's own precedent to confirm
before proposing a third shape.

### Precedent already in the codebase

`plugins/sgs-blocks/src/blocks/form/edit.js` (lines 70-77) has the exact "generate a unique
id from `clientId` at insert time" mechanism the brief asked me to look for:

```js
// Auto-generate formId from clientId on first insert.
useEffect( () => {
	if ( ! formId ) {
		setAttributes( { formId: `form-${ clientId.substr( 0, 8 ) }` } );
	}
}, [ formId, clientId, setAttributes ] );
```

The load-bearing detail: `formId`'s own `block.json` default is `""` (empty), so
`if ( ! formId )` fires on every fresh insert, unconditionally, with no collision risk —
every form gets its own id, always, because there is no "shared zero-config form" concept.
**`drawerRef` cannot copy this verbatim** — its default is a *meaningful, shared* value by
design, and firing `if ( ! drawerRef )` would never trigger anyway since the attribute is
never empty. Applying the form pattern unmodified would either (a) do nothing (guard never
fires), or (b) if the guard were changed to fire unconditionally on mount, silently break
the zero-config pairing on every one of the 9 shipped header patterns the moment WordPress
re-serialises them — a framework-wide regression, not a nav-menu-scoped one.

### Proposed fix shape: collision-gated auto-generation, not unconditional generation

Auto-generate a unique ref **only when this block's current ref is already in conflict with
another drawer that exists independently of it** — never on an ordinary first insert into an
empty header. Two collision surfaces exist and both need checking, because `drawerRef`
collisions can happen within one post OR across two different posts:

**1. Within-post collision (editor-visible today).** In `nav-drawer/edit.js`, add a
`useSelect` read of `getBlocksByName( 'sgs/nav-drawer' )` (same API `useDrawerNotice.js`
already uses for `sgs/nav-menu`'s own notice) scoped to the current post, excluding this
block's own `clientId`. If another `sgs/nav-drawer` block in the SAME post already resolves
to this block's effective ref (`drawerRef || 'sgs-nav-drawer'`), AND this block was the one
inserted more recently (i.e. it is not the first of the pair — checked via block index, so
the original zero-config drawer never gets rewritten out from under an operator), fire
`setAttributes({ drawerRef: `sgs-nav-drawer-${clientId.substr(0,8)}` })` once.

**2. Cross-post collision (the actual case Wave 1 hit — a scratch page's drawer vs. the
site's Active CPT drawer).** The block editor has no visibility into another post's content,
so this cannot be caught by `getBlocksByName`. But the data already exists and is already
published to the editor: `class-sgs-drawer-render.php::editor_data()` returns
`{ id, title, ref, editUrl }` for the site's Active drawer and is already exposed on
`window.sgsBlocksData.activeDrawer` (confirmed consumed today by
`nav-menu/useDrawerNotice.js` line 127-133 for its own notice). Extend the SAME `useEffect`
in `nav-drawer/edit.js`: if `window.sgsBlocksData.activeDrawer` exists, its ref matches this
block's effective ref, AND this block's own post ID is NOT the Active drawer's post ID (i.e.
this genuinely is a second, different drawer, not the Active drawer editing itself), treat it
as a collision and auto-generate the same way as case 1.

**Why this doesn't need a PHP/registry change of its own:** both read surfaces
(`getBlocksByName`, `window.sgsBlocksData.activeDrawer`) already exist and are already wired
for `useDrawerNotice.js`'s notice logic — this proposal reuses them, it does not add a new
data channel. The only new code is the collision check + the `setAttributes` call, inside
`nav-drawer/edit.js`, mirroring `form/edit.js`'s existing shape.

**Do not additionally build a "block/reject on duplicate" validation gate.** A hard block
at save time would need to resolve the SAME cross-post ambiguity above at REST/save time
(a fresh page always starts with the shared default before this component even offers a
suggestion) and would either false-positive on every ordinary first header build (before
the operator has touched anything) or need the identical detection logic this proposal
already specifies — building both is two overlapping fixes over the same signal, which
`~/.claude/rules/prove-the-cause-before-fix.md` calls unfalsifiable. Auto-fix alone is
sufficient because the operator never has to notice or act — the ref simply becomes unique
and the pairing continues to work with the newly-generated value.

### Blast radius

- **Files touched:** `plugins/sgs-blocks/src/blocks/nav-drawer/edit.js` only (new
  `useEffect` + `useSelect`, following the `form/edit.js` pattern already in the same
  plugin). No `block.json` default changes (the 9 shipped patterns' zero-config pairing is
  preserved exactly as-is). No PHP changes (`Sgs_Drawer_Render`'s registry, the landmark
  guard, and `editor_data()` are read-only consumed, not modified).
- **Who is affected:** only an operator who inserts a SECOND `sgs/nav-drawer` block on a
  site that already has one (via the CPT Active drawer or another post). The common
  single-drawer-per-site case — the vast majority of real client sites today — sees zero
  behavioural change, because no collision is ever detected for it.
- **What this does NOT fix:** a drawer whose collision is with a drawer on a THIRD site in a
  multisite context, or a collision that only becomes true after BOTH blocks are already
  published with the default ref and one is edited later without re-opening the editor (the
  check runs on mount/attribute-change, not as a background cron) — acceptable residual risk
  given the mechanism is editor-time, matching the form-id precedent's own limits.

### Falsifiable prediction

If this fix is correct: opening the editor for a NEW `sgs/nav-drawer` block on a post where
`window.sgsBlocksData.activeDrawer.ref === 'sgs-nav-drawer'` already exists will, within one
re-render, show `drawerRef` change from `'sgs-nav-drawer'` to
`'sgs-nav-drawer-<8 hex chars>'` in the block inspector's Advanced panel, and a fresh
Playwright click on that post's burger will open ITS OWN `<dialog>` (matching `aria-controls`
to the newly-generated id), not the Active drawer's `<dialog>`. If the fix is wrong: the new
block keeps the colliding default, or the auto-generated ref is not reflected in the
rendered `aria-controls`/`<dialog id>` pair on the frontend.

### Validation command (baseline, before building)

```bash
# Confirm the current colliding state on the canary before any fix — 2 blocks, 1 dialog id.
node -e "
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('https://sandybrown-nightingale-600381.hostingersite.com/<mega-menu-test-page>/');
  const dialogs = await p.\$\$eval('dialog[id]', els => els.map(e => e.id));
  console.log('dialog ids found:', dialogs); // baseline expectation today: duplicate ids or only 1
  await b.close();
})();
"
```

Post-fix, re-run the same script and assert `dialogs.length === new Set(dialogs).size`
(no duplicate ids) plus a real burger click on each drawer resolving `aria-expanded` +
`dialog.open` on the CORRECT sibling dialog only.

---

## Orphaned palette slug renders silently blank

### The mechanism, stated precisely

`sgs_colour_value()` (`plugins/sgs-blocks/includes/helpers-tokens.php`, lines 588-629) has
exactly 3 branches: raw CSS colour → normalise + return; already-formed `var(...)` →
passthrough; **anything else → treated unconditionally as a design-token slug**, regex-
sanitised and wrapped as `var(--wp--preset--color--{slug})` with **no check the slug is
currently registered**. A `var()` referencing an undefined custom property with no fallback
is a guaranteed-invalid CSS value per spec — the whole declaration drops silently, with zero
console warning, zero visual signal. Confirmed live on the canary
(`.claude/verify/nav-review-reinvestigate-burger-colour.md`, Q1): a hand-typed unregistered
slug computed to `background-color: rgba(0,0,0,0)` — indistinguishable from "never set".

**Confirmed genuinely reachable in real use, not just as a hand-typed test artefact:**
neither colour-picker component in the codebase (`DesignTokenPicker.js::makeChangeHandler`,
`GradientCapableColourControl.js`) can WRITE an unregistered slug — both match against the
live palette at pick-time and fall back to a raw value if there's no match. But **nothing
re-validates a stored slug after the fact.** If a client (or Bean, on their behalf) later
renames or deletes a palette entry in Site Editor → Styles → Colors, every block that
previously picked that slug keeps the OLD slug string in its stored attributes — the render
path has no idea the palette changed, and the block goes silently invisible on next page
load. This is exactly the kind of "not declared ≠ does nothing, but also not detected ≠ safe"
failure the project's own MEMORY.md silent-failures cluster already tracks for other
mechanisms.

### Blast radius (framework-wide, not nav-menu-scoped)

`grep -ron "sgs_colour_value(" plugins/sgs-blocks/includes/*.php
plugins/sgs-blocks/src/blocks/*/render.php` → **335 call sites across 73 files.** The
`sgs-framework.db` DB confirms the same scale from the schema side:
`SELECT count(*) FROM block_attributes WHERE css_property LIKE '%color%'` → **790 rows.**
Every SGS block that colours anything (text, background, border, gradient stop, icon fill)
routes through this one function or its sibling `sgs_background_paint_value()`
(`helpers-tokens.php` lines 794-816, which itself calls `sgs_colour_value()` for the
flat-colour path). A fix here is genuinely universal by construction — CLAUDE.md Rule 3
("no per-block carve-outs") is satisfied trivially, because there is only one function to
fix and every caller inherits the change identically.

### Is a semantically-correct render-time fallback possible? — No, and don't try to fake one

The function cannot know what colour the client "meant" — that information was destroyed
the moment the palette entry was renamed/deleted, and guessing (e.g. "closest colour in the
new palette by name similarity") would produce a WRONG but confident-looking result, which
is worse than a visible gap because nobody would think to check it. This rules out any
"smart" render-time repair. What IS possible, and cause-agnostic (helps regardless of WHICH
palette entry was renamed, WHICH block used it, or WHY): make the CSS **degrade to a
guaranteed-visible value instead of a guaranteed-invisible one**, using CSS's own two-
argument `var()` fallback syntax — zero additional PHP computation, so it costs nothing
across the other 334 call sites that never hit an orphaned slug.

### Proposed fix shape

Change `sgs_colour_value()`'s final return (`helpers-tokens.php` line 629) from:

```php
return 'var(--wp--preset--color--' . $slug . ')';
```

to:

```php
return 'var(--wp--preset--color--' . $slug . ', currentColor)';
```

**Why `currentColor` and not a guessed brand colour or `inherit`:** `sgs_colour_value()` is
called for `color`, `background-color`, `border-color`, gradient stops, and SVG `fill` alike
— the function has no idea which CSS property its return value will be assigned to by the
caller, so the fallback must be valid and sensible for ALL of them. `currentColor` is the one
CSS value that resolves correctly regardless of property: for `color` itself, the CSS Color
spec explicitly defines `color: currentColor` as equivalent to `color: inherit` (no circular
reference); for `background-color`/`border-color`/`fill`, it resolves to the element's own
already-resolved `color` — which is guaranteed to have a real value because `color` is an
inherited property that always bottoms out at the UA default (black) if nothing else sets
it. A named brand colour (e.g. `primary`) was considered and rejected: it would be a second
guess layered on the first missing one, and if `primary` itself is ever the renamed/deleted
entry the fallback chain breaks at the same point it started.

This is a **cause-agnostic mitigation, not a fix for the underlying drift** — it does not
tell Bean or the client that a colour went missing, it only stops the failure mode from being
invisible. Per `~/.claude/rules/prove-the-cause-before-fix.md`, a mitigation alone is
acceptable when the actual cause (a palette edit made independently, at an unknown past time,
by an unknown editor) cannot be proven or prevented at the point of failure — the fix targets
the SYMPTOM class (silent invisibility) universally, which is the correct layer here.

**Second, separate half — discovery, not just degradation.** The CSS fallback prevents the
worst visual outcome but does not surface the drift to anyone. Propose a companion WP-CLI
command, `wp sgs audit-colour-tokens`, following the existing `wp sgs drawer clear-active`
naming convention already in the codebase:

1. Resolve the site's live registered palette via `wp_get_global_settings( 'color.palette' )`
   (flattens default + theme + user-custom origins into one slug list).
2. Walk every published/draft post's block content (`get_posts()` + `parse_blocks()`,
   recursive over `innerBlocks`, mirroring the existing recursive-walk pattern in
   `class-sgs-drawer-render.php::find_drawer_ref`).
3. For each block, cross-reference its attributes against the DB-authoritative colour-typed
   attribute list — `SELECT block_slug, attr_name FROM block_attributes WHERE css_property
   LIKE '%color%'` (790 rows today; DB-first per CLAUDE.md's "no hardcoded dicts" rule,
   never a hand-maintained attribute name list in the script).
4. For each such attribute whose STORED value is neither empty, nor a recognised CSS colour
   (`sgs_is_css_colour()`), nor an already-formed `var(...)`, treat it as a slug and check
   membership in the live palette from step 1. Report any miss: post ID, title, edit URL,
   block slug, attribute name, orphaned slug value.

This is a diagnostic tool Bean runs on demand (e.g. immediately after any Site Editor palette
edit, or periodically) — not a render-time gate, so it adds zero page-load cost and needs no
new hook.

### Falsifiable prediction

If this fix is correct: a fixture with an intentionally-renamed/removed slug (rebuild the
Wave 1 `burgerBg:"secondary"` fixture, since `"secondary"` provably has never existed in
Mama's palette) will compute `background-color` to the ELEMENT'S OWN resolved text colour
(matching `getComputedStyle(el).color` exactly), not `rgba(0,0,0,0)`. The companion
`wp sgs audit-colour-tokens` command run against the canary will list that exact fixture's
post ID and the `secondary` slug in its output. If the fix is wrong: computed
`background-color` stays transparent, or the audit command finds zero orphaned slugs on a
site known to have one.

### Validation command (baseline, before building)

```bash
# Baseline — confirm today's silent-invisible failure on the known fixture.
ssh -p 65002 u945238940@141.136.39.73 "cd ~/domains/sandybrown-nightingale-600381.hostingersite.com/public_html && wp post get 3488 --field=post_content | grep -o 'burgerBg\":\"[a-z]*\"'"
# Then, in Playwright: getComputedStyle(document.querySelector('#g14-neg-burger .sgs-nav-menu__burger')).backgroundColor
# Expected baseline TODAY: rgba(0, 0, 0, 0). Expected AFTER fix: matches .color, not transparent.
```

---

## E2 — State-hierarchy propagation (hover > current > normal, ancestor reflects descendant)

### What already exists to extend, confirmed by Wave 1.5

Two preconditions are already true, with zero markup or attribute changes needed:

1. `view.js::markCurrentPage` (lines 60-83) already stamps `aria-current="page"` on BOTH
   `.sgs-nav-menu__link[data-sgs-nav-path]` (top-level) and `.sgs-nav-menu__sublink` (submenu
   items), in both the bar and drawer forks.
2. `nav-menu-css.php`'s FR-41-13 rescue rule (lines 620-722) already emits the exact selector
   SHAPE this fix needs, for a different trigger condition (`:focus-visible` for the keyboard
   rescue, not `[aria-current="page"]`):

```
{uid} .sgs-nav-menu__submenu-root:has( ul.sgs-nav-menu__submenu :focus-visible ) > .sgs-nav-menu__link
{uid} .sgs-nav-menu__accordion-row:has( ul.sgs-nav-menu__submenu :focus-visible ) > .sgs-nav-menu__link
```

### Proposed fix shape — three selector families, in a defined precedence order

**1. Current-page propagation (Bean's point 3 — static, always-on).** Add, per uid, per
fork:

```css
{uid} .sgs-nav-menu__submenu-root:has( ul.sgs-nav-menu__submenu a[aria-current="page"] ) > .sgs-nav-menu__link {
	/* propagated-current declarations — see visual language below */
}
{uid} .sgs-nav-menu__accordion-row:has( ul.sgs-nav-menu__submenu a[aria-current="page"] ) > .sgs-nav-menu__link {
	/* same declarations */
}
```

This mirrors FR-41-13's keyboard rescue exactly, swapping `:focus-visible` for
`a[aria-current="page"]`. `:has()` needs no browser-support gate — FR-41-13 already ships
`:has()` unconditionally in production, so this fix inherits the same support floor.

**2. Hovered-descendant propagation (Bean's point 4 — dynamic, mirrors #1 but on `:hover`).**
Same shape, keyed on a hovered/focused descendant instead of the current-page marker:

```css
{uid} .sgs-nav-menu__submenu-root:has( ul.sgs-nav-menu__submenu :hover, ul.sgs-nav-menu__submenu :focus-visible ) > .sgs-nav-menu__link {
	/* propagated-hover declarations — visually distinct from #1, see below */
}
```

Wrap this rule in `sgs_hover_guarded_rule()` (the SAME helper FR-41-13 already uses for its
own mouse-hover half, `helpers-hover-state.php::sgs_hover_guarded_rule`) so it only applies
under `@media (hover:hover)` — a touch device tapping into a submenu must not get a stuck
"propagated hover" look with no way to clear it, the identical reasoning FR-41-13 already
applies to its own mouse rules.

**3. Precedence — hover always wins, per Bean's own stated rule.** CSS source order plus
existing specificity precedent settles this without new machinery: `nav-menu-css.php` already
documents "Current before Hover, same tie-breaker rule" at its own line ~326 for the item's
OWN two states — this fix reuses that exact convention by emitting selector family #1
(current propagation) BEFORE family #2 (hover propagation) in the generated stylesheet, so
when both are simultaneously true (an ancestor whose submenu holds the current page AND the
visitor is ALSO hovering something else inside it) the later, hover rule wins on any
overlapping declaration, at equal specificity (`(0,3,1)`, matching FR-41-13's own selectors
exactly). The item's OWN direct hover/current styling (not propagated) is a SEPARATE,
higher-specificity selector (`.sgs-nav-menu__link:hover`, no `:has()` needed) that already
exists and is untouched by this change — so "the top-level parent is itself being hovered"
continues to win over any propagated state from its children automatically, by source order
+ specificity, with no explicit `!important` or override needed.

**4. Visual language for the propagated state — a third, distinct treatment.** Spec 41 today
defines two visual languages: "this item IS the current page" and "this item is hovered."
Bean's ask requires the propagated state to be visually distinguishable from both, so a
visitor can tell "I am here" apart from "the page I'm on is somewhere in here." Recommend:
a NEW, lighter-weight custom-property-driven treatment — e.g. a low-opacity tint of the
existing `itemColourCurrent`/`itemBgCurrent` tokens (reuse the SAME colour tokens the item's
own Current state already resolves, at a reduced opacity via `color-mix()` or a dedicated
`--sgs-nav-propagated-opacity` custom property) rather than a brand-new attribute pair. This
keeps the fix inside the "reuse existing declarations, never hand-copy a duplicate that can
drift" discipline the FR-41-13 docblock already states for this exact file, and gives the
client no new inspector controls to learn — the propagated look derives automatically from
colours they've already picked.

### What this does NOT resolve (flag, do not silently assume)

- **Nesting depth.** The selector families above are written for ONE level of submenu
  nesting, matching Spec 41's own documented DOM shape (FR-41-1). Group G6's mega-menu form
  (once G6 above is fixed and testable) may nest deeper — this fix should be re-verified
  against a real mega-menu fixture before being called universal, per CLAUDE.md Rule 3.
- **The exact visual treatment (opacity value, colour-mix ratio)** is a design decision, not
  decided here — flagged for Bean's sign-off before implementation, not assumed.

### Falsifiable prediction

If this fix is correct: a Playwright script that (a) sets `location.pathname` to match a
sublink's `data-sgs-nav-path` so `markCurrentPage()` stamps that sublink `aria-current="page"`,
then (b) reads `getComputedStyle()` on the TOP-LEVEL parent link (not the sublink itself) will
show the propagated declarations applied, on BOTH bar (`.submenu-root`) and drawer
(`.accordion-row`) forks — with NO hover involved. A second script that additionally hovers a
DIFFERENT sibling submenu item while the first remains "current" will show the hovered
item's OWN direct hover winning on itself, and the current-page ancestor keeping ONLY its
propagated-current look (not the hover look), proving the two states don't bleed into each
other. If the fix is wrong: the top-level parent's computed style shows no change from its
resting state despite a real `aria-current="page"` sublink existing inside its submenu.

### Validation command (baseline, before building)

```bash
# Baseline — confirm NO propagation exists today (expected: parent computed style unchanged).
node -e "
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('https://sandybrown-nightingale-600381.hostingersite.com/step23-gate-spec41-nav-menu-interaction-gates/');
  await p.evaluate(() => {
    const sub = document.querySelector('.sgs-nav-menu__submenu a[data-sgs-nav-path]');
    if (sub) sub.setAttribute('aria-current', 'page'); // simulate markCurrentPage's own stamp
  });
  const parentLink = await p.\$('.sgs-nav-menu__submenu-root > .sgs-nav-menu__link');
  console.log(await parentLink.evaluate(el => getComputedStyle(el).color));
  await b.close();
})();
"
```

---

## Summary for Bean

Three separate proposals, three separate blast radii:

1. **G6** — nav-drawer/drawer-menu scoped only. Collision-gated auto-generation in
   `nav-drawer/edit.js`, reusing `form/edit.js`'s existing uid pattern plus the
   `activeDrawer` data channel `useDrawerNotice.js` already reads. Preserves the deliberate
   zero-config single-drawer pairing on all 9 shipped patterns; only fires on a genuine
   second-drawer collision.
2. **Orphaned slug** — framework-wide (335 call sites, 73 files). One-line CSS-fallback
   change to `sgs_colour_value()` (`currentColor`, not a guessed brand colour) plus a
   separate, DB-first `wp sgs audit-colour-tokens` discovery command. The fallback is
   cause-agnostic by design; it does not and cannot repair the actual drift, only stop it
   being invisible.
3. **E2** — nav-menu scoped, new feature. Two new `:has()` selector families extending
   FR-41-13's existing shape (current-propagation static, hover-propagation dynamic,
   hover-guarded), source-ordered so hover always wins per Bean's stated hierarchy, with a
   NEW distinct-but-derived visual treatment recommended (not yet Bean-approved) rather than
   reusing either existing state's look outright.

No implementation in this pass. Awaiting your sign-off on: the G6 collision-detection shape,
the `currentColor` fallback choice for the orphaned-slug fix (vs. a different universal
fallback if you have one in mind), and the propagated-state visual treatment for E2 before
any of these are built.

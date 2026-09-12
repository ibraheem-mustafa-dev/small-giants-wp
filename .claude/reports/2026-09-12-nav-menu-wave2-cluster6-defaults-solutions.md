# Nav-menu Wave 2 solution design — Cluster 6 (sensible defaults + context-propagation gap)

**Proposal only. No product code touched.** Scope: D3/F1 (no default submenu hover signal,
no default submenu-open animation) and G5 (nested-InnerBlock context requirement is a silent
failure mode). Source register: `.claude/reports/2026-09-12-nav-menu-visual-review-register.md`.
Wave 1 diagnostic evidence: `.claude/verify/nav-review-wave1-cluster3-interactivity.md`
(D3/F1) and `.claude/verify/nav-review-wave1-cluster6-border-fixtures.md` (G5).

Both issues are confirmed **design-default gaps, not broken mechanisms** — every piece of
underlying machinery (hover CSS emission, animation keyframes, block-context propagation) is
built and verified working once explicitly configured. This document proposes what the
DEFAULT should be, and how the editor should communicate the one architectural requirement
(G5) that has no default to fall back to.

---

## D3/F1 — Submenu hover signal + submenu-open animation defaults

### Current state (verified, not assumed)

- `nav-menu/block.json::attributes.submenuColourHover` — `"default": ""`
- `nav-menu/block.json::attributes.submenuLinkBgHover` — `"default": ""`
- `nav-menu/block.json::attributes.submenuAnimation` — `"default": "none"`
- `nav-menu-submenu-css.php::sgs_nav_menu_submenu_css` only emits a `:hover, :focus-visible`
  rule when `submenuColourHover`/`submenuLinkBgHover` is non-empty (lines 567, 598) — no
  fallback rule exists. This is a **deliberate** 2026-07-31 removal (FR-41-15 census #6/#8),
  not an oversight: the framework used to ship an unconditional hover tint here and it was
  removed because it silently painted over an operator's own colour choice and broke the
  text-sweep effect. The removal correctly fixed that bug, but left the untouched-instance
  case with zero hover feedback — a second-order gap the same fix created.

### What FR-41-36 already answers

FR-41-36 (Spec 41, locked 2026-09-11) is explicitly "the actual default token values"
ruling for FR-41-1/FR-41-3, and it directly covers the **Desktop submenu** row:

> Desktop submenu (dropdown panel) — Normal: bg=`surface-alt`, text=`primary`. Hover: hover
> row=`accent-light` tint, submenu-item divider=`accent`.

This answers the background half of D3 directly: **`submenuLinkBgHover` should default to
`accent-light`**, not `""`. FR-41-36 does **not** specify a Hover-state TEXT colour for the
desktop submenu row (only the top-bar row gets an explicit `text=accent` on Hover) — the
locked table's own governing principle explains why: a bg-only tint is a legitimate,
already-used differentiation device in this system (the top-bar Current state is
deliberately bg-less "text-colour-only", so "vary only one channel" is already an accepted
pattern here). **Recommendation: leave `submenuColourHover` at `""` (inherit `primary`
text)** — the bg tint alone is the FR-41-36-sanctioned signal, and adding an unspecified
text-colour default would be inventing a value the design council never ruled on.

FR-41-36's **Drawer nested submenu** row lists Hover/Current as `"—"` — genuinely
unspecified, not zero-by-design. The table's own "governing principle" is directly
applicable here though: *"the top bar and the drawer's nested submenu share the same 'plain'
tier... they are a matched PAIR... don't let one pair drift independently."* Top bar Hover is
`text=accent, bg=accent-light`. By the stated pairing rule, **drawer nested submenu Hover
should default to the same treatment**: `submenuLinkBgHover: "accent-light"` (shared with
desktop submenu, since both submenu contexts use the same attribute pair) plus — unlike
desktop submenu — this is the one place I am extending past what's literally tabled, flagged
below as an inference, not a locked value.

**FR-41-36 does not cover `submenuAnimation` at all** — that decision has no locked value to
inherit and needs its own reasoning.

### Proposed fix shape

**1. `submenuLinkBgHover` default: `""` → `"accent-light"`** (`nav-menu/block.json`,
   `attributes.submenuLinkBgHover.default`). Directly implements FR-41-36's Desktop submenu
   Hover row. This is a real palette token slug — confirm it resolves in Mama's theme
   snapshot before treating this as final (theme-snapshot palettes vary per client; if
   `accent-light` isn't a registered slug on a given client's `theme.json`, the resolver
   silently renders transparent, per the Group B root cause already found this session for
   `"secondary"`).

**2. `submenuColourHover` default: stays `""`.** No change. This is a "confirm the
   locked design intentionally leaves it unset" recommendation, not a build item.

**3. `submenuAnimation` default: `"none"` → `"fade"`.**

   Justification, tied to this session's own established "safe/subtle by default" reasoning
   (the motion-QA pattern already applied to scrub/scramble/split-reveal/pin-scrub): the two
   available values are `fade` and `slide-down`.
   - `fade` is a pure opacity transition — no directional assumption, no risk of the panel
     appearing to travel from/into the wrong edge (submenus can open below, above, or
     adjacent to the trigger depending on viewport collision — `mega-disclosure.js`'s own
     `repositionPanel` already handles overflow-flipping; a directional `slide-down` fights
     that flexibility, since a panel that gets flipped upward would visually "slide down"
     while flying away from its trigger).
   - `fade`'s `@media (prefers-reduced-motion: reduce)` companion (`style.css` lines 269-330,
     already built and verified in Wave 1) degrades to an instant end-state with zero visual
     artefact — the safest possible reduced-motion behaviour.
   - `slide-down` remains available as an opt-in for operators who want the more
     conventional "dropdown falls open" feel — it is a legitimate, common pattern, just not
     the safest UNCONDITIONAL default given the panel's position isn't fixed.

   This mirrors the CLAUDE.md non-negotiable that "no block feature is complete until every
   customisable property has a sane out-of-the-box value" and the framework's `imageControls`
   /`box-shadow` precedent of shipping a visible-but-restrained default rather than `none`.

### Falsifiable predictions

- P1: after the `submenuLinkBgHover` default change, a **freshly inserted, completely
  untouched** `sgs/nav-menu` instance with real submenu children will show a visible
  background tint change on `:hover`/`:focus-visible` on the FIRST sublink, with zero
  attributes set in the block markup.
- P2: `getComputedStyle(sublink).backgroundColor` before hover will differ from
  `getComputedStyle(sublink).backgroundColor` during `:focus-visible`, on an untouched
  instance (this was BYTE-IDENTICAL before the fix, per Wave 1's D3 evidence — that identity
  breaking is the proof).
- P3: after the `submenuAnimation` default change, an untouched instance's submenu panel
  will carry class `sgs-nav-menu__submenu-wrap--fade` in the rendered HTML with no `style`
  attribute set on the block.
- P4 (negative control): with `prefers-reduced-motion: reduce` forced, the same untouched
  instance's panel-open transition completes in ≤0.01ms (no visible fade), proving the
  reduced-motion companion still fires with the new default engaged.

### Baseline / validation commands

```bash
# Baseline — confirm current defaults before the change (should print "" / "" / "none")
python -c "
import json
b = json.load(open(r'plugins/sgs-blocks/src/blocks/nav-menu/block.json'))
a = b['attributes']
print('submenuColourHover default:', repr(a['submenuColourHover']['default']))
print('submenuLinkBgHover default:', repr(a['submenuLinkBgHover']['default']))
print('submenuAnimation default:', repr(a['submenuAnimation']['default']))
"

# After the change — same script should print "" / "accent-light" / "fade"

# Live validation (P1/P2) — fresh untouched instance, real menu with children (menu 112 was
# used in Wave 1; reuse it), no attributes set:
# 1. Insert <!-- wp:sgs/nav-menu {"ref":112} --><!-- /wp:sgs/nav-menu -->  on a scratch page
# 2. Playwright: getComputedStyle(sublink).backgroundColor before/after .focus()
#    Expect: differs (currently identical per Wave 1 line 21-24 of cluster3 report)

# P3 — grep the rendered HTML for the modifier class on an untouched instance
curl -s "https://sandybrown-nightingale-600381.hostingersite.com/?p=<scratch-page-id>" \
  | grep -o 'sgs-nav-menu__submenu-wrap[a-z0-9_-]*'
# Expect: "sgs-nav-menu__submenu-wrap--fade" present

# P4 — Playwright, force prefers-reduced-motion: reduce, measure transition duration via
# getComputedStyle(panel).animationDuration — expect "0.01ms"

# Palette-slug safety check (before shipping the accent-light default) — confirm the token
# resolves on every currently-live client, not just Mama's:
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql \
  "SELECT DISTINCT client_slug FROM theme_snapshots" 2>/dev/null || \
  grep -l '"accent-light"' sites/*/theme-snapshot.json
```

---

## G5 — Nested-InnerBlock context requirement is a silent failure mode

### Confirmed architecture (read, not inferred)

Two genuinely different, coexisting linking mechanisms between `sgs/nav-drawer` and
`sgs/nav-menu`, both looking like "the thing that connects them":

1. **`drawerRef`** (string attribute on both blocks) — wires the OPEN/CLOSE Interactivity
   API plumbing (`aria-controls` / store actions). Works identically whether the two blocks
   are siblings or nested — it is a plain string match consumed at the JS/interactivity
   layer, not a Gutenberg structural relationship.
2. **Block Context** (`nav-drawer/block.json::providesContext` →
   `{"sgs/navDrawerSubmenuModel": "submenuModel"}`, consumed by
   `nav-menu/block.json::usesContext: ["sgs/navDrawerSubmenuModel"]`) — this is standard WP
   core behaviour: `WP_Block::render()` resolves context from the PARSED BLOCK TREE, ancestor
   → descendant, before a child's render callback runs. It **cannot** propagate between
   sibling blocks under any circumstance — this is not an SGS limitation, it's how Gutenberg
   block context works everywhere in WordPress core (e.g. `core/post-template` →
   `core/post-title` uses the identical mechanism).

`render.php` lines 440-444 document this precisely: *"A `sgs/nav-menu` with no
`sgs/nav-drawer` ancestor never receives this context key at all... so the flat bar... stays
the default."* The marker/context-dependent controls (`sublinkMarkerIcon` and its
Hover/Current colour family, lines 445-564) fall back to a fixed default
(`lucide`/`chevron-right`) with **no error, no console warning, no visual indication** that a
richer feature silently didn't apply.

### Judging the two options against existing architecture

**Option B (make the mechanism also work via `drawerRef` string match, removing the nesting
requirement) — not recommended.** This would require `render.php` to reach OUTSIDE its own
block tree at render time — parsing the full current post's block markup (or the Active
Drawer CPT's markup, depending on render path — two different routes per the
`nav-drawer-render.php`/`class-sgs-drawer-render.php` split documented in `render.php`'s own
context comment) to find a sibling block sharing the same `drawerRef` value, then reading
ITS `submodel` attribute directly rather than through `$block->context`. This:
- Duplicates Gutenberg's own context-resolution machinery by hand, for one specific pairing,
  rather than using the primitive WordPress already gives every block author.
- Has the exact ambiguity problem already surfaced by G6 in the same investigation: a
  `drawerRef` string is not scoped to be unique (defaults to the literal `"sgs-nav-drawer"`
  site-wide), so "find the sibling with a matching `drawerRef`" is not even a
  well-defined operation today — it would need G6's separate uniqueness fix as a
  precondition, or it inherits the exact same collision bug.
- Makes the block's declared `usesContext` a lie (it would ALSO read state through a second,
  parallel, string-matched path), which is a maintainability trap for whoever next reads
  the file cold — R-31-9-style "no divergent per-block mechanism" thinking applies here too:
  Gutenberg's context API is the UNIVERSAL mechanism every other block in this codebase
  already relies on (nav-drawer isn't special); inventing a second bespoke path for this one
  pairing is the kind of divergence this project's own binding rules exist to prevent.

**Option A (editor-side warning via `getBlockParents`) — recommended.** This works WITH the
existing, correct architecture rather than against it:
- No render.php / PHP context change at all — zero risk to the working mechanism.
- Directly serves CLAUDE.md's "Client experience is primary" rule: *"Clients are
  tech-illiterate — they use the block editor exclusively... every customisable property
  must be exposed as an inspector control. If a setting requires touching code, it is not
  done."* An inspector control whose effect silently depends on tree position with no
  indication in the UI is exactly the gap that rule exists to close.
- Generalises correctly: this is not the ONLY context-dependent control on this block — any
  future `usesContext`-gated feature gets the same protection for free, rather than needing
  its own bespoke warning.

### Proposed fix shape

In `plugins/sgs-blocks/src/blocks/nav-menu/edit.js::Edit`, add a `<Notice>` (or
`<InspectorControls><PanelBody>` warning banner, matching this project's existing inspector
warning conventions — check `SgsColourPanel`/existing block edit.js files for the current
warning-notice component pattern before hand-rolling a new one) that renders when BOTH of
these are true:
1. The operator has touched a marker-related control away from its default — i.e.
   `attributes.sublinkMarkerIcon` is set to something other than the declared default
   (`{source:'lucide', name:'chevron-right'}`), OR any of the marker colour family
   (`sublinkMarkerColour`, `*Hover`, `*Current`, gradient siblings) is non-empty.
2. `wp.data.select('core/block-editor').getBlockParents(clientId)` (or the `useSelect`
   equivalent already used elsewhere in this block's `edit.js`, if any) does not include a
   block whose `name === 'sgs/nav-drawer'` among the returned ancestor client IDs.

Copy direction (plain English, matching the "tech-illiterate client" framing): *"This icon
only appears when this Nav Menu block is placed inside a Nav Drawer block (nested, not just
linked). Move it inside the Nav Drawer to use a custom icon here."*

Do **not** gate this on `drawerRef` being set — a block can have `drawerRef` set (for
open/close wiring) while ALSO being correctly nested (the real production pattern, post
2671, does both), so the warning must key purely on ancestor presence, not on the presence or
absence of `drawerRef`, to avoid a false-positive warning on a correctly-built instance.

### Falsifiable predictions

- P5: opening the block editor on a `sgs/nav-menu` instance placed as a **sibling** of
  `sgs/nav-drawer` (matching `drawerRef` only), with a non-default `sublinkMarkerIcon` set,
  shows the new warning notice in the inspector.
- P6: opening the block editor on the SAME configuration but nested correctly inside
  `sgs/nav-drawer` shows NO warning.
- P7: opening the block editor on a sibling-composed instance with the marker left at its
  untouched default shows NO warning (the notice must not fire just because the block is a
  sibling — only when a control that WON'T WORK there has actually been touched).

### Baseline / validation commands

```bash
# Baseline — confirm no warning notice exists in edit.js today
grep -n "getBlockParents\|nav-drawer" plugins/sgs-blocks/src/blocks/nav-menu/edit.js

# After the change — confirm the new check is present and reads clientId correctly
grep -n "getBlockParents" plugins/sgs-blocks/src/blocks/nav-menu/edit.js

# Live validation — reuse Wave 1's two existing fixture pages, no new pages needed:
# - Page 3500 "Spec41-Wave1-Group-G-Fixtures" (sibling composition) → expect warning visible
#   in the editor (Playwright: browser_navigate to wp-admin editor for page 3500, take
#   snapshot, confirm Notice text present)
# - Page 3507 "Spec41-G5-Fixed-Nested" (correct nesting) → expect NO warning
```

---

## Summary table

| Item | Fix shape | File(s) | Risk if not shipped |
|---|---|---|---|
| D3 (submenu hover bg) | `submenuLinkBgHover` default `""` → `"accent-light"` | `nav-menu/block.json` | Every untouched submenu ships with zero hover affordance |
| F1 (submenu animation) | `submenuAnimation` default `"none"` → `"fade"` | `nav-menu/block.json` | Every untouched submenu opens with a jarring instant cut |
| G5 (context requirement) | Editor `<Notice>` gated on `getBlockParents` ancestor check | `nav-menu/edit.js` | Client builds a sibling-composed drawer, picks a custom marker icon, sees no error, ships silently broken |

None of these three are proposed as PHP/render changes beyond the two block.json default
values — no `render.php`, no CSS, no context-model change. Ready for Bean's sign-off before
implementation.

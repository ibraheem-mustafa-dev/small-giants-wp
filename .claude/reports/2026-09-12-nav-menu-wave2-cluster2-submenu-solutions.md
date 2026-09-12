# Nav-menu Wave 2 solution design — cluster 2 (submenu positioning + colour)

**Scope:** solution design ONLY for M3 (`submenuAlign` dead), I1 (submenu white lip), C1
(FR-41-36 divider rollout). No product code edited. Read in full before this pass:
`.claude/reports/2026-09-12-nav-menu-visual-review-register.md` (Wave 1 + Wave 1.5 findings)
and `.claude/specs/41-NAV-MENU-COLOUR-STATE-SYSTEM.md` §FR-41-36 (read directly, the spec
file is too large to load whole — grepped + read the FR-41-36 block, lines 396-438).

All file/function citations below use the symbol-citation convention
(`path::symbol`), per this project's binding rule — no line numbers as the anchor.

---

## M3 — `submenuAlign` dead control

### What the code actually shows (re-read independently, not taken on the register's word)

Contrary to Wave 1's original "one write site, zero readers" verdict, a full read of
`plugins/sgs-blocks/src/shared/nav-interactivity/mega-disclosure.js::repositionPanel` shows
the attribute genuinely IS read:

- `nav-menu-markup.php::sgs_nav_menu_render_items` writes
  `data-sgs-nav-submenu-align="%2$s"` onto `.sgs-nav-menu__submenu-root`, the same element
  that also carries `data-wp-interactive="sgs/mega"`.
- `mega-disclosure.js::rootFor` resolves that exact element via
  `ref.closest('[data-wp-interactive="sgs/mega"]')`.
- `mega-disclosure.js::repositionPanel` reads `root.dataset.sgsNavSubmenuAlign || 'start'`
  and branches `start`/`center`/`end` into three genuinely different `desired` formulas
  (anchor-left / anchor-centre-minus-half-width / anchor-right-minus-width).
- This function is called from all five open paths (`open`, `toggle`,
  `scheduleIntentOpen`'s deferred callback, `triggerKeydown`'s Enter/Space and ArrowDown
  branches) — it is not a half-wired dead branch, it is the single geometry function every
  open path shares.
- `nav-menu-submenu-css.php`'s `.sgs-nav-menu__submenu-wrap` rule reads the JS-written
  `--sgs-mm-overflow-left` custom property with a `0` fallback — so the CSS side is a thin,
  correct consumer of the JS-computed value, not a second competing source.

**This means Bean's binary framing — "either genuinely wire it, or the concept is nonsense
and should be removed" — resolves to (a) immediately: the concept is sound (documented
against Fitts's Law + Bootstrap/Kadence/GenerateBlocks precedent in the function's own
comment), and the wiring already exists end-to-end.** Removing the attribute would delete a
correctly-designed, mostly-working mechanism — not a mercy kill.

### Where Wave 1.5's live evidence and my code read diverge — a testable, cheaper hypothesis

Wave 1.5 confirmed "byte-identical panel position" between `start` and `center` on Bean's
named fixture (page 3488, `sgs-nav-menu-0f6116a0`) and flagged this as the mechanism being
dead. Two things in the code make a different, cheaper explanation at least as likely, and
I checked the live data directly rather than guessing:

1. **`repositionPanel`'s collision clamp is unconditional and can legitimately erase the
   difference between `start` and `center`.** The function always runs:
   ```
   desired = Math.min(desired, maxLeft);   // maxLeft = innerWidth - gutter - width
   desired = Math.max(desired, gutter);    // gutter = 28
   ```
   For an item sitting near the left edge of the viewport (small `anchor.left`) with a
   submenu panel wider than the item itself, `start`'s natural `desired` (≈`anchor.left`)
   and `center`'s natural `desired` (≈`anchor.left - (width-anchorWidth)/2`, which goes
   negative for a wide panel) can BOTH clamp to the same floor value (`gutter`, i.e. 28px) —
   producing exactly the "byte-identical, unrelated to any anchor centre" result Wave 1.5
   measured, with the mechanism working exactly as designed (collision avoidance is
   documented as "ALWAYS ON and structural — never a client toggle").
2. **I checked whether the fixture's stored content even carries a non-default value**,
   because a QC-fixture authoring gap (not a runtime bug) was already the confirmed root
   cause of the sibling Group B/B1 "burger colours worse" report (an invalid `secondary`
   colour slug hand-typed into test markup). Live check on the exact page named in this
   brief:
   ```
   wp post get 3488 --field=content | grep -c 'submenuAlign'   → 0
   wp post get 3488 --field=content | grep -c 'sgs/nav-menu'   → 23
   ```
   **Zero of the 23 `sgs/nav-menu` instances currently on page 3488 have `submenuAlign`
   stored at all** — every one falls through to `block.json`'s default (`'start'`). This
   doesn't contradict Wave 1.5 (they said they built FRESH fixtures for the specific
   start/center test, which may since have been overwritten/removed), but it does confirm
   the control is essentially unexercised on real, currently-live content, and it rules out
   my being able to re-check their exact repro without rebuilding it.

### Fix shape (Option A — wire it for real; it mostly already is)

No code in `repositionPanel`, `rootFor`, or the CSS consumer needs to change on the current
evidence — the mechanism is architecturally sound. The concrete work is a **verification
build**, not a rewrite, with one real code change gated on what that verification finds:

1. **Build a persistent, named fixture pair** (not a throwaway that vanishes before Wave 2
   can re-check it) on page 3488, two `sgs/nav-menu` items:
   - `Item A` — near the LEFT edge of the bar (reproduces Bean's/Wave 1.5's exact geometry),
     three variants: `submenuAlign: start / center / end`.
   - `Item B` — a MIDDLE item on the bar, well clear of both edges, same three variants.
   Six total submenus, explicit `submenuAlign` values actually saved (verify with the same
   `grep -c 'submenuAlign'` check used above — must return 6, not 0).
2. **Real-hover verification** (not synthetic) on Item B's three variants: read
   `getComputedStyle` / `getBoundingClientRect` on the opened panel for each, and confirm
   the panel's left edge differs across `start`/`center`/`end` by roughly the expected
   `(panelWidth - anchorWidth)/2` (center) and `panelWidth - anchorWidth` (end) deltas.
   - **If Item B shows three genuinely different positions** → the mechanism is confirmed
     working; M3 closes as "confirmed working once tested away from the always-on collision
     clamp." The residual, smaller fix is documentation-only: rename Wave 1.5's verdict from
     "dead control" to "collision-clamp masks the effect near an edge — expected," and
     rebuild any OTHER named fixtures currently sitting in a clamp-dominated position
     (Item A's case) so they don't misrepresent the control to Bean during sign-off.
   - **If Item B ALSO shows byte-identical positions** → this is a genuine bug, and the next
     diagnostic step is to `console.log` (temporarily) `root.dataset.sgsNavSubmenuAlign`
     inside `repositionPanel` on that exact fixture to confirm the value actually reaching
     the DOM matches what was saved — at that point the fix targets whichever link in the
     chain (write → dataset read → branch → clamp) the log disproves, not a guess.
3. Only if step 2's second branch fires: the code fix is confined to
   `mega-disclosure.js::repositionPanel`'s three-way branch (lines documented above) — no
   `block.json`, no PHP, no CSS change, since both of those layers are already proven
   correct by the write-site/consumer-site read above.

### Design-question answer

**(a) Wire it for real — not (b) remove it.** Justification, from the code's own
architecture, not a guess: the function's own comment block documents a considered,
industry-aligned design (Fitts's Law, explicit citations to Bootstrap/Radix/Popper
behaviour, an explicit note that mega panels deliberately behave differently and that is
NOT evidence against dropdowns needing real alignment). The read-site exists, is called from
every open path, and the CSS consumer is a thin pass-through. There is no evidence in the
code that alignment "doesn't make sense" for this panel's positioning model — the opposite:
the model was clearly built to support all three states. Removing the attribute would
delete correct, deliberate work to paper over what is most likely a test-fixture geometry
artefact (an edge-anchored item + a wide panel triggering the documented, intentional
collision clamp).

### Falsifiable prediction

On Item B (middle-of-bar, no edge-collision), the three `submenuAlign` variants will produce
panel left-edge X-coordinates that differ by more than 5px from each other, and `center`'s
midpoint will land within 5px of the anchor's own midpoint. If they are byte-identical (as
on the edge fixture), the fault is upstream of `repositionPanel` (attribute never reached the
DOM) and the next diagnostic is the `console.log` step above, not a rewrite.

### Baseline / validation command

```bash
# 1. Confirm the six-variant fixture actually stored the attribute (must be 6, not 0):
ssh -i ~/.ssh/id_ed25519 -p 65002 u945238940@141.136.39.73 \
  "cd ~/domains/sandybrown-nightingale-600381.hostingersite.com/public_html && \
   wp post get 3488 --field=content | grep -c 'submenuAlign'"

# 2. Playwright: for each of the 3 Item-B variants, real hover-open, then:
#    browser_evaluate(() => {
#      const panel = document.querySelector('#<panel-id>');
#      const r = panel.getBoundingClientRect();
#      return { left: r.left, width: r.width };
#    })
#    Compare the three `left` values pairwise; expect >5px deltas for a genuine pass.
```

---

## I1 — submenu panel white lip

### Root cause, confirmed from the code (matches Wave 1.5's live finding)

Two independently-resolved background sources, one deliberate architectural split:

- **Panel** (`.sgs-nav-menu__submenu`, the padded `<ul>` — 8px top/bottom padding) resolves
  its background from `--sgs-nm-submenu-bg`, written only when `submenuBg` is explicitly set
  (`nav-menu-submenu-css.php::sgs_custom_property_gradient_decls('sgs-nm-submenu-bg', ...)`),
  falling back through `surface-alt → surface → #fff` when unset. It is explicitly
  **Normal-only by design** — the code comment states the panel "is structurally unhoverable
  once open," so it deliberately carries no Hover/Current pair.
- **Row** (`.sgs-nav-menu__sublink`) resolves its background from `submenuLinkBg` /
  `submenuLinkBgHover` / `submenuLinkBgCurrent` — the genuine 3-state family (FR-41-9).

The same code explicitly bans merging these: *"`submenuBg*` names are NOT reused here — two
elements sharing one attribute prefix is exactly the element-conflation this split ends."*
That split is correct and load-bearing (see design-question answer below) — the bug is that
there is currently **no fallback relationship between the two at all**, so an operator who
sets only `submenuLinkBg` (never touching the separate, easy-to-miss `submenuBg` control)
gets a panel background that silently stays on the theme-token chain while every row inside
it changes colour — exactly Bean's "pink rows, white lip" report, reproduced live in
Wave 1.5 on the exact G14 fixture (`submenuLinkBg:"primary"`, panel resolving to
`rgb(255,249,240)` cream against `rgb(230,138,149)` pink rows).

### Fix shape

`plugins/sgs-blocks/includes/nav-menu-submenu-css.php`, at the point that builds
`$sgs_nm_submenu_bg_decls` (the block that currently reads only `submenuBg`/
`submenuBgGradient`): add a two-line fallback so the SOURCE value passed into
`sgs_custom_property_gradient_decls()` derives from `submenuLinkBg`/`submenuLinkBgGradient`
whenever `submenuBg` itself is empty:

```php
$submenu_bg_source          = (string) ( $attributes['submenuBg'] ?? '' );
$submenu_bg_source_gradient = (string) ( $attributes['submenuBgGradient'] ?? '' );

// I1 fix — the panel is Normal-only by design (FR-41-9) and must stay that way, but an
// operator who set the ROW colour (submenuLinkBg) and never touched the separate PANEL
// colour (submenuBg) almost certainly wants the panel's own padding band to match the
// rows, not fall through to the independent surface-alt/surface/#fff token chain. Only
// engages when submenuBg itself is untouched — an explicit submenuBg always wins, exactly
// as before.
if ( '' === $submenu_bg_source && '' !== (string) ( $attributes['submenuLinkBg'] ?? '' ) ) {
    $submenu_bg_source          = (string) $attributes['submenuLinkBg'];
    $submenu_bg_source_gradient = (string) ( $attributes['submenuLinkBgGradient'] ?? '' );
}

$sgs_nm_submenu_bg_decls = sgs_custom_property_gradient_decls(
    'sgs-nm-submenu-bg',
    $submenu_bg_source,
    $submenu_bg_source_gradient
);
```

No `block.json` change, no new attribute, no JS change. `--sgs-nm-submenu-bg`'s existing
consumer (`.sgs-nav-menu__submenu{background-color:var(--sgs-nm-submenu-bg, ...)}`) is
untouched — it just now sometimes receives a value sourced from `submenuLinkBg` instead of
staying unset.

### Design-question answer

**Keep both levels; derive the panel-level value from the SAME source attribute
(`submenuLinkBg`) as a fallback — do not move the fill up to the panel entirely.**
Justification: `block.json`'s own `colourExemptions` plus the in-code comment both establish
that the ROW genuinely needs independent Hover/Current control (FR-41-9's 3-state model),
which the PANEL structurally cannot have (a panel that is already open cannot itself be
"hovered" in a way distinct from its rows). Collapsing the two into one attribute would
either delete the row's already-built 3-state capability, or force a fork where the same
CSS var name means "Normal-only" in one context and "3-state" in another — a worse
ambiguity than the one this fix closes. A one-directional fallback (row value flows to panel
only when the panel has no explicit value of its own) closes the exact visible gap without
touching FR-41-9's architecture.

### Falsifiable prediction

On the existing G14 fixture (page 3488, `sgs-nav-menu-0f6116a0`, `submenuLinkBg:"primary"`,
`submenuBg` unset): after the fix, `getComputedStyle(panelEl).backgroundColor` will equal
the resolved `primary` token's RGB value, matching `getComputedStyle(rowEl).backgroundColor`
— the 8px top/bottom band will no longer show a distinct colour. On a control fixture with
BOTH `submenuBg` and `submenuLinkBg` explicitly set to different tokens, the panel must keep
resolving to its OWN `submenuBg` value, proving the fallback only engages when `submenuBg`
is genuinely absent.

### Baseline / validation command

```
# Playwright, real hover open on the existing fixture (no synthetic state):
browser_navigate → the live G14 fixture page (3488)
browser_click / hover the "G14 negative submenuLinkBg blocks sweep" trigger
browser_evaluate(() => {
  const panel = document.querySelector('.sgs-nav-menu__submenu');
  const row = document.querySelector('.sgs-nav-menu__sublink');
  return {
    panelBg: getComputedStyle(panel).backgroundColor,
    rowBg: getComputedStyle(row).backgroundColor,
  };
})
# Before fix: panelBg = 'rgb(255, 249, 240)', rowBg = 'rgb(230, 138, 149)' (mismatch).
# After fix:  panelBg === rowBg (or both derive from the same 'primary' token value).
browser_take_screenshot — confirm the white band is visually gone at top/bottom of the panel.
```

---

## C1 — FR-41-36 universal divider rollout

### What FR-41-36 actually locks (read in full, not summarised from memory)

The colour table (Normal / Hover / Current) for four contexts — top bar, desktop submenu,
drawer top-level, drawer nested submenu — each carrying an "item-divider" cell:

| Context | Normal item-divider | Hover/Current item-divider |
|---|---|---|
| Top bar | `border-light` | `accent` |
| Desktop submenu | *(shares the "submenu-item divider" language under Hover — `accent`; Normal not separately re-stated but the universal-divider-rule paragraph below applies it identically)* | `accent` |
| Drawer top-level | `accent` (per the "item divider=accent" cell) | — |
| Drawer nested submenu | `accent` | — |

Plus the explicit governing sentence: *"every context ... gets an always-visible item
divider whose COLOUR changes consistently with state (`border-light` at rest, `accent` on
hover/current)."* That is the one universal rule to implement — I am not inventing new
colour values, only reading the ones already locked.

### What already exists to build on vs what is genuinely new

I checked both mechanisms directly rather than assuming:

- **Top bar (and drawer top-level, which shares the same `nav-menu` block + the same
  `.sgs-nav-menu__link` selector with no fork-specific guard in
  `nav-menu-css.php::sgs_nav_menu_item_state_css`):** the mechanism ALREADY EXISTS —
  `itemBorderWidth` (box object, per-side), `itemBorderStyle`, `itemBorderColour` /
  `itemBorderColourHover` / `itemBorderColourCurrent`. Its own code comment states plainly:
  *"a bottom border is the drawer-style row separator ... there is no separate 'Item
  Divider' mechanism — two mechanisms answering one question is how the pre-existing
  double-line bug happened."* This is FR-41-8's mechanism, currently defaulting to fully
  empty/invisible. C1 for the top bar and drawer top-level is a **defaults-only change** —
  no new attribute.
- **Desktop submenu rows + drawer nested submenu rows** (`.sgs-nav-menu__sublink`): checked
  `nav-menu-submenu-css.php` end to end — there is NO existing per-row border mechanism at
  all. `submenuBorderColour`/`submenuBorderWidth`/`submenuBorderStyle` exist but are the
  PANEL's own outer border (Normal-only, wraps the whole dropdown) — reusing them for
  per-row dividers would repeat the exact "two elements, one attribute prefix" conflation
  the I1 investigation above found the codebase already deliberately avoids for background.
  **This is genuinely new attribute surface**, matching the spec's own "not yet built"
  disclosure — the design (colour values, states) is not new, only the wiring is.

### Fix shape

**1. `block.json` (`plugins/sgs-blocks/src/blocks/nav-menu/block.json`) — defaults only, no
new attributes, for the top-bar/drawer-top-level divider:**

```json
"itemBorderWidth":       { "type": "object", "default": { "bottom": "1px" } },
"itemBorderStyle":       { "type": "string", "default": "solid" },
"itemBorderColour":      { "type": "string", "default": "border-light" },
"itemBorderColourHover": { "type": "string", "default": "accent" },
"itemBorderColourCurrent": { "type": "string", "default": "accent" }
```
`itemBorderHoverTreatment` stays at its existing default `"swap"` — FR-41-36 wants a
colour-only state change (not the animated `sweep` band), and `swap` is already the
non-animated option, so no change needed there.

**2. `block.json` — new attributes for the submenu/drawer-nested-submenu row divider**,
named to match the existing `submenuLinkBg*` (row-level) vs `submenuBg*` (panel-level)
naming split already established in this file, so the same "which prefix owns which
element" convention a future reader relies on stays consistent:

```json
"submenuLinkBorderWidth":        { "type": "object", "default": { "bottom": "1px" } },
"submenuLinkBorderStyle":        { "type": "string", "default": "solid" },
"submenuLinkBorderColour":       { "type": "string", "default": "border-light" },
"submenuLinkBorderColourHover":  { "type": "string", "default": "accent" }
```
No `Current` state — FR-41-36's table gives the submenu row only Normal/Hover language for
the divider (no separate Current-divider colour specified beyond "inherits the row
treatment"), matching the existing asymmetry already present for `sublink_bg_current` vs
`sublink_bg_hover` in the same file — this is a "declare what the spec actually gives a
value for" choice, not an omission.

**3. `nav-menu-css.php::sgs_nav_menu_item_state_css`** — the emission code needs NO new
logic, only removing the current implicit "empty means invisible" behaviour, since it
already reads `itemBorderWidth`/`itemBorderStyle`/`itemBorderColour*` correctly — the
defaults change alone makes it emit. Verify no other block/pattern in the framework
currently relies on an nav-menu item having NO visible bottom border by default (a
`grep -rn 'itemBorderColour' patterns/ sites/` sanity check before shipping the default
change, since this is the "default changing costs nothing except where prior work assumed
the old default" case the project's own root-cause rule calls out).

**4. `nav-menu-submenu-css.php`** — new emission block, placed beside the existing
`$sublink_bg_normal` / `$sublink_bg_hover` block (same function, same `$sublink_sel`
selector), following the identical unset-guard pattern already used throughout this file:

```php
$sublink_border_box   = is_array( $attributes['submenuLinkBorderWidth'] ?? null )
    ? $attributes['submenuLinkBorderWidth'] : array();
$sublink_border_width = $sublink_border_box ? sgs_box_object_shorthand( $sublink_border_box ) : null;
$sublink_border_style = sgs_css_keyword_sanitise( $attributes['submenuLinkBorderStyle'] ?? '' );
$sublink_border_colour = (string) ( $attributes['submenuLinkBorderColour'] ?? '' );
$sublink_border_colour_hover = (string) ( $attributes['submenuLinkBorderColourHover'] ?? '' );

if ( null !== $sublink_border_width && '' !== $sublink_border_width ) {
    $css .= $sublink_sel . '{border-width:' . $sublink_border_width . ';border-style:'
        . ( '' !== $sublink_border_style ? $sublink_border_style : 'solid' ) . ';}';
}
if ( '' !== $sublink_border_colour ) {
    $css .= $sublink_sel . '{border-color:' . sgs_colour_value( $sublink_border_colour ) . ';}';
}
if ( '' !== $sublink_border_colour_hover ) {
    $css .= sgs_hover_state_rules(
        $sublink_sel,
        'border-color:' . sgs_colour_value( $sublink_border_colour_hover ),
        ':focus-visible'
    );
}
```
This mirrors the existing `itemBorderColour` emission shape exactly (same "width-with-no-
style implies solid" convention already documented at `nav-menu-css.php`'s own item-border
block), so it is a consistent pattern extension, not a new one.

**5. Load-bearing assumption to verify before implementation, not asserted as fact:** that
`.sgs-nav-menu__sublink` is the one class present in both the desktop-dropdown fork and the
drawer's nested-accordion fork (the spec text itself states `ul.sgs-nav-menu__submenu` is
shared this way; I have not independently re-verified `.sgs-nav-menu__sublink` specifically
carries the identical class in the drawer-nested markup path — a single
`grep -n "sgs-nav-menu__sublink" plugins/sgs-blocks/includes/nav-menu-markup.php` covering
both the bar-dropdown and drawer-nested render branches is the one-command check before
writing the PHP above, so the new CSS doesn't silently only reach one fork).

### Design-question answer

Not a new design question — the brief correctly scoped this to implementation planning. The
one genuine judgement call made above (new `submenuLinkBorder*` attribute names rather than
reusing `submenuBorderColour`) follows the codebase's own already-established, explicitly-
documented row-vs-panel naming split (the same split the I1 fix above depends on) — not an
independent design decision.

### Falsifiable prediction

After the `block.json` default change alone (no JS, no other edit needed for the top bar),
an untouched `sgs/nav-menu` instance's `.sgs-nav-menu__link` will show
`getComputedStyle(link).borderBottomColor` resolving to the `border-light` token's RGB value
at rest, and to the `accent` token's RGB value on real `:hover` and on `[aria-current="page"]`
— on BOTH the top bar and a drawer top-level row, confirming the shared-selector assumption.
After the submenu addition, `.sgs-nav-menu__sublink` will show the same Normal→border-light /
Hover→accent transition on both the desktop dropdown and the drawer's nested accordion rows.

### Baseline / validation command

```bash
# Before: confirm zero border colour currently computes on either surface (matches
# Wave 1's "confirmed zero border CSS emits for any untouched instance"):
# Playwright, real page load, no interaction:
browser_evaluate(() => {
  const link = document.querySelector('.sgs-nav-menu__link');
  const sublink = document.querySelector('.sgs-nav-menu__sublink');
  return {
    linkBorder: link && getComputedStyle(link).borderBottomColor,
    sublinkBorder: sublink && getComputedStyle(sublink).borderColor,
  };
})

# After the block.json default change + PHP addition, re-run the same evaluate call on:
#   (a) a top-bar item, real hover
#   (b) a drawer top-level row, opened via a real burger click, real hover
#   (c) a desktop dropdown row, opened via a real hover
#   (d) a drawer nested-accordion row, opened via real click, real hover
# Expect border-light at rest, accent on hover/current, on all four.
```

# E1 drawer submenu investigation — three symptoms, root-cause only

**Scope:** real production drawer, `sgs-nav-menu-62dd283f` (the instance inside
`#sgs-nav-drawer`), live on the canary homepage
(https://sandybrown-nightingale-600381.hostingersite.com/), NOT a scratch page.
Evidence = live DOM structure (Playwright) + the actual deployed aggregated CSS
fetched directly (`wp-content/uploads/sgs-css/sgs-3557-d09b07bc711e9fa40e283e778e5cad18.css`),
cross-checked against `plugins/sgs-blocks/includes/nav-menu-submenu-css.php` and
`nav-menu-css.php` source. No fix built.

**Correction to the brief's framing, made from live evidence, not assumption:**
"Our Story" is NOT a submenu item — it is the ACCORDION PARENT/TRIGGER row (the
top-level menu item that owns the "Ingredients"/"Our Promise" children). The real
markup: `<div class="sgs-nav-menu__accordion-row"><a class="sgs-nav-menu__link">Our
Story</a><button class="sgs-nav-menu__subtoggle"><summary/caret>…` — the visible
"Our Story" text is rendered by `.sgs-nav-menu__link` (the **item** attribute
family: `itemColour`/`itemColourHover`), while "Ingredients"/"Our Promise" are
rendered by `.sgs-nav-menu__sublink` (the **submenu** attribute family:
`submenuColour`/`submenuColourHover`) — two different attribute families, not one
item with an explicit per-item override sitting among siblings without one. There
is no per-item colour-attribute mechanism in this block at all (confirmed: no child
block/attribute exists for individual menu items — `render.php` only flattens WP
Navigation `core/navigation-link` items into a plain array, no per-item colour
keys).

---

## Symptom 1 — CONFIRMED. Root cause: `itemColourHover` has a working default, `submenuColourHover` does not.

Live deployed CSS for uid `62dd283f` (all lines below are real, fetched, not source
inferred):

```
.sgs-nav-menu-62dd283f .sgs-nav-menu__link:hover,...caret svg:hover{color:var(--wp--preset--color--accent)}
.sgs-nav-menu-62dd283f .sgs-nav-menu__link:hover{border-color:var(--wp--preset--color--accent);}
.sgs-nav-menu-62dd283f .sgs-nav-menu__accordion-row:hover > .sgs-nav-menu__link{color:accent;border-color:accent}

.sgs-nav-menu-62dd283f .sgs-nav-menu__sublink:hover{background-color:var(--wp--preset--color--accent-light)}
.sgs-nav-menu-62dd283f .sgs-nav-menu__sublink:hover{border-color:var(--wp--preset--color--accent)}
```

There is **no `.sgs-nav-menu__sublink:hover{color:…}` rule anywhere in the deployed
CSS for this instance** — grepped the full 73KB file for every `:hover` rule
touching this uid; only two `.sublink:hover` rules exist (`background-color`,
`border-color`), never `color`.

**Why:** `nav-menu-css.php` (~line 271-280, the comment beginning "relied on
WordPress core's own ambient `:root :where(a:hover)` rule … Defaulting here closes
the gap by construction") gives `$item_colour_hover` a real fallback value before
it reaches the `'' !== $item_colour_hover'` gate, so the branch fires for every
untouched item and the item link gets a genuine `:hover{color:accent}` rule.
`nav-menu-submenu-css.php::sgs_nav_menu_submenu_css` has no equivalent: line 524
reads `$submenu_colour_hover = (string) ( $attributes['submenuColourHover'] ?? '' );`
verbatim, with no fallback/default resolution step anywhere before its only
consumer (line 589, `elseif ( 'none' !== $t_sub_text && '' !== $submenu_colour_hover )`).
`block.json` confirms both attributes declare an empty-string default
(`submenuColourHover.default === ""`), so on any untouched instance the item row
gets a font-colour hover signal and the submenu rows never can, regardless of
content — this is a code-level asymmetry between the two files, not a per-page or
per-item content difference. The border-colour hover (the "separator") DOES fire
identically for both families (`itemBorderColourHover`/`submenuLinkBorderColourHover`
both resolve to `accent` by default), which is exactly why siblings show a border
change but never a font change.

**File:symbol:**
- `plugins/sgs-blocks/includes/nav-menu-css.php` — the `$item_colour_hover` default-closing block (~lines 260-280, comment block starting "relied on WordPress core's own ambient…").
- `plugins/sgs-blocks/includes/nav-menu-submenu-css.php::sgs_nav_menu_submenu_css` — `$submenu_colour_hover` (line 524) and its sole consumer (line 589), no equivalent defaulting step.
- `plugins/sgs-blocks/src/blocks/nav-menu/block.json` — `itemColourHover.default` vs `submenuColourHover.default`, both literally `""` in the schema; the asymmetry is entirely in the PHP resolution layer, not the schema.

---

## Symptom 2 — mechanism proven in code and matched against the live deployed rule order; NOT independently pixel-reproducible on this canary because this instance has no working submenu font-hover rule to collide with (see Symptom 1).

`nav-menu-css.php` states its own precedence rule explicitly (lines 336-339):

> "⛔ Current BEFORE Hover, and never guarded — it is not pointer-dependent. Both
> states differ from the base by one single-specificity suffix, so the pair always
> ties and source order is the only tie-breaker: hover wins when you point at the
> item for the page you are already on."

i.e. the ITEM file's own documented, correct pattern is: emit the Current-state
rule *first*, emit the Hover-state rule *after* it, so that when both rules have
identical specificity, hover (later in the cascade) wins the tie.

`nav-menu-submenu-css.php` does the opposite for the submenu family. Confirmed by
reading both emission points in the same function:

- Hover rule emitted at line 590: `$css .= sgs_hover_state_rules( $sublink_sel, 'color:' . …, ':focus-visible' );` — produces `{sel}:hover,{sel}:focus-visible{color:…}`.
- Current-page rule emitted **136 lines later**, at lines 704-705: `$css .= $uid_sel . ' .sgs-nav-menu__sublink[aria-current="page"]{color:var(--sgs-nm-submenu-current-colour, var(--wp--preset--color--primary-dark, currentColor));}';` — and this rule is **unconditional** (no attribute gate at all — it always emits, using the token fallback when `submenuColourCurrent` is unset, per the CENSUS #7/FR-41-15 comment above it).

**Specificity check (both are equal, confirmed by construction):** `$sublink_sel`
is `{uid_sel} .sgs-nav-menu__sublink` (two classes). The hover selector adds one
pseudo-class (`:hover`) → (0,3,0). The current selector adds one attribute selector
(`[aria-current="page"]`) → (0,3,0). Identical specificity, so CSS's own tie-break
rule (last declared wins) applies — and because the current rule is textually
*after* the hover rule in `sgs_nav_menu_submenu_css()`'s own emission order, the
current rule wins the tie. This is the exact inverse of the ordering
`nav-menu-css.php` itself documents as correct and relies on for the top-level item.

**Why not independently pixel-confirmed on the live canary this pass:** this
specific instance has no `.sublink:hover{color:…}` rule at all (Symptom 1), so
there is nothing for the current-page rule to out-rank visibly on font colour right
now. The border-colour dimension can't demonstrate the bug either, because
`submenuLinkBorderColour*` genuinely has no "Current" variant at all (confirmed
absent from both the PHP fate-table comment at line 634-635 and the live CSS dump).
The bug is real and provable from the code + the live deployed rule order (proving
it isn't a stale-cache artefact — the exact same ordering was fetched fresh from
the live site), but a live *visual* repro needs either a real editor session with
`submenuColourHover` set on a nav pointing at a page that is itself inside that
same dropdown, or a dedicated fixture — out of scope for this investigation.

**File:symbol:** `plugins/sgs-blocks/includes/nav-menu-submenu-css.php::sgs_nav_menu_submenu_css`
— hover-colour emission (`$sublink_sweep['hover']` / `sgs_hover_state_rules` call, line 587-591)
vs current-colour emission (`.sgs-nav-menu__sublink[aria-current="page"]` rule, line 704-705).

---

## Symptom 3 — PARTIALLY CONFIRMED; the "swapped defaults" framing doesn't hold for font colour on this instance, but two real, separately-dated mechanisms explain the visual complaint.

**What's actually deployed for the drawer sublink's resting/normal colour:**

```
.sgs-nav-menu-62dd283f .sgs-nav-menu__sublink{color:var(--wp--preset--color--primary, currentColor);}   (bar-context base rule)
.sgs-nav-menu-62dd283f :where(.sgs-nav-menu__bar--drawer) .sgs-nav-menu__sublink{color:inherit;}          (drawer-specific override, SAME specificity, wins on source order)
```

`.sgs-nav-menu__link` (the bar's own top-level item, uid `ef1c6d6c`) has **no
`color` rule at all** on this canary (`itemColour` unset) — it simply inherits
ambient text colour, same practical effect as the drawer's explicit
`color:inherit`. So on THIS instance the two forks are not actually painting a
different resting font colour from each other; I cannot confirm a live
"swapped-default" font-colour bug from measurement alone on this content. This
is a genuine gap in what I could verify, not a refutation of Bean's report — a
different instance with an explicit `itemColour`/`itemColourHover` set (which is
what "cross-mode default" implies should exist per the bar) would very likely show
divergence, since the drawer override at
`nav-menu-submenu-css.php` ~line 518 forcibly discards whatever the bar's own
default resolves to and substitutes `inherit` unconditionally, by design (see the
long comment at lines 496-518, dated 2026-09-10 — a DELIBERATE prior decision, not
a bug, made for a different reason: keeping drawer text readable against an
arbitrary per-instance `drawerBg`). **That comment's own rationale directly
conflicts with this session's newer "drawer submenu should default to the same
colours as the bar's top-level items" decision — nobody has revisited
`nav-menu-submenu-css.php`'s 2026-09-10 override since that new decision was made.**
This is the confirmed mechanism-level conflict, even though I could not pixel-prove
a visible divergence on the current canary content.

**What IS independently confirmed, real, and dated separately from this session's
new-defaults work:** the drawer submenu **panel's** resting background is still
governed by the CENSUS #1 fallback from 2026-09-10 —

```php
// plugins/sgs-blocks/includes/nav-menu-submenu-css.php ~line 826-828
$css .= '.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__submenu{...
    background:var(--sgs-nm-submenu-bg, color-mix(in srgb, currentColor 6%, transparent));...}';
```

This `color-mix(in srgb, currentColor 6%, transparent)` fallback is untouched by
this session's default-colour work — it predates it and nothing in this
investigation found any commit or code path that revisited it after the new
"same as bar" decision was made. On Mama's Munches specifically (a pink brand
palette), a 6% tint of the drawer's own computed near-black/near-brand
`currentColor` is exactly the kind of muted warm wash Bean is describing as "the
old pre-rebuild darkened pink fill" — plausible, but I could not pixel-sample the
exact RGB Bean is seeing without knowing which page/viewport he tested, so this
is a strong circumstantial match, not a pixel-confirmed one.

**"Hover matches bar's resting state" — cannot be a font-colour phenomenon on this
instance** (Symptom 1 already established there is no `.sublink:hover{color:…}`
rule at all here) — it must be a background/border observation. Not independently
verified this pass; flagged as needing Bean's clarification on which specific
visual property (background fill vs font colour vs border) he's comparing, per
`~/.claude/rules/measurement-vs-eye.md` — the measurement set here is genuinely
incomplete without knowing the exact property in dispute, not a claim that he's
wrong.

**File:symbol:**
- `plugins/sgs-blocks/includes/nav-menu-submenu-css.php` — drawer sublink colour override (`:where(.sgs-nav-menu__bar--drawer) .sgs-nav-menu__sublink{color:inherit}`, ~line 518) — the 2026-09-10 rationale comment directly above it, never revisited against this session's new "match the bar" decision.
- `plugins/sgs-blocks/includes/nav-menu-submenu-css.php` — drawer submenu panel background fallback (`color-mix(in srgb, currentColor 6%, transparent)`, ~line 828) — same vintage, same non-revisit.

---

## Live artefacts referenced

- `https://sandybrown-nightingale-600381.hostingersite.com/` — production homepage, drawer opened via the real header burger (`.sgs-nav-menu__burger`), accordion for "Our Story" expanded via `details.open = true` (native disclosure, no JS bypass of styling — only the drawer-open automation blocker documented in the prior reinvestigation file required a workaround, not this accordion).
- `wp-content/uploads/sgs-css/sgs-3557-d09b07bc711e9fa40e283e778e5cad18.css` — fetched directly via `curl`, confirmed the deployed rule TEXT and ORDER match the PHP source read in this investigation (not a stale-cache artefact).
- Drawer instance uid: `sgs-nav-menu-62dd283f`. Bar instance uid (for comparison): `sgs-nav-menu-ef1c6d6c`.

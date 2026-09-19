---
doc_type: spec
spec_id: 37
spec_version: 1.3.0
title: SGS Header/Footer Builder — CPT editing home, container blocks, behaviours, binding
project: small-giants-wp
status: active
authors: [Claude Code, Bean]
last_verified: 2026-09-19
references:
  - .claude/specs/36-SGS-NAVIGATION-SYSTEM.md          # nav — the extension of this spec
  - .claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md
  - .claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md
  - .claude/specs/35A-BLOCK-INSPECTOR-UX-ENFORCEMENT-AND-BUILD-REFERENCE.md
  - .claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md
  - .claude/plans/archive/2026-07-18-P2-builder-ux-design-gate.md
  - .claude/plans/archive/2026-07-18-P1-architecture-decision-header-footer-nav.md
  - .claude/plans/archive/2026-07-13-header-footer-nav-system-design-gate.md
absorbs: []
absorbed_by: null
lock_reason: null
---

# Spec 37 — SGS Header/Footer Builder

> Spec 36 (Navigation) is the *extension* of this spec, not a competitor: this spec owns the
> container, the editing home and the binding; Spec 36 owns everything inside the nav, plus the
> Site-Info data store.

---

## 0. Plain English (read this first)

**What this is.** The one document describing how an SGS website's header and footer are
built, edited, and attached to the site.

**The rule.** A header or footer has exactly one editing home, the `sgs_header` / `sgs_footer`
CPT admin screen. Neither the Site Editor nor the WP Customiser edits header or footer content;
two places to edit one thing is how they drift apart.

**The answer.** A header is a post. You write it in *SGS → Advanced Headers*, exactly like
writing a page, then press **Set as active**. That is the only editing home.

**Status honesty.** Some of this is already built. Every requirement below carries a
`Status:` of `BUILT`, `PARTIAL` or `NOT-BUILT` with a `path::symbol` pointer, so nobody rebuilds
what exists and nobody assumes something works because a similar-sounding file exists.

---

## 1. Scope and ownership boundary

### 1.1 This spec OWNS

- The `sgs_header` / `sgs_footer` CPTs as the **single editing home**, and the locked `sgs_drawer`
  post (FR-37-43/46/49): its CPT, Active pointer, render path and post picker.
- The **binding** — how a CPT post becomes the live header/footer.
- The container blocks: `sgs/site-header`, `sgs/site-header-row`, `sgs/site-footer`,
  `sgs/site-footer-row` — their row model, layout contract and controls.
- Header **behaviours**: sticky, transparent, shrink, hide-on-scroll.
- The **starter looks**: the native picker shared with `sgs_mega_menu` (FR-37-7) and the preset
  control for the locked CPTs (FR-37-47).
- The display-conditions **rules engine** (`Sgs_Header_Rules` / `Sgs_Footer_Rules`).
- Keeping the legacy header/nav surface out of the framework (FR-37-21).
- The CPT family table and the shared admin machinery around it (§5).

### 1.2 This spec does NOT own

| Surface | Owner |
|---|---|
| Everything inside the nav (menus, dropdowns, mega panels, drawer contents) | **Spec 36** |
| The `sgs_form` and `sgs_choice_flow` CPTs | Specs 42 / 43 |
| Header/footer clone walker | Spec 33 Part 2 |
| Site Info store (`sgs_site_info`) + the `sgs/site-info` binding source | **Spec 36** — FR-36-23 already names `sgs/business-info` "the Site-Info source of truth" |
| The shared header/footer element blocks — cart, search, social, logo, business-info | **Spec 36** FR-36-19…23 |
| Block styling/serialisation contract | Spec 32 |
| Inspector control completeness | Spec 35A Part L |

**The boundary rule.** Spec 36 §1 already states it does not own the container; this spec
states it does not own the nav. Neither may quietly annex the other. A change that crosses
the line requires an edit to BOTH specs in the same commit.

---

## 2. Architecture

### 2.1 The model in one paragraph

A header or footer is a **post** of type `sgs_header` / `sgs_footer`, authored in the normal
block editor from a starter look. One post per type is marked **active** via
`wp_options['sgs_active_header_cpt_id']` / `['sgs_active_footer_cpt_id']` (and the menu drawer via
`['sgs_active_drawer_cpt_id']`, rendered on `wp_footer` — FR-37-43). On the frontend,
`pre_render_block` intercepts the `core/template-part` block for that area and **renders the
active post's content directly** via `do_blocks()`. The theme's `parts/header.html` and
`parts/footer.html` remain as thin shells so WP's template system stays intact, but they hold
no authored content. Operators who need a header that varies by page type use the rules
engine (FR-37-20), which is the advanced path over the same mechanism.

### 2.2 Why direct render, and not block patterns

Turning each published CPT post into a *block pattern*
(`register_block_pattern()`) and resolving a pattern slug at render time is structurally broken:

- CPT-derived patterns register on **`admin_init`** only —
  `plugins/sgs-blocks/includes/class-sgs-block-cpts.php::register_patterns_from_cpts`.
- The rules engine resolves on **`pre_render_block`**, a frontend hook —
  `plugins/sgs-blocks/includes/class-sgs-header-rules.php::filter_template_part`.
- Resolution looks up `WP_Block_Patterns_Registry::get_registered()` —
  `plugins/sgs-blocks/includes/class-sgs-header-rules.php::render_pattern`.
- On a frontend request that pattern is never registered, so the lookup returns `null`, the
  filter returns `$pre` untouched, and the theme default renders.

Net effect: **a CPT-authored header can never reach the frontend, silently.** No error, no
warning — a silent-failure class. Registering the patterns on `init` instead would
"fix" it at the cost of a `get_posts()` query on every frontend page load, which is precisely
why they are registered on `admin_init` in the first place.

Direct render sidesteps the whole mechanism: read the post, run `do_blocks()`. It cannot be
broken by pattern-registration timing because it never consults the registry.

### 2.3 Patterns still matter — as starters, not as a render path

The two uses are distinct and must not be conflated again:

| | Starter patterns | Direct render |
|---|---|---|
| When | **Create time** — once | **Display time** — every request |
| What | Seeds blocks into a new post | Reads an existing post's content |
| Registry | Yes, admin-only is fine | Never consulted |

A starter library is therefore fully compatible with §2.2, and is required by FR-37-7 and FR-37-8.

### 2.4 Silent-failure guards in the direct-render branch

Two failure modes render a header that looks right while being subtly wrong (a silent
failure class). The direct-render branch guards both.

1. **An empty render must fall through to the default.** `pre_render_block` short-circuits on any
   **non-null** return, not merely a truthy one. A valid, published, correctly-pointed post whose
   blocks all fail their own render callbacks yields `''`, and that empty string would still
   short-circuit and paint a blank header with no error. `Sgs_Active_Layout::render_active()`
   therefore validates the RENDER OUTPUT as well as `post_content`: an empty render returns
   `null` and the default renders.

2. **A second slot for the same area must not render a different header.** The branch
   short-circuits before `evaluate()`, so the rules engine's own `$evaluated_this_request` guard
   is unset when a second `core/template-part` for the same area resolves; `evaluate()` would then
   match the immutable default rule and paint the framework default into the second slot.
   `Sgs_Active_Layout` therefore tracks *attempted* and *served* separately: `has_served()` hands a
   second slot back to core rather than to the rules engine, while an empty render (attempted, not
   served) still falls through to the default.

**Design rule:** any hook that consumes the header through a route OTHER than `pre_render_block`
(`Sgs_Header_Behaviours` on `body_class` is one) must be CPT-aware in lockstep, and every
short-circuit boundary must distinguish "I produced output" from "I tried".

---

## 3. Container block design

### 3.1 Header — three named rows

Three fixed, optional, named rows. Fixed-and-named (not arbitrary N) because it is
predictable for a non-coder, and because the cloning converter needs a deterministic target
to map a scraped header into.

| Slot | Purpose | Default layout |
|---|---|---|
| `top` | Thin utility strip — contact, search, social, account | cluster |
| `middle` | Primary — logo, nav, cart, primary CTA | cluster |
| `bottom` | Message / selling point / overflow | cluster |

### 3.2 Footer — three named rows

| Slot | Purpose | Default layout |
|---|---|---|
| `top` | CTA / newsletter | cluster |
| `columns` | The link/info columns | **columns** |
| `bottom` | Trademark, company name, policy links, attribution | cluster |

### 3.3 Row layout modes

Both row blocks (`sgs/site-header-row`, `sgs/site-footer-row`) carry a `layout` attribute
(`flex` | `grid`), a per-device `columns` count and a per-device `gridTemplateColumns`. The two
modes are explicit and intentional, and a row defaults to one of them per slot (§3.1/§3.2):

- **`cluster`** — a horizontal flex group (header rows never wrap — §3.6). For rows of unlike
  items (logo + nav + cart). This is what every header row needs.
- **`columns`** — an equal-width grid whose **column count the operator sets as a number**.
  For the footer's columns row.

**Columns are a COUNT by default.** The operator sets how many
columns they want — different sites need different numbers — and the columns behave like every
other piece of SGS content: they **stack on mobile automatically**, with no second setting to
configure. A per-device override exists for anyone who wants e.g. 2 on tablet, but it is never
required to get sensible behaviour.

⛔ **Not a ratio STRING.** The raw `gridTemplateColumns` string (`2fr 1fr`) is never the
operator-facing control alongside the count: a hand-typed CSS grid template is a developer
concept, and a text field of `fr` units in front of a non-coder client fails the
operator-simplicity bar (FR-37-26).

✅ **A VISUAL column-shape picker is how a non-count shape is reached.** The rule against a typed
string concerns the *input control*, never the *capability*. A row of small column diagrams the
operator clicks is not a developer concept — it is how WordPress core's own Columns block
presents this, and it is the standard every builder uses. The shape stays reachable while the raw
string stays hidden.

**Why (evidence, not preference):** a reference teardown of an Awwwards-winning ecommerce footer
(Cecilie Bahnsen) measured its legal strip at `grid-template-columns: 340px 680px 340px` — a
deliberate **wide-centre** shape. A count can NEVER produce it. "Wide centre, narrow edges" and
"wide brand column, narrow link columns" are common best-in-class footer shapes, so a count-only
control silently rules out a whole class of good design. A capability our controls cannot reach
is a **build opportunity, not a reason to avoid the design**.

**Binding constraints on the build:**
- The picker writes the **EXISTING** `gridTemplateColumns` attribute (object, per-device) —
  **no new stored shape**, so the converter round-trips unchanged (the FR-37-28 preset rule).
- **The count remains the default control.** The shape picker is the second, optional step —
  a client who just wants "4 columns" never meets it.
- Per-device, like the count, and it **still stacks to 1 column on mobile automatically** —
  an asymmetric desktop shape must never survive to a phone.
- The active shape is **DERIVED** from the stored value, never separately stored, so a
  hand-edited value shows no active shape rather than lying (the FR-37-28 rule).
- Shapes are expressed in `fr` (plus `auto` for the `fit-centre` shape), not px, so they stay
  fluid (the reference's `340px 680px 340px` is ≈ `1fr 2fr 1fr`).

**Status:** `PARTIAL` — `plugins/sgs-blocks/src/components/ColumnShapePicker.js::ColumnShapePicker` is mounted in
`sgs/site-footer-row`, `sgs/site-header-row` and `sgs/container` `edit.js` (the container reaches it
through `container/components/LayoutPanel.js` with `enableColumnShapePicker`), and emits
`1fr auto 1fr` for the `fit-centre` shape. Verification on a live site and Bean's eye check are
owed. Verify the mounts with
`git grep -n "ColumnShapePicker" -- plugins/sgs-blocks/src/blocks`.

An operator may change a row's `layout`. The picker gives a non-coder a control in place of the raw
`gridTemplateColumns` string, and gives the header row the same grid capability as the footer row —
without either being an unexplained special case.

### 3.3a Row creation, ordering and uniqueness

The three rows are **seeded and locked by the parent container**, not created by the operator.

- Each container defines its three rows as a fixed `TEMPLATE` array in `edit.js`
  (`plugins/sgs-blocks/src/blocks/site-header/edit.js::TEMPLATE`, `plugins/sgs-blocks/src/blocks/site-footer/edit.js::TEMPLATE`) passed to
  `useInnerBlocksProps`. This is a client-side template, which is why neither `block.json`
  declares one.
- **`templateLock` is `'all'` on both containers** (`site-header/edit.js`, `site-footer/edit.js`).
  WordPress's `'insert'` prevents adding and removing blocks but **still permits moving them**, so
  an operator could drag the bottom row above the top one; `'all'` closes that.
- **Row content stays freeform.** `templateLock` does not cascade through nesting levels, and
  both row blocks set `templateLock: false` at their own level (`site-header-row/edit.js`,
  `site-footer-row/edit.js`). Locking the container therefore locks only the three rows —
  §3.5's freeform model inside a row is untouched.
- ⛔ **`templateLock: 'all'` ALSO re-applies the template — the template must be passed ONLY when
  the container is empty.** `'all'` does two jobs, not one. Per WP 7.0.2 source
  (`wp-includes/js/dist/block-editor.js`, `useInnerBlockTemplateSync`):
  `shouldApplyTemplate = currentInnerBlocks.length === 0 || templateLock === 'all' ||
  templateLock === 'contentOnly'` — so a locked block re-applies its template even when it
  already has children, and `synchronizeBlocksWithTemplate` (`wp-includes/js/dist/blocks.js`)
  matches rows by **array position + block name only** (`blocks[index]`); `rowSlot` is never
  consulted. Left unguarded, this corrupts a populated starter at insert and destroys content
  (a header starter loses its search bar; a footer starter loses its copyright line). Both
  containers therefore pass `template: isEmpty ? TEMPLATE : undefined`, latched on first render —
  `templateLock` stays `'all'`, and withholding the template is a true no-op in core
  (`synchronizeBlocksWithTemplate` opens `if (!template) return blocks;`). Re-application after
  seeding is separately gated by core's `hasTemplateChanged` ref: children added to the
  template's *empty* rows survive later edits and re-renders.
- **No `rowSlot` enum or uniqueness guard is added.** The empty-only template pass means the sync
  never rewrites a populated container, so a duplicate `rowSlot` cannot occur. A schema-level
  validator here would be a second guard overlapping a working one — forbidden by
  `~/.claude/rules/prove-the-cause-before-fix.md`.

**What the converter gets:** a deterministic target — `sgs/site-header > sgs/site-header-row`
with `rowSlot` ∈ {`top`,`middle`,`bottom`}, and the footer equivalent with `columns` in place of
`middle`. Fixed count, fixed identity, fixed order, no duplicate handling required (FR-37-22).

### 3.4 Empty row = zero output

An empty row renders **nothing** — no wrapper, no padding, no margin. This is a real fix, not
a nicety: an empty slot that still emits padding causes header padding-bleed.

### 3.5 It is a page with a header-aware container

A row accepts **freeform** content (`site-header-row` declares no `allowedBlocks`) rather than
a fixed "typed element palette" of permitted block types.

**The model:** a header or footer is edited **like a page**. What makes it
a header is not a restricted list of permitted blocks — it is the **container**, which carries
settings and controls suited to building a header (rows, slots, behaviours, per-device
cascade). The rules live in the container's behaviour, not in a whitelist of what may enter.
This is the same shape as the `sgs_mega_menu` CPT, which is why the two feel alike.

Concretely:
- Any block may be placed in a row. There is no `allowedBlocks` lock.
- The row's **placeholder and inserter promote** the common elements (logo, nav, search, cart,
  account, CTA, contact, social, business-info) — steering, not gating.
- The container supplies what a page cannot: named row slots, empty-row suppression,
  never-overflow, behaviours, and the per-device cascade (§3.8).

**Why freeform.** A hard `allowedBlocks` lock breaks two standing rules. (1) R-31-9
universality — the cloning pipeline must place whatever a draft actually contains; a locked
palette turns any unlisted element into an unfixable clone failure. (2) It fights the
framework's own composability, where any SGS block may nest in any container. The non-coder
benefit a palette would give is delivered by steering (starter templates + promoted palette), and
costs nothing on the day an operator needs something unusual.

### 3.6 Never-overflow contract

The contract is independent of the editing home:

- **Header cluster rows NEVER wrap or stack.** `flex-wrap: nowrap` +
  `min-width: 0` on children. The row yields by SHRINKING — gap first, then every child
  proportionally (flexbox's own algorithm; no JS), each stopping at its own floor: interactive
  controls at 44px, the logo at `min(100%, var(--sgs-header-logo-min, 7.5rem))`.
  The logo carries no `flex-shrink: 0` and must not gain one — unshrinkable at 240px it overflows
  a 320px viewport once wrapping is gone (WCAG 1.4.10).
- **Footer column rows collapse INTRINSICALLY, not at a breakpoint.** The
  operator's per-device count is a CEILING, declared via `supports.sgs.intrinsicColumns` and emitted
  as `repeat(auto-fit, minmax(min(100%, max(var(--sgs-col-basis,16rem), calc((100% − (N−1)·gap)/N))), 1fr))`.
  The `(N−1)·gap` term is not optional — omit it and one extra column squeezes in. The count control
  is labelled **"Maximum columns"** accordingly.
- **Both CSS-length paths share one validator.**
  `sgs_responsive_sanitise_css_value()` (`includes/helpers-responsive.php`) — which validates
  `gap`, `gridTemplateColumns`, `contentWidth`, `maxWidth`, `padding` and `margin` for BOTH row
  blocks plus `nav-bar-menu`, `nav-drawer`, `mega-panel`, `mega-aside` and the shared wrapper —
  delegates to `sgs_css_length_value()` (`includes/helpers-css-safety.php`). It fails closed rather
  than stripping, and `repeat` stays on the validator's allowlist so every `grid-template-columns`
  value in the framework, including FR-37-11's intrinsic-columns value, validates. The RAW-INPUT
  breakout check, not the function-name list, is what provides the security.
- `clamp()` for fluid type/space rather than breakpoint steps where possible.
  `sgs_container_gap_value()` (`includes/helpers-container.php`) delegates to the shared
  `sgs_css_length_value()` validator, which parses `var()`/`calc()`/`min()`/`max()`/`minmax()`/
  `clamp()` with WordPress core's own recursive balanced-paren grammar. The header row's `gap`
  default is `clamp(0.5rem, 0.25rem + 1.5cqi, 1rem)` (`plugins/sgs-blocks/src/blocks/site-header-row/block.json::attributes.gap`)
  — `cqi` is safe there because the row sets `container-type: inline-size` on itself and the
  wrapper emits `gap` onto `.sgs-container__inner`, whose ancestor container IS the row; do not
  copy `cqi` to a block without a guaranteed container ancestor (silent fallback to viewport
  units is the failure mode). `scripts/diff-gap-sanitiser.php` compares the validator's gap output
  with the allowlist sanitiser byte for byte.
- Container queries for row-level reflow (a row can collapse while the viewport is wider —
  see STOP-CONTAINER-TIER-IS-NOT-VIEWPORT). `container-type: inline-size` stays on both rows.
- **Gate:** `scrollWidth <= innerWidth` **swept 1400 → 320px in ≤10px steps**, not sampled at
  375/768/1440: a defect can live BETWEEN those tiers (clean at 770px, broken at 766px), so a
  three-tier check passes a broken row. Harness: `scripts/row-fit-sweep.mjs`
  (its `--self-test` proves it fails on the known-broken fixture).

### 3.7 Global defaults + Site Info inheritance

Every element in both containers MUST default
from two shared sources, never from per-block literals:

1. **Global style tokens** — `theme.json` / `wp_global_styles`, and for cloned sites the
   Spec 33 `theme-snapshot.json`.
2. **The Site Info store** — `sgs_site_info` via the `sgs/site-info` bindings source.

A value set once in Site Info renders identically in header and footer with no re-entry.

### 3.8 Per-device content cascade

Per-device adaptation is a **cascade with override**, not a set of bespoke per-element
mechanisms:

- **Desktop is the base.** Tablet inherits desktop; mobile inherits tablet.
- An operator may **hide or remove** a block at a tier. That change applies to **that tier and
  every tier below it**, and never to a tier above.
- Once a lower tier is explicitly edited, it **stops inheriting** and holds its own value.
- The same inherit / explicit-on / explicit-off distinction as FR-37-14's tri-state, applied
  to **content presence** rather than to a setting.
- **Scope boundary:** this down-cascade governs header/footer CONTENT curation ONLY. General
  block visibility (`sgsHideOnMobile/Tablet/Desktop`, the universal extension) is EXCLUDED from
  inheritance and keeps three independent per-device switches — a device-specific block is hidden
  on desktop precisely because it exists for mobile/tablet, so a cascading desktop-hide would
  defeat the setting. The shared `resolveTier()` cascade contract is defined in
  `plans/archive/2026-07-28-resolveTier-cascade-design-gate.md`; FR-37-14 consumes it as specified.

There is no `move-to-drawer` mechanism (relocating a header element into the drawer at small
widths): it is too complex for the value it returns.

**`labelCollapse` is an operator toggle and stays.** Spec 36 (FR-36-8, FR-36-23) reuses the built
`labelCollapse`; the two specs must give the same instruction about one shipped mechanism.
The rule: an operator-controlled TOGGLE stays, an AUTOMATIC behaviour does not. `labelCollapse` is a
toggle — both consumers declare it as a `block.json` attribute driven by an inspector
`SelectControl` with `value` + `onChange`, defaulting to `'none'` (off): `plugins/sgs-blocks/src/blocks/button/edit.js::labelCollapse`
and `plugins/sgs-blocks/src/blocks/business-info/edit.js::labelCollapse`. It is operator-controlled, opt-in, and inert unless
switched on.

The cascade HIDES an element at a tier, whereas `labelCollapse` keeps the element and its link
target while collapsing its label to icon-only. Hiding is not collapsing, so the two stay
non-interchangeable.

**Status:** the cascade MECHANISM (`resolveTier()` + `ResponsiveTriStateControl` + scoped emission)
is BUILT and LIVE-VERIFIED (FR-37-14). The header-CONTENT-hiding FEATURE that consumes it — hide a
block at a tier and every tier below — is owned by this spec and is NOT-BUILT. Re-test whether
`labelCollapse` still earns its place when that feature ships.

### 3.9 Header and footer content is per-site, never git-tracked

A site's header and footer live in **that site's database** (the CPT posts), not in the
framework repo. The framework ships *starter patterns* (FR-37-8) and the *immutable default*
(FR-37-4) — never a client's actual header or footer.

**Why this is a requirement and not a nicety.** A framework pattern that carries one client's
footer — their name and a hardcoded Google Place CID — ships to every install and appears on other
clients' sites. Per-site storage in the CPT is what structurally prevents that.

**Per-site storage, not verification on two clients, is the primary guard** against client data
leaking into the framework: verifying on two clients detects the symptom after the fact;
per-site storage removes the cause. Two-client verification is retained only where a
*framework-level* capability is under test (FR-37-12, FR-37-23).

### 3.9a The framework files carry no client data

`parts/header.html` is a one-line shell, `<!-- wp:pattern {"slug":"sgs/framework-header-default"} /-->`,
and `parts/footer.html` is its footer equivalent. Both reference **framework** patterns that carry
no client data (`framework-header-default.php`, `framework-footer-default.php`). Verify with
`git grep -n -i "indus" -- theme/sgs-theme/parts theme/sgs-theme/patterns/framework-*.php`
(expect 0 hits).

Per-site header and footer content lives in each live site's CPT posts. Every live site (the
sandybrown canary and the Indus test site) renders its header and footer from CPT posts set
active. A plain theme deploy therefore never pushes one client's header onto
another site.

---

## 4. Functional requirements

> Every FR carries `Status:` (`BUILT` / `PARTIAL` / `NOT-BUILT`) with evidence, and a
> `Done when:` binary check. Re-verify statuses against code rather than trusting these lines.
> Three verification tiers are used and must not be conflated:
>
> | Tier | Means |
> |---|---|
> | `LIVE-VERIFIED` | Observed working on a deployed site with evidence recorded |
> | `DEPLOYED (unexercised)` | Shipped and checksum-verified, but no page or setting currently renders it, so it has never actually run |
> | `BUILT (code)` | In the repo and build-green, not deployed or not reachable |

### Editing home and binding

#### FR-37-1 — The CPT is the single editing home
Headers and footers are authored in the `sgs_header` / `sgs_footer` CPT admin screens. The
Site Editor is **not** an editing home for header/footer content, and no second editable
store exists. Site-Editor-as-home and a hybrid of both are not supported: WP has no native
CPT↔template-part sync, and two editable stores holding the same header drift the moment one is
edited and not the other (P2 §2.1).
**Status:** `BUILT + LIVE-VERIFIED`. CPTs and admin submenus exist
(`plugins/sgs-blocks/includes/class-sgs-block-cpts.php::register_post_types`, `::register_submenus`); the
binding is FR-37-2/3. The operator flow — a generic `sgs_header` post set active with the
**"Set as active" admin row action** (`admin-post.php?action=sgs_set_active_layout`, no Site Editor
step) — renders its content exactly once on the cold-cache frontend, without core's
`wp-block-template-part` wrapper; the footer behaves identically.
⚠ Set the active pointer through the web-context admin action: a raw `wp option update` from a
WP-CLI context can write an option store that differs from the live domain's (frontend
`get_option` returns 0 while `wp option get` returns the id) —
`STOP-SET-ACTIVE-LAYOUT-IN-THE-WEB-CONTEXT-NOT-RAW-WP-CLI-OPTION`.
**Done when:** an operator can create a header in *SGS → Advanced Headers*, set it active, and
see it on the frontend, with no Site Editor step anywhere in that flow. ✅ met.

#### FR-37-43 — The "Menu drawer" CPT (`sgs_drawer`)

The off-canvas drawer is a member of the CPT family this spec owns (§5). **Admin name: "Menu
drawer".** Registration mirrors `sgs_header`/`sgs_footer` — same class, same admin submenu shape,
same "Set as active" row action (FR-37-2), same preview-before-active (FR-37-41), revisions for
free. A drawer post's content is `sgs/nav-drawer` block markup; the block is the render vehicle.
**Scope model: site-wide Active default + per-burger override** via `sgs/nav-bar-menu`'s
`drawerRef` post picker (FR-37-49; behaviour side: Spec 36 FR-36-9a). The drawer renders once
per page from the active or referenced post, so a duplicate `<dialog id>` cannot occur by
construction.

**Status:** `PARTIAL`.

**Built:**
- **Registration** — `Sgs_Block_CPTs::DRAWER_CPT` (`sgs_drawer`), registered from the same shared
  args as the two siblings; admin labels "Menu drawers"/"Menu drawer"; `SGS → Menu drawers`
  submenu; REST gated through `Sgs_Cpt_Rest_Gate`. Post template and lock: FR-37-46.
- **Active model** — `OPTION_DRAWER` / `AREA_DRAWER` in `Sgs_Active_Layout`. The admin, validation,
  preview-before-active (FR-37-41) and the whole `Sgs_Header_Footer_Cli_Commands` tree are
  area-parameterised (`Sgs_Active_Layout_Admin::areas()`), so `wp sgs drawer
  set-active|clear-active|list|seed-starter` and every list-table affordance share the header and
  footer logic.
- **Render path** — a drawer owns no `core/template-part` slot, so there is no `pre_render_block`
  hook to mirror. `Sgs_Drawer_Render` renders it on **`wp_footer` priority 5**, lazily: each
  `sgs/nav-bar-menu` records "a burger asked for a drawer" into a request registry
  (`Sgs_Drawer_Render::note_burger`), and only then does the referenced (or Active) post render.
  The CSS registry's whole-page output buffer opens at `template_redirect` 0 and closes after all of
  `wp_footer`, so the drawer's scoped CSS still reaches the `<head>`. Each resolved drawer post
  prints at most once per page.
- **Landmark guard** — `nav-drawer/render.php` calls
  `Sgs_Active_Layout::mark_served( AREA_DRAWER )` on the ordinary block path, so a page that
  already painted a drawer never gets a second `<dialog>`.
- **Editor surface** — `wp_footer` never fires in the block editor, so a page being edited shows
  no drawer in canvas (a declared limitation). The FR-36-9a burger notice recognises the Active
  drawer, matched on the Active drawer's own `drawerRef` rather than on its mere existence: a burger
  opens by element id, so an Active drawer with a different ref genuinely opens nothing.
- **Starters** — the `sgs-drawers` pattern category with `sgs/drawer-scratch` ("Start from
  scratch"), `sgs/framework-drawer-default`, and the seven looks `sgs/drawer-floating-capped-card`,
  `-anchored-card-stack`, `-editorial-ghost-list`, `-centred-statement`, `-solid-brand-light`,
  `-two-column-editorial` and `-split-zone-serif` (`theme/sgs-theme/patterns/drawer-*.php`, keyword
  `featured`). A look is data — block markup carrying the drawer's own attributes and a starting
  block roster of real site data (menu, logo, business info, social icons) — and every value stays
  editable. The sidebar starter-look control (FR-37-47) lists only the `featured` looks (the rule is
  stated there) and offers "Keep my blocks - change the look only". `nav-drawer` declares no
  `variantPreset` attribute and registers no block variations.
- **Library** — every `sgs_drawer` pattern except the blank starter is seeded as its own published
  Menu drawer post (`Sgs_Starter_Library_Seeder::seed_library`), marked `_sgs_starter_slug`, never
  Active. The list table labels them "Framework look" and offers a "Framework looks (N)" view. A
  burger can pick any of them through the drawer picker (FR-37-49).
- **Header/footer starters embed no `sgs/nav-drawer`** and `nav-bar-menu.drawerRef` is a post
  picker (FR-37-49).

**Not built:**
1. Inline creation of a drawer post from the `drawerRef` picker. Today
   `plugins/sgs-blocks/src/blocks/nav-bar-menu/useDrawerNotice.js::addDrawer` inserts a sibling `sgs/nav-drawer` block instead.

**Done when:** a drawer authored in *SGS → Menu drawers* renders as the site default, a second
drawer can be picked per-burger, the starter surface offers the featured looks and a chosen
starter's CHILD TREE survives save, and zero `variantPreset` attrs exist in shipped markup
(`git grep -n variantPreset -- plugins/sgs-blocks/src theme/sgs-theme/patterns` returns nothing).
Inline creation of a drawer post from the picker is the one open item.

**Non-destructive property:** with no Active drawer pointer set, `get_active_content()` returns
`''` and `Sgs_Drawer_Render` emits nothing, so page output is unchanged. `wp sgs drawer
clear-active` reverts the binding.

#### FR-37-2 — "Set as active" action and stored pointer
A row action + editor action on each CPT writes a global option: `sgs_active_header_cpt_id` /
`sgs_active_footer_cpt_id` / `sgs_active_drawer_cpt_id`. Setting a new active post clears the
previous one (single active per type). The pointers are single global options, so one install has
one Active header; a second client's header needs its own site (the Indus test site).
**Status:** `BUILT` — `plugins/sgs-blocks/includes/class-sgs-active-layout.php::set_active` /
`::clear_active` (single-active enforced structurally by one option holding one id) +
`class-sgs-active-layout-admin.php` ("Set as active" row action, nonce + `edit_theme_options`
gated).
**Done when:** the option holds the chosen post ID; setting another post active replaces it;
the value survives a cache flush.

#### FR-37-3 — Direct-render branch
`Sgs_Header_Rules::filter_template_part()` has an early branch, **before** `self::evaluate()`,
that when the active-CPT option is set renders that post's `post_content` through
`do_blocks()` and returns it. It MUST:
(a) carry its **own re-entrancy guard** — the existing `$evaluated_this_request` static guards
`evaluate()`, not this branch, so a template rendering the header area twice would
double-render (`Sgs_Active_Layout::render_active()` carries it);
(b) **make every consumer that reads the header's block markup CPT-aware — this is the
load-bearing clause.** `SGS_Nav_Menu_Source::get_header_content()` resolves the active CPT post as
its FIRST source, ahead of the `wp_template_part` post and the `parts/header.html` file
(CPT → template part → file). A consumer that knows nothing about the CPT finds no `sgs/site-header`
block once FR-37-6 empties `parts/header.html`, and fails silently (the silent-failure class
this spec exists to prevent);
(c) **fail closed** — `Sgs_Active_Layout::get_active_id()` returns 0 for a missing, trashed,
draft or wrong-type target, so a broken pointer falls through to the rules engine and then to the
immutable default (FR-37-4).
Footer mirrors this exactly.

Header behaviours (sticky, transparent, shrink, hide-on-scroll, contrast-safe) are resolved per
device by `site-header/render.php` from the rendered block's own attributes and emitted as
`#uid`-scoped CSS (FR-37-14/15/44), so they follow whichever header renders. The header's
`transparent + contrastSafe='none'` case is a visible editor notice, not a silent rewrite
(FR-37-44).

The filter matches the template part by `area` OR `slug`: the SGS theme references the part as
`{"slug":"header","tagName":"header"}` with **no `area` attr** (`templates/front-page.html`,
`templates/index.html`), so an area-only gate would never fire.

**FR-37-6 depends on clause (b):** emptying the template part is safe only because the consumers
above are CPT-aware.
**Status:** `BUILT + LIVE-VERIFIED` (`git grep -n "filter_template_part\|get_header_content" --
plugins/sgs-blocks/includes` locates the branch and the CPT-first source). On the canary: an active
CPT header renders; the marker appears **exactly once**; core's `wp-block-template-part` wrapper is
absent; and trashing the active post falls through to the framework default
(no fatal, no blank header).
**Done when:** an active CPT header renders on a cold frontend request with all caches cleared;
the page contains the CPT's content exactly once; **and a header with sticky enabled in the CPT
is observably sticky on the frontend** — measured on the live page, not inferred from the emit.
✅ met.

#### FR-37-4 — Immutable fallback
With no active CPT and no matching rule, the theme's framework default pattern renders
(`sgs/framework-header-default` / `sgs/framework-footer-default`). This fallback can never be
deleted by an operator.
**Status:** `BUILT` — `plugins/sgs-blocks/includes/class-sgs-header-rules.php::DEFAULT_RULE_ID` /
`::DEFAULT_PATTERN_SLUG`.
**Done when:** clearing the active option restores the default header with no fatal error.

#### FR-37-5 — "Active" indicator on the list table
Each CPT list table shows an **Active** status column, following the pattern WP uses for the
active theme, so an operator with several saved headers can see which is live without opening
each.
**Status:** `BUILT + LIVE-VERIFIED` — `class-sgs-active-layout-admin.php` (`manage_{cpt}_posts_columns`
+ `display_post_states`). A row pointed at a non-published post shows "Active (not published —
default is showing)" rather than falsely claiming Active, so a trashed active post is legible in
the list table.
**Done when:** exactly one row per type shows Active, and it matches the stored option.

#### FR-37-6 — Template parts are thin shells
`parts/header.html` and `parts/footer.html` contain only what is needed for WP's template
system to resolve the area. Authored block content lives in the CPT, never in the part.
**Status:** `BUILT` — both part files are one-line shells referencing client-free framework
patterns (§3.9a), and every live site (the sandybrown canary and the Indus test site) renders its
header and footer from CPT posts set active.
**Done when:** neither part file contains authored content, and every live site renders from CPTs. ✅ met.

### Starter templates

#### FR-37-7 — One shared starter-template picker

Starter looks are offered on a new post through WordPress's **native** "Choose a pattern" modal
where the post is empty, and through FR-37-47's preset control where it is not. No bespoke
admin UI (matches FR-36-3's "reuse the platform, zero bespoke admin screens" rationale).

- **`sgs_mega_menu`** uses the native modal. It fires on a new post of a CPT when ≥2 patterns
  declare `Block Types: core/post-content` **+** `Post Types: <cpt-slug>`, and it renders live
  previews (preview-before-apply is native) with a blank/dismiss path. Five `sgs_mega_menu`
  starters exist: `mega-brands-1`, `mega-general-1col`, `mega-general-2col`,
  `mega-general-2col-aside`, `mega-media-cards-1`.
- **`sgs_header` / `sgs_footer` / `sgs_drawer`** are template-locked (FR-37-46), so a new post is
  never the empty post the native modal requires and the modal does not fire for them. Native pattern
  insertion also stamps provenance metadata that locks child-block editing behind an "Edit pattern"
  click, so content for these three CPTs must never arrive through WordPress's pattern-insertion
  path; their starter looks come from FR-37-47's preset control.

WP caches the pattern list against the theme version, so a new or re-scoped starter pattern needs
a theme version change before the modal shows it.

**Status:** `BUILT` — the five mega starters exist and are scoped `core/post-content` +
`Post Types: sgs_mega_menu`
(`git grep -l "Post Types: sgs_mega_menu" -- theme/sgs-theme/patterns`). Whether the native modal
fires on a new `sgs_mega_menu` post has not been re-observed in the editor for this spec (§8).
**Done when:** creating a `sgs_mega_menu` post shows the native pattern modal, and choosing a style
produces that style's block tree — verified by reading the saved `post_content` CHILDREN, not
editor state and not `metadata.patternName`. For header/footer/drawer the picker surface is
FR-37-47.

#### FR-37-8 — Starter library is git-versioned patterns
Starters are block patterns under `theme/sgs-theme/patterns/`, not synced `wp_block` posts, so
they are versioned, reviewable and shippable. Starter patterns declare
`templateLock: "contentOnly"` where structural edits would break the design.
**Status:** `BUILT` — the library is every pattern in `theme/sgs-theme/patterns/` whose header
carries `Block Types: core/post-content` and a `Post Types:` line for `sgs_header`, `sgs_footer`,
`sgs_drawer` or `sgs_mega_menu` (list them with
`git grep -l "Post Types: sgs_" -- theme/sgs-theme/patterns`). Each CPT's set includes a bare
"Start from scratch" shell (`header-scratch.php`, `footer-scratch.php`, `drawer-scratch.php`) and
the framework default (`framework-header-default.php`, `framework-footer-default.php`,
`framework-drawer-default.php`). `header-top-icons.php` is a real header starter (a thin cart +
My Account strip). Header/footer/drawer looks are applied through FR-37-47; mega looks through the
native modal (FR-37-7). No starter depends on database state.
**Done when:** each starter is a file in the repo; applying one produces its tree; no starter
depends on database state. ✅ met.

#### FR-37-36 — Custom React starter picker for `sgs_mega_menu` (EXTENSION — non-blocking)
An optional bespoke React picker modal that replaces the native "Choose a pattern" modal
(FR-37-7) for `sgs_mega_menu` with full UX control: a branded card grid, a persistent explicit
"Start from scratch" card (vs the native blank/dismiss), CPT-appropriate labels (the native modal
leans "page"-flavoured), richer preview styling, and any curation the native modal can't express.
This is an ENHANCEMENT, not a blocker: FR-37-7's native mechanism satisfies the picker
done-condition on its own, so FR-37-36 gates nothing and carries its own completion tracking.
Build it only if the native modal's UX is judged insufficient in practice.
**Status:** `NOT-BUILT`.
**Done when:** creating a `sgs_mega_menu` post shows the custom picker (card grid + preview +
explicit scratch card), choosing a card writes that starter's block tree to `post_content`, and
the native modal is suppressed for that CPT.

### Container blocks

#### FR-37-9 — `sgs/site-header` + `sgs/site-header-row` conform to §3
The header container and its rows implement §3.1, §3.3, §3.4, §3.6.
**Status:** `BUILT`. A per-clause audit against §3 records: **PASS** §3.1 three named rows; §3.4
empty-row-zero-output (`site-header-row/render.php` returns `''` for an empty `$content`); §3.5 no
`allowedBlocks` lock on the row; §3.6 `min-width:0` on children and no `flex-shrink:0` on the logo
(`site-header-row/style.css`); no inline `style=""` (Spec 32); composite-mirror. The three gaps the
audit found are FR-37-33 (§3.3 row layout control), FR-37-34 (§3.5 promoted palette) and FR-37-35
(§3.6 container-query reflow), all BUILT. The §3.6 live overflow gate is FR-37-12.
**Done when:** an audit against §3 is recorded per clause with a pass/fail and a path, and every fail
is either fixed or carried as a named FR. ✅ met.

`sgs/site-header` declares none of `alignContent` / `alignItems` / `columns` / `flexDirection` /
`flexWrap` / `justifyContent`: on the container they could never render, because the emit gate
requires a `layout` attribute the container does not declare. `sgs/site-header-row` declares
`layout` (enum `flex|grid`, default `flex`), so the same six attributes are live there. The
dead-control lint `check-dead-controls.js` detects the inverse defect (a control whose attribute
renders nothing), so it cannot catch an attribute that has no control at all.

#### FR-37-10 — `sgs/site-footer` + `sgs/site-footer-row` conform to §3
As FR-37-9, against §3.2, §3.3, §3.4, §3.6.
**Status:** `BUILT`. The footer rows pass the same clauses as FR-37-9 and share the same three
follow-up FRs (one mechanism covers both rows). The footer count wiring (FR-37-11) is live.
**Done when:** as FR-37-9. ✅ met.

#### FR-37-33 — Row layout control + per-row independent columns
A "Row layout: Cluster / Columns" `SelectControl` on BOTH row blocks drives the existing `layout`
attribute (`flex`↔`grid`); no separate layout-mode attribute exists. When Columns, the per-device
count control (`ResponsiveControl` 1-6) shows; when Cluster, Distribution shows. Both row blocks
declare a per-device `columns` count, so a header row can be columns too. Rendering is universal —
both rows delegate to `SGS_Container_Wrapper`, which renders the grid and the per-tier count.
Every row (all three header AND all three footer) sets its own count and settings INDEPENDENTLY:
each is its own block instance, so nothing bleeds between rows. This is the Astra footer-builder
model (a bottom strip can be a 3-column row: copyright | social | attribution, stacking on mobile).
The per-tier count emits only because `SGS_Container_Wrapper`'s `$has_responsive_attr` gate
includes tier counts (FR-37-11); without it a row set to Columns renders its desktop count but does
not stack.
**Status:** `BUILT + LIVE-VERIFIED` — the three footer rows set to different counts at desktop all
stack to 1 column on mobile with no horizontal scroll.
**Done when:** each row's layout and count are independently settable from the inspector, and a
Columns row stacks on mobile. ✅ met.

#### FR-37-34 — The row inserter promotes the common elements (§3.5)
A shared `RowQuickInsertAppender` component (`src/components/RowQuickInsertAppender.js`, both row
blocks) renders an "Add a header element" placeholder in any EMPTY row, promoting logo / navigation
/ search / cart / account link / CTA / contact, plus `prioritizedInserterBlocks`. Freeform is
preserved (no `allowedBlocks`); the placeholder itself says *"or use the block inserter (+) for
anything else"*. The footer row shares the mechanism with footer-appropriate elements. Every
promoted slug must be a registered block so `createBlock` cannot insert a dead placeholder.
**Status:** `BUILT + LIVE-VERIFIED` — an empty row shows the full palette; a populated row shows
none.
**Done when:** an empty row offers the promoted elements and a populated row does not. ✅ met.

#### FR-37-35 — Container-query row reflow
`container-type: inline-size` is set on both rows, and a row reflows on its OWN width, never the
viewport's (STOP-CONTAINER-TIER-IS-NOT-VIEWPORT). The reflow BEHAVIOUR is not an authored stack: a
rule such as `@container (max-width:767px){flex-basis:100%}` that collapses every child to a
full-width line is an authored stack, not a response to running out of room, and must not be
introduced under this FR's name. The header never stacks (§3.6); the footer's columns collapse
intrinsically (FR-37-11).
**Status:** `BUILT + LIVE-VERIFIED` — `container-type: inline-size` computes on both rendered rows;
no existing viewport `@media` rule is altered.
**Done when:** both rows compute `container-type: inline-size`. ✅ met.

#### FR-37-11 — Footer columns: an operator-set count that stacks automatically

The `columns` row exposes a **column count** as a number (§3.3): a per-device number, no CSS, no
ratio string. The count is a **CEILING**, not an exact count — the row renders fewer columns, down
to 1, as space runs out, at any width, driven by container width rather than a viewport breakpoint
(`supports.sgs.intrinsicColumns`, §3.6). The inspector label is **"Maximum columns"**. Desktop is
the only tier an operator must set; a per-device override is available but never required. The
count drives the shared container grid engine — no new engine (R-31-9 reuse).

**Why intrinsic, not `@media`.** An exact-count mechanism driven by `@media` is structurally
incapable of responding to content: measured, it collapsed all three footer rows from 3 tracks to
1 between viewport 768px and 767px while their content needed just 496px of the 767px available.
Footer stacking is organic.

**Wiring (block-private; the wrapper is untouched):**
1. `site-footer-row/block.json` declares the `columns` attribute. WordPress **silently discards**
   any attribute a block does not declare, so every value `site-footer/edit.js` inserts
   must be declared or it is thrown away at save with no error.
2. An explicit `gridTemplateColumns` value at any tier wins over the count
   (`SGS_Container_Wrapper`'s `$object_grid`), so neither the block default nor the parent template
   (`site-footer/edit.js`) seeds one; with none set the wrapper renders the count as
   `repeat(columns,1fr)`. `gridTemplateColumns` remains the stored attribute behind the shape
   picker (FR-37-42), never the operator default (§3.3).
3. `site-footer-row/edit.js`: the count control writes the count attribute directly, not a
   `repeat(N,1fr)` template string (which would re-trigger the template path).

**Status:** `BUILT + LIVE-VERIFIED` — 3 columns at 1023–900px, a content-driven drop to 2 at 860px,
1 at 767px, zero horizontal overflow across 109 swept widths
(`reports/visual-diff/site-footer-row-2026-08-01.md`).
**Done when:** an operator sets a column count with no CSS and no ratio string; the row renders
**up to** that many columns and reduces automatically as space runs out, down to 1, with no
further configuration; and the values set by `site-footer/edit.js` are not discarded — verified by
reading the saved post content, not the editor state. ✅ met.

#### FR-37-12 — Never-overflow contract
§3.6 holds on every shipped header and footer.
**Status:** `PARTIAL`. Both the header row (`reports/visual-diff/site-header-row-2026-08-01.md`) and
the footer row (`reports/visual-diff/site-footer-row-2026-08-01.md`) have a real 1400→320px,
≤10px-step `row-fit-sweep.mjs` sweep with **0 of 109 widths overflowing**, each including negative
controls and a WebKit re-run. **Open:** sweeping the Indus test site's own header and footer content
(different content and `theme-snapshot.json` tokens can shift the transition widths; the footer
report flags that real footer copy will move its 860px/1160px cliffs).
**Done when:** `scrollWidth <= innerWidth` **swept 1400px → 320px in ≤10px steps**
(`plugins/sgs-blocks/scripts/row-fit-sweep.mjs`) on the sandybrown canary's own header/footer
content — met — **and** on the Indus test site's header/footer — not yet done.

### Behaviours

#### FR-37-13 — The behaviour set
Four independent header behaviours: **sticky**, **transparent**, **shrink**,
**hide-on-scroll**. Any combination may be active.
**Status:** `BUILT + LIVE-VERIFIED`. `sgs/site-header` renders a semantic
`<header class="sgs-site-header">`; the JS (`plugins/sgs-blocks/src/header-behaviours/view.js::getHeaderEl`) and the
shared header-behaviour CSS (`assets/css/header-behaviours.css`) target `header.sgs-site-header`.
Scroll-down hides the header, scroll-up returns it; there is exactly one banner landmark; the
`--sgs-header-height` publisher runs; a one-header-per-request guard and editor `<header>` parity
are in place. Each behaviour is a per-device tri-state object (FR-37-14) emitted as `#uid`-scoped
CSS by `site-header/render.php` (FR-37-15); hide-on-scroll is an Advanced `ToolsPanel` control
in `site-header/edit.js` (`headerHideOnScroll`). No behaviour uses a body class.

**Guard rail:** the header must render a real `<header>` element; without it there are zero header
landmarks and all three scroll behaviours (transparent, shrink, hide-on-scroll) die silently — a
regression that recurs if someone changes the wrapper tag. Rendering the SGS header AS a semantic
`<header>` also adds the banner landmark (a WCAG win).
**Done when:** the SGS header is a semantic `<header>`; all four behaviours are settable from the
inspector AND observable on the frontend (hide/return on scroll — met). The drawer `<dialog>` is a
body-level element, not a header descendant, so a transformed header cannot trap it; the interaction
of a drawer opened while scrolled has not been observed live.

#### FR-37-14 — Behaviour attributes are tri-state
Each behaviour is a **tri-state** (`inherit` / `on` / `off`) per device tier, not a flat
boolean — a boolean cannot express "inherit from desktop" versus "explicitly off here"
(P1 DP1). Applies to `headerSticky`, `headerTransparent`, `headerShrink`, `headerHideOnScroll`
and `contrastSafe` (FR-37-44).
**No migration, no fallback.** The framework is pre-production, so no deprecations and no
read-time legacy fallback are carried (which would violate R-31-14 anyway).
**Status:** `BUILT + LIVE-VERIFIED`. The behaviour attributes are `{desktop,tablet,mobile}` objects
whose default `{}` resolves to off. `ResponsiveTriStateControl` in `site-header/edit.js` gives a
simple toggle plus a "Customise per device" reveal. Server-side, per-tier resolution is emitted as
`#uid`-scoped `@media` rules via `sgs_emit_tier_rules()`, through a single-writer merge pass
(`sgs_merge_tri_state_declarations()`) so a behaviour that is off at every tier emits nothing and a
narrow tier can genuinely cancel a wide one (independent emitters relying on `!important` and
source order collide on a shared selector). `site-header-row` / `site-footer-row` use the same
canonical `sgs_resolve_on_tiers()` resolver (`'on'`/`'off'` tri-state). The canonical
`resolveTier()` (`src/utils/responsive.js`) / `sgs_resolve_tier()` (`includes/helpers-responsive.php`)
is the one inheritance mechanism in both runtimes — no second cascade exists. The theme pattern
seeds carry `{"desktop":"on"}`.
**Done when:** the behaviour attributes are tri-state objects and no instance carries a flat shape.
✅ met.

#### FR-37-15 — Behaviours emit scoped CSS, not body classes
Behaviour styling is emitted as scoped `#uid` rules (including `@media` tiers), per Spec 32. No
`sgs-header-behaviour-*` body class exists: the only body class `Sgs_Header_Behaviours` emits is
`sgs-has-header` (the cloning recogniser's page-level marker that a page carries an SGS header; the
class also enqueues the shared header-behaviour CSS/JS). Scroll-state classes in `view.js`
(`is-header-scrolled`, `is-header-shrunk`, `is-header-scrolling-down`) are tier-agnostic JS-state
signals only.
**Status:** `BUILT` for all five behaviours. `headerSticky` / `headerTransparent` / `headerShrink` /
`headerHideOnScroll` emit through `sgs_emit_tier_rules()`. `contrastSafe` is a per-device object
attribute emitted by `site-header/render.php` through `sgs_emit_tier_rules_map()`, the N-value
form: a four-value enum cannot go through the binary emitter, which tests `'on' === $state` and
would collapse `scrim`, `shadow` and `force-solid` into one off branch (the binary helper delegates
to the map form as the 1-entry case, so the tier cascade has one implementation). `force-solid`
emits no CSS: `render.php` resolves it as a SUPPRESSOR of the transparent behaviour, because
per-tier an `!important` background has no clean undo. A per-device behaviour cannot be a body class:
a class on `<body>` is site-wide and cannot express "scrim over the desktop hero, nothing on a
phone". `header-behaviours.css` carries no `body.sgs-header-behaviour-*` rules.
**Done when:** no header behaviour renders an inline `style=""` declaration, and the emitted CSS is
scoped to the block uid. ✅ met.

### Data model and controls

#### FR-37-16 — Responsive value shape
Every responsive property is `{ desktop: <val>, tablet: <val|null>, mobile: <val|null> }`,
cascading from desktop when a tier is null. Device tiers are 768 / 1024 per
`~/.claude/rules/visual-standards.md`.

> **Uid hashing does NOT canonicalise attribute key order** (`site-header-row/render.php`
> `// STOP-NO-KSORT`): canonicalisation is a write-time oracle only, kept out of the hash path,
> because reordering keys would re-key every scoped-CSS selector and break the collector's
> cross-page dedup.

**Status:** `BUILT` — `site-header/block.json` and `site-footer/block.json` declare `padding`,
`margin`, `maxWidth`, `contentWidth`, `borderRadius`, `borderWidth`, `minHeight`,
`contentBandPadding` and `backgroundOverlayOpacity` as objects (`{desktop, tablet, mobile}`),
matching `sgs/container`'s shape. The only device-suffixed attrs on either container are
`backgroundImageTablet`/`Mobile` and `bgVideoTablet`/`Mobile` — media-asset pickers, correctly flat
under the framework's own RECORD/ASSET taxonomy, not the layout/spacing shape this FR is about.
**Done when:** every responsive property on all four blocks uses the object shape; no flat
`*Tablet`/`*Mobile` attr remains on either container for a layout/spacing property; uid
generation is unchanged and `STOP-NO-KSORT` still holds. ✅ met.

#### FR-37-17 — Site Info + global defaults
§3.7 holds.
**Status:** `BUILT` — `sgs/business-info` drives footer data.
**Done when:** a value set once in Site Info renders in header and footer with no re-entry,
verified on every live site.

#### FR-37-18 — Inspector conformance
Every control in both containers satisfies Spec 35A Part L (the per-block definition of done).
**Status:** `PARTIAL`. `sgs/site-header`, `sgs/site-footer`, `sgs/site-header-row` and
`sgs/site-footer-row` are all in `plugins/sgs-blocks/scripts/consistency/roster.json` (Spec 35's
audit denominator). Being in the roster is not the same as passing: the conformance run reports
per-property GAP findings against each of the four blocks
(`node plugins/sgs-blocks/scripts/check-element-manifest-conformance.js --json`, findings with
`status: "gap"`).
**Done when:** both containers pass `check-element-manifest-conformance.js` with zero GAPs. Roster
membership is met; zero GAPs is not.

#### FR-37-19 — Accessibility feedback is informational only
Contrast/a11y feedback from operator choices is a **passive notice** in the editor and admin —
never a save/publish gate, never auto-enforced, never agent-wired (P1 DP2a). The
framework's own default output still meets WCAG 2.1 AA.
**Status:** `BUILT` — `site-header/edit.js` (border and `contrastSafe` advisories) and
`site-footer/edit.js` carry passive `Notice`s with no `lockPostSaving`/gating. Editor-surface
only, so it needs an editor session to see.
**Done when:** an operator can save a low-contrast header, sees a notice, and is never blocked.

### Rules engine

#### FR-37-20 — Display conditions (advanced path)
The ordered, first-match-wins rules engine serves header-per-page-type (conditions: post type /
template / URL / role / device). It sits **after** the active-CPT branch, so the common case never
touches it. The Header Rules and Footer Rules pages live inside the CPT list screens
(`class-sgs-header-rules-admin.php` and `class-sgs-footer-rules-admin.php` print the rules table
and "Add Rule" form via `admin_notices` on `edit.php?post_type=sgs_header` / `sgs_footer`).
**Status:** `BUILT` — `class-sgs-header-rules.php`, `class-sgs-footer-rules.php`.
**Done when:** a rule targeting a page type renders a different header there, with the active
CPT still serving everywhere else.
**⚠ Known limitation:** a rule whose target is a *CPT-derived pattern* cannot resolve on the
frontend (§2.2). Until FR-37-3's direct-render is extended to rule targets, the advanced path is
limited to file-registered patterns.

### Legacy surface

#### FR-37-21 — The legacy header/nav surface stays out of the framework
The header nav is `sgs/nav-bar-menu` (horizontal bar + burger + dropdown/mega), the list inside the
drawer is `sgs/nav-drawer-menu`, and the drawer panel is `sgs/nav-drawer`. No other nav block, no
block named `mega-menu`, no `mega-menu-*` template part or pattern, and no `theme.json`
`templateParts` entry for them ships in the framework.
`patterns/framework-header-default.php` embeds `sgs/nav-bar-menu`, so every fresh SGS install gets
the Spec 36 nav.
**Status:** `BUILT` — verify with `ls plugins/sgs-blocks/src/blocks | grep "^nav"` (expect exactly
`nav-bar-menu`, `nav-drawer`, `nav-drawer-menu`),
`git ls-files plugins/sgs-blocks/src/blocks theme | grep -E "/mega-menu/|/mega-menu-"` and
`git grep -n "mega-menu" -- theme/sgs-theme/theme.json` (expect no output from either).
**Done when:** the nav roster above holds (✅); a fresh install renders the Spec 36 nav (✅ on the
canary fresh-default).

### Pipeline

#### FR-37-22 — Emittable by construction
Every capability above must be settable by the cloning converter and mappable from what the
converter extracts from a draft header/footer — a design constraint on this spec, not a
later bolt-on (P1 DP6).
**Status:** `NOT-BUILT` — the header/footer walker ("Spec 33 Part 2") is not started, **and is
currently ownerless — see the §6 ownership note before scheduling any of it.**
**Build order:** this FR is one of only TWO items in Specs 36+37 that genuinely wait on Part 2. Part 2
itself is built **after** Specs 36 and 37 are complete — it consumes them. Do not treat this FR as
a blocker on anything else in this spec.
**Done when:** a drafted header clones into an active CPT header with its structure and
behaviours carried, verified on the real homepage (R-31-11).

### Further requirements

#### FR-37-24 — Per-device content cascade (build owned by Spec 35)
The per-device content cascade is a framework-wide concern, not a header/footer one. The mechanism
it builds on — `sgsHideOnMobile`/`Tablet`/`Desktop` — is a universal extension applied to every
block in the framework (`includes/device-visibility.php`,
`src/blocks/extensions/responsive-visibility.js`), and Spec 35 §D3 owns the generic principle
("Mobile inherits from desktop unless overridden"). Spec 35 owns the build; §3.8 of this spec states
the header/footer behaviour that depends on it. Changing the visibility extension from a header/footer
spec would diverge from R-31-9 and the composite-mirror rule.

**HIDE, not REMOVE.** The cascade hides via CSS; it never forks the block tree per tier.
`device-visibility.php` generates `display:none` media queries and states *"Content remains in the
DOM for SEO (display:none only hides visually)"*. REMOVE would break that crawlability guarantee
(memory `degrade-to-more-content-never-less`) and would need per-device cache fragments the
framework's page-cache model has no key for.

**`inherit` resolves at render, never copies down at save.** Copying the parent's value into a
child tier at save time makes an inherited value indistinguishable from an explicit override, so
a later desktop edit could not cascade. Store the literal `inherit`; resolve on read.

**Status:** `PARTIAL` — the cascade mechanism is BUILT (FR-37-14); the header/footer
content-curation feature of §3.8 (hide a block at a tier and every tier below) is NOT-BUILT.

#### FR-37-25 — Reset to default
An operator can clear the active header/footer and return to the framework default, from the
admin, without touching code or the database.
**Status:** `BUILT (code)` — `Sgs_Active_Layout::clear_active()` + the "Clear active" row action
(`class-sgs-active-layout-admin.php`) delete the pointer; the branch then falls straight through to
the rules engine and the immutable default. The post that had been active is untouched and
re-activatable. This doubles as the rollback for the whole binding.
**Done when:** the reset action clears the option; the immutable default (FR-37-4) renders; the
post that had been active still exists and can be re-activated.

#### FR-37-26 — Operator-simplicity test
A defined pass/fail usability test, not a subjective judgement: **a non-coder sets sticky +
phone number + drawer content in under 3 minutes without opening Advanced.** Floor: Bean plus
one blind tester, screen-recorded (P1 DP5, P2 §8).
**Status:** `PARTIAL` — the automated proxy arm (Claude driving the canary editor) is recorded
twice; the blind-tester arm is outstanding and is the authoritative half.
- **Three-item test** (`reports/fr-37-26-simplicity-test/2026-07-26-operator-simplicity-test.md`):
  **FAIL**. Sticky passes and phone passes (one-click "Contact details" → Business Phone,
  click-to-call wired to Site Info). Drawer content failed: it was not settable in the header
  editor. The drawer post picker (FR-37-49) and the burger notice's "Add the menu panel" action
  (Spec 36 FR-36-9a) cover that path, but the drawer-content item has not been re-run.
  Selecting the header block needs List View (a canvas click reports "No block selected"), and the
  Settings tab shows more default-visible controls than the FR-37-27 roster's (a nudge, not a
  defect).
- **Starter-look flow** (`reports/fr-37-26-simplicity-test/2026-09-17-starter-look-flow-re-run.md`):
  **PASS** for the FR-37-47 control's own simplicity.
- **Blind-tester arm** (a real non-coder, screen-recorded): outstanding.
`P-HEADER-SIMPLICITY-FINDINGS` (`.claude/parking.md`) tracks the open findings.
**Done when:** the test has been run and recorded, with the result — pass or fail — written
down. A fail is a finding, not a reason to re-run until it passes. ✅ proxy arm met; blind-tester
arm pending.

#### FR-37-27 — Simple vs Advanced control placement
The Simple surface ships **≤3 controls by default**. Operator pin/unpin exists but is
**default-off**, reached through an Advanced "Customise this panel" action — never a
first-class drag handle, because a tech-illiterate client can unpin a control they rely on and
get a "missing setting" with no trail (P2 §5).

**The roster is adopted verbatim from P2 §5; do not re-derive it:**

| Block | Tab | **Simple (default)** | Advanced (`ToolsPanel`) |
|---|---|---|---|
| `sgs/site-header` | Settings | Sticky on scroll · Show phone / click-to-call | Transparent-until-scrolled · Shrink · Hide-on-scroll · Contrast mode |
| `sgs/site-header` | Styles | Layout preset (Centred / Split / Minimal) | Header width · per-breakpoint spacing |
| `sgs/site-footer` | Settings | Column count · Show credit line | Per-device column override |
| `sgs/site-footer` | Styles | — | Background · spacing overrides |

**What the lint counts (P2 §5, verbatim):** *"one labelled inspector row = one control. A
`ResponsiveTriStateControl` counts as **one** control."* A preset (FR-37-28) counts as **one**, not
as the N attributes it writes. The **Advanced `ToolsPanel` is uncapped** and does not count — the
cap governs the default surface only.

**No conflict with FR-37-18.** The two lints measure different things and neither blocks:
`check-element-manifest-conformance.js` asks whether every capability has a control *somewhere*
(Advanced satisfies it) and is warn-only; `check-simple-surface-cap.js` governs only which controls
are default-visible. `sgs/site-header` uses `ToolsPanel` disclosure, which is the mechanism that
reconciles them.
**Status:** `GATE BUILT`. `check-simple-surface-cap.js` scans four blocks — `sgs/site-header`,
`sgs/site-footer`, `sgs/site-header-row`, `sgs/site-footer-row`. Run
`node plugins/sgs-blocks/scripts/check-simple-surface-cap.js` for the current default-visible count
per block against the default of 3; do not quote a count from prose. The script is advisory: it
exits 0 unless run with `--strict`, although its banner text reads "HARD GATE". The Done-when below
is not met while the script reports a block over the default.

**Known limitation:** the script counts a composite component mount as **ONE row** without opening
the component to see what it renders, so it is wrong in both directions for a block that mounts
composites (`RowScrollBehaviourControls` counts as 1 but renders three `isShownByDefault` toggles;
`ResponsiveBoxControls` counts as 1 but exposes zero default-visible toggles). **Every figure the
script produces for such a block is an approximation, not a census** — state that wherever its
output is cited.
**Done when:** both containers show exactly the Simple controls in the table above by default; the
lint REPORTS a block as over the default — advisory, never a build blocker.

> **≤3 is a design DEFAULT the lint surfaces, not a cap a build dies on** (P2 §5).
> `check-simple-surface-cap.js` is warn-only with an opt-in `--strict`, matching
> `check-element-manifest-conformance.js`. A block reporting OVER is a NUDGE toward the P2 §5
> roster, **not a defect and not a blocker**. Do not "fix" it by hiding controls a client relies on:
> a ceiling a client cannot influence is worse than a surface that is slightly busy.

#### FR-37-28 — Preset controls are permitted
The inspector may expose composite preset controls (e.g. *Layout: Centred / Split / Minimal*)
that write several attributes at once. The converter still targets the attribute layer only —
presets are an operator convenience, never a storage shape (P2 §2.6).
**Status:** `BUILT + LIVE-VERIFIED`. A "Layout preset" `ToggleGroupControl` (Centred / Split /
Minimal) sits on the `sgs/site-header` **Styles** tab. It is **derived, not stored**:
`plugins/sgs-blocks/src/blocks/site-header/edit.js::getActiveLayoutPreset` reads the current attrs for the active state, and
`::applyLayoutPreset` writes only the block's EXISTING `contentWidth` + `spacing.padding` attrs plus
the primary (middle) row's existing `justifyContent` (Centred → `center`, Split/Minimal →
`space-between`) via a `useSelect` lookup of the `rowSlot:'middle'` row and `updateBlockAttributes`.
`getActiveLayoutPreset` also requires the row alignment to match, so the active indicator stays
honest. **No new block.json attribute**, so the converter round-trips the underlying attrs
unchanged.
**Done when:** at least one preset control exists on the header container and sets its
attributes such that the converter round-trips them unchanged. ✅ met.

#### FR-37-30 — WP-CLI surface (developer and pipeline only)
A reduced `wp sgs` command set covers the header/footer/drawer lifecycle non-interactively:
`wp sgs header|footer|drawer set-active|clear-active|list|seed-starter`. **Explicitly not a
client-facing surface** — clients use the admin screens exclusively (framework CLAUDE.md: "WP-CLI
is a developer tool only; never something clients touch"). It exists so that Bean and the cloning
pipeline have a programmatic path, which FR-37-22 depends on.
**Status:** `BUILT + LIVE-VERIFIED` — `Sgs_Header_Footer_Cli_Commands`
(`includes/class-sgs-header-footer-cli-commands.php`), registered in `sgs-blocks.php` for the three
areas, delegates ALL active-state to `Sgs_Active_Layout` (no direct option writes) and is guarded by
`defined('WP_CLI')`. Subcommand names are hyphenated through `@subcommand` annotations
(`set-active`, `clear-active`, `seed-starter`), because WP-CLI registers method names verbatim.
`wp sgs header list` returns the table with a correct **Active** column.
**Done when:** each command runs non-interactively, is covered by `--help`, and the cloning
pipeline can set an active header without a browser. ✅ met.

#### FR-37-31 — No orphan behaviour template parts; search starters preserved
No `header-sticky` / `header-transparent` / `header-shrink` template-part registration, pattern or
`theme.json` entry exists: behaviours are attribute-driven (FR-37-13/14/15), so such stubs would be
dead weight that misleads a reader about which mechanism is live. **Separately**, the three
search-header starters (`header-search-bar-above`, `header-search-bar-below`, `header-search-icon`)
are in the FR-37-8 starter library, along with their design principle that **header search is
opt-in, not default**.
**Status:** `BUILT` — verify with
`git ls-files theme/sgs-theme | grep -E "header-(sticky|transparent|shrink)"` and
`git grep -n -E "header-(sticky|transparent|shrink)" -- theme/sgs-theme/parts theme/sgs-theme/patterns theme/sgs-theme/theme.json`
(expect no output from either); the three search starters exist under `theme/sgs-theme/patterns/`
scoped `Post Types: sgs_header`.
**Done when:** zero references to the three behaviour stubs exist (✅); the three search starters
are offered by the FR-37-47 control (✅) — under its featured-else-all rule they are shown because no
`sgs_header` pattern carries the keyword `featured`
(`git grep -l "Keywords:.*featured" -- theme/sgs-theme/patterns | grep header-` returns nothing).

### Gate

#### FR-37-23 — Acceptance
This spec closes only when: FR-37-1/2/3/5 are live on the canary; §3 audits (FR-37-9/10) are
recorded per clause; the never-overflow gate (FR-37-12) passes on every live site **across the
full sweep per §3.6** (not three fixed widths); no inline `style=""` on either container; and
**Bean's eye** signs off (R-31-13 — measurement and eye are co-authoritative, neither closes alone).
The acceptance PROOF is the **12-reference clone as the FINAL gate of the merged 36/37 track**
(`.claude/reports/2026-07-28-spec36-37-remaining-work-inventory.md`) — every reference built
completely as SGS-native output (header + drawer + footer together, content/imagery/colours/
typography), zero hardcoding; anything a reference needs that SGS cannot express is a defect in the
earlier work, never a reason to trim the reference. **studionamma is the first clone**, one site
100% before the rest. **Each accepted clone yields its B3 presets** — the B3 roster is 7 cloned
pairs plus invented fills only where the references leave a gap (Utility commerce, Overlay
hero-contrast, Directory footer). On completion, delete the `header-centred` / `header-minimal` /
`header-full` structural starters; keep `scratch` + the three search-bar variants (capability, not
look). Spec 33 Part 2 (the clone WALKER) consumes the proven system and inherits the 12 references
as regression fixtures.
**Status:** `NOT-BUILT`.
**Done when:** all of the above, each with evidence recorded, not asserted.

---

### Per-row scroll behaviours

#### FR-37-37 — Per-row transparent + hide-on-scroll
Each `sgs/site-header-row` and `sgs/site-footer-row` carries its OWN `rowTransparent` +
`rowHideOnScroll`, as `{desktop,tablet,mobile}` tri-state objects with **inherit-upward** semantics
(mobile ← tablet ← desktop; an explicit `'off'` means "off here"), resolved by
`sgs_resolve_on_tiers( $raw, 'on', 'off' )` (`includes/helpers-responsive.php`). They are independent
of the header-LEVEL behaviours (FR-37-13). `render.php` emits a `sgs-row-behaviour` class + `data-sgs-row-*`
attrs listing only the tiers where a behaviour is ON; `plugins/sgs-blocks/src/header-behaviours/view.js::initRowBehaviours`
scans those rows and toggles per-row state classes.
**Binding rule — tier-gating is via a JS-added state class, never `[data-attr]` presence.** A
presence-only selector applies at every tier. The resting state is keyed on
`is-row-transparent-active`, added only on an active tier.
**Status:** `BUILT + LIVE-VERIFIED`.
**Done when:** at desktop the top row hides on scroll while the logo row goes transparent→solid —
each row doing ONLY its own behaviour, both resetting on scroll-up; a desktop-only transparent row
is NOT transparent at mobile; the header-level path is unaffected. ✅ met.

#### FR-37-38 — Per-row shrink, proportional by construction
`rowShrink` (device-tier object, same resolver) reduces the row's own vertical padding on scroll.
**The shrunk value MUST be emitted per instance as `calc(<that row's own padding> / 2)`**, via
`sgs_row_shrink_css()` (`includes/helpers-row-behaviour.php`) calling the shared
`sgs_emit_responsive_css()` engine. Ratio 0.5.
**Binding rule — never an absolute value in a shared stylesheet.** A shared stylesheet cannot know
the resting value it is meant to reduce, and at specificity (0,3,0) it out-specifies each row's own
`.sgs-container-<uid>` rule (0,1,0) and forces every row to the same size — an unpadded row measures
0px at rest and GROWS when shrunk. Enforced by `scripts/check-shared-css-state-rules.js`
(`npm run check:shared-css-state`).
Two SCALAR specs (`padding-top`/`padding-bottom`), never `box => true` — a box spec expands to all
four sides and would jolt the row horizontally. The transform appends the unit itself, because a
`transform` short-circuits the engine's unit handling.
**Status:** `BUILT + LIVE-VERIFIED` — 48px→24px with left/right held at 30px; an unpadded row 0→0.
**Done when:** computed padding when shrunk ≤ resting at 375/768/1440, on a row WITH padding and one
WITHOUT. ✅ met.
**NOT built:** a 44px touch-target floor. Halving a row's padding leaves all 5 interactive children
byte-identical in size, because padding sits OUTSIDE children and they carry their own minimums.

#### FR-37-39 — Shrink hides a chosen element, with a declarative guardrail
A row may nominate ONE child to hide while it is shrunk, referenced by the child's own `anchor`
attribute (`rowShrinkHideTarget`) — a **stable id that survives copy/paste**, never the editor's
`clientId`.
**The guardrail is declarative, not a hardcoded list (R-31-1).** `supports.sgs.headerEssential: true`
is declared on `sgs/responsive-logo`, `sgs/nav-bar-menu` and `sgs/cart`. The editor picker reads it
via `wp.blocks.getBlockType()`; `sgs_resolve_row_shrink_hide_target()`
(`includes/helpers-row-behaviour.php`) re-checks it server-side against `WP_Block_Type_Registry`.
Protecting a new critical block later is one block.json flag.
The picker ALSO excludes children lacking `supports.anchor` — WP silently discards an undeclared
attr, so such a child would look configured and hide nothing.
An orphaned target (child deleted) is a silent no-op plus an operator warning; a reset action is
always visible.
**Status:** `BUILT + LIVE-VERIFIED`.
**Done when:** the chosen child computes `display:none` while shrunk and the sibling row is
unaffected; and pointing the target at the logo makes the server emit NO `data-sgs-row-shrink-hide`
and no hide rule, while still emitting `data-sgs-row-shrink`. ✅ met.

**Header-level and row-level behaviours are distinct, not redundant.** `transparent`, `shrink` and
`hide-on-scroll` each exist at BOTH the header level (FR-37-13/14/15) and the row level (FR-37-37/38/39),
and each pair produces genuinely different output: header-level `transparent` lifts the whole header
out of document flow and triggers the WCAG contrast safeguard (FR-37-44), while row-level
`rowTransparent` only changes ONE row's background; header-level `shrink` shrinks the header's own
padding globally, while row-level `rowShrink` shrinks that row's padding and can hide one chosen
non-essential child; header-level `hide-on-scroll` translates the WHOLE header off-screen, while
row-level `rowHideOnScroll` collapses ONE row to height 0 while the header stays pinned (FR-37-40).
Both layers are kept. The row-level controls carry distinct labels — "Row background
transparent", "Collapse this row on scroll", "Reduce this row's padding on scroll"
(`src/components/RowScrollBehaviourControls.js`) — so an operator can tell which layer they are
configuring. Competitors (Kadence, Astra, Blocksy) implement a scroll behaviour at ONE structural
level only; the split is a real product difference, not a bug to converge toward parity.

#### FR-37-40 — Sticky model: HEADER-level, rows collapse
**Model:** sticky stays HEADER-level (the header's containing block is `<body>`, so there
is no short-parent trap), and a row that should disappear **COLLAPSES (height → 0)** rather than
translating — the header genuinely shrinks with no gap, and its existing ResizeObserver
re-publishes the height. When the header is NOT pinned, the `translateY(-100%)` behaviour runs
unchanged and must stay byte-identical (the regression test). Design gate:
`.claude/plans/archive/2026-07-26-per-row-sticky-mini-design.md`.
**Status:** `BUILT + LIVE-VERIFIED`. `prefers-reduced-motion` is NOT live-verified (the harness cannot
emulate the media query; correct by construction, but that is reasoning, not measurement).
**Collapse-when-pinned:** while the header is measured as pinned, a header row hiding on scroll
collapses to height 0; when it is NOT pinned the translate path runs unchanged (row at full height,
no inline height written). "No gap" holds unrounded at desktop/tablet/mobile:
`(header drop) − (row height removed)` = 0.00. The ResizeObserver re-publishes the shrunken header
height on its own, so the scroll-padding gate composes for free.
**Binding rule — a browser cannot animate from `height: auto`.** The script MEASURES the row's real
height, writes it as the animation's start value, drives it to 0, and CLEARS the inline height
afterwards so the row returns to `auto` (a left-behind fixed height would freeze the row when a font
swaps or the viewport changes). The clear-out delay reads the COMPUTED transition duration — never a
hardcoded number — so `prefers-reduced-motion`, which strips the transition, clears on the next
tick instead of awaiting a `transitionend` that never fires. This is preferred over an instant snap
(visible downgrade) and over a grid wrapper (markup change to a shipped block → editor risk).
**Collapse must win by SPECIFICITY, not source order** — the collapse selector is (0,4,0) against
the translate rule's (0,3,0); `transform: none` holds throughout the pinned path.
**Silent-failure guard (advisory, never a gate):** an ancestor with `overflow` other than `visible`,
or `transform`/`perspective`/`filter`, silently stops sticky pinning to the viewport.
`findStickyBreakingAncestor()` (`src/header-behaviours/view.js`) detects it and warns, naming the
element. This bounds what `isHeaderPinned()` can claim: a header broken this way still COMPUTES
`sticky`, so the measurement is accurate but misleading. It warns rather than zeroing the published
height, because an `overflow` ancestor may still be the page's own scroll container. A collapsed
row's contents remain focusable, which is parity with the translate path.
**Per-row `position: sticky` is not supported**, on evidence: a sticky element pins only while its
containing block is in view, so a row sticky inside a ~250px `<header>` unpins the moment scroll
passes the header height (short-parent trap) — the nav would vanish. Separately, `transform` never
reclaims flow space, so a slid-away row still occupies its height and leaves a visible gap. Kadence
ships a per-row "which row survives while pinned" feature, but with JS `position: fixed` plus a
measured placeholder spacer — a different and heavier mechanism than CSS `position: sticky`, not
evidence that per-row CSS `sticky` is viable.
**NOT built:** the multi-sticky warning, the sticky↔hide-on-scroll mutual exclusion and the
multi-row offset chain. Under a single header-level sticky element none of those conditions can
occur; they need a new model before they return.
**Footer rows get NO sticky.** A strip pinned to the viewport bottom is a **Spec 18 Floating UI**
element: it is driven by state a footer row cannot reach, and must coordinate with the cookie
banner / chat widget / back-to-top already competing for that edge.

**Scroll-padding publisher.** `:root { scroll-padding-top: var(--sgs-header-height, 0px) }`
(`assets/css/header-behaviours.css`) must reserve the header's height only when the header is
actually pinned; otherwise a NON-sticky header would reserve its full height for in-page anchors,
find-in-page, `element.scrollIntoView()`, keyboard focus scrolling and scroll-snap.
`var(--x, 0px)` fires its fallback only when the property is UNDEFINED, never when it is
defined-but-zero, so the observer publishes `0px` **explicitly**. W3C technique **C43** confirms
`scroll-padding` is a sufficient technique for WCAG 2.4.11/2.4.12 **including keyboard Tab focus**,
so the CSS line is correct and the gate is JS-only (`src/header-behaviours/view.js`).
**Binding rule — the pinned gate MEASURES `getComputedStyle(header).position`, never a body class.**
A header carrying both sticky and transparent computes `absolute` (transparent lifts it out of
flow) and scrolls away, so a class-based gate would publish a non-zero height for a header that is
not pinned. An rAF-coalesced `resize` listener is also required: crossing a breakpoint can change
`position` without changing the border-box height, so the ResizeObserver alone is insufficient.
Evidence: `reports/visual-diff/scroll-padding-pinned-gate-2026-07-26.md`.
**Known issue (theme side):** `theme/sgs-theme/assets/css/utilities.css` declares its own
`:root { --sgs-header-height: 80px }`, so the plugin rule's `0px` fallback can never fire and a
JS-disabled page reserves 80px unconditionally; `body.admin-bar html` in the same file can never
match (`html` is not a descendant of `body`).
**Done when:** the collapse-when-pinned criteria hold, each live-verified **across the §3.6 sweep
(1400 → 320px, ≤10px steps)**, not at 375/768/1440 — the row's children shrink continuously, so a
text-wrap-induced height change can occur BETWEEN fixed tiers. The scroll-padding criteria are met.

#### FR-37-41 — Preview a layout on the real site before making it active
**The need.** The layout CPTs register `'public' => false`
(`plugins/sgs-blocks/includes/class-sgs-block-cpts.php::register_post_types`), so a layout post has **no
frontend URL of its own**. Without preview, the only way to see a header on a real page is **Set as
active** — publishing it to every visitor before ever looking at it. The editor "Show me the shrunk
size" toggle covers **shrink only**; sticky, hide-on-scroll and transparent are scroll-triggered and
cannot be shown in a static canvas.

**Mechanism — one override point.** `Sgs_Active_Layout::get_preview_id()` is consulted first in
`get_active_id()`, because every consumer converges there: the render path
(`Sgs_Header_Rules::filter_template_part()` → `render_active()` → `get_active_content()`) **and**
`SGS_Nav_Menu_Source::get_header_content()` → `get_active_content()`. One override serves both
surfaces (R-31-9): the previewed post renders, and its own `#uid`-scoped behaviour CSS (FR-37-15)
comes with it, so sticky/hide-on-scroll/transparent preview too.

**Fails closed to 0** unless all hold: per-area query var present + positive;
`current_user_can('edit_theme_options')` (same bar as Set-as-active); nonce valid against an action
scoped to BOTH area and post id; post exists and is the right type. **One deliberate deviation from
`get_active_id()`: draft/pending are ACCEPTED** — previewing before publishing is the point;
`trash`/`auto-draft` are rejected.

**Bounded:** `get_stored_id()` is untouched (the list table still reports what is genuinely live, so
preview never lies); **no write path exists** — per-request query state only, so it cannot persist
or half-activate; `render_active()`'s fail-closed behaviour is inherited; the response sets
`DONOTCACHEPAGE` + `nocache_headers()`.

**Status:** `BUILT + LIVE-VERIFIED` — the "Preview on site" row action renders an unpublished layout
on the real homepage. Four negative controls: no nonce → live header; bad nonce → live header; a
nonce minted for one post replayed against another → live header (proves per-post scoping); an
anonymous request with the VALID url → draft not leaked, live header served. Active pointers are
unchanged and the previewed post is still a draft afterwards — nothing persisted.
**Done when:** an operator can view an unpublished header on a real page without activating it, the
behaviours resolve from the previewed post, and an unauthenticated request never sees it. ✅ met.

**Not supported:** a shareable preview link for someone **without a login**. A client who should see
a work-in-progress either has an account, or is shown it on a test site. Supporting it would need an
expiring-token model instead of a nonce (a nonce is bound to a logged-in user), which means a second
access path, a token lifetime, and a URL that grants site content to whoever holds it. The
capability + nonce model above is the whole story.

#### FR-37-42 — Visual column-shape picker for rows
A row set to **Columns** exposes, alongside its column **count**, a set of **column SHAPES presented
as small visual diagrams** the operator clicks — equal, wide-centre, wide-first, wide-last, the
two-column 2:1 / 1:2 pair, and the three-column `fit-centre` shape. Selecting one writes the
**existing** `gridTemplateColumns` object attribute (§3.3). One mechanism (R-31-9) serves
`sgs/site-header-row`, `sgs/site-footer-row` and `sgs/container`.

**Why:** measured evidence, not preference. A teardown of an Awwwards-winning ecommerce footer found
`grid-template-columns: 340px 680px 340px` — a wide-centre shape a **count can never produce**. A
count-only control silently rules out a whole class of best-in-class footer design.

**Binding:** count stays the default and the shape picker is optional (a client wanting "4 columns"
never meets it) · per-device like the count · **still stacks to 1 on mobile automatically** — an
asymmetric desktop shape must never reach a phone · the active shape is **DERIVED** from the stored
value, never separately stored, so a hand-edited value shows no active shape rather than lying
(FR-37-28's rule) · shapes in `fr` (plus `auto`) not px, so they stay fluid · **no new block.json
attribute** — `site-footer-row/block.json` is unchanged by the picker.

**⚠ Do NOT add shapes from taste.** The shape list comes from reference teardowns; any shape added
later needs a measured reference behind it, and any further `auto` member needs the same
justification.
**Status:** `PARTIAL` — `src/components/ColumnShapePicker.js` is mounted in `site-footer-row/edit.js`,
`site-header-row/edit.js` and `container/edit.js` (via `container/components/LayoutPanel.js`); its
`SHAPES` catalogue includes `fit-centre` (`weights: [1,'auto',1]`), and `weightsToTrack()` emits the
bare keyword `auto` so the picker can produce `1fr auto 1fr` (the split-nav-either-side-of-a-centred-logo
layout). Live-site verification and Bean's eye check are owed.

**Built to the gold standard, not to taste** (`.claude/reports/2026-08-26-column-shape-picker-gold-standard.md`):
- Core's own column picker is **insert-time only** (`columns/edit.js` swaps the Placeholder once the
  block has children; its variations are `scope:['block']` with no `isActive`, so
  `BlockVariationTransforms` renders null). An after-insert shape control is a genuine gap in core.
- `ToggleGroupControl` + `ToggleGroupControlOptionIcon`, not a row of `Button isPressed` — a true
  Ariakit radiogroup with arrow-key roving, via the existing house primitives boundary.
- ONE string as both visible and accessible name, ratio included ("Wide centre (25 / 50 / 25)") —
  deliberately NOT core's label/description split, which Gutenberg #66062 records as a live WCAG
  2.5.3 failure.
- Shape names are LOGICAL (`first`/`last`), never directional: "left heavy" and its diagram both
  invert under RTL while `1fr 2fr` does not.

⛔ **No shape SLUG is stored** in place of writing `gridTemplateColumns`. A stored slug contradicts
this FR's binding constraints and can DISAGREE with a hand-edited track string — exactly the lying
indicator FR-37-28 exists to prevent; deriving via `activeShapeKey()` supplies the stable value the
control needs. Per-column width attrs do not exist on these blocks, and `gridTemplateColumns` is
ALREADY a per-tier object the wrapper renders.

⚠ **Multi-row grids need no design.** `grid-template-columns` applies to the WHOLE grid — every row
uses the same tracks — and `sgs/container` has no per-item span support, so differing proportions
per row means a SECOND container, which is already true with the count control. The shape picker
adds no new multi-row concept.
**Done when:** an operator picks a wide-centre shape with no CSS and no typing; the row renders that
shape on desktop and stacks to 1 on mobile with no further configuration; the stored value is
`gridTemplateColumns` and nothing else; and the active-shape indicator is derived, verified by
hand-editing the value and confirming NO shape shows as active.

#### FR-37-44 — `contrastSafe` is per-device and never silently overrides an operator's choice
An operator's explicit **"None"** over a transparent header is never rewritten. It is a **notice,
never enforcement** — the locked rule `a11y-validation-feedback-informational-not-gate` (see
FR-37-19). The WCAG 1.4.3 reasoning is sound — an operator-chosen "None" over a transparent header
can fail contrast — so `site-header/edit.js` shows a visible advisory naming the WCAG 1.4.3 risk
and the affected device tiers, evaluated PER TIER
(`resolveTier( contrastSafe, tier, 'none' ).value === 'none'`), with a one-click action to accept the
suggested `scrim`; the operator can equally keep "None". It is modelled on WordPress core's own
ContrastChecker, which warns and never enforces.

`contrastSafe` is on the same per-device model as its four siblings (`headerSticky`,
`headerTransparent`, `headerShrink`, `headerHideOnScroll`; FR-37-14) and emits through
`sgs_emit_tier_rules_map()` (FR-37-15). It is a FOUR-value enum, not a boolean, so its control is
`ResponsiveOverride` around the existing 4-option `SelectControl`, not `ResponsiveTriStateControl`:
the control primitive must match the STORAGE shape — pointing a tri-state control at an enum
attribute would store values the control cannot display and silently flatten the client's choice.

All three contrast modes paint real, non-trivial CSS: `scrim` (a `::before` darkening overlay),
`shadow` (a text-shadow legibility technique — cosmetic only and never WCAG-conformant, because a
text-shadow's contrast against arbitrary imagery cannot be computed), and `force-solid` (paints
nothing itself; it means "do not go transparent at this tier").

**Status:** `BUILT + LIVE-VERIFIED` (`reports/visual-diff/site-header-2026-08-19.md`: the scrim
paints at desktop and cancels at mobile; `shadow` paints its text-shadow; `force-solid` suppresses
transparency without an `!important` fight).
**Done when:** `contrastSafe` is per-device, consistent with its four siblings; an operator's
explicit "None" over a transparent header is never silently rewritten — the operator sees a notice
naming the WCAG 1.4.3 risk and the affected device tiers, and can accept the suggested `scrim` or
keep "None"; and the choice made is the choice that renders. ✅ met.

#### FR-37-45 — Transparent-to-solid scrolled colour is operator-reachable
`sgs/site-header` supports a transparent-at-top → solid-past-50px transition
(`site-header/render.php`, keyed on the `.is-header-scrolled` class). The operator controls the pair:
`backgroundColourScrolled`, `backgroundColourScrolledGradient` and `textColourScrolled` are declared
in `site-header/block.json` (wired into `supports.sgs.elements.wrapper.states.scrolled.attrMap`, so
they are real inspector controls), and `render.php` reads them directly with no hardcoded fallback;
`headerTransparentDirection` (`transparent-first` | `solid-first`) inverts which state is transparent
and which is solid, so a dark scrolled state is reachable.

**Constraint any change must preserve.** The scrolled-state rule in `render.php` carries an
`!important` on purpose: a lower-specificity rule loses the flip entirely, and the style
engine cannot emit `!important`, so the rule is built by hand. Read that block before changing the
scrolled-state CSS.
**Status:** `BUILT + LIVE-VERIFIED` (`reports/visual-diff/site-header-2026-08-19.md`: the client-set
scrolled background and text colour land, the direction inverts, and the scrolled rule keeps its
`!important`).
**Done when:** the scrolled-background colour is an operator-set control (not a hardcoded token); the
transparent/solid pair can be inverted; and the flip stays correct under the new control. ✅ met.

### Locked CPT posts and starter looks

Header, footer and drawer posts are template-locked so each contains exactly its own wrapper block
(FR-37-46), which means WordPress's native "Choose a pattern" modal cannot serve them; starter looks
come from a preset control (FR-37-47), and a fresh install seeds one post per CPT (FR-37-48). The
drawer post picker completes the drawer path (FR-37-49).

#### FR-37-46 — Template-lock `sgs_header`/`sgs_footer`/`sgs_drawer` at the post level

`register_post_type()` for all three CPTs sets a real `template` (`[['sgs/site-header']]`,
`[['sgs/site-footer']]`, `[['sgs/nav-drawer']]` respectively) and `template_lock => 'all'`
(`plugins/sgs-blocks/includes/class-sgs-block-cpts.php::register_post_types`).

**Why the locked block, not the CPT, carries the settings.** `sgs/site-header` stays the one real,
locked, top-level block. The alternative — move the wrapper's own settings onto CPT post-meta and
inject a synthesised `sgs/site-header` instance at render time, holding only the 3 rows as real
content — buys nothing, because the block's settings surface is already complete and self-contained
(background/border/shadow/layout/sticky/transparent/shrink/hide-on-scroll/contrast-safe), and it
adds a render-time reconstruction step with its own failure surface plus a new home for every
existing attribute. No CPT meta duplicates a block-owned setting
(`plugins/sgs-blocks/includes/class-sgs-cpt-default-meta.php::post_types` covers `sgs_modal` only).

**Relation to §3.3a.** The `template: isEmpty ? TEMPLATE : undefined` row-seeding inside
`sgs/site-header`/`sgs/site-footer` is separate: this lock operates one level up, at the CPT POST
level (what may exist in `post_content` at all), not at the row-seeding level inside the container
(what the 3 rows start with). The two locks do not interact and must not be conflated when
verifying either.

**Enforcement scope.** `template`/`template_lock` are consumed ONLY by the block editor's
client-side JS. Nothing in `wp_insert_post()`, `WP_REST_Posts_Controller` or `Sgs_Cpt_Rest_Gate` (a
pure capability check with no content-shape validation) enforces a template against a raw write. The
lock claims what the mechanism does: it holds **in the block-editor UI**. These 3 CPTs sit behind
`edit_theme_options` (a privileged, non-client capability), so a raw-REST bypass is a real but
low-probability gap; if that capability bar ever widens to a lower-trust role, add a
`rest_pre_insert_{post_type}` filter.

**Mechanism.** WordPress applies a post-type `template` once, from the editor's `setupEditor`
action, gated on `post.status === 'auto-draft'` (`setupEditor`, WordPress core `wp-includes/js/dist/editor.js`), so
it does not re-apply on saved posts — unlike the block-level `useInnerBlockTemplateSync` path of
§3.3a, which re-applies on every mount under `templateLock: 'all'`. Evidence and cited bundle
symbols: `.claude/reports/2026-09-17-fr37-46-verification-spike.md`.

**Status:** `BUILT`.
**Done when:** a new post of any of the three types opens with the locked block already present and
populated by its own template default; no other block can be inserted as a sibling or appended below
it **in the block-editor UI** (the REST case is the named gap above, not a Done-when criterion).

#### FR-37-47 — Starter looks are a preset control, extending FR-37-28
Because FR-37-46 makes every new post non-empty by construction, WordPress's native "Choose a
pattern" modal (FR-37-7) cannot fire for `sgs_header`/`sgs_footer`/`sgs_drawer`. The starter looks
(FR-37-8) stay reachable through a preset control on the locked block, in the shape of the FR-37-28
"Layout preset": derived from existing attributes, writes only existing attributes, no new stored
shape, switchable at will. Content must never arrive through WordPress's pattern-insertion path,
because that path stamps provenance metadata (`metadata.patternName`/`metadata.name`) that locks
child-block editing behind an "Edit pattern" click.

**Mechanism.** `src/components/StarterLookPresetControl.js` renders a `PanelBody` titled "Starter
look" holding a grid of buttons on the **Styles** tab of `sgs/site-header`, `sgs/site-footer` and
`sgs/nav-drawer`. The looks are read dynamically from `select( 'core' ).getBlockPatterns()`,
filtered by the pattern's `postTypes` — no hand-authored per-look attribute dictionary (R-31-1), so
a starter file change cannot drift from the control. (`getSettings().__experimentalBlockPatterns`
holds only the small "outside `init`" pattern bucket and misses every `init`-registered starter, so
it cannot be the source.)

**Which looks are listed — the featured-else-all rule.** Of the patterns that qualify for the CPT,
if any carries the pattern keyword `featured` the control lists only those; otherwise it lists every
qualifying pattern. `featured` is a plain manual keyword on a pattern file; no script scores or
selects it. The seven drawer looks carry it, so the drawer control lists the seven; no header or
footer pattern carries it, so those controls list every qualifying starter (including the three
FR-37-31 search starters).

**Owned settings.** A look's OWNED SETTINGS are the attributes that any look for that CPT writes
explicitly, derived from the qualifying patterns at run time. Applying a look sets only owned
settings — to the look's value where it states one, otherwise to the block's default — and never
touches any other setting (for example `drawerRef`, `ariaLabel` or `backgroundImage`). Applying is
done through `updateBlockAttributes`, matching a row between the pattern and the live post by its
`rowSlot` attribute, never by array position.

**Keep my blocks.** The panel carries a toggle "Keep my blocks - change the look only". ON leaves the
block's inner content untouched and applies the owned settings to matching child blocks by block name
(for example the drawer's menu). OFF also replaces the inner content through `replaceInnerBlocks`
(where content differs, such as a search-bar starter's extra `sgs/product-search`). One Undo reverts
an application in full, settings and content together.

**Real data only.** A look contains only blocks that render real site data (menu, logo, business
info, social icons) — no sample copy and no destination-less buttons. `metadata` is stripped before
every write and the control never calls `insertBlock` with a pattern. Everything is an ordinary
`core/block-editor` store dispatch inside the editor session: no new REST route, no new nonce, no new
sanitisation surface. The control shows no derived "active look" indicator.

**`sgs_mega_menu` keeps FR-37-7's native picker;** this FR does not touch it.

**Status:** `BUILT`.
**Done when:** creating a post of any of the three types shows the control listing the looks the
featured-else-all rule selects (the seven `featured` looks for the drawer; every qualifying pattern
for header and footer); selecting one sets only the owned settings and leaves `drawerRef`,
`ariaLabel` and `backgroundImage` untouched, verified by reading the saved `post_content` (not editor
state); with "Keep my blocks - change the look only" ON the inner blocks are unchanged and OFF they
are replaced; switching to a DIFFERENT look afterward reapplies correctly; a single Undo reverts
settings and content in full; no
`metadata.patternName`/`metadata.name` provenance stamp appears on any resulting block; and the
FR-37-26 operator-simplicity proxy arm has been run against this flow with the result recorded
(PASS: `reports/fr-37-26-simplicity-test/2026-09-17-starter-look-flow-re-run.md`).

#### FR-37-48 — Auto-seed the starter posts so the admin list is never empty

`Sgs_Header_Footer_Starter_Seeder::seed_all()`
(`includes/class-sgs-header-footer-starter-seeder.php`) runs once per site on the plugin's
`register_activation_hook` (`sgs-blocks.php`) — the single canonical trigger. For each area it
publishes one post from the framework starter pattern (`sgs/framework-header-default`,
`sgs/framework-footer-default`, `sgs/framework-drawer-default`) and marks it Active through
`Sgs_Active_Layout`. It is guarded per area on `wp_count_posts($type)->publish === 0`, so
reactivating the plugin, or activation firing twice, never double-seeds; the CPT's own publish count
is the guard, with no extra option. The seeder is its own class: it shares its starter patterns with
`wp sgs <area> seed-starter` (FR-37-30) but does not call that command, and it publishes and
activates where the CLI seeds a draft. This is independent of FR-37-46/47: FR-37-46 fixes what a
*new, individual* post starts with; this FR fixes what the *list table* shows before any operator
has created anything.

**Library.** After the defaults, `Sgs_Starter_Library_Seeder::seed_library( $area )`
(`includes/class-sgs-starter-library-seeder.php`) publishes one post for every registered pattern that
names the area's CPT in `Post Types:`, except the blank starter (`sgs/<area>-scratch`) and the default,
and never marks them Active. Only areas listed in `Sgs_Starter_Library_Seeder::LIBRARY_AREAS` have a
library (the drawer). Each post carries private meta `_sgs_starter_slug` = its pattern slug; a pattern
is skipped when any post of that CPT in any status, trash included, carries the marker, so
reactivation never duplicates a look and never overwrites a client's edited copy; emptying the bin
deletes the post and its marker, so that look is created again by the next seeding. Three entry
points call `seed_library`: plugin activation, `Sgs_Starter_Library_Migration` (runs on `init` in any
request and seeds the drawer default plus the library whenever the signature of the plugin version and
the registered library patterns differs from the stored one, so a theme uploaded after the plugin, or a
look added later, is picked up on the next request), and `wp sgs drawer seed-starter --all --user=1`
(idempotent). The single-slug form
`wp sgs drawer seed-starter <slug>` creates a plain draft with no marker and is not part of the
library. Seeded looks contain only blocks that render real site data (menu, logo, business info,
social icons). `Sgs_Starter_Library_Admin` adds a "Framework look" post-state and a "Framework looks
(N)" view to the CPT list table. A pattern file added by a deploy registers only after the theme
pattern cache is cleared, which `build-deploy.py` does.

**No new CPT meta marks "the default."** `Sgs_Active_Layout`'s Active pointer + admin column already
answer "which post is live" for all three CPTs. `_sgs_is_default` exists for `sgs_modal` only (§5).

**Status:** `BUILT`.
**Done when:** a fresh site install shows exactly one post in each of the three CPT list tables,
already marked Active, with no manual step required.

#### FR-37-49 — Drawer post picker; header/footer starters embed no drawer

`nav-bar-menu.drawerRef` is a `number` — a `sgs_drawer` post id, with `0` meaning "the Active
drawer" — chosen through a picker in `nav-bar-menu/DropdownSettingsPanel.js`, with the same UI shape
as `sgs/modal`'s `modalRef`: a `SelectControl` populated via
`useEntityRecords( 'postType', 'sgs_drawer', { per_page: -1, status: ['publish'], context: 'edit' } )`,
storing a **post ID** (not a string), with a dangling-reference `Notice` when the stored id resolves
to no published post. (`nav-drawer.drawerRef` stays the element-id string the `<dialog>` carries.)

**Where the modal pattern does not transfer.** A modal's referenced content renders INLINE at the
trigger block's own position; a drawer's `<dialog>` must exist exactly once, somewhere on the page,
for the burger to open it by DOM id. `Sgs_Drawer_Render` (FR-37-43) is the site-wide render hook that
prints the referenced (or Active) `sgs_drawer` post's content once per page, reusing the
`Sgs_Active_Layout::mark_served( AREA_DRAWER )` mechanism already called in `nav-drawer/render.php` —
there is no second "has this drawer printed yet" tracker.

**Header and footer starter patterns embed no `sgs/nav-drawer`.** A header/footer post therefore
contains nothing but its own locked wrapper: FR-37-46 blocks any other block, and the drawer is a
separate post. Only the nine drawer starter patterns contain a `sgs/nav-drawer` — `drawer-scratch.php`,
`framework-drawer-default.php` and the seven `drawer-*.php` looks (they are the drawer starters). The landmark guard of FR-37-43 stays in place for any header/footer
content that still carries a sibling-embedded drawer.

**Status:** `BUILT`. The one FR-37-43 clause still NOT-BUILT is inline creation of a drawer post
from the picker.
**Done when:** `drawerRef` on `sgs/nav-bar-menu` is a post picker (no free-text id field);
`git grep -l "wp:sgs/nav-drawer " -- theme/sgs-theme/patterns` lists only the nine `drawer-*.php` /
`framework-drawer-default.php` starters; a
fresh header/footer created through FR-37-47 has no drawer content unless the operator explicitly
picks one through the picker; and the landmark guard still protects any pre-existing
sibling-embedded drawer from double-rendering.

---

## 5. The CPT family and admin surface

### 5.1 The family

One shared registration class (`plugins/sgs-blocks/includes/class-sgs-block-cpts.php::register_post_types`) registers the CPT family;
`sgs_mega_menu` has its own class (`class-sgs-mega-menu-cpt.php`). All are `public => false` and
edited in the block editor. Header, footer, drawer, modal and mega panels route every capability to
`edit_theme_options` (`Sgs_Cpt_Rest_Gate` additionally gates the header, footer and drawer REST
routes); `sgs_form` and `sgs_choice_flow` use `edit_sgs_forms`.

| CPT | Admin name | What a post is | Active pointer | Template-locked | Starters |
|---|---|---|---|---|---|
| `sgs_header` | Advanced Headers | A site header layout | `sgs_active_header_cpt_id` | Yes (FR-37-46) | Every `Post Types: sgs_header` pattern in `theme/sgs-theme/patterns/`, via FR-37-47 |
| `sgs_footer` | Advanced Footers | A site footer layout | `sgs_active_footer_cpt_id` | Yes (FR-37-46) | Every `Post Types: sgs_footer` pattern, via FR-37-47 |
| `sgs_drawer` | Menu drawers | The off-canvas menu panel | `sgs_active_drawer_cpt_id` | Yes (FR-37-46) | Every `Post Types: sgs_drawer` pattern, via FR-37-47 |
| `sgs_mega_menu` | Mega Menu Panels | One mega panel, attached to a nav menu item (Spec 36) | None — referenced per menu item | No | Every `Post Types: sgs_mega_menu` pattern, via the native modal (FR-37-7) |
| `sgs_modal` | Modals | Reusable modal content, referenced by a `sgs/modal` block's `modalRef` attribute | None — see `_sgs_is_default` below | No | None |
| `sgs_form`, `sgs_choice_flow` | Forms, Choice Flows | Form / branching-quiz definitions | None | No | None — owned by Specs 42 and 43; they use their own capability (`edit_sgs_forms`) |

The Active pointers are single global options: one install has one Active header, footer and drawer,
so a second client's header needs its own site (the Indus test site is separate from the sandybrown
canary). The pointers are read through `Sgs_Active_Layout`, never with a raw option write.

### 5.2 Shared admin machinery

- **"Used by" list-table column** (`class-sgs-cpt-usage-columns.php`) on `sgs_header`, `sgs_footer`,
  `sgs_drawer`, `sgs_modal`, `sgs_form` and `sgs_choice_flow`. It is computed at request time from the
  real source (rule count for header/footer, the Active pointer for a drawer, `modalRef` references
  for a modal), never stored, so it cannot go stale.
- **Header Rules and Footer Rules pages** live inside the `sgs_header` / `sgs_footer` list screens
  (FR-37-20).
- **"Set as active", "Clear active", "Preview on site"** row actions and the **Active** column
  (`class-sgs-active-layout-admin.php`; FR-37-2/5/25/41).
- **`_sgs_is_default` post meta** (`class-sgs-cpt-default-meta.php`) exists for `sgs_modal` only. It
  flags one modal post as the designated default and enforces a single default on
  `updated_post_meta` / `added_post_meta`. It has **no render consumer**: nothing reads it to resolve a
  trigger that has no `modalRef`. A modal has no single site-wide render slot (each `sgs/modal`
  instance picks its own post), so it is not folded into `Sgs_Active_Layout`.
- **`wp sgs header|footer|drawer set-active|clear-active|list|seed-starter`** (FR-37-30), and the
  activation seed of one post per CPT (FR-37-48).

---

## 6. Out of scope (the NOT list)

- **Nav internals** — Spec 36. This spec owns the drawer POST (FR-37-43/46/49) and the binding, and
  never describes what is inside a menu, dropdown, mega panel or drawer.
- **The header/footer clone walker** — "Spec 33 Part 2". ⚠ **See the ownership + direction note
  immediately below; that label currently has no named owner.**

> **"Spec 33 Part 2" is the specialised header/footer CLONING pipeline** — a separate, later
> consumer of this build's architecture, not this spec's own work and not a blocker on it. Only
> two items in Specs 36+37 genuinely wait on it: the branded-header sliver of FR-36-18, and
> FR-37-22. Everything else (including FR-36-15 and FR-36-25) is buildable now. Assigning Part 2
> a single named owner is a prerequisite before any Part 2 work starts.
- **The WP Customiser.** No Customiser surface edits header or footer content; FR-37-1 is the
  single editing home.
- **Block version bumps / `deprecated.js`** — pre-production policy.
- **Per-page-type CPT rule targeting** — see FR-37-20's limitation.

---

## 7. Constraints binding every FR

1. **No inline `style=""`** on any block in this spec (Spec 32).
2. **Composite-mirror (R-31-9)** — both containers are `containerKind: section`, so they keep
   `SGS_Container_Wrapper`; no per-block CSS that diverges from it. Block-private rendering is not
   used for header/footer: a private copy would not escape an attribute-shape inconsistency, because
   that inconsistency lives in the block's own settings, not the shared engine, so a fork would copy
   the mess into more files (design gate
   `plans/archive/2026-07-25-header-footer-per-row-identity-design-gate.md` §0). If a per-row effect
   needs a capability the engine lacks, ADD it to the engine.
3. **No hardcoded client data** — Site Info or global styles, never literals (R-31-1).
4. **WCAG 2.1 AA** on default output; 44px targets; visible focus.
5. **DB-first** — no hardcoded lookup dicts; the block/attr registry is authoritative.
6. **Verify on the live page**, not the emit (R-31-11).

---

## 8. Open Questions

| Question | Owner | Due |
|---|---|---|
| How are the 7 drawer looks delivered as starters, given FR-37-46's lock stops the native picker firing for the drawer post? (FR-37-43) | Bean | Before the drawer looks are built |
| Does the native "Choose a pattern" modal fire on a new `sgs_mega_menu` post? Not re-observed in the editor for this spec (FR-37-7). | Claude (editor check) | Next mega-panel session |
| Rules can only target file-registered patterns, not CPT posts (FR-37-20). Extend FR-37-3's direct render to rule targets, or leave the advanced path limited? | Bean | Before the advanced path is marketed |
| Should a `sgs/modal` trigger with no `modalRef` fall back to the `_sgs_is_default` modal? The flag has no render consumer today (§5.2). | Bean | When modal triggers are next specified |
| Who owns "Spec 33 Part 2" (the header/footer clone walker)? | Bean | Before any Part 2 work starts |
| Should the logo come from Site Info instead of `get_theme_mod( 'custom_logo' )` (`responsive-logo/render.php`)? Spec 36 FR-36-22 owns the decision. | Spec 36 | With FR-36-22 |
| Blind-tester arm of the operator-simplicity test (FR-37-26). | Bean | Before FR-37-26 is closed |
| `sgs/site-header`, `sgs/site-footer` and `sgs/site-header-row` are `v0.1.0`; pre-production policy says no version bumps. Confirm they stay there. | Claude | Each release |

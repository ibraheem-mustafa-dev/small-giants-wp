---
doc_type: spec
spec_id: 37
spec_version: 1.0.0
title: SGS Header/Footer Builder — CPT editing home, container blocks, behaviours, binding
project: small-giants-wp
status: active
authors: [Claude Code, Bean]
session_date: 2026-07-22
last_verified: 2026-07-22
status_history:
  - 2026-07-21 — v1.0.0. Written to replace Spec 17 as the canonical header/footer home.
    §9 coverage gate + /qc-council passed; Spec 17 deleted in the same commit (matrix at
    reports/2026-07-21-spec17-to-spec37-coverage.md). Signed off → status active.
  - 2026-07-22 — 6-FR minimum core BUILT + committed (0da5ef6a). FR-37-2/3/4/5/25 live in
    code (not yet canary-verified); FR-37-11 count path wired; §3.3a templateLock fixed.
    Two bugs the pre-commit qc-council found were fixed before landing (see §2.4). FR-37-6
    found BLOCKED on a client-data leak in parts/header.html (see §3.9a).
references:
  - .claude/specs/36-SGS-NAVIGATION-SYSTEM.md          # nav — the extension of this spec
  - .claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md
  - .claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md
  - .claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md
  - .claude/plans/2026-07-18-P2-builder-ux-design-gate.md
  - .claude/plans/2026-07-18-P1-architecture-decision-header-footer-nav.md
  - .claude/plans/2026-07-13-header-footer-nav-system-design-gate.md
absorbs:
  - 17-HEADER-FOOTER-ARCHITECTURE.md    # DELETED 2026-07-21 (§9 coverage gate passed; matrix at reports/2026-07-21-spec17-to-spec37-coverage.md)
absorbed_by: null
lock_reason: null
---

# Spec 37 — SGS Header/Footer Builder

> **⛔ Spec 17 was DELETED 2026-07-21 and must never be cited.** The §9 coverage gate passed
> (matrix: `reports/2026-07-21-spec17-to-spec37-coverage.md` — all 39 Spec 17 FRs plus the five
> plan documents dispositioned). Spec 36 (Navigation) is the *extension* of this spec, not a
> competitor: this spec owns the container, the editing home and the binding; Spec 36 owns
> everything inside the nav, plus the Site-Info data store (amended same-commit).

---

## 0. Plain English (read this first)

**What this is.** The one document describing how an SGS website's header and footer are
built, edited, and attached to the site.

**The problem it fixes.** Three different answers to "where do you edit a header?" were live
at once — the Site Editor (Spec 17 §3), the WP Customiser (Spec 17 Decision 21), and a
dedicated admin page (P2 §2.1). The code implemented the first. The decision was the third.
The Customiser one was never built at all, and Spec 17 itself labels part of that section
"RETRACTED FICTION". A session on 2026-07-21 built and verified the wrong thing purely
because the governing spec still described the superseded model.

**The answer.** A header is a post. You write it in *SGS → Advanced Headers*, exactly like
writing a page, then press **Set as active**. That is the only editing home. There is no
second place to edit a header, because two places to edit one thing is how they drift apart.

**Status honesty.** Some of this is already built. Every requirement below carries a
`Status:` of `BUILT`, `PARTIAL` or `NOT-BUILT` with a `file:line` pointer, so nobody rebuilds
what exists and nobody assumes something works because a similar-sounding file exists.

---

## 1. Scope and ownership boundary

### 1.1 This spec OWNS

- The `sgs_header` / `sgs_footer` CPTs as the **single editing home**.
- The **binding** — how a CPT post becomes the live header/footer.
- The container blocks: `sgs/site-header`, `sgs/site-header-row`, `sgs/site-footer`,
  `sgs/site-footer-row` — their row model, layout contract and controls.
- Header **behaviours**: sticky, transparent, shrink, hide-on-scroll.
- The **starter-template picker** (shared with `sgs_mega_menu`).
- The display-conditions **rules engine** (`Sgs_Header_Rules` / `Sgs_Footer_Rules`).
- Retirement of the legacy header/nav surface.

### 1.2 This spec does NOT own

| Surface | Owner |
|---|---|
| Everything inside the nav (menus, dropdowns, mega, drawer) | **Spec 36** |
| Header/footer clone walker | Spec 33 Part 2 |
| Site Info store (`sgs_site_info`) + the `sgs/site-info` binding source | **Spec 36** — FR-36-23 already names `sgs/business-info` "the Site-Info source of truth" |
| The shared header/footer element blocks — cart, search, social, logo, business-info | **Spec 36** FR-36-19…23 |
| Block styling/serialisation contract | Spec 32 |
| Inspector control completeness | Spec 35 Part L |

**The boundary rule.** Spec 36 §1 already states it does not own the container; this spec
states it does not own the nav. Neither may quietly annex the other. A change that crosses
the line requires an edit to BOTH specs in the same commit.

---

## 2. Architecture

### 2.1 The model in one paragraph

A header or footer is a **post** of type `sgs_header` / `sgs_footer`, authored in the normal
block editor from a starter template. One post per type is marked **active** via
`wp_options['sgs_active_header_cpt_id']` / `['sgs_active_footer_cpt_id']`. On the frontend,
`pre_render_block` intercepts the `core/template-part` block for that area and **renders the
active post's content directly** via `do_blocks()`. The theme's `parts/header.html` and
`parts/footer.html` remain as thin shells so WP's template system stays intact, but they hold
no authored content. Operators who need a header that varies by page type use the rules
engine (§4.20), which is the advanced path over the same mechanism.

### 2.2 Why direct render, and not block patterns

**This is the load-bearing correction over Spec 17.** Spec 17's model turned each published
CPT post into a *block pattern* (`register_block_pattern()`), and the rules engine resolved a
pattern slug at render time. That path is **structurally broken**:

- CPT-derived patterns register on **`admin_init`** only — `class-sgs-block-cpts.php:55`.
- The rules engine resolves on **`pre_render_block`**, a frontend hook —
  `class-sgs-header-rules.php:51`.
- Resolution looks up `WP_Block_Patterns_Registry::get_registered()` —
  `class-sgs-header-rules.php:329`.
- On a frontend request that pattern was never registered, so it returns `null`
  (`:330-331`), the filter returns `$pre` untouched, and the theme default renders.

Net effect today: **a CPT-authored header can never reach the frontend, silently.** No error,
no warning — the D338 silent-failure class. Registering the patterns on `init` instead would
"fix" it at the cost of a `get_posts()` query on every frontend page load, which is precisely
why they were deferred to `admin_init` in the first place.

Direct render sidesteps the whole mechanism: read the post, run `do_blocks()`. It cannot be
broken by pattern-registration timing because it never consults the registry.

### 2.4 Two silent-failure bugs the direct-render branch introduced — and how they were closed (2026-07-22)

A pre-commit `/qc-council` (three Sonnet raters incl. a source-verifying seat, cross-model to the
Opus author) found two bugs in the FR-37-3 implementation before it landed. Both were the D338
silent class — a header that renders and looks right while being subtly wrong — so they are recorded
here as design facts, not just fixed-in-passing.

1. **Empty render short-circuits to a blank header.** `pre_render_block` short-circuits on any
   **non-null** return, not merely a truthy one. `render_active()` returned `(string) do_blocks(...)`,
   so a valid, published, correctly-pointed post whose blocks all fail their own render callbacks
   yields `''` — and that empty string still short-circuits, painting a blank header with no error.
   **Fix:** validating `post_content` is necessary but not sufficient; the RENDER OUTPUT is now
   checked too — an empty render returns `null` and falls through to the default.

2. **A second header area on one page renders a DIFFERENT header.** The branch short-circuits before
   `evaluate()`, so the rules engine's own `$evaluated_this_request` guard is still unset when a
   second `core/template-part` for the same area is resolved. `evaluate()` then runs for the first
   time, matches the immutable default rule, and paints the framework default header into the second
   slot — the CPT header once, an unrelated header once, silently. **Fix:** `Sgs_Active_Layout`
   tracks *attempted* and *served* separately; `has_served()` hands a second slot back to core rather
   than to the rules engine, while an empty render (which set attempted but not served) still falls
   through to the default.

**Design lesson carried forward:** any hook that consumes the header through a route OTHER than
`pre_render_block` (there is at least one — `Sgs_Header_Behaviours` on `body_class`) must be made
CPT-aware in lockstep, and every short-circuit boundary must distinguish "I produced output" from "I
tried". Both are now covered by a mutation-tested harness (removing either fix makes it fail).

### 2.3 Patterns still matter — as starters, not as a render path

The two uses are distinct and must not be conflated again:

| | Starter patterns | Direct render |
|---|---|---|
| When | **Create time** — once | **Display time** — every request |
| What | Seeds blocks into a new post | Reads an existing post's content |
| Registry | Yes, admin-only is fine | Never consulted |

A starter library is therefore fully compatible with §2.2, and is required by §4.7.

---

## 3. Container block design (re-derived)

> **Why re-derived.** The only prior design target was the 07-13 SYSTEM gate §4, which
> predates the CPT decision, the Spec 36 nav rebuild, and the starter picker. The built
> blocks were never audited against it and have **already diverged** (§3.5). Promoting the
> old design unexamined would bake in assumptions that no longer hold, so it is re-derived
> here using 07-13 as evidence rather than as settled fact.

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

### 3.3 Row layout modes — resolving the built asymmetry

`sgs/site-footer-row` carries `gridTemplateColumns`; `sgs/site-header-row` does not. Nothing
documents why. This spec makes the distinction **explicit and intentional** rather than
accidental:

- **`cluster`** — a horizontal flex group that wraps. For rows of unlike items (logo + nav +
  cart). This is what every header row needs.
- **`columns`** — an equal-width grid whose **column count the operator sets as a number**.
  For the footer's columns row.

**Columns are a COUNT, not a ratio (Bean-locked 2026-07-21).** The operator sets how many
columns they want — different sites need different numbers — and the columns behave like every
other piece of SGS content: they **stack on mobile automatically**, with no second setting to
configure. A per-device override exists for anyone who wants e.g. 2 on tablet, but it is never
required to get sensible behaviour.

⛔ **Not a ratio string.** An earlier draft of this spec, and a subsequent developer
recommendation, proposed exposing `gridTemplateColumns` (`2fr 1fr`) as an "Advanced ratio
override" alongside the count. **Rejected:** a CSS grid template is a developer concept, and
putting it in front of a non-coder client fails the operator-simplicity bar (FR-37-26) for a
capability nobody has asked for. The count is the control.

A row declares `layoutMode`, defaulting per slot as in §3.1/§3.2, and an operator may change
it. This replaces the raw `gridTemplateColumns` string with a control a non-coder can use,
and gives the header row grid capability it currently lacks — without either being an
unexplained special case.

### 3.3a Row creation, ordering and uniqueness (settled 2026-07-21)

The three rows are **seeded and locked by the parent container**, not created by the operator.
The mechanism already exists and is nearly correct:

- Each container defines its three rows as a fixed `TEMPLATE` array in `edit.js`
  (`site-header/edit.js:36-83`, `site-footer/edit.js:21-105`) passed to `useInnerBlocksProps`.
  This is a client-side template, which is why neither `block.json` declares one — correct as-is.
- **The one required fix: `templateLock` must change from `'insert'` to `'all'`** on both
  containers (`site-header/edit.js:94`, `site-footer/edit.js:115`). WordPress's `'insert'`
  prevents adding and removing blocks but **still permits moving them** — so an operator can
  currently drag the bottom row above the top one. Both files' own comments claim
  *"operators can't add/remove/reorder rows"* (`site-header/edit.js:91`), which the chosen value
  does not deliver. `'all'` closes it. **`BUILT` 2026-07-22 (commit `0da5ef6a`)** — both containers
  now set `'all'`; verified that both row blocks still set `templateLock: false` at their own level
  (`site-header-row/edit.js:48`, `site-footer-row/edit.js:76`), so freeform row content is untouched.
- **Row content stays freeform.** `templateLock` does not cascade through nesting levels, and
  both row blocks set `templateLock: false` at their own level (`site-header-row/edit.js:48`,
  `site-footer-row/edit.js:76`). Locking the container therefore locks only the three rows —
  §3.5's freeform model inside a row is untouched.
- **No `rowSlot` enum or uniqueness guard is needed.** With the container locked, a fourth row
  or a duplicate `top` cannot be inserted through the UI at all. Adding a schema-level validator
  would be a second guard overlapping a working one — forbidden by
  `~/.claude/rules/prove-the-cause-before-fix.md`.

**What the converter gets:** a deterministic target — `sgs/site-header > sgs/site-header-row`
with `rowSlot` ∈ {`top`,`middle`,`bottom`}, and the footer equivalent with `columns` in place of
`middle`. Fixed count, fixed identity, fixed order, no duplicate handling required (FR-37-22).

### 3.4 Empty row = zero output

An empty row renders **nothing** — no wrapper, no padding, no margin. This is a real fix, not
a nicety: an empty slot that still emits padding was the source of the header padding-bleed
the 07-13 council found.

### 3.5 It is a page with a header-aware container (Bean-locked 2026-07-21)

07-13 §4 specified a "typed element palette (not freeform)" — meaning a row would accept
*only* a fixed list of element types and refuse everything else. The built block is freeform
(`site-header-row` declares no `allowedBlocks`). **This spec resolves the divergence in favour
of freeform, and reverses the 07-13 position deliberately.**

**The model, in Bean's framing:** a header or footer is edited **like a page**. What makes it
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

**Why the reversal.** A hard `allowedBlocks` lock breaks two standing rules. (1) R-31-9
universality — the cloning pipeline must place whatever a draft actually contains; a locked
palette turns any unlisted element into an unfixable clone failure. (2) It fights the
framework's own composability, where any SGS block may nest in any container. The non-coder
benefit 07-13 wanted is delivered by steering (starter templates + promoted palette), and
costs nothing on the day an operator needs something unusual.

### 3.8 Per-device content cascade (Bean-locked 2026-07-21)

Per-device adaptation is a **cascade with override**, not a set of bespoke per-element
mechanisms:

- **Desktop is the base.** Tablet inherits desktop; mobile inherits tablet.
- An operator may **hide or remove** a block at a tier. That change applies to **that tier and
  every tier below it**, and never to a tier above.
- Once a lower tier is explicitly edited, it **stops inheriting** and holds its own value.
- The same inherit / explicit-on / explicit-off distinction as FR-37-14's tri-state, applied
  to **content presence** rather than to a setting.

**Retired in favour of this (Bean, 2026-07-21):** the `move-to-drawer` mechanism (FR-S9-8) —
relocating a header element into the drawer at small widths — is **dropped as too complex**
for the value it returns. `labelCollapse` (icon-only collapse) is **not carried forward as-is**
and is re-evaluated against this cascade before any rebuild: an element that should disappear
on mobile is hidden by the cascade, which needs no per-element mechanism at all.

### 3.9 Header and footer content is per-site, never git-tracked

A site's header and footer live in **that site's database** (the CPT posts), not in the
framework repo. The framework ships *starter patterns* (§4.8) and the *immutable default*
(FR-37-4) — never a client's actual header or footer.

**Why this is a requirement and not a nicety.** `theme/sgs-theme/patterns/footer-indus-foods.php`
put one client's footer — including their name and a hardcoded Google Place CID — into the
framework, so it shipped to every install and appeared on Mama's site. Per-site storage in the
CPT is what structurally prevents that recurring.

**This supersedes the "cross-client universality" acceptance criterion** (verify on
mamas-munches AND indus-foods) as the primary guard: verifying on two clients detects the
symptom after the fact; per-site storage removes the cause. Two-client verification is
retained only where a *framework-level* capability is under test (FR-37-12, FR-37-23).

### 3.9a FR-37-6 file step DONE; residual de-client work is per-site CPTs + one orphan pattern (updated 2026-07-22)

**History (the blocker was real).** FR-37-6 could not originally be executed as written because
`parts/header.html` carried live client data (`"ref":1467` + `"featuredItemIds":["label:Send to
Ward"]` — one client's menu and copy) and is a single shared theme file across all clients, so a
routine `build-deploy.py --target palestine-lives --theme-only` would have pushed one client's header
live onto another site.

**Resolved 2026-07-22 (commit `9b9a8028`) — verify, don't trust this line.** `parts/header.html` is now
a one-line shell: `<!-- wp:pattern {"slug":"sgs/framework-header-default"} /-->`. `parts/footer.html`
was already the footer equivalent. Both reference **framework** patterns that carry no client data
(`framework-header-default.php` verified client-free 2026-07-22 — its only "Indus" mention was a
description docblock, since reworded; `framework-footer-default.php` verified client-free). The file
step of FR-37-6 is therefore DONE.

**Residual de-client work (ground-truthed 2026-07-22):**

1. **One orphan client pattern remains:** `theme/sgs-theme/patterns/footer-indus-foods.php` — leaks
   "Indus Foods Footer" + a hardcoded Google Place CID. Referenced by nothing in the repo (grep for
   `sgs/indus-foods-footer` = 0 hits bar its own slug line). ⚠ **Before deleting, confirm no *live*
   template part on either site references the `sgs/indus-foods-footer` slug** (the Indus site's DB
   content is not in the repo). Once confirmed orphaned, delete it — per-site footers live in the CPT.
2. **The 7 `parts/mega-menu-*.html` files still carry Indus data** but are scheduled for FR-37-21
   retirement *after* the FR-36-18 Indus cutover — not part of this step.
3. **Per-site CPTs:** the FR-37-6 "both sites render from CPTs" done-condition needs each live site's
   header/footer authored as a CPT post and set active. The canary CPT header binding is already
   canary-verified (FR-37-3); authoring the canary footer + the Indus pair is the remaining live work,
   and it also unblocks the Spec 36 FR-36-18 Indus cutover (a plain theme deploy would otherwise push
   the framework-default header onto Indus).

### 3.6 Never-overflow contract

Carried from 07-13 §9, unchanged — it is implementation-ready and independent of editing home:

- Cluster rows: `flex-wrap` + `min-width: 0` on flexible children + `flex-shrink: 0` on the logo.
- `clamp()` for fluid type/space rather than breakpoint steps where possible.
- Container queries for row-level reflow (a row can collapse while the viewport is wider —
  see STOP-CONTAINER-TIER-IS-NOT-VIEWPORT).
- **Gate:** `scrollWidth <= innerWidth` at 375 / 768 / 1440 on every shipped header and footer.

### 3.7 Global defaults + Site Info inheritance

Carried from 07-13 §4b, unchanged in substance. Every element in both containers MUST default
from two shared sources, never from per-block literals:

1. **Global style tokens** — `theme.json` / `wp_global_styles`, and for cloned sites the
   Spec 33 `theme-snapshot.json`.
2. **The Site Info store** — `sgs_site_info` via the `sgs/site-info` bindings source.

A value set once in Site Info renders identically in header and footer with no re-entry.

---

## 4. Functional requirements

> Every FR carries `Status:` (`BUILT` / `PARTIAL` / `NOT-BUILT`) with evidence, and a
> `Done when:` binary check. Status was verified against live code on 2026-07-21; re-verify
> rather than trusting these lines (they drift).

### Editing home and binding

#### FR-37-1 — The CPT is the single editing home
Headers and footers are authored in the `sgs_header` / `sgs_footer` CPT admin screens. The
Site Editor is **not** an editing home for header/footer content, and no second editable
store exists. Rejected explicitly: Site-Editor-as-home, and the hybrid of both (P2 §2.1 —
"WP has no native CPT↔template-part sync… two editable stores holding the same header drift
the moment one is edited and not the other").
**Status:** `✅ BUILT + CANARY-VERIFIED 2026-07-22 (D360).` CPTs + admin submenus exist
(`class-sgs-block-cpts.php:67-165`, `:218-236`); the binding exists (FR-37-2/3, `0da5ef6a`). The
end-to-end operator flow was exercised live on sandybrown: a generic `sgs_header` CPT (#1570) was set
active via the **"Set as active" admin row action** (`admin-post.php?action=sgs_set_active_layout`, no
Site Editor step) and its marker rendered on the cold-cache frontend exactly once, core's
`wp-block-template-part` wrapper replaced; footer (#1571) identical. **⚠ Harness note (D360):** an
earlier run of this same test FAILED only because the pointer was set with a raw `wp option update`
from a WP-CLI context whose option store differs from the live domain's — a store mismatch, NOT a code
bug (probe: frontend `get_option`=0 while `wp option get`=1570, no object cache). Always set active via
the web-context admin action — `STOP-SET-ACTIVE-LAYOUT-IN-THE-WEB-CONTEXT-NOT-RAW-WP-CLI-OPTION`.
**Done when:** an operator can create a header in *SGS → Advanced Headers*, set it active, and
see it on the frontend, with no Site Editor step anywhere in that flow. ✅ met.

#### FR-37-2 — "Set as active" action and stored pointer
A row action + editor action on each CPT writes `wp_options['sgs_active_header_cpt_id']` /
`['sgs_active_footer_cpt_id']`. Setting a new active post clears the previous one (single
active per type).
**Status:** `NOT-BUILT` — grep for `sgs_active_header_cpt_id` returns zero hits outside
`build/`.
**Done when:** the option holds the chosen post ID; setting another post active replaces it;
the value survives a cache flush.
**Status update 2026-07-22:** `BUILT` — `class-sgs-active-layout.php` (`set_active`/`clear_active`
write `sgs_active_header_cpt_id`/`sgs_active_footer_cpt_id`; single-active enforced structurally
by one option holding one id) + `class-sgs-active-layout-admin.php` ("Set as active" row action,
nonce + `edit_theme_options` gated). Commit `0da5ef6a`. Guard/validation logic covered by a
mutation-tested harness (16 checks incl. a negative control). Canary flow still unverified.

#### FR-37-3 — Direct-render branch
`Sgs_Header_Rules::filter_template_part()` gains an early branch, **before** `self::evaluate()`,
that when the active-CPT option is set renders that post's `post_content` through
`do_blocks()` and returns it. It MUST:
(a) carry its **own re-entrancy guard** — the existing `$evaluated_this_request` static guards
`evaluate()`, not this branch, so a template rendering the header area twice would
double-render;
(b) **make the behaviour resolver CPT-aware — this is the load-bearing clause.**
Footer mirrors this exactly.

> **⚠ Corrected 2026-07-21 after an adversarial council; the original text here was wrong and
> would have shipped a silent failure.** v1.0.0 said to pass the HTML through
> `apply_filters( 'sgs_header_rule_resolved', … )` because "that filter is where behaviour CSS
> is injected". **Verified false:** that filter has **zero subscribers** — it appears exactly
> twice in the codebase, as the `apply_filters` call itself (`class-sgs-header-rules.php:249`)
> and as a comment asserting it matters (`sgs-blocks.php:296`). Nothing has ever hooked it.
>
> **The real mechanism, and the real risk.** Header behaviours are resolved by
> `Sgs_Header_Behaviours`, which hooks **`body_class`** (`class-sgs-header-behaviours.php:81`)
> — a different hook from `pre_render_block` — and calls
> `Sgs_Header_Behaviours::resolve_active_header_behaviour()` (`:143`), which reads the header's
> block markup via `SGS_Nav_Menu_Source::get_header_content()` (`:173`). That function reads the
> `wp_template_part` post (`class-sgs-nav-menu-source.php:397-399`), falling back to the
> **`parts/header.html` file** (`:410-412`). It knows nothing about the CPT.
>
> **Therefore:** the moment FR-37-6 empties `parts/header.html`, `get_header_content()` finds no
> `sgs/site-header` block, every behaviour flag resolves false, no body classes are emitted, and
> sticky / transparent / shrink stop working **with no error** — the D338 silent-failure class
> this spec exists to prevent, reproduced by this spec.

**Required:** `SGS_Nav_Menu_Source::get_header_content()` gains an **active-CPT branch as its
FIRST source**, ahead of the `wp_template_part` post and the file (CPT → template part → file).
Carry forward the resolver's existing `transparent + contrastSafe='none' → 'scrim'` WCAG upgrade
(`class-sgs-header-behaviours.php:218-228`) — a tri-state reshape (FR-37-14) plus scoped CSS
(FR-37-15) drops it silently otherwise.
**⛔ FR-37-6 is GATED on this clause landing first.** Emptying the template part before the
resolver is CPT-aware breaks every behaviour on both sites at once.
**Status:** `✅ BUILT + CANARY-VERIFIED 2026-07-22` (commits `0da5ef6a` + `9ff24f74`). All four
acceptance checks passed live on sandybrown (cold cache, checksum-verified deploy): an active CPT
header rendered; the marker appeared **exactly once** (re-entrancy guard); **sticky was live**
(`sgs-header-behaviour-sticky` emitted — clause (b) proven); core's `wp-block-template-part` wrapper
was replaced by the CPT render; and trashing the active post fell through to the framework default
(no fatal, no blank header, marker gone — clause (c) proven).

> **🐛 Bug the live test caught — that no code-read could (fixed `9ff24f74`).** The first canary run
> FAILED to render the CPT header while the sticky class still appeared — the contradiction that
> located the cause. `filter_template_part` gated on `attrs.area === 'header'`, but the SGS theme
> references the part as `{"slug":"header","tagName":"header"}` with **no `area` attr**
> (`front-page.html:1`, `index.html:1`). So the filter never fired — the header rendered via core, and
> only the behaviour resolver saw the CPT (it reads the post directly). This was a **latent bug in the
> rules engine that predates the CPT work** — the area-only gate never fired on this theme at all.
> Both engines now match by **`area` OR `slug`**. Lesson: the mutation harness + every code-read
> passed because the defect lives in the integration between the theme templates and the filter gate,
> not in the branch logic — only a live render surfaced it (R-31-11).

_Original build note:_ Commit `0da5ef6a`. Both rules engines gained the
branch before `evaluate()` (`class-sgs-header-rules.php`, `class-sgs-footer-rules.php`);
`Sgs_Active_Layout::render_active()` carries clause (a); `get_header_content()` gained the CPT-first
branch for clause (b) (`class-sgs-nav-menu-source.php`); `get_active_id()` fails closed for clause
(c). The WCAG `transparent + none → scrim` upgrade was verified downstream of the shared resolver,
so it still fires for a CPT header.
**Done when:** an active CPT header renders on a cold frontend request with all caches cleared;
the page contains the CPT's content exactly once; **and a header with sticky enabled in the CPT
emits its body class and is observably sticky on the frontend** — measured on the live page, not
inferred from the emit. *(All four still owed — the canary run is the remaining work.)*

#### FR-37-4 — Immutable fallback
With no active CPT and no matching rule, the theme's framework default pattern renders
(`sgs/framework-header-default` / `sgs/framework-footer-default`). This fallback can never be
deleted by an operator.
**Status:** `BUILT` — `class-sgs-header-rules.php:39,82`.
**Done when:** clearing the active option restores the default header with no fatal error.

#### FR-37-5 — "Active" indicator on the list table
Both CPT list tables show an **Active** status column, following the pattern WP uses for the
active theme, so an operator with several saved headers can see which is live without opening
each.
**Status:** `BUILT (code) — canary-unverified` (commit `0da5ef6a`,
`class-sgs-active-layout-admin.php` — `manage_{cpt}_posts_columns` + `display_post_states`). A row
pointed at a non-published post shows "Active (not published — default is showing)" rather than
falsely claiming Active, so a trashed active post is legible in the list table.
**Done when:** exactly one row per type shows Active, and it matches the stored option.

#### FR-37-6 — Template parts are thin shells
`parts/header.html` and `parts/footer.html` contain only what is needed for WP's template
system to resolve the area. Authored block content lives in the CPT, never in the part. The
markup currently hand-authored in `parts/header.html` moves into a starter template.
**Status:** `PARTIAL — file step DONE, per-site CPTs owed.` Both part files are now one-line shells
referencing client-free framework patterns (`parts/header.html` gutted in commit `9b9a8028`;
`parts/footer.html` was already a shell — verified 2026-07-22). FR-37-3's CPT-aware binding is now
canary-verified, so emptying the file no longer risks the clause-(b) behaviour break. **Remaining:**
(1) delete the orphan `patterns/footer-indus-foods.php` after confirming no live template part
references its slug; (2) author each live site's header/footer as a CPT + set active so the
"both sites render from CPTs" condition holds. See §3.9a.
**Done when:** neither part file contains authored content (✅), and both sites render from CPTs (owed).

### Starter templates

#### FR-37-7 — One shared starter-template picker
A single picker component serves `sgs_header`, `sgs_footer` **and** `sgs_mega_menu`. On
creating a new post of any of those types, the first screen is a visual card grid of styles
with preview-before-apply, plus a persistent "Start from scratch" card. One implementation,
three consumers.
**Status:** `NOT-BUILT` — Spec 36 FR-36-3 already assumes this reuse and flags it as unproven
(0 hits in `src/`).
**Done when:** creating a post of each of the three types shows the same picker component, and
choosing a style produces that style's block tree.

#### FR-37-8 — Starter library is git-versioned patterns
Starters are block patterns under `theme/sgs-theme/patterns/`, not synced `wp_block` posts, so
they are versioned, reviewable and shippable. Starter patterns declare
`templateLock: "contentOnly"` where structural edits would break the design.
**Status:** `NOT-BUILT` for header/footer starters.
**Done when:** each starter is a file in the repo; applying one produces its tree; no starter
depends on database state.

### Container blocks

#### FR-37-9 — `sgs/site-header` + `sgs/site-header-row` conform to §3
The header container and its rows implement §3.1, §3.3, §3.4, §3.6.
**Status:** `AUDIT DONE 2026-07-22 — 3 gaps carried, none silently dropped.` A per-clause audit
(read-only, `file:line` per verdict) ran against §3. **PASS:** §3.1 three named rows; §3.4
empty-row-zero-output (`site-header-row/render.php:29-31` guard, confirmed present — the earlier
"unverified" is resolved); §3.5 no `allowedBlocks` lock; §3.6 `min-width:0` on children +
`flex-shrink:0` on logo (`site-header-row/style.css`); no inline `style=""` (Spec 32);
composite-mirror. **FAIL, carried as follow-ups (§3-audit-carried below):** §3.3 `layoutMode`,
§3.5 promoted-palette, §3.6 container-queries. The §3.6 live overflow gate is FR-37-12 (canary).
**Done when:** an audit against §3 is recorded per clause with a pass/fail and a `file:line`,
and every fail is either fixed or carried as a named FR. ✅ met (findings + carried FRs below).

#### FR-37-10 — `sgs/site-footer` + `sgs/site-footer-row` conform to §3
As FR-37-9, against §3.2, §3.3, §3.4, §3.6.
**Status:** `AUDIT DONE 2026-07-22.` Same audit as FR-37-9; footer rows PASS the same clauses
and share the same three carried gaps (one fix per gap covers both rows). The footer count
wiring (FR-37-11) was confirmed live in the audit, not just declared.
**Done when:** as FR-37-9. ✅ met.

##### §3-audit-carried — three §3 gaps carried as follow-ups (2026-07-22, not silently dropped)

Each is real feature work, none is a cheap lint fix, and each applies to BOTH row blocks (one
mechanism covers both). Recorded here so a future session picks them up rather than rediscovering:

- **FR-37-33 — `layoutMode` is implicit, not a first-class control (§3.3).** Neither row declares
  a `layoutMode` attr; the mode is inferred from the `layout` string (`flex`/`grid`) fixed at
  template-insert time, with no inspector control to switch a row between cluster and columns. Add
  the attr + control + wiring. `NOT-BUILT`.
- **FR-37-34 — the row inserter does not promote the common elements (§3.5).** Freeform is
  correctly unlocked (no `allowedBlocks`), but there is zero "steering" — no promoted palette for
  logo/nav/search/cart/account/CTA/contact/social. §3.5's plain-English "the inserter promotes…" is
  aspirational, not shipped. Build the promoted-palette/placeholder. `NOT-BUILT`.
- **FR-37-35 — container-query row reflow is absent (§3.6).** Only viewport-level `flex-wrap`
  exists; no `@container` rule in either row's CSS. A row cannot yet collapse while the viewport is
  wider (the STOP-CONTAINER-TIER-IS-NOT-VIEWPORT case). `NOT-BUILT`.

`clamp()` for fluid type/space (§3.6, "where possible") is not shipped in the row CSS — noted as
optional, not a fail.

#### FR-37-11 — Footer columns: an operator-set count that stacks automatically
The `columns` row exposes a **column count** as a number (§3.3). Desktop is the only tier an
operator must set; the row **stacks to 1 column on mobile automatically**, like all other SGS
content. A per-device override is available but never required. The count drives the shared
container grid engine — no new engine (R-31-9 reuse).

> **🐛 LIVE BUG this FR must fix — found 2026-07-21, verified.** `site-footer/edit.js:28-30`
> inserts a footer row carrying `columns: 3`, `columnsTablet: 3`, `columnsMobile: 1` — but
> `site-footer-row/block.json` **declares none of those three attributes** (only
> `gridTemplateColumns`). Per D338, WordPress **silently discards** any attribute a block does
> not declare, so every footer row created from that template throws those three values away at
> save, with no error and no failing build. This is the project's own documented silent-discard
> class, live in the footer today. Declaring the count attribute is therefore not just this FR's
> feature — it is the fix.

**Reuse, don't reinvent:** `SGS_Container_Wrapper` already carries a `columns` integer family
alongside `gridTemplateColumns`, and already implements "explicit template wins, count is the
fallback" (`class-sgs-container-wrapper.php:583-590`). What it lacks is object-shaped (per-tier)
reading of `columns` — it coerces an array to the default `2` (`:150`). Extend that gating the
same way `gridTemplateColumns` is already read per tier; do not add a parallel mechanism.
**Status:** `BUILT (code) — canary-unverified` (2026-07-22). Three-part fix, all block-private,
**wrapper untouched** (the capability was already there — this was a wiring bug, not a missing
feature):
1. `site-footer-row/block.json` declares `columns`/`columnsTablet`/`columnsMobile` (number) — stops
   the silent discard (D338).
2. The object `gridTemplateColumns` DEFAULT was removed, and the parent template
   (`site-footer/edit.js`) no longer seeds `{desktop:'2fr 1fr 1fr', mobile:'1fr'}`. This matters
   because of the wrapper's grid gate (`class-sgs-container-wrapper.php:138`,
   `$object_grid = $object_model && is_array($gridTemplateColumns)`): an object present — even
   `{}` — flips `$object_grid` true and SUPPRESSES the flat count path. With no object, the wrapper
   renders `repeat(columns,1fr)` + the `sgs-cols-*` responsive classes (`:583-590`, `:800-811`).
3. `site-footer-row/edit.js`: the existing count slider now writes the flat integer attrs directly
   (via `ResponsiveOverride` bridged to the three attrs), instead of encoding a `repeat(N,1fr)`
   template string that re-triggered the object path. The `columnsToTemplate`/`templateToColumns`
   shims were deleted.

> **Discovery, recorded:** the earlier "shared-wrapper change needed, design-gate territory" reading
> was WRONG — it came from a review that saw only the wrapper's template path and missed the flat
> count path six lines above it. The wrapper already reads a per-device count AND a per-device custom
> template in grid mode; the footer row was simply defaulting to the template shape. `gridTemplateColumns`
> is retained (no default) as the ADVANCED per-device custom-template override, never the operator
> default (§3.3's ratio-is-a-developer-concept rule).

**Done when:** an operator sets a column count with no CSS and no ratio string; the row renders
that many columns on desktop and stacks to 1 on mobile with no further configuration; and the
values set by `site-footer/edit.js` are no longer discarded — verified by reading the saved
post content, not the editor state. *(Live canary render of the count still owed.)*

#### FR-37-12 — Never-overflow contract
§3.6 holds on every shipped header and footer.
**Status:** `PARTIAL` — a `min-width:0` wrapper backstop shipped but was never
live-emission-proven (LEDGER, Spec 35 track).
**Done when:** `scrollWidth <= innerWidth` at 375 / 768 / 1440 on both dev sites, measured on
the live page, not asserted.

### Behaviours

#### FR-37-13 — The behaviour set
Four independent header behaviours: **sticky**, **transparent**, **shrink**,
**hide-on-scroll**. Any combination may be active.
**Status:** `PARTIAL` — sticky/transparent/shrink are built
(`class-sgs-header-behaviours.php`); **hide-on-scroll is dormant and unreachable**: the scroll
handler exists (`src/header-behaviours/view.js:15,57,107` — self-described "legacy/dormant
path") but there is **no attribute, no control, and nothing emits the
`sgs-header-behaviour-hide-on-scroll-down` body class**. The D338 class: capability present,
no attribute to reach it.
**Done when:** all four are settable from the inspector and observable on the frontend, and the
dormant JS path is either reached by a real control or deleted.

#### FR-37-14 — Behaviour attributes are tri-state
Each behaviour is a **tri-state** (`inherit` / `on` / `off`) per device tier, not a flat
boolean — a boolean cannot express "inherit from desktop" versus "explicitly off here"
(P1 DP1). Applies to `headerSticky`, `headerTransparent`, `headerShrink`, `contrastSafe`, plus
the new hide-on-scroll attribute.
**Clean reshape, no migration, no fallback.** Both sites are pre-live, so there is no
production data to protect; per D270/D293 no deprecations and no read-time legacy fallback are
added (which would violate R-31-14 anyway). Existing dev instances are re-inserted or
recovered in the editor.
**Status:** `NOT-BUILT` — all four are currently flat (`boolean`/`string`) in
`site-header/block.json`.
**Done when:** the four attrs plus hide-on-scroll are tri-state objects; an audit of both dev
sites shows no instance left carrying the old flat shape.

#### FR-37-15 — Behaviours emit scoped CSS, not body classes
Behaviour styling is emitted as scoped `#uid` rules (including `@media` tiers), per Spec 32.
The body-class mechanism is retired or reduced to a JS-state signal only.
**Status:** `NOT-BUILT` — currently body-class driven
(`class-sgs-header-behaviours.php:23-30`).
**Done when:** no header behaviour renders an inline `style=""` declaration, and the emitted
CSS is scoped to the block uid.

### Data model and controls

#### FR-37-16 — Responsive value shape
Every responsive property is `{ desktop: <val>, tablet: <val|null>, mobile: <val|null> }`,
cascading from desktop when a tier is null. Device tiers are 768 / 1024 per
`~/.claude/rules/visual-standards.md`.

> **⚠ Two corrections, 2026-07-21 (adversarial council + verification).**
>
> **1. The uid-canonicalisation instruction is STRUCK.** v1.0.0 said "canonicalise attribute key
> order before the uid md5 (07-13 §8)". That directly reverses **D334**, which is council-gated
> and enforced in code: `site-header-row/render.php:49` carries
> `// STOP-NO-KSORT: do not reorder $attributes before hashing`. Canonicalisation exists as a
> **write-time oracle**, deliberately kept out of the hash path; reordering keys changes every
> uid, which re-keys every scoped-CSS selector and breaks the collector's cross-page dedup.
> **D334 governs. 07-13 §8 is superseded on this point.**
>
> **2. The status was wrong in both directions.** v1.0.0 claimed `BUILT` for "the 17 tiered
> attrs". Verified counts: **`sgs/site-header` has 0 object-typed attrs and 20 flat suffixed
> ones** (`maxWidthTablet`, `paddingTopMobile`, …); **`sgs/site-header-row` has 5 object-typed**
> (`gap`, `maxWidth`, `contentWidth`, `padding`, `margin`) and 0 flat. So the shape is built on
> the **rows**, not the containers — the opposite of what the FR implied — and "flat for others"
> concealed a real migration of the two highest-attribute blocks in the spec.

**Status:** `PARTIAL` — object shape on the ROW blocks (5 attrs each); the CONTAINER blocks are
entirely flat (20 suffixed attrs on `site-header`). Converting the containers is real work, not
polish, and falls under FR-37-14's clean-reshape clause (pre-live, no migration, no fallback);
existing dev instances are recovered via the Site Editor's "Attempt Block Recovery", the only
permitted route under the no-deprecations policy.
**Done when:** every responsive property on all four blocks uses the object shape; no flat
`*Tablet`/`*Mobile` attr remains on either container; uid generation is unchanged and
`STOP-NO-KSORT` still holds.

#### FR-37-17 — Site Info + global defaults
§3.7 holds.
**Status:** `BUILT` — `sgs/business-info` drives footer data (`3015add4`).
**Done when:** a value set once in Site Info renders in header and footer with no re-entry,
verified on both dev sites.

#### FR-37-18 — Inspector conformance
Every control in both containers satisfies Spec 35 Part L (the per-block definition of done).
**Status:** `NOT-BUILT` — neither container appears in the Spec 35 manifested roster.
**Done when:** both containers pass `check-element-manifest-conformance.js` with zero GAPs.

#### FR-37-19 — Accessibility feedback is informational only
Contrast/a11y feedback from operator choices is a **passive notice** in the editor and admin —
never a save/publish gate, never auto-enforced, never agent-wired (P1 DP2a, Bean-locked). The
framework's own default output still meets WCAG 2.1 AA.
**Status:** `BUILT` in policy; no header/footer-specific notice exists yet.
**Done when:** an operator can save a low-contrast header, sees a notice, and is never blocked.

### Rules engine

#### FR-37-20 — Display conditions (advanced path)
The existing ordered, first-match-wins rules engine remains for header-per-page-type
(conditions: post type / template / URL / role / device). It sits **after** the active-CPT
branch, so the common case never touches it.
**Status:** `BUILT` — `class-sgs-header-rules.php`, `class-sgs-footer-rules.php`.
**Done when:** a rule targeting a page type renders a different header there, with the active
CPT still serving everywhere else.
**⚠ Known limitation carried forward:** a rule whose target is a *CPT-derived pattern* cannot
resolve on the frontend (§2.2). Until FR-37-3's direct-render is extended to rule targets, the
advanced path is limited to file-registered patterns. Recorded, not hidden.

### Retirement

#### FR-37-21 — Retire the legacy header/nav surface
Delete, in one commit, gated on **Spec 36 FR-36-18** (Indus cutover) being green:
`sgs/adaptive-nav`, `sgs/mega-menu`, the 7 `mega-menu-*` template parts, their `theme.json`
`templateParts` entries, and the 7 `mega-menu-*` patterns. Update
`patterns/framework-header-default.php` — it currently emits `sgs/adaptive-nav` at lines
29-33, so **every fresh SGS install gets the retired nav**.
**Status:** `✅ BUILT — repo + canary DONE 2026-07-22 (D362); production deploy separate.` Executed in
two commits: `f1f86ea0` (re-point `framework-header-default.php` + the 3 `header-search-*` starters off
the adaptive-nav wrapper onto `sgs/nav-menu` + `sgs/nav-drawer`) → `23a3cf63` (delete `sgs/adaptive-nav`
+ `sgs/mega-menu` src+build, `class-sgs-adaptive-nav-renderer.php`, the 7 `mega-menu-*.html` parts, the 7
`mega-menu-*.php` patterns, the 7 `theme.json` templateParts entries, `mega-menu-panels.css`; clean all
functional refs; `/sgs-update` pruned the DB — `orphan_blocks_deleted=2`, 14 supports, 44 attrs). Two
blocking LIVE references were cleared first (Bean-authorised, the FR-36-18 zero-live-instances gate):
canary draft page 1320 (a false-positive — only `patternName` metadata text) and production
`wp_navigation` post 100 (a real orphan — the live header uses `sgs/nav-menu {ref:3}`, a classic menu
term, not that post). **Latent bug fixed in passing:** `site-header/edit.js`'s insert TEMPLATE still
auto-inserted the deleted adaptive-nav → now `sgs/nav-menu`. Deployed + verified clean on the canary
(fresh-default renders the new nav, grep=0 functional refs, 0 console errors). **Production
(palestine-lives) deploy** was gated by the pre-existing, unrelated oldshape debt on posts 67/68 (parking
`P-INDUS-OLDSHAPE-67-68`); Bean authorised `--skip-oldshape-audit` for that deploy (ships the nav change,
not those posts' content) — see the LEDGER for its live-verification result.
**Done when:** zero references to either block outside `git log` (✅ repo); a fresh install renders the
Spec 36 nav (✅ verified on the canary fresh-default). Production deploy tracked in the LEDGER.

### Pipeline

#### FR-37-22 — Emittable by construction
Every capability above must be settable by the cloning converter and mappable from what the
converter extracts from a draft header/footer — a design constraint on this spec, not a
later bolt-on (P1 DP6).
**Status:** `NOT-BUILT` — the header/footer walker is Spec 33 Part 2, not started.
**Done when:** a drafted header clones into an active CPT header with its structure and
behaviours carried, verified on the real homepage (R-31-11).

### Added by the §9 coverage gate (2026-07-21)

> These close gaps the coverage matrices found against Spec 17 and the plan docs. Without
> this pass they would have been silently dropped — which is the failure this spec exists to
> prevent, so they are recorded as first-class FRs rather than footnotes.

#### FR-37-24 — Per-device content cascade — ⬆ MOVED TO SPEC 35
**Resolved 2026-07-21: this is a framework-wide concern, not a header/footer one, and is
re-homed to Spec 35 in the same commit** (per §1.2's both-specs-same-commit rule).

**Why it moved.** The mechanism it changes — `sgsHideOnMobile`/`Tablet`/`Desktop` — is not a
header/footer attribute. It is a universal extension applied to **every block in the framework**
(`includes/device-visibility.php`, `src/blocks/extensions/responsive-visibility.js`). Redefining
it from three independent toggles into an inheriting cascade changes the meaning of every
existing use across all ~67 blocks. Doing that from inside a header/footer spec would be exactly
the divergence R-31-9 and the composite-mirror rule forbid, and Spec 35 §D3 already owns the
generic principle ("Mobile inherits from desktop unless overridden").

**HIDE, not REMOVE (settled).** The cascade hides via CSS; it never forks the block tree per
tier. Verified: `device-visibility.php:10,15` generates `display:none` media queries and states
*"Content remains in the DOM for SEO (display:none only hides visually)"*. REMOVE would break
that crawlability guarantee (memory `degrade-to-more-content-never-less`) and would need
per-device cache fragments the framework's page-cache model has no key for.

**`inherit` resolves at render, never copies down at save.** Copying the parent's value into a
child tier at save time makes an inherited value indistinguishable from an explicit override, so
a later desktop edit can no longer cascade. Store the literal `inherit`; resolve on read.

**What Spec 37 still requires of it:** §3.8's behaviour is a *dependency* of this spec — the
container rows rely on it — but the implementation and its FR live in Spec 35.
**Status:** `MOVED` — Spec 35 owns the build; this entry is a pointer, retained so the
requirement is never lost in the hand-off.

#### FR-37-25 — Reset to default
An operator can clear the active header/footer and return to the framework default, from the
admin, without touching code or the database.
**Status:** `BUILT (code) — canary-unverified` (commit `0da5ef6a`). `Sgs_Active_Layout::clear_active()`
+ the "Clear active" row action (`class-sgs-active-layout-admin.php`) delete the pointer; the branch
then falls straight through to the rules engine and the immutable default. The previously-active post
is untouched and re-activatable. This doubles as the rollback for the whole binding.
**Done when:** the reset action clears the option; the immutable default (FR-37-4) renders; the
previously-active post still exists and can be re-activated.

#### FR-37-26 — Operator-simplicity test
A defined pass/fail usability test, not a subjective judgement: **a non-coder sets sticky +
phone number + drawer content in under 3 minutes without opening Advanced.** Floor: Bean plus
one blind tester, screen-recorded (P1 DP5, P2 §8).
**Status:** `NOT-BUILT`.
**Done when:** the test has been run and recorded, with the result — pass or fail — written
down. A fail is a finding, not a reason to re-run until it passes.

#### FR-37-27 — Simple vs Advanced control placement
The Simple surface ships **≤3 controls by default**. Operator pin/unpin exists but is
**default-off**, reached through an Advanced "Customise this panel" action — never a
first-class drag handle, because a tech-illiterate client can unpin a control they rely on and
get a "missing setting" with no trail (P2 §5, Bean-confirmed).

**The roster is settled — adopted verbatim from P2 §5 (`:468-478`), which was already
design-reviewed and Bean-steered. Do not re-derive it:**

| Block | Tab | **Simple (default)** | Advanced (`ToolsPanel`) |
|---|---|---|---|
| `sgs/site-header` | Settings | Sticky on scroll · Show phone / click-to-call | Transparent-until-scrolled · Shrink · Hide-on-scroll · Contrast mode |
| `sgs/site-header` | Styles | Layout preset (Centred / Split / Minimal) | Header width · per-breakpoint spacing |
| `sgs/site-footer` | Settings | Column count · Show credit line | Per-device column override |
| `sgs/site-footer` | Styles | — | Background · spacing overrides |

**What the lint counts (P2 §5 `:464-466`, verbatim):** *"one labelled inspector row = one
control. A `ResponsiveTriStateControl` counts as **one** control."* A preset (FR-37-28) counts
as **one**, not as the N attributes it writes. The **Advanced `ToolsPanel` is uncapped** and
does not count — the cap governs the default surface only.

**No conflict with FR-37-18 (verified 2026-07-21).** The two lints measure different things and
neither blocks: `check-element-manifest-conformance.js` asks whether every capability has a
control *somewhere* (Advanced satisfies it) and is **WARN-ONLY, always exits 0** (`:58-62`).
`check-simple-surface-cap.js` governs only which controls are default-visible.
`sgs/site-header` already uses `ToolsPanel` disclosure (`site-header/edit.js:116-230`), which is
the mechanism that reconciles them — it is not a design problem to solve.
**Status:** `NOT-BUILT` — `check-simple-surface-cap.js` does not exist (verified: 0 files).
**Done when:** both containers show exactly the Simple controls in the table above by default;
the lint fails a build that adds a fourth.

#### FR-37-28 — Preset controls are permitted
The inspector may expose composite preset controls (e.g. *Layout: Centred / Split / Minimal*)
that write several attributes at once. The converter still targets the attribute layer only —
presets are an operator convenience, never a storage shape (P2 §2.6, Bean-confirmed; it struck
the earlier "inspector = 1:1 attribute view" rule).
**Status:** `NOT-BUILT`.
**Done when:** at least one preset control exists on the header container and sets its
attributes such that the converter round-trips them unchanged.

#### FR-37-29 — Device-switcher accessibility
The inspector's device switcher is a real `tablist` with roving tabindex and arrow-key
navigation, and its targets are ≥44×44px.
**Status:** `NOT-BUILT` — a diagnosed defect: `ResponsiveControl.js:77-89` is a plain
`ButtonGroup` with no `tablist` role and Tab-key-only navigation; `:80-87` uses `size="small"`
(~24-32px). P2 §4.3 records this as a correction to an earlier false claim that WP provided it.
**Done when:** axe reports zero violations on the switcher and the targets measure ≥44px.

#### FR-37-30 — WP-CLI surface (developer and pipeline only)
A reduced `wp sgs` command set covers the header/footer lifecycle non-interactively: set/clear
active, list headers/footers, seed a starter. **Explicitly not a client-facing surface** —
clients use the admin screens exclusively (framework CLAUDE.md: "WP-CLI is a developer tool
only; never something clients touch"). It exists so that Bean and the cloning pipeline have a
programmatic path, which FR-37-22 depends on.
**Status:** `NOT-BUILT` — Spec 17 FR-S5-3 specified 11 `wp sgs` commands; this carries a
reduced set scoped to this spec's surface.
**Done when:** each command runs non-interactively, is covered by `--help`, and the cloning
pipeline can set an active header without a browser.

#### FR-37-31 — Retire the orphan behaviour template parts; preserve search starters
Delete the inert `header-sticky` / `header-transparent` / `header-shrink` template-part
registrations, their patterns and their `theme.json` entries — behaviours are attribute-driven
(FR-37-13/14/15), so these are dead weight that misleads a reader about which mechanism is
live. **Separately, preserve** the three shipped search-header starters
(`header-search-bar-above`, `header-search-bar-below`, `header-search-icon`) into the FR-37-8
starter library, along with their design principle that **header search is opt-in, not default**
(Spec 17 FR-S1-5).
**Status:** `NOT-BUILT`.
**Done when:** zero references to the three behaviour stubs remain; the three search starters
are selectable from the FR-37-7 picker.

### Gate

#### FR-37-23 — Acceptance
This spec closes only when: FR-37-1/2/3/5 are live on the canary; §3 audits (FR-37-9/10) are
recorded per clause; the never-overflow gate (FR-37-12) passes on both sites at three widths;
no inline `style=""` on either container; and **Bean's eye** signs off (R-31-13 — measurement
and eye are co-authoritative, neither closes alone).
**Status:** `NOT-BUILT`.
**Done when:** all of the above, each with evidence recorded, not asserted.

---

## 5. Build status summary

> **Updated 2026-07-22** — the 6-FR minimum core landed in code (commit `0da5ef6a`).
> `BUILT (code)` below means shipped + mutation-tested + build-green, but **not yet exercised on the
> canary** — the FR-37-23 acceptance gate (four live checks on a cold cache) is the remaining work
> before any of these is "done".

| Area | Status |
|---|---|
| CPTs + admin pages | `BUILT` |
| Active pointer + "Set as active"/"Clear" (FR-37-2/25) | `BUILT (code)` — canary-unverified |
| CPT → frontend binding (FR-37-3, incl. CPT-aware resolver) | `BUILT (code)` — was §2.2 silently broken; direct render replaces it |
| "Active" list-table column (FR-37-5) | `BUILT (code)` — canary-unverified |
| Container blocks exist | `BUILT` (2026-07-13, for Spec 17) |
| Container blocks **conform to a defined end state** | `UNVERIFIED` — §3 is the first such definition (FR-37-9/10 audit not run) |
| Row reorder-lock (`templateLock: 'all'`, §3.3a) | `BUILT (code)` |
| Footer per-device column count (FR-37-11) | `BUILT (code)` — count path wired, wrapper untouched; canary-unverified |
| sticky / transparent / shrink | `BUILT` (flat, pre-tri-state) |
| hide-on-scroll | `PARTIAL` — dormant JS, no attribute |
| Tri-state shape | `NOT-BUILT` |
| Scoped behaviour CSS | `NOT-BUILT` |
| Empty the header template part (FR-37-6) | `PARTIAL` — file step DONE (`9b9a8028`); per-site CPTs + orphan-pattern delete owed (§3.9a) |
| Starter picker | `NOT-BUILT` |
| Rules engine | `BUILT` |
| Legacy retirement (FR-37-21) | `✅ DONE` repo + canary (D362, `f1f86ea0`+`23a3cf63`) — adaptive-nav + mega-menu deleted; prod deploy in LEDGER |

---

## 6. Out of scope (the NOT list)

- **Nav internals** — Spec 36. This spec never describes a menu, dropdown, mega panel or drawer.
- **The header/footer clone walker** — Spec 33 Part 2.
- **The WP Customiser.** Spec 17's `§Customiser Migration` (Decision 21, Phase 5b) is
  **dropped, not deferred.** The classes it named never existed; Spec 17 itself marks that
  block "RETRACTED FICTION". Superseded by FR-37-1.
- **Block version bumps / `deprecated.js`** — pre-production policy, D270/D293.
- **Per-page-type CPT rule targeting** — see FR-37-20's limitation.

---

## 7. Constraints binding every FR

1. **No inline `style=""`** on any block in this spec (Spec 32).
2. **Composite-mirror (R-31-9 / D294)** — both containers are `containerKind: section`, so they
   keep `SGS_Container_Wrapper`; no per-block CSS that diverges from it.
3. **No hardcoded client data** — Site Info or global styles, never literals (R-31-1).
4. **WCAG 2.1 AA** on default output; 44px targets; visible focus.
5. **DB-first** — no hardcoded lookup dicts; the block/attr registry is authoritative.
6. **Verify on the live page**, not the emit (R-31-11, STOP-21).

---

## 8. Resolved questions and remaining unknowns

### 8.1 Resolved 2026-07-21 (Bean)

1. **Site Info ownership → Spec 36 — REQUIRES A SPEC 36 AMENDMENT IN THE SAME COMMIT.**
   Spec 17 §S4's store, binding source and admin page move to **Spec 36**, which already names
   `sgs/business-info` "the Site-Info source of truth" (FR-36-23) and owns the other four shared
   elements (FR-36-19…22). This spec references them and owns none.
   **Bean's reasoning (2026-07-21):** the data is genuinely site-wide — an address belongs on a
   contact page as much as in a footer — it is delivered as a block, and every block that
   consumes it already lives in Spec 36. Splitting the store from its consumers puts them in
   different specs for no gain. He also notes that over-elevating this family inside a
   header/footer spec previously led to client variants being hardcoded into the header and footer.
   > **⚠ Spec 36 currently REFUSES this, and must be amended deliberately — not annexed by
   > assertion.** Spec 36 (signed off v2.1) says so twice: *"the Site-Info option store remains
   > **Spec 17's** — nav owns the *rendering* of Site-Info-driven pieces, not the data store"*
   > (`36:49-50`), and it lists "the Site-Info **data store**" under does-NOT-own (`36:55`).
   > **The premise of that refusal expires with Spec 17.** The disclaimer points at a document
   > being deleted, so amending it is updating a decision whose referent is gone, not overruling
   > a live one. Per §1.2's own boundary rule, the Spec 36 edit ships **in the same commit** as
   > Spec 17's deletion, with a `status_history` entry recording why.
   > **Until that amendment lands, `sgs_site_info` has NO owner** — both specs currently
   > disclaim it and Spec 17 is scheduled for deletion. This is a hard blocker on deletion.
   **⚠ Finding to carry into Spec 36:** Site Info does **not** feed `sgs/responsive-logo` —
   `responsive-logo/render.php:66` reads `get_theme_mod('custom_logo')`, WP's native Customiser
   setting. So the logo comes from one source while contact/social come from another. Spec 36
   FR-36-22 should resolve that inconsistency deliberately rather than inherit it.
2. **Re-clone idempotence (Spec 17 FR-S7-4) → RETIRED.** The CPTs declare `revisions`
   (`class-sgs-block-cpts.php:102`), so an overwritten header is recoverable natively; and the
   cloning pipeline does not touch headers or footers until Spec 33 Part 2, which is built
   **after** this spec. **Revisit when Part 2 is built** — at that point a re-clone could
   overwrite an operator-edited active post, and the risk becomes real.
3. **`move-to-drawer` → RETIRED** as too complex for the value (§3.8). `labelCollapse`
   re-evaluated against the cascade rather than carried.
4. **Cross-client universality → superseded by §3.9.** Per-site storage removes the cause;
   two-client verification only guards framework-level capabilities.
5. **WP-CLI → FR-37-30**, reduced and explicitly developer/pipeline-only.

### 8.2 Still open

1. **`labelCollapse`'s fate.** §3.8 says re-evaluate. If the cascade covers every real case it
   should be deleted, not kept dormant — dormant capability with no control is the D338 trap
   this spec already documents twice (FR-37-13). Decide during the FR-37-9 audit.
2. **`sgs/site-header` version.** Both containers are `v0.1.0`. Pre-production policy says no
   version bumps; confirm they stay at `0.1.0` through this work.
3. **FR-37-20's rule-target limitation.** Rules can only target file-registered patterns, not
   CPT posts. Acceptable for v1; needs a decision before the advanced path is marketed.

---

## 9. Coverage gate — Spec 17 and the plan docs

**Binding requirement (Bean, 2026-07-21).** Before Spec 17 is deleted, a coverage matrix must
demonstrate that every requirement in the superseded corpus is either carried into this spec
or explicitly retired with a stated reason. Silent drops are the failure mode being designed
out. The corpus is **not just Spec 17** — it includes the plan docs, because the container row
model (§3) existed only in a plan and was therefore invisible to every spec-level check.

| Source | What must be covered |
|---|---|
| `17-HEADER-FOOTER-ARCHITECTURE.md` | all 39 FRs — ✅ DONE, matrix Part 2 |
| `2026-07-13-header-footer-nav-system-design-gate.md` | §3 roster, §4/§4b row model + Site Info, §6 drawer a11y, §8 responsive model, §9 never-overflow, §12 QC lanes |
| `2026-07-18-P1-architecture-decision-header-footer-nav.md` | DP1–DP6 |
| `2026-07-18-P2-builder-ux-design-gate.md` | the 29-item build roster + §2/§4/§5/§6 decisions |
| `2026-07-17-header-footer-nav-full-rebuild-strategic-plan.md` | phase scope, G1–G6 gates, risk register |
| `archive/2026-07-13-header-footer-container-design-gate.md` | FR-HF-1…6 |

Each row resolves to `CARRIED (FR-37-N)`, `MOVED (Spec 36 / 32 / 33 / 35)`, or
`RETIRED (reason)`. **Matrix output → `.claude/reports/2026-07-21-spec17-to-spec37-coverage.md`.**

**Then `/qc-council`**, checking both directions:
1. No hole or fabricated content in this spec — every claim traceable to code or a cited source.
2. No feature present in the corpus that has silently vanished.

Spec 17 is deleted, and its references repointed, **in the same commit** — only after both pass.

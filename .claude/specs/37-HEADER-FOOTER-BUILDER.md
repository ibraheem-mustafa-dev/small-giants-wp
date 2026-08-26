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
  - 2026-07-23 — §3.8 amended: `labelCollapse` is RETAINED, resolving a direct
    contradiction with Spec 36 FR-36-8/FR-36-23 (which instruct twice to reuse it).
    Bean's rule — keep an operator TOGGLE, bin an AUTOMATIC behaviour — decided it;
    code confirms it is a toggle. Spec 36 amended in the same commit per §1.2's
    both-specs-same-commit boundary rule. §8.2 open question 1 closed.
references:
  - .claude/specs/36-SGS-NAVIGATION-SYSTEM.md          # nav — the extension of this spec
  - .claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md
  - .claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md
  - .claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md
  - .claude/plans/archive/2026-07-18-P2-builder-ux-design-gate.md
  - .claude/plans/archive/2026-07-18-P1-architecture-decision-header-footer-nav.md
  - .claude/plans/archive/2026-07-13-header-footer-nav-system-design-gate.md
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

⛔ **Not a ratio STRING.** An earlier draft of this spec, and a subsequent developer
recommendation, proposed exposing `gridTemplateColumns` (`2fr 1fr`) as an "Advanced ratio
override" alongside the count. **That remains rejected:** a hand-typed CSS grid template is a
developer concept, and putting a text field of `fr` units in front of a non-coder client fails
the operator-simplicity bar (FR-37-26).

✅ **A VISUAL column-shape picker IS approved — Bean, 2026-07-28. This AMENDS the clause above;
do not read the rejection as covering it.** The rejection was of the *input control* (a typed
string), never of the *capability*. A row of small column diagrams the operator clicks is not a
developer concept — it is precisely how WordPress core's own Columns block has always presented
this, and it is the standard every builder uses. So the shape stays reachable while the raw
string stays hidden.

**Why it was re-opened (evidence, not preference):** the 2026-07-28 reference teardown of an
Awwwards-winning ecommerce footer (Cecilie Bahnsen) measured its legal strip at
`grid-template-columns: 340px 680px 340px` — a deliberate **wide-centre** shape. A count can
NEVER produce it. "Wide centre, narrow edges" and "wide brand column, narrow link columns" are
common best-in-class footer shapes, so a count-only control silently rules out a whole class of
good design. Per Bean's standing rule, a capability our controls cannot reach is a **build
opportunity, not a reason to avoid the design**.

**Binding constraints on the build:**
- The picker writes the **EXISTING** `gridTemplateColumns` attribute (object, per-device) —
  **no new stored shape**, so the converter round-trips unchanged (the FR-37-28 preset rule).
- **The count remains the default control.** The shape picker is the second, optional step —
  a client who just wants "4 columns" never meets it.
- Per-device, like the count, and it **still stacks to 1 column on mobile automatically** —
  an asymmetric desktop shape must never survive to a phone.
- The active shape is **DERIVED** from the stored value, never separately stored, so a
  hand-edited value shows no active shape rather than lying (the FR-37-28 rule).
- Shapes are expressed in `fr`, not px, so they stay fluid (the reference's `340px 680px 340px`
  is ≈ `1fr 2fr 1fr`).

**Status:** `PARTIAL — built 2026-08-26 (`2e46fc3f2`), wired to `sgs/site-footer-row` only;
`sgs/site-header-row` + `sgs/container` still to roll out. NOT yet deployed or eye-verified.`
Recorded here rather than
left in a plan file, because a rejection standing unamended in a governing spec is exactly the
D358 failure: the next session reads "ratio rejected, do not re-litigate" and never builds it.

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
- **⛔ `templateLock: 'all'` ALSO re-applies the template — the template must be passed ONLY when
  the container is empty (D393, 2026-07-27).** The bullet above solved the reorder lock and
  introduced a worse defect, because `'all'` does two jobs, not one. Verified against WP 7.0.2
  source (`wp-includes/js/dist/block-editor.js`, `useInnerBlockTemplateSync`):
  `shouldApplyTemplate = currentInnerBlocks.length === 0 || templateLock === 'all' ||
  templateLock === 'contentOnly'` — so a locked block re-applies its template even when it
  already has children, and `synchronizeBlocksWithTemplate` (`wp-includes/js/dist/blocks.js`)
  then matches rows by **array position + block name only** (`blocks[index]`); `rowSlot` is
  never consulted. Measured on the canary: **7/8 header and 8/8 footer starters were corrupted**
  at insert, and it DESTROYED content (header-search-bar-below lost its search bar;
  footer-centred lost its copyright line). Fix: `template: isEmpty ? TEMPLATE : undefined`,
  latched on first render — `templateLock` stays `'all'`, and withholding the template is a
  true no-op in core (`synchronizeBlocksWithTemplate` opens `if (!template) return blocks;`).
  Re-application after seeding is separately gated by core's `hasTemplateChanged` ref, verified
  empirically (children added to the template's *empty* rows survive later edits + re-renders).
- **No `rowSlot` enum or uniqueness guard is added.** D393's template-sync fix
  (`template: isEmpty ? TEMPLATE : undefined`, latched on first render) means the sync no
  longer rewrites a populated container, so a duplicate `rowSlot` cannot occur — NOT because
  the locked UI prevents insertion (that premise was falsified: pre-fix corruption produced
  two rows both carrying `rowSlot: 'middle'`). A schema-level validator here would be a
  second guard overlapping a working one — forbidden by
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
- **Scope boundary (D400, Bean re-confirmed 2026-07-28):** this down-cascade governs
  header/footer CONTENT curation ONLY. General block visibility
  (`sgsHideOnMobile/Tablet/Desktop`, the universal extension) is EXCLUDED from inheritance and
  keeps three independent per-device switches — a device-specific block is hidden on desktop
  precisely because it exists for mobile/tablet, so a cascading desktop-hide would defeat the
  setting. The shared `resolveTier()` cascade contract itself was APPROVED at D400
  (`plans/archive/2026-07-28-resolveTier-cascade-design-gate.md`) — FR-37-14 consumes it as specified.

**Retired in favour of this (Bean, 2026-07-21):** the `move-to-drawer` mechanism (FR-S9-8) —
relocating a header element into the drawer at small widths — is **dropped as too complex**
for the value it returns.

**`labelCollapse` is RETAINED — amended 2026-07-23, superseding this section's earlier
"not carried forward as-is" wording.** That wording put this spec in direct conflict with
Spec 36, which instructs twice (FR-36-8, FR-36-23) to *"reuse the BUILT `labelCollapse`"*.
Two governing specs giving opposite instructions about one shipped mechanism is the D358
failure — a stale spec misdirects the build with full authority — so it is resolved here
rather than left for a future session to discover mid-dispatch.

**Bean's rule (2026-07-23):** *keep it if it is a setting the operator can toggle on and off
in the block settings; bin it if it is automatic.* **Verified from code: it is a toggle.**
Both consumers declare `labelCollapse` as a `block.json` attribute driven by a real inspector
`SelectControl` — `button/edit.js:347` and `business-info/edit.js:88`, each with `value` +
`onChange`, defaulting to `'none'` (off). It is therefore operator-controlled, opt-in, and
inert unless deliberately switched on. **It stays.**

**Why this is not simply Spec 36 winning the argument.** The per-device cascade this section
proposed deferring to is owned by **Spec 35** (see FR-37-24, MOVED) and is **NOT BUILT**.
Deleting a working, operator-facing control in favour of a replacement that does not yet
exist would strand the capability — and "dormant capability with no control" is precisely
the D338 trap §8.2 raised. The two are also not equivalent: the cascade HIDES an element at
a tier, whereas `labelCollapse` keeps the element and its link target while collapsing its
label to icon-only. Hiding is not collapsing.

The cascade mechanism (`resolveTier()` + `ResponsiveTriStateControl` + scoped emission)
is BUILT and live-proven (`b9c5f6d1`/`ac0c30eb`/`eb255f06`); the header-CONTENT-hiding
FEATURE that would consume it to hide `labelCollapse`-equivalent elements per device is owned
by this spec (§3.8) and is NOT built. The two stay non-interchangeable regardless: the cascade
HIDES an element at a tier, `labelCollapse` KEEPS the element and its link while collapsing
its label to icon-only.

**Revisit condition (not left open-ended):** if and when Spec 35 ships the cascade, re-test
whether `labelCollapse` still earns its place. Until then it is a live, supported control.

*(D363's revisit condition is now ACTIONABLE, not merely stated: the cascade mechanism it
names shipped 2026-07-28 — `b9c5f6d1`/`ac0c30eb`/`eb255f06`, D400/D405. The re-test is due
whenever the §3.8 header-content-hiding feature above ships, not deferred indefinitely.)*

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

1. **✅ DONE — orphan client pattern DELETED.** `theme/sgs-theme/patterns/footer-indus-foods.php` (leaked
   "Indus Foods Footer" + a hardcoded Google Place CID) was confirmed referenced by nothing in the repo
   AND by no live template part on EITHER site (read-only `SELECT ... LIKE '%indus-foods-footer%'` = 0
   rows on sandybrown and palestine-lives), then deleted (`94ab240f`). Per-site footers live in the CPT.
2. **✅ DONE — the 7 `parts/mega-menu-*.html` files (and their 7 patterns + `theme.json` entries) are
   DELETED** as part of FR-37-21 (`23a3cf63`), so the Indus data they carried is gone from the framework.
3. **Per-site CPTs:** the FR-37-6 "both sites render from CPTs" done-condition needs each live site's
   header/footer authored as a CPT post and set active. The canary CPT header binding is already
   canary-verified (FR-37-3); authoring the canary footer + the Indus pair is the remaining live work,
   and it also unblocks the Spec 36 FR-36-18 Indus cutover (a plain theme deploy would otherwise push
   the framework-default header onto Indus).

### 3.6 Never-overflow contract

Carried from 07-13 §9, unchanged — it is implementation-ready and independent of editing home:

- **Header cluster rows NEVER wrap or stack (D455, 2026-08-01).** `flex-wrap: nowrap` +
  `min-width: 0` on children. The row yields by SHRINKING — gap first, then every child
  proportionally (flexbox's own algorithm; no JS), each stopping at its own floor: interactive
  controls at 44px, the logo at `min(100%, var(--sgs-header-logo-min, 7.5rem))`.
  `flex-shrink: 0` on the logo is REMOVED and must not return — unshrinkable at 240px it overflows
  a 320px viewport once wrapping is gone (WCAG 1.4.10).
- **Footer column rows collapse INTRINSICALLY, not at a breakpoint (D456, 2026-08-01).** The
  operator's per-device count is a CEILING, declared via `supports.sgs.intrinsicColumns` and emitted
  as `repeat(auto-fit, minmax(min(100%, max(var(--sgs-col-basis,16rem), calc((100% − (N−1)·gap)/N))), 1fr))`.
  The `(N−1)·gap` term is not optional — omit it and one extra column squeezes in. The count control
  is labelled **"Maximum columns"** accordingly.
- **Both CSS-length paths share one validator (D462, 2026-08-02).**
  `sgs_responsive_sanitise_css_value()` (`includes/helpers-responsive.php`) — which validates
  `gap`, `gridTemplateColumns`, `contentWidth`, `maxWidth`, `padding` and `margin` for BOTH row
  blocks plus `nav-menu`, `nav-drawer`, `mega-panel`, `mega-aside` and the shared wrapper — now
  delegates to `sgs_css_length_value()`. It previously permitted `/` and `*`, so it never blocked
  the `/*` comment opener, and it STRIPPED rather than failing closed. It was the more exposed of
  the two paths, and it is the one that actually validates this row's fluid gap.
  ⚠ `repeat` had to be restored to the validator's allowlist first: it had been dropped when the
  validator was scoped to scalar gaps, so routing naively would have rejected every
  `grid-template-columns` value in the framework — including FR-37-11's live intrinsic-columns
  value. The RAW-INPUT breakout check, not the function-name list, is what provides the security.
- `clamp()` for fluid type/space rather than breakpoint steps where possible. **Shipped (Task 2,
  2026-08-01):** `sgs_container_gap_value()` now delegates to the shared `sgs_css_length_value()`
  validator (`helpers-css-safety.php`), which parses `var()`/`calc()`/`min()`/`max()`/`minmax()`/
  `clamp()` with WordPress core's own recursive balanced-paren grammar instead of the old
  allowlist that stripped parentheses/commas. The header row's `gap` default is now
  `clamp(0.5rem, 0.25rem + 1.5cqi, 1rem)` (`src/blocks/site-header-row/block.json`) — `cqi` is
  safe there because the row sets `container-type: inline-size` on itself and the wrapper emits
  `gap` onto `.sgs-container__inner`, whose ancestor container IS the row; do not copy `cqi` to a
  block without a guaranteed container ancestor (silent fallback to viewport units is the failure
  mode). Backward compatibility proven byte-identical against the old allowlist via
  `scripts/diff-gap-sanitiser.php`.
- Container queries for row-level reflow (a row can collapse while the viewport is wider —
  see STOP-CONTAINER-TIER-IS-NOT-VIEWPORT). **The requirement stands; only the collapse BEHAVIOUR
  changed at D455/D456.** `container-type: inline-size` stays on both rows.
- **Gate:** `scrollWidth <= innerWidth` **swept 1400 → 320px in ≤10px steps**, not sampled at
  375/768/1440. The D420 defect lived BETWEEN those tiers — it was clean at 770px and broken at
  766px, so a three-tier check passed a broken row. Harness: `scripts/row-fit-sweep.mjs`
  (its `--self-test` proves it fails on the known-broken fixture).

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

#### FR-37-43 — The "Menu drawer" CPT (`sgs_drawer`) — added 2026-07-29 (architecture gate, signed; Spec 36 amended in the same commit per §1.2)

The off-canvas drawer joins the CPT family this spec owns. **Admin name: "Menu drawer"** (Bean;
"Menu Panels" rejected as vague and mega-adjacent). Registration mirrors `sgs_header`/`sgs_footer`
exactly — same class, same admin submenu shape, same "Set as active" row action (FR-37-2), same
preview-before-active (FR-37-41), revisions for free. A drawer post's content is the existing
`sgs/nav-drawer` block markup unchanged; the block becomes the render vehicle. **Scope model:
site-wide Active default + per-burger override** via `sgs/nav-menu`'s re-typed `drawerRef` post
picker (behaviour side: Spec 36 FR-36-9a). The drawer renders once per page from the
active/referenced post — the duplicate-id class dies by construction.
**Starters:** the 7 retired `variantPreset` looks become "Menu drawer" starter patterns served by
the FR-37-7 native picker (≥2 patterns, no template seed — the D393 lesson applies: verify a
chosen starter by its CHILDREN, not its `metadata.patternName`).
**Migration (hard cut, no deprecations — D270/D293):** the 8 header starter patterns drop their
embedded drawer; a seed step creates one default "Menu drawer" post per site; FR-36-9a's one-click
fix changes from "insert sibling block" to "create a Menu drawer + set the reference".
**Status:** `NOT-BUILT` — capability wave of the merged 36/37 track
(`plans/archive/2026-07-29-spec36-37-merged-architecture-and-drawer-cpt-gate.md`).
**Done when:** a drawer authored in *SGS → Menu drawers* renders as the site default, a second
drawer can be picked per-burger, the starter picker offers the 7 looks and a chosen starter's
CHILD TREE survives save, and zero `variantPreset` attrs remain in shipped markup.

**Status update 2026-07-30 (W2-a): `PARTIAL — the ADDITIVE half is BUILT`.** D419. The CPT, its
Active pointer and its render path ship; nothing is removed, re-typed or migrated yet, so the
"Done when" above is deliberately NOT yet met. What is live:

- **Registration** — `Sgs_Block_CPTs::DRAWER_CPT` (`sgs_drawer`), registered from the same
  `$shared` args array as the two siblings, admin labels "Menu drawers"/"Menu drawer" per Bean's
  signed wording, `SGS → Menu drawers` submenu, REST gated through `Sgs_Cpt_Rest_Gate` via the
  constant. **No `template` arg** — deliberate, so the FR-37-7 native starter picker fires.
- **Active model** — `OPTION_DRAWER` / `AREA_DRAWER` added to `Sgs_Active_Layout`. Because the
  admin, the validation, preview-before-active (FR-37-41) and the whole
  `Sgs_Header_Footer_Cli_Commands` tree are area-parameterised, `wp sgs drawer
  set-active|clear-active|list|seed-starter` and every list-table affordance came with **zero new
  logic** — the single change was one row in `Sgs_Active_Layout_Admin::areas()`.
- **Render path — the one genuinely new mechanism.** A drawer owns no `core/template-part` slot
  (it is a `<dialog>` sibling of `sgs/site-header` in all 8 header patterns), so there is no
  `pre_render_block` hook to mirror. `Sgs_Drawer_Render` renders it on **`wp_footer` priority 5**,
  lazily: `sgs/nav-menu` records "a burger asked for a drawer" into a request registry, and only
  then does the Active post render. Ordering is **proven, not assumed** — the CSS registry's
  whole-page output buffer opens at `template_redirect` 0 and closes after all of `wp_footer`, so
  the drawer's scoped CSS still reaches the `<head>`.
- **The landmark guard, and the input it never had.** `nav-drawer/render.php` now calls
  `Sgs_Active_Layout::mark_served( AREA_DRAWER )` on the ordinary block path, precedent
  `class-sgs-header-rules.php:253-258`. Before this it held **zero** references to
  `Sgs_Active_Layout`, so the planned one-per-request guard read `false` on a page that had
  already painted a drawer — and since `nav-menu`'s and `nav-drawer`'s `drawerRef` defaults are
  the same string, two `<dialog id="sgs-nav-drawer">` elements would have shipped. Guard and mark
  are load-bearing only together and landed in one commit.
- **Editor surface.** `wp_footer` never fires in the block editor, so a page being edited shows no
  drawer in canvas. **Declared, not worked around** (Bean, 2026-07-30) — and the FR-36-9a burger
  notice was taught about the Active drawer, because once the panel is site-wide, "no drawer block
  in this post" is the CORRECT state and that warning would otherwise call every working burger
  broken. Matched on the Active drawer's own `drawerRef`, not on its mere existence: a burger opens
  by element id, so an Active drawer with a different ref genuinely opens nothing.
- **Starters (minimum).** `sgs-drawers` category + `sgs/drawer-scratch` ("Start from scratch") and
  `sgs/framework-drawer-default`, the latter byte-identical to the drawer embedded at
  `framework-header-default.php:42-45` so it can serve as the Gate 2 parity subject. The 7 real
  looks are W2-c.

**Explicitly still open, each mapped to a named stage** (never "out of scope"): `drawerRef` re-typed
to a post picker = **W2-b**; the 7 starter looks = **W2-c**; the 8 header patterns dropping their
embedded drawer + the per-site seed = **W2-d**; `variantPreset` retirement = **W2-d**. Until W2-d,
both paths coexist by design and the landmark guard is what keeps that safe.

**Non-destructive property (the reason this half could ship alone):** with no Active drawer pointer
set, `get_active_content()` returns `''` and `Sgs_Drawer_Render` emits nothing, so page output is
unchanged and all 8 pattern-embedded drawers keep working. `wp sgs drawer clear-active` reverts the
entire binding.

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

> **Header behaviours are resolved by `Sgs_Header_Behaviours`**, which hooks `body_class`
> (`class-sgs-header-behaviours.php:81`) and calls `resolve_active_header_behaviour()` (`:143`),
> which reads the header's block markup via `SGS_Nav_Menu_Source::get_header_content()` (`:173`).
> That function reads the `wp_template_part` post (`class-sgs-nav-menu-source.php:397-399`),
> falling back to `parts/header.html` (`:410-412`) — it knows nothing about the CPT. So the
> moment FR-37-6 empties `parts/header.html`, `get_header_content()` finds no `sgs/site-header`
> block, every behaviour flag resolves false, no body classes are emitted, and sticky /
> transparent / shrink stop working with no error (the D338 silent-failure class this spec
> exists to prevent). Note: `apply_filters('sgs_header_rule_resolved', …)` has zero
> subscribers — do not route new logic through it.

**Required:** `SGS_Nav_Menu_Source::get_header_content()` gains an **active-CPT branch as its
FIRST source**, ahead of the `wp_template_part` post and the file (CPT → template part → file).
Carry forward the resolver's existing `transparent + contrastSafe='none' → 'scrim'` WCAG upgrade
(`class-sgs-header-behaviours.php:218-228`) — a tri-state reshape (FR-37-14) plus scoped CSS
(FR-37-15) drops it silently otherwise. **⚠ Superseded 2026-08-19 by FR-37-44:** "carry forward"
here meant "don't let the FR-37-6 CPT-first change accidentally drop this mechanism" — it was not
a ruling that the SILENT rewrite itself is correct behaviour. D679 found the silent rewrite is a
policy breach; FR-37-44 requires it become a visible, declinable notice instead. Carry the
mechanism's WCAG intent forward; do not carry its silence forward.
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
**Status:** `✅ BUILT + CANARY-VERIFIED 2026-07-22 (D360)` (commit `0da5ef6a`,
`class-sgs-active-layout-admin.php` — `manage_{cpt}_posts_columns` + `display_post_states`). Verified live:
the Advanced Headers/Footers list tables showed the proof posts as NOT active before the admin action and
Active after it — which is also what exposed the CLI-vs-web option-store mismatch (see FR-37-1). A row
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
**MECHANISM (design-gated + Bean-signed-off 2026-07-24): use WordPress's NATIVE "Choose a
pattern" starter modal — no bespoke admin UI (matches FR-36-3's "reuse the platform, zero
bespoke admin screens" rationale).** The native modal fires on a new post of a CPT when ≥2
patterns declare `Block Types: core/post-content` **+** `Post Types: <cpt-slug>`, and it renders
live previews (preview-before-apply is native) with a blank/dismiss path. Delivery = three
changes, no React component: (1) re-scope the 12 existing header/footer starter patterns from
`Block Types: core/template-part/*` → `core/post-content` + add `Post Types: sgs_header|sgs_footer`;
(2) DROP the registration-level `template` seed on the header/footer CPTs (`class-sgs-block-cpts.php`
— the seed pre-fills content so the empty-post modal never fires) — "Start from scratch" becomes a
**minimal starter card** (the bare `sgs/site-header`/`sgs/site-footer` shell) rather than WP's blank
dismiss; (3) author ≥2 `sgs_mega_menu` starters (none exist post-D362) scoped `core/post-content` +
`Post Types: sgs_mega_menu`. **Verified by a spike FIRST** (flip 2 header patterns + drop the seed on
the canary, confirm the modal appears with previews) before the full re-scope. Fall back to FR-37-36
(custom React picker) ONLY if the spike shows the native modal can't meet the done-condition.
**Status:** `BUILT + LIVE-VERIFIED for sgs_header + sgs_footer (D377, 2026-07-24). Mega deferred to the
mega spine (Spec 36 Phase 2 / Task 3) — needs its own starter authoring.` Spike proved the mechanism
(62ee4acb), then the full build (98e32cd0): 14 header/footer patterns re-scoped to
`Block Types: core/post-content` + `Post Types: sgs_header|sgs_footer` (12 via /delegate→Haiku, verified);
NEW `header-scratch.php`/`footer-scratch.php` = the bare 3-row shell "Start from scratch" cards (replacing
the dropped registration `template` seeds); the `sgs_header`+`sgs_footer` CPT `template` seeds removed
(`class-sgs-block-cpts.php`) so the empty-post modal fires; theme version 1.5.41→1.5.43 (WP caches the
pattern list against the theme version — the root cause of the spike's initial no-show, now documented).
**Live-verified on the sandybrown canary (real Chrome):** new `sgs_header` AND `sgs_footer` each open the
native "Choose a pattern" modal with 8 preview cards (7 starters + scratch), empty canvas; choosing
"Footer — Centred" wrote its `sgs/site-footer` tree to the SAVED `post_content` (DB-read, post 1726,
`metadata.patternName: sgs/footer-centred`); the scratch card produced the bare `sgs/site-header` 3-row
shell. **Mega still shows no modal** until ≥2 `sgs_mega_menu` starters exist (authoring = Task 3).
**Done when:** creating a post of each of the three types shows the native pattern modal, and
choosing a style produces that style's block tree (verified by reading the saved `post_content`, not
editor state). ✅ met for header + footer; mega pending its starters.

#### FR-37-8 — Starter library is git-versioned patterns
Starters are block patterns under `theme/sgs-theme/patterns/`, not synced `wp_block` posts, so
they are versioned, reviewable and shippable. Starter patterns declare
`templateLock: "contentOnly"` where structural edits would break the design.
**Status:** `DONE for header/footer (D377, 2026-07-24).` 14 starter patterns + 2 scratch shells are files
under `theme/sgs-theme/patterns/`, scoped `core/post-content` + `Post Types`, surfaced by the FR-37-7
native modal; applying one writes its tree to `post_content` (live-verified). No starter depends on DB
state. Mega starters NOT-BUILT (Task 3).
**Done when:** each starter is a file in the repo; applying one produces its tree; no starter
depends on database state. ✅ met for header/footer.

#### FR-37-36 — Custom React starter picker (EXTENSION — non-blocking, own completion rate)
An optional bespoke React picker modal that supersedes the native "Choose a pattern" modal (FR-37-7)
with full UX control: a branded card grid, a persistent explicit "Start from scratch" card (vs the
native blank/dismiss), CPT-appropriate labels (the native modal leans "page"-flavoured), richer
preview styling, and any curation the native modal can't express. **This is an ENHANCEMENT, not a
blocker** (Bean-directed 2026-07-24): FR-37-7's native mechanism fully satisfies the picker
done-condition on its own, so FR-37-36 does NOT gate FR-37-8 / FR-37-31 / FR-37-28 and carries its own
completion tracking. Build it only after the native picker ships and only if the native modal's UX is
judged insufficient in practice. **Status:** `NOT-BUILT — deferred extension.` **Done when:** creating
a post of each of the 3 CPT types shows the custom picker (card grid + preview + explicit scratch card),
choosing a card writes that starter's block tree to `post_content`, and the native modal is suppressed
for those CPTs.

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

> **D679 audit finding (2026-08-19) — 6 dead attributes DELETED from `sgs/site-header`.**
> `alignContent`/`alignItems`/`columns`/`flexDirection`/`flexWrap`/`justifyContent` were declared
> on `sgs/site-header` but could never render: they were copy-pasted from
> `sgs/site-header-row`'s `block.json` without also copying the `layout` attribute the emit gate
> requires to act on them. `check-dead-controls.js` could not catch this because it detects the
> INVERSE class of defect (a control whose attribute renders nothing) — these six had no control
> at all, so there was nothing for that lint to flag. All 6 are now removed from
> `sgs/site-header`'s `block.json`.
> The identical six attributes on `sgs/site-header-row` are UNTOUCHED and remain LIVE — that block
> genuinely declares `layout` (enum `flex|grid`, default `flex`), so the emit gate's requirement
> is satisfied and the row's controls render correctly.

#### FR-37-10 — `sgs/site-footer` + `sgs/site-footer-row` conform to §3
As FR-37-9, against §3.2, §3.3, §3.4, §3.6.
**Status:** `AUDIT DONE 2026-07-22.` Same audit as FR-37-9; footer rows PASS the same clauses
and share the same three carried gaps (one fix per gap covers both rows). The footer count
wiring (FR-37-11) was confirmed live in the audit, not just declared.
**Done when:** as FR-37-9. ✅ met.

##### §3-audit-carried — three §3 gaps carried as follow-ups (2026-07-22, not silently dropped)

Each is real feature work, none is a cheap lint fix, and each applies to BOTH row blocks (one
mechanism covers both). Recorded here so a future session picks them up rather than rediscovering:

- **FR-37-33 — row layout control + per-row independent columns.** `✅ BUILT + LIVE-VERIFIED
  2026-07-23` (commits `89e31fbc` gate fix + `8dd873bd` controls). A "Row layout: Cluster / Columns"
  `SelectControl` on BOTH row types drives the existing `layout` attr (`flex`↔`grid`) — no new
  `layoutMode` attr was needed (the shape-freeze-safe choice: reuse `layout`, which the wrapper
  already reads). When Columns, the per-device count control (`ResponsiveControl` 1-6) shows; when
  Cluster, Distribution shows. **`site-header-row` gained `columns`/`columnsTablet`/`columnsMobile`
  attrs** (it had none — footer-row already had them), so header rows can now be columns too.
  Rendering is unchanged and universal — both rows delegate to `SGS_Container_Wrapper`, which renders
  the grid + per-tier count. **Bean-directed extension:** every row (all three header AND all three
  footer) sets its own count + settings INDEPENDENTLY — each is its own block instance, so nothing
  bleeds between rows. This is the Astra footer-builder model (a bottom strip can be a 3-column row:
  copyright | social | attribution, stacking on mobile). **Live proof (canary, active footer):** the
  three footer rows set to top=2 / columns=4 / bottom=3 at desktop, all stacking to 1 column on mobile
  with no horizontal scroll; header controls + attr writes verified in the editor.
  > ⚠ **Depended on FR-37-11's gate fix landing first.** The per-tier count only emits because
  > `89e31fbc` widened `$has_responsive_attr` to include tier counts — without it a row set to Columns
  > rendered its desktop count but did not stack. See FR-37-11.
- **FR-37-34 — the row inserter promotes the common elements (§3.5).** `✅ BUILT + LIVE-VERIFIED
  2026-07-24` (commit `97572450`). A shared `RowQuickInsertAppender` component (both row blocks)
  renders an "Add a header element" placeholder in any EMPTY row, promoting logo / navigation /
  search / cart / account link / CTA / contact — plus `prioritizedInserterBlocks`. Freeform is
  preserved (no `allowedBlocks`); the placeholder itself says *"or use the block inserter (+) for
  anything else"*. **Live proof (sandybrown canary, chrome-devtools, real editor):** a raw
  `sgs/site-header` seeded 3 rows — both empty rows (top + bottom) rendered the full 7-button
  palette; the middle row (logo + nav + cart) correctly showed NO palette. All 7 promoted slugs
  verified to exist so `createBlock` cannot throw. Footer row shares the same mechanism with
  footer-appropriate elements.
- **FR-37-35 — container-query row reflow.** `BUILT`, then its BEHAVIOUR replaced at D455/D456
  (2026-08-01). `container-type: inline-size` is live on both rows and the requirement — a row
  reflows on its OWN width, never the viewport's (STOP-CONTAINER-TIER-IS-NOT-VIEWPORT) — is
  unchanged and still honoured. What was replaced is the chosen reflow behaviour: an
  `@container (max-width:767px){flex-basis:100%}` rule that collapsed every child to a full-width
  line. It was an AUTHORED stack, not a response to running out of room — measured at 766px, the
  children needed 733px and had 766px. The header now never stacks (D455); the footer's columns
  collapse intrinsically (D456). **Do not reintroduce that rule under this FR's name.**

`clamp()` for fluid type/space (§3.6) — SHIPPED 2026-08-01 (Task 2). The D455-era blocker
(`sgs_container_gap_value()` stripping parentheses/commas) is resolved: the function now delegates
to the shared `sgs_css_length_value()` validator, and the header row's `gap` default carries the
fluid curve `clamp(0.5rem, 0.25rem + 1.5cqi, 1rem)`. See §3.6 for the full mechanism + the `cqi`
container-ancestor caveat.

#### FR-37-11 — Footer columns: an operator-set count that stacks automatically

> ⚠ **MECHANISM SUPERSEDED 2026-08-01 by D456 (§3.6).** This FR's control surface survives — a
> per-device number, no CSS, no ratio string — but its *guarantee* changed. The count is now a
> **CEILING**, not an exact count: fewer columns render when content stops fitting, at any width.
> The inspector label is **"Maximum columns"** accordingly.
>
> **This is a genuine reversal of this FR's recorded research conclusion, not a plumbing change,
> and is recorded as such rather than smoothed over.** The status row below states *"every major
> builder uses a per-device COUNT, **not intrinsic auto-fit**"* — and D456 implements exactly that
> rejected technique, in bounded form. The reversal was justified by measurement, not preference:
> the shipped exact-count mechanism collapsed all three live footer rows from 3 tracks to 1 between
> viewport 768px and 767px while their content needed just 496px of the 767px available, and being
> `@media`-driven it was structurally incapable of ever responding to content. Bean ruled that
> footer stacking must be organic. Read D456 before re-litigating.

The `columns` row exposes a **column count** as a number (§3.3). Desktop is the only tier an
operator must set; the row reduces to fewer columns — down to 1 — automatically as space runs
out, like all other SGS content. A per-device override is available but never required. The count
drives the shared container grid engine — no new engine (R-31-9 reuse).

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
**up to** that many columns and reduces automatically as space runs out, down to 1, with no
further configuration; and the values set by `site-footer/edit.js` are no longer discarded —
verified by reading the saved post content, not the editor state. *(Live canary render
VERIFIED 2026-08-01, D456: 3 columns at 1023–900px, a content-driven drop to 2 at 860px, 1 at
767px, zero horizontal overflow across 109 swept widths —
`reports/visual-diff/site-footer-row-2026-08-01.md`.)*

#### FR-37-12 — Never-overflow contract
§3.6 holds on every shipped header and footer.
**Status:** `PARTIAL` — a `min-width:0` wrapper backstop shipped but was never
live-emission-proven (LEDGER, Spec 35 track).
**Done when:** `scrollWidth <= innerWidth` **swept 1400px → 320px in ≤10px steps** (`plugins/sgs-blocks/scripts/row-fit-sweep.mjs`) on both dev sites, measured on
the live page, not asserted.

### Behaviours

#### FR-37-13 — The behaviour set
Four independent header behaviours: **sticky**, **transparent**, **shrink**,
**hide-on-scroll**. Any combination may be active.
**Status:** `✅ SHIPPED + LIVE-VERIFIED (D376, 2026-07-24) — fix B landed; all scroll behaviours function.`
The D375 dead-selector bug is FIXED: `sgs/site-header` now renders a semantic `<header>` and the JS
(`view.js` `getHeaderEl`) + all 21 `header-behaviours.css` selectors target `header.sgs-site-header`.
Live on the canary (CPT 1655): scroll-down hides the header (`translateY(-119px)`), scroll-up returns;
one banner landmark; F1 height-publisher revived; axe zero NEW hit. Plus the Option B one-header-per-request
guard + editor `<header>` parity. Drawer-while-scrolled (D323) structurally safe (top-layer `<dialog>`),
not observable on fixture 1655 (no drawer block).

hide-on-scroll is wired end to end: an Advanced ToolsPanel control in `site-header/edit.js` +
`class-sgs-header-behaviours.php:205,264` emits the `sgs-header-behaviour-hide-on-scroll-down`
body class. `headerHideOnScroll` is an OBJECT tri-state (`{desktop,tablet,mobile}`) per
FR-37-14 — do not cite `site-header/block.json:76` as a boolean shape, that citation is stale.
sticky/transparent/shrink are likewise wired.

**Guard rail:** the header must render a real `<header>` element; without it there are zero
header landmarks and all three scroll behaviours (transparent, shrink, hide-on-scroll) die
silently (live-proven 2026-07-23, fixed D375) — a regression that could recur if someone
changes the wrapper tag.

**APPROVED FIX (Bean, 2026-07-23): Option B — render the SGS site header AS a semantic `<header>`
element** with a stable class both the JS `getHeaderEl()` and the CSS state rules target. This revives
all three scroll behaviours AND adds the missing banner/`<header>` landmark (a WCAG win — the site
currently has zero `<header>` landmarks). **Higher blast radius (changes the header root element) →
design-gate FIRST (`/frontend-design` + `/brainstorming` → Bean sign-off), THEN build.**
(Rejected alternatives: A = just broaden the JS+CSS selector to `.wp-block-sgs-site-header`
— quick but leaves the header a non-semantic `<div>`; C = park.)
**Done when:** the SGS header is a semantic `<header>`; all four behaviours are settable from the
inspector AND observable on the frontend (hide/return on scroll, verified with the drawer opened while
scrolled — the D323 transformed-ancestor interaction, still unobserved).

#### FR-37-14 — Behaviour attributes are tri-state
Each behaviour is a **tri-state** (`inherit` / `on` / `off`) per device tier, not a flat
boolean — a boolean cannot express "inherit from desktop" versus "explicitly off here"
(P1 DP1). Applies to `headerSticky`, `headerTransparent`, `headerShrink`, `contrastSafe`, plus
the new hide-on-scroll attribute.
**Clean reshape, no migration, no fallback.** Both sites are pre-live, so there is no
production data to protect; per D270/D293 no deprecations and no read-time legacy fallback are
added (which would violate R-31-14 anyway). Existing dev instances are re-inserted or
recovered in the editor.
**Status:** `BUILT` (`e4bd72ef` + `eb255f06`, 2026-07-28, T1.4). `headerSticky`/`headerTransparent`/
`headerShrink`/`headerHideOnScroll` reshaped from `boolean`/`string` to tri-state objects
(clean reshape, no migration/fallback per D270/D293/R-31-14; default `{}` resolves to the prior
DEFAULT_OFF, so at-rest render is unchanged). `ResponsiveTriStateControl` in `edit.js` (simple
toggle + "Customise per device" reveal). Server-side: per-tier resolution emitted as `#uid`-scoped
per-tier `@media` via `sgs_emit_tier_rules()`, with a single-writer merge pass
(`sgs_merge_tri_state_declarations()`, added in `eb255f06` after a QC round found a same-selector
`!important` collision between behaviours) so off-at-every-tier behaviours emit nothing and a
narrow tier can genuinely cancel a wide one. `site-header-row`/`site-footer-row` migrated onto the
same canonical `sgs_resolve_on_tiers()` resolver (semantics verified identical);
`sgs_resolve_tier_booleans()` **DELETED** (0 consumers). 6 theme pattern seeds updated
`boolean → {"desktop":"on"}` (D328). Both dev sites live-verified at 3 viewports incl.
explicit-off + coexistence cases.
**Was previously BLOCKED on Spec 35 Part D4** (the shared `resolveTier()` cascade) — that
blocker is CLEARED: Spec 35 T1.1 shipped the canonical `resolveTier()`/`sgs_resolve_tier()` in
both runtimes (`b9c5f6d1`, 16/16 golden fixture both runtimes) ahead of this FR, per the "reuse
the one cascade" rule — no second inheritance mechanism was built here.
**Done when:** the four attrs plus hide-on-scroll are tri-state objects; an audit of both dev
sites shows no instance left carrying the old flat shape. — **MET** for the four behaviour attrs;
hide-on-scroll is covered by `headerHideOnScroll` in the same reshape.

#### FR-37-15 — Behaviours emit scoped CSS, not body classes
Behaviour styling is emitted as scoped `#uid` rules (including `@media` tiers), per Spec 32.
The body-class mechanism is retired or reduced to a JS-state signal only.
**Status:** `PARTIAL` (was `NOT-BUILT`; upgraded by the FR-37-14 build, `e4bd72ef`+`eb255f06`,
2026-07-28). `headerSticky`/`headerTransparent`/`headerShrink`/`headerHideOnScroll` now emit
`#uid`-scoped per-tier `@media` CSS via `sgs_emit_tier_rules()` — the body-class mechanism for
these four is retired (`class-sgs-header-behaviours.php` docblock, line 3: "Sticky / transparent /
shrink / hide-on-scroll are RESOLVED AND EMITTED ELSEWHERE… per-instance scoped CSS"; scroll-state
classes in `view.js` stay tier-agnostic JS-state signals only, per the FR-37-15 intent). `contrastSafe`
was **explicitly untouched by T1.4** (kept as an enum shape, D402 gate) and drove real styling via
body classes. **⚠ AMENDED 2026-08-19 — D402's carve-out is SUPERSEDED and this paragraph's former
claim is no longer true.** `contrastSafe` has joined the other four: it is a per-device object
attribute emitted as `#uid`-scoped per-tier CSS by `sgs/site-header/render.php`, and the three
`body.sgs-header-behaviour-contrast-*` rules are deleted from `header-behaviours.css`.

Two things forced it, and both are worth keeping on the record because D402 assumed neither:
1. **Structural.** FR-37-44 requires it be per-device. A class on `<body>` is site-wide and cannot
   express "scrim over the desktop hero, nothing on a phone" — the same reason the other four
   moved at T1.4. Making it responsive and keeping the body class were mutually exclusive.
2. **Mechanism.** `contrastSafe` is a FOUR-value enum, so it could not go through
   `sgs_emit_tier_rules()`, which tests `'on' === $state` and would collapse `scrim`, `shadow` and
   `force-solid` into one off branch. A general N-value form, `sgs_emit_tier_rules_map()`, was
   added; the binary helper now delegates to it as the 1-entry case, so the tier cascade has one
   implementation, not two. `sgs_resolve_tier()` needed no change — it was already value-agnostic.

`force-solid` emits no CSS at all now. It previously used `background … !important` to out-rank the
transparent rule; per tier, that fight has no clean undo (a tier ceasing to be force-solid cannot
revert an `!important` background without reverting the block's own), so it is resolved earlier, as
a SUPPRESSOR of the transparent behaviour.

**Done when:** no header behaviour renders an inline `style=""` declaration, and the emitted
CSS is scoped to the block uid. — **MET for all five behaviours** as of 2026-08-19.

### Data model and controls

#### FR-37-16 — Responsive value shape
Every responsive property is `{ desktop: <val>, tablet: <val|null>, mobile: <val|null> }`,
cascading from desktop when a tier is null. Device tiers are 768 / 1024 per
`~/.claude/rules/visual-standards.md`.

> **Uid hashing does NOT canonicalise attribute key order** (D334, enforced in code —
> `site-header-row/render.php:49` `// STOP-NO-KSORT`): canonicalisation is a write-time oracle
> only, kept out of the hash path, because reordering keys would re-key every scoped-CSS
> selector and break the collector's cross-page dedup.
>
> **Object-typed tiered attrs live on the ROWS, not the containers:** `sgs/site-header` has
> 0 object-typed attrs and 20 flat suffixed ones (`maxWidthTablet`, `paddingTopMobile`, …);
> `sgs/site-header-row` has 5 object-typed (`gap`, `maxWidth`, `contentWidth`, `padding`,
> `margin`) and 0 flat.

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
**Status:** `NOT-BUILT` — the header/footer walker ("Spec 33 Part 2") is not started, **and is
currently ownerless — see the §6 ownership note before scheduling any of it.**
**Build order (corrected 2026-07-23):** this FR is one of only TWO items in Specs 36+37 that
genuinely wait on Part 2. Part 2 itself is built **after** Specs 36 and 37 are complete — it
consumes them. Do not treat this FR as a blocker on anything else in this spec.
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
**Status:** `PROXY-ARM RUN 2026-07-26 → FAIL (recorded)`. The automated proxy arm (Claude driving
the canary editor) has been run and recorded: `reports/fr-37-26-simplicity-test/2026-07-26-operator-simplicity-test.md`.
Result: **FAIL** — sticky ✅ and phone ✅ (one-click "Contact details" → Business Phone, click-to-call
wired to Site Info) both pass; **drawer content ❌** is not settable in the header editor (the Nav
Menu "Mobile drawer" panel exposes only a jargon "DRAWER ID" field; drawer content lives in a
separate `sgs/nav-drawer` block absent from the header CPT). Also: selecting the header block needs
List View (canvas click reports "No block selected"), and the Settings tab shows ~7 default-visible
controls vs the FR-37-27 roster's 2 (a nudge, not a defect — per the 2026-07-23 correction).
The **blind-tester arm (a real non-coder, screen-recorded) remains outstanding** and is the
authoritative half.

> **Finding 1 (drawer content) — the reachable half is now BUILT 2026-07-27; the FAIL verdict STANDS.**
> `sgs/nav-menu` gained a conditional warning notice + a one-click fix (Spec 36 **FR-36-9a clause 2**,
> amended in the same commit per §1.2's both-specs-same-commit boundary rule — the drawer is Spec 36's,
> the header CPT the notice fires inside is this spec's). It covers both the *dangling* `drawerRef` the
> clause named and the **no-drawer-at-all** case this test actually hit: *"Add the mobile menu"* inserts
> an `sgs/nav-drawer` as a root-level SIBLING of the header and selects it, so the operator lands on its
> content. Full mechanism + binding details: Spec 36 FR-36-9a. The "Mobile drawer" panel was also
> reworded out of the jargon the test flagged (*"DRAWER ID"* → *"Panel this burger opens"*, with a
> plain-English lead-in saying where drawer content is edited).
> **This does NOT convert the verdict.** The test has not been re-run, and its authoritative arm is the
> blind tester. What changed is that the raw-insert path no longer ships a burger that opens nothing.
> Findings 2 (canvas-click does not select the header) and 3 (Settings-tab ordering — a NUDGE, not a
> defect) are untouched. `P-HEADER-SIMPLICITY-FINDINGS` stays OPEN.

**Done when:** the test has been run and recorded, with the result — pass or fail — written
down. A fail is a finding, not a reason to re-run until it passes. ✅ proxy arm met; blind-tester arm pending.

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
**Status:** `GATE BUILT`. `check-simple-surface-cap.js` scans FOUR blocks —
`sgs/site-header`, `sgs/site-footer`, `sgs/site-header-row`, `sgs/site-footer-row` (the two
ROW blocks added 2026-08-19; before that, half the header surface had no computable
Simple-surface check).

**Known limitation, now recorded rather than left implicit:** the script counts a composite
component mount as **ONE row** without opening the component to see what it actually renders.
Measured wrong in both directions on `sgs/site-header-row`: `RowScrollBehaviourControls` counts as
1 row but renders THREE `isShownByDefault` toggles (undercounted by 2); `ResponsiveBoxControls`
counts as 1 row but exposes ZERO default-visible toggles (overcounted by 1). Net effect:
`site-header-row`'s reported figure of 6 default-visible controls is really about 7 — the two
errors partially cancel but do not exactly cancel, so the reported number is not exact. **Every
figure this script produces for a composite-mounting block is an approximation, not a census** —
per the project's standing rule against quoting a soft number as a measurement, this must be
stated wherever the script's output is cited, not just here.
**Done when:** both containers show exactly the Simple controls in the table above by default;
the lint REPORTS a fourth as over the default — advisory, never a build blocker.

> **≤3 is a design DEFAULT the lint surfaces, not a cap a build dies on** (P2:52, P2:91, P2:187 —
> Bean-confirmed). `check-simple-surface-cap.js` is WARN-ONLY (exit 0) with an opt-in `--strict`,
> matching its sibling `check-element-manifest-conformance.js`, which this FR itself notes is
> "WARN-ONLY, always exits 0".
>
> **Consequence for the current finding:** `sgs/site-header` showing 7 default-visible controls is a
> NUDGE toward the P2 §5 roster, **not a defect and not a blocker**. Do not "fix" it by hiding
> controls a client relies on — P2's whole point was that a ceiling a client cannot influence is
> worse than a surface that is slightly busy.

#### FR-37-28 — Preset controls are permitted
The inspector may expose composite preset controls (e.g. *Layout: Centred / Split / Minimal*)
that write several attributes at once. The converter still targets the attribute layer only —
presets are an operator convenience, never a storage shape (P2 §2.6, Bean-confirmed; it struck
the earlier "inspector = 1:1 attribute view" rule).
**Status:** `✅ BUILT + LIVE-VERIFIED 2026-07-24` (commit `97572450`). A "Layout preset"
`ToggleGroupControl` (Centred / Split / Minimal) on the `sgs/site-header` **Styles** tab. It is
**derived, not stored** — `getActiveLayoutPreset()` reads the current attrs for the active state,
`applyLayoutPreset()` writes only the block's EXISTING `contentWidth` + `spacing.padding` attrs.
**No new block.json attribute** (verified — `site-header/block.json` untouched), so the converter
round-trips the underlying attrs unchanged. **Live proof (sandybrown canary, chrome-devtools):**
the control showed "Split" as the derived active state on a fresh block (Full band); clicking
"Centred" flipped the Content-band-width control from **Full → Normal** — i.e. it wrote the
existing `contentWidth` attr, exactly as designed. **Depth (row re-alignment) SHIPPED + LIVE-VERIFIED
2026-07-25 (commit `8e9aac57`):** the earlier "content-band width only" limitation is CLOSED — each
preset now also writes the primary (middle) row's existing `justifyContent` (Centred → `center`,
Split/Minimal → `space-between`) via a `useSelect` lookup of the `rowSlot:'middle'` row +
`updateBlockAttributes`, and `getActiveLayoutPreset` now also requires the row alignment to match so
the active indicator stays honest. Still no new stored attribute (reuses the row's existing
`justifyContent`). **Live proof (sandybrown canary, chrome-devtools + `wp.data`):** clicking Centred
flipped the middle row `justifyContent` `space-between → center` and the container `contentWidth`
`full → normal` (read from the block-editor store), the "Centred" radio showed selected (derivation),
and the logo/nav cluster visibly centred in the canvas.
**Done when:** at least one preset control exists on the header container and sets its
attributes such that the converter round-trips them unchanged. ✅ met.

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
**Status:** `✅ BUILT + LIVE-VERIFIED 2026-07-24` (commit `97572450`). New
`Sgs_Header_Footer_Cli_Commands` (`includes/class-sgs-header-footer-cli-commands.php`) registers
`wp sgs header|footer` with `set-active` / `clear-active` / `list` / `seed-starter`, delegating ALL
active-state to `Sgs_Active_Layout` (no direct option writes — grep-confirmed), guarded by
`defined('WP_CLI')`. **Live proof (sandybrown canary over SSH):** `wp sgs header list` returns the
real table with a correct **Active** column (proving registration + delegation).
**Hyphenated-name fix (commit `48c50fb6`, live-verified 2026-07-25):** WP-CLI registers method
names verbatim, so the first build exposed the commands as `set_active` (underscore) not the
documented `set-active`. Added `@subcommand set-active`/`clear-active`/`seed-starter` annotations;
after redeploy (md5-verified), `wp sgs footer set-active --help` returns proper help and `wp sgs
header` lists all four in hyphenated form (`clear-active` · `list` · `seed-starter` · `set-active`).
**Done when:** each command runs non-interactively, is covered by `--help`, and the cloning
pipeline can set an active header without a browser. ✅ met.

#### FR-37-31 — Retire the orphan behaviour template parts; preserve search starters
Delete the inert `header-sticky` / `header-transparent` / `header-shrink` template-part
registrations, their patterns and their `theme.json` entries — behaviours are attribute-driven
(FR-37-13/14/15), so these are dead weight that misleads a reader about which mechanism is
live. **Separately, preserve** the three shipped search-header starters
(`header-search-bar-above`, `header-search-bar-below`, `header-search-icon`) into the FR-37-8
starter library, along with their design principle that **header search is opt-in, not default**
(Spec 17 FR-S1-5).
**Status:** `✅ DONE — verified 2026-07-24.` Both halves are already satisfied and were confirmed
by grep against the live theme, not asserted: (1) the three behaviour stubs (`header-sticky` /
`header-transparent` / `header-shrink` parts, patterns and `theme.json` `templateParts` entries)
do **not** exist anywhere under `theme/sgs-theme/` — `grep -rE "header-(sticky|transparent|shrink)"`
returns zero references (they were removed in the earlier behaviour-attribute rework / FR-37-21
sweep, so this FR's delete step is a no-op by construction); (2) the three search starters exist and
were re-scoped by today's FR-37-8 work to `Block Types: core/post-content` + `Post Types: sgs_header`
with zero `adaptive-nav` refs, so they surface in the FR-37-7 native picker like every other
header starter.
**Done when:** zero references to the three behaviour stubs remain (✅); the three search starters
are selectable from the FR-37-7 picker (✅ — scoped identically to the live-verified starters).

### Gate

#### FR-37-23 — Acceptance
This spec closes only when: FR-37-1/2/3/5 are live on the canary; §3 audits (FR-37-9/10) are
recorded per clause; the never-overflow gate (FR-37-12) passes on both sites **across the full sweep per §3.6** (not three fixed widths — D420 lived between them);
no inline `style=""` on either container; and **Bean's eye** signs off (R-31-13 — measurement
and eye are co-authoritative, neither closes alone).
**AMENDED 2026-07-29 (architecture gate, signed — reaffirming Bean's 2026-07-28 decision in
`reports/2026-07-28-spec36-37-remaining-work-inventory.md`):** the acceptance PROOF is the
**12-reference clone as the FINAL gate of the merged 36/37 track** — every reference built
completely as SGS-native output (header + drawer + footer together, content/imagery/colours/
typography), zero hardcoding; anything a reference needs that SGS cannot express is a defect in
the earlier waves, never a reason to trim the reference. **studionamma is the first clone**, one
site 100% before the rest. **Each accepted clone yields its B3 presets** — the B3 roster is now
7 cloned pairs + invented fills only where the references leave a gap (Utility commerce, Overlay
hero-contrast, Directory footer; the invented "Warm" is CUT as too close to Bold). On completion,
retire the `header-centred/minimal/full` structural starters; keep `scratch` + the 3 search-bar
variants (capability, not look). Spec 33 Part 2 (the clone WALKER) consumes the proven system and
inherits the 12 references as regression fixtures.
**Status:** `NOT-BUILT`.
**Done when:** all of the above, each with evidence recorded, not asserted.

---

### Per-row scroll behaviours (added 2026-07-26 — D386–D389)

> These four FRs record work that SHIPPED before it was specified. The design gate
> (`plans/archive/2026-07-25-header-footer-per-row-identity-design-gate.md`) called for them at execution
> time and they were not written; the omission was caught at the 2026-07-26 handoff. FR-37-37/38/39
> are retrospective records of live-verified behaviour; FR-37-40 is forward-looking and APPROVED but
> NOT built.

#### FR-37-37 — Per-row transparent + hide-on-scroll
`✅ BUILT + LIVE-VERIFIED 2026-07-26` (`a3a200aa`). Each `sgs/site-header-row` and
`sgs/site-footer-row` carries its OWN `rowTransparent` + `rowHideOnScroll`, as
`{desktop,tablet,mobile}` boolean objects with **inherit-upward** semantics (mobile ← tablet ←
desktop; an explicit `false` means "off here"), resolved by `sgs_resolve_tier_booleans()`
(`includes/helpers-responsive.php`). Independent of the header-LEVEL body-class path (D376), which
is untouched. render.php emits a `sgs-row-behaviour` class + `data-sgs-row-*` attrs listing only
the tiers where a behaviour is ON; `src/header-behaviours/view.js` (`initRowBehaviours`) scans
those rows and toggles per-row state classes.
**Binding rule — tier-gating is via a JS-added state class, never `[data-attr]` presence.** A
presence-only selector applies at every tier; that shipped as a bug in review and was fixed. The
resting state is keyed on `is-row-transparent-active`, added only on an active tier.
**Done when (met):** at desktop the top row hides on scroll while the logo row goes
transparent→solid — each row doing ONLY its own behaviour, both resetting on scroll-up; a
desktop-only transparent row is NOT transparent at mobile; D376 header-level path intact.

#### FR-37-38 — Per-row shrink, proportional by construction
`✅ BUILT + LIVE-VERIFIED 2026-07-26` (`59de5434`, corrected by `d54c316d`). `rowShrink`
(device-tier object, same resolver) reduces the row's own vertical padding on scroll.
**The shrunk value MUST be emitted per instance as `calc(<that row's own padding> / 2)`**, via
`sgs_row_shrink_css()` (`includes/helpers-row-behaviour.php`) calling the shared
`sgs_emit_responsive_css()` engine. Ratio 0.5 (Bean-decided).
**Binding rule — never an absolute value in a shared stylesheet.** The first ship put
`padding-block: var(--wp--preset--spacing--10)` in `assets/css/header-behaviours.css`; at (0,3,0)
that out-specifies each row's own `.sgs-container-<uid>` rule (0,1,0) and forced every row to the
same size — an unpadded row measured 0px at rest and **4px shrunk: it GREW**. A shared stylesheet
cannot know the resting value it is meant to reduce. Enforced by `check-shared-css-state-rules.js`
in `prebuild` (D386).
Two SCALAR specs (`padding-top`/`padding-bottom`), never `box => true` — a box spec expands to all
four sides and would jolt the row horizontally. The transform appends the unit itself, because a
`transform` short-circuits the engine's unit handling.
**Done when (met):** computed padding when shrunk ≤ resting at 375/768/1440, on a row WITH padding
and one WITHOUT. Live: 48px→24px, left/right held at 30px, unpadded row 0→0.
**Deliberately NOT built:** a 44px touch-target floor. Measured — halving a row's padding left all
5 interactive children byte-identical in size, because padding sits OUTSIDE children and they carry
their own minimums. Do not add it.

#### FR-37-39 — Shrink hides a chosen element, with a declarative guardrail
`✅ BUILT + LIVE-VERIFIED 2026-07-26` (`59de5434`). A row may nominate ONE child to hide while it
is shrunk, referenced by the child's own `anchor` attribute — a **stable id that survives
copy/paste**, never the editor's `clientId`.
**The guardrail is declarative, not a hardcoded list (R-31-1).** The framework has no block-slug →
role/criticality lookup (verified: `slots` holds one `logo` row; `roles` classifies role-names not
blocks). So `supports.sgs.headerEssential: true` is declared on `sgs/responsive-logo`,
`sgs/nav-menu` and `sgs/cart`. The editor picker reads it via `wp.blocks.getBlockType()`;
`sgs_resolve_row_shrink_hide_target()` re-checks it server-side against `WP_Block_Type_Registry`.
Protecting a new critical block later is one block.json flag.
The picker ALSO excludes children lacking `supports.anchor` — WP silently discards an undeclared
attr, so such a child would look configured and hide nothing (11 of 81 blocks, incl.
`sgs/product-search`, a promoted header element).
An orphaned target (child deleted) is a silent no-op plus an operator warning; a reset action is
always visible.
**Done when (met):** the chosen child computes `display:none` while shrunk and the sibling row is
unaffected; and — proven — pointing the target at the logo makes the server emit NO
`data-sgs-row-shrink-hide` and no hide rule, while still emitting `data-sgs-row-shrink`.

> **D679 finding (2026-08-19) against FR-37-37/38/39: header-level and row-level behaviours look
> duplicated but are NOT redundant.** `transparent`, `shrink`, and `hide-on-scroll` each exist at
> BOTH the header (D376, FR-37-13/14/15) level and the row (this section's FR-37-37/38/39) level.
> A measured comparison confirms each pair produces genuinely different rendered output:
> header-level `transparent` lifts the whole header out of document flow and triggers the WCAG
> contrast safeguard (FR-37-44), while row-level `rowTransparent` only changes ONE row's
> background, with no WCAG interaction. Header-level `shrink` shrinks the header's own padding
> globally; row-level `rowShrink` shrinks that specific row's padding and can additionally hide one
> chosen non-essential child (FR-37-39) — a capability the header level does not have. Header-level
> `hide-on-scroll` translates the WHOLE header off-screen; row-level `rowHideOnScroll` collapses
> ONE row to height 0 while the header is pinned (FR-37-40), leaving the rest of the header intact.
> **Deleting either layer loses real capability — this is not redundancy to consolidate.** The
> actual defect is that both layers are LABELLED IDENTICALLY (e.g. "Transparent" appears as a
> control on both the header and the row), so an operator has no way to tell which layer they are
> configuring. **Ruling: rename the ROW-level three controls to disambiguate them from the
> header-level three; do not delete either layer.**
>
> **Competitor evidence (supporting context, not the reason for the ruling):** Kadence, Astra and
> Blocksy each implement a scroll behaviour (transparent/shrink/sticky-style) at ONE structural
> level only — none of them offers the same toggle at both a container level and a row level.
> But none of them SPLIT a single behaviour into two genuinely different mechanisms the way SGS
> did either — this is a real product difference, not a bug to converge toward parity with a
> competitor.

#### FR-37-40 — Sticky model: HEADER-level, rows collapse
`✅ BUILT + LIVE-VERIFIED 2026-07-26` (`5716f7b7` scroll-padding gate / D391; `494e5d50`
collapse + guard / D392). Design gate `plans/archive/2026-07-26-per-row-sticky-mini-design.md`,
Bean-signed 2026-07-26 (D389). Supersedes any per-row sticky idea.
**Collapse-when-pinned:** while the header is measured as pinned, a header row hiding on scroll
collapses to height 0; when it is NOT pinned the shipped `translateY(-100%)` path runs unchanged
(the regression constraint — verified: `matrix(1,0,0,1,0,-24.7159)`, row at full height, no inline
height written). "No gap" measured UNROUNDED at desktop/tablet/mobile: `(header drop) − (row
height removed)` = **0.00** at every tier. The existing ResizeObserver re-publishes the shrunken
header height on its own (92→68px live), so the D391 scroll-padding gate composes for free.
**Binding rule — a browser cannot animate from `height: auto`.** The script MEASURES the row's
real height, writes it as the animation's start value, drives it to 0, and CLEARS the inline
height afterwards so the row returns to `auto` (a left-behind fixed height would freeze the row
when a font swaps or the viewport changes). The clear-out delay reads the COMPUTED transition
duration — never a hardcoded number — so `prefers-reduced-motion`, which strips the transition,
clears on the next tick instead of awaiting a `transitionend` that never fires. Bean chose this
over an instant snap (visible downgrade) and over a grid wrapper (markup change to a shipped
block → editor risk, cf. D388).
**Collapse must win by SPECIFICITY, not source order** — the collapse selector is (0,4,0) against
the translate rule's (0,3,0). Verified by `transform: none` throughout the pinned path.
**Silent-failure guard (advisory, never a gate):** an ancestor with `overflow` other than
`visible`, or `transform`/`perspective`/`filter`, silently stops sticky pinning to the viewport.
`findStickyBreakingAncestor()` detects it and warns, naming the element. This bounds what
`isHeaderPinned()` can claim — a header broken this way still COMPUTES `sticky`, so the
measurement is accurate but misleading. It warns rather than zeroing the published height,
because an `overflow` ancestor may still be the page's own scroll container.
**NOT built, deliberately:** the D4 multi-sticky warning and the sticky↔hide-on-scroll mutual
exclusion. Both were specified against the per-row sticky model D389 rejected; under a single
header-level sticky element neither condition can occur. Do not add them back without a new
model.
**NOT live-verified:** `prefers-reduced-motion` (the harness cannot emulate the media query —
correct by construction, but that is reasoning, not measurement). Also noted: a collapsed row's
contents remain focusable, which is parity with the shipped translate path, not a new defect.
**Per-row `position: sticky` is REJECTED**, on evidence: a sticky element pins only while its
containing block is in view, so a row sticky inside a ~250px `<header>` unpins the moment scroll
passes the header height (short-parent trap) — the nav would vanish. Separately, `transform` never
reclaims flow space, so a slid-away row still occupies its height and leaves a visible gap.
**Approved model:** sticky stays HEADER-level (already shipped; the header's containing block is
`<body>`, so no trap), and a row that should disappear **COLLAPSES (height → 0)** rather than
translating — the header genuinely shrinks with no gap, and its existing ResizeObserver
re-publishes the height. When the header is NOT pinned, the shipped `translateY(-100%)` behaviour
is unchanged and must stay byte-identical (the regression test).

> **⚠ D679 correction (2026-08-19) — do not cite Kadence as proof that per-row CSS `sticky` is
> viable.** Kadence DOES ship a per-row "which row survives while pinned" feature, and a later
> reader who spots that could mistake it for evidence against this FR's rejection of per-row
> `position: sticky`. It is not: Kadence implements it with **JS `position: fixed` plus a
> measured placeholder spacer element**, not CSS `position: sticky`. That is a different and
> considerably bigger mechanism than the one D389 rejected — it sidesteps the short-parent trap
> by never relying on `sticky`'s containing-block behaviour at all, at the cost of a JS
> measurement + spacer layer this spec's approved model does not need. Kadence's existence does
> not contradict D389; it demonstrates a different, heavier solution to a related problem.
**The multi-row offset chain is explicitly NOT to be built** — under a single sticky element there
is nothing to chain.
**Footer rows get NO sticky.** A strip pinned to the viewport bottom is a **Spec 18 Floating UI**
element (D390): it is driven by state a footer row cannot reach, and must coordinate with the
cookie banner / chat widget / back-to-top already competing for that edge.
The multi-sticky warning is **advisory only, never a gate** — a fully sticky header is legitimate,
especially paired with shrink.
**Blocking sub-item — `✅ BUILT + LIVE-VERIFIED 2026-07-26` (`5716f7b7`, D391).** The scroll-padding
defect is FIXED; do not rebuild it. It was: `:root { scroll-padding-top: var(--sgs-header-height,
0px) }` applied unconditionally while the height publisher always ran, gated on nothing, so a
NON-sticky header reserved its full height (93px desktop / 252px mobile on canary) for in-page
anchors — blast radius including fragment navigation, find-in-page, every
`element.scrollIntoView()`, keyboard focus scrolling and scroll-snap. `var(--x, 0px)` fires its
fallback only when the property is UNDEFINED, never when it is defined-but-zero, so the observer
publishes `0px` **explicitly**. W3C technique **C43** confirms `scroll-padding` is a sufficient
technique for WCAG 2.4.11/2.4.12 **including keyboard Tab focus** — it is not an anchor-jump-only
fix, so the CSS line is correct and was left unchanged; the fix is JS-only, in
`src/header-behaviours/view.js`.
**Binding rule — the pinned gate MEASURES `getComputedStyle(header).position`, never the
`sgs-header-behaviour-sticky` body class.** `header-behaviours.css` sets `position:sticky!important`
for sticky (`:39`) and `position:absolute!important` for transparent (`:52`) at equal specificity
with transparent later in source order, so a header carrying BOTH classes computes `absolute` and
scrolls away. A class-based gate publishes a non-zero height for a header that is not pinned. Proven
live. An rAF-coalesced `resize` listener is also required: crossing a breakpoint can change
`position` without changing the border-box height, so the ResizeObserver alone is insufficient.
**Known second instance, NOT fixed:** `theme/sgs-theme/assets/css/utilities.css:21` declares its own
`:root { --sgs-header-height: 80px }`, so the plugin rule's `0px` fallback can never fire and a
JS-disabled page reserves 80px unconditionally; `body.admin-bar html` (`:29`) can never match
(`html` is not a descendant of `body`). Both are theme-side and untouched.
**Done when (remaining):** the collapse-when-pinned criteria in §4 of the mini-design, each
live-verified **across the §3.6 sweep (1400 → 320px, ≤10px steps)**, NOT at 375/768/1440.
Since D455 the row's children shrink continuously rather than snapping at a breakpoint, so a
text-wrap-induced height change can occur BETWEEN fixed tiers — exactly the D420 failure mode.
The scroll-padding criteria are met — evidence
`reports/visual-diff/scroll-padding-pinned-gate-2026-07-26.md`.


#### FR-37-41 — Preview a layout on the real site before making it active (B2)
`✅ BUILT + LIVE-VERIFIED 2026-07-27` (`20ec422c`; design-gated + Bean-signed-off same day per
constraint §7.7 / project rule 7). Closes residual B2.

**The problem.** Both CPTs register `'public' => false` (`class-sgs-block-cpts.php:98`), so a
layout post has **no frontend URL of its own**. The only way an operator could see their header on
a real page was to press **Set as active** — i.e. publish it to every visitor before ever looking
at it. The shipped "Show me the shrunk size" editor toggle covers **shrink only**; sticky,
hide-on-scroll and transparent are all scroll-triggered and cannot be shown in a static canvas.

**Mechanism — one override point, deliberately.** `Sgs_Active_Layout::get_preview_id()` is
consulted as the first line of `get_active_id()`, because that is where **every** consumer
converges: the render path (`Sgs_Header_Rules::filter_template_part()` → `render_active()` →
`get_active_content()`) **and** the behaviour resolver
(`SGS_Nav_Menu_Source::get_header_content()`, `class-sgs-nav-menu-source.php:419` →
`get_active_content()`). Overriding only the render path would have previewed the markup while
sticky/hide-on-scroll/transparent still resolved from the LIVE header — failing to preview
precisely the things the feature exists for. One override, both surfaces, no second mechanism
(R-31-9). **Live-proven:** previewing header 1655 emits
`sgs-header-behaviour-hide-on-scroll-down` while the active header 1570 emits no behaviour class.

**Fails closed to 0** unless all hold: per-area query var present + positive;
`current_user_can('edit_theme_options')` (same bar as Set-as-active); nonce valid against an
action scoped to BOTH area and post id; post exists and is the right type. **One deliberate
deviation from `get_active_id()`: draft/pending are ACCEPTED** — previewing before publishing is
the point; `trash`/`auto-draft` still rejected.

**Bounded:** `get_stored_id()` untouched (the list table still reports what is genuinely live, so
preview never lies); **no write path exists** — per-request query state only, so it cannot persist
or half-activate; `render_active()`'s fail-closed behaviour inherited unchanged; sets
`DONOTCACHEPAGE` + `nocache_headers()`.

**Live evidence (canary, 2026-07-27) — four negative controls, not one:** valid link renders the
DRAFT header over the real homepage ✅; **no nonce** → live header ✅; **bad nonce** → live header
✅; **a nonce minted for post 1570 replayed against 1831** → live header ✅ (proves per-post
scoping); **anonymous request with the VALID url** → draft NOT leaked, live header served ✅. Active
pointers unchanged (1570/1654) and the previewed post still `draft` afterwards — nothing persisted.
**Done when:** an operator can view an unpublished header on a real page without activating it,
the behaviours resolve from the previewed post, and an unauthenticated request never sees it. ✅ met.

**⛔ DROPPED, not deferred (Bean, 2026-07-27):** a shareable preview link for someone **without a
login**. Not needed — a client who should see a work-in-progress either has an account, or is shown
it on a test site. **Do not re-open this as an "obvious gap"**: it would require an expiring-token
model instead of a nonce (a nonce is bound to a logged-in user), which means a second access path,
a token lifetime, and a URL that grants site content to whoever holds it. The capability + nonce
model above stays the whole story. This is a decision, not an unbuilt requirement.

#### FR-37-42 — Visual column-shape picker for rows (approved 2026-07-28, NOT built)
A row set to **Columns** exposes, alongside its column **count**, a set of **column SHAPES
presented as small visual diagrams** the operator clicks — equal, wide-centre, wide-first,
wide-last, and the two-column 2:1 / 1:2 pair. Selecting one writes the **existing**
`gridTemplateColumns` object attribute. This amends §3.3, which rejected a hand-typed ratio
string; the string stays rejected, the capability becomes reachable. Applies to BOTH
`sgs/site-header-row` and `sgs/site-footer-row` (one mechanism, R-31-9), and to `sgs/container`
if it shares the control — decide at build time rather than assuming.

**Why:** measured evidence, not preference. The 2026-07-28 teardown of an Awwwards-winning
ecommerce footer found `grid-template-columns: 340px 680px 340px` — a wide-centre shape a
**count can never produce**. A count-only control silently rules out a whole class of
best-in-class footer design.

**Binding:** count stays the default and the shape picker is optional (a client wanting "4
columns" never meets it) · per-device like the count · **still stacks to 1 on mobile
automatically** — an asymmetric desktop shape must never reach a phone · the active shape is
**DERIVED** from the stored value, never separately stored, so a hand-edited value shows no
active shape rather than lying (FR-37-28's rule) · shapes in `fr` not px, so they stay fluid ·
**no new block.json attribute** — verified by diffing `site-footer-row/block.json` before and
after, which must be unchanged.

**⚠ Do NOT re-derive the shape list from taste.** It comes from the reference teardowns; any
shape added later needs a measured reference behind it.
**Status:** `PARTIAL` — built 2026-08-26 (`2e46fc3f2`);
`src/components/ColumnShapePicker.js`, mounted at `src/blocks/site-footer-row/edit.js:~415`.
`sgs/site-header-row` and `sgs/container` still to roll out (Bean's build-time call: all three
share one control). NOT yet deployed, so the eye-verified half of Done-when is OPEN.

**Built to the gold standard, not to taste** — `reports/2026-08-26-column-shape-picker-gold-standard.md`:
· Core's own column picker is **insert-time only** (`columns/edit.js` swaps the Placeholder once the
  block has children; its variations are `scope:['block']` with no `isActive`, so
  `BlockVariationTransforms` renders null). An after-insert shape control is a genuine GAP in core.
· `ToggleGroupControl` + `ToggleGroupControlOptionIcon`, not a row of `Button isPressed` — a true
  Ariakit radiogroup with arrow-key roving, via the existing house primitives boundary.
· ONE string as both visible and accessible name, ratio included ("Wide centre (25 / 50 / 25)") —
  deliberately NOT core's label/description split, which Gutenberg #66062 records as a live
  WCAG 2.5.3 failure.
· Shape names are LOGICAL (`first`/`last`), never directional: "left heavy" and its diagram both
  invert under RTL while `1fr 2fr` does not.

⛔ **One research recommendation was REJECTED and must stay rejected: storing a shape SLUG** instead
of writing `gridTemplateColumns`. It contradicts this FR's binding constraints, and its three stated
reasons fail on checking — deriving via `activeShapeKey()` supplies the stable value the control
needs; per-column width attrs do not exist on these blocks; and `gridTemplateColumns` is ALREADY a
per-tier object the wrapper renders. Decisively, a stored slug can DISAGREE with a hand-edited track
string, which is exactly the lying indicator FR-37-28 exists to prevent. Deriving cannot lie.

⚠ **Multi-row grids need no design (Bean asked, 2026-08-26).** `grid-template-columns` applies to the
WHOLE grid — every row uses the same tracks — and `sgs/container` has no per-item span support. So
differing proportions per row means a SECOND container, which is already true today with the count
control. The shape picker adds no new multi-row concept.
**Done when:** an operator picks a wide-centre shape with no CSS and no typing; the row renders
that shape on desktop and stacks to 1 on mobile with no further configuration; the stored value
is `gridTemplateColumns` and nothing else; and the active-shape indicator is derived, verified
by hand-editing the value and confirming NO shape shows as active.

#### FR-37-44 — `contrastSafe` silently overrides an operator's explicit choice (D679 finding 1, 2026-08-19)

**Current behaviour is a POLICY BREACH.** If the header is transparent on desktop and the
operator has explicitly chosen "None" for contrast safety, the resolver silently rewrites that
choice to `scrim` (`includes/class-sgs-header-behaviours.php:236-239`). The operator's explicit
selection is discarded with no indication anywhere in the editor or on the frontend that it
happened.

This violates the locked rule `a11y-validation-feedback-informational-not-gate` — operator
accessibility failures are NOTICES, never enforcement (see FR-37-19, which already establishes
this principle for the rest of the header's a11y feedback). The WCAG 1.4.3 contrast reasoning
behind the code is sound — an operator-chosen "None" over a transparent header genuinely can fail
contrast — but silently overriding the stored value is the wrong mechanism for enforcing it.

**Architecturally, `contrastSafe` is already the odd one out** among the five header behaviours:
it is a flat string/enum, while its four siblings (`headerSticky`, `headerTransparent`,
`headerShrink`, `headerHideOnScroll`) were reshaped to per-device tri-state objects under FR-37-14
and explicitly left untouched by that reshape (D402 gate — see FR-37-14/FR-37-15). It also
resolves through a SECOND, independent mechanism: a standalone `parse_blocks()` pass over the
header template part that injects a BODY CLASS, rather than the scoped per-instance `<style>`
emission (`sgs_emit_tier_rules()`) the other four behaviours use. This second-mechanism status is
also why `contrastSafe` has **no editor preview at all** — the body-class path only resolves on
the rendered frontend page, never inside the block canvas.

All three contrast modes paint real, non-trivial CSS, so none of them is a no-op that could be
silently dropped without visible effect: `assets/css/header-behaviours.css:79` (`scrim`, a
pseudo-element `::before` darkening overlay), `:98` (`shadow`, a text-shadow legibility technique),
`:108` (`force-solid`, drops transparency outright and forces a solid background).

**Bean's ruling (2026-08-19):** make `contrastSafe` responsive (bring it onto the same per-device
model as its four siblings), AND turn the silent upgrade into a visible notice the operator can
accept or decline, rather than a value rewritten without their knowledge. Both changes are
required — responsiveness alone would not fix the policy breach, and a notice alone would not fix
the architectural inconsistency.

**Status:** `BUILT` 2026-08-19 — pending live canary verification at the Task 1 checkpoint.

`contrastSafe` is a FOUR-value enum, not a boolean — it uses `ResponsiveOverride` around the
existing 4-option `SelectControl`, not `ResponsiveTriStateControl`. The control primitive must
match the STORAGE shape, not the neighbouring control — pointing a tri-state control at an enum
attribute would store values the control cannot display and silently flatten the client's choice.

**Done when:** `contrastSafe` is per-device, consistent with the model used by `headerSticky`/
`headerTransparent`/`headerShrink`/`headerHideOnScroll`; an operator's explicit "None" over a
transparent header is never silently rewritten — the operator sees a notice naming the WCAG 1.4.3
risk and the affected device tiers, and can accept the suggested `scrim` upgrade or keep "None";
and the choice made is the choice that renders.

#### FR-37-45 — Transparent-to-solid scrolled colour is not client-reachable (D679 finding 2, 2026-08-19)

**The mechanism exists but the client cannot reach it.** `sgs/site-header` already supports a
transparent-at-top → solid-past-50px transition (`site-header/render.php:204-223`, keyed on the
`.is-header-scrolled` class). What is missing is operator control over the pair: the scrolled
colour is HARDCODED to `var(--wp--preset--color--surface,#ffffff)` at `render.php:218`, and the
two states of the pair (which colour is "transparent" and which is "solid") cannot be inverted by
the operator.

Bean asked for both: a colour control for the scrolled state, and a direction switch so the pair
can be inverted (e.g. a dark scrolled state instead of the hardcoded light `surface` token).

**Constraint that any fix must preserve.** `render.php:204-217` carries the documented `!important`
constraint recorded against `P-TRANSPARENT-HEADER-SCROLLED-BG-NOT-FLIPPING` — read that block
before changing the scrolled-state CSS; the `!important` is there because a lower-specificity rule
was previously losing the flip entirely, not by accident.
**Status:** `NOT-BUILT` — gap recorded 2026-08-19, not yet designed.
**Done when:** the scrolled-background colour is an operator-set control (not the hardcoded
`surface` token), the transparent/solid pair can be inverted, and the
`P-TRANSPARENT-HEADER-SCROLLED-BG-NOT-FLIPPING` regression stays fixed under the new control.

---

## 5. Build status summary

> **Updated 2026-07-23.** Nine further FRs landed and were deployed to the canary. Three
> verification tiers are used below and MUST NOT be conflated — conflating them is how this
> project has repeatedly shipped "done" work that nobody had seen run:
>
> | Tier | Means |
> |---|---|
> | `LIVE-VERIFIED` | Observed working on the deployed canary with evidence recorded |
> | `DEPLOYED (unexercised)` | Shipped + checksum-verified on the canary, but **no page or setting currently renders it**, so it has never actually run |
> | `BUILT (code)` | In the repo + build-green, not deployed or not reachable |
>
> **2026-07-23 deploy evidence:** 4/4 md5 local↔server match; oldshape audit PASS (0 NEW HIGH,
> after fixing a latent `sgs/cta-section` undeclared-`textAlign` bug it correctly blocked on);
> axe **0 new violations** — measured against palestine-lives as an un-deployed control (5 types
> on the canary vs 4 on the control; the single delta is a Trustpilot-green contrast issue on a
> block this work never touched).
>
> ⚠ **The honest gap:** most of the newly-landed work is `DEPLOYED (unexercised)`. The canary
> homepage carries no cart and no search block; editor notices and `DeviceTabs` are
> editor-surface only; hide-on-scroll ships off by default. The next session opens by using
> Playwright/WP-CLI to CREATE the pages and settings that make each one render, then checking
> both that it works and that it looks right.

| Area | Status |
|---|---|
| CPTs + admin pages | `BUILT` |
| Active pointer + "Set as active"/"Clear" (FR-37-2/25) | `✅ BUILT + CANARY-VERIFIED` (D360) — set active via the admin row action, header+footer rendered live |
| CPT → frontend binding (FR-37-3, incl. CPT-aware resolver) | `BUILT (code)` — was §2.2 silently broken; direct render replaces it |
| "Active" list-table column (FR-37-5) | `✅ BUILT + CANARY-VERIFIED` (D360) — list table showed "Not active" pre-set and "Active" post-set |
| Container blocks exist | `BUILT` (2026-07-13, for Spec 17) |
| Container blocks **conform to a defined end state** | `DONE` — FR-37-9/10 audits RUN 2026-07-22, per-clause with `file:line`; 3 gaps carried as FR-37-33/34/35, none dropped |
| Row reorder-lock (`templateLock: 'all'`, §3.3a) | `BUILT (code)` |
| Footer per-device column count (FR-37-11) | `✅ LIVE-VERIFIED 2026-07-23` — a footer columns row set to 4/desktop renders 4 columns and stacks to 1 on mobile on the active canary footer. Two bugs fixed: (a) `a28a1121` — the tier stacking used `sgs-cols-*` classes on the WRAPPER while container queries (FR-37-35) had moved the grid to `.sgs-container__inner`, so the class was inert; rerouted to a scoped rule at `$grid_sel`. (b) `89e31fbc` — that scoped rule lived inside `if ($has_responsive_attr)`, which did not consider tier counts, so it never emitted; gate widened. Researched (research-check extended: every major builder uses a per-device COUNT, not intrinsic auto-fit — kept the control, fixed the plumbing) |
| Per-row layout control + independent columns (FR-37-33) | `✅ BUILT + LIVE-VERIFIED 2026-07-23` (`8dd873bd`) — Cluster/Columns switch on both row types; header rows gained column attrs; all 6 rows (3 header + 3 footer) set columns independently. Footer live proof: rows at 2/4/3 desktop, all stack mobile. See FR-37-33 |
| Per-row transparent + hide-on-scroll (FR-37-37) | `✅ BUILT + LIVE-VERIFIED 2026-07-26` (`a3a200aa`) — each row behaves independently at its own tiers; desktop-only transparent stays solid at mobile; D376 header-level path intact |
| Per-row shrink, proportional (FR-37-38) | `✅ BUILT + LIVE-VERIFIED 2026-07-26` (`d54c316d`) — 48px→24px, left/right held, unpadded row 0→0 at 1440/768/mobile. First ship GREW an unpadded row (absolute value in a shared stylesheet); now `calc(own padding / 2)` per instance + gated by `check-shared-css-state-rules.js`. 44px floor measured and deliberately NOT built |
| Shrink-hides-element + headerEssential guardrail (FR-37-39) | `✅ BUILT + LIVE-VERIFIED 2026-07-26` — chosen child `display:none` while shrunk, sibling row unaffected; guardrail proven SERVER-SIDE (target pointed at the logo → no hide attr, no rule) and declarative via `supports.sgs.headerEssential`, not a hardcoded list |
| Footer parity for per-row behaviours (FR-37-37/38) | `✅ LIVE-VERIFIED 2026-07-26` — measured on the ACTIVE footer **CPT 1654** (not the obvious 1571; check `sgs_active_footer_cpt_id`): top row 60px→30px, siblings unaffected |
| Sticky model — HEADER-level, rows collapse (FR-37-40) | `✅ BUILT + LIVE-VERIFIED 2026-07-26` (`5716f7b7` D391 + `494e5d50` D392) — per-row `position:sticky` REJECTED on the short-parent trap (D389); offset chain deliberately not built; footer rows get no sticky (→ Spec 18). Scroll-padding publisher gated on MEASURED pinning, explicit `0px` otherwise, negative-control-verified. Collapse-when-pinned: gap = **0.00** unrounded at desktop/tablet/mobile; non-pinned path byte-identical `translateY(-100%)` with no inline height; header re-publishes its shrunken height (92→68px) for free. Sticky-breaking-ancestor guard warns, advisory only. D4 multi-sticky warning + sticky↔hide-on-scroll exclusion deliberately NOT built (both specified against the rejected per-row model). Not live-verified: `prefers-reduced-motion` |
| Never-overflow (FR-37-12) | `⚠ RE-VERIFY` — the 2026-07-23 evidence below was taken at THREE FIXED WIDTHS and predates the D420/D455 sweep requirement; a three-point pass is exactly what missed D420 (clean at 770px, broken at 766px). The header row WAS re-swept at D455 (`reports/visual-diff/site-header-row-2026-08-01.md`, 109 widths); the FOOTER and the second dev site have NOT been swept. Original evidence: `scrollWidth <= innerWidth` at 375 / 768 / 1440 on the canary (−15px at all three). The only elements past the viewport edge are inside the testimonial carousel, a horizontal-scroll container by design |
| Container-query row reflow (FR-37-35) | `✅ LIVE-VERIFIED 2026-07-23` — `containerType: inline-size` computed on both real rendered rows. Adds a container-level layer; no existing viewport `@media` rule was altered (STOP-CONTAINER-TIER-IS-NOT-VIEWPORT) |
| sticky / transparent / shrink | `BUILT` — reshaped tri-state 2026-07-28, see FR-37-14 row below (superseded the earlier flat shape) |
| hide-on-scroll + transparent + shrink (FR-37-13) | `✅ SHIPPED + LIVE-VERIFIED` (D376, 2026-07-24) — fix B landed: `sgs/site-header` renders a semantic `<header>`; view.js + all 21 `header-behaviours.css` selectors retargeted to `header.sgs-site-header`. Live on the canary (CPT 1655): scroll-down hides (`translateY(-119px)`), scroll-up returns; one banner landmark; F1 publisher revived; axe zero NEW hit. Plus Option B one-header guard + editor `<header>`. See FR-37-13 above |
| Informational a11y notice (FR-37-19) | `DEPLOYED (unexercised)` — passive `Notice` on both containers; verified in code to carry NO `lockPostSaving`/gating (P1 DP2a). Editor-surface only, so it needs an editor session to see |
| Simple-surface cap lint (FR-37-27) | `GATE BUILT` — `check-simple-surface-cap.js` exists and is proven by negative control. `sgs/site-header` shows **7 default-visible controls against the P2 §5 DEFAULT of 3** — an advisory nudge toward the roster, **not a defect** (the ≤3 is a default, not a ceiling — see FR-37-27's 2026-07-23 correction). WARN-ONLY, exit 0, opt-in `--strict`; not wired into prebuild |
| Device-switcher a11y (FR-37-29) | `DEPLOYED (unexercised)` — shared `DeviceTabs` extracted; **fixes 21 blocks at once**. The framework already had a correct tablist in `ResponsiveOverride` (2 consumers) that the widely-used `ResponsiveControl` had never adopted — this was ADOPTION, not new design. Editor-surface only |
| Tri-state shape (FR-37-14) | `✅ BUILT + LIVE-VERIFIED 2026-07-28` (`e4bd72ef`+`eb255f06`) — all 4 behaviour attrs reshaped to tri-state objects on the canonical `resolveTier()` cascade; single-writer merged `@media` emission; rows unified onto `sgs_resolve_on_tiers()`; `sgs_resolve_tier_booleans()` DELETED |
| Scoped behaviour CSS (FR-37-15) | `DONE` (2026-08-19) — all FIVE behaviours are `#uid`-scoped per-tier CSS. sticky/transparent/shrink/hide-on-scroll via `sgs_emit_tier_rules()` (2026-07-28); `contrastSafe` via the new N-value `sgs_emit_tier_rules_map()` (2026-08-19, FR-37-44), retiring the last body-class rules |
| Empty the header template part (FR-37-6) | `PARTIAL` — file step DONE (`9b9a8028`) + orphan client pattern DELETED (`94ab240f`); only the per-site CPT authoring remains (§3.9a) |
| Starter library (FR-37-8) | `✅ DONE for header/footer` (D377, 2026-07-24) — 14 header/footer starters + 2 scratch shells scoped `core/post-content` + `Post Types:`, surfaced by the FR-37-7 native picker; applying one writes its tree to `post_content` (live-verified). Mega starters NOT-BUILT (Task 3) |
| Starter picker (FR-37-7) | `✅ BUILT + LIVE-VERIFIED for header/footer` (D377, 2026-07-24; **re-verified properly 2026-07-27, D393**) — WP's NATIVE "Choose a pattern" modal (no bespoke UI); new `sgs_header`/`sgs_footer` each open it with 8 preview cards + a "Start from scratch" card. ⚠ **D377's evidence was INVALID and is superseded:** it banked "chosen card writes the block tree to `post_content`" on the saved post carrying the right `metadata.patternName` — it did, while the tree BENEATH it had been overwritten by the container's own template (D393). The claim is now true, but only since `ae9b1db4`; the 2026-07-24 verification checked metadata, not children. Mega deferred to Task 3 (needs ≥2 mega starters). Custom React picker = non-blocking extension FR-37-36 |
| Starters survive insertion intact (D393) | `✅ FIXED + LIVE-VERIFIED 2026-07-27` (`ae9b1db4`) — `templateLock:'all'` made WP re-apply each container's own template on EVERY mount, overwriting inserted starters by ARRAY POSITION (`rowSlot` never consulted). **7/8 header + 8/8 footer starters were corrupted**, DESTROYING content (search bar, copyright line) and producing duplicate `rowSlot` values §3.3a called impossible. Fix = pass the template only into a genuinely empty container; lock unchanged. Measured 15/16 corrupt → **0/16**, raw-insert seeding intact, row-reorder lock still refuses an actual move |
| `sgs/responsive-logo` renders standalone (D394) | `✅ FIXED + LIVE-VERIFIED 2026-07-27` (`46749091`) — the block called two shared helpers with NO `require_once` (1 of 81; swept). Order-dependent fatal: fine when a sibling block loaded the helper first, HTTP 500 rendered alone (6/6). The immutable default header (FR-37-4) contains a logo, so clearing the active header could have white-screened the site |
| Preview before active (FR-37-41) | `✅ BUILT + LIVE-VERIFIED 2026-07-27` (`20ec422c`) — "Preview on site" row action renders an unpublished layout on the real homepage for a capable, nonce-bearing user. Overrides `get_active_id()` (not `render_active()`) so the BEHAVIOUR resolver previews too — proven: previewing 1655 emits `sgs-header-behaviour-hide-on-scroll-down`, active 1570 emits none. 4 negative controls incl. anonymous-with-valid-URL and a cross-post replayed nonce. No write path; `get_stored_id()` untouched. Closes residual B2 |
| Rules engine | `BUILT` |
| Legacy retirement (FR-37-21) | `✅ DONE` repo + canary (D362, `f1f86ea0`+`23a3cf63`) — adaptive-nav + mega-menu deleted; prod deploy in LEDGER |

---

## 6. Out of scope (the NOT list)

- **Nav internals** — Spec 36. This spec never describes a menu, dropdown, mega panel or drawer.
- **The header/footer clone walker** — "Spec 33 Part 2". ⚠ **See the ownership + direction note
  immediately below; that label is currently ownerless and its gating is widely mis-stated.**

> **"Spec 33 Part 2" is the specialised header/footer CLONING pipeline** — a separate, later
> consumer of this build's architecture, not this spec's own work and not a blocker on it. Only
> two items in Specs 36+37 genuinely wait on it: the branded-header sliver of FR-36-18, and
> FR-37-22. Everything else (including FR-36-15 and FR-36-25) is buildable now. Assigning Part 2
> a single named owner is a prerequisite before any Part 2 work starts.
- **The WP Customiser.** Spec 17's `§Customiser Migration` (Decision 21, Phase 5b) is
  **dropped, not deferred.** The classes it named never existed; Spec 17 itself marks that
  block "RETRACTED FICTION". Superseded by FR-37-1.
- **Block version bumps / `deprecated.js`** — pre-production policy, D270/D293.
- **Per-page-type CPT rule targeting** — see FR-37-20's limitation.

---

## 7. Constraints binding every FR

1. **No inline `style=""`** on any block in this spec (Spec 32).
2. **Composite-mirror (R-31-9 / D294)** — both containers are `containerKind: section`, so they
   keep `SGS_Container_Wrapper`; no per-block CSS that diverges from it. **Block-private
   rendering for header/footer was formally considered and REJECTED 2026-07-25** (6/6
   adversarial council; design gate
   `plans/archive/2026-07-25-header-footer-per-row-identity-design-gate.md` §0). The premise — that a
   private copy would escape an attribute-shape inconsistency — was false: that inconsistency
   lives in the block's own settings, not the shared engine, so a fork would copy the mess
   into more files. If a per-row effect ever needs a capability the engine lacks, ADD it to
   the engine. Do not re-open without new evidence.
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

1. **`labelCollapse`'s fate — RESOLVED 2026-07-23, RETAINED.** Full reasoning in §3.8. The
   cascade mechanism it would have deferred to is BUILT (D400/D405); the §3.8 feature that
   would consume it to hide equivalent elements per device remains open — revisit
   `labelCollapse` against it whenever that feature ships.
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
| `archive/2026-07-13-header-footer-nav-system-design-gate.md` | §3 roster, §4/§4b row model + Site Info, §6 drawer a11y, §8 responsive model, §9 never-overflow, §12 QC lanes |
| `archive/2026-07-18-P1-architecture-decision-header-footer-nav.md` | DP1–DP6 |
| `archive/2026-07-18-P2-builder-ux-design-gate.md` | the 29-item build roster + §2/§4/§5/§6 decisions |
| `2026-07-17-header-footer-nav-full-rebuild-strategic-plan.md` | phase scope, G1–G6 gates, risk register |
| `archive/2026-07-13-header-footer-container-design-gate.md` | FR-HF-1…6 |

Each row resolves to `CARRIED (FR-37-N)`, `MOVED (Spec 36 / 32 / 33 / 35)`, or
`RETIRED (reason)`. **Matrix output → `.claude/reports/2026-07-21-spec17-to-spec37-coverage.md`.**

**Then `/qc-council`**, checking both directions:
1. No hole or fabricated content in this spec — every claim traceable to code or a cited source.
2. No feature present in the corpus that has silently vanished.

Spec 17 is deleted, and its references repointed, **in the same commit** — only after both pass.

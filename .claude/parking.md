---
doc_type: parking
project: small-giants-wp
last_updated: 2026-06-13 (D222 — added P-CONVERTER-DE-LITERALISATION programme entry; no D222/D221/D220 work created resolvable parking entries — those shipped to main without pre-existing parked slots; Spec 30 COMPLETE but its follow-on parking entries (P-JSONLD-HEX-FLAG-GUARD, P-ORG-SCHEMA-SETTINGS-UI, P-VAT-ZERO-RATED-PRECISION) remain OPEN/DEFERRED)
---

> **STANDARD PRACTICE (Bean-locked 2026-06-02):** this doc holds ONLY parked work — entries with `**Status:** OPEN | PARTIAL | BLOCKED | DEFERRED`. The MOMENT a task is **CLOSED / RESOLVED / DROPPED / SUPERSEDED**, MOVE it (verbatim, with completion date) to `memory/parking-archive.md` — do NOT leave it here. Enforce this every `/handoff` (Gate 4.5). Keeps parking concise + purposeful; prevents the balloon that hit 1,400+ lines.


## 2026-07-20 (/handoff Gate 4.6) — LEDGER + decisions.md still over their size caps; 2 docscore checks are false positives

> **P-DOC-SIZE-AND-DOCSCORE-RESIDUALS** — NEW 2026-07-20. Gate 4.6 findings, triaged rather than blanket-fixed. **(1) LEDGER.md — PARTLY FIXED:** was 45,286 bytes / docscore 62.1% **D**; swept the completed setup-simplification track (P0–P6, ~20KB), the superseded P2/P2.5 history, Waves 0–3, and finished product-queue history into their `memory/session-*.md` + archived-plan homes, and added the canonical `Human Summary` / `State Snapshot` headings → **29,586 bytes / 94.3% A-**. Still ~5KB over the project's own 24,576 cap (the `ledger-rotate.py` Stop hook WARNS, does not block). Remaining bulk = the Wave-4 detail written this session, which is current and load-bearing; it becomes sweepable once Phase 1 closes. **✅ ITEM (1) NOW CLOSED 2026-07-20:** Phase 1 closed, so the Wave-0–4 narrative was swept verbatim to `memory/session-2026-07-20-11-spec36-phase1-close.md` and the LEDGER compressed to a summary + pointer. **LEDGER is now 24,547 bytes — UNDER the 24,576 cap for the first time — docscore 94.3% A-.** Also struck the stale deferral list, the deleted-Spec-34 pointers, and refreshed the D-ceiling/HEAD/WP-version/DB-count lines. **(2) decisions.md — 2,093 lines vs a 600 cap.** The project already has the remedy (archive retired/superseded entries to `memory/decisions-archive.md`, per `.claude/CLAUDE.md`); it has not been run in a while. Bounded, mechanical, not Bean-blocking. **Work:** an archive pass, ideally paired with `P-DECISIONS-BACKTAG` since both require reading each entry once. **(3) TWO docscore checks are FALSE POSITIVES — do NOT "fix" them:** (a) *"11 US spellings: organization"* in decisions.md — every hit is **`Organization`, the Schema.org type identifier** (`Org_Website_Schema`, `Organization`→`LocalBusiness` upgrade, `/#organization` `@id`). Anglicising it would BREAK the emitted JSON-LD, and third-party/API identifiers are already an explicit exception in `~/.claude/rules/uk-english.md`. (b) *"stub markers: TODO, TBD"* in decisions.md + LEDGER — these are **historical narrative inside an append-only log** ("cause is TBD" as of 2026-06-06; "durability TODO stands"), not placeholder stubs. A future handoff that "fixes" either is making the docs worse to raise a score — the `lean-beats-structural-theatre` failure mode. **Status: PARTIAL** · **Bucket:** Doc-ops · **Trigger:** Phase-1 close (LEDGER sweep) / a doc-hygiene session (decisions archive).

## 2026-07-20 (Spec 36 Wave 4) — canary homepage blows the CSS + JS page budget ~3.7× / 1.7× (NOT nav-caused)

> **P-CANARY-PAGE-WEIGHT-BUDGET** — NEW 2026-07-20. Measured live on the sandybrown homepage during the Wave-4 Gate-1 perf check (transferred bytes, zstd/br-compressed, 50 CSS+JS files): **CSS 371.2KB vs the CLAUDE.md 100KB budget (3.6× over); JS 84.0KB vs the 50KB budget (1.7× over). CLS is FINE — 0.0000 at 375, 0.0144 at 1440 (budget <0.1).** **The nav is a minority contributor and is NOT the cause** — nav-attributable JS is 17.3KB and its CSS is ~0 as a separate asset (it is lifted into the collected `uploads/sgs-css/` file per `sgs-block-css-is-lifted-not-inline`). Top offenders, measured: WooCommerce's own CSS **118.3KB** across 3 files (`woocommerce.css` 85.3 + `woocommerce-layout.css` 19.3 + `wc-blocks.css` 13.7) — i.e. **WooCommerce alone exceeds the entire CSS budget**; the theme's own `woocommerce.css` a further **46.5KB**; `core-blocks.css` 35.0KB + `core-blocks-critical.css` 12.9KB; the collected SGS block CSS 35.7KB; `extensions.css` 16.5KB; **jQuery 28.8KB** (a third of the JS budget — brought in by WooCommerce, NOT by SGS frontend code, so it does not breach the "no jQuery" rule, but it is the single largest JS item); WP's interactivity runtime 14.5KB. **One nav-adjacent waste worth a cheap win: `mega-menu-panels.css` (13.1KB) loads on the homepage although Phase 1 ships NO mega menu** (FR-36-5 is a later phase) — conditional-enqueue it and the CSS budget drops 13.1KB for zero functional change. **Work:** (a) conditionally enqueue mega-menu-panels.css; (b) audit whether WooCommerce CSS is needed on non-shop pages (WC enqueues globally by default — dequeue off shop/cart/checkout/account/product); (c) decide whether the 100KB/50KB budget is realistic for a WooCommerce site at all, or should be stated as an SGS-attributable budget excluding WC — the current number is unachievable while WC loads globally, so it reads as permanently-failing and gets ignored. **Status: OPEN** · **Bucket:** Performance · **Trigger:** a perf session; do NOT block Spec 36 Gate-1 on it (nav is not the cause and CLS passes).
## 2026-07-20 — nav-menu inspector: Bean reports the sidebar blanking on the Styles tab (NOT REPRODUCED)

> **P-TOKEN-LINT-INERT** — NEW 2026-07-21. `plugins/sgs-blocks/scripts/lints/token-lint.py` **checks nothing**. On `link-columns.html` — a draft full of `:root` custom properties — it reported *"All 0 declaration(s) already use registered tokens [mode=strict]"* and exited 0. It parsed **zero** declarations, so it would pass a draft made entirely of hardcoded hex. **Proven by hand-checking the same file and immediately finding `--on-primary` declared-but-unused**, which the authoring contract says gets silently dropped. **Consequence:** every token and contrast check across all EIGHT mega-menu panels this session was performed manually; the automated gate contributed nothing. This is the exact `negative-control-or-the-test-is-vacuous` class (D352) — a check that would still pass if the feature were absent. **What it should do:** (1) parse the inline `<style>` block, not just linked stylesheets — the likely root cause, unverified; (2) flag declared-but-unused tokens, weighting BRAND tokens (`--primary`/`--accent`/`--surface`) louder than spacing, because an unused brand token usually means the design defaulted; (3) verify every `var()` reference resolves to a token that exists in a real `sites/*/theme-snapshot.json`; (4) **cross-palette contrast** — every foreground/background pairing ≥4.5:1 (3:1 UI) against EVERY client snapshot, since this is the gate Bean's brand-colour concern actually rests on.
>
> **WORKED 2026-07-21 (`f0fe7b9d`) — legs 1 + 3 SHIPPED, 2 + 4 disposed of. Status now PARTIAL.**
> **Root cause PROVEN** (it was a hypothesis above, now evidenced): `token-lint.py:1941` routes any
> `.html` to `lint_html_inline_styles()`, which reads ONLY `style=""` attributes — the drafts put all
> CSS in a `<style>` block, so zero declarations were ever parsed. Measured on `link-columns-v3.html`:
> 0 `style=` attrs, 1 `<style>` block, ~118 declaration-shaped lines.
> — **Leg 1 DONE:** `_isolate_style_blocks()` blanks everything outside a stylesheet while preserving
>   newlines, so the existing CSS parser walks it with no line/col offset maths. All 11 drafts now read
>   **8–31 declarations each** (was 0 for all 11). Regression-guarded by a negative control that
>   reproduces the pre-fix inline-only path and asserts the new path reads strictly more (3 vs 1).
> — **Leg 3 DONE:** unresolved `var()` is a hard fail in strict mode, resolving against
>   document-declared custom properties OR the `--wp--preset--*`/`--wp--custom--*` names the theme +
>   merged variations generate. A fallback (`var(--typo,#fff)`) still counts as unresolved — the
>   fallback is what hides a typo. ⚠ **The prompt's cited example was STALE**: `--focus-ring` /
>   `--on-primary` are gone; all 11 drafts had 0 unresolved refs when checked
>   (STOP-VERIFY-A-DEFERRAL-BEFORE-EXECUTING-IT).
> — **Leg 2 NOT DONE** (Bean descoped): unused-brand-token weighting. Still genuinely open.
> — **Leg 4 REHOMED, not done here:** cross-palette contrast is a different job from token discovery
>   and became its own tool — see `P-MEGA-CONTRAST-DEFERRED`. Do NOT re-add it to token-lint.
> **Also surfaced, NOT fixed:** the drafts fail `--no-new-tokens` strict (25 violations on
> `link-columns-v3`) because they genuinely contain hardcoded dimensional values. True finding to
> triage, not a regression — colours are tokenised, spacing/typography partly are not.
> **Status: PARTIAL** · **Bucket:** Tooling · **Trigger:** leg 2 only, when unused-token detection is
> actually wanted; the inert-gate defect that made this urgent is CLOSED.

> **P-MEGA-CLIENT-REGISTER-UNLOCKED** — NEW 2026-07-21. The client-facing mega-panel STARTER set has no locked design register. Two exist and are both built: **A — Editorial Broadsheet** (dark inverted ground, radius 0, italic serif display; used by `link-columns-v3`, `photo-grid`, `split-aside-cta`) and **B — SGS Modern** (orange ground, 12–14px radius, Inter + JetBrains Mono; used by `browse-switch-sgs`, `info-box-sgs`, and approved by Bean for SGS's own site). **Five starter panels can only ship ONE language.** Asked directly 2026-07-21; Bean answered "neither — do it to fit Indus Foods", which correctly solved the logo-grid build (Register C, bespoke per-client) but **deliberately sidestepped the starter-set decision rather than settling it**. **RESOLVED 2026-07-21 — Bean ruling, entry moves to `memory/parking-archive.md` at next `/handoff`.** Bean settled it by DISSOLVING the choice rather than picking a register: *"Should take on the client's theme styles to start so it fits their brand. If their default fonts, colours, padding etc are like A, B or something else then it'll look like that."* Starter panels are **token-driven** — a panel declares its own `--primary`/`--surface`/`--text` and those are repointed at the CLIENT's tokens at build time, so the panel speaks whichever register that client's brand already speaks. There is no single starter language to choose. **Feasibility evidenced, not assumed:** 10 of 11 drafts carry ZERO raw colours outside their `:root` block, and client snapshots already supply same-named slugs (`primary`, `primary-dark`, `accent`, `surface`, `text-inverse`). **Status: RESOLVED** · **Bucket:** Framework.

> **P-PALETTE-TOKEN-VOCABULARY-SPLIT** — NEW 2026-07-21. Client snapshots use **two incompatible naming vocabularies** for the same colour role, which breaks token-driven inheritance for whichever half a draft is not written against. **A** (`text`, `text-muted`, `text-inverse`) — `helping-doctors`, `indus-foods`, `mamas-munches` (the 3 real clients). **B** (`text-primary`, `text-secondary`, `text-muted`, `text-inverse`) — `eye-care-ward-end` + the 4 `sgs-*` template palettes. The drafts declare `--text`, so on the 5 vocabulary-B clients that token does not resolve and the panel keeps the DRAFT's text colour instead of rebranding. ⚠ **Do NOT "fix" this by adding a `text` slug to the B palettes** — every client already HAS a body-text colour, so that would create a second name for an existing colour, and two names for one meaning drift apart on first edit. This was caught mid-session before being executed. Fix is a naming decision (standardise one vocabulary, or resolve aliases in the mapping layer), not a data addition. **Status: OPEN** · **Bucket:** Framework · **Trigger:** when starter templates are actually wired (Task 2) — until then no panel consumes these tokens and the split is inert.

> **P-MEGA-CONTRAST-DEFERRED** — NEW 2026-07-21. `plugins/sgs-blocks/scripts/nav-qa/palette-contrast-sweep.mjs` (BUILT, `1169060e`, warn-only per `d7985f10`) renders every draft against every client palette at 1440/375 and measures with axe-core. First run: **176 combinations, 496 findings, collapsing to 35 distinct CSS rules across 10 of 11 drafts** (`browse-switch-sgs` clean on all 8). **Bean ruled: change NOTHING — not the drafts, not the palettes.** *"Maybe the Mamas draft doesn't need a dark surface yet."* **The drafts are not defective** — `depth-stack` measures **7.46:1** on its own palette; failures track the client's ground luminance, not the design. `primary-dark` is a mid-pink on `mamas-munches` (`#c56a7a`, luminance 0.236 vs eye-care's 0.004), so a design that assumes a dark ground stops working there. Both problem clients ALREADY own a suitable colour (Mama's `#3a2e26` brown = 8.77:1 for their gold; `sgs-professional`'s `accent-light` `#F0E0EA` = 13.01:1 on their navy) — the gap is semantic (no token NAMED as the dark ground), not chromatic. **Status: DEFERRED** · **Bucket:** Framework · **Trigger:** when a mega panel is actually built FOR one of these clients — run the sweep then and decide per case. Speculative work until then.

> **P-MEGA-PATTERNS-UNMIGRATABLE** — NEW 2026-07-21. The 7 existing `theme/sgs-theme/patterns/mega-menu-*.php` layout patterns **cannot be migrated to CPT starter templates as-is** — analysed in full, verdicts 3× REUSE-WITH-FIXES / 4× REBUILD, **0× reuse-as-is**. Three shared blockers: (1) every `sgs/container` instance emits stale pre-D294 inline `style="…"` (they were never re-saved after the no-inline migration); (2) all 7 declare `Block Types: core/template-part/mega-menu`, scoping them to the template-part mechanism Spec 36 FR-36-5 supersedes, and none declares `Post Types: sgs_mega_menu` (which is what makes a pattern a CPT starter template); (3) six use `core/list`/`core/list-item` and **no `sgs/list` block exists** — `block-replacements.json` has no mapping, so the core-block detector does not even flag it. Separately: spec names **5** layouts but 7 patterns exist; `featured-promo` and `split-story-links` are hybrids straddling two layouts each — assessed **redundant, not missing value** (accounted for per STOP-29, not silently dropped). The FR-36-5 **DB registry for the 5 layouts does not exist** (checked all 39 `sgs-framework.db` tables; `patterns` holds the 7 slugs as ordinary theme patterns with no starter/CPT fields). Superseded in practice by the eight fresh drafts in `.claude/drafts/mega-menu/`. **Status: OPEN** · **Bucket:** Framework · **Trigger:** when drafts are converted to CPT starter templates — decide then whether the old 7 are deleted or left as inserter patterns.

> **P-NAV-STYLES-TAB-BLANKS-UNREPRODUCED** — NEW 2026-07-20. **Bean's report:** editing `sgs/nav-menu`, clicking the **Styles** column in the block settings makes the settings area "just disappear" in the sidebar, with no way back to the Settings column either. That symptom (panel blanks AND the tabs become unusable) reads as a React render throw caught by an error boundary. **NOT REPRODUCED — do not act on a cause, none is proven.** Attempted live on the sandybrown canary, logged in as `Claude`, Site Editor → header template part: selected each of the three nav blocks in turn (header `sgs/nav-menu`, the drawer's nested `sgs/nav-menu`, `sgs/nav-drawer`), clicked Styles on each — all rendered (inspector HTML 89,040 / 88,817 / 29,220 bytes, 4 tabs still present). Then force-expanded every collapsed `PanelBody` and enabled every hidden `ToolsPanelItem` to mount every control: panel grew to 129,684 bytes, **zero** console errors captured, no error-boundary text. The 9 console errors present are unrelated pre-existing `sgs/container` block-validation failures on other template parts. **Two untested variables (the honest gap):** (1) the plugin was REDEPLOYED ~40 min before the attempt (D352), so Bean's observation may predate the current build; (2) only the Site-Editor surface was tried — a page-editor instance was not. **What would settle it in minutes:** the browser console's red text at the moment it blanks (F12 → Console), plus which surface and whether it blanks on the click itself or after interacting with a control. **Bean deprioritised 2026-07-20 ("ignore that now")** — logged so it is not lost, not because it is being worked. **Status: OPEN** · **Bucket:** Blocks/UI · **Trigger:** Bean reproducing it with a console capture, or the next nav inspector session.

## 2026-07-20 (Spec 35 Task 3) — nav-menu: separators between items not built

> **P-NAV-ITEM-SEPARATORS** — NEW 2026-07-20 (Bean-requested park). `sgs/nav-menu` has **no separator capability** — no divider between items, no attribute for one. Verified by grep: across the whole framework only `sgs/breadcrumbs` has a separator attr, and nav-menu's `style.css` carries no `border-right`/`::before` divider rule. Bean raised it alongside the underline rework and it is a REAL gap (vertical dividers between links are standard in utility bars, footer navs and editorial headers), but it was deliberately scoped OUT of the hover work: separators are a distinct ELEMENT under the Spec 35 element-first model, not a state of the link, so they earn their own panel and do not touch the hover code. **Work:** add a `separator` element — `separatorStyle` (none | line | dot), `separatorColour`, `separatorThickness`, `separatorHeight` — rendered as a `::before` on `.sgs-nav-menu__item + .sgs-nav-menu__item` (adjacent-sibling so the first item has none), suppressed on the featured item and inside the drawer's stacked layout (where a horizontal rule reads as a divider, not a separator). Per the element-first standard it becomes its OWN inspector panel with its own Normal/Hover state toggle if a hover colour is wanted. **Note:** unlike the underline, a separator usually does NOT react to hover — the item reacts, the separator stays static; do not add a hover state reflexively. **Status: OPEN** · **Bucket:** Blocks/UI · **Trigger:** next nav/Spec-35 session, or the first client draft that uses a separated nav.

## 2026-07-20 (Spec 35 Task 3) — header nav and drawer nav are two instances configured independently

> **P-NAV-INSTANCE-CONFIG-DUPLICATION** — NEW 2026-07-20 (surfaced by Bean asking whether the hover fix covers the drawer too). It does — measured live, both instances on the canary emit the full underline/hover CSS (`sgs-nav-menu-117acfb5` = header bar, `sgs-nav-menu-844b2c1d` = inside the drawer, both with `::after` bar rules). **But they are two separate block instances with two separate attribute sets**, so every colour, radius and hover setting must be configured TWICE to keep the bar and the drawer consistent. Today both render identically only because both sit on defaults — the moment an operator styles the header, the drawer silently diverges. This is a client-experience defect under the "clients are tech-illiterate" rule: nothing in the editor tells them a second copy exists. **Work (needs a design call, do not build blind):** options are (a) the drawer's nav-menu INHERITS the header's styling attrs unless explicitly overridden (needs a defined source-of-truth instance and an override affordance), (b) a shared style preset both instances reference, or (c) accept the duplication and add an inspector notice on the drawer's instance pointing at the header's. **(a) is the client-friendliest but the highest blast radius** — it introduces cross-instance attribute inheritance, which no other SGS block does, so it is design-gate territory, not a quick fix. **Status: OPEN** · **Bucket:** Blocks/UI · **Trigger:** next nav session, or the first client who styles a nav and reports the drawer looking wrong.

## 2026-07-20 (D351) — nav featured item: HOVER still diverges from the draft (rest matches)

> **P-NAV-FEATURED-HOVER-DRAFT-PARITY** — NEW 2026-07-20. The featured nav item's RESTING state now matches the Mama's draft (pink pill, dark text, weight 600, 8px radius — D351). **Hover does not.** Draft: background stays `--primary` + `box-shadow: inset 0 -2px 0 var(--accent)` + **no underline**. Live: pill retained but `text-decoration: underline` and `box-shadow: none`. **Cause (read from the emitted CSS, not inferred):** `render.php` §4c emits the generic hover rule for `.sgs-nav-menu__link:hover` at (0,3,0); with no `itemHoverColour` set it takes the `else` branch → `text-decoration:underline`. The featured rule is also (0,3,0) and emitted later, so its colour/background win, but `text-decoration` doesn't conflict so the underline still applies. The draft's accent hover-underline is an **inset box-shadow**, for which the block has no attribute. **Work:** (a) suppress the generic underline fallback when the featured pill is active (it already has a visible hover affordance — the pill), and (b) decide whether to add a featured hover-accent attribute or let the draft's inset shadow route to `sgsCustomCss`. **Bean-deferred 2026-07-20: hover is being reworked at the block level separately — do not fix here, it would collide.** ⚠ The featured item is NOT fully draft-faithful until this closes; `reports/visual-diff/nav-menu-2026-07-20.md` is PASS for rest only.
>
> **RECHECKED against source 2026-07-20 (Bean asked whether Track 1's hover work absorbed this). Two of the three parts are DONE; one is NOT — and it is narrower than this entry assumed:**
> - **(a) generic-underline clash — RESOLVED.** `render.php` now emits `$featured_sel . '::after{content:none;}'` with the comment "the featured item owns its own treatment — suppress the generic item underline bar on it so the two never render on top of each other." The described `text-decoration:underline` fallback is also gone: §4c now draws a real positioned `::after` bar, not `text-decoration`.
> - **(b) featured hover CONTROLS — BUILT.** `featuredColourHover`, `featuredBgHover`, `featuredRadiusHover`, `featuredFontWeightHover` are all declared in `block.json`, surfaced via a Normal/Hover `StateToggleControl` in the "Featured" panel (`edit.js:677`), and consumed in `render.php` (10 hits). So the answer to "did Track 1 build a hover toggle for the featured item" is **yes**.
> - **(c) STILL MISSING — the draft's inset accent bar.** Draft (`sites/mamas-munches/mockups/homepage/index.html:236`): `.sgs-header__nav-featured:hover { background: var(--primary) !important; color: var(--text) !important; box-shadow: inset 0 -2px 0 var(--accent); }`. The block has **no attribute able to carry that `box-shadow`** — `underlineColour/Thickness/Offset` drive the generic `::after` bar, which is explicitly suppressed on the featured item by (a). This is the **same missing-attribute class as D351/D338** (the converter has nowhere to put the draft's value, so it drops silently), not a policy gap. **Remaining work is now a single decision:** add a featured hover inset-bar attribute (mirroring how `featuredBg` closed D351) vs route it to `sgsCustomCss`. Precedent favours the attribute — D351 was exactly this shape and Bean approved the attribute.
>
> ⛔ **DO NOT FIX (c). Bean-locked 2026-07-20.** When offered the attribute, Bean declined: **this divergence is
> deliberately preserved as the TEST CASE for header cloning.** The draft carries a value the block cannot
> express, which is precisely the condition the header-clone pipeline must detect and handle — closing it by
> hand would delete the test fixture and leave the pipeline unproven against a known-real case. Adding
> `featuredInsetBarHover` (or routing to `sgsCustomCss`) is therefore **forbidden until header cloning is built
> and has been run against this item.** A future session finding "the featured hover doesn't match the draft"
> must NOT treat it as a bug to fix — it is a planted, documented control. Same reasoning class as
> `read-draft-before-designing-clone-fix`: the value is real, the gap is real, and the gap is the point.
> **Status: BLOCKED** (on header cloning being built — not on effort) · **Bucket:** Blocks/UI · **Trigger:** header-clone pipeline exists and can be tested against this item.

## 2026-07-20 (D351) — build-deploy verify passed on a deploy whose code never persisted (shared-canary race)

> **P-DEPLOY-VERIFY-NOT-CHANGE-SPECIFIC** + **P-CANARY-SHARED-DEPLOY-RACE** — NEW 2026-07-20. **What happened:** D351's fix deployed, was measured live and correct (~01:27 UTC), and a `verdict: PASS` visual-diff report was committed. At **01:36 UTC the canary was overwritten** by a co-active session's deploy carrying a build without the commit; Bean then saw the pre-fix rendering and reported it. Measured proof (not inferred): live `render.php` was 15,865 B / mtime 01:36 / md5 `ffdb6129…` vs local 17,462 B / 01:27 / `738c4558…`, with `grep -c featured_bg_hex` = 0 on the server. A co-active session was provably active in the shared worktree (uncommitted `lucide-icons.php` + 2 audit reports + a foreign `session-2026-07-20-2.md`). Restored by redeploying; server md5 now matches local exactly. **Two distinct gaps:** (1) **`build-deploy.py`'s verify leg cannot detect an absent change** — it asserts HTTP 200 + generic `wp-block-sgs`/`sgs-`/`wp-content` markers, all of which pass on ANY working SGS page including one running last week's code. Fix: have the deploy checksum a few deployed files against their local counterparts post-extract (cheap, deterministic, no page-content coupling), and/or accept an optional `--assert-contains <file>:<needle>`. (2) **A visual-diff `PASS` is point-in-time on a shared canary** and can be silently invalidated by another session; nothing detects the regression. Fix options: a deploy-ownership lock/marker file on the canary naming the last deployer + commit SHA (so a stale deploy is visible), or re-assert the report's key measurement at `/handoff`. **Status: OPEN** · **Bucket:** Tooling/gates · **Trigger:** next canary deploy, or any session where two tracks are co-active. **Related:** `recheck-branch-immediately-before-every-commit-on-shared-worktree`, `merge-to-main-via-isolated-worktree-when-shared` — same shared-worktree hazard family, new surface (deploy, not commit).

## 2026-07-20 (D351) — the visual-diff commit gate has a circular ordering for live-verified changes

> **P-VISUAL-GATE-ORDERING** — NEW 2026-07-20. The `.git/hooks/pre-commit` visual-diff gate requires `verdict: PASS` + `first_paint_capture_passed: true` in `reports/visual-diff/<block>-<date>.md` before a block's visual change may commit. But for any change verified on the LIVE canary, the AFTER measurement cannot exist at commit time: proving it requires a deploy, and `build-deploy.py` hard-blocks on an uncommitted tree (D336, correctly — `--allow-dirty` is what made D336 possible). So commit needs proof, proof needs deploy, deploy needs commit. **Today the only exits are both bad:** `--no-verify` (what D351 used, with a truthful `PENDING-DEPLOY` verdict + the loop closed later the same session) or writing `verdict: PASS` before it is true — and the 2026-07-17 nav-menu report shows the failure mode, a `DEPLOYED-PENDING-LIVE-EYEBALL` report whose eyeball was never done and became silent debt. **Work (options, needs a design call):** (a) gate accepts `verdict: PENDING-DEPLOY` for the FIRST commit and blocks the *next* commit touching that block until the file flips to PASS — turns the debt into a hard stop instead of a note; (b) split into a pre-commit check (report EXISTS + BEFORE captured) and a post-deploy check wired into `build-deploy.py`'s verify leg, which is where the AFTER evidence naturally lands; (c) allow the AFTER to come from a local render harness so no deploy is needed. **(b) looks strongest** — it puts each half of the proof where the evidence actually exists, and `build-deploy.py` already has a fail-closed verify leg to hang it on. **Status: OPEN** · **Bucket:** Tooling/gates · **Trigger:** next visual block change, or a gates-hygiene session.

## 2026-07-20 (D351) — block-uniformity audit's supports.color check is NAME-keyed; re-key it on the Spec 35 element manifest

> **P-AUDIT-COLOUR-ROLE-KEYED** — NEW 2026-07-20. `scripts/audit-block-uniformity.py` check 4 flags a block when any attribute NAME contains `"colour"` and the block lacks `supports.color`. This is name-keyed classification — the exact anti-pattern `route-by-role-not-hardcoded-property-list` + `dedup-by-identity-not-name` forbid — and it carries a **permanent false-positive class**: WP's `supports.color` only ever styles the BLOCK ROOT, so a PER-ELEMENT colour (a featured nav item's fill, a burger icon, an inner link) cannot be expressed as `supports.color` at all. Such blocks fail forever regardless of correctness, so `SUPPORTS_COLOR_EXEMPT` fills with LEGITIMATE entries until a real violation is indistinguishable from an exemption — the same graveyard failure the E11 note already forbids ("do NOT baseline a false positive — the governance is the fix"). It is also **too WEAK in the other direction**: an American-spelled `textColor` hand-rolled on a wrapper passes today, because the name doesn't match. **Work:** re-key check 4 on the Spec 35 element manifest (`supports.sgs.elements`, which already carries `isWrapper` + `attrMap` — verified live on `sgs/brand-strip` 2026-07-20): *a colour attr mapped to the WRAPPER element must use `supports.color`; a colour attr mapped to a non-wrapper element is block-owned and is never flagged.* Then empty `SUPPORTS_COLOR_EXEMPT` back to `set()`. **Blocked on manifest coverage only** — 1 of 79 blocks seeded at time of writing, filling as the Spec 35 rollout proceeds; the check should flip to manifest-keyed for manifested blocks and fall back to the name test for un-manifested ones, so it can land incrementally rather than waiting for 79/79. Interim state: `sgs/nav-menu` + `sgs/nav-drawer` exempted with per-element justification in the script comment (D351). **Status: OPEN** · **Bucket:** Tooling/gates · **Trigger:** Spec 35 manifest rollout reaching meaningful coverage, or the next block that trips this check.

## 2026-07-17 (P4 — LEDGER doc-model) — back-tag the historical decisions.md entries INCIDENT/ROUTINE

> **P-DECISIONS-BACKTAG** — NEW 2026-07-17. P4 established the `[INCIDENT]`/`[ROUTINE]` tagging convention on `decisions.md` (header comment) and tagged the recent worked-example cluster (D336–D342). The historical **D114–D337** entries (~177 headings) are NOT yet tagged — each needs a read-to-classify judgment (blanket-tagging would violate STOP-VERIFY-CONTENTS), so it was deliberately scoped out of the doc-model session rather than risk a bulk rewrite of an append-only log. `/handoff` applies the tag on write going forward, so the untagged set only shrinks. **Work:** a bounded pass (or a Haiku subagent per date-block) reading each entry and adding `[INCIDENT]` (load-bearing root-cause/correction — keep verbatim) or `[ROUTINE]` (ordinary ship — compressible/externalisable) after the `— ` in its heading; then externalise oversized ROUTINE entries as stub+link into `memory/decisions-archive.md`. **Status: OPEN** · **Bucket:** Doc-ops · **Trigger:** a low-priority doc-hygiene session (not Bean-blocking).

## 2026-07-16 (qc-council) — FR-31-2.1a closure: converter role-seeding still parses the attr NAME

> **P-FR-31-2.1A-CLOSURE** — NEW 2026-07-16. **Decision (Bean delegated to me as WP expert): the FR-31-2.1a violation is REAL but currently INERT — do NOT flip the reader in one shot.** The seeder `behavioural-analyser/assign-canonical.py::detect_role_from_block_json` derives `role` from an attr-NAME regex (`_ATTR_NAME_RULES` ~1029-1066), the exact name-parsing FR-31-2.1a forbids — but it produces CORRECT roles today (measured: 9/9 danger attrs correctly upgraded; converter suite 449 green). A naive "read the declaration first" fix REGRESSES 9 load-bearing attrs (`sgs/button.url` would take the button's label text as its href) because all 94 top-level block.json `"role"` declarations are the identical bulk value `content`. **⛔ CRITICAL, verified this session: block.json `"role":"content"` is WP 7.0's `contentOnly` PATTERN-EDITABILITY marker (WP core's own attribute property — see `P-WP7-PLATFORM-ALIGNMENT` item 1 below), NOT the converter vocabulary. It MUST stay `content` or the attr becomes non-editable in client patterns. So you CANNOT "correct" it to `link-href` — the converter role needs a SEPARATE SGS-OWNED channel.** SEQUENCED closure, gated by the NEW `scripts/audit-declared-vs-seeded-roles.py` (measures the gap: 5 AGREE / 36 NULL / 44 BENIGN / **9 DANGER**): **(1)** add an SGS-owned per-attr role channel (`supports.sgs.attrRoles: {url:"link-href", imageUrl:"image-object", …}`, parallel to the array-item `items.properties.<field>.role` channel, FR-31-2.5) declaring the specific converter role — WP core's `"role":"content"` untouched; **(2)** seeder reads that channel COLUMN-FIRST-ELSE-name-regex-fallback (D285 shape) + wire the audit `--check` to prebuild; **(3)** only once every derived role is declared there + the audit proves SGS-channel == seeded, flip the seeder to channel-first + DELETE `_ATTR_NAME_RULES`, verify live (R-31-11). The interim testimonial `quote`/`reviewerName` fix (committed `bacc0375`) used `ATTR_CLASSIFICATION_OVERRIDES` (FR-blessed, `decisions.md:329`) and does NOT close this. Spec: Spec 31 §13.3 FR-31-2.1a closure note. **Status: OPEN** · **Bucket:** Cloning pipeline · **Trigger:** a dedicated design-gated session (2 Opus raters split on urgency — forensics: leave it, spec-lawyer: mandated eventually; neither is Bean-blocking).

## 2026-07-15 — WordPress 7.0/7.1 platform-update action items (from the WP-updates research + sgs-wp-engine skill refresh)

> **P-WP7-PLATFORM-ALIGNMENT** — NEW 2026-07-15 (research session; full register with sources at `~/.claude/skills/sgs-wp-engine/references/wp-updates-2026.md`). Latest stable = WP **7.0.2** (both SGS sites verified on 7.0.2 by `wp core version`, 2026-07-20; this line read 7.0.1 from the 2026-07-15 research and had drifted). WP 7.1 final 19 Aug 2026. Five actions, roughly priority-ordered: **(1) `role: "content"` audit** — WP 7.0 makes `contentOnly` the DEFAULT for patterns; SGS block.json attrs without `"role": "content"` become non-editable inside patterns, silently locking client editing (violates the client-experience rule). Sweep every block.json's content-bearing attrs. **(2) apiVersion 3 audit** — WP enforces the iframed editor for block themes (7.0/7.1); every SGS block.json must be `apiVersion: 3` and editor CSS must survive iframing. **(3) theme.json breakpoints** — when WP 7.1's theme-configurable breakpoints schema lands (gutenberg #75707 / PR #79104), declare the SGS device tiers (mobile 767 / tablet 1023) in sgs-theme's theme.json so core visibility/responsive features align with the SGS device-tier system instead of core's 480/782 defaults. **(4) `sgsCustomCss` vs core per-instance Additional CSS** — core now ships a native per-block custom-CSS channel; decide adopt-or-document-the-split (until decided, keep emitting to `sgsCustomCss` only, never double-emit). **(5) Track C pairing-map candidates** — new core blocks Breadcrumbs, Icons, Tabs, Table of Contents, Playlist need pairing-map rows. Plus one ANTI-PATTERN flag already documented in the register: WP 7.1 Custom-HTML-block `innerContent` variations must never be used as a converter escape hatch (violates Rule 1 + R-31-15). **Status: OPEN** · **Bucket:** Framework / blocks · **Trigger:** items 1+2 = next block-quality pass; item 3 = WP 7.1 release (19 Aug 2026); items 4+5 = next cloning/Track-C session.

> **P-DEPLOY-TAR-SHIPS-PER-CLIENT-CSS** — NEW 2026-07-16 (found by the qc-council adversarial rater during the skill refresh; NOT fixed — deploy-path change = design-gate territory, and the blast radius is provably nil today, so this is a deliberate decision not a rush). `build-deploy.py:96` excludes `theme/sgs-theme/styles/*.json` but **not `*.css`**, so the gitignored per-client `theme/sgs-theme/styles/mamas-munches.css` (19KB) ships in the tarball to **whichever target you deploy — including `--target palestine-lives`**. It is invisible to every existing gate: the dirty check runs `git status --porcelain --untracked-files=no` (`:218` — ignores gitignored files) AND `DEPLOY_SKIP_PREFIXES` skips `theme/sgs-theme/styles/` (`:116`, comment "per-client snapshots, pushed separately" — which is exactly what is NOT happening for `.css`). **Why it's harmless right now (verified):** nothing in `theme/sgs-theme/**.php` enqueues `styles/*.css`, and WP block themes only read `.json` from `styles/` — it is an inert stowaway, not a live style leak. **Why it still matters:** one client's CSS physically lands on another client's server, and the exclude list contradicts its own stated intent. **Fix shape (one char):** `"theme/sgs-theme/styles/*"` instead of `"…/*.json"` — but decide first whether per-client `.css` should live in that folder at all (it's the last remnant of the retired variation system; `sites/<client>/theme-overrides.css` is the documented home). Also reconcile the docs: three skill docs said "styles/ is EMPTY by design" while this file sits there (wording corrected 2026-07-16). **Status: OPEN** · **Bucket:** Tooling / deploy · **Trigger:** next deploy-script or per-client-theming session.

> **P-SKILL-UPDATE-DB-SEEDS-RETIRED-TABLES** — NEW 2026-07-15 (found during the sgs-wp-engine skill refresh; NOT fixed — unproven blast radius, parked per prove-the-cause). `~/.claude/skills/sgs-wp-engine/scripts/update-db.py` still CREATES + SEEDS the retired `slot_synonyms` + `legacy_role_lookup` tables (`run_seed_slot_synonyms` / `run_seed_legacy_role_lookup`, always-run + idempotent, writing to BOTH sgs-framework.db paths) — tables replaced by `slots` + `roles` post-D99/D111. **Why it wasn't just deleted:** the script is LIVE — `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py:2953` invokes it as the register-tail `sgs_update_cmd` (dry-run default), and `populate-db.py` (which it imports) has its `CAPABILITY_RULES` cited by the converter's `db_lookup.py:892`. So "it seeds dead tables" ≠ "nothing reads them" — that needs proving before removal. **Work:** (1) grep every consumer of `slot_synonyms`/`legacy_role_lookup` across the plugin scripts + converter + gates; (2) if genuinely unread, strip both seeders from update-db.py; (3) decide whether the orchestrator's register tail should call the project's own `/sgs-update` (`sgs-update-v2.py`) instead of the skill-side legacy script at all — the two DB-reseed paths are a duplication that will drift. **Status: OPEN** · **Bucket:** Tooling / DB · **Trigger:** next `/sgs-update` or converter-DB session.

> **P-SGS-ENGINE-ENFORCE-GATE** — NEW 2026-07-15 (Bean decision during the skill refresh). The sgs-wp-engine skill's `hooks/enforce.py` is a no-op stub (`always pass`) while SKILL.md advertised a HARD GATE blocking framework-code edits without a `GROUND-TRUTH:` line. The claim is now honestly reworded to ADVISORY in SKILL.md; the real structural gate (PreToolUse hook checking for the GROUND-TRUTH line before SGS framework-code edits, + the SKILL-STATUS Stop-hook check) remains to be implemented and wired in settings.json. **Status: DEFERRED** (Bean chose fix-the-claim-now, implement-later) · **Bucket:** Tooling / enforcement · **Trigger:** next hooks/enforcement session.

## 2026-07-16 — sgs-framework.db PARTIAL-RESEED regression (root cause of the emoji + level gaps; PARTIALLY repaired, residue open)

> **P-DB-PARTIAL-RESEED-RESIDUE** — NEW 2026-07-16. **The two gaps parked on 2026-07-15 (`P-CONVERTER-EMOJI-AND-LEVEL-EMIT`) were NOT converter bugs — both are now FIXED and the entry is retired.** Two parallel root-cause traces (independently, both refuting the code-bug hypothesis) proved the CODE is correct and universal and was **starved of DB data**: `sgs-framework.db` was left in a **partially-reseeded state** (78 `blocks` rows re-created 2026-07-15; the post-`_run_canonical_assignment` Stage-1 sub-steps never ran). Measured: `role='tag-identity'` = **0 rows** (expected 2) → `tag_identity_attrs()` returned `{}` → assembly step 3a2 looped zero times → **every cloned heading rendered the block default h2** (the D280 zero-h1 defect class, silently re-opened); `role LIKE 'icon-%'` = **0 rows** (expected 4) → walk.py's `icon_bearing` leaf-gate was False → `run_mechanism_leaf`'s icon arm never ran → `resolve_icon_kind` (which exists + works, returns `('emoji','🌾')`) was **unreachable from every path** → silent emoji drop; **`emit_shape` NON-NULL = 1** (expected ~139) → the FR-31-2.6 per-attr content walk had no dispatch signal → broad content-lift failure.
> **REPAIRED this session (surgical, via the designated reseed-durable channel — no code carve-out, R-31-1/R-31-9 intact):** `_apply_attr_classification_overrides` re-applied (371 updates; restored tag-identity ×2 + icon-source roles ×4) + `_populate_emit_shape` re-seeded (**1 → 121**). Also FIXED a real source bug found by the trace: **2 DUPLICATE KEYS** in `ATTR_CLASSIFICATION_OVERRIDES` (`('sgs/icon','emojiChar')` + `('sgs/icon','iconName')` declared twice — Python last-wins **silently discarded** both `derived_selector` overrides that leg-1 `lift_scalar_content` needs); merged, AST-verified 174 keys / 0 dupes. **Verified on the REAL Mama's draft** (not synthetic): emoji → `{"emojiChar":"🌾","iconSource":"emoji"}`; `level` lands h2×5 + h3×6 across all 7 sections. Converter suite **54 failed → 26 failed / 423 passed**.
> **STILL OPEN (the residue — this is why the entry stays):** (a) **26 converter tests still RED**, incl. `test_variant_detect.py` (×3) + `test_hero_child_block_emits_content_attr`; (b) **`sgs/hero` still drops its whole `__content` column** on the real draft — h1 + label + sub-headline + both CTAs absent from the emit (hero emits only its `sgs/media` child), so **the real draft still clones with ZERO h1** even after the fix (`emit_shape` for hero `headline`/`label`/`subHeadline` IS now correctly `child`, so the break is downstream in the variant/grid-item path, NOT the seed); (c) `emit_shape` 121 vs the ~139 walk.py asserts. **Next action: run a FULL `/sgs-update` (all 10 stages — only 2 sub-steps were re-run by hand this session), then re-measure.** DB backup taken: `~/.claude/skills/sgs-wp-engine/sgs-framework.db.bak-tagidentity-20260715-235553`. **Status: PARTIAL** · **Bucket:** Cloning pipeline · **Trigger:** next converter session — this blocks clone fidelity on EVERY client.

> **P-DB-SEED-REGRESSION-GUARD** — NEW 2026-07-16 (structural defence, Bean Rule 10 — the cause-agnostic mitigation for the above). `_apply_attr_classification_overrides`'s docstring claims the overrides *"survive every /sgs-update"* — **empirically they did not**, and nothing failed loudly; the degradation was invisible until a clone was inspected by eye. Worse, `converter/tests/test_tag_identity_attrs.py` went RED against the regressed DB but its 4 "passing" tests passed **VACUOUSLY** (they assert `== {}`, trivially true when everything returns `{}`), and `test_assembly_wires_step_3a2` is a **source-text grep** for `"tag_identity_attrs"` — it never drives the emitter, which is why D280 shipped with no end-to-end assertion and a silent data regression produced green-ish output. **Build: (1)** a `/sgs-update` post-condition gate asserting every `ATTR_CLASSIFICATION_OVERRIDES` pair is present in `block_attributes` + `emit_shape` non-NULL count ≥ the expected floor + `role LIKE 'icon-%'` == 4 + `role='tag-identity'` == 2 — **fail the build loudly**, never silently degrade; **(2)** a duplicate-key AST check on `ATTR_CLASSIFICATION_OVERRIDES` (would have caught the 2 dupes above); **(3)** replace the vacuous tag-identity tests with a real `build_block_markup` call asserting `level` in the emitted markup for BOTH a section-root and a promoted child. **Status: OPEN** · **Bucket:** Tooling / gates · **Trigger:** pairs with P-DB-PARTIAL-RESEED-RESIDUE.

## 2026-07-16 (D341/D342) — Phase 2 nav/logo fixes shipped project-wide; Indus overflow found

> **P-INDUS-BRANDSTRIP-OVERFLOW-9PX** — NEW 2026-07-16. Live-verified post-merge on Indus (both canary and production, `main` `a693e0e8`): a pre-existing **9px horizontal overflow at BOTH 1000px and 1440px viewports** — width-independent, so NOT caused by this session's Phase-2 nav/logo work (the header itself sits within bounds at 1425<1440). Source: the decorative `sgs-brand-strip` marquee, which is already `overflow:hidden` on its own rule — the 9px is escaping some other property (likely a child's negative margin or an untransformed marquee-clone width; not yet root-caused). **Status: OPEN** · **Bucket:** Framework / blocks · **Trigger:** Goal 1 Indus header/footer work.

> **P-PHASE2-VISUAL-DIFF-REPORTS-DEFERRED** — NEW 2026-07-16. The `sgs/responsive-logo` `custom` logo-switch mode (D341) and the `sgs/adaptive-nav` tablet-tier collapse fix (D342) shipped project-wide to `main` (`a693e0e8`) and were **live-verified on both sites** (qc-council GO + Playwright checks), but without their per-block `reports/visual-diff/*.md` reports (STOP-67 discipline). Owed: `reports/visual-diff/{responsive-logo,adaptive-nav}-2026-07-16.md`. **Status: OPEN** · **Bucket:** Framework / blocks · **Trigger:** next visual-diff/reporting pass, or before either block is touched again.

## 2026-07-15 (D340) — sgs/modal scroll-lock carries the scrollbar-vanish bounce (latent — block not yet deployed)

> **P-MODAL-SCROLLBAR-GUTTER** — NEW D340. Comprehensive-fix sweep for the drawer's proven "bounce" cause found the SAME pattern in `sgs/modal`: `body.sgs-modal-scroll-locked { position: fixed }` (`modal/style.css:207-212`) collapses the document scrollbar, so on classic-scrollbar desktops the viewport widens ~15px mid-open — a centred modal shifts half that and the page behind the scrim jumps. **Latent, not live** (modal is "Built, needs build+deploy" per the block table; on no page today), so it cannot be live-verified — documented instead of blind-fixed (STOP-67). **Fix shape (proven on adaptive-nav, commit this session):** view.js gates on `window.innerWidth - document.documentElement.clientWidth > 0` and adds a class to `<html>` (e.g. `sgs-modal-scroll-locked-root`) whose CSS is `overflow-y: scroll`, removed on unlock — class-based to honour modal's Spec-32 no-inline idiom (adaptive-nav writes the same thing inline per its own existing lockScroll idiom). Verify live at desktop width with a classic scrollbar: modal geometry constant through the open animation. **Status: OPEN** · **Bucket:** Framework / blocks · **Trigger:** sgs/modal first deploy, or the Spectra-model drawer rework (same mechanism family).

> **P-UIMAX-DRAWER-LOGO-AUTODERIVE** — NEW D340. Research-backed enhancement, deliberately parked: when a client opts the drawer logo ON, auto-derive the head strip's bg/fg from the client's own header row (publish `--sgs-header-bg`/`--sgs-header-fg` from the existing `--sgs-header-height` ResizeObserver publisher; `drawerHeadBg` default `''` = auto → `var(--sgs-header-bg, fallback)`) — legible BY CONSTRUCTION because the header demonstrably renders that logo. ~1h incl. live verify; cosmetic (logos are WCAG-contrast-exempt, SC 1.4.3/1.4.11); no competitor does it (genuine gap). Full design in `workspace/memory/research/2026-07-15-drawer-logo-offcanvas.md`. **Status: DEFERRED** · **Bucket:** Framework / blocks · **Trigger:** a client flags the missing/illegible drawer logo, or the drawer rework touches the head row anyway.

## 2026-07-14 — doc-audit reconciliation follow-ups

> **P-NOINLINE-ROSTER-RECOUNT** — NEW 2026-07-14 (doc-audit reconciliation). Spec 32 §6.1's "~52 of 59 styling-support blocks remain" no-inline-migration estimate is stale — a quick 2026-07-14 grep found ~63/80 block folders already declaring `__experimentalSkipSerialization`, materially ahead of the cited estimate. Needs a proper re-scan (grep + DB cross-check against the roster in `.claude/plans/block-migration-DONE-checklist.md`) to produce an accurate remaining-work count before the next no-inline rollout wave is scoped. **Status: OPEN** · **Bucket:** Framework / blocks · **Trigger:** next no-inline rollout wave-scoping session.

## 2026-07-14 (D330) — cloning recogniser header-behaviour detector is stale (→ Spec 33 Part 2)

> **P-RECOGNISER-HEADER-BEHAVIOUR-MULTIFLAG** — NEW D330. `tools/recogniser/section_detector.py` (`detect_body_header_behaviour()`, `_VALID_HEADER_BEHAVIOURS={transparent,sticky,hide-on-scroll-down}`, `_HEADER_BEHAVIOUR_PREFIX="sgs-header-behaviour-"`) + `recogniser.py` (~L619) + `test_matchers.py::TestBodyHeaderBehaviourDetection` detect a mockup's SINGLE `sgs-header-behaviour-{slug}` body class and write ONE `sgs_header_rules` WP-option rule. This is now stale: FR-S9-9 (D330) made behaviour (a) INDEPENDENT multi-flags (sticky+transparent+shrink+contrast-X can co-exist), (b) sourced from `sgs/site-header` BLOCK ATTRS — the plugin no longer reads `sgs_header_rules` for behaviour. A re-clone must set block attrs, not the option. **This belongs to Spec 33 Part 2** (the header/footer clone pipeline) — update the recogniser to detect the multi-flag classes + write `sgs/site-header` block attrs (or drop the detector). **Status: DEFERRED** (Spec 33 Part 2) · **Bucket:** Cloning pipeline · **Trigger:** Spec 33 Part 2 build.

## 2026-07-13 (D326) — sgs/adaptive-nav P2b polish (deferred from the P2 ship)

> **P-ADAPTIVE-NAV-P2B** — NEW D326. `sgs/adaptive-nav` shipped + live-verified (WC injection gone, collapse, crawlable, drawer, mega-panel — see D326). Three enhancements were deliberately deferred (each a coordinated refactor of a working/sensitive block, not safe to rush at P2 close):
> **(1) Drawer accordion → drill-down animation.** The `sgs/mobile-nav` drawer renders submenus as accessible **accordions** today (functional; P0 re-parent fix live) — FR-S9-4's drill-down + back-link *slide* UX is a coordinated change to the recently-P0-fixed drawer `view.js` (481-line hand-rolled Popover module) + render markup + CSS. Deferred to avoid regressing the just-fixed drawer.
> **(2) `sgs/mega-menu` `role=menu` → APG disclosure alignment.** Its trigger is ALREADY a correct disclosure (`role=button` + `aria-expanded`); only the panel `role="menu"` deviates, and it is PAIRED with a full arrow-key roving keyboard model in its `view.js` (ArrowDown/Up/Left/Right). Aligning it = a coordinated render + keyboard-model refactor of a working block. adaptive-nav's OWN submenu→mega-panel path already uses the disclosure pattern correctly, so this is polish on the optional rich-content path. (mega-menu was re-parented to `sgs/adaptive-nav` this session; that part is done.)
> **(3) FR-S9-6 `{desktop,tablet,mobile}` responsive-override model — ✅ DONE (D327 engine + D328 close).** The shared engine was built (D327: `class-sgs-breakpoints.php` + `sgs_emit_responsive_css()`) + wired to all 3 row/nav blocks for gap/grid, then CLOSED D328 (box/width/link-font-size). Live-verified. This item is RESOLVED — items 1+2 below remain.
> **(1) Drawer accordion → drill-down animation** + **(2) `sgs/mega-menu` `role=menu` → APG disclosure alignment** remain OPEN (see the paragraphs above).
> **Status: PARTIAL** (item 3 done; items 1+2 open) · **Bucket:** Framework / blocks · **Trigger:** a dedicated P2b session.

## 2026-07-14 (D328) — SGS_Container_Wrapper has no style.border emission

> **P-WRAPPER-BORDER-EMIT** — NEW D328. The shared `SGS_Container_Wrapper` has ZERO `style.border` emission code (`grep 'border' = 0` in the wrapper). Blocks declaring `__experimentalBorder` with `__experimentalSkipSerialization` (site-header-row / site-footer-row / adaptive-nav + likely others) therefore never render their border — surfaced live when the footer bottom-bar's `style.border.top` (1px accent divider) computed to `0px none`. SkipSerialization means WP populates `style.border` but does NOT auto-inline it, so the wrapper must emit it via scoped CSS (like it does colour/padding) — and it doesn't. Universal fix = add a scoped `border-*` emitter to the wrapper (mirror the padding/colour path), OR drop SkipSerialization on border for blocks that don't need scoped border. Out of FR-S9-6 scope; affects every wrapper block that sets a border. **Status: OPEN** · **Bucket:** Framework / blocks · **Trigger:** a block-quality pass (or when a client build needs a visible header/footer divider).

## 2026-07-13 (D326) — movable drawer overflow drop-zone (Bean design, FR-S9-8)

> **P-DRAWER-MOVABLE-OVERFLOW-DROPZONE** — NEW D326 (Bean design call). Today the `sgs/mobile-nav` drawer renders its content in a FIXED zone order (logo → account → search → CTA → menu → custom InnerBlocks → socials → tagline), so the auto-rendered nav menu always lands in one baked-in position — the operator cannot reposition it relative to other drawer content. **Bean's requirement:** a **freely-movable overflow/menu drop-zone** — a placeable element the operator drags ANYWHERE in the drawer (top, bottom, or between any two things), and the nav menu (+ any items moved into the drawer) renders at THAT position. NOT a fixed "contact → menu → rest" order — fully positional, operator's choice each time. **Routing decision (Bean, option A):** the DESKTOP bar overflow keeps going to the in-bar "More" dropdown (desktop visitors don't open the drawer); the drop-zone governs the MOBILE DRAWER's menu placement only. This is the FR-S9-8 "move-to-drawer drop-zone" made positional. Implementation sketch: a marker block/InnerBlock (e.g. `sgs/nav-menu-slot`) the operator places in the drawer's editable content; the drawer renderer emits the resolved menu at the marker's position instead of its fixed zone. **Status: DEFERRED** · **Bucket:** Framework / blocks · **Trigger:** a drawer-composition pass (pairs naturally with the P2b drawer drill-down work, `P-ADAPTIVE-NAV-P2B` item 1).


## 2026-07-12 (D316) — 7 null-role scalar-styling attrs on mobile-nav + trust-bar are DEAD render paths (not seedable)

> **P-DEAD-NULL-ROLE-CONTROLS** — NEW D316 (the deferred C-type same-type sweep from D314). D314 documented `sgs/mobile-nav` (focus/active/sublink) + `sgs/trust-bar` (shapeDivider*) as null-`role`/null-`derived_selector` attrs needing per-attr verification before any role-seed (`enabling-a-capability-wakes-latent-misseeds`). **Verified this session — ALL 7 are DEAD render paths (STOP-44 fails for every one), so NONE were seeded** (seeding role would route a draft value into an attr that renders nothing — the exact D314 "schema-valid emitted attr is a render no-op" trap): **(1) trust-bar `shapeDividerTopColour`/`shapeDividerBottomColour`** — declared in `block.json` (:426/:446) only; `shapeDivider*` consumed NOWHERE in render.php or style.css (the whole shape-divider feature is declared-but-unbuilt). **(2) mobile-nav `focusColour`/`linkActiveColour`/`sublinkColour`** — render.php maps them to `--sgs-mn-focus`/`--sgs-mn-link-active`/`--sgs-mn-sublink-colour` (:171-175) but style.css NEVER reads those vars (`grep var(--sgs-mn-link-active|focus|sublink-colour)` = 0 hits); the sublink colour is hardcoded `rgba(255,255,255,0.92)` for WCAG contrast on the drawer bg (:529). **(3) mobile-nav `sublinkFontSize`/`sublinkFontWeight`** — not consumed in render.php at all; sublink font is hardcoded `1rem`/`600`. **Why the dead-control gate misses these:** `check-dead-controls.js` sees `$attributes['sublinkColour']` READ in render.php (mapped to a var) and marks it consumed — it can't follow the var into CSS to see the var is never used. **The correct fix is block-quality, NOT a cloning seed:** either WIRE each var into style.css (make the control actually work) or REMOVE the dead control + its editor UI. Until then these stay unseeded (a role-seed would create a phantom lift). **Status: DEFERRED** · **Bucket:** Framework / blocks · **Trigger:** a mobile-nav/trust-bar block-quality pass (wire-or-remove the 7 dead controls; consider extending the dead-control gate to follow attr→CSS-var→CSS consumption).

## 2026-07-11 (D305 close) — page-8 clone-fidelity discrepancy register (Bean-reported; root-cause programme for next session)

> **P-PAGE8-DISCREPANCY-REGISTER** — NEW 2026-07-11 (Bean's page-8 visual review after D304+D305). **NOT to be fixed piecemeal (Bean-directed):** root-cause EACH, find the UNIVERSAL fix aligned with Spec 31's relevant sections + rules, and ensure it does NOT resemble a Spec-31-listed cheat. Bean's meta-diagnosis: *"we haven't purged the hardcoded styles from our blocks completely"* — most of these are the D228 pattern (a framework default overriding the draft's faithfully-absent value), the same class fixed 3× this session (button flex-wrap / hero gap / heading text-wrap). Group by shared cause — likely ~3 universal causes, not 15 fixes. **Precondition: RE-CLONE page 8 first** (its headings pre-date D305; the baseline must be current). **The register:**
> **(A) Recurring BLACK BORDER — one universal cause, biggest ROI.** Borders render black in the clone but the draft uses the border token (`#E8D5C0`) or accent (`#F5D050`, the trial card's dashed border). Sections: featured product card, trial card (dashed but black), both gift cards, announcement-bar container, info boxes, testimonial cards, trustpilot bar. Candidate causes: safecss strips a functional border-colour value → currentColor/black (D302); OR border-colour never lifted; OR a block/wrapper default. Fix = universal border-colour transfer (Spec 31 §3.A).
> **(B) Card equal-height.** Product cards + both gift cards render different heights on some widths; the draft standardises them (card-grid items stretch to equal height). Bean: *"think it routed to sgs/container instead of card-grid"* and/or card-grid items not `align-items:stretch`. Root-cause the routing + the grid-item stretch (Spec 31 recognition + §13.6).
> **(C) Buttons.** Featured card button = white text / primary default (draft = black-on-token); Trial card button renders identical to featured when the draft is a SECONDARY style; Brand "Read The Full Story" = fixed-size left-aligned, draft = full-width centred; Announcement "Find out more" = missing the draft's underline hover. Root-cause: button preset / `inheritStyle` / width not transferred (D228).
> **(D) Component injected defaults (the D228 sweep).** Option-picker: a TICK MARK on the selected pill not in the draft; pills wider than draft (blank left space reserved for an UNSET colour swatch). Label highlight: trial "NEW? START HERE" should stretch full-width like the buttons; gift labels render a tight capsule vs the draft's padded rounded box. Info-box: text MARGINS injected that the draft lacks; info-box borders = cause (A). Disclaimer box: missing the white background box + border (same token as featured card); text first-line much longer than the draft's balanced 2 lines. Emojis SMALLER than the draft (ingredients feature-grid). Trustpilot bar TALLER than the draft. Root-cause each as an injected default; universal removal/gate.
> **(E) Brand-section spacing / line-height.** Bigger gaps between paragraphs + heading↔quote than the draft. MAY be the theme base line-height (`P-DRAFT-TOKEN-EXTRACTION-SETUP-PIPELINE`) — but VERIFY it isn't a separate injected margin before attributing it there.
> **(F) Inline-styles architecture (Bean's separate concern; Spec 32).** CSS still emitted INTO the HTML via assorted tags — `<style>`, style-id, section-style-class, div-style, section-style — rather than the DevTools Styles panel like the draft. Bean reads this as a cheat (CSS still inline, just relocated). Investigate vs Spec 32 §6.1: which are legitimate scoped `<style>` (the contract) vs genuine inline `style="…"` that must move. Distinguish precisely before changing anything.
> **Status: PARTIAL (D306, 2026-07-11)** · **Bucket:** Cloning pipeline / fidelity · **Trigger:** next session (9 remaining fixes). **DONE + LANDED (D306, `0908ff92`):** (A) all 8 black borders — WP-core style-engine drops `var:preset|color|` shorthand border-color (no `css_vars`); converter now emits direct `var(--wp--preset--color--{slug})`. (B) card equal-height + brand button full-width — `container.verticalAlign` default `start`→`''` (CSS-initial stretch, FR-31-5.1). **REMAINING (9 items, precise scopes in `.claude/reports/2026-07-11-page8-discrepancy-diagnosis.md`):** featured button white text (product-card CTA divergent channel), trial button preset (ctaPreset not lifted), emoji size (`iconSize.css_property=None` — seed `font-size`), disclaimer box (recognise as container, not sgs/text), gift/trial labels (pill-gated padding — set block-style + transfer CSS), brand+info-box margins (converter emits margins over `*{margin:0}` reset), announcement hover (add hover typography to shared helper + lift `:hover`), option-picker tick-space, trustpilot padding. **Bean's 3 architecture Qs answered** (Q1 pill-gating not a default; Q2 only hover typography missing; Q3 iconSize css_property unseeded). Full breakdown + STOP catalogue in `next-session-prompt.md`.

## 2026-07-11 (D304 reframe) — draft→theme-token extractor = the opening step of the header/footer setup pipeline (MERGES the effective-value lift + snapshot letter-spacing + header/footer temp-hack entries)

> **P-DRAFT-TOKEN-EXTRACTION-SETUP-PIPELINE** — NEW D304 (Bean-directed reframe of D303's `P-EFFECTIVE-VALUE-TYPOGRAPHY-LIFT`; MERGES the ex-`P-SNAPSHOT-ARBITRARY-LETTER-SPACING` + ex-`P-TEMP-HEADER-HIDE-REMOVAL`). **The core idea:** when the block pipeline is proven, the FIRST thing a clone run does is a **header/footer SETUP pipeline** whose opening step **mechanically extracts the draft's design tokens from `<head>` and writes them into the site's theme** (`theme-snapshot.json` → `theme.json` + `wp_global_styles`): the `:root` custom-props → `settings.color.palette` + custom tokens; the base `body`/`h1`/`h2`/`h3`/`a` rules → `styles.typography` + `styles.elements.*.typography` (font-family, size, weight, **line-height, letter-spacing**). Then **every block inherits the correct base BY CONSTRUCTION** — the D303 bug (theme base 18px/arbitrary letter-spacing vs draft base 16px/none) becomes impossible, because the theme base *is* the draft base. **Why this SUPERSEDES the ancestor-walk lift (ex-P-EFFECTIVE-VALUE):** that plan walked the draft ancestor chain to re-emit inherited letter-spacing/line-height onto EVERY leaf element (re-seeding all conformance goldens, high blast-radius, STOP-60). Extracting base typography into the theme achieves the same fidelity at the token layer with far less risk — a block only needs its OWN explicit typography lifted (already works), plus the correct theme base to inherit. **Residual the token layer does NOT cover (keep on radar, do NOT build the full walk for it):** an element inheriting from a NON-base intermediate ancestor (e.g. a section wrapper that sets its own `letter-spacing`, children inherit) — but that wrapper's value is EXPLICIT on the wrapper, so it's already lifted; token-extraction + existing explicit-lift covers essentially every real case. **Evidence the snapshot currently DRIFTS because it is hand-maintained not generated (D304 finding):** the Mama's snapshot's `h1` line-height is `1.15` but the draft says `h1,h2,h3{line-height:1.2}`; and it carried the arbitrary `h1 -0.022em`/`h2 -0.015em` letter-spacing D303 had to remove — a template-by-copy default copied IDENTICALLY into ALL 6 client snapshots (`sites/{mamas-munches,eye-care-ward-end,sgs-construction,sgs-healthcare,sgs-mosque}/theme-snapshot.json` + the `-typography-axis.json` variants). The orchestrator READS an existing per-client snapshot (`_resolve_snapshot`); nothing GENERATES it from the draft — the drift source. Mechanical extraction ends this drift class permanently (fixes the h1 1.15→1.2 + removes the arbitrary letter-spacing across all snapshots by construction). **Also folds in the header/footer temp-hack removal (ex-P-TEMP-HEADER-HIDE-REMOVAL):** commit `9a1bb252` deployed a TEMP CSS override in `sites/mamas-munches/theme-snapshot.json` hiding the malformed sticky header on canary page 144 — REMOVE it when this header/footer setup pipeline ships (it surfaces the mockup's intended sticky header properly). **Related (NOT absorbed — active converter colour tasks):** `P-DRAFT-CSSVAR-COLOUR-RESOLUTION` + `P-DRAFT-CSSVAR-SEED-READD` need the SAME `:root`-map parse this extractor produces (draft `var(--border)` → concrete hex → token-snap); wire them to consume the extractor's `:root` map rather than re-parsing. **Sequencing:** header/footer setup pipeline = the NEXT phase, once the block pipeline is proven (see archived `.claude/plans/archive/2026-05-24-phase-2-header-footer-cloner.md`). **Status: PARTIAL (D318, 2026-07-13 — Part 1 Pass A BUILT + live-proven on Mama's; commit `e0a73b04`).** The extractor `plugins/sgs-blocks/scripts/theme-extractor/` renders the draft, MEASURES computed values, and generates the theme's globals by construction — the h1 1.15→1.2 + arbitrary letter-spacing drift is dead on Mama's. **REMAINING (Phase 5-6, `.claude/plans/go-parallel-blum.md`):** (a) FR-33-12 orchestrator fail-closed freshness gate (extractor before ANY block clone); (b) FR-33-5 Pass B advisory derivation + FR-33-6 dark-theme safety; (c) FR-33-13 header/footer namespace reserve + re-point `P-DRAFT-CSSVAR-*` at the new `build_draft_root_token_map()` service; (d) **migrate the transitional component `styles.css` (buttons/hero-CTA/focus-ring) out of the Mama's snapshot into theme/block CSS** — carried forward at D318 to avoid regression, but the extractor emits global tokens/base only, so this CSS should not live in the snapshot; (e) roll out to the other 5 client snapshots (each behind its own reclone + parity, FR-33-11); (f) Part 2 = the header/footer CLONE (Spec 17). **Bucket:** Cloning pipeline / theming · **Trigger:** the Phase 5-6 continuation session (design-gate + `/qc-council` on the shared theming surface).

## 2026-07-10 (no-inline LAND session) — SGS patterns use CORE blocks instead of SGS blocks

> **P-PATTERNS-USE-CORE-BLOCKS** — NEW 2026-07-10 (Bean-surfaced during the no-inline LAND session). The no-inline BLOCK contract (Spec 32) is met — every SGS *block* now styles itself with zero inline (D300/D301 + this session's button-icon, option-picker-swatch, and shared-wrapper base-only gap/min-height/box-shadow/background fixes; 0 SGS-block inline live on page 8). BUT the page-8 scan surfaced inline styling in the FOOTER (`sgs-link-list` headings: `font-weight:700` + WP spacing-preset margins) — and the root cause is that **SGS-authored theme PATTERNS + PARTS use CORE blocks (`wp:heading`/`wp:paragraph`/`wp:list`) instead of SGS blocks (`sgs/heading`/`sgs/text`)**. WordPress core inlines its own block supports (`get_block_wrapper_attributes()`), so every core block in an SGS pattern leaks inline styling — breaking the no-inline rule even though no SGS block is at fault. **Bean's directive:** "Just because we're not converting it via the pipeline now doesn't mean the blocks for it should break the rules" — SGS patterns must be built from SGS blocks. **Scope (surveyed 2026-07-10):** ~40+ pattern/part files, hundreds of core heading/paragraph instances — `framework-footer-default.php` (40), the mega-menu parts (28/26/18/…), `testimonials-cards`/`services-features`/`team-section`/`pricing-columns`/`about-*`/`contact-form`/`faq-section`/all `footer-*` etc. **Not a find-replace:** each core heading/paragraph carries text + level + styling that must map onto the SGS block's attribute schema, then the pattern re-verified live. **Do it as a DEDICATED session:** (1) audit all patterns/parts for core-block usage; (2) convert `wp:heading`→`sgs/heading`, `wp:paragraph`→`sgs/text` (decide `wp:list`/`list-item` footer nav — likely `sgs/icon-list` or stays core-nav); (3) live-verify zero inline per pattern at 3 breakpoints; (4) consider a gate that flags a core styling-block inside an SGS pattern file. **Status: OPEN** · **Bucket:** Framework / blocks · **Trigger:** a dedicated SGS-pattern-modernisation session (Bean-prioritised the principle; parked here to avoid blowing the no-inline LAND session).

## 2026-07-10 (D300/D301) — INTEGRATION session: rollout-completion follow-ups

> **P-NO-INLINE-LAND-ROSTER** — NEW D300. The split-edit/serial-land INTEGRATION session MERGED all tracks + fixed the converter/hero/pill issues, but the rollout's OUTCOME is NOT fully hit: the ~35 newly-merged blocks (Tracks A–E block sets) are code-complete + build-green + the DB reseeded, but only spot-LANDED (wave-1 harness re-run + heading/info-box custom-value proof + the page-8 hero/pill/product-card). Still owed: run `node scripts/no-inline-land-verify.js <manifest>` across the FULL remaining roster (author asymmetric custom instances on page 1356 at 375/768/1440, zero-inline + computed box), write a `reports/visual-diff/<block>-<date>.md` per block (verdict PASS + first_paint true — STOP-67), then wire `audit-inline-styling.js --check` + `check-box-family-guard.py --check` into `package.json prebuild` as ZERO-TOLERANCE (Task 4). Blocks on page 8 (info-box/testimonial/cta-section/card-grid/feature-grid/trust-bar/product-card) re-clone + live-verify; the rest via page-1356 asymmetric instances. **Status: OPEN** · **Bucket:** Cloning pipeline / test-coverage · **Trigger:** the LAND-completion session (the main remaining work of the no-inline rollout).


> **P-CONTAINER-INLINE-GAP-CHECK** — NEW D300. The framework-wide live inline scan (page 8) found `sgs-container` emitting inline `gap:16px` (a real property declaration, not a `--var` value) on `.sgs-container--grid`/`--flex`/`.sgs-container__inner`. D296 scoped the shared wrapper's grid/flex CSS (STOP-68 closed) — so this is either a residual or a legitimate per-instance gap. Verify against D296: is the wrapper gap emission scoped or inline? If inline, it's a no-inline violation on an already-landed block that would FAIL the Task-4 zero-tolerance `audit-inline-styling` gate. (Most of the other 27 inline hits on page 8 are core WP / WooCommerce blocks, out of SGS scope.) **Status: OPEN** · **Bucket:** Cloning pipeline / fidelity · **Trigger:** before wiring the zero-tolerance inline gate (Task 4).

## 2026-07-10 (D298) — no-inline Wave 2: F3 gate-precision follow-up

> **P-F3-NAV-MISTAG-GATE** — NEW D298. During the mega-menu + mobile-nav no-inline migration, 3 `hardcoded-render-defaults-baseline.json` rows were found MIS-TAGGED (they are NOT dead-control-by-override, so the contract §E2 "drain to zero baseline rows" does not honestly apply): (1) **mega-menu `align-items: center`** + (2) **`align-items: flex-start`** baselined as `panelAlignment` debt — but all 15 `align-items` uses were traced and NONE are driven by `panelAlignment` (that attr drives left/right positioning via `sgs-mega-menu--align-*` classes); they are structural layout CSS. (3) **mobile-nav `max-width: 100vw`** baselined as `drawerMaxWidth` debt — but it is a universal viewport-overflow safety clamp on `.sgs-mobile-nav`, not an override of the drawer-width control (the REAL dead-control `width:min(85vw,400px)` WAS drained to `var()` this session). Force-wiring any of them onto the named control would silently change unrelated layout (the prove-the-cause anti-pattern). Bean-decided (2026-07-10): **defer** — leave them baselined (accepted-non-debt), and fix the GATE's attr↔property precision so `check-hardcoded-render-defaults` (a) does not flag structural CSS as a control-override when the property isn't actually governed by that attr's render path, and (b) stops counting a literal that only survives as a `var(--x, <literal>)` fallback default (the contract-sanctioned drain form — currently the gate still flags it). A fully-zeroed F3 row needs the default emitted from render.php, not left as the CSS var fallback. **Status: DEFERRED** · **Bucket:** Cloning pipeline / test-coverage · **Trigger:** a hardcoded-defaults gate-precision pass (or the Wave-4 F3-drain blocks content-collection/form/pricing-table/product-card, where the same var()-fallback question recurs).

## 2026-07-07 (D290) — L4 wiring SHIPPED; residual render-precedence + per-element extraction follow-ups


> **P-L4-PER-ELEMENT-EXTRACTION-FOLLOWUPS** — NEW D290. Step 3d is universal (fires for every named-BEM child of every block), which correctly populated hero/team-member/testimonial/trust-bar per-area attrs, but surfaced two tidy-ups: (1) **notice-banner `textFontSize` dead-write** — notice-banner's text is a child `sgs/text` (FR-22-6), so step 3d writes a dead PARENT `textFontSize` that render ignores (harmless; the real size lands on the child via the child branch). A block whose element is child-owned should route the element's CSS to the CHILD, not a dead parent per-area attr. (2) **sgsCustomCss multiple marker pairs** — when a block emits both a root residual (D289) and a per-area residual (D290), `sgsCustomCss` carries two `SGS-CONVERTER-RESIDUAL` marker pairs; harmless (custom-css.php emits verbatim) but weakens the "idempotent re-clone replace" claim (no consumer does marker-delimited replacement yet). **Status: OPEN** · **Bucket:** Cloning pipeline / fidelity · **Trigger:** a per-element-extraction refinement pass (low priority — both harmless).


> **P-RESPONSIVE-ROUTER-ROBUSTNESS** — NEW D289 (pre-existing, untriggered; documented in Spec 31 §3 F-fork + §13.4). Two hardening follow-ups the D289 whole-tier folding did NOT introduce and current mockups do NOT trigger: (1) a NO-WIDTH media condition (`@media print` / `prefers-color-scheme` / `orientation` / `prefers-reduced-motion`) whose selector matches a converted element folds into the SCREEN base for all tiers and is not captured as a residual (the fix: a no-width media type should be a passthrough residual, not folded — needs media-type awareness); (2) inverted-threshold `min-width` pairs on one property resolve by threshold, not CSS source-order. **D303 UPDATE (2026-07-10):** item (2) is largely subsumed by the D303 tier-confinement BOUNDING — a residual is now clipped to the device tier its threshold falls inside, so distinct-tier residual bands no longer overlap; only two residuals landing in the SAME tier can still collide (resolve by ascending emission order). Item (1) (no-width media condition) remains OPEN. **Status: PARTIAL** · **Bucket:** Cloning pipeline / fidelity · **Trigger:** router hardening (low priority — no mockup triggers either).

## 2026-07-06 (D286/D287, media + colour-var thread) — open follow-ups

> **P-DRAFT-CSSVAR-SEED-READD** — NEW D287. P-DRAFT-CSSVAR (the var-resolution FIX) is DONE (`fff4c475`): a draft `var(--X)` colour now resolves against the draft `:root` map + snaps to the theme token. BUT the ghost button is NOT visibly fixed yet, because it's preset-driven (`inheritStyle:outline` → primary border) and nothing currently LIFTS the draft's explicit `border-color:var(--border)` onto a `colourBorder` attr. The 2nd half = **re-add the button-colour SEED** (lift `border-color`/`background-color`/`color` → `colourBorder`/`colourBackground`/`colourText` via css_property overrides) — trialled + reverted at D281 precisely BECAUSE the var didn't resolve; P-DRAFT-CSSVAR now unblocks it. On re-add, verify the value is actually LIFTED onto the attr (STOP-61), the render reads + paints it (STOP-44), and it LANDS on page 8. Related: the existing `P-DRAFT-CSSVAR-COLOUR-RESOLUTION` entry (its resolver half is now the DONE D287; this entry tracks the remaining seed re-add). **Status: OPEN** · **Bucket:** Cloning pipeline / fidelity · **Trigger:** button-colour seed re-add (NOT the button-structure work next session — this is a converter colour-lift task).

> **P-HERO-SUB-MAXWIDTH-NESTED-CHILD** — NEW D287. Universality hole found probing insight-1: a per-element `max-width` on a NESTED TEXT CHILD inside a composite is DROPPED. Concrete: the hero sub (`.sgs-hero__sub{max-width:420px}` at ≥768) → `sgs/text` child; live page-8 shows `max-width:none` at 1440 (renders 450px, draft caps 420px). The destination attr EXISTS (`attr_for_layer_property('sgs/text','OUTER','max-width')→maxWidth`) and `sgs/text` render handles it (`text/render.php:241` `floatval`, no is_numeric drop) — so it's a CONVERTER routing gap: the composite's content routing never SETS `maxWidth` on the nested `sgs/text` child (confirm via the stored hero sub attrs). Max-width IS universal for container-equivalents (multi-button ✓) + atomic media (D286 ✓); it's specifically the nested-child-in-composite path that drops it. **Status: OPEN** · **Bucket:** Cloning pipeline / fidelity · **Trigger:** the container L1-L4 cascade session (Step 3/5, after the button work).

> **P-MEDIA-BRAND-GOLDEN-RESEED** — NEW D286. The `mamas-munches-homepage__brand` conformance golden is STALE from the D286 media emit change (now `borderRadius`/`height` vs the golden's `style.border.radius`/`maxHeight`) — an INTENDED + LANDED change (border-radius routes to the custom attr because `__experimentalBorder.radius:false`; `height` is the new fill attr). Needs a deliberate, per-section, LANDED-proof-cited re-seed (`tests/seed_conformance_goldens.py` re-seeds ALL 40 — STOP-60 — so isolate the brand emit + confirm it's the LANDED-correct output before committing the re-seed). Do NOT bundle with the 3 non-brand golden failures (product-card/option-picker/featured-product = the parallel scalarStylingLift/D284/D285 thread's debt, not this thread's). **Status: OPEN** · **Bucket:** Cloning pipeline / test-coverage · **Trigger:** a deliberate golden-reseed pass (my media debt).

## 2026-07-06 (D285, cloning thread) — scalar-styling-lift rollout: residual selector-drift (page-8 LANDED = DONE)


> **P-SCALAR-LIFT-RESIDUAL-DRIFT** — NEW D285, PARTIAL. render-verified drift fixes SHIPPED: card-grid `__title/__subtitle`, quote `__attribution`, product-card `title*`→`__title` + `tag*`→`__tag`, option-picker `pill*`→`__pill` (all confirmed against the true render, STOP-43). **REMAINING (documented no-ops — not corruption, the lift just skips; deliberately NOT guessed):** (a) **mobile-nav** chrome colours (`drawerBg`/`closeButton*`/`cta*`/`secondaryCta*`/`backdropColour`/`accentColour`/`dividerColour`) are wrapper `--sgs-mn-*` CSS custom-properties with no clean 1:1 `__element` to read a draft value from — needs a design call on how a draft would express nav-chrome colours, not a selector guess; mobile-nav is absent from page 8 (unverifiable this session). (b) **product-card** `pill*`/`pickerLabel*` are LEGACY-DEAD (post-D284 the pills are the embedded child `sgs/option-picker`; product-card renders no pill element) and `cta*` styling is D284-owned (`sgs_button_element_style_css` on `__cta--primary`) — leave until the product-card/option-picker area settles, then retire or re-home. **Status: PARTIAL** · **Bucket:** Cloning pipeline / fidelity · **Trigger:** the mobile-nav design call, or product-card/option-picker settling.

## 2026-07-06 (D284, product-card front) — option-picker cloning + un-hardcoding follow-ups

> **P-PRODUCT-CARD-NAMED-PICKERS** — NEW D284. The product-card renders ONE pack-size option-picker from `packSizes` (Task 0, `995a02b6`). Bean deferred (until the cloning pipeline is complete): (a) an **optional NAME field** per picker (the draft doesn't use one, so it was dropped for the easiest setup); (b) **multiple named option-pickers** per card (flavour / topping / dietary — Mama's has 4 axes) via a repeater/multi-attr, not just pack size. **Status: DEFERRED** · **Bucket:** Block dev / fidelity · **Trigger:** post-cloning-pipeline-complete (Bean-gated, NOT a priority).

> **P-PACKSIZE-ACTIVE-DEFAULT** — NEW D284. The cloned option-picker renders with NO pre-selected pill; the draft's `--active` pill (e.g. 12-pack) is not lifted as `defaultSelected`. The array lifter (`array_content.py`) only lifts the pill's text (`label`); marking the active default needs reading the `--active` CSS **modifier** (a boolean-from-modifier mechanism the array resolver doesn't have). Low value (selectable-only). **Status: DEFERRED** · **Bucket:** Cloning pipeline / fidelity · **Trigger:** with the named-pickers work.

> **P-ARRAY-LIFT-LEAF-COLLISION** — NEW D284, from the Task-0 /qc-council. The new L1d leaf-text array lift is safe + universal, BUT `sgs/process-steps` and `sgs/hero.badges` declare 2–3 colliding `text-content` fields AND have NO conformance golden. If a draft ever authored a truly markup-free LEAF item for those blocks, L1d's first-declared field would claim the text (MISASSIGN, not over-lift — and strictly better than the pre-L1d behaviour, which lifted NOTHING). Not a regression; a latent edge. **To close:** add golden fixtures for a process-steps + a hero-badges draft. **Status: OPEN** · **Bucket:** Cloning pipeline / test-coverage · **Trigger:** next converter-test pass.

> **P-OPTIONPICKER-DUP-KEY** — NEW D284, from the Task-0 /qc-council. If two pack-size labels sanitise to the same key (e.g. "Large" and "large "), `sgs/option-picker` silently drops the 2nd (downstream first-occurrence-wins dedup). Low severity (pack sizes are normally distinct; no crash/corruption). Consider surfacing a duplicate-key editor notice. **Status: OPEN** · **Bucket:** Block dev / UX · **Trigger:** option-picker polish pass.

## 2026-07-06 (D283, block thread) — product-card bound-mode CTA editability LANDED-pending

> **P-PRODUCT-CARD-BOUND-CTA-LANDED** — NEW D283. The built-in product-card CTA gained preset-as-seed editable styling (`d7039a79`, `cta*` attrs + the shared `includes/helpers-button-style.php`), but it only applies to BOUND-mode CTAs (`.product-card__view`/`.product-card__add-to-cart`). Page 8's product-cards are TYPED-mode, so the new bound-mode editability is **code-reviewed + gate-green + plant-tested but NOT exercised on a live bound card**. Typed CTAs verified UNCHANGED on page 8 (no regression; the `:where(.product-card) .sgs-button` defaults preserve them). **To close:** clone/set up a WooCommerce-bound product-card, set a `cta*` value + Apply a preset in the editor, LANDED-verify the CTA restyles on the live DOM. Also: extend the shared helper to the other built-in-button blocks (buybox/whatsapp-cta) per the D283 handoff note. **Status: OPEN** · **Bucket:** Block dev / fidelity · **Trigger:** next bound-product session or the built-in-button extension.

## 2026-07-06 (cloning thread) — Bean's 9-defect page-8 visual QC batch (diagnosis-first, next session)

> **P-PAGE8-QC-BATCH-9** — NEW D281. Bean ran a visual QC pass on the live sandybrown page 8 and reported 9 defects. Run the DIAGNOSIS-FIRST flow next session: parallel read-only investigators root-cause all 9 against the live DOM + draft + extract artefacts, group by CONFIRMED cause, agree with Bean, then fix as a batch (do NOT fix piecemeal — memory `diagnosis-first-explain-agree-clear`). Register (grouped by likely cause):
>
> **⚠ CRITICAL DIAGNOSIS NOTE (Bean, 2026-07-06): several defects are ONLY visible with the D2 / HTML-insert block DELETED** — Bean QC's by deleting D2 (his STOP-52 test), because a D2-DEPENDENCY defect looks FINE with D2 present (D2 is painting it) and only breaks when D2 is gone. **Confirmed D2-deletion-visible: #7 (ingredients centring — D2 `.sgs-ingredients-section__inner{text-align:center}`) and #8 (emoji size — D2 `.sgs-info-box__icon{font-size:32px}`); LIKELY also #1 (container gap), #5 (brand image — D2 `.sgs-brand__image` rules), #9 (testimonial bg).** These are NOT render bugs — they are the STOP-52 D2-dependency class: the draft rule is stranded in D2, never lifted to a block setting, so the page DEPENDS on D2 for it. **To diagnose them you MUST compare the D2-PRESENT vs D2-DELETED live states** (delete the D2 `wp:html` block, or diff `variation-d0-d2.css` against what the blocks emit) — else they're invisible. Their fix = LIFT the stranded rule to a block attr/setting (the D2-emptying workstreams: band text-align fold FR-31-5.1a, icon font-size lift, container gap, etc.), NOT a cosmetic patch. Defects that ARE visible with D2 present (genuine fidelity/block bugs): #2 hover, #3 product-card, #4 hero split padding, #6 ghost button. Classify each defect D2-dependency-vs-genuine FIRST.
>
> **ROOT CAUSES PROVEN (D281, 2026-07-06, /systematic-debugging + 3 parallel read-only investigators, each fact-checked by main-session against code+DB+live DOM):**
> - **#1 container gaps = converter lift-routing BUG.** `converter/services/root_supports.py:356` — the `gap→style.spacing.blockGap` native-lift gate `_support_allows(supports,'spacing', sup_sub if sup_sub != style_path[-1] else None)` collapses to `None` for the gap rule (sup_sub=='blockGap'==style_path[-1]), so it checks "any spacing feature" not blockGap; `sgs/container` supports `{margin,padding}` (no blockGap) → wrongly TRUE → base gap consumed into a DEAD `style.spacing.blockGap` leaf (container declares no blockGap support; wrapper `class-sgs-container-wrapper.php:134` reads `$attributes['gap']`, not blockGap). Base gap never renders; responsive tiers escape by accident (`blockGapMobile` rejected by schema → falls through to grid resolver). Fix direction: gate must check `blockGap` specifically so gap falls to the `gap` string attr the wrapper reads.
> - **#4 hero split image padding = hardcoded default (D228) + lift miss.** `hero/style.css:62` `.sgs-hero--split{padding:36px 16px}` on the OUTER grid insets BOTH columns (draft pads only `.sgs-hero__content`, image flush); AND the converter emitted ZERO padding attrs (stage-4) so the draft content-padding never lifted to `contentPadding`. Live: `.sgs-hero--split`=36/16px, each column=0px. Fix direction: gate/remove the hardcoded base padding + lift draft content-padding to `contentPadding`.
> - **#9 testimonial cream surround = hardcoded block default (D228), no draft value.** `testimonial-slider/style.css:46` `.sgs-testimonial-slider__slide--card{background:var(--wp--preset--color--surface)}` (=#FBF3DC cream for Mama's) paints a cream rect around the white card; `cardStyle` defaulted to `"card"` (not emitted); draft has NO slide-wrapper bg. Live: slide--card=rgb(251,243,220), inner testimonial=white. Fix direction: gate/remove the hardcoded card-style surface default so the wrapper is transparent unless a value transfers.
> **Common thread: #4+#9 are the SAME "hardcoded wrapper default is a cheat to remove" class (D228); #1 is a distinct converter gate bug.**
>
> **STATUS (D281, 2026-07-06, `bb0d1a4a`):** **#9 FIXED + LANDED** (`__slide--card` bg → transparent; live: cream #FBF3DC → transparent, inner card still white). **#4 visible defect FIXED + LANDED** (hardcoded padding MOVED off `.sgs-hero--split` outer grid onto `.sgs-hero__content`; live: outer 36/16→0, image 0px flush, content padded). **STILL OPEN — the two deeper CONVERTER root causes** (the faithful-transfer fixes, so the values come from the DRAFT not a default): **L3 gap** — `root_supports.py:356` gate must check `blockGap` SPECIFICALLY (currently collapses to "any spacing feature" for the gap rule since sup_sub=='blockGap'==style_path[-1], so gap is wrongly consumed into a dead `style.spacing.blockGap` leaf before the grid resolver; container has no blockGap support, wrapper reads `gap`). CLEAN one-condition fix — but touches gap routing for every container block, needs a failing test. **L4 contentPadding** — the per-area (GRID_AREA) CSS extraction is NOT run on a composite's grid-areas: the hero split's `.sgs-hero__content{padding}` is extracted (28px in extract.json) + the contentPadding slots exist + `attr_for_area_property('sgs/hero','content','padding-top')→contentPaddingTop` resolves + grid_area.resolve is wired — but the declaration is never FED to grid_area.resolve, so leftover-buckets logs "no value extracted" for all 12 contentPadding slots. Deeper converter fix (wire per-area box-CSS extraction for composite grid-areas). Both queued.
> - **Group A (layer/wrapper CSS transfer):** (1) grid items inside `sgs/container` have NO gaps between them (container `gap` not applied); (4) hero `--split` variant image has padding around it top/sides/bottom — should be flush; (5) brand-section image not sized/formatted right (object-fit/max-height); (7) ingredients-section items left-aligned, should be CENTRED (band `text-align` fold FR-31-5.1a not landing — the `has-text-align-*` explicit-render class, STOP-44); (8) emojis (info-box icons) a bit too small (icon font-size lift).
> - **Group B (button colour/hover):** (2) "Find out more" ghost button doesn't underline text on hover (`textDecorationHover` + hover-routing, H1 blindness #3 — hover CSS stripped, never routed to the `*Hover` attrs); (6) "Read the full story" ghost button mis-styled — SEE `P-DRAFT-CSSVAR-COLOUR-RESOLUTION` (the draft `var(--border)` value doesn't resolve).
> - **Group C (composite blocks):** (3) product cards missing option-pickers + unequal height (configurator not emitted on the cloned card + equal-height flex on the grid); (9) testimonial-slider each testimonial has a YELLOW background around the quote box (a wrapper background being lifted/painted wrongly).
> **Status: OPEN** · **Bucket:** Cloning pipeline / fidelity · **Trigger:** next session (the queued QC-batch phase).

## 2026-07-06 (cloning thread) — draft CSS-variable colours don't resolve after lift (ghost button)

> **P-DRAFT-CSSVAR-COLOUR-RESOLUTION** — NEW D281. The declarative css_property column (D281, `256ec916`) correctly lifts a draft `border-color:var(--border)` onto `colourBorder`, but the lifted VALUE is the raw draft var `var(--border)`. The theme deploys that colour (#E8D5C0) as the token `--border-subtle`, NOT as a bare `--border`, so `var(--border)` doesn't resolve on the live page → falls to `currentColor` (a dark #3A2E26 ghost-button border, proven live 2026-07-05). `var(--primary)` happens to survive only because the theme also defines bare `--primary`. **Faithful fix (a converter FEATURE, not a patch):** before token-snap, resolve a draft `var(--X)` colour value against the draft's `:root` custom-property map (`--border → #E8D5C0`) → concrete colour → token-snap to the theme token (`border-subtle`). The `:root` map is in the raw extract (`extract.json` has the `--border:#E8D5C0` decl) but is NOT yet parsed into a structured map or plumbed into the converter's colour-lift path. This unblocks re-adding the button-colour SEED (colourBorder/colourBackground/colourText css_property overrides, trialled + reverted D281 — see sgs-update-v2.py deferral note). Also fixes QC defect #6. **RE-POINT (FR-33-13, D321 2026-07-13):** the structured `:root` parse this needs is now a BUILT, callable service — `token_map.build_draft_root_token_map(css)` (hex + non-hex + `var()`-chain resolution + fallback handling; the composed superset of the frozen hex-only `styling_helpers.build_draft_root_colour_map`). When this task is executed, CONSUME that service rather than re-parsing `:root`; same for `P-DRAFT-CSSVAR-SEED-READD`. **Status: OPEN** · **Bucket:** Cloning pipeline / fidelity · **Trigger:** the button-colour seed re-add, or QC-batch Group B. **Kept this session:** the sibling `sgs_colour_value` var() passthrough bug fix (`45ba7fa2`) — necessary but not sufficient (fixes the syntax mangling; the value still needs resolution).

## 2026-07-06 (cloning thread) — multi-button 768px button-wrap residual

> **P-MULTIBUTTON-768-WRAP** — NEW D281, found by the Track-B H6 fix (`8aa844d8`). At 768px the hero's two CTAs wrap onto separate lines because the buttons are slightly wider than the draft's equivalents — a button-SIZING issue, not flex-direction (the flex-direction is now correct: column<768 / row≥768). Out of scope for the H6 fix. **Status: OPEN** · **Bucket:** Cloning pipeline / fidelity · **Trigger:** button-sizing pass or the QC batch.

## 2026-07-05 (cloning thread) — post-programme QC findings — ALL 8 CLEARED (D278, same day)

> All 8 P-QC-* entries were CLEARED the same session (Bean-directed: explain + agree + clear, not park) — commits `a5161cc1` + `f31e1149`. Moved verbatim to `memory/parking-archive.md` with per-item outcomes. Notable outcomes: QC-1 downgraded (all NULL emit_shape rows are core/* by design; leg-2 gained the tracked-GAP guard); QC-3 tiebreaker DELETED not migrated (the cross-block tie never occurred in recorded history — FR-31-15 amended: dedupe then LOUD); the QC-8 array-role audit found + FIXED two real pre-existing drop bugs (card-grid.badge, hero.suffix). Accepted residual debt (trivial): the orchestrator `--converter-v2` CLI flag NAME (gates the single engine; rename when next touched).

## 2026-07-05 (tooling) — parity instrument samples the draft's base tier, not the viewport-applicable @media tier


## 2026-07-05 (docs) — decisions.md over line cap

> **P-DECISIONS-ROTATION** — decisions.md is 1,285 lines vs the 600-line docscore cap (Grade B-, flagged at the D276 handoff). Fix = the established archive-on-resolve rotation: move retired/superseded/non-load-bearing D-entries to `memory/decisions-archive.md` per the .claude/CLAUDE.md convention. **Status: OPEN** · **Bucket:** Tooling / docs · **Trigger:** next doc-maintenance pass (or when a session touches decisions.md heavily).

## 2026-07-04 (cloning thread) — Gate-A product-card residuals (EXECUTION Phase-5 stage-mapped)

> **P-GATE-A-CARD-RESIDUALS** — D279 UPDATE (2026-07-05): **(a) ctaText/ctaUrl RESOLVED** (identity-anchored foreign-node lift, commit `33069003`; A2 shrunk 5→4; text+href LANDED). **(e) imageAlt RESOLVED** (alt-companion lift `43c24194`; 0 empty alts live). **(b) packSizes pills DEFERRED by Bean** to the option-picker design discussion (the pills equivalent block is sgs/option-picker; design talk, not a fix — end of next session if scope allows). (c)+(d) were closed earlier. **Status: PARTIAL** (only (b) remains, Bean-deferred) · **Bucket:** Cloning pipeline · **Trigger:** option-picker design discussion.

## 2026-07-02 (docs) — D258 registry-wide doc-audit findings (3 read-only agents)

> **P-DOC-AUDIT-D258-DRIFT** — a full registry-wide audit (3 agents, 2026-07-02) found mostly PRE-EXISTING drift (unrelated to D258). HIGH-value fixed inline this session: CLAUDE.md cached-D254 line (uncached); Spec 31 §12 D258 build-state note; registry LIVE-plan pointer → W3. **STILL OPEN (mechanical + low-severity, bounded):** (a) **Spec 22→31 canonical-pointer sweep** — `architecture.md` (names Spec 22 canonical + D14-28 cite it), `cloning-pipeline-flow.md` + `cloning-pipeline-stages.md` (Spec 22 pointers throughout + banners stop at D241), `specs/21` line 117/92, `specs/29` §8/§9, `goals.md` L13/19, specs 17/19/20/26/27 `related`/`companion` — all should repoint to Spec 31 §13 (resolve via redirect today, nothing breaks). (b) **Count drift** — `architecture.md` + `stages.md` cite block_attributes 2935 (live **2819**), roles 21 (live **22**), capabilities 88 (live **83**), block_composition 197 (live 197 ✓) — verify vs `/sgs-db` + correct. (c) **`architecture.md`** L8 date 2026-06-13 stale + Known-Debt lists convert.py carve-outs as active (convert.py is FROZEN D229 — debt is in a to-be-replaced file). (d) **`stages.md`** L291-293/939 frames array lift as parked (`ARRAY_LIFT_PATTERNS`) — now DONE+LANDED (D258); L846 recogniser/name-heuristic guidance points at the REJECTED channel (FR-31-2.1a). (e) **Spec 29** L37/111 "Method-2 pending" contradicts live composite routing (frozen + new engine route `.sgs-hero`→`sgs/hero`). (f) **FR-31-2.5** (Spec 31 L553) not refreshed to name `array_item_schema.role`/declared roles (FR-31-2.5a layers on top — consistent, but the base clause is stale). (g) dead pointers: Spec 26 `references` cite absent specs 24/25; Spec 27 `related` cites `26-SGS-GLOBAL-STYLES.md` (real name `-AND-THEMING`); `WOOCOMMERCE-PAGE-TYPE-SOLUTION` D-8 "drop FAQ" reversed by D215. (h) **qc-council register** (`reports/2026-05-25-...`) reclassify Phase-1/cv2 historical — NOT the live register (that's `reports/2026-06-14-clone-vs-draft-defect-register.md`); its pixel-diff-as-goal framing superseded by R-31-4. (i) registry `last_updated` 2026-06-28 stale; Spec 31 registry NOTE omits D258; the 06-09 build-plan + sign-off-ledger frontmatter still say `status: ACTIVE` (superseded by W3). **Status: OPEN** · **Bucket:** Tooling / docs · **Trigger:** next doc-alignment pass (extends the older P-DOC-ALIGNMENT-12-DOCS). Full agent reports in this session's transcript.

## 2026-07-02 (cloning thread) — D258 array-lift follow-ups + carried-forward backlog

> **P-MINWIDTH-CROSSDEVICE-TIER** — **RESOLVED in code (D259) + LANDED page 8 (trust-bar 375=2/768=4/1440=4, Bean-confirmed); commit BLOCKED by Gate A + held from push.** Rebuilt `collect_css_decls_for_element` as a device-tier CASCADE (Spec 31 FR-31-5.2): sample the CSS cascade at Desktop 1440/Tablet 800/Mobile 375, Desktop→base, Tablet/Mobile→suffixed, min/max symmetric, inverts mobile-first into SGS desktop-base; non-device thresholds → non-silent F-ii log. Residual: resolve the Gate A golden-fixture regen (Task 0 next session) + push the held commit. **Status: PARTIAL** (core done+landed; commit/push held) · **Bucket:** Pipeline / converter · **Trigger:** Task 0 next session.
>
> **P-CONTAINER-TIER-COUNT-VS-BASE-TEMPLATE** (D270 review finding (b), non-blocking, UNREACHABLE-by-pipeline) — after D270, `SGS_Container_Wrapper` suppresses the tablet/mobile `sgs-cols-{tier}-N` count shorthand when a base `gridTemplateColumns` is set, so a hand-authored generic container that combines a base custom template + per-tier column COUNTS (no tier template) now inherits the base at tablet/mobile instead of the count. The independent review PROVED this is unreachable by BOTH converter engines (they always pair a tier count with its tier template) and by every shipped block-pattern; only reachable by manual inspector editing. The container inspector help text was updated per-breakpoint (D270, `409a47fc`) so it's no longer misleading. Residual (optional polish): hide the per-tier count control when a base template is set (mirroring how the desktop count is already inert). **Status: OPEN** (optional UX polish) · **Bucket:** Framework / blocks · **Trigger:** container-inspector UX pass.
>
> **P-FEATURE-GRID-EDITOR-PREVIEW-ASYMMETRIC** (D270 review finding (d), cosmetic) — feature-grid's editor CANVAS preview (`edit.js buildGridStyle`) now reads an explicit `gridTemplateColumns` (fixed D270 `be8e721e`), so symmetric + asymmetric templates preview correctly. No residual — noting for completeness that the editor preview is JS-side and independent of the frontend render. **Status: OPEN** (verify-only, likely close on next editor pass) · **Bucket:** Framework / blocks.
>
> **P-LOG-ACCURACY-DOUBT** (Bean 2026-07-03) — Bean rightly doubts the pipeline drop-logs: 2,380 `attribute_gap_candidates` rows + 227KB `leftover-buckets.json` for a clone visually close to the draft. `attribute_gap_candidates` is a CUMULATIVE ledger (accumulated across all runs, not this clone); the logs measure converter INPUT-side non-routing, NOT rendered fidelity — a value can be "emitted" per the logs yet render wrong (inherited base font, line-height, variant override). Do NOT trust the counts as a per-clone drop signal; the rendered computed-parity (matched by content) is the dependable signal. Investigate whether a per-run rendered-drop log is worth building. **Status: OPEN** · **Bucket:** Tooling · **Trigger:** parity-tool build.
>
> **P-RAWSVG-FILLED-VS-OUTLINE** (D258 live, Bean-clarified) — NOT about colour shade. Lucide icons (house etc.) are stroke-only OUTLINES (`fill:none`) so the badge circle shows through; the star is a FILLED shape. The trust-bar's 4th-badge star carried as a raw `<polygon>` SVG (iconSvg fallback ✓) but the block's icon CSS forces `fill:none; stroke:currentColor` on EVERY icon SVG uniformly, overriding the raw star to render as an outline instead of filled. Fix = expose a **client-facing block control** — a per-icon "fill style: outline / filled" setting in the trust-bar block editor (Bean 2026-07-02: EVERY pipeline capability must ship as a customisable theme/block feature for the clients buying these sites, not just a converter behaviour). The converter then sets that attr; render exempts a `filled` icon from the uniform `fill:none` lucide CSS. **Status: PARTIAL** — BUILT (D262, `017bf900`): per-icon `fillStyle`/`fillColour` control + `is_filled_glyph` converter auto-set; LANDED (star filled on page 8) pending the Task-4 re-clone (tracked in `P-INFOBOX-STAR-EMOJI-LANDED`). · **Bucket:** Framework / blocks.
>
> **P-FR3152-RESIDUAL-FAITHFULNESS** (D259 follow-ups — verified LATENT, none hit the in-scope Mama's homepage, so deferred to a clean boundary per STOP-19). A pre-commit adversarial council on the D259 device-tier cascade (`collect_css_decls_for_element`) surfaced 3 real-but-latent faithfulness gaps, each with a reproduced mechanism:
> - **(a) property-only-in-`min-width`, absent from base → narrower tier mis-inherits desktop (highest).** Repro: `{'.x':{'gap':'16px'}, '@media(min-width:768)::.x':{'grid-template-columns':'repeat(3,1fr)'}}` → base gets `repeat(3,1fr)` but NO Mobile override emitted → mobile inherits the desktop grid (draft has none <768). The override loop only iterates props PRESENT at a tier; it never resets a base-only prop to its CSS-initial for a narrower tier. NOT hit in-scope: every Mama's grid has a base `grid-template-columns`; the one instance (`.sgs-hero--desktop`, grid only ≥768) is `display:none` at base and the display override IS emitted, so the inherited grid is moot. Correct fix needs a faithful "unset/initial at tier" representation + render/grid-resolver support (verify before building — prove-the-cause).
> - **(b) media-path drops selector-specificity + cross-min/max source-order.** `matched_media` tuples carry only `(media_cond, decls)`, not the `(specificity, src_order)` the base path threads — so two rules under one breakpoint can let a generic selector last-win over a specific one (the exact corruption the base cascade was fixed for). Fix = thread `(specificity, src_order)` into `matched_media` and cascade by it. NOT hit in-scope (grids use single-class selectors per breakpoint).
> - **(c) minors:** the width regex `(\d+)` is unit-blind (`37.5em`→`37`) — SGS drafts are px so latent; and a `@media` declaration currently overrides an inline style on the same prop (real CSS gives inline precedence). Both low-frequency.
> **Status: OPEN** · **Bucket:** Pipeline / converter · **Trigger:** responsive-faithfulness hardening pass (INLINE — STOP-39). Full rater reports in this session's transcript.
>
> **P-PER-ITEM-CSS-DIVERGENT** (2c, general) — the broader case: a per-item element whose CSS differs from its siblings has no per-item destination on these array blocks, so it folds to the block default. Fix = add a per-item style field where it recurs (capability gap per FR-31-21.1), then wire `lift_styling_content` per matched item element. **Status: OPEN** · **Bucket:** Framework / blocks.
>
> **P-ARRAY-RECOGNITION-SCORING** (FR-31-2.5a) — `_find_item_nodes` picks the largest repeating group; strengthen to SCORE candidate groups against the block's declared item-field role signature (identity-based, like the other stages). Detection works today (root-inclusion fix, D258); this is robustness for ambiguous multi-group sections. **Status: OPEN** · **Bucket:** Pipeline / converter · **Trigger:** array hardening.
>
> **P-SINGLE-ITEM-ARRAYS** — structural item detection needs ≥2 repeating siblings; a 1-item array won't lift. Decide per spec (accept, or add a schema-signature single-item fallback). **Status: OPEN** · **Bucket:** Pipeline / converter.
>
> **P-INFOBOX-STAR-EMOJI-LANDED** — Task 3b (info-box emoji icon lift, D263 `31358f84`) + Task 2 (trust-bar star fill, D262) are BUILT + unit-verified but NOT LANDED. The LANDED gate (rendered on page 8) is the Task-4 re-clone; `31358f84` is held from push until then. **Status: PARTIAL** · **Bucket:** Pipeline / converter · **Trigger:** Task-4 re-clone.
>
> **Carry-forward reminder (D101):** the earlier backlog — product-card typed-mode Layer-B rebuild + cognitive-complexity lint on `array_content.py` + the P-CLONE-FIDELITY-FULL-ALIGNMENT families below — remains OPEN. (ingredient `__icon` emoji lift is now DONE, D263.) Do NOT drop these when writing the next handoff.

## 2026-07-01 (tooling) — memory-index maintenance (D254)

> **P-MEMORY-MD-COMPACT** — `.claude/projects/.../memory/MEMORY.md` autoload-cap maintenance (24576-byte cap; bottom entries risk silent drop). **TRIMMED 2026-07-04 (D270): moved the 2026-06-10…06-13 stubs → `MEMORY-archive.md`; now 20,038 bytes (~4.5KB headroom).** Recurs as new lessons accrue. Next trim: move the oldest still-autoloaded cluster (2026-06-16…06-18) once it approaches the cap; keep active cloning lessons. **Status: OPEN** (recurring) · **Bucket:** Tooling / docs · **Trigger:** when MEMORY.md > ~23KB or a memory rule silently fails to load.

## 2026-06-14 (cloning thread) — full clone-fidelity alignment + doc-alignment + product-page redesign (D226)

> **P-CLONE-FIDELITY-FULL-ALIGNMENT** — TOP NEXT TASK (Bean D226). The 55-issue ledger UNDERCOUNTS — Bean reports the full clone-vs-draft defect set is larger. Method: direct HTML diff of `sites/mamas-munches/mockups/homepage/current-clone-page-source.html` (the live clone, Bean-saved) vs `index.html` (the truth source) — content passes 100% so layer-matching is tractable. Named defect families: **2 class-section blocks (hero, cta-section) not resolving spacing — content-width, max-width, grid sizing, grid padding, alignment** (the biggest; converter still emits sgs/container not composites — Spec 29 Method-2 pending); product-card CSS; brand-section button + image styling; ingredients text-align (IN-E confirmed); grid items-per-row; disclaimer block styling; gift-card label styling; button padding; announcement-bar button styling; testimonial-slider double-nested container. Plus carry-over OPEN: H-C1 (wrong layer), FP-P (CTA stretch), BR-B (media-sideload), + 2 hero-sub inline-style bugs (`line-height:1.65unitless`, dup margin). **Method:** group by root-cause FAMILY (the 8-family map), fix universally, live-verify each per R-22-11. **Gating:** Rule-7 design-gate on shared-mechanism/converter changes; `/qc-council` per converter commit; BOTH conformance suites. **Status: OPEN** · **Bucket:** Pipeline / converter · **Trigger:** next cloning session after doc-read.
>
> **P-DOC-ALIGNMENT-12-DOCS** — NEW D226. The 12 canonical docs carry drift (3-agent audit, register `.claude/reports/2026-06-14-doc-alignment-audit.md`). Align DURING next session's comprehensive doc-read (read+fix one pass). CRITICAL (Bean-decisions): Spec 01 contentSize 1200-documented vs 780-live; Spec 11 button-presets admin PHP absent + CSS vars orphaned. Mechanical: count drift sweep (block_composition 197/31, slots-element 99, block_attributes 2935, class-section roster +trust-bar). Verify-before-edit: Spec 21 artefact claims (stage-7/css-d1-assignments/4i/4j) — grep the writer exists first. **Status: OPEN** · **Bucket:** Tooling / docs · **Trigger:** next-session doc-read.
>
> **P-PRODUCT-PAGE-REDESIGN** — NEW D226 (Bean). The product page design doesn't line up with cloning the draft product page. Specifics: the Trustpilot review block renders "stupidly large"; the content width is "really really tight unnecessarily" (ties to the Spec 01 contentSize 780 finding). **Status: DEFERRED** — AFTER clone-fidelity closes (Bean sequencing). **Bucket:** Framework / design · **Trigger:** post-fidelity design pass.

## 2026-06-14 (cloning thread) — Selector-seeding architecture + deferred design-gate phases

> **P-BLOCKJSON-SELECTOR-AUTOSEED** — TOP NEXT TASK (Bean-raised D225). Per-attr styling selectors (which draft BEM classes map to a styling attr) are currently hardcoded in `ATTR_CLASSIFICATION_OVERRIDES` (`sgs-update-v2.py`) for `canonical_slot`-populated rows — because assign-canonical (`:485` `WHERE canonical_slot IS NULL`) + the fingerprint channel BOTH skip those rows. Bean directive: selectors must be BLOCK-OWNED + AUTO-SEEDED (declared in `block.json`, same rails as `scalarStylingLift`/`variants`/`containerKind`; `/sgs-update` seeds `derived_selector` from it, covering canonical_slot-populated rows). Removes the hardcoded Python selector dict (R-22-1) + the triple-source drift (override dict / fingerprints.json / migration). Also audit the other `ATTR_CLASSIFICATION_OVERRIDES` selector entries (team-member / quoteStyle / ratingSize) for the same smell. **Gating (Rule 7 — seeding-pipeline blast radius):** design-gate + `/adversarial-council` BEFORE build; full `/sgs-update` reseed verify; both conformance suites. **Status: OPEN** · **Bucket:** Pipeline / seeding · **Trigger:** design pass. (nameFontWeight's hardcode was REVERTED D225 pending this; it still transfers for the fixture via the generic typography_css_to_attrs path.)
>
> **P-SPEC22-DESIGN-GATE-PHASES** — three Spec-22 "gaps" verify-first-confirmed (D225) as design-gate PHASES (NOT quick wires), each needs its own design session before build: **(a) FR-22-2.5 array→child wiring** — `array_item_slot_for` built (`db_lookup.py:2870`) but the per-item emit machinery (DOM traversal + emit_wp_block loop) is ABSENT + changes serialised structure (needs deprecated.js shims; target areas `has_inner_blocks=0`). **(b) FR-22-5.2 draft-driven breakpoints** — needs a tiering policy for arbitrary draft breakpoints + preserve `_BREAKPOINT_RULES`' suffix-validation role + coordinate two bucketing mechanisms (`convert.py:~5006` grid + `db_lookup.py:~1409` general). **(c) D1 layout-CSS sidecar** — deleted 2026-05-27; verify-first whether it's superseded by the name-free layer router BEFORE any rebuild. **Status: DEFERRED** · **Bucket:** Pipeline / converter · **Trigger:** per-phase design-gate.

## 2026-06-12 (theme thread) — Spec 30 P2 Step 9 (FR-30-9 schema) follow-ons

> **P-JSONLD-HEX-FLAG-GUARD** — build the structural prebuild gate `plugins/sgs-blocks/scripts/check-jsonld-hex-flags.js` (sibling of `check-dead-controls.js`, wired to `prebuild`): fail the build if any `wp_json_encode(...)` feeding a `<script type="application/ld+json">` lacks `JSON_HEX_TAG`. Would have auto-caught the accordion FAQPage XSS gap the adversarial-council found (R-22-12: gates are structural, not prompt). **Status: OPEN** — deferred from D215 §F10; ~20 min. **Bucket:** Framework. Surfaced 2026-06-12 (D215).
>
> **P-ORG-SCHEMA-SETTINGS-UI** — the new `Organization` emitter (`class-org-website-schema.php`) emits identity from data that already exists (name/url/logo/address/returns/shipping) but `sameAs` (social URLs) + `contactPoint` are SCOPED OUT because no operator option/UI exists (`sgs_org_schema` is absent codebase-wide). Build a WC Settings tab (or Site Identity panel) writing `sgs_org_schema` via `register_setting` with a recursive `sanitize_callback` (`esc_url_raw` per `sameAs` URL dropping non-http(s)/`javascript:`, `sanitize_text_field` on text) + `show_in_rest => false`; then wire `sameAs`/`contactPoint` into the emitter. Until then the Organization node is valid without them. **Status: OPEN** — deferred from D215 §F5; ~40 min. **Bucket:** Framework. Surfaced 2026-06-12 (D215).
>
> **P-VAT-ZERO-RATED-PRECISION** — the FR-30-9 VAT label gate (`class-llms-txt-products.php vat_suffix()`) is a simple store-level check (`woocommerce_calc_taxes==='yes'`). A VAT-registered seller of zero-rated goods (most groceries/bread, 0% VAT) with tax-calc on would still get "(inc. VAT)"; a VAT-registered seller with WC tax-calc off would get a bare label. Per-product precision = also check the product's effective tax rate (`WC_Tax::get_rates($product->get_tax_class())`). **Status: DEFERRED** (Bean chose the simple gate 2026-06-12; canary is `calc_taxes='no'`). Add as an FR-30-13 go-live verification item (confirm client VAT-registration state matches the label). **Bucket:** Framework. Surfaced 2026-06-12 (D215). See memory `inc-vat-not-default-gate-on-vat-registered`.

## 2026-06-11 — block-quality programme deferred follow-on

## 2026-06-11 (theme thread) — Spec 30 P2 Gate B shop-archive follow-ons

> **P-NO-GLOBAL-BUTTON-COMPONENT** — the framework has NO global `.btn`/`.btn-primary` style; those rules live ONLY in `plugins/sgs-blocks/src/blocks/product-card/style.css` scoped to `.product-card`. Surfaced when the shop filter toggle (`.sgs-shop-filters__toggle`) was given `btn btn-primary` classes per Bean's directive but matched zero rules outside a card — worked around by re-applying the same design TOKENS (`--wp--preset--color--primary` + `--sgs-product-card-btn-text` fallbacks) on the toggle. **Status: OPEN** — true class-level DRY needs the button definitions extracted to an unscoped theme utility partial (or `.btn` added as a global theme component) so any element can reuse the primary button look. Low priority (token-level reuse already gives the accessible result). **Bucket:** Framework. Surfaced 2026-06-11 (D213).
>
> **P-COLLAPSIBLE-TEXT-DEFAULT-COPY** — the framework `archive-product.html` ships its two `sgs/collapsible-text` SEO slots EMPTY (they render nothing) so no client copy is hardcoded into the shared framework template; per-client shop intro / SEO copy is added via the Site Editor. **Status: OPEN** (by design) — confirm the per-client onboarding flow documents seeding this copy; consider a sector-neutral default pattern operators clone. **Bucket:** Content. Surfaced 2026-06-11 (D213).

## 2026-06-10 — cloning thread: deferred composite-interior fix-shapes (adversarial-council NO-GO as standalone; folded into Stage-1 Commit 2/4 contracts)

> **P-PARENT-SCOPED-SLOTS** — `__item`/`__step` child-token collisions: accordion `__item` → info-box (should be accordion-item) AND **form `__step` → process-steps (should be form-step — confirmed second collision; forms ARE client-roadmap, so this has real value)**. **Status: DEFERRED** — 2026-06-10 4-persona adversarial-council: NO-GO as a standalone pre-commit; the mechanism IS Commit 2's slot resolution (build constraints written into `reports/wave2/STAGE1-DESIGN.md` Commit-2 contract: pure DB lookup keyed (parent_block, element_token), lru_cache purity, nearest-resolved-ancestor rule, precedence over global aliases, 18-pair audit, `card`-alias `"item"` hygiene). **Bucket:** Cloning pipeline.
>
> **P-ACCEPTS-ALLOWED-BLOCKS-POPULATION** — `block_composition.accepts_allowed_blocks` (the OPTIONAL-nesting column: blocks that MAY nest inside a parent without being dependent — distinct from `blocks.parent_block` forced parentage) EXISTS in the schema but is 0/29 populated; the allowedBlocks lists live in each block's `edit.js`, which `/sgs-update` doesn't scrape. **Status: OPEN** — add an edit.js allowedBlocks scraper stage to `/sgs-update`; once populated the column can sharpen Commit-2 interior resolution + validate emitted nesting (NOT a Commit-2 dependency — `blocks.parent_block` resolves both confirmed collisions alone). Bean-raised + DB-verified 2026-06-10. **Bucket:** Framework / DB.
>
> **P-INTERIOR-CHROME-FOLD** — render.php-built interior chrome must fold on clone: 5 blocks fold-only (testimonial-slider arrows/dots, gallery + post-grid chrome), 2 fold+extract (tabs `__nav`→`sgs/tab.label`, form `__steps` labels). **Status: DEFERRED** — council: zero active client drafts contain tabs/accordions (indus `role=tab` = slick-carousel dots); a name-keyed `chrome_elements` column is the D85/DEC-2 trap + conflates fold vs extract; interior fold = 4th-walker-exception territory needing an FR amendment or an FR-22-4.1 structural reframe. Constraints written into STAGE1-DESIGN.md Commit-4 area. Ships with/after Commit 4, never before Commit 2. Gate A goldens deliberately lock the CURRENT (known-wrong) accordion/tabs emits so drift is visible. **Bucket:** Cloning pipeline.

> **P-TESTIMONIAL-CONVERTER-FR2220** — NEW 2026-06-11 (D206); **PARTIAL 2026-06-12** (testimonial-empty universal-lift build — LIVE-VERIFIED). Root cause (D212): `block_composition.has_inner_blocks=1` was STALE for `sgs/testimonial` after the D8 typed rebuild → converter emitted child blocks the typed render.php ignores → empty slides on live page 8. **NOW BUILT + LIVE-VERIFIED (commits `75f2ffea` converter + `06d53e18` block-side):** flag flipped 1→0; the universal scalar-lift (`_lift_scalar_attrs_by_selector` in convert.py, G3-attrs path) routes the draft `__text`/`__quote` → `quote`, `__author` → `reviewerName`, `__stars` → `ratingStars`, driven by DB `derived_selector`+`role`+`attr_type`, gated on the `scalar-content-lift` `block_capabilities` opt-in (declared via `supports.sgs.scalarContentLift` in block.json; populated by `/sgs-update` Stage 1 — qc-council narrowed this from an over-broad ~50-block firing). Variant auto-detect picks `classic-card`. Re-cloned page 8 renders quote+name+5★ at 1440/768/~500 — **ledger SP-C/D/E CLOSED**. **STILL DEFERRED:** routing the OTHER typed fields (`__summary`/`__org`/`__logo`/`__work`/`__date`/avatar) — only quote/name/stars wired; and the full FR-22-20 variant-detection generalisation past hero+testimonial. **Status: PARTIAL** · **Bucket:** Pipeline / converter · **Trigger:** cloning Stage-2 routing wave.
>
> **P-TESTIMONIAL-LIFT-DATA-DURABILITY** — NEW 2026-06-12. The 3 testimonial content attrs' `role`+`derived_selector` (`quote`/`reviewerName`/`ratingStars`) were set by **direct SQL UPDATE** into the local `sgs-framework.db` (assign-canonical can't DERIVE `reviewerName→text-content` or `ratingStars→rating` from vocabulary, and skips `quote` because its canonical_slot is already non-NULL). A normal `/sgs-update` PRESERVES them (both writers only fill where NULL / never overwrite), but a **full from-scratch DB rebuild would LOSE them** → the lift silently no-ops → testimonial-empty regresses. The `has_inner_blocks=0` flip and the `scalar-content-lift` capability ARE source-reproducible (seed-composition-roles.py + block.json→/sgs-update); only these 3 selector/role rows are not. **Status: OPEN** — give them a durable source home: either a `tools/recogniser/data/fingerprints.json` selector-override entry (the channel assign-canonical reads) or a committed seed-script row. **Bucket:** Framework / DB · **Trigger:** before any full DB rebuild, or next cloning wave.

## 2026-06-10 — orphan work carried forward from archived plans (plans-folder consolidation)

> Seven plans were archived to `plans/archive/` this session (successive re-cuts of the cloning effort + 2 historical). A coverage pass (6 parallel agents + cross-model falsification) confirmed all their open work is already tracked in existing entries EXCEPT these 3 genuine orphans. The 4 existing entries that absorbed the rest (P-CONTAINER-WRAPPER-STANDARDISATION, P-FR226-NULL-SAVE-MIGRATION, P-FR2220-VARIANT-DETECTION, P-CLONE-PIPELINE-HEADER-FOOTER-HANDLER) were updated in place — no duplicates.

> **P-CONVERTER-UNIVERSALITY-FIXTURE** — from archived `2026-06-04-method2-converter-lift-PHASE-PLAN.md` Step 0. **Status: OPEN** — build a synthetic dogfood fixture (`sites/_dogfood/converter-lift-mockups/index.html`) exercising every §FR-22-21 CSS case the Mama's draft does NOT (full-bleed / capped / inner-grid / grandchild-grid / min-height-centred-and-not / composite-overlay / raw-px+token gap / shadow+border / clamp-calc-var / logical-props / unsupported-prop) as a permanent universality regression surface for converter work. **Bucket:** Testing / QA.

> **P-PARKING-SWEEP-CLOSEOUT** — from archived `2026-05-24-strategic-plan.md` Phase 3 (detail in `plans/archive/2026-05-24-phase-3-parking-sweep.md`). **Status: OPEN** — periodically drive the OPEN parking backlog toward zero (re-count live), excluding the skill-optimisation batch above. Now largely business-as-usual via the `/handoff` Gate-4.5 archive-on-resolve discipline; kept so the original Phase-3 intent isn't lost. **Bucket:** Process / housekeeping.

## 2026-06-10 — theme thread: FP-H/FP-E adversarial-council follow-ups (post-D204)

> **P-FP-COUNCIL** — NEW 2026-06-10 (from the 5-persona adversarial-council on the shipped FP-H/FP-E commerce layer). The confirmed security leak (draft/private products → public JSON-LD), the customer-facing deleted-product message, the double-query, and the doc-staleness were all FIXED in D204's council pass. These are the non-blocking residuals. **Status: DEFERRED.** **Bucket:** Framework / shop layer.
> - **P-FP-H-BRIDGE-RETIRE** — the typed-mode TRANSITION BRIDGE (echo `$content` for pre-FP-H page-144 clones) has no forcing function. Add `trigger_error(E_USER_NOTICE)` on the old path so its firing is observable, AND retire per the checklist in Spec 27 §"Transition bridge retirement" once page-144 re-clones with `productName` set. Convergent (Cynic + Spec-Lawyer). **Status: OPEN.**
> - Namespace the two global helpers `sgs_product_card_resolve_element()` / `sgs_product_card_override_active()` into `SGS\Blocks` (global-namespace collision risk; Cynic MF-2). **Status: DEFERRED** (touches the just-live-verified resolution path — do in a quiet round).
> - Extract the duplicated CTA-label + `visibleAxes`-sanitise logic (3 branches each) into shared helpers — `duplicated-calculation-drifts` class (Cynic SF-1/SF-4, Spec-Lawyer). **Status: DEFERRED.**
> - Out-of-stock: the non-variable branch button has no disabled/"Out of stock" state (Support M2). **Status: DEFERRED** (configurator-subsystem UX; the variable branch already seeds stock text).
> - Editor go-live checklist for non-coders + editor-side "product is draft/unavailable" notice (Support MISSING + M3 editor side). **Status: DEFERRED.**
> - Option-picker roving tabindex — keyboard focus passes through every pill before the CTA (Design-rater F12). **Status: DEFERRED** (purchase-critical third block; own gated round). `widthMode` wide/full vs B-rule precedence — pre-existing on both card variants; shared-wrapper change = Rule-7 design gate. **Status: BLOCKED** (needs Bean design-gate).
> - REFUTED by fact-check (NOT actionable): `_sgs_discount_label` "REST bypass" (the registered `sanitize_callback` IS the full validator — REST writes run it); the "missing hero / missing group-headers / price-not-updating" visual findings (artefacts of judging an interactive block from stills).

## 2026-06-09 — theme thread: P3 admin-UI deferred polish (post-D200 visual pass)

> **P-P3-ADMIN-POLISH** — NEW 2026-06-09 (from the D200 3-rater visual qc-council on the Spec 28 P3 admin UI; all blockers + WCAG failures were FIXED in `84899c2c` — these are the explicitly non-blocking residuals, full detail in `.claude/reports/visual-p3/VISUAL-PASS-REPORT-2026-06-09.md`). **Status: DEFERRED** (pending Bean's go/no-go on the sent screenshots). Items: WC two-column idiom refactor (use `woocommerce_wp_radio()`/`.options_group` instead of hand-rolled inline-block rows; bare h4 section treatment); 44px touch targets on radios/checkboxes/preview button (tablet admin use); emoji (⚠️/🔒) as secondary non-colour indicator is fragile on old OS/screen-readers; settings "Default pack sizes" comma-string → chip/tag input; persistent "preview only" admin notice near the WP Update button; "(approximate range)" callout on strength percentages. **Bucket:** Framework / shop layer.

## 2026-06-04 — theme thread: Spec 27 Phase 2 (D168)


> **P-BADGE-SLOT-ROUTE-TO-LABEL** — NEW 2026-06-04 (theme thread, alongside FR-27-B3). **Status: OPEN** (pipeline/converter — cloning thread). The `label` slot already routes to `sgs/label` and now recognises the cosmetic-badge family (`discount-label`/`discount-badge`/`value-badge`/`savings-label`/`sale-badge`/`ribbon-label` — added this session to `seed-slot-synonyms.py`; DB + Spec 02 regenerated; documented Spec 00 §3.1.1). **Remaining gap (narrowed 2026-06-07):** cosmetic-badge aliases shipped `07975d7e`; a SEPARATE `slots` row `badge` exists with `standalone_block = NULL` and alias `pill` — and `pill` ALSO lives on the `label` slot, so a bare `__badge` element routes nowhere and `pill` is ambiguous across two slots. Wiring the bare `badge` slot → `sgs/label` and de-duping the `pill` overlap is a recognition-ROUTING change (not a pure additive alias), so it needs the cloning thread's per-row `/sgs-clone --debug-trace` measurement gate (R-22-4) + a multi-DB audit (`feedback_comprehensive_db_audit_before_data_layer_changes`) to confirm it doesn't regress any client's clone. Deliberately NOT done inline in the theme thread. **Fix:** in the cloning thread, either set `badge` slot `standalone_block='sgs/label'` (and resolve which slot owns `pill`) or merge `badge` into `label`; re-measure page-144 + a second client before commit. **Bucket:** Pipeline / converter.

> **P-CONTAINER-WRAPPER-STANDARDISATION** — NEW 2026-06-02 (D152); **WS-1 A1+A2 SHIPPED 2026-06-03 (D159); WS-4 BLOCK-SIDE COMPLETE 2026-06-04 (D166+D167) — whole 29-block roster mirrors `sgs/container` via the shared helper (4 section / 14 layout / 11 content); modal + mobile-nav excluded `containerMirror:false`; content-collection registered as 29th; architecture resolved — docs-are-truth, KIND-scoped full mirror, no per-block trim; blub.db 312.** **Status: PARTIAL** (pipeline/converter — PROGRAMME). REMAINING: (a) **/sgs-update Stage-11 auto-apply** upgrade (§FR-22-21.2 — currently report-only); (b) the **post-WS-4 converter Method-2 work** (the block-side mirror does NOT fix page-clone fidelity — converter still routes `.sgs-hero` classes to `sgs/container` not the composite BLOCK @conf 0.10): the **routing fix** (`.sgs-hero`→`sgs/hero` before container fallback), the **converter-lift** (transfer mockup CSS onto now-mirrored attrs — memory `universal-lift-was-premature-not-falsified`), **#6 notice-banner content-synthesis**, **#4a grid-lift**, **image sideload (#5 + hero/product imgs)**, **#8 slider live-4-card residual verify**. (c) WS-2/WS-3 de-cheat debt.
>
> **PROGRESS (2026-06-07):** Block-layer standardisation advanced (NOT converter Method-2 — that remains the #1 next priority, unchanged). (a) **Gap consolidation SHIPPED** (commit `668e26ad`): every composite/wrapper block's duplicate gap control unified onto the ONE shared `ContainerWrapperControls` gap control (raw-px free-input via `sgs_container_gap_value()`); container `supports.spacing.blockGap` removed (the dual-control conflict is gone); 6 blocks consolidated (card-grid/feature-grid/gallery/multi-button/post-grid/trust-bar) with `deprecated.js` migrations; 6-persona `/adversarial-council`-gated + frontend-verified. **This delivers WS-1c A4 (raw-px gap).** (b) **Spec 29 created + registered** — canonical reference for the container-equivalent model (3-KIND section/layout/content map + roster + shared helper). (c) Residual gap edge-cases parked separately → see entry `P-GAP-CONSOLIDATION-FOLLOWUPS` below (layout/columns collision, responsive-gap half-wire, blockGap value migration, helper calc/clamp limit, tests). Unrelated but same session: 11-block icon-migration to the shared IconPicker + Stage 9 deploy-rollback fix + heading #130 fix (all shipped — not part of this programme, not parked).
>
> **PROGRESS (2026-06-04 PM, D167):** WS-4 BLOCK-SIDE COMPLETE. **hero SHIPPED** (commit `bacbde57` — section KIND, C3 double-emit guard, `overlayColour`→`backgroundOverlayColour` rename, split via extra_styles + `wrap_inner:false`; both variants render 0 fatals on live `do_blocks`). **product-card SHIPPED** (commits `f68bdc6f` + perf `82fd3b45` — content KIND, configurator preserved, verified on real page 589 with `sourceMode='wc'`; helper gained additive `extra_attr_html` opt). **mobile-nav EXCLUDED** (commit `391e6cb1` — `containerMirror:false`, Popover/dialog shell + own drawer model; same grounds as modal). **content-collection REGISTERED** (29th roster block, layout KIND — commit `40a9e03d`). **cta-section** = conforming SECTION reference (PASS). `/sgs-update` reconciled: block_attributes 2110→2739; roster 29; 0 orphans. STILL REMAINING: Stage-11 auto-apply upgrade + the full Method-2 converter work (next session).
>
> **PROGRESS (2026-06-03, D159):** **WS-1 A1 (contentWidth attr + guarded `__inner` render wrapper, guard `'' === $layout`) + A2 (slug-None section widthMode-from-own-max-width: absent→full/alignfull escapes the WP `:not(.alignfull)` 1200 cap, present→custom+customWidth; fold lifts folded `__inner` max-width→contentWidth) SHIPPED + live-DOM verified** (4 target sections 1200/inner-dropped → 1425 full-bleed / content 1040|960 centred; brand 1000 unchanged; hero/trust-bar unchanged). 3-rater /qc-council design-gate; visual-diff `reports/visual-diff/container-2026-06-03.md` PASS. **REMAINING WS-1c (NOT built):** A3 custom-width centring, A4 raw-px gap (`render.php:150`), A5 min-height, A6 gridItem*. **A7 likely MOOT** — `_lift_core_block_style` has ZERO call sites (dead code); A2 inlined its own max-width→widthMode logic, so the "fold must call _lift_core_block_style" framing is stale — verify before actioning. **WS-4 SHARPENED (Bean directive D159.2):** composites' built-in wrappers DRIFTED from `sgs/container` over time (each mirrors a different older version) — remove each composite's drifted wrapper, replace with an EXACT mirror of the current `sgs/container`, then add an `/sgs-update` step that walks `block_composition` and re-mirrors every composite's wrapper to the latest `sgs/container` on container update/version-bump. hero "forced-to-left-half" + trust-bar "badges-in-1-column" are drift symptoms.
>
> **PROGRESS (2026-06-03 PM, D163):** **WS-1c A3 + A4 built (UNCOMMITTED, build-clean + diff-verified, needs Gate-B visual-diff to commit):** A3 custom-width `margin-inline:auto` centring; A4 raw-px gap passthrough via new `sgs_container_gap_value()` (slug→var, "16px"→literal). **Composite-diff SCANNER ready** (`sync-container-wrapping-blocks.py` extended to deterministic MISSING/ADDED/ALTERED + INDEX roll-up — the WS-4 input; surfaced 29th block `sgs/content-collection` to register). **WS-4 SCOPE CONFIRMED = ALL ~29 composites KIND-scoped, NOT 4** (Bean corrected twice: SECTION 3 [modal excluded] + LAYOUT ~14 [incl content-collection] + CONTENT ~11 [incl product-card=#4b, notice-banner=#6]). **A5/A6 + the generic-lift idea CHANGED:** a "generic CSS→attr converter-lift" (to subsume A5/A6) was **FALSIFIED by a 3-rater /qc-council** — (a) wrong path: the only real min-height (hero 520px) is COMPOSITE-INTERIOR, not a slug-None container path → 0-delta no-op on canary; (b) blind DB-suffix fingerprint mis-maps (overloaded sgs/container suffixes — needs canonical_slot precision = a CURATED `_root_lift_rules` extension); (c) min-height `--has-min-height` flex-centre render-trap (align-gate needed). **A6** → folds into WS-4 as a lift-only, layout=grid-gated sub-mechanism with its OWN council (gift trial-card must not be clobbered). **A7 MOOT** confirmed. New STOP #47-50. **DEDUP AUDIT (Bean-inserted): NO block merges** — overlap is plumbing-level → shared helpers + the container-mirror; content-collection=register-not-merge; #6=notice-banner option-a; bloat is a mirror problem not a merge problem. See D163.
>
> **Scope — universal, not section-level.** This fix applies to every wrapper element in the draft HTML at any nesting depth, every `sgs/container` instance at any depth, and every composite block with a built-in `sgs/container` wrapper (all three KINDs: section/layout/content). The four Mama's Munches sections are the measurement gate, not the scope. Faithful transfer also covers a property's absence (no `max-width` → full-width, overriding the theme default).
>
> **Responsive min-height fork (carried from archived method2 plan A2, 2026-06-10):** when WS-1c A5 (container min-height) is built, decide how a draft's *responsive* min-height lands on `sgs/container` (base `minHeight` only): **A-collapse** (fall back to base when no responsive variant exists — recommended, smaller, minor infidelity) vs **A-responsive** (add `minHeightTablet/Mobile` + 28 mirrors — faithful, bigger).
>
> **5-workstream plan** (archived: `.claude/plans/archive/2026-06-02-container-wrapper-standardisation.md`): **WS-1** sgs/container 3-layer completion — content-width attr (A1) + outer max-width transfer + kill hardcoded widthMode:full band-aid (A2) + custom-width centring (A3) + raw-px gap (A4) + min-height (A5) + gridItem* (A6) + dead max-width→widthMode fold path (A7: `convert.py:1034–1040`, same logic must fire on container paths not atomic-only); **WS-2** converter/router truth — D1 layer written-not-consumed (seed_d1_sidecar stub, ~43 assignments stranded in `css-d1-assignments.json`; B1) + `_fold_eligible` sole-child gate drops ALL fold attrs for multi-child sections, not just max-width (B2, `convert.py:2830`) + grid-template-columns typed (B3) + D3 dual-write (B4) + verbatim-CSS-fallback anti-pattern: `css_router.py:433–437` dumps unscoped page-wide CSS on import failure, operator-invisible (B5); **WS-3** de-cheat — hardcoded lists→DB (_CAPABILITY_PRIORITY/_BREAKPOINT_RULES/_infer_role; C3-C5) + _GLOBAL_BARE_TAGS/_CHROME_TOP_ELEMENTS hardcoded vocabulary = R-22-1 violation, move to DB or document as permitted exception (C6) + trust-bar static-grid CSS (C2 = P-TRUSTBAR-BOUND-GRID root cause) + de-Mama's the deploy script (C7 — DONE 2026-06-10: `upload_and_patch.py` now client-agnostic — `MOCKUP_ROOT` derived per-run from `--client`/`--mockup-root`, `--target-id` required, hardcoded page-144 default removed) + cta-section layout enum collision (C8); **WS-4** composite standardisation + auto-propagation — shared PHP helper composites call + a propagation writer + /sgs-update wiring (D1-D3; largest); **WS-5** docs. **WS-1 gates WS-4.** Canonical procedure: Spec 22 §FR-22-21. Empirical proof (run `mamas-munches-144-2026-06-01-123104`): the fold deletes `__inner` + strands its max-width in variation-d0-d2.css; leftover-buckets names maxWidth/widthMode extraction_failed; composite confidence 1.0 (tier=class-section) vs container 0.0 (deferred-no-match); featured-product 91.9%@1440. **Workstream A (block_composition roster + container_kind column + sync rewrite + trust-bar/modal containerKind) SHIPPED `0d746073`** as the propagation substrate (DB layer done; KIND-scoped diff writer + PHP helper are WS-4 remaining work). Build deferred to fresh sessions (programme-sized, sensitive); /qc-council per converter/block commit; Bean visual sign-off per fidelity milestone (R-22-13).
> **Bucket:** Pipeline / converter

> **P-CLONE-PAGE-VISUAL-TRIAGE** — NEW 2026-06-03 (D159.3). **Status: OPEN** (pipeline/converter — TRIAGE REGISTER). Bean's full-page visual QA of canary page 144 (after WS-1 A1+A2) surfaced 8 issues. **NONE is a WS-1 A1/A2 regression** (the section-container widthMode/contentWidth change doesn't touch these blocks; #3/#4 root-cause-verified pre-existing). Root-cause each via `/systematic-debugging` against the run artefacts (`pipeline-state/mamas-munches-mamas-homepage-ws1-2026-06-03-060940/` — extract.json/trace/leftover-buckets) + draft-vs-clone live-DOM (R-22-11), DB-first (R-22-1), universal (R-22-9). Issues: **#1 hero** forced into left half, right empty, image not full-bleed (padded, ¼ width) — composite-wrapper DRIFT (WS-4) + image-sideload 404. **#2 trust-bar** all badges folded into 1 left column instead of one grid-item each — composite drift / P-TRUSTBAR-BOUND-GRID (WS-4/C2). **#3 featured-product** "Zookies" heading centred while label/text correctly left — VERIFIED origin `.wp-block-sgs-heading` itself (the `__inner` computes text-align:start; draft heading = `start`); PRE-EXISTING heading-alignment routing bug. **#4 product-cards** wrong proportion — VERIFIED the grid IS correct 640/384 (5fr 3fr) but the cards shrink to 380/380 (don't fill cells) + trial image square not horizontal — product-card max-width/justify + image-fit, PRE-EXISTING. **#5 brand** image wrong size/zoom, no rounded corners, height ≠ left content — media styling not transferred + image 404. **#6 ingredients `__disclaimer`** → empty notice-banner (lost all text, gained an icon the draft didn't have, wrong border colours) — `disclaimer`→sgs/notice-banner routing (D141) drops content. **#7 `sgs-announcement-bar`** converted but content completely different (lost outline, icon, box bg, button) — announcement-bar conversion bug. **#8 reviews slider** very different — testimonial-slider conversion. Image sideload (dry-run 404) compounds #1/#5 visually — separate known gap (P-CSS-TRANSFER-FIDELITY / media-map). **PROGRESS (2026-06-03 PM, D163):** **#3 BUILT (uncommitted)** — heading+label textAlign-parity + heading control gaps + label `attr()` fix (block-quality, R-22-9). **#8 BUILT (uncommitted)** — slider fill-width track + always-rotating nav + pause-in-controls; STILL needs live "verify on real 4-card slider THEN commit". **#6 fix-shape grounded** — notice-banner block.json source-fix (so /sgs-update re-derives content-block/1) + universal converter sgs/text-child synthesis + showIcon-from-draft (option-a per dedup audit: notice-banner keeps semantic identity). **#1/#2 + #4b = now block-side-mirrored (WS-4 complete) but page-fidelity still requires the Method-2 converter work** (routing fix `.sgs-hero`→`sgs/hero` + converter-lift — the converter still emits `sgs/container` @conf 0.10, not the composite blocks). **#7 = converter bug (announcement-bar), still open**. **#4a grid-lift: REINSTATED (premature, NOT falsified — D163 Bean correction); post-WS-4 converter-lift work; align-items gated. Pending (Method 2).** **#3/#4 origin** re-confirmed (heading-block / product-card-internal). **PROGRESS (2026-06-05, D178) — Status now PARTIAL:** **#1 hero SHIPPED** (routes `sgs/hero`@1.0, 2-col + 520 min-height + image loads; H1 now 58px via typography lift `642cad61`). **#2 trust-bar SHIPPED** (de-hardcoded to universal grid `e75db509` — badges horizontal row live). **#3 heading-align SHIPPED** (textAlign parity `5712c97e`). **#4 product-cards SHIPPED** (fill 640/384 via grid bridge `c97f85f1` + D5 cap-scope `b3e3b284`). **#5 brand** image sideload SHIPPED (real upload `51e9ab13`); media-stretch residual open. **STILL OPEN:** #6 ingredients `__disclaimer`→notice-banner content-synthesis; #7 announcement-bar conversion (modifier-carry `107723be` partial); #8 social-proof carousel-vs-static (Bean: fine for now). **Bucket:** Pipeline / converter.

## 2026-06-02 — theme thread wave 1–3 deferred follow-ups

> **P-PUSH-SNAPSHOT-SKIPS-GLOBAL-STYLES** — NEW 2026-06-03. **Status: OPEN** (infra/tooling). `push-theme-snapshot.py` writes the per-client snapshot to `theme.json` on disk only — it does NOT update the live `wp_global_styles` post (the Site-Editor USER layer, ID 7 on sandybrown) which SUPERSEDES theme.json wherever both define a property. So a snapshot push silently fails to change live styles; this session's Mama's WCAG override only took once also POSTed to `/wp-json/wp/v2/global-styles/7` via REST. **Fix:** extend `push-theme-snapshot.py` to also update the `wp_global_styles` post (or document the two-step requirement). **FR-26-D2 SHIPPED 2026-06-03 (commit c468af7a, D161): the push-write half is done** — the script now POSTs `/wp/v2/global-styles/{id}` (deterministic post-ID, app-pwd auth, trailing cache flush), live-verified reversibly on canary post 7. Remaining: the pull round-trip (FR-26-A3) + the pre-deploy user-edit guard (FR-26-A4) -> Status downgraded to **PARTIAL**. Memory: `canary-live-styles-come-from-wp-global-styles-post`. **Bucket:** Infra / tooling.


> **P-PRODUCT-PAGE-MOCKUP-NOT-SGS-BEM** — NEW 2026-06-03. **Status: OPEN** (framework). `sites/mamas-munches/mockups/product/index.html` uses bare `pill-group`/`pill` classes (no `sgs-` prefix). Stage 0 hard-rejects non-conforming mockups on production runs. Must be migrated to SGS-BEM before the product-page clone can emit `sgs/option-picker` blocks. The homepage mockup already conforms. No code change required — edit the HTML file only.
> **Bucket:** Content / client asset

> **P-AUTO-CONTRAST-LIGHT-PRIMARIES** — NEW 2026-06-03. **Status: DEFERRED** (framework). Framework default button and pill text is white, which is WCAG-safe for saturated primaries (the majority of client brands). Light-pastel primaries (e.g. Mama's Munches pink) need a per-client override to ensure contrast. Truly universal auto-contrast — correct text colour for ANY primary with zero per-client override — requires either CSS `contrast-color()` (browser support maturing 2026; not yet safe for broad production use) or a build-time luminance calculation step. Current workaround: document the per-client override in the client's `theme-snapshot.json`. Feature decision for Bean.
> **Bucket:** Framework / design-system

> **P-CART-DRAWER-PHASE2** — NEW 2026-06-02. **Status: DEFERRED** (framework). `sgs/cart` v1 is count+link only; the slide-in drawer is gated behind the `displayMode` attr (`link` default | `drawer`). Build the drawer in Phase 2: `role="dialog" aria-modal` + focus trap + ESC + focus-return + `prefers-reduced-motion`. Do NOT wrap/extend `woocommerce/mini-cart` (shallow controls, DOM-subtree + token-inheritance issues — see the cart cold-prompt).

> **P-BLOCK-DESIGN-POLISH** — NEW 2026-06-02. **Status: DEFERRED** (content). Two lower-priority design upgrades from Bean's brain-dump: (1) cta-section → rich template-patterns with stats/social-proof filler (like the hero presets), not just alignment variants; (2) notice-banner → per-type icon+CSS bundles as ideal defaults (then customisable). Plus the heading/text dormant-variant tweak (drop heading `hero`? — Bean decision).

## 2026-06-01 — FR-22-6 null-save→InnerBlocks migration gap (theme thread, wave 1)

> **P-FR226-NULL-SAVE-MIGRATION** — NEW 2026-06-01. **Status: DEFERRED** (Bean's prior moot disposition stands — see P-D1 below). Generalises P-D1-INFOBOX-EXISTING-POST-MIGRATION from info-box to the whole FR-22-6 roster. **The gap:** an FR-22-6 block whose new `save()` is `<InnerBlocks.Content/>` (empty when there are no inner blocks) can VALIDATE against a null-save-era post's empty/self-closing stored markup — so WordPress treats the block as valid and **never walks the deprecation chain**, meaning the FR-22-6 `migrate()` (which converts the old scalar `text`/`heading`/etc. → a child block) **does not fire** and the scalar content is dropped on the frontend (render.php now `echo $content`, R-22-14 removed the scalar fallback). The FR-22-6 deprecation entries (info-box v4 — SHIPPED 2026-05-31; notice-banner v3 — shipped this session) have **no `isEligible`**, so they only run when the block is otherwise invalid. **Affected:** info-box (already shipped), notice-banner (shipped this session), + any genuine Wave-2 single-`text` blocks when migrated (NB: the previously-listed "Wave-2A roster" social-proof/featured-product/gift-section/footer/header was a CATEGORY ERROR corrected 2026-06-02 — those are mockup SECTION classes, not SGS blocks; the real targets must be re-derived from the block roster). **NOT a regression vs shipped behaviour** — notice-banner exactly mirrors the shipped info-box pattern. **Resolution options (when a real production SGS site exists):** (a) WP-CLI batch existing-post migration per R-22-14 (Bean's chosen path), OR (b) add an `isEligible` to the FR-22-6 deprecation entry that returns true when the scalar content attr is non-empty AND no inner blocks exist, forcing the deprecation walk. Verify on a real old-shape post before declaring fixed (R-22-11). Found during the wave-1 notice-banner migration review; render-verified clean on the canary (no live old posts to break). Full detail: notice-banner + option-picker visual-diff reports (2026-06-01), decisions (this session). **Roster-migration campaign (carried from archived `2026-05-28-phase-2-hybrid-block-migration.md` Stream B, 2026-06-10):** the bulk FR-22-6 InnerBlocks migration *campaign* across the ~61-block hybrid roster was never run as a campaign — only piecemeal blocks shipped (info-box `797bb45d`, notice-banner, product-card, trust-bar). Remaining targets must be re-derived from the live block roster (the original Wave-2A list was the category error noted above). Gated on converter close (the converter is the first-shop blocker, not more block migration).

## 2026-06-02 — CSS-transfer fidelity (the pipeline's core job; 4 gaps)

> **P-CSS-TRANSFER-FIDELITY** — NEW 2026-06-02 (D136). A draft-vs-clone computed-style audit proved the cloning pipeline does NOT faithfully transfer the draft's CSS — the framework IMPOSES values the draft never had + DROPS draft structure. **4 primary gaps:** (1) imposed `max-width:1200` on full-bleed sections — fix = theme-CSS `.entry-content > .wp-block-sgs-container{max-width:none}` (full-bleed by position); (2) the FR-22-4.1 fold DROPS the `__inner` content wrappers (max-width:960) — fix = preserve the two-level structure; (3) hero gradient overlay (`#C56A7A→#E68A95`) imposed over the draft's solid pink; (4) `grid-template-columns` not transferred (trust-bar 266×4 → uneven; brand 122/782 → 450/450). **2 finer gaps (added 2026-06-03):** (5) `css_router.py:433–437` verbatim-CSS-fallback dumps unscoped page-wide CSS on import failure — operator-invisible (gap B5, WS-2); (6) `_lift_core_block_style` max-width→widthMode logic is dead for container paths (atomic-only, `convert.py:1034–1040`) — the fold must call the same logic (gap A7, WS-1). The principle (Bean, locked): faithful CSS transfer is the pipeline's whole point; converter detect-mode band-aids are the wrong layer (2 rejected). Static-div editor bug already fixed (committed). The `widthMode:'full'` slug-resolved band-aid (e27ff591) is PARTIAL — superseded by the faithful-transfer fix. Note: pixel-diff scores are informational per FR-22-18 — structural faithfulness is the primary gate, not pixel %. Full detail: decisions D136 + `.claude/next-session-prompt.md`. **PROGRESS (2026-06-05, D178):** Gap (2) `__inner` content-width drop — RESOLVED (contentWidth attr + fold lift, `2f86d9e6`). Gap (3) hero gradient — RECLASSIFIED, NOT a converter bug: the converter correctly emits flat pink on the inner `sgs/hero`; the gradient is the hero block's OWN default CSS (hero/style.css, client palette vars) painting over it (D172). Fix block-side if undesired — do NOT chase as a converter-lift gap. Gap (4) grid-template-columns — RESOLVED for nested wrappers (`display:grid→layout:"grid"` bridge `c97f85f1`; products/trust-bar__inner/gift-cards lift their grid). Gap (6) `_lift_core_block_style` dead — superseded: typography now lifts via `_lift_typography_to_block_attrs` incl. descendant/responsive (`642cad61`). Residual OPEN: gap (1) imposed max-width on full-bleed (theme-CSS); gap (5) verbatim-CSS-fallback (B5/WS-2). **UPDATE 2026-06-07:** gap (5) verbatim-CSS-fallback replaced by the four-destination router `05fb38a4` (likely resolved); only gap (1) imposed max-width on full-bleed remains.
> **Status:** PARTIAL (gap (1) imposed max-width on full-bleed remains; gap (5) verbatim-CSS-fallback replaced by four-destination router `05fb38a4` — likely resolved)
> **Bucket:** Pipeline / converter

---

## 2026-06-01 — FR-22-20 universal variant detection (hero SHIPPED; rollout needs modifier-class mechanism)

> **P-FR2220-VARIANT-DETECTION** — D133 Bean-directed; **slot-fingerprint mechanism SHIPPED + LIVE-DOM-VERIFIED for the hero 2026-06-02 (D134).** Commits 1-5 done (`1a48c602`→`55f42e1b`): `blocks.variant_attr` column + `variant_slots` table + hero `supports.sgs.variantAttr`/`variants` + /sgs-update population + converter `detect_variant` (emit-path enrichment, qc-council-validated, 1 bug fixed) + hero `$is_split` band-aid REVERTED. Live canary 144: hero carries `sgs-hero--split` via the clean gate, 1 `.sgs-hero__content`, media column + 2 split-images render. **OPEN — the rollout (D135):** the slot-fingerprint mechanism fits ONLY content-distinct, modifier-LESS variants (hero). The stylistic/behavioural MAJORITY (gallery layout, heading/label/text variantStyle, divider/mobile-nav variant — same content, different CSS/animation) have ZERO discriminating slots → slot-fingerprint never fires. They carry a BEM modifier class (`sgs-gallery--masonry`) instead, which the existing `lift_behavioural_attrs` modifier path (db_lookup.py:2066-2109) does NOT map to the variant enum. **Next step = a complementary `detect_variant_from_modifier` mechanism** (resolved block has `variant_attr` + draft node BEM modifier matches a value in that attr's enum → set it); needs brainstorming/spec + a canary test target (Mama's has no stylistic-variant section with a modifier, so no live-DOM gate exists yet) before build (R-22-11, STOP #32 — don't ram a new mechanism without a verification target). product-card's slot-`variants` mapping is ALSO gated on its parked variation-sets design (D129, see P-PRODUCT-CARD-FULL-DUAL-MODE). Do NOT declare non-functional slot-`variants` on stylistic blocks. Full record: decisions D134-D135 + Spec 22 §FR-22-20. **Variant `--Array` emit bug (carried from archived method2 plan FS-3a/D6, 2026-06-10):** the FR-22-20 variant-class emit serialises a JS Array as the literal `--Array` (`Array.toString()`) instead of the variant value string — testimonials clone with className `--Array`. Fix the variant-emit in `convert.py` to use the variant value string. No ledger row exists for this; verify it's still live before fixing. **RESOLVED 2026-06-10 — NOT live:** verified the D6 guard at `convert.py:3550-3572` already blocks `--Array` emission (validates `detected` is a plain string, logs `variant_attr_type_error` + skips otherwise) AND `db_lookup.detect_variant` is typed `-> str | None` with every return path returning a `variant_value` (TEXT) or `None`. The method2 doc flagging this predates the D6 guard (committed 2026-06-04). No code change needed.
> **Status:** PARTIAL (hero slot-fingerprint SHIPPED+verified; modifier-class rollout mechanism OPEN — needs spec + test target)
> **Bucket:** Pipeline / converter

---

## 2026-05-31 (pm) — wrapper-perfection follow-ups (Wave-2/A-1 + product-card)

> **P-VERIFY-WAVE2-A1** — VERIFIED 2026-05-31 (fresh build+deploy+re-clone, run `mamas-munches-homepage-2026-05-31-223313`). Pixel mean 64.60→63.49 (−1.11pp, informational only). STRUCTURAL: ~1/7→~6/7 sections correct. brand 2-col ✓; featured/ingredients/gift/social headings + content ✓; per-device attrs lifted. **TWO findings surfaced (open):** (1) **HERO migration PARTIAL** — still 2 `.sgs-hero__content` wrappers + 2 images (height 1820); root cause: hero render.php wraps `$content` in `<div class="sgs-hero__content">` AND the converter emits a `sgs/container.sgs-hero__content` InnerBlock → duplicate wrapper; AND both art-direction `__split-image--mobile/--desktop` render (the mobile/desktop show/hide CSS not applying). FIX next session: hero shell should NOT re-wrap in `.sgs-hero__content` (let the InnerBlock be the content column), and the split-image mobile/desktop toggle must apply. (2) **trust-bar now block-routed** — after rename + /sgs-update, section `.sgs-trust-bar` resolves to the `sgs/trust-bar` BLOCK (Req-3 block-override active ✓), renders 4 badges, but it's the un-migrated HYBRID (reads scalar `items`) → see P-TRUST-BAR-HYBRID-MIGRATION. **UPDATE 2026-06-07:** trust-bar-hybrid half CLOSED — bound-purge `92bcf997` D182 + icon resolver `127f2290`; only the hero duplicate-wrapper remains open.
> **Status:** PARTIAL (trust-bar-hybrid CLOSED; hero duplicate-wrapper still open) · **Bucket:** Pipeline / converter · **Trigger:** next session.

> **P-BLOCK-CAPABILITY-NOTES-IN-REFERENCE** — NEW 2026-05-31. The DB attr-list can't convey a block's CSS MECHANISM (e.g. sgs/container per-grid-item via `--sgs-gi-*` custom-prop defaults + per-child specificity override) — which caused a wrong "no per-item customisation" assertion this session. FIX: add a "capability/mechanism note" per block to `02-SGS-BLOCKS-REFERENCE.md` (regenerated by /sgs-update) so capability is queryable without reading edit.js. (Pairs with STOP #26.)
> **Status:** OPEN · **Bucket:** Docs / DB · **Trigger:** opportunistic.

> **P-PRODUCT-CARD-FULL-DUAL-MODE** — NEW (Bean brain-dump 2026-05-31; plan BEFORE building). Build the full product-card next session. Three parts: (1) **atomic "pill" block** — pack-size/option pills as a SEPARATE reusable atomic block (NOT sgs/button: no link, different behaviour); exclusive selection, persistent "selected" styling, click changes price/photo/etc. (2) **variation-sets logic on the card** — a product can have MULTIPLE variation types (size, flavour); each can change different OR the same card areas (size→price; flavour→picture+price); card recognises how many variation types exist, whether each changes anything, and what content each changes — all PULLED FROM the sgs_product CPT settings (block stays simple, reads the product's declared variations + content-impact map). (3) **Spec 24 dual-mode** (Typed=clone InnerBlocks FR-24-9; Bound=CPT Block-Bindings FR-24-2/3). **The variation-sets logic is a NEW requirement beyond current Spec 24 FRs — write it into Spec 24 (or a sub-spec) FIRST.** Defer until specced + the atomic pill block exists.
> **Status:** OPEN (plan next session) · **Bucket:** Feature build / Spec · **Trigger:** next session, after Wave-2 verification.

> **P-A1-PHASE2-SLOT-RESPONSIVE-TYPOGRAPHY** — NEW. A-1 lifted responsive padding/margin/gap/columns/grid → per-device attrs, but SLOT-LEVEL responsive typography (e.g. `headlineFontSizeTablet`, per-slot font-size/colour at breakpoints) is still dropped to variation-CSS-only — needs the slot-prefix path wired into the universal walker (the deprecated `_lift_styling_attrs` logic has the slot-prefix derivation). Also minors: A-1 `min-width>1024` breakpoint edge (supra-1024 maps to desktop-all-sizes); add `_trace` on 3+ breakpoint drops; B-1 `replaces` comma-split contract guard. **UPDATE 2026-06-07:** descendant-combinator + hero H1 responsive typography SHIPPED `642cad61`; remaining = slot-prefix per-slot breakpoints.
> **Status:** PARTIAL (descendant-combinator + hero H1 responsive typography SHIPPED `642cad61`; remaining = slot-prefix per-slot breakpoints) · **Bucket:** Pipeline / converter · **Trigger:** after Wave-2 + trust-bar migration.

## 2026-05-31 — FR-22-6 converter content-routing + Spec 24 follow-ups


> **P-FR226-FIDELITY-AND-MERGE** — NEW 2026-05-31. Branch `feat/fr22-6-content-render` renders content+layout correctly but isn't pixel-acceptance-passing (sections 60–83%). To reach acceptance + merge to main: (a) wire real image sideload (Stage 4i is dry-run → no product images); (b) migrate `sgs/info-box` FR-22-6 hybrid (gift-section card content renders sparse — info-box reads scalar attrs); (c) exact styling; (d) generate passing visual-diff reports for product-card/testimonial/testimonial-slider; (e) merge branch→main (visual-diff gate then passes). The container migrations (c9c6544d) + converter fix (1fcb0742) wait on this. **Container-routing implementation target is §FR-22-4.1 (D118)** — any further container/wrapper work in this branch MUST follow the four-step precedence order rather than re-deriving ad-hoc rules. **UPDATE 2026-06-07:** branch merged `1761eb35` + image sideload `51e9ab13` + info-box migrated `797bb45d`; remaining pixel-acceptance goals are now Method-2 scope.
> **Status:** DEFERRED (branch merged `1761eb35` + image sideload `51e9ab13` + info-box migrated `797bb45d`; remaining pixel-acceptance goals are Method-2 scope)
> **Bucket:** Pipeline / converter
> **Trigger:** Method-2 converter work.


## 2026-05-29 — sgs/trust-bar merge + rename follow-ups

> **P-TRUST-BAR-MERGE-VALIDATION** — NEW 2026-05-29, updated 2026-05-31 (block renamed from trust-badges → trust-bar). `trust-bar/deprecated.js` v3 handles rename alias `sgs/trust-badges` → `sgs/trust-bar`; v2 handles cross-block migration of `sgs/certification-bar` → `sgs/trust-bar`. Not yet validated against a live post containing a `sgs/certification-bar` block. Validation procedure: (1) create a test page on dev with a `sgs/certification-bar` block (text-only variant with 3 label badges); (2) deploy updated plugin; (3) open the page in the block editor and confirm the block auto-migrates to `sgs/trust-bar` with `badgeStyle: 'text-only'` and all labels intact; (4) confirm the frontend renders the pill badge shape correctly; (5) test an image-badge migration from a cert-bar `image-and-text` instance; (6) run `/sgs-update` to populate trust-bar attrs in block_attributes DB. ~20 min.
> **Status:** OPEN
> **Bucket:** Testing / QA
> **Trigger:** Next deploy of sgs-blocks to dev site (palestine-lives.org).

---

## 2026-05-29 — sgs/media video extension follow-ups

> **P-MEDIA-VIDEO-VALIDATION** — NEW 2026-05-29. `sgs/media` extended to image+video (D97). Not yet validated on a live page. Validation procedure: (1) create a test page on dev with one sgs/media block set to mediaType=video + a YouTube URL, one with a direct MP4 URL, one with videoSource=internal selecting a WP library video; (2) deploy updated plugin; (3) confirm each renders correctly on the frontend; (4) confirm an existing image-only post still renders identically (backwards-compat via mediaType default + deprecated.js v1 migrate); (5) run `/sgs-update --stage 1` to populate the 12 new video attrs in block_attributes and resolve the ghost `sgs/media.videoUrl` row. ~20 min validation run.
> **Status:** OPEN
> **Bucket:** Testing / QA
> **Trigger:** Next deploy of sgs-blocks to dev site (palestine-lives.org). Run `/sgs-update --stage 1` immediately after deploy.

---

## 2026-05-28 — sgs/svg-background retirement follow-ups

> **P-SVG-BACKGROUND-MIGRATION-VALIDATION** — NEW 2026-05-28. `container/deprecated.js` v2 entry handles cross-block migration of `sgs/svg-background` → `sgs/container` with `bgSvg*` attrs. Not yet validated against a live post containing a `sgs/svg-background` block — no such post exists on dev/staging as the block was never deployed to production. Validation procedure: (1) create a test page on dev with a `sgs/svg-background` block containing SVG markup + animation settings; (2) redeploy the updated plugin; (3) open the page in the block editor and confirm the block auto-migrates to `sgs/container` with correct `bgSvg*` attrs populated; (4) confirm the SVG renders on the frontend with the correct animation class.
> **Status:** OPEN
> **Bucket:** Testing / QA
> **Trigger:** Next deploy of sgs-blocks to dev site (palestine-lives.org). ~15 min validation run.

---

> **2026-05-27 note (D85 — role-exclusion DB-derive + Tier C deletion):** `P-D85-ROLE-EXCLUSION-DB-DERIVE` and `P-TIER-C-DELETE-OR-PROVE` closed-as-completed (no separate parking entries existed; tracked here for completeness). The two hardcoded frozensets (`_CONTENT_BEARING_ROLES`, `_ROLE_EXCLUSION_ALLOWLIST`) in `db_lookup.py` are gone — replaced by DB-driven `_content_bearing_roles()` / `_styling_behaviour_roles()` querying the new `slot_synonyms.role_classification` column (idempotent migration at module load). Tier C derivation deleted from `equivalent_block_for()` per qc-council Rater B + Bean directive. Spec 22 §FR-22-2.1 / §FR-22-2.3 / §15 amended. Re-introduction of a role-derived tier gated on `P-SGS-UPDATE-ROLE-DETECTION-IMPROVE` (closed for role detection itself, but a follow-up parking entry can be re-opened if Tier C inputs accumulate).

<!-- ACTIVE — open parking items only. Resolved entries → memory/parking-archive.md with completion date in heading. -->

> **2026-05-26 note (Spec 22 supersedes Phase 1 plan):** Cloning-pipeline entries listed below as superseded by the 2026-05-25 phase plan are now further superseded by **Spec 22** (Universal Block-Equivalent Extraction). The canonical phase plan is `.claude/plans/2026-05-26-phase-1-spec-22-implementation.md`. Closed/dissolved entries: `P-WAVE-2-RESHAPE-AS-ONE-WIRING-GAP` (dissolved — IS Spec 22), `P-G1-EXTEND-TO-OTHER-CONTAINER-SHAPED-COMPOSITES` (dissolved — Spec 22 makes universal-emit default), `P-FR1-VARIATION-BUF-CONSISTENCY` (dissolved — FR1 fast path retired), `P-MATCH-JSON-GATE-REDEFINITION` (FR-22-12 preserves Stage 2 artefact production), `P-G1-HERO-INNERBLOCKS` (closed by Spec 22 FR-22-3 universal walker), `P-G3-STAGE-3-VISUAL-SLOT-MAPPING` (closed by FR-22-5 D1 routing + FR-22-2.2 role-exclusion), `P-G5-PER-BLOCK-DOM-SHAPE-FIXES` (closed by FR-22-3 universal walker — no per-block branches). Other cloning entries (P-DUPLICATE-HEADER, P-INGREDIENTS-1440-REGRESSION, P-PIXEL-DIFF-VERTICAL-ANCHOR-FIX) are Phase 1.5 / Phase 2 work. New entry: `P-LEGACY-GAP-CANDIDATES-MIGRATION` (1,480 legacy sgs-framework.db `attribute_gap_candidates` rows; Spec 22 FR-22-8.1 makes table read-only; migration to uimax parked).

> **P-LEGACY-GAP-CANDIDATES-MIGRATION** — 1,480 legacy rows in `sgs-framework.db.attribute_gap_candidates` (Spec 16 era). Spec 22 FR-22-8.1 makes this table read-only; all new D3 writes go to uimax's `attribute_gap_candidates` (91 rows, with confidence + provenance columns). Migration of the 1,480 legacy rows is out-of-scope for Spec 22. **Trigger:** post-Spec-22 close, when Phase 1.5 considers cleaning up legacy data surfaces.
> **Status:** DEFERRED

## Spec 22 walker — deferred routing work

**P-SUBHEADING-ROUTING-TO-SGS-HEADING** — NEW 2026-05-28; **D99 syntax-updated 2026-05-29.** Walker D99 + sgs/heading γ-rebuild (Track B 2026-05-28) make it possible to route mockup subheadings to `sgs/heading{headingRole:'subheading'}` instead of the current `sgs/text` emission. **Why this isn't done yet:** updating the slots-table row for subheading (`UPDATE slots SET standalone_block='sgs/heading' WHERE slot_name='subheading' AND scope='element'`) without walker support would cause `equivalent_block_for(parent, 'subheading')` to emit `sgs/heading` with default `headingRole='heading'` — rendering subheading content as an h-tag instead of a paragraph. The walker must learn to set `headingRole='subheading'` when emitting for a subheading-classified canonical_slot. Mechanism options: (a) a walker-level derive rule inferring `headingRole` from the canonical_slot identity at emission time; OR (b) a new DB column `slots.standalone_block_default_attrs` (JSON) carrying per-slot default attr overrides. Option (a) is cheaper; option (b) is more universal. Currently the slots row for subheading still has `standalone_block='sgs/text'`. NOTE 2026-05-29 D99: original entry referenced `slot_synonyms.subheading.standalone_block` column; updated to `slots WHERE slot_name='subheading' AND scope='element'` syntax for current architecture.
> **Status:** BLOCKED
> **Trigger:** Phase 1.4 walker rewrite shipping — pick mechanism (a) or (b) at that decision point.


**P-CLONE-PIPELINE-HEADER-FOOTER-HANDLER** — The clone pipeline treats header and footer markup the same as page body. Headers and footers are template-parts on the WP target (`wp_template_part` post type), not page content. The pipeline needs a dedicated stage that (a) detects header/footer sections in the source mockup, (b) extracts them once per site rather than per page, (c) emits to template-part shape (not page-content shape), (d) handles the unique template-part wrapper classes (`wp-block-template-part`, `area="header"` / `area="footer"`). Without this handler the h/f markup either duplicates per page, drops silently, or malforms into a page-body block tree. **Trigger:** before the next multi-page clone run. **Build spec preserved (2026-06-10):** a never-started 12-step build plan for this handler — `scripts/clone-header-footer.py` → template-part patterns + `wp_options['sgs_site_info']`, sticky-behaviour detection, idempotent re-run, Stage-11 ≤1% pixel-diff — is archived at `plans/archive/2026-05-24-phase-2-header-footer-cloner.md` with **5 locked KJCs** (KJC1 standalone script; KJC2 Site-Info schema-gaps logged not invented; KJC3 heuristic behaviour-detect + static fallback; KJC4 hash-source-DOM idempotence; KJC5 strict-reuse Spec 19 §4 CLI, no new commands) + a Step-2.11 `/docscore` Grade-A pre-merge gate. Reuse those when this is picked up rather than re-deciding.
**Status:** OPEN


> **[RESTORED 2026-07-11 — css_router.py is LIVE (used by sgs-clone-orchestrator + converter/resolvers/grid.py), so these edge cases are still valid; wrongly swept by a slug-parse bug.]**
**P-P1Bx-COMMA-MEDIA-INNER** — P1.B.x's `_scope_media_rule()` only scopes the first part of comma-grouped inner selectors. `@media (...) { .sgs-hero, .sgs-cta { ... } }` produces `.page-id-144 .sgs-hero, .sgs-cta { ... }` — `.sgs-cta` left unscoped. Low-frequency edge case. **Trigger:** next css_router maintenance pass.
**Status:** OPEN
**P-P1Bx-NESTED-SUPPORTS** — Nested `@supports` inside `@media` produces invalid CSS. Recurse the scope-injection OR pass through unchanged. Low-frequency. **Trigger:** next css_router maintenance pass.
**Status:** OPEN

**P-P2II-CSS-VALUE-RE-TIGHTEN** — `_CSS_VALUE_RE = re.compile(r"^[^;{}<>\"]*$")` in `stage_attribute_promotion.py` permits single quotes, backticks, parentheses. Defence-in-depth (esc_attr() in PHP is real guard) but worth tightening. **Trigger:** next P2.ii maintenance pass.
**Status:** OPEN


### P-SPEC35-STATE-RESPONSIVE — Responsive × state combinations in the manifest (~30 min)
**Status:** DEFERRED
**Bucket:** framework

**Trigger:** Only if a real block ships a `hoverColourTablet`-shaped attribute. No evidence of demand today.

**What:** FR-35-5 deliberately scopes the `states` axis to base-tier only. A third dimension (responsive × state × member) was considered and excluded as speculative.

**Approach:** If it surfaces, extend `states` with the existing device-tier suffix convention rather than a new axis.

### P-SPEC35-STATE-AUTOSUGGEST — Helper to offer state mappings for the 81% suffix-shaped attrs (~45 min)
**Status:** OPEN
**Bucket:** tooling

**Trigger:** After FR-35-5 ships and the roster starts declaring `states` at scale.

**What:** 92 of 113 state attrs are suffix-shaped (`backgroundColourHover`). A helper could OFFER `{baseAttr}+Hover` mappings for an author to confirm. It must never decide — `pauseOnHover` / `effectHover` / `imageZoomHover` / `grayscaleHover` contain "Hover" and are not style properties (STOP-DECLARE-DONT-PARSE-NAMES).

**Approach:** Suggestion-only CLI emitting a candidate `states` block for human/agent review.

### P-SPEC35-UPSTREAM-REGISTRY-DRIFT — `css:stroke` / `css:percentage` still present in Phase-1 artefacts (~20 min)
**Status:** OPEN
**Bucket:** tooling

**Trigger:** Before anyone regenerates `setting-registry.json` from Phase-1 data.

**What:** Both rows were reclassified in the hand-curated golden master (D354) but still exist in `setting-types.json` and `setting-registry-css.json`, which are upstream Phase-1 artefacts. No live inconsistency today because the golden master is not regenerated from them — but a regeneration would silently revert the reclassification.

**Approach:** Either reclassify upstream to match, or add a regeneration guard that fails on a known-reclassified key.

### P-SPEC35-PARTIAL-BOX-MEMBERS — No vocabulary for a partially-modelled box member (~40 min)
**Status:** OPEN
**Bucket:** framework

**Trigger:** If partial-box attrs proliferate beyond the current handful.

**What:** Attributes like `headlineMarginBottom` and `attributionMarginTop` are a single side of a box member, not the whole `{top,right,bottom,left}` object `layout.css:margin` expects. The schema is binary resolved/gap, so these surface as orphans with no way to say "3/4 modelled". Surfaced by the wave-1 rollout.

**Approach:** Consider a `partial` flag or a per-side member family. Do not build speculatively.

### P-WP-AUTOP-INTERACTION — Audit how WP `wpautop` interacts with sgs/text emission (~30 min)
**Status:** DEFERRED

**Trigger:** Revisit if a real test failure surfaces showing double-wrap on sgs/text content — currently theoretical only.

**What:** Rater 4 theoretical risk. WP's `wpautop` filter wraps bare text in `<p>` — if sgs/text emits `<p>` content, double-wrap risk.

**Approach:** Test scenario; if real, add `wpautop` opt-out in block render.


### P-WP-UNIQUE-ID-CACHE-COLLISION — Anchor scoping under fragment cache (~30 min)
**Status:** DEFERRED

**Trigger:** Revisit if a production collision is observed (fragment-cached ID mismatch manifests as a broken style scope). Currently theoretical.

**What:** Rater 4 theoretical. `wp_unique_id()` is per-request sequential. Fragment cache combining requests could mismatch scoped `<style>` ID with rendered element ID.

**Approach:** Use content-derived hash (e.g. `md5` of block JSON) for scoped IDs instead of sequential counter. Stable across cache fragments.


### P-FR1-PLUS-GRID-DOUBLE-LIFT-REGRESSION — Add regression scenario for FR1 + grid container interaction (~30 min)
**Status:** OPEN


**What:** `_lift_root_supports_to_style` for sgs/container is now called from BOTH the FR1 block-root path (line ~1956) AND the css_driven_container path (line ~2422). A node that's BOTH a block root AND has display:grid would route through both branches. The lift uses `_set_in` with never-overwrite semantics → theoretically idempotent, but never exercised end-to-end.

**Approach:** craft a synthetic mockup snippet where a sgs/X-rooted block also has `display: grid` in its mockup CSS. Run through converter. Assert `attrs["style"]` doesn't get clobbered by the second pass.

**Trigger:** Before shipping any further `_lift_root_supports_to_style` changes (immediate gate). The synthetic test scenario is the acceptance criterion — write it once, run it on every lift commit thereafter.

Captured 2026-05-17 from /qc-inline finding 4 (LOW).


### P-CORE-STYLE-MAP-DB-MIGRATION — Migrate `_CORE_BLOCK_STYLE_MAP` to DB-driven lookup (~1.5 hrs)
**Status:** OPEN


**What:** The new `_lift_core_block_style()` helper in `convert.py` (commit landing 2026-05-19) uses a 26-entry module-level dict `_CORE_BLOCK_STYLE_MAP` mapping CSS properties to WP core-block `style.*` paths. This is data, not logic — should live in the canonical sgs-framework.db, not inline.

**Why DB-first:** Binding rule blub.db row 260 (2026-05-17) — hardcoded lookup dicts must check DB first. The existing `property_suffixes` (117 rows) covers the SGS-flat-attr mapping (`color → colour`, `font-size → fontSize`, etc.). Core-block style paths (`color → ["color","text"]`, `font-size → ["typography","fontSize"]`) are a parallel but distinct mapping. Either: (a) add a new column to property_suffixes (`core_block_style_path`, JSON-encoded), OR (b) add a new sibling table `core_block_style_paths` (css_property, style_path JSON, kind, image_only bool).

**Trigger:** Next converter iteration touching core-block lift OR a `/sgs-update` refresh that should propagate to both maps OR rater feedback on subsequent commits flags the duplicate.

**Approach:**
1. Schema migration adding `core_block_style_paths` table (CSV-seeded for idempotency)
2. New `db_lookup.core_block_style_path_for(css_prop)` returning `(path, kind, image_only)`
3. Replace module-level `_CORE_BLOCK_STYLE_MAP` with lazy DB call (lru_cache on first use)
4. Mark Bean's row-260 lesson satisfied

Captured: 2026-05-19 by QC rater 2 (Haiku DB-schema lens).


### P-PHASE8-9 — Slot-synonym expansion: tile / feature / module synonyms
**Status:** OPEN


**What:** The 2026-05-16 walker fix added `card → sgs/info-box` via `slot_synonyms.standalone_block`. Multi-rater /qc panel (fresh-eyes lens) recommended also registering the four next-most-common BEM element names that map to info-box compositions in real-world client mockups: `tile`, `panel`, `feature`, `module`, `item`. **UPDATE 2026-06-07:** panel/card/items → sgs/info-box SHIPPED `a2d58a3d`; remaining = tile/feature/module synonyms only.

**Trigger:** Next client onboarding hits one of these element names AND surfaces as an unmatched gap in `pipeline-state/<run>/leftover-buckets.json`, OR Phase 8 closure work touches a section with these names.

**Approach:** INSERT rows into `slot_synonyms` (sgs-framework.db) with `canonical_slot` = one of the names, `standalone_block` = `sgs/info-box`. Mirror as aliases on the existing `card` row if structurally equivalent. ~5 min per synonym.

### P-PHASE8-6 — Section-internal nav mapping
**Status:** OPEN


**What:** `<nav>` is in `SKIP_TOP_LEVEL_TAGS` so the top-level header skip works. But nested navs (inside non-header sections) currently pass-through their children as bare `<a>` tags that render as `<p>Shop</p><p>About</p>…` paragraphs. Map nested `<nav>` to `core/navigation` or `sgs/mega-menu`.

**Trigger:** Phase 8 work hits a section with nested nav, OR a new client mockup needs section-internal navigation.

**Approach:** add `<nav>` to ATOMIC_TAG_MAP routing to `core/navigation` with a child-link lifting helper. ~30 lines.


### P-MM-2 — Decide on sgs/section-heading block
**Status:** OPEN


**What:** Mama's mockup has cross-section utility classes `.sgs-section-heading__label`, `.sgs-section-heading__intro`, `.sgs-section-heading__sub` appearing inside 4 different parent sections. Currently a CSS-only convention. Decide whether to formalise as a dedicated `sgs/section-heading` block so the recogniser can match it as a real block, or leave as a utility convention.

**Trigger:** Phase 8 — if the recogniser flags these classes as orphan elements during Stage 6 (CSS classify), promote to a block. Otherwise stay as utility.

**Effort:** ~30-45 min if creating the block (block.json + edit.js + save.js + render.php + style.css). Zero if leaving as utility.


---

---

### P-9 — Bucket 2 new blocks + timeline rework
**Status:** PARTIAL (sgs/button grouping DONE `270cd995`/D146; remaining = sgs/empty-state + sgs/toggle + timeline-rework)

**Captured:** 2026-05-07

**What:** Three new SGS blocks + one rework of an existing block:

| Item | Source | Effort |
|---|---|---|
| `sgs/empty-state` block | gap candidate `empty-state-float` from animation gap audit | 25-40 min |
| `sgs/toggle` block | gap candidate `toggle-slide` from animation gap audit | 40-60 min |
| `sgs/testimonial-slider` block | gap candidate `swipe-to-dismiss` from animation gap audit | 90-120 min |
| `sgs/timeline` rework | Bean 2026-05-07: "design / lack of variety / animations are pretty awful" | 60-120 min |

Note: sgs/button grouping (`270cd995`, D146) completed. Remaining items above still open.

**Strategic dogfood opportunity:** if `/sgs-clone` is shipped + stable when this session runs, design the static layers as HTML/CSS mockups first, then run `/sgs-clone` on each as a real-world stress test. Manually layer the interactive concerns (slider gestures, toggle state) on top.

**Specialised next-session-prompt:** `.claude/next-session-prompt-bucket-2-blocks-and-timeline.md`.

**Resume trigger:** After cloning pipeline Method-2 lands.

---

## Framework + SGS surface (blocks / theme / specs / Header-Footer)

_21 entries._


**P-HEADER-FOOTER-SITE-SUFFIX-NAMING-CONVENTION** — NEW 2026-05-24 (clone pipeline convention). Headers + footers produced from drafts by the clone pipeline MUST be saved as `sgs/header-<client-slug>` / `sgs/footer-<client-slug>` (e.g. `sgs/header-mamas-munches`, `sgs/footer-mamas-munches`, `sgs/footer-indus-foods`). Bare `sgs/header` / `sgs/footer` are framework defaults, never site-specific. **Existing misnamed patterns:** `sgs/mamas-munches-header` + `sgs/mamas-munches-footer` use the inverted order (`<client>-<role>` instead of `<role>-<client>`). Phase 2 header/footer cloner should: (a) author headers/footers under the canonical convention, (b) rename the misnamed mamas-munches pair, (c) add a `/sgs-update` Stage 9 drift rule that fails when a `sgs/header-*` / `sgs/footer-*` pattern doesn't follow the canonical order. Spec 17 §S6 enforces this convention for framework defaults already; this entry extends it to client-derived patterns.
**Status:** OPEN


### P-S17-B — Pattern versioning on `wp_template_part` records (~2 hrs)
**Status:** OPEN


**What:** Pipeline cannot detect "what version of this pattern is currently live vs the version I'm about to write." Re-clone idempotence (FR-S7-4) protects against overwriting OPERATOR edits, but doesn't help when the pipeline regenerates the same pattern with intentional updates.

**Fix shape:** Add `_sgs_pattern_version` post meta alongside `_sgs_cloned_from_pattern_slug`. Pipeline compares version on re-run; if newer, overwrite; if same, skip.

**Trigger:** After v1 ships and the first pipeline regeneration scenario surfaces (likely when an SGS client requests a refresh).

**Source:** Spec 17 council, Seat 4 Round 2.

### P-S17-C — Complex nested-component patterns (~4-6 hrs)
**Status:** OPEN


**What:** v1 assumes one pattern per page section (header, footer, hero, etc.). Real mockups have 5+ levels of container > row > column > component nesting. The current 1:1 mapping breaks for designs with composite layouts.

**Fix shape:** Pattern composition registry — patterns can reference other patterns. Spec the depth limit, recursion guard, and inserter UX.

**Trigger:** When a client mockup contains a nesting structure the v1 mapping cannot represent.

**Source:** Spec 17 council, Seat 4 Round 2.

### P-S17-D — Live preview on variation picker (~3-4 hrs)
**Status:** OPEN


**What:** FR-S5-2's variation picker is a dropdown + Activate button. Operator can't see what the variation will do until they activate. The Site Editor's Styles panel has live preview; the SGS picker does not.

**Fix shape:** Either (a) replicate Site Editor's preview mechanism via iframe, OR (b) replace the dedicated picker with a deep-link into the Site Editor Styles panel. Option (b) is the v1.1 default — option (a) is a v2 idea.

**Trigger:** First operator complaint or usability test that flags the missing preview.

**Source:** Spec 17 council, Seat 2 walkthrough #2.

### P-S17-E — Public browseable pattern library marketing page (~1-2 days)
**Status:** DEFERRED

**Trigger:** When SGS has 20+ client-facing patterns OR a sales lead explicitly asks "what do my header options look like?"

**What:** Frost (the block theme) hosts `frostwp.com/patterns` — a public page listing every header/footer/section pattern with screenshots. Useful for sales conversations: agency can show a prospective client "here are 12 header shapes that work with this framework" before they commit.

**Fix shape:** Static page generated from the pattern registry (auto-screenshot via Playwright or hand-curated). Hosted on smallgiantsstudio.co.uk or a subdomain.

**Source:** Research brief idea #7.

### P-S17-F — Deeper PII export safety beyond GDPR exporter (~2-3 hrs)
**Status:** OPEN


**What:** v1 ships the basic `wp_privacy_personal_data_exporters` integration in FR-S4-1. The council surfaced a richer concern: per-key sensitivity flags, export-policy controls (e.g. "VAT number always excluded from any export channel"), and audit logging of who exported what.

**Fix shape:** Extend Site Info schema with a `sensitivity` flag per well-known key (`public` | `business-internal` | `restricted`). Export channels respect the flag.

**Trigger:** When SGS hosts a client with regulated data (medical, legal, financial) OR a GDPR audit requirement surfaces.

**Source:** Spec 17 council, Seat 3 Round 2.

### P-S17-G — Down-migrations + rollback in the migration framework (~4-6 hrs)
**Status:** DEFERRED

**Trigger:** Before the first data-destructive migration is added. Build rollback capability then, not speculatively now.

**What:** FR-S7-2's migration framework is one-way. If a future migration breaks something and the framework is rolled back, attribute data may be in an unrecoverable state. Top WP plugins (WooCommerce, Yoast) ship down-migration support.

**Fix shape:** Each migration callable in `plugins/sgs-blocks/includes/migrations/{version}.php` gains an optional `down()` method. CLI gets `wp sgs migrations rollback --to=<version>`.

**Source:** Spec 17 council, Seat 3 Round 1.


---


### P-17 — Shared universal icon picker component (framework-wide upgrade)
**Status:** OPEN


**Captured:** 2026-05-08 (during sgs/icon-list expansion review)

**What:** Every SGS block that exposes an icon picker control hardcodes its own ~8-item dropdown. Meanwhile the framework actually supports a much richer icon universe: **Lucide (1,963 SVG icons)** + **emojis treated as icons** (uimax `icon_libraries` has 12 emoji families flagged `is_emoji=1` with full Rosetta Stone equivalents) + any **other icon sets installed** (Heroicons, Phosphor, Tabler, Font Awesome — registerable via a future `sgs_register_icon_set` hook). Operators editing `sgs/icon-list`, `sgs/icon`, `sgs/icon-block`, `sgs/info-box`, `sgs/process-steps`, `sgs/multi-button`, `sgs/whatsapp-cta`, `sgs/notice-banner`, `sgs/trust-bar`, etc. all see different tiny dropdowns and never reach any of the broader universe.

**Why this matters strategically:** every clone we do that uses an icon-rich design (services pages, feature grids, process steps, food/restaurant menus) currently risks the operator picking "the closest of 8" instead of "the right icon out of thousands". Recogniser quality also suffers — it can't propose accurate icon mappings if the editor can't render them. Branded emoji-as-marker is a real client request (food sites, lifestyle brands, kids/education sites) that SGS structurally supports today but no operator can actually reach via the UI.

**Spec — universal `<IconPicker>` component (NOT lucide-specific):**

1. **New shared component:** `plugins/sgs-blocks/src/components/IconPicker.js`
   - **Source-agnostic interface** — accepts a `value` shaped as `{ source: 'lucide' | 'emoji' | 'heroicons' | '<custom>', value: '<icon-id-or-glyph>' }` and emits the same shape via `onChange`
   - **Source switcher tabs** at top: Lucide / Emoji / [other registered sets] / Recent / Favourites
   - **Search field** (debounced ~150ms) — searches across the active source by name + tag list. Cross-source search optional (toggle: "Search all sources").
   - **Virtual-scrolling grid** (`react-window` or equivalent) — only renders visible cells. Critical for Lucide (1,963 icons) and the emoji set (~3,500 standard Unicode emojis).
   - **Category sidebar per source:**
     - Lucide: commerce / food / transport / nature / interface / arrows / weather / health / etc.
     - Emoji: smileys / animals / food / activities / travel / objects / symbols / flags
     - Other sets: whatever taxonomy the set declares
   - **Favourites** — pinned icons saved per-site in `wp_options` (max 36, mixed sources).
   - **Recently used** — last 16 used in this editor session (sessionStorage).
   - **Selected preview** at the top with the source label so operator knows what's picked.
   - **Keyboard navigation** (arrow keys + Enter) and 44×44 touch targets per WCAG.

2. **Icon-set registry** (PHP + JS):
   - PHP-side: `sgs_register_icon_set( $args )` — params: `slug`, `label`, `icons` (array of `{id, name, tags, category, svg_or_glyph}`), `kind` (`'svg'` / `'emoji'` / `'font-icon'`)
   - JS-side: `wp.hooks.applyFilters('sgs.icon-picker.sources', defaultSources)` — third-party plugins can extend
   - Built-in registrations:
     - `lucide` (kind=svg) — sourced from existing `includes/lucide-icons.php` (regenerated with tag/category metadata if missing)
     - `emoji-keycap`, `emoji-people`, `emoji-food`, etc. (12 families, kind=emoji) — sourced from uimax `icon_libraries WHERE is_emoji=1`
     - Future: heroicons / phosphor / tabler — opt-in installs

3. **Render-side handling** — the `value` shape carries `source` so the renderer knows whether to:
   - For `source: 'lucide'` → output inline SVG via `sgs_get_lucide_icon()` (existing path)
   - For `source: 'emoji'` → output the glyph directly (needs `aria-label` from the icon's name for screen readers)
   - For `source: '<custom>'` → look up the registered renderer for that set
   
   Render helper: new `sgs_render_icon( $value )` in `includes/render-helpers.php` that switches on source and returns the right HTML.

4. **Migration path** — every block currently exposing an icon-picker control:
   - `sgs/icon-list` (single icon + per-item icon + pattern entries)
   - `sgs/icon`
   - `sgs/icon-block`
   - `sgs/info-box`
   - `sgs/process-steps`
   - `sgs/multi-button` (icon-before-label / icon-after-label)
   - `sgs/whatsapp-cta` (icon override)
   - `sgs/notice-banner` (state icon)
   - `sgs/trust-bar` (per-item icon)
   - `sgs/social-icons` (already partially solves this for social platforms — keep as-is OR fold in)
   - any block that hardcodes its own icon dropdown
   
   Replace each block's bespoke dropdown with `<IconPicker value={...} onChange={...} />`. **Schema change:** existing string-typed icon attributes (e.g. `icon: 'check'`) need migration to the object shape (`{ source: 'lucide', value: 'check' }`). Each migration carries a deprecation that maps old string values to the lucide source. ~15-20 min per block including build verification + deprecation.

5. **Lucide registry expansion** — `includes/lucide-icons.php` is auto-generated. If the current file doesn't carry tag/category metadata, regenerate with metadata included. Confirm the generator script during work.

6. **Emoji registry** — already in uimax. Build a one-time importer that pulls `uimax.icon_libraries WHERE is_emoji=1` plus the standard Unicode emoji set into a JSON manifest at `includes/emoji-icons.json` for the picker to consume offline.

7. **Performance budget** — virtual-scrolling means only rendered cells eat DOM. The full Lucide SVG payload should NOT be loaded on editor mount; lazy-fetch chunks (e.g. by category) on demand. Emoji glyphs are essentially free (single Unicode characters). Render `<svg>` inline only for visible Lucide cells (~20-40 × ~1KB each = ~30KB DOM at any time).

**Effort:** ~3-4 hrs for the shared component + source-registry + emoji import + Lucide metadata regen. ~15-20 minutes per migrated block × ~10 blocks = ~3-4 hrs migration including deprecations. Total **~6-8 hrs realistic** (revised up from initial 4-6 estimate to reflect the broader scope).

**Resume trigger:** standalone session (not a blocker for any active path). Could run before bucket-2 (so the 3 new bucket-2 blocks land using IconPicker from day one) or after bucket-2 (so existing blocks get the upgrade once and bucket-2 ships without it).

**Why this slipped:** original sgs/icon-list spec asked for 8 icons; nobody widened the universe since. Caught 2026-05-08 when the icon-list expansion subagent reported "Editor icon library limited to 8 editor presets" as a known limitation. Bean immediately surfaced the broader missing-functionality (emoji-as-icons + other registered sets) — captured fully here in this revised entry.

---

### P-19 — Broader saved-defaults system audit + WP-native migration
**Status:** OPEN


**Captured:** 2026-05-08 (during icon-list 3-mode design review)

**What:** SGS has a saved-defaults system (`includes/class-block-defaults.php` + `withSaveAsDefault` HOC + the 2026-05-08 unified slot-aware routes added by Fixes-1+2) that lets operators save block-attribute snapshots as site-wide defaults. Bean's insight 2026-05-08: this DUPLICATES WordPress's native Site Editor → Styles → Blocks panel (`wp_global_styles` overlay on theme.json) for visual styling, and the use cases the SGS system covered are mostly handled better by WP-native mechanisms.

The icon-list refactor (2026-05-08) removes saved-defaults usage from icon-list specifically and replaces it with a sessionStorage `useLastUsedAttributes` hook + 5 block patterns. The broader system stays in place because OTHER blocks may still use `withSaveAsDefault` — auditing + migrating each is out of scope for the icon-list refactor.

**Spec:**

1. **Audit (~30 min):**
   - Grep `plugins/sgs-blocks/src/blocks/` for `withSaveAsDefault` usage — list every consumer
   - Grep for `<BlockDefaultsPanel>` direct usage — should be 0 after icon-list refactor
   - For each consumer, classify what's being saved:
     - **Visual only** (colour, typography, spacing, border) → migrate to native WP Site Editor → Styles → Blocks panel; delete saved-defaults usage
     - **Structural** (mode, type, behaviour switches) → replace with `useLastUsedAttributes` sessionStorage hook + canonical block patterns
     - **Mixed** → split: visual goes native, structural goes sessionStorage + patterns

2. **Per-block migration (~10-20 min each):** remove HOC wrap; for visual no further action; for structural, import `useLastUsedAttributes` + register 3-5 patterns; add deprecation if attribute schema changed.

3. **Once all consumers migrated:**
   - Delete `withSaveAsDefault` HOC from `extensions/block-defaults.js`
   - Delete `<BlockDefaultsPanel>` shared component
   - Delete the slot-aware REST routes (`/block-defaults/{block}?slot=...`)
   - Delete the legacy single-slot routes (`/defaults` body-param + `/defaults/{block}` orphan)
   - Drop `class-block-defaults.php` entirely (or keep as a stub for one release cycle if read-time fallback needed)

4. **Documentation:** update CLAUDE.md to capture the model — visual styling = WP Global Styles, structural starting-state = block patterns, per-operator memory = sessionStorage, per-instance customisation = inspector. Project-wide design principle so new blocks don't reintroduce parallel saved-defaults infrastructure.

**Effort:** Audit ~30 min. Per-block migration ~10-20 min × N consumers. Cleanup ~30 min. Total likely 3-6 hours depending on N.

**Resume trigger:** framework polish pass; not blocking any active work; could fold into bucket-2 or its own session.

**Why this matters:** every parallel system the framework maintains is ongoing maintenance cost. WordPress Global Styles is well-understood by operators (it's where they already go) and well-maintained by core. Centralising on it reduces SGS surface area and makes the framework feel native to WordPress rather than "yet another plugin with its own conventions."

---

---


### P-S16-1: sgs/label `source: "html"` selector breadth
**Status:** OPEN

Source binding selector on text attr is `.wp-block-sgs-label` (the root). If save.js is ever modified to wrap content in a child element, round-trip break. Revisit when adding sgs/heading composite block (Phase 2) — same RichText shape, same potential trap.
Source: Sonnet QC 2026-05-14

### P-S16-2: `attr(data-X)` CSS responsive font-size pattern is systemic
**Status:** OPEN

Used in sgs/label + sgs/hero + sgs/info-box. Near-zero browser support for `attr()` outside `content:`. Switch all three to inline CSS custom properties at save time in a future cleanup pass.
Source: Sonnet QC 2026-05-14

### P-S16-3: variantStyle enum hardcoded in converter
**Status:** OPEN

`["standard","trial","gift"]` hardcoded in convert.py:lift_subtree_into_block_attrs. Move to live DB read via block_attributes.enum_values.
**Trigger:** Spec 16 Phase 3 wave (next converter iteration touching lift_subtree).

### P-S16-4: Pre-emit JSON serialisation validation
**Status:** OPEN

Source text with newlines / unescaped quotes / control chars could break the JSON serialisation in block markup. Currently no pre-emit validator.
**Trigger:** Spec 16 Phase 3 wave (same converter pass as P-S16-3). Batch these together.
Source: Gemini Flash QC 2026-05-14

### P-S16-5: Nested block-roots edge case (block inside block)
**Status:** OPEN

sgs-product-card inside sgs-featured-product would trigger lift_subtree on the outer block but its descendant walk would consume the inner block's slots into outer attrs. Add recursion guard.
**Trigger:** Spec 16 Phase 3 wave OR when a real client mockup hits this nested pattern (check leftover-buckets first).
Source: Sonnet QC architectural review 2026-05-14

### P-S16-6: Indus Foods + helping-doctors converter validation
**Status:** OPEN

Spec 16 §9 item 7 (closure criterion): run converter on second client without code changes. Indus Foods and helping-doctors mockups exist but haven't been tested yet.
**Trigger:** After Mama's pipeline reaches ≤1% per-section pixel-diff across 375/768/1440 (Phase 1 G1-G5 structural gaps closed). Estimated ~30 min once stable. "Mama's Phase 4" in older entry text = current Phase 1 structural recovery work.

### P-S17-W2-ADMIN-SPLIT: Split class-sgs-site-info-admin.php (502 lines → ~250 + ~80 + existing fields companion)
**Status:** OPEN

Wave 2 Task 1 + Fix Bundle A1 grew the file from 377 → 502 lines while shipping 4 QC fixes (W1 show_in_rest, W2 social-labels i18n, W3 repeater JS, U3 deprecated-blocks notice). 502 lines is 67% over the 300-line PHP cap from `plugins/sgs-blocks/CLAUDE.md`. Subagent justified the overflow as tight coupling to admin lifecycle constants.

Proposed split: extract `maybe_show_deprecated_blocks_notice()` + `handle_dismiss_floating_ui_notice()` + the 2 dismiss-related constants + the admin-post hook wire into a new `class-sgs-site-info-admin-notices.php` (~80 lines). Main class drops to ~420 lines — still over but defensibly closer.

Trigger: next time anything else gets added to `class-sgs-site-info-admin.php` (new section, new field type, new admin action) OR when Wave 3 starts. Until then, the file works fine; the cap is a maintainability target, not a runtime constraint.
Source: 4-rater /qc panel 2026-05-19 (R3 architecture, A1 + A2 findings; subagent justified inline).


### P-S17-FONT-COLLECTION-NOTICE: WP_Font_Collection sanitize_and_validate_data fires _doing_it_wrong on every WP-CLI invocation
**Status:** OPEN

**Captured 2026-05-20.** `wp_register_font_collection('sgs-google-fonts', [..., 'src' => '<URL>'])` triggers `WP_Font_Collection::sanitize_and_validate_data` with the registration metadata (which has no `font_families` — those live in the JSON at `src`, intended to lazy-load). WP 6.5+ validator complains "missing or empty property: font_families".

**Impact:** WP_DEBUG_DISPLAY is already `false` on staging so the notice is NOT user-visible in admin or frontend. Only appears in WP-CLI output (which respects different display rules). Functionally harmless — fonts work in the editor when the JSON URL is fetched.

**Options when un-parking:**
1. Register with `font_families` inline (load 2.5MB JSON via file_get_contents into a transient on first access) — heavy on cold cache
2. Move registration from `init` to `current_screen` / `enqueue_block_editor_assets` so it only fires in editor context — clean
3. Wait for WP core to fix the eager-validation regression — uncontrolled

**Recommendation:** Option 2 next time we touch this file. Hook is currently `init` — switching to a hook fired only in the block-editor admin path silences CLI noise and avoids loading 1923 entries on every request.

Touch point: `plugins/sgs-blocks/includes/class-font-collection.php`.
Source: Session 2026-05-20 sandybrown smoke test (Spec 17 live verification).

### P-S18-TRANSPARENT-PATTERN-IS-STUB: framework-header-transparent currently delegates 100% to default pattern
**Status:** OPEN

**Captured 2026-05-20.** `theme/sgs-theme/patterns/framework-header-transparent.php` is `<!-- wp:pattern {"slug":"sgs/framework-header-default"} /-->` with an inline future-work note: "v1.1: variant-specific markup + transparent-over-hero behaviour."

**Impact:** the conditional-rule engine cannot be verified end-to-end at the rendered-output layer for the transparent variant — both default and transparent rules produce byte-identical HTML. Resolver verification works in isolation (`Sgs_Header_Rules::evaluate()` returns 13151 bytes correctly), but the visible-distinction acceptance criterion from Spec 17 ("transparent header renders on homepage when rule fires") is untestable.

**To un-park:** implement the transparent overlay variant per Spec 18 v1.1:
- Sticky positioning with translucent background (likely `position: absolute; top: 0; background: rgba(255,255,255,0.8); backdrop-filter: blur(...)`)
- A distinguishing wrapper class so visual diff tests can verify which variant fired
- Once shipped, re-run the acceptance check by adding a rule with `is_front_page` condition and curling `/` to see the transparent classes appear.

**Sibling patterns to audit at same time:** `sgs/framework-header-shrink`, `sgs/framework-header-sticky`, `sgs/framework-header-centred`, `sgs/framework-header-minimal` — check whether they're real variants or stubs delegating to default too.

Source: Session 2026-05-20 sandybrown smoke test (Task 1 acceptance criterion 4).

### P-TIMELINE-ADVANCED-VISUAL-EFFECTS: sgs/timeline needs textured / themed line + progressive-fill effects
**Status:** DEFERRED
**Trigger:** MIC (Muslims in Construction) client requests the bricks timeline effect, OR any other client specifically requests a textured timeline. Do not build speculatively.

**Captured 2026-05-20.** Bean's directive (originally requested before Phase 2A, re-flagged at session end): the sgs/timeline block shipped in Phase 2A Branch D supports orientation (vertical default / horizontal), alignment, scroll-reveal via IntersectionObserver, and prefers-reduced-motion honour. But the LINE itself + per-entry backgrounds need advanced visual treatment Bean specifically asked for:

**Required effects on the timeline LINE:**
1. **Pulsing** — animated stroke or filter pulse on `.sgs-timeline__connector`
2. **Texture / theme** — operator-selectable connector style beyond `line / dashed / dotted`:
   - Vine (organic curved + leaves at intervals via SVG pattern or background-image)
   - Tree (trunk + branches at each entry node)
   - Connected bricks falling into place 1-by-1 as scroll progresses (MIC — Muslims in Construction client primary use case)
   - General colour / gradient fill that progresses with scroll position
3. **Per-entry background fill** — as user scrolls past each entry node, that entry's `.sgs-timeline__content` background fills with a colour or gradient. Operator chooses the source colour / gradient per entry OR globally per timeline.

**Implementation sketch (for the future session):**
- Add `connectorTexture` attribute (enum: 'plain' | 'pulse' | 'vine' | 'tree' | 'bricks' | 'gradient-fill') — extends existing connectorStyle
- Add `connectorFillSource` (string: token slug for colour OR gradient slug)
- Add `entryFillOnReveal` (boolean) — toggle per-entry background fill on reveal
- Add `entryFillSource` (string: token slug or per-entry override)
- view.js extends: in addition to .is-revealed toggle, track scroll position relative to each connector segment and animate fill-percentage via CSS custom property `--sgs-timeline-fill-progress` updated on rAF
- SVG-based connector renders: replace solid `<div class="sgs-timeline__connector">` with `<svg>` per connector segment when texture != plain, allowing pattern fills + path animation
- Bricks variant: each entry segment is a series of small block elements stagger-animated with transform translateY → 0 + opacity 0 → 1 on reveal

**Client driving the request:** MIC (Muslims in Construction) — wants the timeline-of-bricks visual for their journey/process page.

**Acceptance when this lands:**
- Each connector texture rendered correctly at 375 / 768 / 1440 viewports
- `prefers-reduced-motion` disables texture animation, falls back to plain solid line
- Per-entry background fill animates only on scroll progression past entry node
- Bricks variant renders distinct brick units (not a single texture)
- WCAG: animations honour reduced-motion; decorative SVG textures have `aria-hidden="true"`

**Also update blocks spec:** `.claude/specs/02-SGS-BLOCKS.md` needs an sgs/timeline section that documents these expanded effects as the canonical scope (currently only sgs/process-steps is documented as "horizontal timeline").

Source: Bean's 2026-05-20 directive — captured at end of Phase 2A massive session before cloning-pipeline resumption.

---

### P-WP70-REGISTER-BLOCK-VARIATION-MISSING — polyfill load-bearing forever

**Status:** BLOCKED
**Why:** `register_block_variation()` does NOT exist as a top-level PHP function in WP 7.0. Session A's commit `cc541e94` migrated all 13 SGS variation files to the `get_block_type_variations` filter. That polyfill is load-bearing and must not be removed by a future "WP 7.0 cleanup" refactor.
**Acceptance when this lands:**
- Watch WP 7.1+ release notes for a `register_block_variation()` top-level function. If/when introduced, the migration filter can be retired.

## Skills, agents, pipelines (lifecycle + QC + meta-tooling)

_4 entries._

**P-BATCH-GA-14-SKILLS** — Run `/batch-gap-analysis` (full `/gap-analysis` protocol per target, sequential, in main conversation per blub.db row 176) on the 14 WP/SGS skills revised during Phase 7. Targets: the 10 original WP-family skills (`wp-block-development`, `wp-block-themes`, `wp-interactivity-api`, `wp-plugin-development`, `wp-rest-api`, `wp-wpcli-and-ops`, `wp-performance`, `wp-abilities-api`, `wp-site-extraction`, `wp-project-triage`) plus `sgs-wp-engine`, `wordpress-router`, `sgs-extraction`, `sgs-clone`. Deliverable = 14 per-skill JSON evaluations + 1 review report + S-grade confirmations queued. KJC: all 14 inline at once OR ~6 critical first then iterate — Bean decides. Full original detail in `plans/archive/2026-05-24-phase-4-skill-optimisation.md`.
**Status:** OPEN
**Trigger:** After P-11-M9 ships AND G1-G5 structural gaps close (skills reference those pipeline components — grading against stale code is pointless). Do NOT run before both those milestones land.


**P-SUBAGENT-DRIVEN-DEV-SKILLSCORE-DEBT** — NEW 2026-05-23. `~/.agents/skills/subagent-driven-development/SKILL.md` scores 84% (below 90% threshold). Pre-existing issues surfaced when the line-319 xref fix triggered the skillscore hook: (a) no numbered process stages found, (b) skill doesn't declare which skills it invokes, (c) no hooks/ directory, (d) no scripts/ directory, (e) body 317 lines (over 300 working budget — needs progressive disclosure). Cleanup routes through /lifecycle per project CLAUDE.md. **Trigger:** Task 6 skill-optimiser session (mode 2 = gap analysis + research) is the natural home — bundle with /batch-gap-analysis pass on 14 WP/SGS skills.
**Status:** OPEN


### P-OPS-1 — Skill-type classifier in sgs-skillscore v3
**Status:** OPEN


**What:** 24 of 45 Phase 4 surfaces sit below 90% on skillscore because the validator grades commands, agents, mini-skills, and discipline references against full-skill criteria. A `--type` flag or auto-detection (command files in `~/.claude/commands/`, agent files in `~/.claude/agents/`, mini-skills via `user-invocable: false` frontmatter) would lift these scores out of rubric-mismatch baseline.

**Trigger:** Bean explicitly opens scope for a skillscore upgrade, or a pattern emerges where rubric-mismatch is masking a real regression. Not urgent.

**Spec:** Add `type` field detection to `sgs-skillscore.py validate`. Type tiers: full-skill (current rubric), command (CLI shortcut — relaxed), agent (identity file — different criteria), mini-skill (sub-skill routed via parent — minimal rubric), reference (discipline doc — minimal rubric).

**Effort:** ~60-90 min (rubric design + implementation + re-grade all 45 Phase 4 surfaces as regression check).

## Infrastructure (hooks, deploy, hosting, third-party integrations)

_3 entries._

**P-PHASE-5B-THEMEJSON-CONSUMPTION-PURITY** — NEW 2026-05-23 (architectural cleanup). The Customiser :root CSS custom property emission ships at `class-sgs-header-renderer.php:73-78` + `class-sgs-footer-renderer.php:68`. Current paint via inline `<style id="sgs-header-customiser">` is functionally correct but architecturally less pure than consuming via theme.json `styles.color.background = var(--sgs-header-bg)`. **Trigger:** WP-7-architecture-polish session, low priority. NOT blocking on any client work.
**Status:** OPEN


### P-4 — Trustpilot 4-review scrape (Mama's Munches)

**Status:** OPEN

**Trigger:** ~15-20 min task via Playwright MCP. Pick it up mid-clone session when the testimonials section is reached top-down.

**What:** Capture the 4 real reviews from `https://uk.trustpilot.com/review/mamasmunches.com` — quote, first name, star rating, date — into `sites/mamas-munches/research/trustpilot-reviews.json`. Then either render as static `sgs/testimonial` cards (matching mockup design) and add the free Trustpilot Mini widget for live star count, or skip and use the placeholder testimonials already in `reports/mamas-munches-page-content.html`.

**Method:** Use the inline Playwright MCP browser (already authenticated, no anti-bot has blocked us mid-session). If still blocked, fall back to manual paste from a logged-in browser tab.

**Effort:** 15-20 min once Playwright reaches the page.

---

### P-6-LUCIDE-REST-ENTRY-POINT — research WP 7.0 icon-collection registration API

**Status:** BLOCKED
**Why:** `class-sgs-lucide-icons-rest.php` checks `function_exists('wp_register_icon_collection')` — that function doesn't exist in WP 7.0 even though `WP_REST_Icons_Controller` class does. The registration entry point is somewhere else — likely a class method on `WP_REST_Icons_Controller` (candidate: `register_collection()`).
**Acceptance when this lands:**
- Correct registration API name identified from WP 7.0 source (`wp-includes/rest-api/endpoints/class-wp-rest-icons-controller.php`)
- `class-sgs-lucide-icons-rest.php` updated to actually register the SGS Lucide collection
- Playwright confirms editor icon picker loads from native REST endpoint
- `sgs_get_lucide_icon()` shim can then be retired (separate follow-up commit)

## Cross-platform emit pathway (M9+ — deferred until production-stable)

_3 entries._

### P-CP-1 — `/sgs-emit` (cross-platform component emitter)
**Status:** DEFERRED
**Trigger:** M9 production-stable + ≥3 successful clones banked. Do not start before then.


**What it does:** Read a `/sgs-clone` result (composition + filled slots + recognised SGS blocks) and emit equivalent component code for non-WP platforms. Targets in priority order: React (web SPA), React Native (mobile), Flutter (mobile), SwiftUI (iOS native), Web Components (framework-agnostic). Emit pathway uses `role-templates.json` direction:generate entries plus uimax `equivalent_implementations` payloads to map SGS blocks to platform-idiomatic components.

**Trigger:** Vague — client request for non-WP platform. Specific named use cases as recognition aids: Bean & Tub mobile app (RN); Indus Foods mobile reskin (RN or Flutter); any SGS Studio v2 mobile component. Soak ~3 months after M9 production-stable.

**Effort estimate:** ~8-12 hours initial scaffold + ~4-6 hours per platform target for first smoke test.

**Source materials:**
- uimax `stack_*` tables (Angular, Astro, Flutter, HTML/Tailwind, Jetpack Compose, Laravel, Next.js, Nuxt, React, React Native, shadcn, Svelte, SwiftUI, Three.js, Vue — 49–60 rows each)
- `role-templates.json` direction:generate entries (post-Phase 4)
- uimax `equivalent_implementations` payloads on every artefact (Rosetta Stone)
- Spec 13 (`.claude/specs/13-DRAFT-NAMING-CONVENTION.md`) — SGS-BEM is what makes cross-platform structural alignment feasible at all

**Dependencies:** M9 production-stable (so the clone pipeline is reliable before we extend it); ≥3 successful clones banked (test data); Phase 4 propagation complete (so `/sgs-clone` body honours Spec 13 lingua-franca rule).

### P-CP-2 — Style translation (theme.json → React/Flutter/SwiftUI styles)
**Status:** DEFERRED
**Trigger:** P-CP-1 in flight OR client request for style-only cross-platform port. Do not start before M9 production-stable.


**What it does:** Read `theme.json` palette + spacing + typography tokens (or uimax `design_tokens` table directly) and emit equivalent style objects for: React (CSS-in-JS objects, styled-components ThemeProvider props, Tailwind config), Flutter (`ThemeData` + per-component overrides), SwiftUI (custom modifier extensions on `View`), Web Components (CSS custom property block). Honours DTCG token format already in uimax.

**Trigger:** Vague — P-CP-1 in flight OR client request for style-only port (e.g. design system migration). Specific named: HelpingDoctors EHR app theme port from web to mobile.

**Effort estimate:** ~6-8 hours per target platform.

**Source materials:**
- uimax `design_tokens` table — 5,164 DTCG-format rows as of 2026-05-10
- Rosetta Stone payloads on token rows
- `theme.json` v3 (per-client style variations in `theme/sgs-theme/styles/`)

**Dependencies:** Not strictly required after P-CP-1 but synergistic — emit + translate ship together for full app-component parity. Deferred until M9 production-stable.

### P-CP-3 — Animation translation (uimax animations → React-spring / Flutter / SwiftUI)
**Status:** DEFERRED
**Trigger:** P-CP-1 + P-CP-2 in flight AND animation-rich app port requested. Do not start before M9 production-stable.


**What it does:** Translate CSS keyframe animations captured in uimax `animations` table to: React-spring config (`useSpring` calls + `config` objects), Flutter `AnimationController` + `Tween` setups, SwiftUI `.animation()` and `withAnimation { }` form. Reads via `equivalent_implementations` Rosetta Stone payloads on each animation row.

**Trigger:** Vague — P-CP-1 + P-CP-2 in flight, animation-rich app port requested. Specific named: Bean & Tub mobile splash/transitions; HelpingDoctors EHR loading states.

**Effort estimate:** ~4-6 hours per platform target.

**Source materials:**
- uimax `animations` table — 63 rows (post 2026-05-10 5-column migration: `is_gap_candidate`, `gap_reason`, `sgs_block`, `sgs_animation_attribute`, `equivalent_implementations`)
- Rosetta Stone payloads on animation rows

**Dependencies:** `animations` table needs ≥30 cross-platform-mapped rows (current 63 rows, but mapping coverage to verify before emit work begins). M9 will surface more animations via `/uimax-scrape-animation` runs. Cross-link to P-CP-1 and P-CP-2.

---

## Other (uncategorised — manual triage needed)

_2 entries._

### P-10 — `svg-morph` animation gap candidate (DEFERRED INDEFINITELY)
**Status:** DEFERRED


**Captured:** 2026-05-07

**Why deferred:** Requires GSAP MorphSVGPlugin — paid Club GSAP library. Misaligned with SGS open-source default.

**Resume trigger:** Only if a paid client specifically needs SVG morphing AND they're willing to fund Club GSAP licensing. Otherwise leave the uimax `animations` row flagged `is_gap_candidate=1` with a note pointing here.

**Alternative path:** Anime.js morphing helpers, custom SMIL fallbacks, hand-coded path interpolation. None match GSAP MorphSVG's polish but all are licence-free.

---

### P-2 — Phase 2.5 / G2.5 deferred work
**Status:** BLOCKED

**Blocker:** Waiting for Phase 2 G2 gate to close. The referenced `.claude/plans/phase-2-rubrics-universe.md` has been deleted — G2 gate status unverified. Verify current G2 status in `.claude/plans/` before opening this entry.

See G2.5 section in the Phase 2 plan. Triggered by Phase 2 G2 gate close + tooling spec finalisation.

- Track 2 optimiser passes (4 skills): /extract, /harden, /ethics-gate, /interactivity-capture
- Structural debt content fixes (3 agents): design-reviewer, seo-auditor, sgs-extraction
- seo-technical content fixes (3 A-grade rubric gaps + ai-crawler-management opportunity)
- 9 deletion-bound migration notes (Phase 4 design-brain DB schema dependency)

---


## 2026-06-07 — gap-consolidation adversarial-council follow-ups

> **P-GAP-CONSOLIDATION-FOLLOWUPS** — NEW 2026-06-07 (D184; surfaced by the 6-persona `/adversarial-council` on the gap consolidation; the convergent back-compat must-fixes were FIXED + shipped this session — these are the non-blocking residuals). **Status: OPEN** (framework). (1) **layout/columns attribute collision (Cynic, pre-existing):** post-grid/gallery/feature-grid pass `kind="layout"` to `ContainerWrapperControls`, whose LayoutPanel renders a "Layout type" SelectControl writing `layout: stack|flex|grid` — colliding with post-grid's OWN `layout` (`grid|list|masonry|carousel`) and `columns`. An operator touching the wrapper "Layout type" can corrupt the block's mode. Fix: a `kind="gap-only"` ContainerWrapperControls variant (Gap control only, no Layout type/columns) for blocks that have their own layout attr, OR namespace the wrapper layout attr. (2) **responsive gap half-wired (Ship-PM):** card-grid + gallery don't declare `gapTablet`/`gapMobile` attrs, so the shared control's tablet/mobile gap is silently dropped for them; post-grid declares but render only consumes desktop. Either declare+consume the responsive attrs or hide tablet/mobile in the control for those kinds. (3) **container blockGap value migration (Architect/Support, low-risk):** removing `supports.spacing.blockGap` orphans any container that stored `style.spacing.blockGap` via the WP-native control (it never drove the rendered gap, so benign — but a content scan or a `migrate()` lifting it to the `gap` attr would honour "existing pages identical"). (4) **tests:** add the 4 deprecating block slugs to `tests/php/BlockDeprecationsTest.php` `AFFECTED_BLOCKS`; add a `sgs_container_gap_value()` injection/sanitisation unit test (it is now the sole security floor for 6+ blocks). (5) **helper correctness:** `sgs_container_gap_value()` strips `()` so `calc()`/`clamp()` gap values are silently mangled — document the limitation or whitelist via `safecss_filter_attr()`. **Bucket:** Framework / shop layer.


---


<!-- 2026-06-11 Spec 30 P1 follow-ups (P-WC-GALLERY-VARIATION-SWAP, P-WC-NOTIFY-ME-CAPTURE) RESOLVED 2026-06-12 (D216/D217) → memory/parking-archive.md -->


---


## 2026-06-21 — F5 residuals (deferred after F5 COMPLETE)

> **P-F5-RESIDUALS** — NEW 2026-06-21 (D239); pruned through D241. F5 is **COMPLETE + HARDENED + FACT-CHECKED** (D240 council fixes + D241 fact-check-all + final closes). Every original residual was fact-checked against ground truth; the small/real ones are DONE (check #8 bound-emit tripwire, harness-canary, scope-honesty doc), and the non-issues were dismissed WITH evidence (#3 shorthand — css_router keeps shorthand whole, matches declare_input, so no gate mismatch; #5 inline — already fail-safe as UNACCOUNTED + no fixture has inline; #6 --update-baseline — the SHA-256 hashes already give the protection, the command is a deliberate visible act; #7 fail-open — now closed by the harness-canary). **Only TWO genuine items remain, BOTH evidenced as not-now (NOT small/habit-deferral):** (1) **F3-RUNTIME — the LANDED leg:** arms `ledger/coverage_check.py::check_landed()` + the coverage-matrix's COVERED/CHEAT. INFRA-BLOCKED — `oracle/capture.py` launches Playwright over a RENDERED page; arming it needs a browser render-harness + deploy over the 37-fixture corpus (hours of infra), and per spec it arms when "the rebuild first renders many fixtures". (2) **css_router D1 media-axis:** REBUILD-SCOPE — D1 is a DEAD output (convert.py does not consume it since the 2026-05-27 merge deletion), the coverage gate already fails-safe on the collapse (a lost media-variant surfaces as UNACCOUNTED, never hidden), and Stage 0.7/D1's fate is the rebuild's open MF-2 decision (retire-OR-rewire) — editing it now pre-empts that for ~zero current benefit. **Status: DEFERRED** (both arm/resolve AS PART OF the stage-rebuild, not as standalone polish). **Bucket:** Tooling / pipeline gates.


## 2026-07-04 — plans-folder archive sweep residuals (W3 plan + sign-off ledger)

> **P-W3-ARCHIVE-RESIDUALS** — NEW 2026-07-04 (captured during the plans-folder archive sweep; everything else in the 12 archived docs is DONE / superseded / carried in the live completion plan `2026-07-04-new-engine-to-parity-delete-converter-v2.md`). **Status: OPEN.** (1) **`!important` render-surface sweep** (from the W3 plan's remaining-work table; RE-MEASURED 2026-07-04 against the live cheat-gate run): Check #3 (`!important` in render surface, selector-aware) = **30 baselined findings** (whole-gate total baseline = 73, 0 NEW); the sweep is post-LANDED cleanup — burn Check #3 to 0, never add new. (2) **FP-P (product-card CTA not flex-stretched)** — from the archived sign-off ledger, measured real 2026-06-14 (draft CTA 598px stretched, clone CTA 183px content-width). FACT-CHECKED 2026-07-04 against the current block source: the TYPED card's CTA row now stretches `.btn`-classed buttons (`.sgs-product-card__cta-row .btn { flex:1 1 auto }`, product-card/style.css:1045) — but the CLONE emits an `sgs/button` child WITHOUT `.btn`, so the rule misses it; still open for the cloned path. Fix layer = the product-card Layer-B design-gate (the completion plan's Phase-2 product-card landing), not converter routing. **UPDATE 2026-07-04 (D275): the "clone emits an sgs/button child" premise is now HISTORICAL — post-purge clones emit the card with ZERO children (legacy InnerBlocks emission deleted at source), so the mis-classed-child failure mode is gone; FP-P resolves when Phase 2 lands `ctaText` into the typed attr (the typed CTA row already stretches `.btn`). Verify on the first Phase-2 re-clone, then flip.** (3) **Verify-on-next-ledger-walk (likely closed, not yet flipped):** BR-B (brand image 0×0 sideload — today's live check shows all 6 page-8 images HTTP 200, so probably resolved) + IN-E (info-box inherited text-align — D267's band `textAlign` fold + explicit `has-text-align-*` render likely closed it; ingredients band verified centred). Flip both rows with computed-style evidence on the next full ledger walk. **Bucket:** Cloning pipeline / fidelity.

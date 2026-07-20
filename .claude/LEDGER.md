---
doc_type: state
project: small-giants-wp
project_id: 14
last_updated: 2026-07-20
generated: 2026-07-17 (P4 — collapsed state.md + handoff.md + next-session-prompt.md into this one LEDGER)
note: "THE single living-status doc. Replaces the old 3-way split (state/handoff/next-session-prompt) that drifted and overwrote each other. Current status is REPLACED here each session, never appended (that is how state.md ballooned to 66KB). History → dated snapshots in memory/session-YYYY-MM-DD.md (the ledger-rotate Stop hook backs this up). Structural defences (STOP catalogue + pre-flight ritual) live UNCAPPED in STOP-CATALOGUE.md. Keep this file lean (< 24576 bytes — the rotate hook warns past that)."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary

### ⭐ FOR BEAN — plain English (read this first)

**What this is.** One file that answers "where are we and what's next," so a fresh session
(or you) gets ONE true answer instead of three drifting ones. It replaces the old three
docs (state / handoff / next-session-prompt) that kept contradicting each other.

**Track 2 history (P2 + P2.5) — CLOSED, detail archived.** P2 (the header/footer/nav BUILDER
design-gate) is DONE + SIGNED OFF: `plans/2026-07-18-P2-builder-ux-design-gate.md` — the
settings panel a non-coder uses, over a CPT editing home (`sgs_header`/`sgs_footer`, NOT the
Site Editor), tri-state per-device controls, starter-template picker, bound to Spec 35.
Navigation was then carved out as P2.5 (full rework — Bean overrode the council's "salvage
adaptive-nav"). **P2.5 outcome: `specs/36-SGS-NAVIGATION-SYSTEM.md` SIGNED OFF v2.1
(2026-07-19)** — the single canonical nav home; 7-persona adversarial council + qc-council
fact-check, all 26 FRs survive; code-salvage audit evidenced to `file:line`
(`reports/2026-07-19-P2.5-phase6.5-salvage-audit.md`); safe doc-purge done (spec 34 DELETED,
Spec 17/02 → Spec 36 pointers). Menu data = **CLASSIC WP menus PRIMARY** (`wp_navigation` is a
Phase-3 extra — an earlier "wp_navigation locked" line was a stale carry, corrected 07-19).
**Still deferred post-build (needs the new block-name roster):** Spec 17 S9-1/-2/-8/-10,
`00 §2.1` + `no-header-footer-block.py` roster, Spec 29 rows, retiring
adaptive-nav/mega-menu/mobile-nav DB rows via `/sgs-update`, the block-registration deletion +
Indus header cutover (FR-36-18), and the Spec 33 Part 2 emit-target repoint (FR-36-15).
Full narrative: `memory/session-2026-07-19*.md`.
**Phase 1 EXECUTING — the plan is QC-clean (92/100): `plans/2026-07-19-spec36-phase1-mvp-nav-plan.md`.**
- **WAVES 0–3 DONE + on main** (`eaa4310e`, `f9c381f2`, `1ed828f0`, `5672b4c6`, `e6c10428`, `b41352fc`).
  Built: the shared `store('sgs/nav')` (D323 body-reparent + D340 scroll-lock ported verbatim, the two
  old focus-traps MERGED, API contract published); **`sgs/nav-menu`** (flat bar + burger→drawer, menu
  picker, collapse-point N, featured checklist, configurable `navLabel`, client-side `aria-current`);
  **`sgs/nav-drawer`** (full-screen `<dialog showModal>`, × undeletable chrome, FR-34-5 drawer settings)
  — **content-KIND block-private**, since a `<dialog>` cannot be hosted by `SGS_Container_Wrapper` (D294,
  Bean-approved); `scripts/nav-qa/` Gate-1 tooling; cart `role=status`; responsive-logo fixes. Track-1
  (Spec 35) was merged FIRST so the deploy shipped a complete plugin; `/sgs-update` ran (db-consistency
  0 violations after dropping `is_section_root`); deployed to sandybrown; **header re-authored** in
  `parts/header.html` (the version-controlled block-theme part, NOT the DB) — legacy `sgs/adaptive-nav`
  dropped for `sgs/nav-menu` (ref=1467) + `sgs/nav-drawer`, with adaptive-nav left registered but dormant
  for rollback. Gotchas captured: a new block needs a `seed-composition-roles.py` entry for the F6 gate;
  a nested nav-menu rendered a self-closing burger. Full narrative: `memory/session-2026-07-20*.md`.
- **WAVE 4 COMPLETE (2026-07-20) — machine-green + Bean-signed. Detail:** Cache purged, then ran the
  `scripts/nav-qa/` suite live. **GREEN:** axe on the OPEN drawer (375, scoped) = **0 violations**; crawl-assert PASS
  (5 bar + 5 drawer + logo present with JS off — **the "14 links" worry is ANSWERED: bar+drawer copies, not
  duplication**); burger-opens / ESC-closes / focus-returns-to-burger / Tab-contained all pass at 375; bar renders
  768+1440. logical-props-lint = 5 WARN (nudge only, nav-drawer `left/right` → logical props).
  **ONE REAL NAV BLOCKER FOUND + FIXED + LIVE-VERIFIED (D351, `cc3ec56d`+`45970282`, pushed):** the featured
  "Send to Ward" item rendered accent-gold on cream at **1.35:1**. Root cause was NOT a contrast-policy gap —
  `sgs/nav-menu` had **no `featuredBg` attribute at all**, so the converter had nowhere to put the draft's pill fill
  (`background:var(--primary)` + `color:var(--text)`) and silently dropped it. Added `featuredBg` (default `''` =
  label form unchanged); pill foreground routed through the existing `sgs_wcag_preferred_text_colour_for_bg` helper
  so no palette can regress below AA. Draft pairing = 5.28:1 PASS — **the fidelity fix and the a11y fix were one fix.**
  Deployed + re-measured: all 5 predictions (committed BEFORE the deploy ran) held exactly; drawer axe still 0, no
  regression. Report `reports/visual-diff/nav-menu-2026-07-20.md` — **PASS for the RESTING state only.**
  *(Bean caught my first diagnosis — I began designing a contrast fallback instead of reading the draft. Lesson in D351.)*
  **⚠ Then it silently REGRESSED and Bean caught that too:** at 01:36 UTC a **co-active session's deploy overwrote the
  canary** with a build lacking the commit (measured: live md5 `ffdb6129…`/15,865 B vs local `738c4558…`/17,462 B,
  `featured_bg_hex`=0 server-side). Redeployed; server md5 now matches local exactly, pill correct at 768+1440.
  **`build-deploy.py`'s verify leg did NOT catch this** — it asserts only HTTP 200 + generic SGS markers, which pass on
  any working page including one running old code (`P-DEPLOY-VERIFY-NOT-CHANGE-SPECIFIC` + `P-CANARY-SHARED-DEPLOY-RACE`).
  **On a shared canary, treat "deployed + verified" as perishable — checksum the deployed file against local.**
  **STILL DIVERGENT (Bean-deferred): HOVER.** Draft = pill + `inset 0 -2px 0 accent`, no underline; live adds an
  underline from §4c's fallback branch. NOT fixed here — hover is being reworked at block level separately
  (`P-NAV-FEATURED-HOVER-DRAFT-PARITY`). The featured item is draft-faithful at REST, not on hover.
- **WAVE 4 — occlusion sweep + perf DONE (2026-07-20).**
  **(c) elementFromPoint sweep: `probes.mamas.json` AUTHORED + PASSING — TOTAL 20/20, including exactly 10/10 at 375,
  the Spec 36 §8 Mama's baseline.** Written against the LIVE DOM, not the block source (the shipped
  `probes.example.json` was Wave-0 placeholders whose selectors match 0 elements). Proves: the header row hit-tests
  to the drawer's close control, all 5 drawer links + the logo return themselves at their own centres, the close
  returns itself, and mid/low page are unreachable behind the modal; 5/5 bar links reachable at both 768 and 1440.
  ⚠ **Selector trap documented in the file:** there are TWO `.sgs-nav-menu__bar` instances (header + the drawer's
  copy) — a bare selector silently probes whichever is first in the DOM; every probe is scoped `.sgs-site-header`
  or `.sgs-nav-drawer`.
  **(d) Perf: CLS PASSES (0.0000 at 375, 0.0144 at 1440, budget <0.1). Page CSS/JS budget FAILS but NOT because of
  the nav** — CSS 371.2KB vs 100KB, JS 84.0KB vs 50KB; nav share is only 17.3KB JS + ~0 separate CSS. Dominated by
  WooCommerce (118.3KB CSS — WC alone exceeds the whole CSS budget), the theme's `woocommerce.css` (46.5KB),
  core-blocks CSS (47.9KB) and jQuery (28.8KB, pulled by WC not by SGS code). **Cheap nav-adjacent win found:
  `mega-menu-panels.css` (13.1KB) loads although Phase 1 ships no mega menu.** Logged `P-CANARY-PAGE-WEIGHT-BUDGET`
  — **do NOT block Gate-1 on it** (nav is not the cause, CLS passes).
- **WAVE 4 — Bean's eye (R-31-13) PASSED 2026-07-20** on both the desktop bar and the open mobile drawer.
- **WAVE 4 — drawer open-animation direction control SHIPPED (`31209f58`, live-verified).** Bean could not judge
  the D340 bounce test because the drawer entered with a VERTICAL nudge while the bounce is a HORIZONTAL geometry
  shift — the entry animation masked the axis under test (the old drawer slid in from the right, which is why the
  bounce was visible then). The entry animation was a hardcoded `translateY(-8px)` regardless of `edge` (and `edge`
  is geometry, not motion). Added **`animateFrom`**: `auto` (default — emits NO class, existing sites unchanged) |
  `fade` | `right` | `left` | `top` | `bottom`, with a plain-language inspector control. **Every directional rule
  sits INSIDE the `prefers-reduced-motion: no-preference` block, so reduced-motion users see no movement whichever
  value is chosen — PROVEN by emulation, not asserted** (`reduce` → `animation-name:none`, `transform:none`, drawer
  still opens). Header set to `animateFrom:right`. 3/3 predictions held; axe still 0; no regression. Report
  `reports/visual-diff/nav-drawer-2026-07-20.md` PASS. Deploy **checksum-verified** local↔server this time.
- **WAVE 4 — D340 BOUNCE TEST PASSED (Bean, manual, 2026-07-20): "100% fixed. Totally not there anymore."**
  Established by Bean in a real windowed desktop browser — the ONLY instrument that can observe it. ⚠ The harness
  cannot and must not claim this: headless Chromium reports `innerWidth - clientWidth = 0` (overlay scrollbars), so
  the store's classic-scrollbar guard never fires. D340's fix (`store.js` pins the root scrollbar track while
  locked) is now VERIFIED.
- **WAVE 4 — drawer EXIT animation fixed (live-verified).** Bean caught it straight after: the drawer "just goes"
  on close instead of reversing. **A real bug PREDATING the animateFrom work** — the original vertical exit
  keyframes were equally dead. Cause (read from source): `runClose()` added `.is-closing` then called
  `dialog.close()` in the SAME tick; `close()` removes `[open]` → `<dialog>` is `display:none` immediately → the
  browser never painted a frame of `.is-closing`. Fix: animate, then close on `animationend` (target-checked;
  fail-safe timeout reads the REAL computed `animationDuration`, so a stuck-open drawer is impossible). **Native
  ESC bypassed `runClose` entirely** on a modal `<dialog>` — now routed through the same path, so ×/ESC/scrim
  behave identically. ⚠ **SHARED-STORE change** (`store('sgs/nav')`, consumed by nav-drawer + nav-menu); the
  native `close` event remains the single teardown point and is untouched. Verified across 4 routes × reduced-motion;
  exit now reverses entry (`slide-in-right`→`slide-out-right`), reduce still closes instantly. **No regression:
  axe 0, sweep still 20/20, ESC/focus/Tab all pass.**
- **FR-36-1 CLASSIC-MENU RESOLVER — BUILT + LIVE-VERIFIED (D352, `4a4c220a`, pushed, 2026-07-20).** The nav
  could only read block menus; Spec 36 makes CLASSIC menus (*Appearance → Menus*) primary, so a classic menu
  rendered nothing. Resolver now goes CLASSIC-FIRST then `wp_navigation` (**Bean's ruling**: keep the single
  numeric `ref`, let classic win the id tie — no new attr, no reshape), normalising classic items into the same
  block-shaped array so `flatten()`/drawer/edit.js needed ZERO changes. FR-36-1's missing fallback order
  (theme location → latest classic → latest block menu) also implemented. Editor picker now lists classic
  menus (they were unpickable) and disables a block menu whose id clashes. Deploy **checksum-matched**
  local↔server. ⚠ **First acceptance run was VACUOUS and was caught**: the 5 labels asserted also come from the
  header's block menu, so it would have passed with the feature absent — redone with a `ClassicOnlyMarker`
  present on the classic page and ABSENT on the homepage (negative control). 6 real `<a href>` in pre-JS HTML,
  child item correctly flattened out, `/gift-ideas/` vs header's `/gifts/` proves distinct sources. No
  regression: homepage crawl 5/5, drawer axe **0**, sweep **20/20**. Spec 36 FR-36-13 also corrected (it
  wrongly said nav-drawer keeps `SGS_Container_Wrapper`) + `<dialog>`-exception documented.
  **Test fixtures left on the canary for inspection — say the word and I'll remove:** classic menu term **94**
  ("SGS Classic Test Menu", assigned to no location so it cannot affect the header) + page **1548**
  `/fr-36-1-classic-menu-test/`.
- **WAVE 4 COMPLETE — Gate-1 is machine-green + Bean-signed.** Remaining before Phase 1 closes: featured hover parity
  (now largely absorbed by Track 1's hover work — RECHECK before re-opening). Content refinements for the editor:
  menu 1467 uses `/gifts/` (mockup wants `/gift-ideas/`, page exists) + an "Our Story" submenu (flattened in Phase-1).
- **NOT nav, recorded so it isn't re-flagged as a nav regression** (all present before the fix): 2 page contrast
  fails (button #c56a7a/white 3.67:1, Trustpilot #00b67a/white 2.63:1) + a **duplicate `<main>` landmark** (3 axe
  rules) — live-DOM probe traced the inner one to a `core/group` in the PAGE content, so it belongs to the queued
  core→SGS migration (product-queue task A), not to nav.
- **2 new gate findings logged, neither bypassed silently:** `P-AUDIT-COLOUR-ROLE-KEYED` (the uniformity audit's
  supports.color check is NAME-keyed with a permanent false-positive class — re-key it on the Spec 35 element
  manifest, which already has `isWrapper`+`attrMap`; 1/79 blocks seeded so it lands incrementally) and
  `P-VISUAL-GATE-ORDERING` (the visual-diff commit gate wants live proof, but proof needs deploy and deploy needs
  a clean tree — circular; best fix = split pre-commit "report exists + BEFORE captured" from a post-deploy AFTER
  check wired into `build-deploy.py`'s verify leg).
  **Architectural follow-up — CLOSED 2026-07-20 (D352):** the classic-menu resolver is built + live-verified
  (see the FR-36-1 entry above). Bean rulings still standing: converter/clone DEPRIORITISED until the whole
  header+footer+nav is done; featured-item = a block attribute.
Handoff: `next-session-prompt-nav-rework-P2.5.md`.

**Latest (2026-07-20, Track 1 — Spec 35 rollout, 4 commits, all merged to main via `5672b4c6`).**
Element-first inspector design LOCKED + its machine contract BUILT + the exemplar made real:
(1) **Parallax split** — background parallax = a toggle in the native Colour panel (`group="color"`,
background-capable blocks only) with conditional Strength; element parallax = its own renamed+explained
panel with conditional Strength; both drive the one `sgsParallax` enum (mutually exclusive) → zero
render/data-model change; live-verified (`1d476c26`). (2) **Task 2 #1 — element manifest** (`supports.sgs.elements`
= `{label,order,clusters[],prefix?,isWrapper?,attrMap?}`) + `cluster-member-sets.json` (text/fill/layout
member sets from the registry) + `check-element-manifest-conformance.js` (CLUSTER-COHERENCE rule, WARN-only);
brand-strip manifest seeded — honest run **16 OK / 22 gaps** (`869fe84d`). (3) **Task 2 #2 — brand-strip
exemplar now CONSUMES the real controls**: `tileShadow` → `ShadowControl` (scoped `<style>`, no inline),
per-logo link → `SgsLinkControl` (`869fe84d`). (4) **ShadowControl crash fix** — live-verify caught it
crashing on first render (`useSettings('shadow.presets')` returns WP's origin-keyed `{default,theme,custom}`
object on WP 7.0.x, not an array); normalised + slug-deduped; re-verified live (`bffb00ff`). Also: **Task 4
live-verified** (form-field inspector decluttered). **Next:** Task 3 (hover-duplicate codemod — design-gate
first), Task 6 (wire linters WARN-only), Task 2 #3 (per-device border/shadow — design-gate), #4 (content-tab
spec), step-5 (per-block manifest gap-closing from the 22-gap list). Handoff: `next-session-prompt-spec35-track1.md`.

**Prior (2026-07-19, Track 1 — Spec 35 block-inspector-UX, 11 commits).** Phase 0 foundations DONE +
the attribute-registry (Spec 35 UNIT A+) mapped through Phase 1c. Built: the inspector DONE-checklist;
the block roster (79 blocks, DB-derived); **all 3 audits** (inspector-conformance JSX-AST, feature-parity,
shrink-to-fit — all WARN-only, keyed to the roster); **3 shared components** (`DesignTokenPicker` enableAlpha,
`SgsLinkControl`, `ShadowControl` — infra; now consumed by brand-strip, see the 2026-07-20 entry); brand-strip QC'd as the pilot
exemplar; the **min-width:0 wrapper backstop** (Gate C0 approved, built, deployed to canary, no regression —
but NOT live-emission-proven, homepage has no wrapper-grid container; UNIT D will prove it). **The registry
insight (Bean-driven):** 944 attr names → ~80 TRUE settings (≈60 CSS-property + 12 input-types + 11
behaviour-families); the "282 one-offs" were classifier laziness (dedup by NAME not property-identity). Dedup
fully adjudicated (Haiku + Sonnet), 0 genuinely-unique. `plugins/sgs-blocks/scripts/consistency/` holds it all.
**Next (Phase 2, fresh session):** define the OPTIMAL control per setting (needs Bean's design input) →
Phase 3 lint → UNIT D pilot (sgs/media). See `.claude/next-session-prompt.md`.

**Where we are (2026-07-17).** Two things run in parallel:
1. **The website builder itself** — the header/footer/nav system + the drawer menu are built
   and LIVE on both your test site (sandybrown) and the Indus site (palestine-lives). The
   last real product work (Phase 2 nav/logo fixes + the disclosure drawer) shipped and was
   merged to the `main` line. A few small polish items and the Indus header/footer match are
   still queued (below).
2. **A tidy-up of how the project is run** — a signed-off plan
   (now `plans/archive/2026-07-16-setup-simplification-and-protocol.md`) culled cruft and added
   automatic guard-rails so the AI needs less babysitting. **This plan is now FULLY COMPLETE
   (P0–P6) and archived** — the only remaining work is the product front (below).

**Why it matters.** You are QC-only on the framework; every drifting doc or missing guard-rail
is time you have to spend catching mistakes. Collapsing to one ledger + adding the guard-rails
is directly buying down that tax.

**Your single next action.** Nothing is blocked. Two independent fronts to pick from: the
**product** front — the drawer link-colour polish (a 5-minute fix) at the top of the "Product
queue" below, then the Indus header/footer match; or the **setup** front — the setup-simplification plan is now **FULLY CLOSED**: P5
(WCAG 2.1 baseline + agent refresh + skills refresh) and **P6 (global tidy-ups — CLAUDE.md
276→51 lines, `__pycache__` gone, situational rules path-scoped, plus 2 new auto-gates that
stop CLAUDE.md re-bloating and big blobs entering commits) are both COMPLETE.** So the only
remaining work is the **product** front (drawer polish, Indus header/footer). P3glob (the
global enforcement hooks — the AI now has to PROVE it verified SGS work before it can close a
session) and P4 (the LEDGER collapse) are done + live.

---

## State Snapshot

### Live status (machine-checkable — verify, don't trust the cache)

- **Branch:** `main` (verified 2026-07-20; the old note about `feat/brand-strip-inspector-rebuild` is DEAD — that
  branch was merged + deleted on origin in Wave 3). **HEAD:** `45970282` (Spec 36 Wave-4 D351, pushed).
  **D-ceiling:** **D351** (nav featured-pill fidelity/a11y incident, 2026-07-20, `cc3ec56d`). Re-check the branch in
  the SAME command as any commit (STOP-RECHECK-BRANCH) — these values drift, verify rather than trust this line.
- **Canonical spec:** `specs/31-UNIVERSAL-CLONING-PIPELINE.md` — the standing governing spec for cloning-pipeline work; read IN FULL each cloning session.
  For the active header/footer/nav front, also `specs/34-ADAPTIVE-NAV-DISCLOSURE-DRAWER.md` + `specs/17` §S9.
- **Sites:** dev = palestine-lives.org (Indus). staging/canary = sandybrown-nightingale-600381.hostingersite.com. Both WP 7.0.1.
- **Verify every session (no cached line is authoritative):**
  - `git log -1 --stat` + `git status` + `git branch --show-current`
  - D-ceiling: `grep -oE 'D[0-9]{1,4}' .claude/decisions.md | sort -V | tail -1`
  - Framework counts: `/sgs-db` or `/wp-blocks` (the DB is authoritative; counts are NOT in prose)
  - Commit by EXACT PATH, never `git add -A`. `main` is the source of truth. Re-check the
    branch in the SAME command as the commit (STOP-RECHECK-BRANCH).

---

## Setup-simplification track (the meta plan) — CLOSED

Plan: `plans/archive/2026-07-16-setup-simplification-and-protocol.md` — **fully executed
(P0–P6) and ARCHIVED 2026-07-17.** Historical reference only. All 7 phases done and live on
`main`: P0–P2 culls + archive-with-redirect · P3proj project enforcement (`spec-drift-commit-gate.py`
wired, f5 machine-evidence converter guard) · P4 the 3-doc collapse into this LEDGER +
`STOP-CATALOGUE.md` + the `ledger-rotate.py` Stop hook · P3glob 3 global hooks (machine-evidence
sgs-selfreport, `baseline-update-gate.py`, handoff uncommitted-work warn) · P5 agent + skills
refresh + WCAG 2.1 AA baseline (incl. the LEAN-RULER pivot and the `reasoning-skill-judge`) ·
P6 global CLAUDE.md 276→51 lines + 2 new commit gates.

**Full per-phase detail** (it ran to ~20KB and was crowding this ledger out):
`memory/session-2026-07-17-p5-skills-lean-ruler.md` + the archived plan + `~/.claude` commits
`394a671` / `0a96908` / `f225c01` / `fd63ccc`.

**Two durability caveats still standing:** `~/.agents` is NOT a git repo, so the skillscore
script + the 5 grafted skills + `nextjs-testing` are LIVE but UNVERSIONED (recovery = per-file
`.bak-2026-07-17-*`); and the `lifecycle-gate-stop.py` unwire is done locally but NOT yet
committed to the `~/.claude` repo.

**Stray thread CLOSED 2026-07-17 (was the last incomplete non-P6 item, plan §3.5):** the `lifecycle-gate-stop.py` no-op stub was **unwired from `~/.claude/settings.json` + the stub file deleted** (JSON re-validated; wiring hits = 0). Global CLAUDE.md doc-drift fixed (2 refs now say "unwired+deleted"). Also reworded the phantom `seo-geo` refs in `seo-technical.md` + `wp-sgs-developer.md` to make explicit it is the `/seo-geo` **skill**, not an agent. Backup: `~/.claude/settings.json.bak-2026-07-17-preLifecycleUnwire`. NOT yet committed to the `~/.claude` repo (offer stands).

**The go-forward protocol (plan §5) — captured as a lesson:** (1) one ledger, Stop-rotated;
(2) structural gates over prose; (3) done = machine evidence; (4) minimal always-on context
(≤80-line cap on the GLOBAL CLAUDE.md only); (5) clean folders; (6) docs gated like code;
(7) verify contents not filenames; (8) protect architecture, cull description.

---

## Product queue (the website-builder work — reconcile before acting, some is already live)

**Indus "Our Brands" clone fidelity — DONE 2026-07-17 (D343, live-verified).** Matched to the
reference at hero-grade via computed-CSS extraction. Shipped: NEW `sgs/separator` block (its
replaces-table entry REVERTED pending the migration pairing — task A below), brand-strip tile
controls, the WP `border-width` var-name-collision fix (STOP-WP-STYLE-SUBSTRING-COLLISION), a
framework letter-spacing fix, NEW `extract-css-diff.js` (the standard extract-and-diff tool,
`--why` = CDP provenance), NEW theme-CSS hardcode lint. Detail: `decisions.md` D343.

**Indus next-session tasks (Bean-directed 2026-07-17, ties to Track C + the replaces table):**
- **A — core→SGS migration (the "I thought all core blocks were already SGS" item).** Atomic unit:
  (1) **build the `sgs/separator` migration pairing** — `migrate-core-blocks/pairings/separator_pairing.py`
  does NOT exist (follow heading_pairing.py/image_pairing.py); (2) **re-add** `sgs/separator`→`core/separator`
  to `block-replacements.json` + `/sgs-update` (this session reverted it — `49e6fc4f` — because it
  build-blocked with no pairing); (3) **migrate the 4 theme patterns still using core/separator**
  (`footer-centred`, `footer-columns`, `mega-menu-split-info-cta`, `pricing-columns`) — `check-no-core-blocks`
  will pass once done; (4) **page 13**: convert the "Our Brands" band `core/group` → `sgs/container`
  (already has `verticalAlign`/`justifyContent`/stack — use `verticalAlign:center`, drop the padding fudge)
  + audit page 13 for all remaining replaceable core blocks (`core/heading`, `core/columns`, …) and migrate.
- **B — wire `lint-theme-css-hardcodes.py` into prebuild** (currently runnable but not gated).
- **C — deferred:** Services-section 768 overflow (hardcoded `139/250/123/187=771px` columns →
  responsive `fr`); Services button-border decision; Task-2 detection-method brainstorm (the
  extractor is the core of it — decide if it becomes a standard pre-close gate).

**Last shipped before this track (D341/D342, 2026-07-16, on `main`):** Phase 2 nav/logo fixes —
`sgs/responsive-logo` operator `custom` breakpoint; `sgs/adaptive-nav` collapse tier reads
`SGS_Breakpoints`. Track C core→SGS migration (395→0 replaceable core blocks). All live-verified
on both sites. Detail: `decisions.md` D341/D342 + `memory/session-2026-07-16.md`.

**Phase 1 drawer polish — DONE 2026-07-17 (superseded by the Spec 36 rebuild).** WCAG-preferred
resting link colour via `sgs_wcag_preferred_text_colour_for_bg` + the auto-focus underline fix.
Both behaviours now live in the NEW nav blocks; the old report's deferred eyeball is moot.

2. **Phase 3 — finish Spec 34** (`specs/34-ADAPTIVE-NAV-DISCLOSURE-DRAWER.md`, plan
   `plans/2026-07-15-spec34-build-plan.md`): Step 5 drawer settings (FR-34-5), Step 6
   builder reflection (FR-34-6 — RECONCILE, don't redo), Gate C (FR-34-7), then a FRESH
   `/adversarial-council` + prove the Site-Editor→frontend round trip for BOTH header AND
   footer (they are wired differently — test both).
3. **Step 1 — SPLIT framework vs per-site header/footer.** Move/delete
   `theme/sgs-theme/patterns/footer-indus-foods.php` (the only client-named framework
   pattern; leaks "Indus Foods Footer" + a hardcoded Google Place CID to every install);
   decide the per-site channel (JSON snapshot vs REST); gitignore per-site files. Do this
   BEFORE Goals 4/1 so they write to the per-site channel.
4. **Goal 4 — match the Mama's draft** (`sites/mamas-munches/mockups/homepage/TRUTH-SPEC.md`):
   fix its 2 liabilities first (cites non-existent `header/footer-mamas-munches` patterns;
   maps the hamburger to the deleted `sgs/mobile-nav-toggle` → re-point at `sgs/adaptive-nav`).
   Bean's heading-specific eye pass (R-31-13) lands here.
5. **Goal 1 — replicate the Indus header/footer.** BASELINE = the preserved hand-built
   Astra/Spectra site https://lightsalmon-tarsier-683012.hostingersite.com/ (NOT the
   `mockups/*.html`). Capture it AS A FILE FIRST (`reports/visual-diff/header-footer-baseline-indus.json`).
   Open defects: logo mobile-tier switch (confirm the D341 `custom` mode covers it); buttons/rows/bg
   not preserved; sticky+shrinking header; mega-menu shows on mobile+desktop. NEW:
   `P-INDUS-BRANDSTRIP-OVERFLOW-9PX` (width-independent 9px overflow, source = `sgs-brand-strip` marquee).
6. **Goal 3 — de-hardcode base blocks.** `site-header/edit.js` + `site-footer/edit.js`
   TEMPLATEs + row blocks — remove the content hardcoded into them (NOT "empty containers").
   REMOVE the `Quick Links`/`Contact`/`Opening Hours` heading blocks from
   `framework-footer-default` (rich versions exist as opt-in patterns). Does NOT overlap Track C.

**Open reconciliation:** Track B (`feat/track-b-content-restore`, Indus page content) stayed
unmerged/paused — check its branch state before touching its files. Track B/C scratch decision
logs (`scratch/track-{b,c}-decisions-pending.md`, TB-1..9 / TC-1..34) were NOT FOUND in this
worktree/history — if located on another branch, fold into decisions.md/parking.md.

---

## Active tracks (parallel — SHARED WORKTREE, commit path-scoped only)

- **Track 1 — Indus / product / inline-zero rollout** (the front in `next-session-prompt.md`; co-active). Product queue below.
- **Track 2 — Header/Footer/Nav FULL REBUILD** (NEW 2026-07-17). Roadmap: `plans/2026-07-17-header-footer-nav-full-rebuild-strategic-plan.md` (6 phases). **P1 (Research → Architecture) CLOSED 2026-07-18 (D344)** — decision `plans/2026-07-18-P1-architecture-decision-header-footer-nav.md`; council `reports/2026-07-18-P1-adversarial-council-gate1.md`. Verdict: **BUILD (fork disqualified on architecture — must be a clone-converter emit target), full clean rebuild, rich-but-simple (cascade+Advanced), tiered tri-state on/off, informational-only a11y (DP2a), converter-emittable by construction (DP6).** On `main` (`6996f5da`+). **Baton now → P2 (builder design-gate)** — `next-session-prompt-header-footer-rebuild.md`. Gate 0/1 both passed; do NOT build in P2, it's a design-gate.

## Standing programmes (parallel / deferred — not the active front)

- **No-inline styling roster (~52 blocks, phased waves).** Hard architecture SETTLED
  (mechanism, D294 pattern selector, grid-scoping). Roster count drifts in prose — the DB +
  `plans/block-migration-DONE-checklist.md` are authoritative. Reusable LANDED harness:
  `plugins/sgs-blocks/scripts/no-inline-land-verify.js`. Canonical: Spec 31 §3.A/§13.4/§13.6
  + Spec 32 §6.1 + the DONE-checklist + the migration-contract plan.
- **WooCommerce layer (Spec 30) — COMPLETE + merged (D220).** Deferred roadmap → parking.md.
- **Cloning pipeline (L1–L4 cascade / L4 per-area extraction) — DONE (D290).** No longer active.

---

## Pointers

| For | Read |
|---|---|
| Hook off-switches (turn off a nagging/blocking guard-rail) | `.claude/secrets/hook-off-switches.md` (gitignored operator cheat-sheet, P3glob) |
| Structural defences (STOP catalogue + pre-flight ritual) | **`STOP-CATALOGUE.md`** (uncapped, D101) |
| Decisions (D-numbered, INCIDENT/ROUTINE tagged) | `decisions.md` (+ `memory/decisions-archive.md`) |
| Parked work (OPEN/PARTIAL/BLOCKED/DEFERRED only) | `parking.md` (+ `memory/parking-archive.md`) |
| Prior sessions' full narrative (swept from the old handoff/state) | `memory/session-YYYY-MM-DD.md` + `memory/state-archive.md` |
| Governing cloning spec | `specs/31-UNIVERSAL-CLONING-PIPELINE.md` (read IN FULL each cloning session) |
| Clone-fidelity measurement | `specs/20-CLONE-FIDELITY-MEASUREMENT.md` (computed-parity, Stage 11.6) |
| Build / deploy / SSH / gotchas | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown\|palestine-lives` (the ONE path) |
| Goals + exit criteria | `goals.md` |

## Blockers

None block the next session. Known-open items are the numbered Product queue + parking.md.

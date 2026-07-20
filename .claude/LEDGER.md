---
doc_type: state
project: small-giants-wp
project_id: 14
last_updated: 2026-07-17
generated: 2026-07-17 (P4 — collapsed state.md + handoff.md + next-session-prompt.md into this one LEDGER)
note: "THE single living-status doc. Replaces the old 3-way split (state/handoff/next-session-prompt) that drifted and overwrote each other. Current status is REPLACED here each session, never appended (that is how state.md ballooned to 66KB). History → dated snapshots in memory/session-YYYY-MM-DD.md (the ledger-rotate Stop hook backs this up). Structural defences (STOP catalogue + pre-flight ritual) live UNCAPPED in STOP-CATALOGUE.md. Keep this file lean (< 24576 bytes — the rotate hook warns past that)."
---

# small-giants-wp — LEDGER (the one living status)

## ⭐ FOR BEAN — plain English (read this first)

**What this is.** One file that answers "where are we and what's next," so a fresh session
(or you) gets ONE true answer instead of three drifting ones. It replaces the old three
docs (state / handoff / next-session-prompt) that kept contradicting each other.

**Latest (2026-07-18, P2 session):** Track 2 **P2 (the header/footer/control BUILDER design-gate) is DONE
+ SIGNED OFF** — `plans/2026-07-18-P2-builder-ux-design-gate.md`. It designs the settings panel a
non-coder uses to configure header/footer/nav, over a **CPT editing home** (`sgs_header`/`sgs_footer`
CPTs — the findable admin screen, NOT the Site Editor; the device-switcher works there), a tri-state
per-device control model, a starter-template picker, and a WP control-implementation spec bound to **Spec
35**. Gated through a 6-critic council + gap-analysis (B+) + a build + a UX specialist review + Spec-35
detail. **The NAVIGATION was carved out as a NEW phase P2.5 (full rework, Bean-locked)** — a 3-stream
research pass + 4-critic council ran; the council said "salvage adaptive-nav", **Bean overrode: full
rework, adaptive-nav is the messy patch-fixed block, gone.**

**⚠ CORRECTION (2026-07-19):** the earlier "Locked for P2.5: `wp_navigation` menu data" was a STALE carry that
was NOT reconciled with the signed-off Spec 36. **Spec 36 §12(f) resolved menu data to CLASSIC WP menus
PRIMARY** (block-based `wp_navigation` = a Phase-3 extra — "not essential, not totally clear to implement yet",
Bean 07-18). A parallel 07-19 P2.5 session was handed the stale `wp_navigation` lock and re-ran the whole
research→architecture→council arc before catching that Spec 36 already existed and was the authoritative base.

**P2.5 OUTCOME (2026-07-19): Spec 36 SIGNED-OFF v2.1 + salvage audit done + SAFE doc-purge done.**
`specs/36-SGS-NAVIGATION-SYSTEM.md` is the SINGLE canonical nav home. The two parallel tracks were reconciled
(Spec 36 = base; 07-19 added the utility-piece research + 6 refinements), gated through a 7-persona adversarial
council + qc-council fact-check (all 26 FRs survive). **Bean signed off v2.1 on 2026-07-19.**
- **Phase 6.5 code-salvage (DONE):** 4 parallel wp-sgs-dev audits, built-vs-to-build per piece vs v2.1, every
  claim evidenced to `file:line` → `reports/2026-07-19-P2.5-phase6.5-salvage-audit.md`. Spec 36's own §8a claims
  ALL held up. Salvage wins: D323 body-reparent + D340 scroll-lock (`adaptive-nav/view.js`, PORT verbatim);
  product-search combobox = genuine EXTEND; business-info single-source + schema-non-duplication BUILT; cart =
  badge shell only (mini-cart UNbuilt, Phase-1 fix = one-line `role="status"` at `cart/render.php:203`).
  Correction recorded: the two old blocks' focus-trap code disagree → merge into ONE `store('sgs/nav')`, don't copy.
- **Phase 6 SAFE doc-purge (DONE — Bean go, doc-only, no live-site risk):** carried FR-34-5 drawer-settings +
  Spec 02 §23 competitive line INTO Spec 36 first, THEN: DELETED `specs/34`; Spec 02 §23 → pointer stub; Spec 17
  FR-S9-4/-5 → Spec 36 pointers (FR-IDs kept for dependency lines); README index (34 DELETED, 35+36 rows added).
- **DEFERRED to post-build (register §3 — needs the new block-name roster, which doesn't exist until the build):**
  Spec 17 S9-1 hook allow-list / S9-2 typed-palette entry / S9-8 move-to-drawer / S9-10 nav refs; `00 §2.1` +
  `no-header-footer-block.py` roster; Spec 29 rows; retire adaptive-nav/mega-menu/mobile-nav DB rows via `/sgs-update`.
- **DEFERRED (Bean-ruled): block-registration deletion + live-header cutover** — the retired blocks stay live
  until the new nav is BUILT + the two client headers (Mama's + Indus) are re-authored via the editor (FR-36-18).
- **Spec 33 Part 2 emit-target repoint** — after the nav build passes its gate, NOT now (FR-36-15).
**Phase 1 EXECUTING — the plan is QC-clean (92/100): `plans/2026-07-19-spec36-phase1-mvp-nav-plan.md`.**
- **WAVE 0 DONE + on main (`eaa4310e`+`f9c381f2`, npm build green):** (1) cart `role=status`; (2) responsive-logo
  left-align + functional alt + per-tier max-box + SSR preview (per-device image was already built); (3)
  `class-sgs-nav-menu-source` const→filterable+registry-pruned resolver +`sgs/nav-menu` (R-31-1); (4) `sgs/nav-drawer`
  skeleton (section-KIND, InnerBlocks, +block_composition seed row); (5) **`src/shared/nav-interactivity/store.js`** =
  the shared `store('sgs/nav')` — D323/D340+freeze PORTED verbatim, two focus-traps MERGED, **API contract published**
  (`actions.openDrawer/closeDrawer/toggleDrawer`, `state.isOpen`) for Wave 2 to build against; (6) `scripts/nav-qa/`
  Gate-1 tooling (axe/elementFromPoint/crawl/logical-lint)+axe-core devDep. Also fixed a pre-existing `sprintf`-import
  bug in responsive-logo/edit.js. New-block gotcha captured: F6 gate needs a `seed-composition-roles.py` entry per new block.
- **WAVE 2 DONE + on main (`1ed828f0`, 2026-07-20):** `sgs/nav-menu` (flat classic-menu bar + burger→drawer via the
  store; menu picker, collapse-point N, featuredItemIds checklist, configurable `navLabel` landmark, client-side
  aria-current) + `sgs/nav-drawer` (full-screen `<dialog showModal>` modal, InnerBlocks content, × undeletable chrome,
  consumes the store, FR-34-5 drawer settings via ResponsiveControl). Drawer is **content-KIND block-private** — a
  `<dialog>` can't be hosted by `SGS_Container_Wrapper`, so it mirrors box/bg/padding via the shared helpers (D294;
  Bean-approved reclassification from the earlier section-KIND label). Gate 2 all green + 3-rater `/qc-council`;
  caught+fixed 2 Gate-1 blockers (missing `data-wp-interactive` island → burger couldn't open; nested nav-menu rendered
  a self-closing burger) + a STOP-21 uid no-op. Follow-up: FR-36-13 `<dialog>`-exception spec note (apply in spec 36).
- **WAVE 3 DONE + on main (2026-07-20):** Track-1 (Spec 35) MERGED into main FIRST (`5672b4c6`; LEDGER conflict
  resolved by superset) so the deploy ships the complete plugin and doesn't regress Track-1's live canary work.
  `/sgs-update` ran (reference regen 202 blocks, orphans pruned, `sgs/nav-drawer` registered); a real db-consistency
  snag (is_section_root→tier=class-section wanted a container_kind) fixed by dropping `is_section_root` — the drawer is
  content-KIND block-private, not a wrapper composite (`e6c10428`, db-consistency 0 violations). Deployed to sandybrown
  via `build-deploy.py` (plugin+theme). **Header re-authored (`b41352fc`, `parts/header.html` — a version-controlled
  file, the correct path for a block-theme part, NOT the DB/editor):** dropped the legacy `sgs/adaptive-nav` wrapper →
  `sgs/nav-menu` (`ref=1467` "Primary Menu" wp_navigation; top-level items match the Mama's mockup: Shop / Our Story /
  Send to Ward★ / Gift Ideas / FAQs) + `sgs/nav-drawer`. 5 mockup pages created as menu targets. Verified LIVE: new nav
  renders, `data-wp-interactive="sgs/nav"` island present, adaptive-nav GONE, no PHP errors. adaptive-nav stays
  registered (dormant) for rollback. GitHub tidied: `feat/brand-strip-inspector-rebuild` merged + deleted on origin.
- **WAVE 4 IN PROGRESS (2026-07-20) — machine sweep DONE, Bean's eye + 2 items remain.** Cache purged, then ran the
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
  regression. Report `reports/visual-diff/nav-menu-2026-07-20.md` verdict PASS. *(Bean caught my first diagnosis —
  I began designing a contrast fallback instead of reading the draft. Lesson in D351.)*
- **WAVE 4 REMAINING:** (a) **Bean's eye (R-31-13)** — cropped before/after desktop-bar + open-mobile-drawer pair;
  (b) the **manual D340 scrollbar-bounce test** (real windowed desktop browser — emulation cannot reproduce it);
  (c) `elementfrompoint-sweep.mjs` still needs a real probes file authored for Mama's (baseline 10/10) — the shipped
  `probes.example.json` is placeholders; (d) `wp-perf-gate` (JS<50KB / CSS<100KB) not yet run. Content refinements
  for the editor: menu 1467 uses `/gifts/` (mockup wants `/gift-ideas/`, page exists) + an "Our Story" submenu
  (flattened in Phase-1).
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
  **Architectural follow-up:** the nav resolver (`class-sgs-nav-menu-source.php::blocks_from_ref`) only resolves
  `wp_navigation` posts + page-list fallback — it does NOT implement classic-menu resolution via
  `wp_get_nav_menu_items()`, so FR-36-1's "classic menus PRIMARY" is NOT built yet (a classic `nav_menu` term ref won't
  render). Close this before claiming FR-36-1. Bean rulings: converter/clone DEPRIORITISED until whole
  header+footer+nav done; featured-item = block attribute.
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

## Live status (machine-checkable — verify, don't trust the cache)

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

## Setup-simplification track (the meta plan — one phase per session)

Plan: `plans/archive/2026-07-16-setup-simplification-and-protocol.md` — **fully executed (P0–P6) and ARCHIVED 2026-07-17.** Historical reference only; the go-forward protocol (plan §5) lives on as a captured lesson below.

| Phase | What | Status |
|---|---|---|
| P0/P1/P2 | in-flight commit · culls · archive-with-redirect | ✅ done (live on main) |
| P3proj | project enforcement — f5 gained a machine-evidence converter-guard (folded the retired qc-on-converter-edit stub); NEW `spec-drift-commit-gate.py` wired; qc-on-converter-edit.py removed | ✅ done (live on main) |
| P4 | collapsed the 3 status docs → this LEDGER + STOP-CATALOGUE.md + `ledger-rotate.py` Stop hook (wired, self-test + fired) + F1 global filename patch (additive, mini-sign-off approved, `~/.claude` commit `44f3b95`) | ✅ done (commits `a55d0fc1`+`410c7552`) |
| P3glob | GLOBAL hook edits (mini-sign-off approved 2026-07-17): §3.1 sgs-selfreport now reads machine evidence (real verify tool-result, not typed `state=verified`) — once-per-session warn + HARD block at `/handoff` close if SGS edited & verified nowhere all session (council-added teeth); §3.2 NEW `baseline-update-gate.py` (PreToolUse/Bash, wired) denies `--update-baseline` on the 8 gates w/o `[baseline-ok:reason]` + off-switch + cwd-match + f5 drift-check + bypass log; §3.3 handoff-enforce Part B uncommitted-work warn (.claude-scoped, once/session). All 3 adversarial-council-hardened, self-tested (16/12/10), live-fired. `~/.claude` commit + settings.json wiring done. | ✅ done |
| **P5** | agent refresh + skills refresh + WCAG 2.1 AA baseline | ✅ **COMPLETE (§4 agents + §4b skills + §4c WCAG all done, 2026-07-17).** §4c WCAG 2.1 DONE (`8f96c24`+`c59355bf`, pushed). §4 roster cleanup DONE (`97bb6ce`). **skillscore ruler RECALIBRATED** — agents were scored against *skill* rules, so "56–59%" was scorer bugs; agent path fixed + verified (honest spread). ⚠ LIVE but UNVERSIONED (`~/.agents` not a git repo). **§4 agent refresh 6/6 DONE + LIVE + A-grade** (Sonnet builds → inline-judged vs fixed ruler; each frontmatter-diffed + faithfulness-read): seo-auditor 100 / seo-schema 98 (caught+removed fabricated dates & invented file-ref) / project-manager 100 / site-reviewer 100 / wp-sgs-developer 100 / design-reviewer 93 (methodology MOVED to `agents/references/design-reviewer-methodology.md`, verified verbatim). git-persisted to `~/.claude` (`394a671`+`0a96908`); design-reviewer realigned to **WCAG 2.1 baseline** (agent body + description + CLAUDE.md blurb, `0a96908`). ⚠ the skillscore script itself (`~/.agents/.../sgs-skillscore.py`) is LIVE + verified but UNVERSIONED (`~/.agents` is not a git repo) — durability TODO. **§4 agent-vs-community comparison DONE** (wshobson + VoltAgent; judged on MERIT not skillscore per Lesson A): all 5 generic agents KEPT bespoke (evidence-based, not assumed); grafted design-reviewer's adversarial visual-verification principle from wshobson `ui-visual-validator` (`e9c4c83`). **§4 coverage-gap fill DONE** (`f225c01`): 2 NEW agents added — `nextjs-developer` 98% (builds Booking System + CV Writer AI Next.js/TS; no prior builder covered Next.js) + `security-auditor` 93% (general OWASP across WP+Next.js, distinct from ehr-security-reviewer); strict-contract-built, fact-checked vs the real `booking-system/package.json`. **§4b generic-skills refresh — STARTED 2026-07-17 (the LEAN-RULER PIVOT):** Bean challenged the premise — the bespoke "complexity" only exists because it was recommended, and the community `obra/superpowers` (256k⭐, deliberately lean) omits it. Research (Anthropic lean-context doctrine + superpowers' own writing-skills "prohibitions trended worse than nothing" + Goodhart/reward-hacking lit + Bean's own validate-grader lesson) CONFIRMED: lean beats structural-theatre; a ruler that scores STRUCTURE gets gamed. **skillscore SKILL-path validated** (community 48% F vs Bean skills 92–94% = ruler was Bean-convention-calibrated, NO cross-type bug unlike agent path — Lesson A holds). **RULER FIXED + live** (`~/.agents/.../sgs-skillscore.py`, ⚠UNVERSIONED, recovery=`.bak-2026-07-17-preLeanRuler`): new FLOOR tier @0% (reports absence, doesn't score); 14 theatre checks demoted (6-Lens/correction-ledger/goal/common-mistakes/references-hooks-scripts-dirs/numbered-stages/hard-gate/skill-type/process-summary/imperative-voice); REGISTRY tier authoritative; skill threshold 90→75. Validated: community 48→69%, Bean skills honest (brainstorming 100 / systematic-debugging 90 / autopilot 88 / gap-analysis 85), agent path 100/100/92 (design-reviewer 93→92, imperative_voice is `*`). **Full fork roster diffed (evidence-based):** brainstorming/systematic-debugging/requesting-code-review/executing-plans/TDD/receiving-code-review = KEEP (superset/identical); finishing-a-development-branch/using-git-worktrees/subagent-driven-development/dispatching-parallel-agents/skill-writer = GRAFT community bug-fixes. **NEW GRADING FOUNDATION (2nd Bean challenge, DONE):** experts judge skills by EVALS not structure (Anthropic "evals BEFORE docs"; obra "no skill without a failing test"). BUILT `~/.agents/.../reasoning-skill-judge.md` — an 8-criterion rubric a SUBAGENT reasons with (cold-agent-executability, minimal-sufficiency, failure-coverage, degrees-of-freedom, routing, terminology, testability + bias-check), outputs a **CUT LIST** (thinning, opposite of gap-analysis's bloat ratchet); AGENT variant A1-A6; 3-tier model FLOOR(skillscore)/JUDGE(this)/GOLD(evals). Validated: reasoning judge FLATTENED the scanner's bias (scanner 100/90/69 → judge 3.6/3.1/3.43, community competitive) + caught real defects the scanner scored 100% blind to (broken file refs, save-path contradiction, unsourced stats). Agent structural scanners (body_length/scope_creep/methodology_dupe) → FLOOR; gap-analysis kept for gap-DISCOVERY but paired with the CUT LIST, no longer a bloat-only grade. **§4b GRAFTS 5/5 DONE + LIVE (2026-07-17 cont.)** — each: fetched live from obra/superpowers, diffed, bug-claims fact-checked vs OUR text, `.bak`-backed-up (⚠ `~/.agents` still not a git repo — Bean: "not that dangerous, get on with it"), community-as-base + our grafts, then reasoning-judge-graded (Sonnet, cross-model from Opus author) + judge-findings fact-checked + fixes applied. (1) **finishing-a-development-branch** — community base fixes all 4 worktree bugs (kill-worktree-on-PR / branch-before-worktree / remove-from-inside / harness-owned); grafted back our `gh pr create` body + Integration + negative-routing; judge 3.57→applied test-cmd fix + `ExitWorktree` name + detached-HEAD detection. (2) **using-git-worktrees** — community Step-0 detection+submodule guard fixes our phantom-nested-worktree bug + native-tool preference + sandbox fallback; judge 3.57→added a native-tool DISCOVERY step (the exact gap this session hit with deferred `EnterWorktree`) + defined "your instructions". (3) **subagent-driven-development** — FULL ADOPT (Bean-picked): copied in community `implementer-prompt.md`+`task-reviewer-prompt.md`+3 scripts (task-brief/review-package/sdd-workspace; LF+chmod+syntax-checked) → FIXES the pre-existing broken `./implementer-prompt.md` refs; kept our `/delegate`+log-dispatch routing + SGS-BEM injection; judge 3.86→fixed a REAL broken ref I'd imported verbatim from community (`../requesting-code-review/code-reviewer.md` doesn't exist in Bean's fork → `references/dispatch-template.md`) + log-dispatch full path. (4) **dispatching-parallel-agents** — ours already superset; grafted the "multiple dispatch calls in one response = parallel" mechanism rule + subagent-isolation line; FIXED a stale dead-spec ref (Spec 13→Spec 00 §3.1); judge 3.57→cut ours-fork duplicate sections. (5) **skill-writer** — ADDITIVE graft onto ours (kept our discovery-gate + dual gap-analysis/skillscore gates): grafted 3 community sections (Match-the-Form-to-the-Failure table + no-nuance/no-exemption rules; Micro-Test-Wording protocol w/ mandatory no-guidance control + variance-as-metric into Stage 6; Bulletproofing = spirit-vs-letter + close-every-loophole + rationalisation-table + red-flags); FIXED stale skillscore threshold 90→75 in SKILL.md (4×) AND the bundled `hooks/skill-writer-enforce.py:42` message (judge caught the hook — I'd only done the prose; note: hook gates on stage-COMPLETION not the number, so the judge's "would reject a 76% skill" severity was overstated — fact-checked both ways); judge 4.0→fixed. **BATCH DECISION RESOLVED (Bean):** the community-STANDARD triple-restatement (Quick Reference / Common Mistakes / Red Flags) in the git skills = **KEEP PARITY with obra** (do NOT cut — easier re-sync; redundancy is a scan aid not a defect). Ours-fork-specific duplication WAS cut (dispatching-parallel-agents). **⚠ STILL UNVERSIONED:** all 5 grafts live under `~/.agents` which is NOT a git repo — recovery = per-skill `SKILL.md.bak-2026-07-17-preGraft`. Bean deferred versioning ("not that dangerous"); durability TODO stands. **§4b coverage-gap step B — DONE 2026-07-17 (closes §4b, closes P5).** Two independent parallel surveys of 4 collections (obra/superpowers, VoltAgent, alirezarezvani, Composio/travisvn) vs a domain coverage-map: obra = 0 net-new (all 15 already held); every domain SATURATED except one. **Exactly ONE genuine gap found (convergent across both surveys): Next.js/TS testing** — the `nextjs-developer` agent owns "vitest coverage" with no test-authoring skill; complaint-check confirmed real user-pain (testing-library #1209, Next.js async-RSC caveat). Bean picked "build lean". **BUILT `~/.agents/skills/nextjs-testing/SKILL.md`** (⚠UNVERSIONED — `~/.agents` still not a git repo, Bean deferred again; no `.bak` needed, new file) + symlinked into `~/.claude/skills/` (live/invokable). Grounded in the official Next.js Vitest doc (config + async-RSC→E2E caveat verbatim) — structured on ONE insight (match test-approach to unit KIND: server-action=call-direct / sync-component=render / async-RSC=route-to-E2E). Graded: skillscore FLOOR 80% (pass) + **reasoning-judge (Sonnet, cross-model) = SHIP 4.71/5, all 5 code patterns fact-checked CORRECT, 0 hallucinations**; applied 1 of 3 judge suggestions (illustrative-paths note), skipped 2 score-chasing ones per "never edit a skill to raise its score". gap-analysis-rewire + fork-deletions = confirmed closed (no pure-adopts; TDD byte-identical). Detail: `memory/session-2026-07-17-p5-skills-lean-ruler.md`. |
| **P6** | remaining global simplifications + the 2 §5 gates | ✅ **COMPLETE 2026-07-17 (closes the setup-simplification plan).** Global CLAUDE.md **276→51 lines** (Karpathy R1 ≤80) — 170-line tool roster → `~/.claude/TOOLS.md`, prompt-writing standard → `~/.claude/references/prompt-writing.md`, Windows-Python → `rules/windows-python.md` (paths:`**/*.py`), behavioural sections compressed to pointers; **no rule lost** (keep/move/cut map approved by Bean). Rule path-scoping: `wp-project-tooling.md` + `measurement-vs-eye.md` gained `paths:` frontmatter → on-demand not always-on (mechanism EMPIRICALLY verified: pre-existing `wordpress.md`/`visual-standards.md` inject in matching WP sessions, gated out of this .md session). **2 new gates BUILT + self-tested + wired + live-fired:** `claude-md-linecount-gate.py` (PreToolUse Write\|Edit — denies global CLAUDE.md >80, project CLAUDE.mds exempt, new-violations-only) + `clean-folders-commit-gate.py` (PreToolUse Bash — denies >2MB staged blob, `[commit-ok:reason]` override) + `scratch-sweep.py` (Stop — non-blocking stray-ephemera warn). `__pycache__` removed + gitignored; `tooling-map-drift-check.py` confirmed already-gone (no live file). settings.json re-validated JSON. `~/.claude` commit `fd63ccc`. Global mini-sign-off honoured (map + draft approved before edits). |

**Stray thread CLOSED 2026-07-17 (was the last incomplete non-P6 item, plan §3.5):** the `lifecycle-gate-stop.py` no-op stub was **unwired from `~/.claude/settings.json` + the stub file deleted** (JSON re-validated; wiring hits = 0). Global CLAUDE.md doc-drift fixed (2 refs now say "unwired+deleted"). Also reworded the phantom `seo-geo` refs in `seo-technical.md` + `wp-sgs-developer.md` to make explicit it is the `/seo-geo` **skill**, not an agent. Backup: `~/.claude/settings.json.bak-2026-07-17-preLifecycleUnwire`. NOT yet committed to the `~/.claude` repo (offer stands).

**The go-forward protocol (plan §5) — captured as a lesson:** (1) one ledger, Stop-rotated;
(2) structural gates over prose; (3) done = machine evidence; (4) minimal always-on context
(≤80-line cap on the GLOBAL CLAUDE.md only); (5) clean folders; (6) docs gated like code;
(7) verify contents not filenames; (8) protect architecture, cull description.

---

## Product queue (the website-builder work — reconcile before acting, some is already live)

**Indus "Our Brands" clone fidelity — DONE 2026-07-17 (D343, live-verified).** Band matched to
the reference at hero-grade via computed-CSS extraction (underline 27%×2px, logos fill 155²
tiles, gap 0 + 10px band-teal→gold-hover border, band 272 centred, letter-spacing normal,
overflow 0). Shipped: **NEW `sgs/separator` block** (built + registered; its replaces-table entry
was REVERTED — see task A, it needs the migration pairing first), brand-strip tile controls + the WP `border-width` var-name-collision fix
(STOP-WP-STYLE-SUBSTRING-COLLISION), framework letter-spacing fix (theme-deployed), **NEW
`extract-css-diff.js`** (the STANDARD extract-and-diff tool + `--why` CDP provenance), **NEW
theme-CSS hardcode lint**. Detail: decisions D343.

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

**Last shipped (D341/D342, 2026-07-16, on `main` `a693e0e8`→merged into d3967a2c):** Phase 2
nav/logo fixes — `sgs/responsive-logo` dropped the unshippable `auto` logo-switch for an
operator `custom` breakpoint; `sgs/adaptive-nav` collapse tier now reads `SGS_Breakpoints`
(fixes the burger missing the 768–1023 tablet band). Spec 34 disclosure drawer BUILT + live
(Gate B all pass). Track C core→SGS migration (395→0 replaceable core blocks). All
live-verified both sites. Detail: `decisions.md` D341/D342 + `memory/session-2026-07-16.md`
(swept from the old handoff/state).

1. **Phase 1 — drawer polish — DONE (2026-07-17, on `main`).** (a) Resting link colour now
   prefers the client `text` token when it clears WCAG 4.5:1 (mamas `#3a2e26` adopts 5.28:1;
   helping-doctors/indus keep the safe fallback — 2.90/2.39:1 fail, by design) via the new
   shared `sgs_wcag_preferred_text_colour_for_bg` helper (commit `6fc11618`, live-verified).
   (b) The drawer's auto-focused first link no longer shows the theme `:focus` underline on
   open — `.sgs-nav-menu__link:focus:not(:focus-visible){text-decoration:none}` (commit
   `73544914`→`09399f6d`; keyboard `:focus-visible` underline preserved, WCAG 2.4.7). ⚠
   Deployed live to canary + build/specificity-verified, but the final post-deploy Playwright
   eyeball (open=no underline / Tab=underline) was DEFERRED at Bean's wrap-up — honest report
   `reports/visual-diff/nav-menu-2026-07-17.md` (verdict not fabricated). Finish that eyeball
   next session, or Bean confirms on the canary.
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

---
doc_type: next-session-prompt
project: small-giants-wp
generated: 2026-07-14
thread: Finish the adaptive-nav drawer migration on Indus (3 known fixes) → merge → §S9 sign-off → Spec 33 Part 2
---

# NEXT SESSION — finish the Indus drawer migration, then close §S9

You are the SGS WordPress block + frontend developer. **The `<dialog>` drawer migration is BUILT and PROVEN on the sandybrown canary; Indus has 3 known regressions and is ROLLED BACK.** Invoke `/autopilot` first.

Read `.claude/handoff.md` + `CLAUDE.md` + `.claude/decisions.md` D337/D336/D335 + `.claude/plans/2026-07-14-adaptive-nav-drawer-design.md` before any work.

## ⛔ FACTUAL CORRECTIONS (Bean, 2026-07-14 — do not repeat)
- **palestine-lives.org is the DEV site. sandybrown is the STAGING canary. NEITHER is a live client site.** Last session repeatedly called them "live client sites" and dramatised a dev outage as a client outage. Read `CLAUDE.md` ("Dev site: palestine-lives.org … Staging/canary: sandybrown…") before characterising any environment.
- **TEST, don't guess.** The white-drawer cause was asserted as "probably the CDN" without testing. Bean called it. The rule was literally written the same session (`prove-the-cause-before-fix`).
- **REPLICATE the old menus PERFECTLY.** Task 1's acceptance is "nothing lost, esp. Indus" — 2 lost nav links is a FAIL, not a footnote.
- **REUSE the working block, don't reimplement it.** `sgs/social-icons` already has `source=manual|site-info` (D335) and pulls all 7 networks dynamically. Last session wrote a duplicate `render_drawer_socials()` in the renderer. Delete it; place the block.

## Current state (verified live)
- **`main`** = clean + deployable: D336 deploy hardening + D337 spec amendments. **`feat/adaptive-nav-dialog-drawer`** = the full migration, gates green, **NOT merged** (correctly — Indus unproven).
- **sandybrown (canary): NEW drawer LIVE + VERIFIED** — 10/10 controls reachable (baseline 10/10), 5 baseline links, exact baseline pink `rgb(197,106,122)`, `:modal` true, scroll-locked, **backdrop-dismiss working (never was before)**, `aria-modal` absent when closed.
- **palestine-lives (Indus): ROLLED BACK** to the old `sgs/mobile-nav` drawer via the D336 `.bak` net (~30s). HTTP 200, healthy.
- `/sgs-update` already ran: 93 orphan attrs + 2 orphan blocks pruned.

## The 3 Indus regressions (measured, vs the captured baseline)
| | Baseline | After deploy |
|---|---|---|
| Controls reachable | 18/18 | 13/13 |
| Nav links | 7 | **5 — lost "Sectors" + "Brands"** |
| Socials | 4 | **3 — lost Google** |
| Drawer background | teal `rgb(7,106,142)` | **white** |

## Tasks

### Task 1 — mega-menu items must render in the drawer MENU (the 2 lost links)
**What:** "Sectors" + "Brands" are `sgs/mega-menu` items. `class-sgs-adaptive-nav-renderer.php:352` routes them to the drawer CONTENT zone; the menu walk skips them (`:120`). They ARE menu items — render them in `render_drawer_menu()` as accordions (like the other submenus), not shunted to content.
**Bean's hint:** *"look into how the mega-menus are added to the normal menu and you should be able to figure it out from there."* Read how mega-menu attaches to the `wp_navigation` menu FIRST.
**Orchestration:** inline (Opus) — a11y-critical + subtle. **/qc gate:** yes.
**Acceptance:** Indus drawer shows all 7 baseline links (Home, About, Sectors, Brands, Trade, Blog, Contact) with working accordions; **18/18 reachable**.

### Task 2 — delete `render_drawer_socials()`; use `sgs/social-icons`
**What:** remove the duplicated socials renderer; place `sgs/social-icons` (`source: "site-info"`) in the drawer. It already pulls the 7 networks dynamically (D335) and is proven.
**Why:** Bean — the block already works; don't reimplement it.
**Google link:** Google is NOT in Site Info's canonical 7-network schema. **Get Indus's Google review link from their Google Business Profile yourself** (baseline had `https://g.page/r/CYLLa_01-rZvEAE/review`) and restore it — do NOT turn this into a schema debate.
**Orchestration:** delegated (sonnet) after Task 1. **/qc gate:** part of the live verify.
**Acceptance:** Indus drawer shows 4 socials incl. Google; zero duplicated socials logic in the renderer.

### Task 3 — the white drawer: TEST the cause, don't guess
**What:** Indus rendered the drawer white, not teal (`primary-dark`). Mama's rendered pink correctly from the SAME rule — so it is environment/cache/token, not obviously code. **Prove it:** check what `style.css?ver=` Indus actually loads, whether that CSS contains the drawer rule, and whether `--wp--preset--color--primary-dark` resolves on Indus. Candidates: Hostinger CDN not cleared (STOP-CDN-NEW-CSS-RULE — `hosting_clearWebsiteCacheV1` was NOT run on Indus), or a token gap.
**Orchestration:** inline (Opus). **Acceptance:** drawer bg = `rgb(7,106,142)` live, with the cause NAMED and evidenced.

### Task 4 — re-deploy Indus, re-verify, merge
Deploy **canary first, then Indus** (`build-deploy.py --target palestine-lives`). Full cache clear incl. **Hostinger CDN**. Re-measure vs baseline: 18/18 reachable, 7 links, 4 socials, teal, `:modal`, scroll-lock, backdrop, axe-core 0, 44px. Then squash-merge the branch to `main` and delete it.

### Task 5 — Task 3 of §S9: Site-Editor builder UX analysis (`/ui-ux-pro-max`)
Then present the FR-S9-1..11 audit for Bean's **"§S9 totally covered" sign-off** (HARD gate) → **Spec 33 Part 2**.

## ⛔ ANTI-PATTERN STOPs (carried forward — NEVER subtract, D101)
- **STOP-TEST-DONT-GUESS (NEW, D337, Bean-caught)** — never assert a cause you have not tested. "Probably the CDN" is a guess. Prove it on the live DOM/HTTP or say "unknown".
- **STOP-REUSE-THE-WORKING-BLOCK (NEW, D337, Bean-caught)** — before writing a renderer for X, grep for an SGS block that already does X. `sgs/social-icons` already pulls Site-Info socials (D335). Duplicating it is the violation.
- **STOP-READ-THE-ENV-CONFIG (NEW, D337, Bean-caught)** — palestine-lives = DEV, sandybrown = STAGING. Neither is a live client site. Read CLAUDE.md before characterising blast radius.
- **STOP-REPLICATE-EXACTLY (NEW, D337)** — a migration's acceptance is the CAPTURED BASELINE, measured on rendered output. Losing 2 links/1 social is a FAIL even with green gates.
- **STOP-CORE-BLOCK-WITH-SGS-REPLACEMENT (NEW, D337, Bean-directed)** — a core block with a direct SGS replacement must NEVER be used. Authoritative map = DB `blocks.replaces` (query it; `sgs/container` replaces `core/group|core/columns|core/column`). NOTE: the theme still has **~1,015** such uses (core/paragraph 356, core/group 204, core/column 170, core/heading 128, core/image 46, core/buttons 40, core/columns 64, core/site-logo 7) outside the header — parked, Bean's call.
- **STOP-INNERBLOCKS-ARE-NOT-ALWAYS-THE-MENU (NEW, D337)** — `SGS_Nav_Menu_Source` step 3 returns `$nav['innerBlocks']` as the menu; that is ONLY valid for `core/navigation`. It is now gated. Any similar "treat children as data" fallback must be gated on the block name.
- **STOP-GATES-GREEN-IS-NOT-VERIFIED (NEW, D337)** — build green + 180 tests green + every guard green, and the desktop nav still rendered **0 links**. Only the live DOM vs the captured baseline caught it. Extends STOP-16.
- **STOP-DEPLOY-CANARY-FIRST (NEW, D337)** — prove on sandybrown before palestine-lives, per the deploy doc rewritten the same session. Last session pushed Indus unproven and had to roll back.
- **STOP-DONT-RE-GATE-A-DECIDED-REPLACEMENT + MIGRATE-CLEANLY (D335)** — adaptive-nav was built to replace core/navigation + mobile-nav; that is settled. Plan the clean transfer; don't re-litigate.
- **STOP-NO-ALLOWLIST-ON-CONTAINER-EQUIVALENTS (D335)** — header/footer/rows + the drawer accept ANY block. (D335 was only half-applied — `block.json` still had `allowedBlocks` while `a4167859` only fixed `edit.js`; both rows are now clean. Check BOTH files when applying such a rule.)
- **STOP-ONE-SOURCE-BUSINESS-INFO (D335)** — all business info from `sgs_site_info` ONLY; empty → renders nothing; never a parallel store or hardcode.
- **STOP-MEASUREMENT-VS-EYE (D335)** — pixel-confirm a contrast/colour claim before flagging it.
- **STOP-COUNCIL/REGISTER-FIX-SHAPES-ARE-HYPOTHESES (D333)** — fact-check every council/register finding vs live code/DOM. (D337: a rater's "DB-first template-part will break both sites" was checked and was FALSE here — no `header` part exists on either site.)
- **STOP-HIDDEN-PARALLEL-SYSTEM (D330)** — grep for a 2nd system doing the same job before building.
- **STOP-PREFIX-ONLY-CSS-GATE (D333)** — full-value sanitiser, never a prefix regex.
- **STOP-EDITOR-ONLY-PLACEHOLDER (D333)** — gate operator placeholders on `sgs_is_frontend_render()`.
- **STOP-INSERT-TEMPLATE-VS-LIVE-PART (D333)** — a block's TEMPLATE/allowedBlocks can diverge from the live part; check both. (D337: a deleted block left in `site-header/edit.js` TEMPLATE breaks every FRESH insert — a day-1 break for the next client build.)
- **STOP-NO-KSORT (D326-D328)** — wrapper uid = `md5(wp_json_encode($attributes))`; never reorder the hash input. (adaptive-nav's OWN uid is `wp_unique_id` — it was NOT in D334's determinism fix.)
- **STOP-WRAPPER-OWNED-VS-BLOCK-OWNED (D327/D328)** · **STOP-CONTAINER-TYPE-SELF-QUERY (D327)** · **STOP-GRACEFUL-MIGRATION (D327)** · **STOP-OBJECT-COERCION (D328)** · **STOP-SUPPORTS-SPACING-DOUBLE-EMIT (D328)**
- **STOP-21** — emit-green ≠ LANDED. LANDED = deploy + OPcache + `wp litespeed-purge all` + Hostinger CDN clear + live computed value.
- **STOP-CSS-VER-CACHE-BUST (D310/D330)** · **STOP-CDN-NEW-CSS-RULE (D330)** · **STOP-CSS-CUSTOM-PROP-RACE (D330)**
- **STOP-static-vs-live (D304/D305)** — live DOM, never static parsing.
- **STOP-67** — a changed BLOCK needs `reports/visual-diff/<block>-<YYYY-MM-DD>.md` (`verdict: PASS`). **Outstanding for adaptive-nav.**
- **STOP-16** — a subagent / "it works" / build-green is a HYPOTHESIS. Re-verify live yourself. Node/npm via PowerShell (nvm shim broken in Git Bash).
- **STOP-WINDOWS-BASH-STALE** — stage/commit/delete via PowerShell.
- **STOP-PARALLEL-TRACK-SWEEP (D326)** — path-scoped commits; verify D-ceiling + branch first. Pre-existing dirt (lucide-icons.php, package-lock, phase4-*.txt, root .db, rr.json) is NOT yours.
- **Composite-mirror (R-31-9 / D294)** · no inline `style=""` (Spec 32) · no version bumps / deprecations (D270/D293).
- **`<dialog>` ANCESTOR TRAP (NEW, D337)** — never let `display:none`, `transform`, `filter`, `contain`, or `will-change:transform` land on an adaptive-nav ANCESTOR: `display:none` suppresses top-layer entirely, and a transformed ancestor traps the dialog's containing block. See the dormant `hide-on-scroll-down` rule in `plugins/sgs-blocks/assets/css/header-behaviours.css`.

## ⛔ PRE-FLIGHT SELF-ATTESTATION (answer before first Write/Edit)
1. Have I read Spec 17 §S9 IN FULL + `decisions.md` D337/D336/D335 + the drawer design doc this session?
2. Am I about to assert a cause I have NOT tested? (STOP-TEST-DONT-GUESS)
3. Does an SGS block already do what I'm about to write? Did I grep? (STOP-REUSE-THE-WORKING-BLOCK)
4. Is every core block I emit free of an SGS replacement per DB `blocks.replaces`? (STOP-CORE-BLOCK-WITH-SGS-REPLACEMENT)
5. Am I measuring against the CAPTURED BASELINE (Indus 18/18 + 7 links + 4 socials + teal; Mama's 10/10 + 5 links + pink) on the LIVE DOM — not on green gates? (STOP-GATES-GREEN-IS-NOT-VERIFIED)
6. Canary before dev-site? Full cache clear incl. Hostinger CDN before measuring? (STOP-DEPLOY-CANARY-FIRST + STOP-21)
7. Have I verified D-ceiling (`grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1`) + branch before committing?

## Skills / Tools / Agents
| Skill | When |
|-------|------|
| `/brainstorming` · `/gap-analysis` · `/lifecycle` · `/research` · `/strategic-plan` | mandatory five |
| `/systematic-debugging` | Tasks 1 + 3 (root-cause the lost links + white drawer) |
| `/qc-council` | before commit on the a11y-critical drawer (Bean: after every build stage) |
| `/sgs-wp-engine` + `/sgs-db` + `/wp-blocks` | block/DB ground truth — **query `blocks.replaces` before emitting any core block** |
| `/ui-ux-pro-max` | Task 5 builder UX |
| `/visual-qa` · `/a11y-audit` | live verification + the outstanding STOP-67 report |
| `/subagent-driven-development` · `/dispatching-parallel-agents` · `/delegate` | orchestration |

| Tool | For |
|------|-----|
| Playwright MCP | live drawer verification vs baseline (the ONLY gate that caught the last regression) |
| Hostinger MCP `hosting_clearWebsiteCacheV1` | CDN clear before any live CSS measure (Task 3) |
| `/sgs-db` | `blocks.replaces`, attrs, composition |

| Agent | When |
|-------|------|
| general-purpose (sonnet) | Task 2 wiring after Task 1 (re-verify live yourself — STOP-16) |
| `code-reviewer` / `/qc-council` raters | pre-commit on the drawer |

## Dependency graph
```
Task 1 mega-menu links (inline, Opus) ──┐
Task 3 white drawer: TEST (inline)  ────┼──> Task 4 deploy canary→Indus + verify 18/18 → MERGE to main
Task 2 social-icons + Google (sonnet) ──┘
                                             ↓
                              Task 5 builder UX → FR-S9-1..11 audit → BEAN SIGN-OFF → Spec 33 Part 2
```

## Methodology guardrails
- **Deploy before measure** (STOP-21 + STOP-CDN-NEW-CSS-RULE) — build + deploy + OPcache + LiteSpeed + **Hostinger CDN** BEFORE any live measure.
- **Canary first, always** — sandybrown, then palestine-lives.
- **Baseline is the gate** — Indus 18/18 + 7 links + 4 socials + teal; Mama's 10/10 + 5 links + pink. Rendered output, not attribute count, not green gates.
- **Rollback is cheap now** — `<dir>.bak` exists on both targets (D336). Use it rather than leaving a broken state.
- **Outcome vs completion** — §S9 sign-off = the migration live + a11y-verified on BOTH targets + builder UX good + spec reconciled. Not "code shipped".

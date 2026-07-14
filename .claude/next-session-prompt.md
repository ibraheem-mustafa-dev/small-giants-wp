---
doc_type: next-session-prompt
project: small-giants-wp
generated: 2026-07-14
thread: DESIGN-GATE the mobile-nav→adaptive-nav re-architecture + Site-Editor builder UX + one-source business info → THEN Bean's §S9 "totally covered" sign-off → Spec 33 Part 2
---

# NEXT SESSION — design-gate the nav re-architecture, analyse the builder UX, then close §S9 sign-off

You are the SGS WordPress block + frontend developer. **§S9 is functionally 11/11 built + all D333/D334/D335 must-fixes + polish are SHIPPED + live-verified on 2 clients.** Bean has NOT yet given the "§S9 totally covered" sign-off — he set THREE remaining gates (below). Invoke `/autopilot` first.

Read `.claude/handoff.md` (D335 record) + `CLAUDE.md` + `.claude/decisions.md` D335/D334/D333 before any work.

## ⛔ BEAN'S DIRECTIVE — the arc (sign-off is gated behind 1 + 3)
1. **[CAREFUL MIGRATION — NOT a re-design-gate] Complete `sgs/adaptive-nav` as the unified global nav + remove `sgs/mobile-nav`** (Task 1). **Bean-clarified (D335): this replacement was ALREADY design-gated when adaptive-nav was built (§S9, 2026-07-13) — its whole purpose was to replace BOTH `core/navigation` AND `sgs/mobile-nav` with one responsive block. Do NOT re-design-gate the decision.** Ground truth: adaptive-nav currently DELEGATES the drawer to `sgs/mobile-nav` (render.php:8 "opens the drawer sgs/mobile-nav"). So the work = give adaptive-nav its OWN off-canvas drawer (absorb the FR-S9-5 a11y contract: focus-trap, ESC, body-scroll-lock, the D323 P0 re-parent-to-`<body>` fix, the socials-from-Site-Info + tagline zones, the toggle + aria-controls), then remove mobile-nav + mobile-nav-toggle. **The care needed is a MIGRATION PLAN: map the CURRENT drawer/menu designs on both clients (esp. Indus Foods) and transfer them CLEANLY + exactly — nothing lost — with a full a11y re-verify.**
2. **[UNIVERSAL PRINCIPLE] "All business info optional, one source (Site Info), never hardcoded into anything"** (Task 2 + threads through everything). Includes: unify the mobile-nav socials' `sgs_social_*` parallel store → `sgs_site_info.socials.*`; audit for any hardcoded business info.
3. **[GATE] Site-Editor visual-BUILDER UX analysis** (Task 3) — same depth as the frontend QA: the block-editor experience clients use to build/configure the header/footer. Best done alongside the Task-1 design (the re-architecture reshapes the builder).
4. **THEN present the FR-S9-1..11 audit for Bean's "§S9 totally covered" sign-off** (HARD gate) → **THEN Spec 33 Part 2** (header/footer CLONE pipeline, `P-CLONE-PIPELINE-HEADER-FOOTER-HANDLER`) — Bean wants ASAP; do NOT start until sign-off.

## ⛔ MANDATORY READING GATE (read IN FULL before any Write/Edit)
1. `.claude/handoff.md` (D335) + `.claude/decisions.md` D335 + D334 + D333.
2. `.claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md` §S9 END TO END (Bean-locked: read the governing spec fully each session) — esp. **FR-S9-4 (adaptive-nav)** + **FR-S9-5 (the mobile-nav drawer a11y contract that must be absorbed)** + Spec 32 (no-inline) + Spec 31 §13 (composite-mirror / uid).
3. `.claude/reports/2026-07-14-spec17-s9-coverage-audit.md` (11/11, reconciled).
4. **Canary + 2nd-client logins (gitignored, ALWAYS available):** `.claude/secrets/sandybrown.env` (Mama's) + `.claude/secrets/palestine-lives.env` (Indus — deploy via `python plugins/sgs-blocks/scripts/build-deploy.py --target palestine-lives`, explicit opt-in).

## ⛔ ANTI-PATTERN STOPs (carried forward — NEVER subtract, D101)
- **STOP-DONT-RE-GATE-A-DECIDED-REPLACEMENT + MIGRATE-CLEANLY (D335, NEW, Bean-corrected)** — do NOT re-design-gate a replacement whose design was ALREADY gated (adaptive-nav was built to replace core/navigation + mobile-nav; that decision is settled). BUT a change that re-homes an a11y-critical mechanism (the drawer) still needs a careful MIGRATION PLAN: map the current live designs on ALL clients, transfer them exactly (nothing lost — esp. Indus), and fully a11y-re-verify. Plan the clean execution; don't re-litigate the decision.
- **STOP-NO-ALLOWLIST-ON-CONTAINER-EQUIVALENTS (D335, NEW, Bean-directed)** — header/footer/rows are container-equivalents; like `sgs/container` they accept ANY block, NOT a curated palette. Do NOT add an `allowedBlocks` restriction to a container-equivalent (the row allow-lists were removed D335; the adaptive-nav drawer must accept any block too).
- **STOP-ONE-SOURCE-BUSINESS-INFO (D335, NEW)** — all business info (phone/email/address/hours/socials/copyright) comes from ONE optional source (`sgs_site_info`), renders nothing when empty, and is NEVER hardcoded or split across a parallel store. Before adding any business-value read, grep for an existing Site-Info key; before trusting a "settings" store, confirm it IS Site Info (the mobile-nav `sgs_social_*` store was a hidden parallel system).
- **STOP-MEASUREMENT-VS-EYE (D335, reinforced)** — a `getComputedStyle()` contrast/colour reading can be WRONG (reads an outer element, not the painted child). Pixel-confirm a "contrast fail" with a screenshot BEFORE flagging it (a footer "invisible text" 1.00 was a false alarm; the text was visible gold). Extends the global measurement-vs-eye rule.
- **STOP-COUNCIL/REGISTER-FIX-SHAPES-ARE-HYPOTHESES (D333)** — an adversarial-council / defect-register / QA finding is a HYPOTHESIS. FACT-CHECK every one against the LIVE code + DOM before acting (R-31-7). D335 example: the QA's "invisible footer text" + the "ugly drawer socials root cause" both needed live re-check (the socials were a redundant PLACED block, not the mobile-nav zone).
- **STOP-HIDDEN-PARALLEL-SYSTEM (D330)** — before building on a "dormant"/single system, GREP for a SECOND system doing the same job (a default-off system is one admin click from active). D335: the mobile-nav `render_socials_zone()` read `sgs_social_*` while everything else read Site Info — a 2nd social store.
- **STOP-PREFIX-ONLY-CSS-GATE (D333)** — NEVER emit an operator CSS value after only a PREFIX regex check; use a FULL-value sanitiser (`sgs_css_gradient_value()` / `sgs_css_length` / `sgs_colour_value`).
- **STOP-EDITOR-ONLY-PLACEHOLDER (D333)** — an operator-guidance placeholder is EDITOR-ONLY; gate on `\SGS\Blocks\sgs_is_frontend_render()` + early `return ''`, never leak to the live frontend.
- **STOP-INSERT-TEMPLATE-VS-LIVE-PART (D333)** — a block's default `TEMPLATE`/`allowedBlocks` can diverge from the live template PART; fixing the live part does NOT fix a FRESH block insert. Check both.
- **STOP-NO-KSORT (D326-D328)** — the shared-wrapper uid = `md5(wp_json_encode($attributes))`; NEVER `ksort`/reorder the hash input. (D334 applied the SAME md5 derivation to site-header/site-header-row/site-footer-row — keep it deterministic.)
- **STOP-WRAPPER-OWNED-VS-BLOCK-OWNED (D327/D328)** — a WRAPPER capability is emitted BY the wrapper via a flag; a block's OWN element uses the shared emitter directly. Don't route a block-owned element through the wrapper flag or a wrapper capability block-private.
- **STOP-CONTAINER-TYPE-SELF-QUERY (D327)** — an element can't size-`@container` itself; container-type on the OUTER, styled flex/grid + tier rules on a DESCENDANT.
- **STOP-GRACEFUL-MIGRATION (D327)** — flipping/extending a responsive/object model must NOT break a flat-stored instance (`is_array` guards + emitter normalise).
- **STOP-OBJECT-COERCION (D328)** — an `object`-typed block attr silently COERCES a flat stored value to the block.json DEFAULT (WP `prepare_attributes_for_render`); any emit MUST use the object shape; verify the live computed value.
- **STOP-SUPPORTS-SPACING-DOUBLE-EMIT (D328)** — the wrapper reads `style.spacing` UNCONDITIONALLY; a block on the object box model MUST drop `supports.spacing`.
- **STOP-21** — emit-green ≠ LANDED. LANDED = deploy + OPcache + `wp litespeed-purge all` + Hostinger CDN clear + live computed-value. The header renders from `parts/header.html` (the FSE part) — edit the PART, not just the pattern (keep header.html + framework-header-default.php byte-identical, §S1).
- **STOP-CSS-VER-CACHE-BUST (D310/D330)** — a `style.css`/theme-CSS/pattern change is stale unless `theme/sgs-theme/style.css` Version bumps; a plugin CSS change → `SGS_BLOCKS_VERSION`; a block CSS change → that `block.json` version. (D335 bumped theme 1.5.21→1.5.22 for the header.html + pattern change.)
- **STOP-CDN-NEW-CSS-RULE (D330)** — a BRAND-NEW CSS rule under an UNCHANGED `?ver` renders stale even after LiteSpeed+OPcache clear; bump the version AND clear the Hostinger CDN (`hosting_clearWebsiteCacheV1`).
- **STOP-CSS-CUSTOM-PROP-RACE (D330)** — NEVER write a JS-published CSS custom property (`--sgs-header-height`) from a CSS rule; drive state via a class toggle.
- **STOP-static-vs-live (D304/D305)** — for "does this rule apply / what renders?" use the LIVE DOM (Playwright computed-style / a server render_block probe with the CSS collector removed), never static PHP/CSS parsing.
- **STOP-67** — a changed BLOCK needs a pre-commit visual-diff report at `reports/visual-diff/<block>-<YYYY-MM-DD>.md` (`verdict: PASS` + `first_paint_capture_passed: true`). The commit gate hard-blocks without it (caught D335).
- **STOP-16** — a subagent / "it works" / build-green is a HYPOTHESIS. Re-verify live yourself. Node/npm via PowerShell (nvm shim broken in Git Bash).
- **STOP-WINDOWS-BASH-STALE** — Git Bash `git add`/`ls`/`find` has a stale view of Write-tool files; stage + commit + delete via PowerShell.
- **STOP-PARALLEL-TRACK-SWEEP (D326)** — commit path-scoped (never `git add -A`); verify D-ceiling + branch before every commit. Pre-existing session-start dirt (lucide-icons.php, package-lock, phase4-*.txt, root .db, rr.json) is NOT yours.
- **Composite-mirror (R-31-9 / D294)** — no divergent per-block styling path; no inline `style=""` (Spec 32); no block version bumps as deprecations (D270/D293).

## ⛔ PRE-FLIGHT SELF-ATTESTATION (answer before first Write/Edit)
1. Have I read Spec 17 §S9 IN FULL (esp. FR-S9-4 + FR-S9-5) + `decisions.md` D335 this session?
2. For Task 1 (adaptive-nav migration): the replacement is DECIDED (don't re-gate). Have I captured the CURRENT drawer designs on both clients + planned to transfer them EXACTLY (nothing lost, esp. Indus) + mapped the FR-S9-5 a11y contract adaptive-nav must reproduce (focus-trap/ESC/scroll-lock/P0 re-parent/socials-from-Site-Info/toggle)? No allowedBlocks on the new drawer (STOP-NO-ALLOWLIST).
3. Am I reading any business value from ONE Site-Info source, never a parallel store or hardcode (STOP-ONE-SOURCE-BUSINESS-INFO)?
4. Before flagging a contrast/colour issue, did I pixel-confirm (STOP-MEASUREMENT-VS-EYE)?
5. Will I verify on the LIVE DOM after the full cache-clear incl. the CDN (STOP-21 + STOP-CDN-NEW-CSS-RULE), not on build-green?
6. Have I verified the D-ceiling (`grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1`) + branch = `main` before committing?

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` (design mode) | Task 1 — design HOW adaptive-nav absorbs the drawer + a11y contract BEFORE building (the design-gate) |
| `/strategic-plan` + `/phase-planner` | scope the re-architecture into design-gate → build → verify phases |
| `/gap-analysis` | grade the §S9 build + the re-architecture design before the sign-off |
| `/systematic-debugging` | any a11y/behaviour regression during the drawer absorption |
| `/dispatching-parallel-agents` + `/subagent-driven-development` | parallel block work after the design is settled (re-verify live yourself, STOP-16) |
| `/ui-ux-pro-max` | Task 3 — the Site-Editor builder UX + out-of-box defaults |
| `/a11y-audit` · `/visual-qa` · `/qc` | live breakpoint + keyboard + WCAG verification |
| `/sgs-wp-engine` + `/sgs-update` | SGS block dev + DB re-register |
| `/research` / `/library-docs` | WP off-canvas/disclosure a11y patterns (GOV.UK) for the drawer absorption |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| Playwright MCP | live per-tier + computed-style + keyboard/drawer verification (kill orphaned chrome + rm the Singleton lock if the profile locks) |
| Hostinger MCP `hosting_clearWebsiteCacheV1` | CDN clear before any live measure (STOP-CDN-NEW-CSS-RULE) |
| `/wp-blocks` + `/sgs-db` | schema/DB ground truth before any "missing X" claim |

## Agents to Delegate To
| Agent | When |
|-------|------|
| general-purpose (Sonnet) | per-block wiring after the design-gate is approved (re-verify live yourself, STOP-16) |
| `/qc-council` raters | validate any sensitive shared-mechanism fix-shape before commit (drawer a11y absorption) |

---

## Task 1: MIGRATE to adaptive-nav as the unified global nav + remove mobile-nav (decided; plan the clean transfer)
**What:** complete `sgs/adaptive-nav` as the single global nav (desktop bar + mobile collapse + its OWN off-canvas drawer), then remove `sgs/mobile-nav` + `sgs/mobile-nav-toggle`. **Why:** Bean — adaptive-nav was BUILT to replace both `core/navigation` + `sgs/mobile-nav`; one responsive block, no duplication. **This is a MIGRATION, not a re-design-gate** (the design was gated at §S9 2026-07-13). **Ground truth:** adaptive-nav currently DELEGATES the drawer to `sgs/mobile-nav` (render.php:8) — so it needs its own drawer. **Plan the clean transfer FIRST (not to re-decide, but to not lose anything):** (1) capture the CURRENT drawer/menu design on BOTH clients live (Indus teal drawer + Mama's + the `render_socials_zone` coloured buttons + the nav + email + tagline zones) — screenshots + DOM; (2) give adaptive-nav its own drawer reproducing the FR-S9-5 a11y contract EXACTLY (focus-trap, ESC, backdrop-dismiss, body-scroll-lock, D323 P0 re-parent-to-`<body>`, toggle + `aria-controls`/`aria-expanded`) + the socials zone reading Site Info (Task 2) + NO allowedBlocks restriction (STOP-NO-ALLOWLIST); (3) swap the header.html/pattern from mobile-nav→adaptive-nav's drawer; (4) delete mobile-nav + mobile-nav-toggle + reseed the DB (`/sgs-update`); (5) live-verify on BOTH clients that the migrated drawer looks + behaves IDENTICALLY to before (nothing lost) + the full a11y contract holds. **Orchestration:** capture + plan inline (Opus) → build (subagents) → live-verify yourself (STOP-16). **/qc gate:** yes (a11y-critical shared mechanism). **Acceptance:** adaptive-nav renders the full nav + its own drawer with the FR-S9-5 a11y contract intact on 2 live clients; the CURRENT designs transferred exactly (Indus especially); mobile-nav + mobile-nav-toggle removed with zero regression; spec reconciled.

## Task 2: One-source business info (unify the parallel social store + audit)
**What:** make the mobile-nav socials' `sgs_social_{linkedin,facebook,instagram,google}` store read from `sgs_site_info.socials.*` instead (fold into Task 1's drawer socials); grep the codebase for any OTHER hardcoded/parallel business-info store. **Why:** Bean — "all business info optional, one source, never hardcoded". **Orchestration:** inline + a grep audit; the socials unification lands inside the Task-1 drawer. **Acceptance:** every business value (phone/email/address/hours/socials/copyright) reads from `sgs_site_info` only; empty → renders nothing; no parallel store or hardcode remains (report the audit result). **/qc gate:** part of Task 1's live verify.

## Task 3: Site-Editor visual-builder UX analysis (same depth as the frontend QA)
**What:** log into the Site Editor (sandybrown creds) and assess the block-editor experience a non-coder client uses to build/configure the header/footer: inserting + configuring `sgs/site-header`/`site-footer`/`adaptive-nav`/`business-info`/`social-icons`, the inspector controls (are they clear? complete? is every setting exposed?), the empty-state guidance, the Replace picker, and the drawer builder (post Task-1). **Why:** Bean — clients use the block editor exclusively; the builder UX must be good, not just the frontend. **Orchestration:** `/ui-ux-pro-max` + Playwright editor login; produce a findings report + fixes. **Acceptance:** a builder-UX findings report with prioritised fixes; any blocker fixed before sign-off. **/qc gate:** n/a (it IS the analysis).

## After Tasks 1-3 — the HARD gate
Present the reconciled FR-S9-1..11 audit + the re-architecture + the builder-UX result for Bean's **"§S9 totally covered" sign-off**. Do NOT start **Spec 33 Part 2** (header/footer clone pipeline — Bean wants ASAP) until the sign-off.

## Dependency graph
```
Task 1 DESIGN (Opus, /brainstorming) → BEAN APPROVAL (hard gate)
  ↓
Task 1 BUILD (parallel subagents) + Task 2 (one-source, folds into Task 1 drawer)
  ↓ /qc + live a11y verify (both clients)
Task 3 (Site-Editor builder UX — parallel with Task 1 build)
  ↓
Present FR-S9-1..11 audit → BEAN "§S9 totally covered" SIGN-OFF (HARD gate)
  ↓
Spec 33 Part 2
```

## Methodology guardrails (do not skip)
- **Design-gate the mobile-nav removal BEFORE building (Rule 7 / STOP-DESIGN-GATE-HIGH-BLAST-RADIUS)** — it re-homes the a11y-critical drawer.
- **Deploy before measure (STOP-21 + STOP-CDN-NEW-CSS-RULE)** — build + deploy + OPcache + LiteSpeed + Hostinger CDN clear BEFORE any live measure; bump the version for a new CSS rule.
- **One source for business info (STOP-ONE-SOURCE-BUSINESS-INFO)** — never a parallel store or hardcode.
- **Pixel-confirm before flagging a contrast issue (STOP-MEASUREMENT-VS-EYE).**
- **Live-verify yourself (STOP-16)** — a subagent/build-green is a hypothesis; re-check the a11y contract on the live DOM.
- **Outcome vs completion** — §S9 "sign-off ready" = the re-architecture live + a11y-verified + the builder UX good + the spec reconciled; not "code shipped".

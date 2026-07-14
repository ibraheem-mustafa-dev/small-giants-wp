---
doc_type: next-session-prompt
project: small-giants-wp
generated: 2026-07-14
thread: BUILD FR-S9-8 (the SINGLE remaining §S9 FR) → confirm ALL Spec 17 §S9 covered (Bean sign-off) → THEN Spec 33 Part 2
---

# NEXT SESSION — build FR-S9-8, confirm Spec 17 §S9 totally covered, then Spec 33 Part 2

You are the SGS WordPress block + frontend developer. **§S9 is now 10/11 DONE + live-verified** (D330): FR-S9-9 (3 header behaviours as no-code block controls) shipped + the theme-side header-mode system retired; FR-S9-10 (Site Info set-once-renders-both) live-confirmed. **FR-S9-8 (per-device content adaptation) is the SINGLE remaining §S9 build.** Invoke `/autopilot` first.

Read `.claude/handoff.md` + `CLAUDE.md` + `.claude/reports/2026-07-14-spec17-s9-coverage-audit.md` for full context, then work the priorities.

## ⛔ BEAN'S DIRECTIVE — the arc (unchanged)
1. **CONFIRM every point in Spec 17 §S9 is TOTALLY covered** — **10/11 FRs DONE** (FR-S9-1..7 + FR-S9-9 + FR-S9-10 + FR-S9-11). BUILD the **1 remaining**: **FR-S9-8** (per-device content adaptation). Spec 17 is NOT "covered" until FR-S9-8 is built + live-verified on ≥2 clients.
2. **ONLY THEN start Spec 33 PART 2** — the header/footer CLONE pipeline (`P-CLONE-PIPELINE-HEADER-FOOTER-HANDLER` = Spec 17 P5 / FR-S9-11 step 3). Do NOT start Part 2 until Bean signs off "§S9 totally covered". Fold in the recogniser multi-flag update (`P-RECOGNISER-HEADER-BEHAVIOUR-MULTIFLAG`) as part of Part 2.

## Why this next
D330 closed FR-S9-9 + FR-S9-10 (and merged in the Task 2b theme-system retirement the qc-council forced). FR-S9-8 is the last §S9 build — a multi-step build (a NEW move-to-drawer drop-zone + `showLabel`/`iconOnly` on 2 blocks + the Indus slim-bar reproduction) that Bean deliberately deferred to its own focused session.

## ⛔ MANDATORY READING GATE (read IN FULL before any Write/Edit)
1. `.claude/handoff.md` (D330 record) + `.claude/decisions.md` D330 + `.claude/reports/2026-07-14-spec17-s9-coverage-audit.md`.
2. `.claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md` §S9 **FR-S9-8 IN FULL** + Spec 17 end-to-end (Bean-locked: read the governing spec fully each session).
3. `.claude/plans/2026-07-13-header-footer-nav-system-design-gate.md` §7 (the Indus reference pattern + place-then-toggle, no magic primitive) + §6 (the drawer as a separate drop-zone).
4. Existing infra to EXTEND (do NOT rebuild): `plugins/sgs-blocks/includes/device-visibility.php` (per-tier visibility, universal `render_block` filter — `sgsHideOnMobile/Tablet/Desktop`); `plugins/sgs-blocks/src/blocks/business-info/render.php` (the `tel:`/`mailto:` plumbing ALREADY EXISTS L67-105 — `iconOnly` suppresses the `<span>` label, keeps the linked icon); `src/blocks/adaptive-nav/` (nav links); `src/blocks/mobile-nav/` (`contactDisplayMode: icon-only|icon-text|hidden` is the drawer-side precedent; the move-to-drawer drop-zone is a NEW tier-gated InnerBlocks slot).
5. **For Spec 33 Part 2 (only after §S9 sign-off):** `.claude/specs/33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md` (Part-2 note) + `.claude/parking.md` → `P-CLONE-PIPELINE-HEADER-FOOTER-HANDLER` + `P-RECOGNISER-HEADER-BEHAVIOUR-MULTIFLAG` + `P-ADAPTIVE-NAV-P2B`.

## ⛔ ANTI-PATTERN STOPs (carried forward — NEVER subtract, D101)
- **STOP-HIDDEN-PARALLEL-SYSTEM (D330, NEW)** — before building on a "dormant" system, GREP for a SECOND system doing the same job. FR-S9-9 nearly shipped a 3rd header-behaviour system because the design missed the theme-side `inc/class-header-behaviour.php` (a full sticky/transparent/shrink system, silent only because `sgs_header_mode` defaults to `static` — one admin click from active). A qc-council caught it. A default-off system is NOT retired.
- **STOP-CSS-CUSTOM-PROP-RACE (D330, NEW)** — NEVER write a JS-published CSS custom property (e.g. `--sgs-header-height`, published by view.js's ResizeObserver) from a CSS rule; it races the publisher (flicker). Drive state via a class toggle + a SEPARATE property / scroll-driven animation.
- **STOP-CDN-NEW-CSS-RULE (D330, NEW — extends STOP-CSS-VER-CACHE-BUST)** — a BRAND-NEW CSS rule (a selector that didn't exist before) served under an UNCHANGED plugin `?ver` renders stale even after LiteSpeed+OPcache clear; the scrim didn't paint until `SGS_BLOCKS_VERSION` bumped AND the Hostinger CDN was cleared (`hosting_clearWebsiteCacheV1`). Bump the plugin version + clear the CDN before measuring a new plugin CSS rule.
- **STOP-NO-KSORT (D326/D327/D328)** — the shared-wrapper uid = `md5(wp_json_encode($attributes))`; NEVER `ksort`/reorder the hash input. Object-model key order is a WRITE-TIME guarantee. A uid change from a genuine attribute shape/value change is EXPECTED (content-driven), NOT churn.
- **STOP-WRAPPER-OWNED-VS-BLOCK-OWNED (D327/D328)** — a WRAPPER capability (row flex gap/width/padding/margin) is emitted BY the wrapper via `responsive_model=object`; a block's OWN internal element (nav `<ul>` gap, nav link font-size) uses the shared `sgs_emit_responsive_css()` directly in its render.php. Don't route a block-owned element through the wrapper flag (double-emit) or a wrapper capability block-private (fork — qc-council NON-COMPLIANT).
- **STOP-CONTAINER-TYPE-SELF-QUERY (D327)** — an element cannot size-`@container` itself. container-type on the OUTER; the styled flex/grid + tier rules on a DESCENDANT (`.sgs-container__inner`). Measure the inner, not the outer.
- **STOP-GRACEFUL-MIGRATION (D327)** — flipping/extending `responsive_model=object` must NOT break a flat-stored instance (`$object_grid` gate + `is_array` guards + emitter `normalise_object`). Verify a non-re-saved instance still renders.
- **STOP-OBJECT-COERCION (D328)** — an `object`-typed block attr silently COERCES a flat stored value to the block.json DEFAULT (WP `prepare_attributes_for_render`), discarding the authored value. Any pattern/converter emit for an object attr MUST use the object shape. Verify the live computed value, not the emit.
- **STOP-SUPPORTS-SPACING-DOUBLE-EMIT (D328)** — the wrapper reads `style.spacing.padding/margin` UNCONDITIONALLY. A block on the object box model MUST drop `supports.spacing` AND migrate any `style.spacing` in its instances to the object, else double-emit + the WP Dimensions panel stays visible.
- **STOP-21** — emit-green ≠ LANDED. LANDED = deploy + OPcache + `wp litespeed-purge all` + Hostinger `hosting_clearWebsiteCacheV1` (CDN) + live computed-value. The header renders from `parts/header.html` (the FSE part) — editing the pattern alone does nothing live; edit the PART.
- **STOP-CSS-VER-CACHE-BUST (D310/D316/D322/D328/D330)** — a `style.css`/theme-CSS/pattern change is stale unless `theme/sgs-theme/style.css` Version bumps; a plugin CSS change bumps `SGS_BLOCKS_VERSION`; a block CSS change bumps that `block.json` version.
- **STOP-static-vs-live (D304/D305)** — for "does this rule apply / what renders?" use the LIVE DOM (Playwright computed-style), never static PHP/CSS parsing.
- **STOP-67** — a changed BLOCK needs a pre-commit visual-diff report at `reports/visual-diff/<block>-<date>.md` (`verdict: PASS` + `first_paint_capture_passed: true`). The commit gate enforces the EXACT filename `<block>-<YYYY-MM-DD>.md` (no extra segments).
- **STOP-16** — a subagent / "it works" / build-green is a HYPOTHESIS. Re-verify live yourself. Node/npm via PowerShell (nvm shim broken in Git Bash).
- **STOP-WINDOWS-BASH-STALE** — Git Bash `git add`/`ls`/`find` has a stale view of Write-tool-created + deleted files; stage + commit + delete via PowerShell (Windows = ground truth).
- **STOP-PARALLEL-TRACK-SWEEP (D326)** — commit path-scoped (never `git add -A`); verify D-ceiling + branch before every commit.
- **Composite-mirror (R-31-9 / D294)** — no divergent per-block styling path; no inline `style=""` (Spec 32); no block version bumps as deprecations (D270/D293).

## ⛔ PRE-FLIGHT SELF-ATTESTATION (answer before first Write/Edit)
1. Have I read Spec 17 §S9 (FR-S9-8) IN FULL + the design-gate §7 this session?
2. Am I EXTENDING existing infra (device-visibility / business-info tel-mailto plumbing / mobile-nav drawer) rather than rebuilding it?
3. Before building on any "existing" mechanism, have I grepped for a SECOND parallel system doing the same job (STOP-HIDDEN-PARALLEL-SYSTEM)?
4. For any styling I emit — WRAPPER capability (→ flag) or block's OWN element (→ shared emitter direct)? Object shape, no inline, no supports.spacing double-emit? No JS-published custom-prop written from CSS (STOP-CSS-CUSTOM-PROP-RACE)?
5. Will I verify on the LIVE DOM after the full cache-clear sequence incl. the CDN (STOP-21 + STOP-CDN-NEW-CSS-RULE), not on build-green?
6. Have I verified the D-ceiling (`grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1`) + branch = `main` before committing?

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | ALWAYS — design the move-to-drawer drop-zone UX + the per-device adaptation before build |
| `/strategic-plan` + `/phase-planner` | ALWAYS — FR-S9-8 is multi-step; scope it |
| `/qc-council` | validate any shared-mechanism change (the new drop-zone) before dispatch (blub.db 255) — it CAUGHT the hidden theme system this session |
| `/gap-analysis` | grade the FR-S9-8 build vs its 4 acceptance bullets |
| `/lifecycle` | before any skill/agent change |
| `/sgs-wp-engine` + `/sgs-update` | SGS block dev + DB re-register |
| `/qc` · `/visual-qa` · `/a11y-audit` | live breakpoint + keyboard verification |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| Playwright MCP (`browser_navigate`/`browser_evaluate`/`browser_resize`) | live per-tier + `mailto:`/`tel:` href + drawer presence/absence verification. NOTE: if the profile locks ("Browser is already in use"), kill orphaned chrome for `mcp-chrome-*` via PowerShell + rm the Singleton lock. |
| Hostinger MCP `hosting_clearWebsiteCacheV1` | CDN clear (user `u945238940`, domain `sandybrown-nightingale-600381.hostingersite.com`) + `wp litespeed-purge all` + OPcache before any live measure |
| `/wp-blocks` + `/sgs-db` | schema/DB ground truth before any "missing X" claim |

## Agents to Delegate To
| Agent | When |
|-------|------|
| general-purpose (Sonnet) | per-piece block wiring after the shape is settled (re-verify live yourself, STOP-16) — worked well this session for the FR-S9-9 plugin build |
| `/qc-council` raters | review any shared-mechanism / drop-zone change before commit |

## Task 1: FR-S9-8 — per-device content adaptation (its own /strategic-plan)
**What:** (a) per-tier visibility toggle on every typed element (extend/reuse `device-visibility.php`); (b) `showLabel`/`iconOnly` on nav/CTA/contact elements — add to `business-info` (the `tel:`/`mailto:` plumbing EXISTS L67-105; `iconOnly` drops the `<span>` label) + `adaptive-nav`; (c) a move-to-drawer drop-zone (a NEW tier-gated InnerBlocks slot in `sgs/mobile-nav`; an item placed there renders ONLY in the drawer at the collapsed tier); (d) reproduce the Indus slim-bar reference pattern (≤1024 logo + single "Call" **button** — text→button, not icon; email/social→drawer; footer 3→1 at 768).
**Why:** FR-S9-8 acceptance — per-device adaptation without a magic primitive (place-then-toggle).
**Orchestration:** `/brainstorming` the drop-zone UX first; `/qc-council` the drop-zone shape before dispatch; inline or 1 Sonnet subagent per sub-piece; live-verify each on Mama's AND Indus (R-31-9). **But: no live indus deployment exists** — either stand one up, or evidence the 2nd client by-construction + on a second live SGS site, and flag the gap to Bean.
**Acceptance:** every FR-S9-8 acceptance bullet live-verified (per-tier visibility; `iconOnly` email→`mailto:`, phone→`tel:`; drawer element absent from collapsed header, present in open drawer; Indus reproduction). **/qc gate after:** yes.

## Task 2: present the §S9 coverage audit for Bean's "totally covered" sign-off
**What:** update `.claude/reports/2026-07-14-spec17-s9-coverage-audit.md` marking FR-S9-8 DONE + live-verified (11/11); present the full FR-S9-1..11 audit to Bean for the "totally covered" sign-off (the HARD gate before Spec 33 Part 2). **Depends on:** Task 1.

## Task 3: START Spec 33 PART 2 (ONLY after Task 2 sign-off)
**What:** the `/sgs-clone` header/footer handler — extract a draft's header/footer ONCE per site → emit `sgs/site-header`/`sgs/site-footer`/`sgs/adaptive-nav` by BEM role. Fold in the recogniser multi-flag update (`P-RECOGNISER-HEADER-BEHAVIOUR-MULTIFLAG` — write `sgs/site-header` block attrs, not the retired `sgs_header_rules` option). Design-gate first. **Depends on:** Task 2 sign-off (HARD).

## Optional cleanup (own session): consolidation residuals
- `P-CUSTOMISER-HEADER-FOOTER-RETIRE` — retire the plugin-side Customiser path (`Sgs_Header_Customiser`/`Sgs_Footer_Customiser`/`Sgs_Header_Renderer`, sgs-blocks.php L410-413) — the OTHER legacy path from D329 Task 2b, not touched D330 (header/footer colours + a now-redundant sticky toggle duplicating the block controls). Prove `Sgs_Header_Renderer` dormant first.
- `P-ALT-HEADER-PART-STUBS` — delete the 3 inert alt-header stubs (`header-{sticky,transparent,shrink}.html` + patterns + theme.json registrations); keep `header-minimal`.

## Dependency graph
```
Task 1 (FR-S9-8 build) ── own /strategic-plan + /phase-planner + live-verify (≥2 clients)
  ↓ (done + live)
Task 2 (coverage audit → BEAN SIGN-OFF GATE — 11/11)
  ↓ (only after "§S9 totally covered")
Task 3 (Spec 33 Part 2, incl. recogniser multi-flag update)
  ↓
Commit + push per milestone (path-scoped; verify D-ceiling + branch = main)
```

## Methodology guardrails (do not skip)
- **Deploy before measure (STOP-21 + STOP-CDN-NEW-CSS-RULE)** — build + deploy + OPcache + LiteSpeed + Hostinger CDN clear BEFORE any live measure; bump the version for a new CSS rule.
- **Extend, don't rebuild** — FR-S9-8 has existing infra (device-visibility / business-info plumbing / drawer); extend it, never a parallel system.
- **Grep for a hidden parallel system before building on a "dormant" one (STOP-HIDDEN-PARALLEL-SYSTEM).**
- **Root cause before instance fix** — for a rendering miss, prove the cause on the LIVE DOM first.
- **Outcome vs completion** — §S9 "covered" = every FR built + live-verified; infra-exists ≠ done.
- **/qc-council any shared-mechanism / drop-zone change BEFORE dispatch.** Object shape, no inline, no supports.spacing double-emit, no JS-published custom-prop written from CSS.

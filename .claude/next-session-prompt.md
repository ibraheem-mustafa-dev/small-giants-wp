---
doc_type: next-session-prompt
project: small-giants-wp
generated: 2026-07-14
thread: BUILD the 3 open §S9 FRs (FR-S9-8/9/10) → confirm ALL Spec 17 §S9 covered (Bean sign-off) → THEN Spec 33 Part 2
---

# NEXT SESSION — build FR-S9-8/9/10, confirm Spec 17 §S9 totally covered, then Spec 33 Part 2

You are the SGS WordPress block + frontend developer. FR-S9-6 (the per-device responsive-override model) is CLOSED for all 3 §S9 blocks (`sgs/site-header-row`, `sgs/site-footer-row`, `sgs/adaptive-nav`) — gap + box + width + link-font-size all on the object model, live-verified (D328). Invoke `/autopilot` first.

Read `.claude/handoff.md` + `CLAUDE.md` + `.claude/reports/2026-07-14-spec17-s9-coverage-audit.md` for full context, then work the priorities.

## ⛔ BEAN'S DIRECTIVE — the arc (unchanged from 2026-07-14)
1. **CONFIRM every point in Spec 17 §S9 is TOTALLY covered** — 8/11 FRs are DONE (FR-S9-1..7 + FR-S9-11). BUILD the 3 open ones (FR-S9-8 per-device content adaptation, FR-S9-9 sticky/transparent-on-scroll toggle, FR-S9-10 global-defaults + shared Site Info), each built + live-verified. Spec 17 is NOT "covered" until every §S9 FR is built + live-verified.
2. **ONLY THEN start Spec 33 PART 2** — the header/footer CLONE pipeline (`P-CLONE-PIPELINE-HEADER-FOOTER-HANDLER` = Spec 17 P5 / FR-S9-11 step 3). Do NOT start Part 2 until Bean signs off "§S9 totally covered".

## Why this next
D328 closed FR-S9-6 fully + produced the coverage audit. The audit found FR-S9-8/9/10 are the only open §S9 FRs — each has infrastructure (device-visibility extension, header-behaviours layer, FR-S4 Site Info store) but needs block-specific wiring. These 3 are the hard gate before Spec 33 Part 2.

## ⛔ MANDATORY READING GATE (read IN FULL before any Write/Edit)
1. `.claude/handoff.md` (D328 record) + `.claude/decisions.md` D328 + `.claude/reports/2026-07-14-spec17-s9-coverage-audit.md`.
2. `.claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md` §S9 FR-S9-8 + FR-S9-9 + FR-S9-10 IN FULL + Spec 17 end-to-end (Bean-locked: read the governing spec fully each session).
3. `.claude/plans/2026-07-13-header-footer-nav-system-design-gate.md` (§S9 design decisions incl. the Indus reference pattern + Material scroll behaviours) + `.claude/plans/go-rippling-cascade.md` (the FR-S9-6 engine + wrapper mechanics).
4. Existing infra to EXTEND (do NOT rebuild): `plugins/sgs-blocks/includes/device-visibility.php` (FR-S9-8 per-tier visibility), `includes/class-sgs-header-behaviours.php` (FR-S9-9 behaviour layer — `transparent`/`sticky`/`hide-on-scroll-down` + `is-header-scrolled`), the FR-S4-1/2/3 Site Info store + `sgs/business-info` block (FR-S9-10).
5. **For Spec 33 Part 2 (only after §S9 sign-off):** `.claude/specs/33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md` (Part-2 note) + `.claude/parking.md` → `P-CLONE-PIPELINE-HEADER-FOOTER-HANDLER` + `P-ADAPTIVE-NAV-P2B`.

## ⛔ ANTI-PATTERN STOPs (carried forward — NEVER subtract, D101)
- **STOP-NO-KSORT (D326/D327/D328)** — the shared-wrapper uid = `md5(wp_json_encode($attributes))`; NEVER `ksort`/reorder the hash input. Object-model key order is a WRITE-TIME guarantee (`makeResponsive` + block.json default order). A uid change from a genuine attribute shape/value change is EXPECTED (content-driven), NOT churn — STOP-NO-KSORT is about identical content → identical uid.
- **STOP-WRAPPER-OWNED-VS-BLOCK-OWNED (D327/D328)** — a WRAPPER capability (row flex gap/width/padding/margin) is emitted BY the wrapper via `responsive_model=object`; a block's OWN internal element (nav `<ul>` gap, nav link font-size) uses the shared `sgs_emit_responsive_css()` directly in its render.php. Don't route a block-owned element through the wrapper flag (double-emit) or a wrapper capability block-private (fork — qc-council NON-COMPLIANT).
- **STOP-CONTAINER-TYPE-SELF-QUERY (D327)** — an element cannot size-`@container` itself. container-type on the OUTER; the styled flex/grid + tier rules on a DESCENDANT (`.sgs-container__inner`). Object mode forces the inner — measuring the OUTER's gap/display gives the wrong answer (measure the inner).
- **STOP-GRACEFUL-MIGRATION (D327)** — flipping/extending `responsive_model=object` must NOT break a flat-stored instance (`$object_grid` gate + `is_array` guards + emitter `normalise_object`). Verify a non-re-saved instance still renders.
- **STOP-OBJECT-COERCION (D328, NEW)** — an `object`-typed block attr silently COERCES a flat stored value to the block.json DEFAULT (WP `prepare_attributes_for_render`), discarding the authored value. Any pattern/converter emit for an object attr MUST use the object shape. Verify the live computed value, not the emit.
- **STOP-SUPPORTS-SPACING-DOUBLE-EMIT (D328, NEW)** — the wrapper reads `style.spacing.padding/margin` UNCONDITIONALLY (L938, no object gate). A block on the object box model MUST drop `supports.spacing` AND migrate any `style.spacing` in its instances to the object, else double-emit + the WP Dimensions panel stays visible.
- **STOP-21** — emit-green ≠ LANDED. LANDED = deploy + OPcache + `wp litespeed-purge all` + Hostinger `hosting_clearWebsiteCacheV1` (CDN) + live computed-value.
- **STOP-CSS-VER-CACHE-BUST (D310/D316/D322/D328)** — a `style.css`/theme-CSS/pattern change is stale unless `theme/sgs-theme/style.css` Version bumps; a block CSS change bumps that `block.json` version (render-side scoped `<style>` lands fresh).
- **STOP-static-vs-live (D304/D305)** — for "does this rule apply / what renders?" use the LIVE DOM (Playwright computed-style), never static PHP/CSS parsing.
- **STOP-67** — a changed BLOCK needs a pre-commit visual-diff report at `reports/visual-diff/<block>-<date>.md` (`verdict: PASS` + `first_paint_capture_passed: true`). The commit gate enforces it.
- **STOP-16** — a subagent / "it works" / build-green is a HYPOTHESIS. Re-verify live yourself. Node/npm via PowerShell (nvm shim broken in Git Bash).
- **STOP-WINDOWS-BASH-STALE** — Git Bash `git add` has a stale view of Write-tool-created files; stage + commit via PowerShell (Windows = ground truth).
- **STOP-PARALLEL-TRACK-SWEEP (D326)** — commit path-scoped (never `git add -A`); verify D-ceiling + branch before every commit.
- **Composite-mirror (R-31-9 / D294)** — no divergent per-block styling path; no inline `style=""` (Spec 32); no block version bumps as deprecations (D270/D293).

## ⛔ PRE-FLIGHT SELF-ATTESTATION (answer before first Write/Edit)
1. Have I read Spec 17 §S9 (the FR I'm building) IN FULL + the design-gate this session?
2. Am I EXTENDING the existing infra (device-visibility / header-behaviours / Site Info store) rather than rebuilding it?
3. For any styling I emit — WRAPPER capability (→ flag) or block's OWN element (→ shared emitter direct)? Object shape, no inline, no supports.spacing double-emit?
4. Will I verify on the LIVE DOM after the full cache-clear sequence (STOP-21), not on build-green?
5. Have I verified the D-ceiling (`grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1`) + branch = `main` before committing?

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | ALWAYS — design each FR (per-device UX, scroll-behaviour options, Site-Info wiring) before build |
| `/gap-analysis` | ALWAYS — grade each FR build vs its acceptance criteria |
| `/lifecycle` | ALWAYS — before any skill/agent change |
| `/research` | ALWAYS — Blocksy Trigger / Material scroll patterns / WP block-bindings if needed |
| `/strategic-plan` + `/phase-planner` | ALWAYS — scope each FR build (they're independent) |
| `/qc-council` | validate any shared-wrapper / shared-behaviour-layer change before dispatch (blub.db 255) |
| `/sgs-wp-engine` + `/sgs-update` | SGS block dev + DB re-register |
| `/qc` · `/visual-qa` · `/a11y-audit` | live breakpoint + keyboard verification |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| Playwright MCP (`browser_navigate`/`browser_evaluate`/`browser_resize`) | live per-tier + scroll-simulation + keyboard verification |
| Hostinger MCP `hosting_clearWebsiteCacheV1` | CDN clear (user `u945238940`, domain `sandybrown-nightingale-600381.hostingersite.com`) + `wp litespeed-purge all` + OPcache before any live measure |
| `/wp-blocks` + `/sgs-db` | schema/DB ground truth before any "missing X" claim |

## Agents to Delegate To
| Agent | When |
|-------|------|
| general-purpose (Sonnet) | per-FR block wiring after the shape is settled (re-verify live yourself, STOP-16) |
| `feature-dev:code-reviewer` (or /qc-council raters) | review any shared-wrapper / behaviour-layer change before commit |

## Task 1: FR-S9-8 — per-device content adaptation
**What:** per-tier visibility toggle on every typed element (extend/reuse `device-visibility.php`); `showLabel`/`iconOnly` on nav/CTA/contact elements (`iconOnly` email→working `mailto:`, phone→`tel:`); a move-to-drawer drop-zone (item renders ONLY inside `sgs/mobile-nav` at the collapsed tier); reproduce the Indus slim-bar reference pattern (≤1024 logo + single "Call" button; email/social to drawer; footer 3→1).
**Why:** FR-S9-8 acceptance — per-device adaptation without a magic primitive (place-then-toggle).
**Estimated time:** own `/strategic-plan` + `/phase-planner`; multi-step.
**Orchestration:** `/brainstorming` the UX first; inline or 1 Sonnet subagent per sub-piece; live-verify each on Mama's AND Indus (R-31-9).
**Acceptance:** every acceptance bullet in Spec 17 FR-S9-8 live-verified on ≥2 clients. **/qc gate after:** yes.

## Task 2: FR-S9-9 — sticky / transparent-on-scroll no-code toggle
**What:** EXTEND `class-sgs-header-behaviours.php` (do NOT rebuild) with an `sgs/site-header` inspector toggle exposing the 3 Material scroll behaviours (pinned / enter-always / exit-until-collapsed) + transparent-at-rest→solid-on-scroll; route the state through a CSS custom-property token (Spec 32 no-inline). Regression-test the existing behaviour layer + `--sgs-header-height` ResizeObserver + `scroll-padding-top` anchor fix.
**Why:** FR-S9-9 acceptance — no-code, beats Elementor's hand-written-CSS requirement.
**Orchestration:** `/brainstorming` + `/qc-council` the behaviour-layer change before dispatch; live Playwright scroll simulation.
**Acceptance:** toggle works no-code; existing behaviour-layer tests still green; dark-mode contrast holds through the transition. **/qc gate after:** yes.

## Task 3: FR-S9-10 — global defaults + shared Site Info
**What:** wire the EXISTING FR-S4-1/2/3 Site Info store into the header (already in the footer via `sgs/business-info`); confirm the 3 blocks default colours/typography/spacing from `theme.json`/`wp_global_styles`/`theme-snapshot.json` tokens (grep-clean of literals). NO new store, NO new admin page — wiring only.
**Why:** FR-S9-10 acceptance — one source of truth across header AND footer.
**Orchestration:** inline or 1 Sonnet subagent; live-verify a Site-Info value set once renders in both header + footer on ≥2 clients (mamas + indus).
**Acceptance:** every FR-S9-10 acceptance bullet live-verified. **/qc gate after:** yes.

## Task 4: present the §S9 coverage audit for Bean's "totally covered" sign-off
**What:** update `.claude/reports/2026-07-14-spec17-s9-coverage-audit.md` marking FR-S9-8/9/10 DONE + live-verified; present the full FR-S9-1..11 audit to Bean for the "totally covered" sign-off (the HARD gate before Spec 33 Part 2).
**Depends on:** Tasks 1-3.

## Task 5: START Spec 33 PART 2 (ONLY after Task 4 sign-off)
**What:** the `/sgs-clone` header/footer handler — extract a draft's header/footer ONCE per site → emit `sgs/site-header`/`sgs/site-footer`/`sgs/adaptive-nav` by BEM role. Design-gate first.
**Depends on:** Task 4 sign-off (HARD — do NOT start before §S9 is confirmed totally covered).

## Dependency graph
```
Task 1 (FR-S9-8) ┐
Task 2 (FR-S9-9) ┤ independent — build in any order, /qc + live-verify each
Task 3 (FR-S9-10)┘
  ↓ (all 3 done + live)
Task 4 (coverage audit → BEAN SIGN-OFF GATE)
  ↓ (only after "§S9 totally covered")
Task 5 (Spec 33 Part 2)
  ↓
Commit + push per milestone (path-scoped; verify D-ceiling + branch = main)
```

## Methodology guardrails (do not skip)
- **Deploy before measure (STOP-21)** — build + deploy + OPcache + LiteSpeed + CDN clear BEFORE any live measure.
- **Extend, don't rebuild** — FR-S9-8/9/10 all have existing infra; extend it (device-visibility / header-behaviours / Site Info store), never a parallel system.
- **Root cause before instance fix** — for a rendering miss, prove the cause on the LIVE DOM first.
- **Outcome vs completion** — §S9 "covered" = every FR built + live-verified; infra-exists ≠ done.
- **/qc-council any shared-wrapper / behaviour-layer change BEFORE dispatch.** Never ksort the uid. Object shape, no inline, no supports.spacing double-emit.

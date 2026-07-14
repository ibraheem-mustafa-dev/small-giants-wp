---
doc_type: next-session-prompt
project: small-giants-wp
generated: 2026-07-14
thread: FINISH the §S9 pre-sign-off gate — clear the 5 DEFERRED council must-fixes → Bean's "§S9 totally covered" sign-off → Spec 33 Part 2
---

# NEXT SESSION — clear the deferred §S9 must-fixes, then Bean's sign-off, then Spec 33 Part 2

You are the SGS WordPress block + frontend developer. **Spec 17 §S9 is 11/11 BUILT** and a 6-persona `/adversarial-council` ran (D333). The 5 quick must-fixes shipped (security / WCAG / insert-template / placeholder / label — committed `da1415e0`). **5 must-fixes remain before Bean's sign-off** — they're this session. Invoke `/autopilot` first.

Read `.claude/handoff.md` + `CLAUDE.md` + `.claude/decisions.md` D333/D332/D331 + `.claude/reports/2026-07-14-spec17-s9-coverage-audit.md`, then work the priorities.

## ⛔ BEAN'S DIRECTIVE — the arc
1. **Clear the 5 DEFERRED council must-fixes** (Tasks 1-5 below). These are the rest of the pre-sign-off gate.
2. **THEN present the FR-S9-1..11 coverage audit for Bean's "§S9 totally covered" sign-off** — the HARD gate.
3. **THEN Spec 33 PART 2 — Bean wants this ASAP** — the header/footer CLONE pipeline (`P-CLONE-PIPELINE-HEADER-FOOTER-HANDLER`). Do NOT start until the sign-off.
> The full council register + fact-check is in `decisions.md` D333. The council's fix-shapes were HYPOTHESES — Bean directed a fact-check of every finding against live code FIRST (several were framing errors). Continue that discipline.

## ⛔ MANDATORY READING GATE (read IN FULL before any Write/Edit)
1. `.claude/handoff.md` (D333 record) + `.claude/decisions.md` D333 + D332 + D331.
2. `.claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md` §S9 END TO END (Bean-locked: read the governing spec fully each session) + Spec 32 (no-inline) + Spec 31 §13 (composite-mirror / uid).
3. `.claude/reports/2026-07-14-spec17-s9-coverage-audit.md`.
4. **Palestine-lives login (Bean-provided, Indus sandbox — for the 2nd-client verify, Task 3):** `.claude/secrets/palestine-lives.env`. Deploy via `python plugins/sgs-blocks/scripts/build-deploy.py --target palestine-lives` (explicit opt-in required).

## ⛔ ANTI-PATTERN STOPs (carried forward — NEVER subtract, D101)
- **STOP-COUNCIL/REGISTER-FIX-SHAPES-ARE-HYPOTHESES (D333, NEW)** — an adversarial-council / defect-register finding is a HYPOTHESIS, not a fact. FACT-CHECK every one against the LIVE code + DOM before acting (R-31-7). D333: of the council's findings, several were framing errors (FR-S9-6 "unbuilt" = closed D328; "no visual builder" = the FSE Site Editor IS a drag-drop builder; "3rd parallel system" = retired D330). Bean caught this and directed the fact-check.
- **STOP-PREFIX-ONLY-CSS-GATE (D333, NEW)** — NEVER emit an operator CSS value after only a PREFIX regex check (`/^gradient(/`). It lets `;`/`url(`/`position:fixed` through into inline CSS → injection. Use a FULL-value sanitiser (`sgs_css_gradient_value()` / `sgs_css_length` / `sgs_colour_value`). Caught the `sgs/mobile-nav` drawerGradient Author-level phishing-overlay vector.
- **STOP-EDITOR-ONLY-PLACEHOLDER (D333, NEW)** — an operator-guidance placeholder ("Set in Appearance…") is EDITOR-ONLY; gate it on `\SGS\Blocks\sgs_is_frontend_render()` + early-`return ''`, never leak it to the live frontend.
- **STOP-INSERT-TEMPLATE-VS-LIVE-PART (D333, NEW)** — a block's default `TEMPLATE` + `allowedBlocks` can diverge from the live template PART. Fixing the live part does NOT fix a FRESH block insert. Check both. (site-header seeded `core/navigation` in its TEMPLATE while the live part used `sgs/adaptive-nav`.)
- **STOP-HIDDEN-PARALLEL-SYSTEM (D330)** — before building on a "dormant" system, GREP for a SECOND system doing the same job (a default-off system is one admin click from active, NOT retired).
- **STOP-CSS-CUSTOM-PROP-RACE (D330)** — NEVER write a JS-published CSS custom property (e.g. `--sgs-header-height`) from a CSS rule; it races the publisher. Drive state via a class toggle.
- **STOP-CDN-NEW-CSS-RULE (D330)** — a BRAND-NEW CSS rule under an UNCHANGED `?ver` renders stale even after LiteSpeed+OPcache clear; bump the plugin/theme version AND clear the Hostinger CDN (`hosting_clearWebsiteCacheV1`).
- **STOP-NO-KSORT (D326-D328)** — the shared-wrapper uid = `md5(wp_json_encode($attributes))`; NEVER `ksort`/reorder the hash input. (RELEVANT to Task 1 — the fix must not reorder attrs.)
- **STOP-WRAPPER-OWNED-VS-BLOCK-OWNED (D327/D328)** — a WRAPPER capability is emitted BY the wrapper via a flag; a block's OWN element uses the shared emitter directly. Don't route a block-owned element through the wrapper flag (double-emit) or a wrapper capability block-private (fork — qc-council NON-COMPLIANT).
- **STOP-CONTAINER-TYPE-SELF-QUERY (D327)** — an element cannot size-`@container` itself. container-type on the OUTER; styled flex/grid + tier rules on a DESCENDANT.
- **STOP-GRACEFUL-MIGRATION (D327)** — flipping/extending `responsive_model=object` must NOT break a flat-stored instance (`is_array` guards + emitter `normalise_object`).
- **STOP-OBJECT-COERCION (D328)** — an `object`-typed block attr silently COERCES a flat stored value to the block.json DEFAULT (WP `prepare_attributes_for_render`). Any emit MUST use the object shape; verify the live computed value.
- **STOP-SUPPORTS-SPACING-DOUBLE-EMIT (D328)** — the wrapper reads `style.spacing` UNCONDITIONALLY; a block on the object box model MUST drop `supports.spacing`.
- **STOP-21** — emit-green ≠ LANDED. LANDED = deploy + OPcache + `wp litespeed-purge all` + Hostinger CDN clear + live computed-value. The header renders from `parts/header.html` (the FSE part) — edit the PART, not just the pattern.
- **STOP-CSS-VER-CACHE-BUST (D310/D330)** — a `style.css`/theme-CSS/pattern change is stale unless `theme/sgs-theme/style.css` Version bumps; a plugin CSS change bumps `SGS_BLOCKS_VERSION`; a block CSS change bumps that `block.json` version.
- **STOP-static-vs-live (D304/D305)** — for "does this rule apply / what renders?" use the LIVE DOM (Playwright computed-style / a server render_block probe with the CSS collector removed), never static PHP/CSS parsing.
- **STOP-67** — a changed BLOCK needs a pre-commit visual-diff report at `reports/visual-diff/<block>-<YYYY-MM-DD>.md` (`verdict: PASS` + `first_paint_capture_passed: true`, exact filename).
- **STOP-16** — a subagent / "it works" / build-green is a HYPOTHESIS. Re-verify live yourself. Node/npm via PowerShell (nvm shim broken in Git Bash).
- **STOP-WINDOWS-BASH-STALE** — Git Bash `git add`/`ls`/`find` has a stale view of Write-tool files; stage + commit + delete via PowerShell.
- **STOP-PARALLEL-TRACK-SWEEP (D326)** — commit path-scoped (never `git add -A`); verify D-ceiling + branch before every commit.
- **Composite-mirror (R-31-9 / D294)** — no divergent per-block styling path; no inline `style=""` (Spec 32); no block version bumps as deprecations (D270/D293).

## ⛔ PRE-FLIGHT SELF-ATTESTATION (answer before first Write/Edit)
1. Have I read Spec 17 §S9 IN FULL + `decisions.md` D333 this session?
2. Have I FACT-CHECKED the finding I'm about to fix against the LIVE code/DOM (STOP-COUNCIL-FIX-SHAPES-ARE-HYPOTHESES)?
3. For Task 1 (uid): does my change keep the wrapper's `md5` determinism (STOP-NO-KSORT) + not break a flat-stored instance (STOP-GRACEFUL-MIGRATION), and did I live-re-verify all 3 blocks at 375/1440?
4. Will I verify on the LIVE DOM after the full cache-clear incl. the CDN (STOP-21 + STOP-CDN-NEW-CSS-RULE), not on build-green?
5. Have I verified the D-ceiling (`grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1`) + branch = `main` before committing?

## Skills to Invoke
| Skill | When |
|-------|------|
| `/systematic-debugging` | Task 1 (uid) — root-cause the wp_unique_id-vs-md5 before changing the scoped-CSS selector on 2 sensitive blocks |
| `/doc-audit` | Task 2 — the spec-vs-live-code reconcile |
| `/qc-council` | validate the Task-1 uid fix-shape before dispatch (it touches the scoped-CSS selector on site-header + site-header-row — blub.db 255) |
| `/strategic-plan` + `/phase-planner` | scope the 5 tasks + Spec 33 Part 2 |
| `/gap-analysis` | grade the §S9 build before presenting the sign-off audit |
| `/sgs-wp-engine` + `/sgs-update` | SGS block dev + DB re-register |
| `/qc` · `/visual-qa` · `/a11y-audit` | live breakpoint + keyboard verification |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| Playwright MCP | live per-tier + computed-style verification (kill orphaned chrome + rm the Singleton lock if the profile locks) |
| Hostinger MCP `hosting_clearWebsiteCacheV1` | CDN clear (user `u945238940`, sandybrown) before any live measure |
| `/wp-blocks` + `/sgs-db` | schema/DB ground truth before any "missing X" claim |

## Agents to Delegate To
| Agent | When |
|-------|------|
| general-purpose (Sonnet) | per-piece block wiring after the shape is settled (re-verify live yourself, STOP-16) |
| `/qc-council` raters | the Task-1 uid fix-shape before commit (sensitive scoped-CSS selector change) |

---

## Task 1: uid determinism — rows use a per-request counter, not the content hash
**What:** `site-header/render.php:35` + `site-header-row/render.php:45` derive their scoped-`<style>` uid from `wp_unique_id()` (a per-request monotonic counter), NOT `md5(attributes)` like the shared wrapper; and `sgs_canonicalise_responsive_attrs` is unit-tested but never called by any block. **Why:** non-deterministic uids churn the CSS collector's per-page cache + falsify FR-S9-6's "re-save = same uid" golden claim + confuse a future dev with two uid systems on one element. **Optimal fix:** derive the row/header private uid from `md5(wp_json_encode($attributes))` (deterministic, matching the wrapper) — do NOT reorder attrs (STOP-NO-KSORT); confirm the uid is applied as BOTH id + class (D303) so the scoped selector still matches. **Orchestration:** `/systematic-debugging` root-cause first; `/qc-council` the fix-shape (sensitive — scoped-CSS selector on 2 blocks); inline edit; live-re-verify site-header + site-header-row + site-footer-row at 375/1440 (CSS still applies, no visual change). **Acceptance:** same header content → same uid across two page loads (probe); scoped CSS still lands; 0 visual regression live. **/qc gate after:** yes.

## Task 2: `/doc-audit` — reconcile Spec 17 §S9 BUILT-notes against live code
**What:** the spec is materially stale: FR-S9-4 (adaptive-nav) is live but marked "not shipped"/no BUILT note; the D331 "all four FR-S9-8 bullets verified" is inaccurate (nav/CTA iconOnly were descoped/deferred, only contact ships + as `labelCollapse` not `showLabel`/`iconOnly`); FR-S9-9 says "Material's 3 scroll behaviours" but shipped 3 INDEPENDENT toggles; FR-S9-2's "still uses core/navigation" note is stale. **Why:** a sign-off on a spec that contradicts the code isn't honest. **Optimal fix:** run `/doc-audit` on §S9; add the FR-S9-4 BUILT note; rewrite the inaccurate acceptance claims to match what shipped; downgrade the ≥2-client claim per Task 3's result. **Orchestration:** `/doc-audit` + inline edits. **Acceptance:** every §S9 FR's BUILT note matches live code; no "verified" claim the evidence doesn't support. **/qc gate after:** the handoff QC subagent.

## Task 3: 2nd-client universality — verify on palestine-lives.org (the Indus sandbox)
**What:** FR-S9-8/S9-10 claim ≥2-client universality but only sandybrown (Mama's) was verified live. Bean: use **palestine-lives.org** (the Indus sandbox dev domain; login `.claude/secrets/palestine-lives.env`). **Why:** makes R-31-9 real, not "by-construction". **Optimal fix:** `python plugins/sgs-blocks/scripts/build-deploy.py --target palestine-lives` (explicit opt-in), set its Site Info, verify the header/footer render correctly (adaptive-nav, business-info from its OWN store, no overflow, 0 console errors) at 375/1440. **Orchestration:** deploy + Playwright live-verify. **Acceptance:** header+footer render correctly on palestine-lives with its own Site Info; update FR-S9-8/S9-10 notes to "verified on 2 live clients". **/qc gate after:** yes (/visual-qa).

## Task 4: shared `SGS_Container_Wrapper` golden test (maintainability, before the clone pipeline)
**What:** the wrapper is ~1,671 lines with 28 dependent blocks and ZERO tests. **Why:** a regression dark-ships across the whole block library — including the header/footer about to be cloned. **Optimal fix:** add `tests/php/ContainerWrapperTest.php` — render each KIND (section/layout/content) against a fixture attribute set, assert byte-stable output + the uid-stability invariant (after Task 1 makes it deterministic). **Orchestration:** 1 Sonnet subagent to write the test from the wrapper's public contract; you verify it runs (note: PHPUnit may not be runnable in-env — hand-trace or stand up vendor/). **Acceptance:** a golden test exists + passes (or is hand-traced) for all 3 KINDs. **/qc gate after:** no (it IS the gate).

## Task 5: adaptive-nav mega-menu — reconcile spec (drill-down) vs code (accordion)
**What:** FR-S9-4 requires mobile mega-menu "drill-down + back-link"; the shipped renderer uses an accordion. **Why:** spec-vs-code mismatch flagged by 2 council personas. **Optimal fix:** DECIDE with Bean — accept accordion (update the FR-S9-4 acceptance criterion to "accordion") OR build the drill-down + back-link. Accordion is itself accessible, so accepting it is legitimate. **Orchestration:** `/brainstorming` the decision with Bean; then either a doc edit or a build. **Acceptance:** spec and code agree. **/qc gate after:** if built, yes.

## Roadmap (NOT §S9-sign-off blockers — Bean's call to schedule)
- Slim-bar as a ONE-CLICK header pattern in the Replace picker (so a client doesn't hand-assemble it).
- A single "Move to mobile drawer" toggle (replaces the place-copy-then-hide two-step).
- Kadence-parity gaps: mega-menu demo in the default, language switcher, WooCommerce account/wishlist header element, a header/footer preset library, a Basic/Advanced control split on mobile-nav.
- Behaviour-bridge: transient-cache the resolved behaviour (kill the per-request `parse_blocks`) + an admin notice when a header behaviour is set but no `sgs/site-header` is found (Cynic M5).
- Object-attr coercion structural gate before FR-S9-11's walker (Cynic M4).

## Dependency graph
```
Task 1 (uid, /qc-council) ── careful; live-re-verify 3 blocks
Task 3 (palestine-lives 2nd-client) ── parallel with Task 1
  ↓
Task 2 (/doc-audit reconcile — consumes Task 3's result)
Task 4 (wrapper golden test — parallel, after Task 1's determinism)
Task 5 (mega-menu reconcile — /brainstorming decision)
  ↓
Present FR-S9-1..11 audit → BEAN "§S9 totally covered" SIGN-OFF (HARD gate)
  ↓
Spec 33 Part 2 (header/footer clone pipeline — ASAP)
  ↓
Commit + push per milestone (path-scoped; verify D-ceiling + branch = main)
```

## Methodology guardrails (do not skip)
- **Fact-check every council/register finding on the LIVE code/DOM before fixing (STOP-COUNCIL-FIX-SHAPES-ARE-HYPOTHESES).**
- **Deploy before measure (STOP-21 + STOP-CDN-NEW-CSS-RULE)** — build + deploy + OPcache + LiteSpeed + Hostinger CDN clear BEFORE any live measure; bump the version for a new CSS rule.
- **Root cause before instance fix** — Task 1 especially: prove the uid mechanism on a server probe (render_block with the CSS collector removed) before changing the selector.
- **/qc-council the Task-1 uid fix BEFORE dispatch** (sensitive scoped-CSS selector on 2 blocks).
- **Outcome vs completion** — §S9 "sign-off ready" = all 5 tasks done + live-verified + the spec reconciled + the 2nd client live; not "code shipped".

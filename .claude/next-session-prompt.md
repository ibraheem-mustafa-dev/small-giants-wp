---
doc_type: next-session-prompt
project: small-giants-wp
generated: 2026-07-14
thread: CLOSE FR-S9-6 (re-save + box props) → CONFIRM every Spec 17 §S9 FR (FR-S9-1..11) totally covered → THEN start Spec 33 Part 2 (header/footer CLONE pipeline)
---

# NEXT SESSION — finish §S9, confirm ALL of Spec 17 covered, then Spec 33 Part 2

You are the SGS WordPress block + frontend developer. The FR-S9-6 `{desktop,tablet,mobile}` responsive-override engine is BUILT, wired to all 3 §S9 row/nav blocks (`sgs/site-header-row`, `sgs/site-footer-row`, `sgs/adaptive-nav`), and PROVEN LIVE (D327). Invoke `/autopilot` first.

Read `.claude/handoff.md` + `CLAUDE.md` + `.claude/plans/go-rippling-cascade.md` for full context, then work the priorities.

## ⛔ BEAN'S DIRECTIVE — the arc for this thread (2026-07-14)
1. Finish the header/footer/nav BUILD (Tasks 1-3: close FR-S9-6 + box props).
2. **CONFIRM every point in Spec 17 is TOTALLY covered** (Task 4) — audit FR-S9-1 through FR-S9-11 one by one; build the still-open ones (per-device adaptation FR-S9-8, sticky/transparent-on-scroll FR-S9-9, global-defaults+Site-Info FR-S9-10, CPT template swap + DB reseed FR-S9-11). Spec 17 is NOT "covered" until every §S9 FR is built + live-verified.
3. **ONLY THEN start Spec 33 PART 2** (Task 5) — the header/footer CLONE pipeline (`P-CLONE-PIPELINE-HEADER-FOOTER-HANDLER` = Spec 17 P5): the `/sgs-clone` walker extracts a draft's header/footer once per site and emits to `sgs/site-header`/`sgs/site-footer`/`sgs/adaptive-nav` named slots by BEM role. Do NOT start Part 2 until Task 4 confirms Spec 17 is fully covered.

## Why this next
D327 built the engine + wrapper opt-in branch + editor + wired all 3 blocks (gap everywhere + footer grid), proven live. Two things remain to fully land FR-S9-6: (1) the footer/nav live instances render via the graceful LEGACY path (identical output) until re-saved to the object shape; (2) the box props (padding/margin) + nav `linkFontSize` aren't on the object model yet (the engine + wrapper already support box props — route to the outer, box-aware). Beyond FR-S9-6, several §S9 FRs remain unbuilt (FR-S9-8/9/10/11) — Spec 17 is not "totally covered" until they land, which is the gate before Spec 33 Part 2.

## ⛔ MANDATORY READING GATE (read IN FULL before any Write/Edit)
1. `.claude/handoff.md` (D327 record) + `.claude/decisions.md` D327.
2. `.claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md` §S9 FR-S9-6 IN FULL + Spec 17 end-to-end (Bean-locked: read the governing spec fully each session).
3. `.claude/plans/go-rippling-cascade.md` — the engine + wrapper execution spec + council-validated mechanics + DEFERRED list.
4. `plugins/sgs-blocks/includes/{class-sgs-breakpoints.php,helpers-responsive.php}` + `class-sgs-container-wrapper.php` (the `$object_model`/`$object_grid` branch) + `src/components/ResponsiveOverride.js`.
5. **For Task 4-5 (Spec 17 completion + Spec 33 Part 2):** Spec 17 §S9 FR-S9-8/9/10/11 IN FULL + `.claude/specs/33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md` (Part-2 note + FR-33-13) + `.claude/plans/2026-07-13-header-footer-nav-system-design-gate.md` (§4b consumer link, §15 Q1 tokenise-vs-Customiser Part-2 decision) + `.claude/parking.md` → `P-CLONE-PIPELINE-HEADER-FOOTER-HANDLER` (Part-2 build input) + `P-ADAPTIVE-NAV-P2B` (remaining nav polish).

## ⛔ ANTI-PATTERN STOPs (carried forward — NEVER subtract, D101)
- **STOP-NO-KSORT (D326/D327)** — the shared-wrapper uid = `md5(wp_json_encode($attributes))`; NEVER `ksort`/reorder the hash input. Object-model key order is a WRITE-TIME guarantee (`makeResponsive` + block.json default order). Verify existing blocks' uids unchanged after any wrapper edit.
- **STOP-WRAPPER-OWNED-VS-BLOCK-OWNED (D327, NEW)** — a WRAPPER capability (row flex gap/width/padding) is emitted BY the wrapper via `responsive_model=object`; a block's OWN internal element (nav `<ul>`) uses the shared `sgs_emit_responsive_css()` directly in its render.php. Don't route a block-owned element through the wrapper flag (double-emit) or a wrapper capability block-private (fork — qc-council NON-COMPLIANT).
- **STOP-CONTAINER-TYPE-SELF-QUERY (D327, NEW)** — an element cannot size-`@container` itself. container-type goes on the OUTER; the styled flex/grid + tier rules go on a DESCENDANT (`.sgs-container__inner`). Verify live that the block adapts nested-narrow, not just at viewport.
- **STOP-GRACEFUL-MIGRATION (D327, NEW)** — flipping `responsive_model=object` must NOT break a flat-stored instance. The `$object_grid` gate + `is_array` gap guard + emitter `normalise_object` handle it; verify a NON-re-saved instance still renders before/after any wrapper change.
- **STOP-21** — emit-green ≠ LANDED. LANDED = deploy + OPcache + `wp litespeed-purge all` + Hostinger `hosting_clearWebsiteCacheV1` (CDN) + live computed-value. The whole feature was confirmed live only after this sequence.
- **STOP-CSS-VER-CACHE-BUST (D310/D316/D322)** — a `style.css`/theme-CSS-only change is stale unless `theme/sgs-theme/style.css` Version bumps; a block CSS change bumps that `block.json` version (render-side scoped `<style>` lands fresh).
- **STOP-static-vs-live (D304/D305)** — for "does this rule apply / what renders?" use the LIVE DOM (Playwright computed-style), never static PHP/CSS parsing.
- **STOP-67** — a changed BLOCK needs a pre-commit visual-diff report at `reports/visual-diff/<block>-<date>.md` (`verdict: PASS` + `first_paint_capture_passed: true`). The commit gate enforces it.
- **STOP-16** — a subagent / "it works" / build-green is a HYPOTHESIS. Re-verify live yourself. Node/npm via PowerShell (nvm shim broken in Git Bash).
- **STOP-WINDOWS-BASH-STALE** — Git Bash `git add` has a stale view of Write-tool-created files; stage + commit via PowerShell (Windows = ground truth).
- **STOP-PARALLEL-TRACK-SWEEP (D326)** — commit path-scoped + promptly; verify D-ceiling + branch before every commit.
- **Composite-mirror (R-31-9 / D294)** — no divergent per-block styling path; no inline `style=""` (Spec 32); no block version bumps as deprecations (D270/D293).

## ⛔ PRE-FLIGHT SELF-ATTESTATION (answer before first Write/Edit)
1. Have I read Spec 17 §S9 FR-S9-6 IN FULL + the plan this session?
2. For the prop I'm migrating — is it a WRAPPER capability (→ flag) or a block's OWN element (→ shared emitter direct)?
3. Will I verify on the LIVE DOM after the full cache-clear sequence (STOP-21), not on build-green?
4. Have I verified the D-ceiling (`grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1`) + branch = `main` before committing?

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | ALWAYS — box-object editor UX design decisions |
| `/gap-analysis` | ALWAYS — grade the migration vs FR-S9-6 acceptance |
| `/lifecycle` | ALWAYS — before any skill/agent change |
| `/research` | ALWAYS — WP BoxControl responsive patterns if needed |
| `/strategic-plan` | ALWAYS — order the box-prop migration + re-save |
| `/qc-council` | validate any further shared-wrapper change before dispatch (blub.db 255) |
| `/sgs-wp-engine` + `/sgs-update` | SGS block dev + DB re-register |
| `/qc` · `/visual-qa` · `/a11y-audit` | live breakpoint + device-switcher keyboard verification |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| Playwright MCP (`browser_navigate`/`browser_evaluate`/`browser_resize`) | live per-tier computed-value verification (used all D327) |
| Hostinger MCP `hosting_clearWebsiteCacheV1` | CDN clear (user `u945238940`, domain `sandybrown-nightingale-600381.hostingersite.com`) + `wp litespeed-purge all` + OPcache before any live measure |
| `/wp-blocks` + `/sgs-db` | schema/DB ground truth before any "missing X" claim |

## Agents to Delegate To
| Agent | When |
|-------|------|
| general-purpose (Sonnet) | box-editor component + per-block box-prop wiring (re-verify live yourself, STOP-16) |
| `wp-sgs-developer` | heavy shared-wrapper/engine work (if registered) |
| `feature-dev:code-reviewer` (or /qc-council raters) | review any shared-wrapper change before commit |

## Task 1: Close the migration — re-save footer + nav instances
**What:** open the header + footer template parts in the Site Editor, re-save the `sgs/site-footer-row` + `sgs/adaptive-nav` instances so they carry the object-model defaults, then live-confirm they render via the object path (not legacy).
**Why:** the graceful gate means they currently render via legacy (identical output); re-saving completes the FR-S9-6 migration.
**Estimated time:** ~10 min.
**Orchestration:** inline (main) via Playwright editor login (canary creds `.claude/secrets/sandybrown.env`); re-verify live per tier.
**Acceptance:** footer/nav instances store `{desktop,...}` object attrs; live per-tier values unchanged (footer 3→1, gap 48→32; nav 28px); uid stable on re-save.
**/qc gate after:** yes — live per-tier verify.

## Task 2: Migrate the box props (padding/margin) + nav linkFontSize
**What:** extend the object model to padding/margin on all 3 blocks (the wrapper object-emit already routes box props to the outer, box-aware) + adaptive-nav `linkFontSize` via the shared emitter; replace the orphan flat tier attrs + `ResponsiveSpacingPanel` with a `ResponsiveOverride` + BoxControl.
**Why:** completes FR-S9-6 "every property overridable per breakpoint" for these blocks.
**Estimated time:** ~30 min.
**Orchestration:** `/brainstorming` the box-editor UX first; inline or 1 Sonnet subagent per block; re-verify each live.
**Acceptance:** padding/margin object model live-verified per tier + per-side inheritance; no dead controls; no regression.
**Depends on:** Task 1. **/qc gate after:** yes — `/qc` + `/visual-qa` + `/a11y-audit`.

## Task 3: DB re-register + full gate pass
**What:** `/sgs-update` to re-register the changed attrs; `/qc` + `/a11y-audit` across all 3 blocks incl. the editor device-switcher (keyboard tablist traversal + inherited-indicator aria-label + reset-to-inherited).
**Why:** FR-S9-6 editor-UX acceptance + DB ground-truth.
**Estimated time:** ~15 min.
**Acceptance:** `/sgs-db` shows updated attrs; a11y clean; device-switcher keyboard-operable.
**Depends on:** Task 2.

## Task 4: CONFIRM every point in Spec 17 is TOTALLY covered (Bean's gate before Part 2)
**What:** audit Spec 17 §S9 FR-S9-1 through FR-S9-11 against the LIVE build, one FR at a time, and BUILD the still-open ones. Known-open (verify + build): **FR-S9-8** per-device content adaptation (per-tier visibility toggle, `showLabel`/`iconOnly`, move-to-drawer, Indus reference pattern); **FR-S9-9** sticky + transparent-at-rest→solid-on-scroll no-code toggle (extends the existing `class-sgs-header-behaviours.php` layer); **FR-S9-10** global style defaults + shared Site Info access across header AND footer (wire the existing FR-S4-1/2/3 infra, no new store); **FR-S9-11** CPT `template` swap for `sgs_footer` + DB reseed via `/sgs-update`. Already SHIPPED (confirm, don't rebuild): FR-S9-1/2/3/4/5/6/7.
**Why:** Bean-locked — Spec 17 is NOT "covered" until every §S9 FR is built + live-verified. This is the hard gate before Spec 33 Part 2.
**Estimated time:** multi-session (FR-S9-8/9/10 are each a real build). Scope each with `/strategic-plan` + `/phase-planner`; do NOT rush.
**Orchestration:** per-FR — `/brainstorming` design each, inline or subagent per FR, live-verify each (STOP-21). Map any deferral to a named FR (STOP-29), never "out of scope".
**Acceptance:** a written FR-by-FR coverage audit (FR-S9-1..11) where every FR is BUILT + LIVE-VERIFIED (report per FR), presented to Bean for the "totally covered" sign-off. **/qc gate after:** yes — per FR.
**Depends on:** Tasks 1-3.

## Task 5: START Spec 33 PART 2 — header/footer CLONE pipeline (ONLY after Task 4 sign-off)
**What:** the `/sgs-clone` header/footer handler (`P-CLONE-PIPELINE-HEADER-FOOTER-HANDLER`, = Spec 17 P5 / FR-S9-11 Part-2 plumbing): a pipeline stage that extracts a draft's header/footer markup ONCE per site (not per-page body content) and emits it to `wp_template_part` shape using the 3 new blocks — mapping draft header/footer rows onto `sgs/site-header`/`sgs/site-footer`/`sgs/adaptive-nav` named slots by BEM role (Spec 31 R-31-2/R-31-8); fewer draft rows than slots → log empty (R-31-4); more → log a gap candidate (never truncate). The new blocks default their colours/typography/spacing from the Spec 33 `theme-snapshot.json` (global-styles consumer, design-gate §4b).
**Why:** Spec 33 Part 1 (draft→theme global styles) is COMPLETE; Part 2 is the header/footer clone — the last piece of the cloning pipeline. Bean-sequenced AFTER Spec 17 is totally covered.
**Estimated time:** multi-session build (own `/strategic-plan` + `/phase-planner` + design-gate).
**Orchestration:** design-gate first (`/brainstorming` + the design-gate doc `.claude/plans/2026-07-13-header-footer-nav-system-design-gate.md` §15 Q1 tokenise-vs-Customiser is an open Part-2 decision); build via `/sgs-clone` + `/sgs-wp-engine`; live-verify on a real draft clone.
**Acceptance:** a draft's header/footer clones to the 3 named blocks faithfully on a real site (not page-body content); idempotent re-clone; per Spec 17 FR-S9-11 + Spec 33 Part-2 scope.
**Depends on:** Task 4 sign-off (HARD — do NOT start before Spec 17 is confirmed totally covered).

## Dependency graph
```
Task 1 (inline, re-save + live verify)
  ↓
Task 2 (box props — /brainstorming UX → per-block, verify each live)
  ↓ /qc + /visual-qa + /a11y-audit
Task 3 (/sgs-update + full gate pass)
  ↓
Task 4 (Spec 17 FR-S9-1..11 coverage audit + build the open FRs — BEAN SIGN-OFF GATE)
  ↓  (only after "Spec 17 totally covered" sign-off)
Task 5 (Spec 33 Part 2 — header/footer clone pipeline)
  ↓
Commit + push per milestone (path-scoped; verify D-ceiling + branch = main)
```

## Methodology guardrails (do not skip)
- **Deploy before measure (STOP-21)** — build + deploy + OPcache + LiteSpeed + CDN clear BEFORE any live measure.
- **Root cause before instance fix** — for a rendering miss, prove the cause on the LIVE DOM / a real render trace first.
- **Outcome vs completion** — the outcome is all 3 blocks on the FULL object model (incl. box props), live-verified per tier; engine-built ≠ done.
- **/qc-council any shared-wrapper change BEFORE dispatch.** Never ksort the uid. Verify graceful migration (flat-stored instance still renders).

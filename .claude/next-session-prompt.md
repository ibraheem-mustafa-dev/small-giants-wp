---
doc_type: next-session-prompt
project: small-giants-wp
generated: 2026-07-14
thread: CLOSE the FR-S9-6 migration (re-save footer/nav instances) + extend the object model to the box props (padding/margin) + nav linkFontSize
---

# NEXT SESSION — close the FR-S9-6 migration + extend to box props

You are the SGS WordPress block + frontend developer. The FR-S9-6 `{desktop,tablet,mobile}` responsive-override engine is BUILT, wired to all 3 §S9 row/nav blocks (`sgs/site-header-row`, `sgs/site-footer-row`, `sgs/adaptive-nav`), and PROVEN LIVE (D327). This session closes the migration (re-save the live instances) and extends the object model to the box props. Invoke `/autopilot` first.

Read `.claude/handoff.md` + `CLAUDE.md` + `.claude/plans/go-rippling-cascade.md` for full context, then work the priorities.

## Why this next
D327 built the engine + wrapper opt-in branch + editor + wired all 3 blocks (gap everywhere + footer grid), proven live. Two things remain to fully land FR-S9-6: (1) the footer/nav live instances render via the graceful LEGACY path (identical output) until re-saved to the object shape; (2) the box props (padding/margin) + nav `linkFontSize` aren't on the object model yet (the engine + wrapper already support box props — route to the outer, box-aware).

## ⛔ MANDATORY READING GATE (read IN FULL before any Write/Edit)
1. `.claude/handoff.md` (D327 record) + `.claude/decisions.md` D327.
2. `.claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md` §S9 FR-S9-6 IN FULL + Spec 17 end-to-end (Bean-locked: read the governing spec fully each session).
3. `.claude/plans/go-rippling-cascade.md` — the engine + wrapper execution spec + council-validated mechanics + DEFERRED list.
4. `plugins/sgs-blocks/includes/{class-sgs-breakpoints.php,helpers-responsive.php}` + `class-sgs-container-wrapper.php` (the `$object_model`/`$object_grid` branch) + `src/components/ResponsiveOverride.js`.

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

## Dependency graph
```
Task 1 (inline, re-save + live verify)
  ↓
Task 2 (box props — /brainstorming UX → per-block, verify each live)
  ↓ /qc + /visual-qa + /a11y-audit
Task 3 (/sgs-update + full gate pass)
  ↓
Commit + push (path-scoped; verify D-ceiling + branch = main)
```

## Methodology guardrails (do not skip)
- **Deploy before measure (STOP-21)** — build + deploy + OPcache + LiteSpeed + CDN clear BEFORE any live measure.
- **Root cause before instance fix** — for a rendering miss, prove the cause on the LIVE DOM / a real render trace first.
- **Outcome vs completion** — the outcome is all 3 blocks on the FULL object model (incl. box props), live-verified per tier; engine-built ≠ done.
- **/qc-council any shared-wrapper change BEFORE dispatch.** Never ksort the uid. Verify graceful migration (flat-stored instance still renders).

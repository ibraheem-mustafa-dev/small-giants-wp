---
doc_type: handoff
project: small-giants-wp
generated: 2026-07-12
session: D312 — P-STYLE-TAG-CONSOLIDATION shipped (render_block chokepoint + unified head output buffer + file/head modes + settings page); generate-then-serve reproduced failing under LiteSpeed then replaced
---

# Session Handoff — 2026-07-12

## Completed This Session
1. **Spec 32 → v1.2 (FR-32-11 + §6.2)** — encoded the CSS-consolidation contract as source of truth BEFORE any code (Bean-directed). Commit `9dfcaa6e`.
2. **`/qc-council` (3 cross-model raters) = GO-WITH-FIXES** — caught the editor-parity predicate bug (`!is_admin()` is false during REST → would unstyle 8 ServerSideRender blocks), the 6 emit-shapes, and predicted the LiteSpeed-freeze. Corrections folded into design + spec.
3. **Collector built as a single `render_block` chokepoint** (`includes/class-sgs-css-registry.php`) — lifts every `sgs/*` block's `<style>` from rendered HTML into one buffer (dedup by content hash, D303 residual order preserved). Dissolves the 6-shapes risk; touches no per-block render.php. Commit `72c0387a`.
4. **Delivery = ONE output buffer** injecting into `<head>` every render (self-consistent under caching). **Two operator modes** (`sgs_css_output_mode`, default `file`): `file` = cached content-hashed external `<link>` (immutable cache header, atomic write, epoch invalidation + LiteSpeed purge + GC); `head` = inline `<style>` (draft's model, self-contained). Commit `c30dd5e2`.
5. **Settings page** (`includes/class-css-output-settings.php`, SGS → CSS Output) — mode choice + recommended-optimisation-plugin table (LiteSpeed/Autoptimize/WP Rocket/Perfmatters + exact setting). Renders live.
6. **Bean-directed test: installed LiteSpeed Cache on the canary.** First VERIFIED no cache plugin was installed. Then reproduced the generate-then-serve model FAILING live under LiteSpeed page cache (froze cold inline) → replaced with the unified buffer. File mode now stable under LiteSpeed.
7. **Both modes LANDED + live-verified** (sandybrown page 8): 1 head style/link, 0 body `<style>`, correct cascade + computed values 375/768/1440, D303 intact, editor parity (block-renderer REST keeps inline), 0 console errors.
8. **Docs:** D312 logged; P-STYLE-TAG-CONSOLIDATION moved parking → archive (CLOSED); memory lesson `test-with-actual-cache-layer-and-self-consistent-render` captured. Commit `c85bb91c`.

## Current State
- **Branch:** `main` at `c85bb91c` (all pushed)
- **Tests:** converter unit suite unaffected (render-side PHP only — no converter/JS change); conformance goldens unchanged (15 pre-existing red, 0 new)
- **Build:** n/a this session (no JS/CSS `src/` change; PHP-only deploy via `build-deploy.py --skip-build`)
- **Uncommitted changes:** none from this session (pre-existing untracked `sgs-framework.db` + `phase4-*.txt` dirt is not this session's)
- **Live:** sandybrown page 8 = file mode (default), external `<link>` consolidated CSS; **LiteSpeed Cache now installed + active** on the canary (page cache)

## Known Issues / Blockers
- LiteSpeed Cache is now active on sandybrown (installed to test file mode). Its CSS async/critical-CSS optimisation (QUIC.cloud) is NOT configured — optional, per the settings-page guidance. If it ever misbehaves, `wp plugin deactivate litespeed-cache`.
- None blocking the next session.

## Next Priorities (in order)
1. **`P-PATTERNS-USE-CORE-BLOCKS`** — SGS theme patterns/parts use core `wp:heading`/`wp:paragraph` (which inline WP supports) instead of `sgs/*` blocks; a dedicated pattern-modernisation session.
2. **`P-DRAFT-TOKEN-EXTRACTION-SETUP-PIPELINE`** — the header/footer setup pipeline that mechanically extracts the draft's base tokens into theme.json (ends snapshot drift).
3. **`P-PAGE8-DISCREPANCY-REGISTER` (PARTIAL)** — 9 remaining page-8 fidelity fixes (`.claude/reports/2026-07-11-page8-discrepancy-diagnosis.md`).

## Files Modified
| File path | What changed |
|---|---|
| plugins/sgs-blocks/includes/class-sgs-css-registry.php | NEW — collector chokepoint + unified head output buffer + file/head modes + epoch/GC/atomic-write |
| plugins/sgs-blocks/includes/class-css-output-settings.php | NEW — SGS → CSS Output settings page + plugin guidance |
| plugins/sgs-blocks/sgs-blocks.php | require the registry + settings class; register the settings page |
| .claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md | v1.2 — FR-32-11 + §6.2 (final shipped architecture) |
| .claude/plans/2026-07-12-style-tag-consolidation-design.md | NEW — design + research trail + BUILT note |
| .claude/{decisions.md,parking.md} + memory/parking-archive.md | D312; P-STYLE-TAG-CONSOLIDATION archived |
| reports/visual-diff/css-consolidation-2026-07-12.md + 2 jpeg | LANDED evidence + settings-page screenshot |

## Notes for Next Session
- **The generate-then-serve external-CSS model does NOT survive a full-page cache** — reproduced live under LiteSpeed (froze the cold inline response). The shipped fix makes EVERY render self-consistent (output buffer injects into head each render), so the cached HTML always carries the correct link/style. Memory: `test-with-actual-cache-layer-and-self-consistent-render`.
- **Verify what's actually installed before recommending a solution that leans on it** — I recommended "let LiteSpeed optimise the file" before checking; no LiteSpeed plugin was installed. Bean: "research first, no guessing."
- **CSS delivery is now operator-selectable** — `file` (default, needs an optimisation plugin for best CWV) vs `head` (self-contained). Settings page documents when each is optimal. The `sgs_css_output_mode` filter also overrides.
- Editor parity predicate is `!is_admin() && !wp_is_serving_rest_request()` — do not simplify to `!is_admin()` (breaks ServerSideRender editor previews).

## Next Session Prompt

~~~
You are the SGS cloning-pipeline / framework developer. The per-block `<style>`-tag consolidation (P-STYLE-TAG-CONSOLIDATION / D312) is COMPLETE + LANDED. The next fronts are the remaining parked architectural items. Invoke `/autopilot` first.

Read `.claude/handoff.md` + `.claude/CLAUDE.md` for full context, then pick a priority with Bean.

## ⛔ MANDATORY READING GATE (read IN FULL before any Write/Edit)
1. `.claude/handoff.md` (this session) + `.claude/decisions.md` head (D312, D311, D310).
2. **Spec 31 IN FULL** (Bean-locked every session) — §3.A CSS routing, §13.4 FR-31-5.2, §13.6 composite-mirror + D294, FR-31-22 box-object, §7b, the cheat catalogue.
3. **Spec 32 §6.1 + §6.2** (styling contract + the CSS-consolidation FR-32-11, shipped this session).
4. `.claude/parking.md` head — `P-PATTERNS-USE-CORE-BLOCKS`, `P-DRAFT-TOKEN-EXTRACTION-SETUP-PIPELINE`, `P-PAGE8-DISCREPANCY-REGISTER`.

## ⛔ ANTI-PATTERN STOPs (carried forward + this session's — NEVER subtract, D101)
- **STOP-VERIFY-CACHE-LAYER-INSTALLED (NEW, D312)** — before recommending or building anything that leans on a cache/CDN optimiser, VERIFY it is actually installed/active (`wp plugin list`, response headers) — don't assume from the host. No LiteSpeed Cache plugin was installed when I recommended leaning on it.
- **STOP-SELF-CONSISTENT-RENDER-UNDER-CACHE (NEW, D312)** — a delivery whose correctness needs a "warm up" across requests (generate-then-serve) is FROZEN by a full-page cache (reproduced live under LiteSpeed). Prefer a design where EVERY render is self-consistent (e.g. output-buffer inject) so any cached render is correct. Test WITH the cache layer installed, not on a bare stack.
- **STOP-STYLE-TAG-IS-NOT-STYLE-ATTR (D311)** — a `<style>` TAG is NOT an inline `style="…"` ATTRIBUTE; Spec 32 §6.1(b) sanctions the block's own scoped `<style>`. When judging inline-styling, check BOTH the `style=` attributes AND the `<style>` tag count/placement.
- **STOP-GOLDEN-CAN-BE-STALE (D311)** — a committed conformance golden can be STALE; prove a converter emit claim with a real-node trace of the CURRENT converter, not by reading a golden. A render-side-only change can't newly break a golden.
- **STOP-VERIFY-COLOUR-HOVER-AND-VS-DRAFT (D310)** — verifying a cloned button/label/CTA colour = measure REST **and** HOVER (`.hover()`) vs the DRAFT's exact rule, never resting-contrast-only. A composite's own `style.css .block .sgs-x--y` (0,2,0) overrides the shared channel.
- **STOP-CSS-VER-CACHE-BUST (D310)** — a `style.css`-ONLY change is served STALE (block stylesheet `?ver` pinned to block.json version) → bump the version. Render-side inline `<style>` / output-buffer changes land fresh.
- **STOP-PARITY-NOT-A-MEASURE (D309)** — the computed-parity % is NOT a fidelity measure; NEVER cite the aggregate number. Signal = direct per-element computed-style matched by CONTENT + Bean's eye.
- **STOP-STANDARDISE-NAMING-FIRST (D309)** — standardise a naming convention across the ecosystem FIRST, then build the mechanism; recognise capability by whether the block DECLARES the attr, never a name-guess.
- **STOP-REGISTER-MECHANISMS-UNRELIABLE** — a pre-diagnosed register lists SYMPTOMS but its CAUSES are often wrong. Prove each cause on the live DOM OR a real-node converter trace FIRST.
- **STOP-CDN-STALE-CACHE** — a block CSS change at an UNCHANGED `?ver` serves stale; always `hosting_clearWebsiteCacheV1` + OPcache (+ `wp litespeed-purge all` now LiteSpeed is active) before any live CSS measure.
- **STOP-16** — a subagent/"it works"/build-green is a HYPOTHESIS. Re-run yourself: `cd plugins/sgs-blocks/scripts && python -m pytest converter/tests -q --import-mode=importlib`; `npm run build` (PowerShell — nvm shim broken in Git Bash).
- **STOP-21** — emit-green ≠ LANDED. LANDED = deploy/reclone + OPcache + CDN + LiteSpeed clear + live computed-style.
- **STOP-static-vs-live** — for "does this class/style land?" use the LIVE DOM, NEVER static PHP/CSS parsing.
- **STOP-34** — verify a converter fix on the REAL draft node, not a synthetic fixture.
- **STOP-D228** — a framework default overriding the draft's faithfully-ABSENT/present value is a CHEAT to REMOVE/GATE. Universal (R-31-9).
- **STOP-WP-CORE-SERIALISATION (D306)** — a schema-valid emitted `style.*` value can be DROPPED by WP-core if the property definition lacks `css_vars`. Emit a form WP serialises.
- **STOP-COLOUR-SLUG-VALIDATION (D308)** — never emit a bare `var()` capture as a colour slug without validating it exists in the theme palette.
- **STOP-VERIFY-CLAIM** — do NOT assert "X isn't recognised / lacks Z" from a failed grep. Verify against emitted markup / render code / live DOM first.
- **STOP-60** — a converter change adding attrs changes conformance goldens (reseed deliberately + cited). A render-side-only change does NOT change the emit.
- **STOP-44** — a schema-valid emitted attr can be a render no-op; verify the LIVE painted value.
- **STOP-48/49** — do NOT trust `computed-parity.js` numbers or leftover-buckets; IGNORE header/footer + the accepted testimonial static-grid→slider.
- **STOP-67** — pre-commit visual-diff report per CHANGED block at repo-ROOT `reports/visual-diff/<block>-<date>.md` (frontmatter `verdict: PASS` + `first_paint_capture_passed: true`).
- **safecss strips functional colours (D302)** — any INLINE colour VALUE must be hex/named/var; the scoped `<style>` channel is NOT filtered.
- **Path-scoped commits** — `git commit -F <msgfile> -- <paths>` (message FILE). `git add <file>` for NEW files; never `git add -A`. No version bumps / deprecations pre-production (except a cache-bust bump per STOP-CSS-VER-CACHE-BUST). No co-author line. Verify branch + D-ceiling before commit.
- **DB seed not in git** — a new block.json attr / `property_suffixes` row needs `/sgs-update --stage 1` (or a dated `migrations/*.py`) to reach the DB.
- **One writer per file** — parallel coding subagents only across DISJOINT files; a SOLO coding subagent (foreground, named files, main-verified) is optimal for a coupled surface.
- **Re-clone command:** `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup "sites/mamas-munches/mockups/homepage/index.html" --auto-section --client mamas-munches --page homepage --media-map sites/mamas-munches/research/sandybrown-media-map.json --deploy-target page:8`. Deploy plugin (PHP-only) if render/CSS changed: `python plugins/sgs-blocks/scripts/build-deploy.py --skip-build --allow-dirty`.

## Skills to Invoke
| Skill | When |
|---|---|
| `/brainstorming` | design any pattern-modernisation / token-extraction architecture before building |
| `/gap-analysis` | grade before delivery |
| `/lifecycle` | any skill/agent/pipeline change |
| `/research` | gold-standard reference before non-trivial design (Bean: research first, no guessing) |
| `/strategic-plan` | order a multi-file rollout |
| `/systematic-debugging` | prove any cause on the live DOM / real node before fixing |
| `/qc-council` | any shared-surface / converter / pipeline change before dispatch (blub.db 255) |
| `/qc-inline` | per-change QC (Spec 31/32 compliance + no cheats + universal) |
| `/sgs-clone` `/sgs-db` `/wp-blocks` | ground truth (block schema, box_family, css_property, presets) |
| `/handoff` `/capture-lesson` | session close |

## MCP Servers & Tools
| Tool | For |
|---|---|
| Playwright / chrome-devtools MCP | live computed-style + `<style>`/`<link>` enumeration + matched-rule inspection (THE landed gate) |
| Hostinger MCP `hosting_clearWebsiteCacheV1` | CDN clear before any live CSS measure (user u945238940) — plus `wp litespeed-purge all` (LiteSpeed now active) |
| REST app-pwd `.claude/secrets/sandybrown.env` | user `Claude`; pass creds inline (env has unquoted specials — don't `source`) |
| `/library-docs` | up-to-date WP / library docs |

## Agents to Delegate To
| Agent | When |
|---|---|
| general-purpose (Sonnet) | solo coding subagent (one writer, named files) + read-only traces/raters (parallel) |
| feature-dev:code-reviewer | pre-commit cross-model review on any shared render-helper change |

## Task 1 — pick with Bean: `P-PATTERNS-USE-CORE-BLOCKS` OR `P-DRAFT-TOKEN-EXTRACTION-SETUP-PIPELINE` OR the page-8 residuals
**What:** each is its own dedicated session (see parking.md heads). Do NOT start without Bean selecting one.
**Acceptance:** N/A until Bean picks.

## Methodology guardrails (do not skip)
- Read the governing spec IN FULL. Prove the cause on the LIVE DOM / real node before building. NEVER cite computed-parity % as a measure.
- Verify a cache/optimiser is actually installed before leaning on it (STOP-VERIFY-CACHE-LAYER-INSTALLED). Test caching behaviour WITH the cache layer present (STOP-SELF-CONSISTENT-RENDER-UNDER-CACHE).
- Design-gate + `/qc-council` on shared-surface changes before building (blub.db 255). Every fix universal (R-31-9), no cheat. Verify the LIVE painted value (STOP-44). Bean's eye co-authoritative (R-31-13).
- Branch appropriately (core SGS = `main`); path-scoped commits (message FILE); no co-author line. `/qc-inline` per change; end with `/handoff`.
- **Deploy before measure** — build + deploy + OPcache + CDN clear + `wp litespeed-purge all` before any live measurement (STOP-21/CDN).
~~~

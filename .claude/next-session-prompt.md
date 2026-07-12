---
doc_type: next-session-prompt
project: small-giants-wp
generated: 2026-07-12
thread: post-D312 — P-STYLE-TAG-CONSOLIDATION shipped; next front = parked architectural items
---

# NEXT SESSION — pick a parked front (pattern-modernisation / token-extraction / page-8 residuals)

You are the SGS cloning-pipeline / framework developer. The per-block `<style>`-tag consolidation (P-STYLE-TAG-CONSOLIDATION / D312) is COMPLETE + LANDED — the ~100 body `<style>` tags collapse into ONE head stylesheet (operator-selectable `file`/`head` via SGS → CSS Output). Invoke `/autopilot` first.

Read `.claude/handoff.md` + `.claude/CLAUDE.md` for full context, then pick a priority with Bean.

## ⛔ MANDATORY READING GATE (read IN FULL before any Write/Edit)
1. `.claude/handoff.md` (D312) + `.claude/decisions.md` head (D312, D311, D310).
2. **Spec 31 IN FULL** (Bean-locked every session) — §3.A CSS routing, §13.4 FR-31-5.2, §13.6 composite-mirror + D294, FR-31-22 box-object, §7b, the cheat catalogue.
3. **Spec 32 §6.1 + §6.2** (styling contract + the CSS-consolidation FR-32-11 shipped this session).
4. `.claude/parking.md` head — `P-PATTERNS-USE-CORE-BLOCKS`, `P-DRAFT-TOKEN-EXTRACTION-SETUP-PIPELINE`, `P-PAGE8-DISCREPANCY-REGISTER`.

## ⛔ ANTI-PATTERN STOPs (carried forward + this session's — NEVER subtract, D101)
- **STOP-VERIFY-CACHE-LAYER-INSTALLED (NEW, D312)** — before recommending or building anything that leans on a cache/CDN optimiser, VERIFY it is actually installed/active (`wp plugin list`, response headers) — don't assume from the host. No LiteSpeed Cache plugin was installed when I recommended leaning on it.
- **STOP-SELF-CONSISTENT-RENDER-UNDER-CACHE (NEW, D312)** — a delivery whose correctness needs a "warm up" across requests (generate-then-serve) is FROZEN by a full-page cache (reproduced live under LiteSpeed). Prefer a design where EVERY render is self-consistent (e.g. output-buffer inject) so any cached render is correct. Test WITH the cache layer installed.
- **STOP-STYLE-TAG-IS-NOT-STYLE-ATTR (D311)** — a `<style>` TAG is NOT an inline `style="…"` ATTRIBUTE; Spec 32 §6.1(b) sanctions the block's own scoped `<style>`. Check BOTH `style=` attributes AND `<style>` tag count/placement.
- **STOP-GOLDEN-CAN-BE-STALE (D311)** — a committed conformance golden can be STALE; prove a converter emit claim with a real-node trace of the CURRENT converter, not by reading a golden. A render-side-only change can't newly break a golden.
- **STOP-VERIFY-COLOUR-HOVER-AND-VS-DRAFT (D310)** — verifying a cloned colour = measure REST **and** HOVER (`.hover()`) vs the DRAFT's exact rule, never resting-contrast-only. A composite's own `style.css .block .sgs-x--y` (0,2,0) overrides the shared channel.
- **STOP-CSS-VER-CACHE-BUST (D310)** — a `style.css`-ONLY change is served STALE (`?ver` pinned to block.json version) → bump the version. Render-side inline/output-buffer changes land fresh.
- **STOP-PARITY-NOT-A-MEASURE (D309)** — computed-parity % is NOT a fidelity measure; NEVER cite the aggregate number. Signal = per-element computed-style matched by CONTENT + Bean's eye.
- **STOP-STANDARDISE-NAMING-FIRST (D309)** — standardise a naming convention across the ecosystem FIRST, then build; recognise capability by whether the block DECLARES the attr, never a name-guess.
- **STOP-REGISTER-MECHANISMS-UNRELIABLE** — a pre-diagnosed register lists SYMPTOMS but its CAUSES are often wrong. Prove each cause on the live DOM OR a real-node converter trace FIRST.
- **STOP-CDN-STALE-CACHE** — a block CSS change at an UNCHANGED `?ver` serves stale; always `hosting_clearWebsiteCacheV1` + OPcache + `wp litespeed-purge all` (LiteSpeed now active) before any live CSS measure.
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
- **Path-scoped commits** — `git commit -F <msgfile> -- <paths>` (message FILE). `git add <file>` for NEW files; never `git add -A`. No version bumps / deprecations pre-production (except a cache-bust bump). No co-author line. Verify branch + D-ceiling before commit.
- **DB seed not in git** — a new block.json attr / `property_suffixes` row needs `/sgs-update --stage 1` (or a dated `migrations/*.py`) to reach the DB.
- **One writer per file** — parallel coding subagents only across DISJOINT files; a SOLO coding subagent (foreground, named files, main-verified) is optimal for a coupled surface.
- **Re-clone command:** `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup "sites/mamas-munches/mockups/homepage/index.html" --auto-section --client mamas-munches --page homepage --media-map sites/mamas-munches/research/sandybrown-media-map.json --deploy-target page:8`. Deploy plugin (PHP-only): `python plugins/sgs-blocks/scripts/build-deploy.py --skip-build --allow-dirty`.

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
| Hostinger MCP `hosting_clearWebsiteCacheV1` | CDN clear before any live CSS measure (user u945238940); plus `wp litespeed-purge all` (LiteSpeed now active) |
| REST app-pwd `.claude/secrets/sandybrown.env` | user `Claude`; pass creds inline (env has unquoted specials — don't `source`) |
| `/library-docs` | up-to-date WP / library docs |

## Agents to Delegate To
| Agent | When |
|---|---|
| general-purpose (Sonnet) | solo coding subagent (one writer, named files) + read-only traces/raters (parallel) |
| feature-dev:code-reviewer | pre-commit cross-model review on any shared render-helper change |

---

## Task 1 — pick with Bean (each is its own dedicated session)
**What:**
- `P-PATTERNS-USE-CORE-BLOCKS` — SGS theme patterns/parts use core `wp:heading`/`wp:paragraph` (which inline WP supports) instead of `sgs/*` blocks. Audit → convert → live-verify zero inline per pattern → consider a gate.
- `P-DRAFT-TOKEN-EXTRACTION-SETUP-PIPELINE` — header/footer setup pipeline whose opening step mechanically extracts the draft's `<head>` tokens into `theme.json`/`wp_global_styles` (ends snapshot drift).
- `P-PAGE8-DISCREPANCY-REGISTER` (PARTIAL) — 9 remaining page-8 fidelity fixes (`.claude/reports/2026-07-11-page8-discrepancy-diagnosis.md`).
**Why:** each advances clone fidelity / clean output; parked to keep sessions scoped.
**Orchestration:** inline design + `/qc-council` before any shared-surface build; solo implementer per coupled surface.
**Acceptance:** N/A until Bean selects one — do NOT start without a pick.

## Methodology guardrails (do not skip)
- Read the governing spec IN FULL. Prove the cause on the LIVE DOM / real node before building. NEVER cite computed-parity % as a measure.
- Verify a cache/optimiser is actually installed before leaning on it (STOP-VERIFY-CACHE-LAYER-INSTALLED). Test caching behaviour WITH the cache layer present (STOP-SELF-CONSISTENT-RENDER-UNDER-CACHE).
- Design-gate + `/qc-council` on shared-surface changes before building (blub.db 255). Every fix universal (R-31-9), no cheat. Verify the LIVE painted value (STOP-44). Bean's eye co-authoritative (R-31-13).
- Branch appropriately (core SGS = `main`); path-scoped commits (message FILE); no co-author line. `/qc-inline` per change; end with `/handoff`.
- **Deploy before measure** — build + deploy + OPcache + CDN clear + `wp litespeed-purge all` before any live measurement (STOP-21/CDN).

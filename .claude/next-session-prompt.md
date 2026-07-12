---
doc_type: next-session-prompt
project: small-giants-wp
generated: 2026-07-12
thread: post-page-8 — P-STYLE-TAG-CONSOLIDATION (per-block <style>-tag bloat) research + design
---

# NEXT SESSION — `P-STYLE-TAG-CONSOLIDATION` (research + design first)

You are the SGS cloning-pipeline developer. The page-8 discrepancy programme is COMPLETE (Fix 4 labels shipped + landed D311, commit `cef1fca9`; Fix 9 confirmed every SGS block is Spec-32 no-inline compliant). The next front is `P-STYLE-TAG-CONSOLIDATION` — Bean parked it this session. Invoke `/autopilot` first.

## ⛔ MANDATORY READING GATE (read IN FULL before any Write/Edit)
1. `.claude/handoff.md` (D311) + `.claude/decisions.md` head (D311, D310, D309).
2. **Spec 31 IN FULL** (Bean-locked every session) — esp. §3.A CSS routing, §13.4 FR-31-5.2, §13.6 composite-mirror + D294, FR-31-22 box-object, §7b, the cheat catalogue.
3. **Spec 32 §6.1** (box-object / no-inline) — the `<style>`-consolidation reshapes HOW the sanctioned scoped `<style>` is emitted; read before touching the shared render helpers.
4. `.claude/parking.md` head — `P-STYLE-TAG-CONSOLIDATION` (the task) + `P-PATTERNS-USE-CORE-BLOCKS` + `P-DRAFT-TOKEN-EXTRACTION-SETUP-PIPELINE`.
5. `.claude/reports/2026-07-12-fix9-inline-styles-register.md` — the `<style>`-tag facts (144 tags, 107 body, 83 SGS, 33KB) + the WP Style Engine store fix.

## ⛔ ANTI-PATTERN STOPs (carried forward + this session's — NEVER subtract, D101)
- **STOP-GOLDEN-CAN-BE-STALE (NEW, D311)** — a committed conformance golden can be STALE (diverged from the current converter by an unre-seeded improvement). Prove a converter emit claim with a real-node trace of the CURRENT converter, not by reading a golden. When a golden and your trace disagree, run the conformance test + check the whole-suite red count — a pre-existing red means the golden is stale, not your finding. A render-side-only change can't newly break a golden.
- **STOP-STYLE-TAG-IS-NOT-STYLE-ATTR (NEW, D311)** — a `<style>` TAG is NOT an inline `style="…"` ATTRIBUTE; Spec 32 §6.1(b) sanctions the block's own scoped `<style>` as THE no-inline mechanism. "No inline `style=` attributes" ≠ "no embedded CSS". When judging inline-styling, check BOTH the `style="…"` attributes AND the count/size of per-block `<style>` tags (page 8 = ~100 tags / 33KB — the bloat Bean flagged).
- **STOP-VERIFY-COLOUR-HOVER-AND-VS-DRAFT (D310)** — verifying a cloned button/label/CTA colour = measure REST **and** HOVER (Playwright `.hover()`) and compare EVERY value to the DRAFT — never resting-contrast-only. A composite's OWN `style.css .block .sgs-x--y` rules (0,2,0) override the shared channel — enumerate matched rules.
- **STOP-CSS-VER-CACHE-BUST (D310)** — a `style.css`-ONLY change (no render-side counterpart) is served STALE to a cached browser (block stylesheet `?ver` is pinned to `block.json` version). Bump the block version. Render-side inline `<style>` changes DO land fresh.
- **STOP-PARITY-NOT-A-MEASURE (D309)** — the computed-parity % is NOT a fidelity measure; NEVER cite the aggregate number as an outcome. Signal = direct per-element computed-style matched by CONTENT + Bean's eye.
- **STOP-STANDARDISE-NAMING-FIRST (D309)** — standardise a naming convention across the ecosystem FIRST, then build the mechanism that depends on it; recognise capability by whether the block DECLARES the attr, never a name-guess.
- **STOP-REGISTER-MECHANISMS-UNRELIABLE** — a pre-diagnosed register lists SYMPTOMS but its CAUSES are often wrong. Prove each cause on the live DOM OR a real-node converter trace FIRST. Register = item list only.
- **STOP-CDN-STALE-CACHE** — a block CSS change at an UNCHANGED `?ver` serves stale to a cached browser; verify via `fetch(url,{cache:'no-store'})`; always `hosting_clearWebsiteCacheV1` + OPcache before any live CSS measure.
- **STOP-16** — a subagent/"it works"/build-green is a HYPOTHESIS. Re-run yourself: `cd plugins/sgs-blocks/scripts && python -m pytest converter/tests -q --import-mode=importlib` (449 pass, 1 skip); `npm run build` (PowerShell — nvm shim broken in Git Bash).
- **STOP-21** — emit-green ≠ LANDED. LANDED = deploy/reclone + OPcache + CDN clear (+ version bump if style.css-only) + live computed-style.
- **STOP-static-vs-live** — for "does this class/style land?" use the LIVE DOM, NEVER static PHP/CSS parsing.
- **STOP-34** — verify a converter fix on the REAL draft node, not a synthetic fixture.
- **STOP-D228** — a framework default overriding the draft's faithfully-ABSENT/present value is a CHEAT to REMOVE/GATE. Universal (R-31-9).
- **STOP-WP-CORE-SERIALISATION (D306)** — a schema-valid emitted `style.*` value can be DROPPED by WP-core if the property definition lacks `css_vars`. Emit a form WP serialises.
- **STOP-COLOUR-SLUG-VALIDATION (D308)** — never emit a bare `var()` capture as a colour slug without validating it exists in the theme palette (undefined preset var → `currentColor` dark).
- **STOP-VERIFY-CLAIM** — do NOT assert "X isn't recognised / doesn't target Y / lacks Z" from a failed grep or inference. Verify against emitted markup / render code / block editor / live DOM first.
- **STOP-60** — a converter change adding new attrs changes conformance goldens (re-run + reseed deliberately + cited). A render-side-only change does NOT change the emit.
- **STOP-44** — a schema-valid emitted attr can be a render no-op; verify the LIVE painted value.
- **STOP-48/49** — do NOT trust `computed-parity.js` numbers or leftover-buckets; IGNORE header/footer + the accepted testimonial static-grid→slider.
- **STOP-67** — pre-commit visual-diff report per CHANGED block at repo-ROOT `reports/visual-diff/<block>-<date>.md` (frontmatter `verdict: PASS` + `first_paint_capture_passed: true`; filename MUST be `<block>-<date>.md`).
- **safecss strips functional colours (D302)** — any INLINE colour VALUE must be hex/named/var; the scoped `<style>` channel is NOT filtered.
- **Path-scoped commits** — `git commit -F <msgfile> -- <paths>` (message FILE via `cat > file << 'EOF'`; heredoc-on-stdin → empty message). `git add <file>` for NEW files; never `git add -A`. No version bumps / deprecations pre-production (except a cache-bust bump per STOP-CSS-VER-CACHE-BUST). No co-author line. Verify branch + D-ceiling before commit.
- **DB seed not in git** — a new block.json attr / `property_suffixes` row needs `/sgs-update --stage 1` (or a dated `migrations/*.py`) to reach the DB.
- **One writer per file** — parallel coding subagents only across DISJOINT files; never 2+ concurrent writers. A SOLO coding subagent (foreground, named files, main-session-verified) is optimal for a coupled surface.
- **Re-clone command:** `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup "sites/mamas-munches/mockups/homepage/index.html" --auto-section --client mamas-munches --page homepage --media-map sites/mamas-munches/research/sandybrown-media-map.json --deploy-target page:8`. Deploy plugin first if render/CSS changed: `python plugins/sgs-blocks/scripts/build-deploy.py --skip-build --allow-dirty` (after `npm run build`).

## Skills to Invoke
| Skill | When |
|---|---|
| `/brainstorming` | design the `<style>`-consolidation architecture (store vs enqueued file) |
| `/gap-analysis` | grade before delivery |
| `/lifecycle` | any skill/agent/pipeline change |
| `/research` | WP Style Engine store + Kadence/Spectra/GenerateBlocks CSS-emission patterns |
| `/strategic-plan` | order the framework-wide `<style>`-consolidation rollout |
| `/systematic-debugging` | prove any cause on the live DOM / real node before fixing |
| `/qc-council` | any shared-surface render-helper change before dispatch (blub.db 255) |
| `/qc-inline` | per-change QC (Spec 31/32 compliance + no cheats + universal) |
| `/sgs-clone` `/sgs-db` `/wp-blocks` | ground truth (block schema, box_family, css_property, presets) |
| `/library-docs` | WP Style Engine store API (`wp_style_engine_get_styles` context + `wp_enqueue_stored_styles`) |
| `/handoff` `/capture-lesson` | session close |

## MCP Servers & Tools
| Tool | For |
|---|---|
| Playwright / chrome-devtools MCP | live computed-style + `<style>`-tag enumeration + matched-rule inspection (THE landed gate) |
| Hostinger MCP `hosting_clearWebsiteCacheV1` | CDN clear before any live CSS measure (user u945238940, domain sandybrown-…hostingersite.com) |
| REST app-pwd `.claude/secrets/sandybrown.env` | user `Claude`; pass creds inline (env has unquoted specials — don't `source`) |

## Agents to Delegate To
| Agent | When |
|---|---|
| general-purpose (Sonnet) | solo coding subagent (one writer, named files) + read-only traces/raters (parallel) |
| feature-dev:code-reviewer | pre-commit cross-model review on any shared render-helper change |

## Research Approach
1. `/research` (or `/library-docs`) the WP Style Engine store: `wp_style_engine_get_styles($css, ['context' => 'sgs-blocks'])` + `wp_enqueue_stored_styles()` — how core collects block-support CSS into ONE `<style>` in the footer.
2. Inspect Kadence / Spectra / GenerateBlocks (live or docs) for per-instance CSS emission (single collected block vs enqueued dynamic file vs per-block `<style>`).
3. Map SGS's current emitters (`SGS_Container_Wrapper`, `sgs_label_box_css_rule`, `sgs_typography_css_rule`, per-block render.php scoped `<style>`) to the store API; decide the migration shape.

---

## Task 1 — `P-STYLE-TAG-CONSOLIDATION`: research + design (do NOT build without design approval)
**What:** SGS emits ~100 per-block scoped `<style>` tags (33KB) into the page body (verified live page 8: 144 total, 107 body, 83 SGS). Research the WP-native fix (Style Engine "store") + competitors, then design collapsing the scatter into ONE footer block (or an enqueued cacheable file).
**Why:** cleaner output + cacheability; Bean's flagged bloat. Measurable: ~100 body `<style>` tags → 1 (or enqueued file).
**Estimated time:** ~30 min research + ~30 min design (the build is a separate, larger phase).
**Orchestration:**
- Execution: inline (main thread) for research + design.
- `/research` (WP store + competitors) → `/brainstorming` (design) → present to Bean → `/qc-council` on the shared-render-helper change BEFORE any build. The eventual build is framework-wide (every block's render helper) → solo implementer, one writer, per-block LANDED verification.
- Depends on: none. Parallel with: none. /qc gate after: design → `/qc-council` before any build.
**Acceptance:** a design Bean approves for how the ~100 per-block `<style>` tags collapse (store-into-one-footer-block vs enqueued file), with the shared helpers identified as the change surface. NO code until approved.

## Task 2 — (only if Bean redirects) other open parking items
`P-PATTERNS-USE-CORE-BLOCKS` (SGS patterns use core blocks that inline WP supports) or `P-DRAFT-TOKEN-EXTRACTION-SETUP-PIPELINE` (header/footer token-extraction). Each is its own dedicated session; do NOT start without Bean picking it.
**Acceptance:** N/A until Bean selects one.

## Dependency graph
```
Task 1 research (inline, Opus) → /brainstorming design (inline) → present to Bean
  ↓ (Bean approves design)
/qc-council on the shared render-helper change
  ↓
framework-wide build (solo implementer, one writer, per-block LANDED verify) — SEPARATE session/phase
```

## Methodology guardrails (do not skip)
- Read the governing spec IN FULL. Prove the cause on the LIVE DOM / real node before building. NEVER cite computed-parity % as a measure.
- A `<style>` TAG ≠ a `style="…"` ATTRIBUTE (STOP-STYLE-TAG-IS-NOT-STYLE-ATTR); a committed golden can be STALE (STOP-GOLDEN-CAN-BE-STALE) — real-node trace is ground truth.
- Design-gate + `/qc-council` on shared-surface render-helper changes before building (blub.db 255). Every fix universal (R-31-9), no cheat. Verify the LIVE painted value (STOP-44). Bean's eye co-authoritative (R-31-13).
- Branch appropriately (core SGS = `main`); path-scoped commits (message FILE); no co-author line. `/qc-inline` per change; end with `/handoff`.
- **Deploy before measure** — build + deploy + OPcache + CDN clear before any live measurement (STOP-21/CDN).
- **Housekeeping:** MEMORY.md compacted to 15KB this session (under the 24.4KB autoload cap) — keep it lean.

---
doc_type: handoff
project: small-giants-wp
generated: 2026-07-12
session: D311 — page-8 Fix 4 (labels) padding-ungate + product-card trial-tag full mirror, LANDED; Fix 9 inline-styles investigation (SGS compliant; <style>-tag bloat parked)
---

# Session Handoff — 2026-07-12

## Completed This Session
1. **Fix 4 (page-8 labels) SHIPPED + LANDED — D311, commit `cef1fca9` (pushed).** The gift-card `sgs/label` capsules rendered with NO padding (a tight chip) because `label/render.php` gated padding behind the `is-style-pill-*` class; the product-card trial tag hugged (`width:max-content`) instead of stretching like the CTA.
2. **New shared helper `includes/helpers-box.php :: sgs_label_box_css_rule($box,$selector)`** — emits a label-style box (padding base+tiers, radius, background, display/fullWidth) as SCOPED class-level CSS from a normalised struct. Both `sgs/label` AND the product-card trial tag call it → byte-identical (composite-mirror R-31-9 / Spec 31 §13.6 D294).
3. **label:** padding + custom-bg ungated to value-presence; new display model (fullWidth→block+100%, box→inline-block, bare→block), suppressed when an `is-style-*` class is present; defaults `padding {}`/`borderRadius 0`/`backgroundColour ""` + new `fullWidth` bool. Static pill chrome `style.css` kept (borrowed by product-card badges).
4. **product-card:** trial tag via the shared helper (`tagFullWidth` default true) + new client-editable `tagPadding`/`tagBackgroundColour`/`tagTextColour`/`tagBorderRadius`/`tagFullWidth` attrs; `width:max-content` moved base→`--featured` (protects the featured overlay) + F3 var-default padding/radius. Featured badge NOT mirrored (empty on this draft + a capability).
5. **/qc-council (2 cross-model raters) BOTH returned RESHAPE pre-build** — caught the featured-badge strip, the pill-fill display collapse, and dropped a speculative converter fullWidth heuristic. Design de-risked before any code.
6. **Verified LANDED live** (sandybrown page 8, reclone `…001022`, CDN+OPcache cleared) at 375/768/1440: gift capsules padded hug (4/10, surface-pink, radius 6); trial tag full-width; the 4 section eyebrows stay bare (regression-safe).
7. **Fix 9 (inline-styles, read-only) — SGS blocks 100% Spec-32 compliant.** Zero forbidden inline `style="…"` attributes from any SGS block; the 21 residual are all WP-core/WooCommerce/a11y/theme header+footer. Register: `.claude/reports/2026-07-12-fix9-inline-styles-register.md`.
8. **Bean-flagged the `<style>` TAGS** — SGS emits ~100 per-block scoped `<style>` tags (33KB) into the body; sanctioned by Spec 32 §6.1 but real bloat. Parked as `P-STYLE-TAG-CONSOLIDATION` (WP Style Engine store consolidation, framework-wide, design-gated).
9. **Docs:** D311 logged, state.md repointed, parking entry added; MEMORY.md compacted 25.5KB→15KB (moved 2026-06-29…07-04 stubs to MEMORY-archive.md); memory lesson captured.

## Current State
- **Branch:** `main` at `26107886` (all pushed)
- **Tests:** converter unit suite 449 pass / 1 skip; conformance goldens 15 pre-existing red / 36 pass (0 new from this session)
- **Build:** passes (all prebuild gates green incl. F3, dead-controls, cheat-gate)
- **Uncommitted changes:** none this session (build/ is gitignored; the untracked `sgs-framework.db` + pre-existing `phase4-*.txt`/`lucide-icons.php`/`package-lock.json` dirt are not this session's)
- **Live:** sandybrown page 8 carries the landed Fix 4

## Known Issues / Blockers
- 15 pre-existing stale conformance goldens (accordion/cta-section/hero/product-card/quote/trust-bar/gift-section/…) — predate this work; reseed with LANDED proof when touched. Not a blocker.
- Per-element GEOMETRY transfer for the product-card tag (`tagPadding`/`tagBorderRadius`) is NOT converter-routed (colour/typography only) — moot on page 8 (draft = defaults); a design-gated shared-mechanism change if ever needed.

## Next Priorities (in order)
1. **`P-STYLE-TAG-CONSOLIDATION`** (Bean parked "next session") — research the WP Style Engine store (`wp_enqueue_stored_styles()`) + how Kadence/Spectra/GenerateBlocks avoid per-block `<style>` scatter; design collapsing ~100 body `<style>` tags into one footer block; `/qc-council` before any framework-wide build.
2. `P-PATTERNS-USE-CORE-BLOCKS` — SGS theme patterns/parts use core `wp:heading`/`wp:paragraph` (which inline WP supports) instead of `sgs/*` blocks; a dedicated pattern-modernisation session.
3. `P-DRAFT-TOKEN-EXTRACTION-SETUP-PIPELINE` — the header/footer setup pipeline that mechanically extracts the draft's base tokens into theme.json (ends snapshot drift).

## Files Modified
| File path | What changed |
|---|---|
| plugins/sgs-blocks/includes/helpers-box.php | NEW — `sgs_label_box_css_rule()` + shared sanitisers |
| plugins/sgs-blocks/includes/render-helpers.php | require helpers-box.php |
| plugins/sgs-blocks/src/blocks/label/{block.json,render.php,edit.js} | ungate padding/bg + display model + fullWidth attr + defaults |
| plugins/sgs-blocks/src/blocks/product-card/{block.json,render.php,edit.js,style.css} | trial-tag mirror via helper + tag box attrs + width:max-content reshape + F3 var-defaults |
| plugins/sgs-blocks/includes/product-card-builtin-render.php | uid class on trial span |
| plugins/sgs-blocks/scripts/sgs-update-v2.py | ATTR_CLASSIFICATION_OVERRIDES for the tag box attrs |
| .claude/{decisions.md,state.md,parking.md} | D311 + state repoint + P-STYLE-TAG-CONSOLIDATION |
| reports/visual-diff/{label,product-card}-2026-07-12.md | STOP-67 visual-diff reports |
| .claude/reports/2026-07-12-fix9-inline-styles-register.md | Fix 9 register + `<style>`-tag addendum |

## Notes for Next Session
- **A committed golden can be STALE** — my Fix-4 padding finding held vs a golden that lacked padding; the current converter DID emit it (conformance was already red on that fixture). Real-node trace of the CURRENT converter is ground truth; re-run the conformance test + check the whole-suite red count before conceding to a rater citing a golden.
- **No block version bump was needed** — every visible change lands render-side via inline `<style>`; the trial full-width rule wins over any stale base `width:max-content` by source order. Only a `style.css`-ONLY change with no render-side counterpart needs a `?ver` bump.
- **The page-8 discrepancy programme is now COMPLETE** — Fix 4 shipped, Fix 9 confirmed no SGS work needed. Next fronts are the parked architectural items.
- `/sgs-update --stage 1` was run to seed the 6 new attr rows — the DB (not git-tracked) knows them; the git seed is the `sgs-update-v2.py` override edit.

## Next Session Prompt

~~~
You are the SGS cloning-pipeline developer. The page-8 discrepancy programme is COMPLETE (Fix 4 labels shipped + landed D311; Fix 9 confirmed every SGS block is Spec-32 no-inline compliant). The next front is `P-STYLE-TAG-CONSOLIDATION` — Bean parked it this session. Invoke `/autopilot` first.

Read `.claude/handoff.md` + `.claude/CLAUDE.md` for full context, then work the priorities below.

## ⛔ MANDATORY READING GATE (read IN FULL before any Write/Edit)
1. `.claude/handoff.md` (this session) + `.claude/decisions.md` head (D311, D310, D309).
2. **Spec 31 IN FULL** (Bean-locked every session) — esp. §3.A CSS routing, §13.4 FR-31-5.2, §13.6 composite-mirror + D294, FR-31-22 box-object, §7b, the cheat catalogue.
3. **Spec 32 §6.1** (box-object / no-inline) — the `<style>`-consolidation work reshapes HOW the sanctioned scoped `<style>` is emitted; read it before touching the shared render helpers.
4. `.claude/parking.md` head — `P-STYLE-TAG-CONSOLIDATION` (the task) + `P-PATTERNS-USE-CORE-BLOCKS` + `P-DRAFT-TOKEN-EXTRACTION-SETUP-PIPELINE`.
5. `.claude/reports/2026-07-12-fix9-inline-styles-register.md` — the `<style>`-tag facts (144 tags, 107 body, 83 SGS, 33KB) + the WP Style Engine store fix.

## ⛔ ANTI-PATTERN STOPs (carried forward + this session's — NEVER subtract, D101)
- **STOP-GOLDEN-CAN-BE-STALE (NEW, D311)** — a committed conformance golden can be STALE (diverged from the current converter by an unre-seeded improvement). Prove a converter emit claim with a real-node trace of the CURRENT converter, not by reading a golden. When a golden and your trace disagree, run the conformance test + check the whole-suite red count — a pre-existing red means the golden is stale, not your finding. A render-side-only change can't newly break a golden. (`feedback_golden_can_be_stale_realnode_trace_is_ground_truth`.)
- **STOP-STYLE-TAG-IS-NOT-STYLE-ATTR (NEW, D311)** — a `<style>` TAG is NOT an inline `style="…"` ATTRIBUTE; Spec 32 §6.1(b) sanctions the block's own scoped `<style>` as THE no-inline mechanism. So "no inline `style=` attributes" ≠ "no embedded CSS". When judging inline-styling, check BOTH: the `style="…"` attributes AND the count/size of per-block `<style>` tags (page 8 = ~100 tags / 33KB — the real bloat Bean flagged).
- **STOP-VERIFY-COLOUR-HOVER-AND-VS-DRAFT (D310)** — verifying a cloned button/label/CTA colour = measure REST **and** HOVER (Playwright `.hover()`) and compare EVERY value to the DRAFT's exact rule — never resting-contrast-only. A composite's OWN `style.css .block .sgs-x--y` rules (0,2,0) override the shared channel — enumerate matched rules to find which wins.
- **STOP-CSS-VER-CACHE-BUST (D310)** — a `style.css`-ONLY change (no render-side counterpart) is served STALE to a cached browser because the block stylesheet `?ver` is pinned to `block.json` version. Bump the block version (or filemtime `?ver`). Render-side inline `<style>` changes DO land fresh.
- **STOP-PARITY-NOT-A-MEASURE (D309)** — the computed-parity % is NOT a fidelity measure (over-counts font-stacks + clone-only props). NEVER cite the aggregate number as an outcome. Signal = direct per-element computed-style matched by CONTENT + Bean's eye.
- **STOP-STANDARDISE-NAMING-FIRST (D309)** — when a mechanism depends on a naming convention, STANDARDISE it across the ecosystem FIRST, then build. A modifier (tier/state) is a SUFFIX on the base attr; recognise capability by whether the block DECLARES the attr, never a name-guess.
- **STOP-REGISTER-MECHANISMS-UNRELIABLE** — a pre-diagnosed register lists SYMPTOMS but its stated CAUSES are often wrong. Prove each cause on the live DOM OR a real-node converter trace (`recognise` + `build_block_markup` / `convert_section` on the actual draft node) FIRST. Register = item list only.
- **STOP-CDN-STALE-CACHE** — a block CSS change at an UNCHANGED `?ver` serves stale to a cached browser; verify via `fetch(url,{cache:'no-store'})`; always `hosting_clearWebsiteCacheV1` + OPcache before any live CSS measure.
- **STOP-16** — a subagent/"it works"/build-green is a HYPOTHESIS. Re-run yourself: `cd plugins/sgs-blocks/scripts && python -m pytest converter/tests -q --import-mode=importlib` (449 pass, 1 skip); `npm run build` (PowerShell — nvm shim broken in Git Bash; Python works in Bash).
- **STOP-21** — emit-green ≠ LANDED. LANDED = deploy/reclone + OPcache + CDN clear (+ version bump if style.css-only) + live computed-style.
- **STOP-static-vs-live** — for "does this class/style actually land?" use the LIVE DOM (Playwright computed-style / matched-rule enumeration), NEVER static PHP/CSS parsing.
- **STOP-34** — verify a converter fix on the REAL draft node, not a synthetic fixture.
- **STOP-D228** — a framework default overriding the draft's faithfully-ABSENT/present value is a CHEAT to REMOVE/GATE. Universal, never per-block (R-31-9).
- **STOP-WP-CORE-SERIALISATION (D306)** — a schema-valid emitted `style.*` value can be DROPPED by WP-core's style engine if the property's definition lacks `css_vars`. Emit a form WP serialises (direct `var(...)` / concrete).
- **STOP-COLOUR-SLUG-VALIDATION (D308)** — never emit a bare `var()` capture as a colour slug without validating it exists in the theme palette (undefined preset var → `currentColor` dark). Emit valid token / hex / honest gap.
- **STOP-VERIFY-CLAIM** — do NOT assert "X isn't recognised / doesn't target Y / lacks Z" from a failed grep or inference. Verify against emitted markup / render code / block editor / live DOM first.
- **STOP-60** — a converter change adding new attrs to cloned output changes conformance goldens (re-run the suite; re-seed deliberately + cited, never blanket). A render-side-only change does NOT change the emit.
- **STOP-44** — a schema-valid emitted attr can be a render no-op; verify the LIVE painted value.
- **STOP-48/49** — do NOT trust `computed-parity.js` numbers or leftover-buckets; IGNORE header/footer + the accepted testimonial static-grid→slider.
- **STOP-67** — pre-commit visual-diff report per CHANGED block at repo-ROOT `reports/visual-diff/<block>-<date>.md` with frontmatter `verdict: PASS` + `first_paint_capture_passed: true` (commit gate greps these; filename MUST be `<block>-<date>.md`).
- **safecss strips functional colours (D302)** — any INLINE colour VALUE must be hex/named/var; the scoped `<style>` channel (`wp_strip_all_tags`) is NOT filtered.
- **Path-scoped commits** — `git commit -F <msgfile> -- <paths>` (heredoc-on-stdin gets consumed by hooks → empty message; use a message FILE via `cat > file << 'EOF'`). `git add <file>` for NEW files; never `git add -A`. No version bumps / deprecations pre-production (except a cache-bust bump per STOP-CSS-VER-CACHE-BUST). No co-author line. Verify branch + D-ceiling before commit.
- **DB seed not in git** — a new block.json attr / `property_suffixes` row needs `/sgs-update --stage 1` (or a dated `migrations/*.py`) to reach the DB (sgs-framework.db isn't git-tracked; the git seed is the sgs-update-v2.py override / migration file).
- **One writer per file** — parallel coding subagents only across DISJOINT files; never 2+ concurrent writers on one file. A SOLO coding subagent (foreground, named files, main-session-verified) is optimal for a coupled surface.
- **Re-clone command:** `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup "sites/mamas-munches/mockups/homepage/index.html" --auto-section --client mamas-munches --page homepage --media-map sites/mamas-munches/research/sandybrown-media-map.json --deploy-target page:8`. Deploy plugin first if render/CSS changed: `python plugins/sgs-blocks/scripts/build-deploy.py --skip-build --allow-dirty` (after `npm run build`).

## Skills to Invoke
| Skill | When |
|---|---|
| `/brainstorming` | design the `<style>`-consolidation architecture (store vs enqueued file) before building |
| `/gap-analysis` | grade before delivery |
| `/lifecycle` | any skill/agent/pipeline change |
| `/research` | gold-standard reference — WP Style Engine store + Kadence/Spectra/GenerateBlocks CSS-emission patterns |
| `/strategic-plan` | order the framework-wide `<style>`-consolidation rollout |
| `/systematic-debugging` | prove any cause on the live DOM / real node before fixing |
| `/qc-council` | any shared-surface render-helper change before dispatch (blub.db 255) |
| `/qc-inline` | per-change QC (Spec 31/32 compliance + no cheats + universal) |
| `/sgs-clone` `/sgs-db` `/wp-blocks` | ground truth (block schema, box_family, css_property, presets) |
| `/handoff` `/capture-lesson` | session close |

## MCP Servers & Tools
| Tool | For |
|---|---|
| Playwright / chrome-devtools MCP | live computed-style + `<style>`-tag enumeration + matched-rule inspection (THE landed gate) |
| Hostinger MCP `hosting_clearWebsiteCacheV1` | CDN clear before any live CSS measure (user u945238940, domain sandybrown-…hostingersite.com) |
| REST app-pwd `.claude/secrets/sandybrown.env` | user `Claude`; pass creds inline (env has unquoted specials — don't `source`) |
| `/library-docs` | WP Style Engine store API (`wp_style_engine_get_styles` context + `wp_enqueue_stored_styles`) |

## Agents to Delegate To
| Agent | When |
|---|---|
| general-purpose (Sonnet) | solo coding subagent (one writer, named files) + read-only traces/raters (parallel) |
| feature-dev:code-reviewer | pre-commit cross-model review on any shared render-helper change |

## Research Approach
1. `/research` (or `/library-docs`) the WP Style Engine store: `wp_style_engine_get_styles($css, ['context' => 'sgs-blocks'])` + `wp_enqueue_stored_styles()` — how core collects block-support CSS into ONE `<style>` in the footer.
2. Inspect Kadence / Spectra / GenerateBlocks live pages (or docs) for how they emit per-instance CSS (single collected block vs enqueued dynamic file vs per-block `<style>`).
3. Map SGS's current emitters (`SGS_Container_Wrapper`, `sgs_label_box_css_rule`, `sgs_typography_css_rule`, per-block render.php scoped `<style>`) to the store API; decide the migration shape.

---

## Task 1 — `P-STYLE-TAG-CONSOLIDATION`: research + design (do NOT build without design approval)
**What:** SGS emits ~100 per-block scoped `<style>` tags (33KB) into the page body (verified live page 8: 144 total, 107 body, 83 SGS). Research the WP-native fix (Style Engine "store") + competitors, then design collapsing the scatter into one footer block (or an enqueued cacheable file).
**Why:** cleaner output + cacheability; Bean's flagged bloat. Measurable: ~100 body `<style>` tags → 1 (or enqueued file).
**Estimated time:** ~30 min research + ~30 min design (the build is a separate, larger phase).
**Orchestration:** `/research` (WP store + competitors) → `/brainstorming` (design) → present to Bean → `/qc-council` on the shared-render-helper change BEFORE any build. Execution inline for research/design; the eventual build is framework-wide — solo implementer, one writer, per-block LANDED verification.
**Depends on:** none. **/qc gate after:** design → `/qc-council` before build.
**Acceptance:** a design Bean approves for how the ~100 per-block `<style>` tags collapse (store-into-one-footer-block vs enqueued file), with the shared helpers identified as the change surface. NO code until approved.

## Task 2 — (only if Bean redirects) other open parking items
`P-PATTERNS-USE-CORE-BLOCKS` or `P-DRAFT-TOKEN-EXTRACTION-SETUP-PIPELINE`. Each is its own dedicated session; do NOT start without Bean picking it.

## Methodology guardrails (do not skip)
- Read the governing spec IN FULL. Prove the cause on the LIVE DOM / real node before building. NEVER cite computed-parity % as a measure.
- A `<style>` TAG ≠ a `style="…"` ATTRIBUTE (STOP-STYLE-TAG-IS-NOT-STYLE-ATTR); a committed golden can be STALE (STOP-GOLDEN-CAN-BE-STALE) — real-node trace is ground truth.
- Design-gate + `/qc-council` on shared-surface render-helper changes before building (blub.db 255). Every fix universal (R-31-9), no cheat. Verify the LIVE painted value (STOP-44). Bean's eye co-authoritative (R-31-13).
- Branch appropriately (core SGS = `main`); path-scoped commits (message FILE); no co-author line. `/qc-inline` per change; end with `/handoff`.
- **Deploy before measure** — build + deploy + OPcache + CDN clear before any live measurement (STOP-21/CDN).
~~~

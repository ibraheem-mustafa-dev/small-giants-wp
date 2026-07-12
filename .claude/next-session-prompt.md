---
doc_type: next-session-prompt
project: small-giants-wp
generated: 2026-07-12
thread: post-D316 — page-8 in-contract fidelity COMPLETE + the parity tool is now trustworthy (Spec 20 v1.1.0, ledger-validated). Next front = Bean's pick from the menu below.
---

# NEXT SESSION — pick the next fidelity/quality front (page-8 in-contract fidelity is DONE)

You are the SGS cloning-pipeline developer. **This session (D315/D316) closed the parity-tool rebuild:** `computed-parity.js` (Stage 11.6) is rebuilt to Spec 20 v1.1.0, tracks VISIBLE fidelity, validated against the independent D314 ledger (agrees ~98% once dispositions apply; raw 88% is honest + page-agnostic), 11/11 fixtures, Bean signed off. Also fixed the pill tick-gap universally (D316) + proved the D314 deferred C-type sweep attrs are all dead render paths (seeded none). Page-8 in-contract fidelity is COMPLETE. **There is no single forced next task — present Bean the menu below (ranked) and let him pick.** Invoke `/autopilot` first.

Read `.claude/handoff.md` + `.claude/CLAUDE.md` for full context.

## Menu of open fronts (present ranked, Bean picks — ADHD Rule 1/9)
1. **(recommended) Header/footer setup pipeline** — `P-DRAFT-TOKEN-EXTRACTION-SETUP-PIPELINE` (the stated "next phase once the block pipeline is proven"): mechanically extract the draft's `<head>` design tokens into the theme so every block inherits the correct base by construction. Design-gate + `/qc-council` first (shared theming surface).
2. **Use the trustworthy parity tool to sweep more pages/clients** for the next real fidelity gaps (it's now dependable — read its full mismatch list, apply dispositions, Bean's eye closes).
3. **Block-quality passes** — `P-DEAD-NULL-ROLE-CONTROLS` (wire-or-remove the 7 dead mobile-nav/trust-bar controls) + `P-PATTERNS-USE-CORE-BLOCKS` (SGS patterns use core blocks → inline leak).
4. **Residual `P-PAGE8-DISCREPANCY-REGISTER` items** if any survive a re-clone + the trustworthy tool.

## ⛔ MANDATORY READING GATE (read IN FULL before any Write/Edit)
1. `.claude/handoff.md` (D315/D316) + `.claude/decisions.md` head (D316, D315, D314).
2. **Spec 31 IN FULL** (Bean-locked every session) — §3.A CSS routing, §13.4 FR-31-5.2, §13.6 composite-mirror + D294, FR-31-22 box-object, §7b closing gate, the cheat catalogue.
3. The governing spec for the CHOSEN front (Spec 20 for parity work; the archived header/footer plan for front 1; Spec 32 for block-quality).
4. `.claude/parking.md` head — `P-DRAFT-TOKEN-EXTRACTION-SETUP-PIPELINE`, `P-DEAD-NULL-ROLE-CONTROLS`, `P-PAGE8-DISCREPANCY-REGISTER`, `P-PATTERNS-USE-CORE-BLOCKS`.
5. If touching parity: `plugins/sgs-blocks/scripts/parity/computed-parity.js` + `fixtures/smoke-test.js` + how Stage 11.6 calls it in `sgs-clone-orchestrator.py`.

## ⛔ ANTI-PATTERN STOPs (carried forward + this session's — NEVER subtract, D101)
- **STOP-SUBVISIBLE-NEEDS-PREDICATE (NEW, D315)** — a clone-fidelity tool's "ignore this diff / sub-visible" bucket MUST be gated by a per-pair rendered-INVISIBILITY predicate (geometry/parent context), NEVER a blanket property-name exclude — a blanket exclude hides a real gap. Keep-scored is the safe default when invisibility is unproven; guard each with a must-still-SCORE fixture. Memory `sub-visible-parity-buckets-need-invisibility-predicate`.
- **STOP-PARITY-RAW-IS-PAGE-AGNOSTIC (NEW, D315; supersedes STOP-PARITY-NOT-A-MEASURE)** — the rebuilt tool is now TRUSTWORTHY, but its RAW % is deliberately page-agnostic (FR-20-2) and will read LOWER than a human-dispositioned ledger by exactly the accepted/out-of-contract set. Do NOT engineer the raw number upward by loosening predicates. Read the full mismatch list + apply dispositions (or `--exclude`), then Bean's eye closes (FR-20-7 / R-31-13). The tool never closes alone.
- **STOP-DEAD-CONTROL-GATE-BLIND (NEW, D316)** — `check-dead-controls.js` treats `$attributes['x']` read into a CSS var as "consumed" even when the var is never used in CSS. That is how the P-DEAD-NULL-ROLE-CONTROLS attrs (mobile-nav/trust-bar) pass it while rendering nothing. Before seeding a role for cloning OR trusting a control works, verify the LIVE painted value (STOP-44), not just that render.php reads the attr.
- **STOP-PATH-SCOPED-COMMIT-FORM (NEW, D316)** — the wired commit gates require `git commit -F <msgfile> -- <explicit paths>` (message FILE, pathspec form). A bare `git commit` after `git add` is BLOCKED by the path-scope guard. A block CSS/`src/blocks/**` change ALSO requires a `reports/visual-diff/<block>-<date>.md` (frontmatter `verdict: PASS` + `first_paint_capture_passed: true`) to exist BEFORE the commit (STOP-67 visual-diff gate, `.git/hooks/pre-commit`). Non-visual block.json/PHP-logic-only changes: `git commit --no-verify`.
- **STOP-FIX-DRAFT-NOT-CLONE (D313)** — an a11y/fidelity issue INHERITED FROM THE DRAFT is fixed at the DRAFT source (edit the mockup, re-clone), NEVER on the clone and NEVER via a converter carve-out. Verify the draft actually has the issue first. (A genuine clone DIVERGENCE from the draft, by contrast, is a converter/block fix per R-31-9 — e.g. the D316 pill overlay.)
- **STOP-VERIFY-CACHE-LAYER-INSTALLED (D312)** — before leaning on a cache/CDN optimiser, VERIFY it is installed/active. LiteSpeed Cache IS installed on sandybrown — `wp litespeed-purge all` before any live measure.
- **STOP-SELF-CONSISTENT-RENDER-UNDER-CACHE (D312)** — a delivery whose correctness needs a cross-request "warm up" is frozen by a full-page cache. Prefer self-consistent renders; test WITH the cache layer installed.
- **STOP-STYLE-TAG-IS-NOT-STYLE-ATTR (D311)** — a `<style>` TAG is NOT an inline `style="…"` ATTRIBUTE; Spec 32 §6.1(b) sanctions the block's own scoped `<style>`. Check BOTH.
- **STOP-GOLDEN-CAN-BE-STALE (D311)** — a committed conformance golden can be STALE; prove a converter emit claim with a real-node trace of the CURRENT converter. A render-side-only change can't newly break a golden.
- **STOP-VERIFY-COLOUR-HOVER-AND-VS-DRAFT (D310)** — verifying a cloned colour = measure REST **and** HOVER (`.hover()`) vs the DRAFT's exact rule, never resting-contrast-only. A composite's own `style.css .block .sgs-x--y` (0,2,0) overrides the shared channel.
- **STOP-CSS-VER-CACHE-BUST (D310/D316)** — a `style.css`/`editor.css`-ONLY change is served STALE (`?ver` pinned to block.json version) → bump the block.json version (the ONE permitted pre-production bump). Render-side inline/output-buffer changes land fresh. (D316 bumped option-picker 0.1.9→0.1.10 for exactly this.)
- **STOP-STANDARDISE-NAMING-FIRST (D309)** — standardise a naming convention across the ecosystem FIRST, then build the mechanism; recognise capability by whether the block DECLARES the attr, never a name-guess.
- **STOP-REGISTER-MECHANISMS-UNRELIABLE** — a pre-diagnosed register lists SYMPTOMS but its CAUSES are often wrong. Prove each cause on the live DOM OR a real-node converter trace FIRST.
- **STOP-CDN-STALE-CACHE** — a block CSS change at an UNCHANGED `?ver` serves stale; always `hosting_clearWebsiteCacheV1` (Hostinger MCP, user u945238940) + OPcache web-pool reset + `wp litespeed-purge all` before any live CSS measure.
- **STOP-16** — a subagent/"it works"/build-green is a HYPOTHESIS. Re-run yourself: `cd plugins/sgs-blocks/scripts && python -m pytest converter/tests -q --import-mode=importlib`; `npm run build` (PowerShell — nvm shim broken in Git Bash; node via PowerShell too).
- **STOP-21** — emit-green ≠ LANDED. LANDED = deploy/reclone + OPcache + CDN + LiteSpeed clear + live computed-style.
- **STOP-static-vs-live** — for "does this class/style land/apply?" use the LIVE DOM (Playwright computed-style / matched-rules), NEVER static PHP/CSS parsing.
- **STOP-34** — verify a converter fix on the REAL draft node, not a synthetic fixture.
- **STOP-D228** — a framework default overriding the draft's faithfully-ABSENT/present value is a CHEAT to REMOVE/GATE. Universal (R-31-9).
- **STOP-WP-CORE-SERIALISATION (D306)** — a schema-valid emitted `style.*` value can be DROPPED by WP-core if the property definition lacks `css_vars`. Emit a form WP serialises.
- **STOP-COLOUR-SLUG-VALIDATION (D308)** — never emit a bare `var()` capture as a colour slug without validating it exists in the theme palette.
- **STOP-VERIFY-CLAIM** — do NOT assert "X isn't recognised / lacks Z" from a failed grep. Verify against emitted markup / render code / live DOM first.
- **STOP-60** — a converter change adding attrs changes conformance goldens (reseed deliberately + cited). A render-side-only change does NOT change the emit.
- **STOP-44** — a schema-valid emitted attr can be a render no-op; verify the LIVE painted value.
- **STOP-48/49 (LARGELY RESOLVED D315)** — `computed-parity.js` is now the trustworthy instrument (rebuilt this session); the historical over/under-count is fixed. STILL ignore header/footer + the accepted testimonial static-grid→slider when judging fidelity. Do NOT re-trust `leftover-buckets`/`attribute_gap_candidates` as a rendered-fidelity signal (input-side, cumulative).
- **STOP-67** — pre-commit visual-diff report per CHANGED block at repo-ROOT `reports/visual-diff/<block>-<date>.md` (frontmatter `verdict: PASS` + `first_paint_capture_passed: true`). Enforced by `.git/hooks/pre-commit`.
- **safecss strips functional colours (D302)** — any INLINE colour VALUE must be hex/named/var; the scoped `<style>` channel is NOT filtered.
- **Path-scoped commits** — `git commit -F <msgfile> -- <paths>` (message FILE). `git add <file>` for NEW files; never `git add -A`. No version bumps / deprecations pre-production (except a cache-bust bump). No co-author line. Verify branch + D-ceiling before commit.
- **DB seed not in git** — a new block.json attr / `property_suffixes` row needs `/sgs-update --stage 1` (or a dated `migrations/*.py`) to reach the DB.
- **One writer per file** — parallel coding subagents only across DISJOINT files; a SOLO coding subagent (foreground, named files, main-verified) is optimal for a coupled surface.
- **Re-clone command:** `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup "sites/mamas-munches/mockups/homepage/index.html" --auto-section --client mamas-munches --page homepage --media-map sites/mamas-munches/research/sandybrown-media-map.json --deploy-target page:8`. Deploy plugin (PHP+build/): `python plugins/sgs-blocks/scripts/build-deploy.py --skip-build --allow-dirty` (default target = sandybrown).

## Skills to Invoke
| Skill | When |
|---|---|
| `/brainstorming` | design the chosen front's architecture before coding |
| `/gap-analysis` | grade any output before delivery |
| `/lifecycle` | any skill/agent/pipeline change |
| `/research` | gold-standard reference for the chosen front |
| `/strategic-plan` | order the work if multi-step |
| `/systematic-debugging` | prove each cause on the real draft-vs-live pair before fixing |
| `/qc-council` | validate fix-shapes before dispatch (shared/trust-bearing surfaces — theming, measurement) |
| `/qc-inline` | per-change QC |
| `/sgs-clone` `/sgs-db` `/wp-blocks` | ground truth (block schema, css_property, presets) |
| `/visual-qa` | per-section cropped visual compare |
| `/handoff` `/capture-lesson` | session close |

## MCP Servers & Tools
| Tool | For |
|---|---|
| Playwright / chrome-devtools MCP | live DOM diff (computed-style, matched rules) + the parity tool's capture + visual-diff screenshots |
| Hostinger MCP `hosting_clearWebsiteCacheV1` | CDN clear before any live measure (user u945238940); plus `wp litespeed-purge all` |
| REST app-pwd `.claude/secrets/sandybrown.env` | user `Claude`; pass creds inline (env has unquoted specials — don't `source`) |

## Agents to Delegate To
| Agent | When |
|---|---|
| general-purpose (Sonnet) | parallel read-only investigators / a solo implementer (one writer) for a coupled surface |
| feature-dev:code-reviewer | pre-commit review on any trust-bearing / shared surface |

## Methodology guardrails (do not skip)
- Read the governing spec IN FULL (Spec 31 + the chosen front's spec). Prove every cause on the real draft-vs-live pair before fixing.
- **Fix at the draft, not the clone** for draft-inherited issues (STOP-FIX-DRAFT-NOT-CLONE); a genuine clone divergence is a converter/block fix (R-31-9).
- **Deploy/re-clone before measure** — build + deploy + OPcache + CDN + `wp litespeed-purge all` before any live measurement (STOP-21/CDN).
- The parity tool is trustworthy now — USE it (don't hand-roll); its raw % pairs with Bean's eye, never closes alone (STOP-PARITY-RAW-IS-PAGE-AGNOSTIC).
- Branch appropriately (core SGS = `main`); path-scoped commits (message FILE, `-- <paths>`); block CSS changes need a visual-diff report (STOP-67); no co-author line. `/qc-inline` per change; end with `/handoff`.

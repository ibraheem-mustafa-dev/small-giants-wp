---
doc_type: next-session-prompt
project: small-giants-wp
generated: 2026-07-13
thread: post-D317 — BUILD Spec 33 v0.2 (the draft global-styles extractor, Part 1 of the header/footer setup pipeline). Spec is council-gated + build-ready. Prove on Mama's only.
---

# NEXT SESSION — BUILD Spec 33 v0.2 (draft global-styles extractor, Part 1)

You are the SGS cloning-pipeline developer. **This session (D317) designed + council-gated Part 1 to a build-ready spec.** Bean picked the header/footer setup pipeline as the next front (2 parts: Part 1 = a universal draft→theme global-styles/token extractor that kills the D303 inherited-base drift by construction; Part 2 = header/footer clone, Spec 17, later). Spec 33 is at **v0.2** — a 6-persona `/adversarial-council` GO-conditional was applied in full, and Bean reshaped it to the COMPLETE spine tiered by provenance. **Your job: BUILD it, prove on Mama's ONLY.** Invoke `/autopilot` first.

Read `.claude/handoff.md` (D315/D316/D317) + `.claude/CLAUDE.md` for full context.

## ⛔ MANDATORY READING GATE (read IN FULL before any Write/Edit)
1. `.claude/handoff.md` (D317) + `.claude/decisions.md` head (D317, D316, D315).
2. **Spec 33 IN FULL** (`.claude/specs/33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md`) — the governing spec. Note the ⛔ iron law (computed value wins, declared supplies only the name), the provenance tiering (declared auto / derived advisory), all 13 FRs, the resolved open questions, and Appendix A (the corpus = your acceptance coverage).
3. **Spec 31 IN FULL** (Bean-locked every session) — §3.A CSS routing + the converter's colour token-snap (`styling_helpers._load_theme_palette_map` → `configure_colour_resolution_from_run`) that reads the snapshot Spec 33 GENERATES (bootstrap ordering, FR-33-12).
4. **Spec 26** (`.claude/specs/26-SGS-GLOBAL-STYLES-AND-THEMING.md`) — the theming MODEL Spec 33 feeds; FR-26-C is a FORWARD CONTRACT (inert until Spec 26 Phase 3 — do NOT build a merge against it).
5. **Spec 17** (`.claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md`) — Part 2 sibling; Spec 33 reserves its `settings.custom.header/footer` namespace.
6. `.claude/parking.md` head — `P-DRAFT-TOKEN-EXTRACTION-SETUP-PIPELINE`, `P-DRAFT-CSSVAR-COLOUR-RESOLUTION`+`-SEED-READD` (consume Spec 33's token map), `P-DEAD-NULL-ROLE-CONTROLS`.
7. The existing pieces you MUST reuse/not-break: `plugins/sgs-blocks/scripts/converter/services/styling_helpers.py` (`build_draft_root_colour_map` — FREEZE it byte-identical, FR-33-10), `plugins/sgs-blocks/scripts/push-theme-snapshot.py` (the deploy channel + SAFE_TARGETS), a real `sites/mamas-munches/theme-snapshot.json` (the shape to generate).

## ⛔ ANTI-PATTERN STOPs (carried forward + this session's — NEVER subtract, D101)
- **STOP-33-COMPUTED-VALUE-WINS (NEW, D317 — the iron law of Spec 33)** — the emitted VALUE is ALWAYS the COMPUTED value on a real rendered node, NEVER a raw source declaration; a `:root`/base declaration supplies only the token NAME/ROLE. Reading a `body{}` declaration as "the base" when a wrapper overrides it RE-SHIPS D303 (the bug this spec exists to kill). Base typography = computed on a representative rendered `<p>`; rem resolves against the real computed `documentElement` font-size, never 16. (Spec 33 FR-33-1/33-3.)
- **STOP-33-PASSB-ADVISORY (NEW, D317)** — a DERIVED (Pass B) token is PROVISIONAL/advisory, confidence-scored, NEVER auto-pushed to a live theme without confirmation; role comes from USAGE-CONTEXT (which property, which selector), NEVER raw frequency (frequency inverts a palette — most-frequent = body-text/border, not primary). A draft with nothing usable → the framework baseline UNCHANGED + a loud logged skip, never a silent guess. (FR-33-2/33-5.)
- **STOP-33-DEPLOY-SAFETY (NEW, D317)** — PROVE on Mama's ONLY; the other 5 client snapshots are DEFERRED behind their own reclone + per-client visual/computed-parity. Before any `wp_global_styles` push: fetch-and-back-up the live payload + a one-command `--rollback`; diff live-vs-last-deployed + WARN on operator Site-Editor drift; `--dry-run` → human go/no-go → `--yes` (SAFE_TARGETS). (FR-33-11.)
- **STOP-33-REUSE-BY-COMPOSITION (NEW, D317)** — add a NEW `build_draft_root_token_map()`; keep `build_draft_root_colour_map` (hex-only, feeding the LIVE converter's exact-hex snap + the D307 guard) BYTE-IDENTICAL — a golden asserts it. Widening it re-opens the D306/D307 ghost-border bug. (FR-33-10.)
- **STOP-33-DETERMINISM (NEW, D317)** — re-run on an unchanged draft → BYTE-IDENTICAL snapshot (deterministic sort keys); else the diff-approve review + git are meaningless and drift returns. (FR-33-8.)
- **STOP-33-ORDERING (NEW, D317)** — the extractor is a HARD prerequisite of ANY block clone (the converter snaps against the palette it generates); `/sgs-clone` fails-closed if the snapshot wasn't produced/validated for the current draft hash. (FR-33-12.)
- **STOP-SUBVISIBLE-NEEDS-PREDICATE (D315)** — a clone-fidelity tool's "sub-visible" bucket MUST be gated by a per-pair rendered-INVISIBILITY predicate, never a blanket property-name exclude. (Parity tool, now built + trustworthy.)
- **STOP-PARITY-RAW-IS-PAGE-AGNOSTIC (D315)** — the parity tool is trustworthy now, but its RAW % is page-agnostic (FR-20-2) and reads LOWER than a human-dispositioned ledger by exactly the accepted/out-of-contract set. Read the full mismatch list + apply dispositions; Bean's eye closes (FR-20-7). Never engineer the raw number up.
- **STOP-DEAD-CONTROL-GATE-BLIND (D316)** — `check-dead-controls.js` treats `$attributes['x']` read into a CSS var as "consumed" even when the var is never used in CSS (how the P-DEAD-NULL-ROLE-CONTROLS attrs pass it). Verify the LIVE painted value (STOP-44), not just that render.php reads the attr.
- **STOP-PATH-SCOPED-COMMIT-FORM (D316)** — the wired commit gates require `git commit -F <msgfile> -- <explicit paths>` (message FILE, pathspec form). A bare `git commit` after `git add` is BLOCKED by the path-scope guard. A `src/blocks/**` CSS change ALSO needs a `reports/visual-diff/<block>-<date>.md` (`verdict: PASS` + `first_paint_capture_passed: true`) BEFORE commit (STOP-67, `.git/hooks/pre-commit`). Non-visual block.json/PHP-only: `git commit --no-verify`. (A pure-Python/spec change like Spec 33's build does not hit the visual-diff gate, but DOES hit the F5 cheat/coverage gates + path-scope guard.)
- **STOP-FIX-DRAFT-NOT-CLONE (D313)** — a draft-INHERITED a11y/fidelity issue is fixed at the DRAFT source (edit the mockup, re-clone), never on the clone/converter. A genuine clone DIVERGENCE is a converter/block fix (R-31-9).
- **STOP-VERIFY-CACHE-LAYER-INSTALLED (D312)** — verify a cache/CDN optimiser is installed/active before leaning on it. LiteSpeed IS installed on sandybrown — `wp litespeed-purge all` before any live measure.
- **STOP-SELF-CONSISTENT-RENDER-UNDER-CACHE (D312)** — a delivery needing a cross-request warm-up is frozen by a full-page cache; prefer self-consistent renders; test WITH the cache installed.
- **STOP-STYLE-TAG-IS-NOT-STYLE-ATTR (D311)** — a `<style>` TAG is NOT an inline `style="…"` ATTRIBUTE; Spec 32 §6.1(b) sanctions the block's scoped `<style>`. Check BOTH.
- **STOP-GOLDEN-CAN-BE-STALE (D311)** — prove a converter emit claim with a real-node trace of the CURRENT converter, not by reading a golden. A render-side-only change can't newly break a golden.
- **STOP-VERIFY-COLOUR-HOVER-AND-VS-DRAFT (D310)** — verifying a cloned colour = measure REST + HOVER (`.hover()`) vs the DRAFT's exact rule, never resting-contrast-only.
- **STOP-CSS-VER-CACHE-BUST (D310/D316)** — a `style.css`/`editor.css`-ONLY change is served stale (`?ver` pinned to block.json version) → bump the version (the ONE permitted pre-production bump). Render-side inline/output-buffer changes land fresh.
- **STOP-STANDARDISE-NAMING-FIRST (D309)** — standardise a naming convention across the ecosystem first, then build the mechanism; recognise capability by whether the block DECLARES the attr, never a name-guess.
- **STOP-REGISTER-MECHANISMS-UNRELIABLE** — a pre-diagnosed register lists SYMPTOMS but its CAUSES are often wrong. Prove each cause on the live DOM OR a real-node converter trace FIRST.
- **STOP-CDN-STALE-CACHE** — a block CSS change at an UNCHANGED `?ver` serves stale; `hosting_clearWebsiteCacheV1` (Hostinger MCP, user u945238940) + OPcache web-pool reset + `wp litespeed-purge all` before any live CSS measure.
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
- **STOP-48/49 (LARGELY RESOLVED D315)** — `computed-parity.js` is now trustworthy (rebuilt D315). Still ignore header/footer + the accepted testimonial static-grid→slider when judging fidelity; do NOT trust `leftover-buckets`/`attribute_gap_candidates` as a rendered-fidelity signal.
- **STOP-67** — pre-commit visual-diff report per CHANGED block at repo-ROOT `reports/visual-diff/<block>-<date>.md` (`verdict: PASS` + `first_paint_capture_passed: true`), enforced by `.git/hooks/pre-commit`.
- **safecss strips functional colours (D302)** — any INLINE colour VALUE must be hex/named/var; the scoped `<style>` channel is NOT filtered.
- **Path-scoped commits** — `git commit -F <msgfile> -- <paths>` (message FILE). `git add <file>` for NEW files; never `git add -A`. No version bumps / deprecations pre-production (except a cache-bust bump). No co-author line. Verify branch + D-ceiling before commit.
- **DB seed not in git** — a new block.json attr / `property_suffixes` row needs `/sgs-update --stage 1` (or a dated `migrations/*.py`) to reach the DB.
- **One writer per file** — parallel coding subagents only across DISJOINT files; a SOLO coding subagent (foreground, named files, main-verified) is optimal for a coupled surface.

## Skills to Invoke
| Skill | When |
|---|---|
| `/brainstorming` | design the extractor's module structure before coding (if any structural ambiguity remains after the spec) |
| `/gap-analysis` | grade the built extractor against Spec 33's FRs before delivery |
| `/lifecycle` | any skill/agent/pipeline change |
| `/research` | gold-standard reference (CIEDE2000 lib, tinycss2 cascade resolution) if an implementation detail needs it |
| `/strategic-plan` + `/phase-planner` | order the 13-FR build into a sequence (spine → provenance → safety → ordering) |
| `/systematic-debugging` | prove each extraction on the REAL draft node (STOP-33-COMPUTED-VALUE-WINS) |
| `/qc-council` | validate any fix-shape on a shared/trust-bearing surface (the theme is high-blast-radius) |
| `/qc-inline` | per-change QC |
| `/sgs-clone` `/sgs-db` `/wp-blocks` | ground truth (theme.json slots, palette, the converter's snapshot read) |
| `/visual-qa` | the Mama's reclone proof (D303 gone: quote 16px, heading lh 1.2) |
| `/handoff` `/capture-lesson` | session close |

## MCP Servers & Tools
| Tool | For |
|---|---|
| Playwright / chrome-devtools MCP | THE computed-value reads (getComputedStyle on rendered `<p>`/`<h*>`/`body`/content-container — the iron law) + the Mama's reclone proof |
| Hostinger MCP `hosting_clearWebsiteCacheV1` | CDN clear before any live measure (user u945238940); + `wp litespeed-purge all` |
| REST app-pwd `.claude/secrets/sandybrown.env` | user `Claude`; pass creds inline (env has unquoted specials — don't `source`) |

## Agents to Delegate To
| Agent | When |
|---|---|
| general-purpose (Sonnet) | a SOLO implementer (one writer) for the extractor (a coupled Python surface) + parallel read-only investigators for the corpus goldens |
| feature-dev:code-reviewer | pre-commit review (the extractor writes the shared theme — trust-bearing; the council found 3 unsafe bugs in the parity tool, expect the same rigour here) |

## Build orchestration (macro — /phase-planner will detail)
Suggested sequence (each gated before the next):
1. **Pass A declared extraction, all value types** (FR-33-4) + the role rule-table (FR-33-2) + `build_draft_root_token_map()` by composition (FR-33-10, freeze the hex-only fn + golden) → generate a Mama's snapshot.
2. **Computed-value validation** (FR-33-1/33-3 — the iron law): read computed on rendered nodes, base off a real `<p>`, rem-vs-real-root. This is where D303 dies.
3. **Provenance trace + golden fixtures + schema-validate** (FR-33-7) + **determinism** (FR-33-8) + **conservation** (FR-33-9).
4. **Deploy safety** (FR-33-11 — backup/rollback/diff-approve) + **bootstrap ordering gate** (FR-33-12) + **forward contracts/namespace** (FR-33-13).
5. **Pass B advisory** (FR-33-5) + **dark-theme safety** (FR-33-6) — advisory-gated, lower priority.
6. **PROVE on Mama's:** regenerate the snapshot → `push-theme-snapshot.py --dry-run` diff → deploy → reclone page 8 → live computed-style: brand quote **16px**, heading lh **1.2**, no fabricated letter-spacing (D303 gone). Bean's eye co-signs. Other 5 clients DEFERRED.

**Acceptance:** the Mama's-generated snapshot deploys, a reclone renders the draft base faithfully (D303 gone), every FR's golden diff passes, re-run is byte-identical, `build_draft_root_colour_map` is byte-identical, and NO other client site is touched. Do NOT declare done on emit-green — LANDED = live computed-style on the reclone (STOP-21).

## Methodology guardrails (do not skip)
- Read Spec 33 + Spec 31 IN FULL first. The iron law (STOP-33-COMPUTED-VALUE-WINS) governs every extraction — prove every emitted value on a real rendered node (Playwright computed-style), never a source declaration.
- Deploy/reclone before measure (STOP-21/CDN/LiteSpeed). Prove on Mama's ONLY; the other 5 are deferred (STOP-33-DEPLOY-SAFETY).
- Freeze the live hex-only helper byte-identical (STOP-33-REUSE-BY-COMPOSITION); re-run must be byte-identical (STOP-33-DETERMINISM).
- `feature-dev:code-reviewer` pre-commit (trust-bearing shared theme). Branch `main` (core SGS); path-scoped commits (message FILE, `-- <paths>`); no co-author. Verify branch + D-ceiling. End with `/handoff`.

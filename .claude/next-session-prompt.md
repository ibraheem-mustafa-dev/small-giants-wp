---
doc_type: next-session-prompt
project: small-giants-wp
generated: 2026-07-13
thread: post-D318 — Spec 33 Part 1 BUILT + live-proven. Phase 5 (FR-33-12 ordering gate + docs) then Phase 6 (Pass B advisory + dark-theme + namespace + component-CSS migration).
---

# NEXT SESSION — Spec 33 Part 1 Phases 5-6 (ordering gate + Pass B + migration)

You are the SGS cloning-pipeline developer. **D318 BUILT + live-proved Spec 33 Part 1 (the draft global-styles extractor) — D303 is dead on Mama's by construction.** This session finishes Spec 33: **Phase 5** (the orchestrator fail-closed freshness gate + pipeline/spec-31/CLAUDE.md docs) then **Phase 6** (Pass B advisory derivation, dark-theme safety, header/footer namespace, and migrating the transitional component CSS out of the Mama's snapshot). Invoke `/autopilot` first. The build plan is `.claude/plans/go-parallel-blum.md`.

Read `.claude/handoff.md` (D318) + `.claude/CLAUDE.md` for full context.

## ⛔ MANDATORY READING GATE (read IN FULL before any Write/Edit)
1. `.claude/handoff.md` (D318) + `.claude/decisions.md` head (D318, D317, D316).
2. **Spec 33 IN FULL** (`.claude/specs/33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md`) — now v1.0.0 (built). Note the ⛔ iron law, FR-33-5 (Pass B advisory — Phase 6), FR-33-6 (dark-theme — Phase 6), FR-33-12 (bootstrap ordering — Phase 5), FR-33-13 (forward contracts — Phase 6).
3. **Spec 31 IN FULL** (Bean-locked every session) — §3.A CSS routing + the converter's colour token-snap (`styling_helpers._load_theme_palette_map` → `configure_colour_resolution_from_run`) that reads the snapshot the extractor GENERATES (FR-33-12 ordering, `styling_helpers.py:276` freshness key).
4. The BUILT extractor: `plugins/sgs-blocks/scripts/theme-extractor/` (extract.py orchestrates; palette/typography/presets are the value builders; measure.js is the computed reader). Run its tests first: `cd plugins/sgs-blocks/scripts && python -m pytest theme-extractor/tests -q --import-mode=importlib` (expect 16 green).
5. `.claude/parking.md` head — `P-DRAFT-TOKEN-EXTRACTION-SETUP-PIPELINE` (PARTIAL — the Phase 5-6 remainder), `P-DRAFT-CSSVAR-*` (consume the new `build_draft_root_token_map()` service).
6. The reuse/not-break pieces: `sgs-clone-orchestrator.py` (Stage-0 theme load ~line 2373, conversion ~line 2416 — where the FR-33-12 gate goes), `push-theme-snapshot.py` (now has --backup/--rollback).
7. The FROZEN helper `converter/services/styling_helpers.py::build_draft_root_colour_map` (golden-guarded, byte-identical — never widen) + the extractor's `expected/*.snapshot.json` + `mamas-hex-colour-map.json` goldens (your regression net — a Pass B / gate change must keep them + the 16 tests green).

**First action (single next step):** run `cd plugins/sgs-blocks/scripts && python -m pytest theme-extractor/tests -q --import-mode=importlib` (expect 16 green) to confirm the built extractor is intact, THEN start Task 1 (the FR-33-12 orchestrator freshness gate) with a `/qc-council` on the fix-shape first.

## ⛔ ANTI-PATTERN STOPs (carried forward + this session's — NEVER subtract, D101)
- **STOP-PRESERVE-ALPHA (NEW, D318)** — serialising a computed colour MUST preserve alpha: transparent(0)→"transparent", partial→rgba, opaque→hex. Dropping it turned the draft's transparent buttons opaque BLACK live. Branch on alpha; never assume opaque. (`feedback_preserve_alpha_when_serialising_computed_colour`.)
- **STOP-MEASURE-LIVE-BEFORE-CUTOVER (NEW, D318)** — before a prove-the-fix-live deploy, MEASURE the current live state first: the symptom may already be fixed (change is STRUCTURAL not visible → tell Bean) AND a clean cutover may drop load-bearing hand-authored CSS. (`feedback_measure_live_before_prove_the_fix_cutover`.)
- **STOP-MERGE-FULL-NOT-PARTIAL (NEW, D318)** — `push-theme-snapshot` SCPs the snapshot AS the server theme.json (FULL replacement). Deploy a FULL baseline-overlaid snapshot; NEVER a partial or generated-onto-partial merge (strips customTemplates/appearanceTools/borderRadius — 136 keys). extract.py deep-copies the baseline → it's already full; keep it that way.
- **STOP-33-COMPUTED-VALUE-WINS (D317, SHIPPED — keep enforcing)** — the emitted VALUE is ALWAYS the COMPUTED value on a real rendered node, never a raw source declaration; a `:root`/base declaration supplies only the NAME/ROLE. Reading `body{}`/a section override as "the base" re-ships D303 (base typography = computed on a representative rendered `<p>`; heading lh = MODE across non-chrome headings, hero excluded). (Spec 33 FR-33-1/3.)
- **STOP-33-PASSB-ADVISORY (D317 — Phase 6 GATE)** — a DERIVED (Pass B) token is PROVISIONAL/advisory, confidence-scored, NEVER auto-pushed live without confirmation; role from USAGE-CONTEXT (which property/selector), NEVER raw frequency (frequency inverts a palette). Nothing usable → framework baseline UNCHANGED + loud logged skip; parser-fail → HALT. (FR-33-5.)
- **STOP-33-DEPLOY-SAFETY (D317)** — the other 5 client snapshots are DEFERRED behind their own reclone + per-client visual/computed-parity. Before any `wp_global_styles` push: --backup (now default-on) + `--dry-run` diff → human go/no-go → `--yes`; drift-warn on operator Site-Editor edits. (FR-33-11.)
- **STOP-33-REUSE-BY-COMPOSITION (D317, SHIPPED)** — `build_draft_root_token_map()` is the NEW composed service; `build_draft_root_colour_map` (hex-only) stays BYTE-IDENTICAL — a golden asserts it. Widening it re-opens D306/D307. (FR-33-10.)
- **STOP-33-DETERMINISM (D317, SHIPPED)** — re-run on an unchanged draft → BYTE-IDENTICAL snapshot; else the diff-approve review + git are meaningless. (FR-33-8.)
- **STOP-33-ORDERING (D317 — Phase 5 BUILD)** — the extractor is a HARD prerequisite of ANY block clone (the converter snaps against the palette it generates); `/sgs-clone` MUST fail-closed if the snapshot wasn't produced/validated for the current draft hash. (FR-33-12.)
- **STOP-FIX-DRAFT-NOT-CLONE (D313)** — a draft-INHERITED a11y/fidelity issue is fixed at the DRAFT source (edit mockup, re-clone), never on the clone/converter. A genuine clone DIVERGENCE = a converter/block fix (R-31-9).
- **STOP-VERIFY-CACHE-LAYER-INSTALLED (D312)** — verify a cache/CDN optimiser is installed/active before leaning on it. LiteSpeed IS installed on sandybrown — `wp litespeed-purge all` before any live measure.
- **STOP-STYLE-TAG-IS-NOT-STYLE-ATTR (D311)** — a `<style>` TAG is NOT an inline `style="…"` ATTRIBUTE; Spec 32 §6.1(b) sanctions the block's scoped `<style>`. Check BOTH.
- **STOP-GOLDEN-CAN-BE-STALE (D311)** — prove a converter emit claim with a real-node trace of the CURRENT converter, not by reading a golden. A render-side-only change can't newly break a golden.
- **STOP-VERIFY-COLOUR-HOVER-AND-VS-DRAFT (D310)** — verifying a cloned colour = measure REST + HOVER (`.hover()`) vs the DRAFT's exact rule, never resting-contrast-only.
- **STOP-CSS-VER-CACHE-BUST (D310/D316)** — a `style.css`/`editor.css`-ONLY change is served stale (`?ver` pinned to block.json version) → bump the version (the ONE permitted pre-production bump). Render-side inline/output-buffer + wp_global_styles POST land fresh.
- **STOP-STANDARDISE-NAMING-FIRST (D309)** — standardise a naming convention across the ecosystem first, then build the mechanism; recognise capability by whether the block DECLARES the attr, never a name-guess.
- **STOP-REGISTER-MECHANISMS-UNRELIABLE** — a pre-diagnosed register lists SYMPTOMS but its CAUSES are often wrong. Prove each cause on the live DOM OR a real-node converter trace FIRST.
- **STOP-CDN-STALE-CACHE** — a block CSS change at an UNCHANGED `?ver` serves stale; `hosting_clearWebsiteCacheV1` (Hostinger MCP, user u945238940) + OPcache web-pool reset + `wp litespeed-purge all` before any live CSS measure.
- **STOP-16** — a subagent/"it works"/build-green is a HYPOTHESIS. Re-run yourself: `python -m pytest theme-extractor/tests -q` + (if converter touched) `python -m pytest converter/tests scripts/tests -q --import-mode=importlib`. Node/npm via PowerShell (nvm shim broken in Git Bash).
- **STOP-21** — emit-green ≠ LANDED. LANDED = deploy/reclone + OPcache + CDN + LiteSpeed clear + live computed-style.
- **STOP-static-vs-live** — for "does this class/style land/apply?" use the LIVE DOM (Playwright computed-style / matched-rules), NEVER static PHP/CSS parsing.
- **STOP-34** — verify a converter fix on the REAL draft node, not a synthetic fixture.
- **STOP-D228** — a framework default overriding the draft's faithfully-ABSENT/present value is a CHEAT to REMOVE/GATE. Universal (R-31-9).
- **STOP-WP-CORE-SERIALISATION (D306)** — a schema-valid emitted `style.*` value can be DROPPED by WP-core if the property definition lacks `css_vars`. Emit a form WP serialises.
- **STOP-COLOUR-SLUG-VALIDATION (D308)** — never emit a bare `var()` capture as a colour slug without validating it exists in the theme palette.
- **STOP-VERIFY-CLAIM** — do NOT assert "X isn't recognised / lacks Z" from a failed grep. Verify against emitted markup / render code / live DOM first.
- **STOP-60** — a converter change adding attrs changes conformance goldens (reseed deliberately + cited). A render-side-only change does NOT change the emit.
- **STOP-44** — a schema-valid emitted attr can be a render no-op; verify the LIVE painted value.
- **STOP-48/49 (RESOLVED D315)** — `computed-parity.js` is trustworthy; still ignore header/footer + the accepted testimonial static-grid→slider when judging fidelity.
- **STOP-SUBVISIBLE-NEEDS-PREDICATE (D315, carried)** — a clone-fidelity tool's "sub-visible" bucket MUST be gated by a per-pair rendered-INVISIBILITY predicate, never a blanket property-name exclude.
- **STOP-PARITY-RAW-IS-PAGE-AGNOSTIC (D315, carried)** — the parity tool's RAW % is page-agnostic (FR-20-2), reads LOWER than a human-dispositioned ledger by the accepted/out-of-contract set; apply dispositions + Bean's eye, never engineer the raw number up.
- **STOP-DEAD-CONTROL-GATE-BLIND (D316, carried)** — `check-dead-controls.js` treats `$attributes['x']` read into a CSS var as "consumed" even when the var is never used in CSS. Verify the LIVE painted value (STOP-44).
- **STOP-SELF-CONSISTENT-RENDER-UNDER-CACHE (D312, carried)** — a delivery needing a cross-request warm-up is frozen by a full-page cache; prefer self-consistent renders; test WITH the cache installed.
- **STOP-67** — pre-commit visual-diff report per CHANGED block at repo-ROOT `reports/visual-diff/<block>-<date>.md` (`verdict: PASS` + `first_paint_capture_passed: true`), enforced by `.git/hooks/pre-commit`. (A pure-Python/spec/data change does NOT hit this gate — use `--no-verify` — but DOES hit the path-scope guard.)
- **safecss strips functional colours (D302)** — any INLINE colour VALUE must be hex/named/var; the scoped `<style>` channel is NOT filtered.
- **Path-scoped commits** — `git commit -F <msgfile> -- <paths>` (message FILE, explicit pathspec — a bare `git commit` is BLOCKED by the path-scope gate even with `--no-verify`). `git add <file>` for NEW files; never `git add -A`. No version bumps / deprecations pre-production (except a cache-bust bump). No co-author. Verify branch + D-ceiling before commit.
- **DB seed not in git** — a new block.json attr / `property_suffixes` row needs `/sgs-update --stage 1` (or a dated `migrations/*.py`) to reach the DB. (Spec 33 reserves a theme.json namespace, not a DB row — likely no DB seed; confirm.)
- **One writer per file** — parallel coding subagents only across DISJOINT files; a SOLO coding subagent (foreground, named files, main-verified) is optimal for a coupled surface like the orchestrator gate.

## Skills to Invoke
| Skill | When |
|---|---|
| `/brainstorming` | design the FR-33-12 gate placement + Pass B advisory shape before coding (if any ambiguity remains after the spec) |
| `/strategic-plan` + `/phase-planner` | order Phase 5-6 (gate → docs → Pass B → dark-theme → namespace → migration) |
| `/gap-analysis` | grade the completed Spec 33 against ALL 13 FRs before declaring done |
| `/lifecycle` | any skill/agent/pipeline change |
| `/research` | gold-standard reference (theme.json fluid, WP global-styles cascade) if an implementation detail needs it |
| `/systematic-debugging` | prove each fix on the REAL draft node / live DOM (STOP-33-COMPUTED-VALUE-WINS) |
| `/qc-council` | validate any fix-shape on the shared theming/orchestrator surface (high-blast-radius) |
| `/qc-inline` | per-change QC |
| `/sgs-clone` `/sgs-db` `/wp-blocks` | ground truth (orchestrator stages, theme palette, the converter's snapshot read) |
| `/visual-qa` | any live reclone proof |
| `/handoff` `/capture-lesson` | session close |

## MCP Servers & Tools
| Tool | For |
|---|---|
| Playwright / chrome-devtools MCP | THE computed-value reads (getComputedStyle on rendered nodes) + any live reclone proof |
| Hostinger MCP `hosting_clearWebsiteCacheV1` | CDN clear before any live measure (user u945238940); + `wp litespeed-purge all` |
| REST app-pwd `.claude/secrets/sandybrown.env` | user `Claude`; pass creds inline (env has unquoted specials — don't `source`) |

## Agents to Delegate To
| Agent | When |
|---|---|
| general-purpose (Sonnet) | a SOLO implementer for the orchestrator FR-33-12 gate (coupled surface); parallel read-only investigators for corpus goldens / other-client audit |
| feature-dev:code-reviewer | pre-commit review of the orchestrator gate + Pass B (shared/trust-bearing surfaces) |

## Task orchestration (Phase 5-6)
1. **Task 1 — FR-33-12 orchestrator freshness gate** (inline/Opus or solo Sonnet). Insert a fail-closed gate in `sgs-clone-orchestrator.py` after Stage-0 theme load (~line 2373), before conversion (~line 2416): halt if `theme-snapshot.json` wasn't produced/validated by the extractor for the current draft's CSS hash (persist a `(client_slug, hash(css))` freshness record; reuse the pattern at `styling_helpers.py:276`). Acceptance: a stale/absent generated snapshot fails-closed with a clear message; a fresh one proceeds. `/qc-council` first (shared pipeline surface). **Depends on:** none. **Parallel with:** Task 2 (docs).
2. **Task 2 — Pipeline/spec docs** (Haiku/Sonnet). Add the extractor as the opening pipeline step to `cloning-pipeline-flow.md`/`-stages.md`; note in Spec 31 §3.A that the palette the converter snaps against is generated by Spec 33 + the FR-33-12 gate; add the extractor + bootstrap-ordering to `../CLAUDE.md`. **Parallel with:** Task 1.
3. **Task 3 — Pass B advisory + dark-theme** (inline/Opus). FR-33-5 derived tokens (`_source:derived`+confidence, `advisory`, never auto-live; relative-share-within-role threshold; nothing-usable→baseline+skip; parser-fail→HALT) + FR-33-6 dark-theme/preview-shell safety (background from the widest content-containing ancestor; preview-shell only on a POSITIVE structural signal). `/qc-council` first. **Depends on:** Task 1. **/qc gate after:** yes.
4. **Task 4 — FR-33-13 namespace + migration** (Sonnet). Reserve `settings.custom.header`/`.footer`; re-point `P-DRAFT-CSSVAR-*` at `build_draft_root_token_map()`; **migrate the transitional component `styles.css` (buttons/hero-CTA/focus-ring) out of the Mama's snapshot into theme/block CSS**, re-verify no regression live. **Depends on:** Task 3.
5. **Close** — `/gap-analysis` the completed Spec 33 vs all 13 FRs; `/handoff`.

## Dependency graph
```
Task 1 (gate, Opus/Sonnet) ── /qc-council
Task 2 (docs, Haiku/Sonnet)   ┘ (parallel)
        ↓
Task 3 (Pass B + dark-theme, Opus) ── /qc-council → /qc-inline gate
        ↓
Task 4 (namespace + component-CSS migration, Sonnet) ── live re-verify
        ↓
/gap-analysis (all 13 FRs) → commit + merge-to-main → /handoff
```

## Methodology guardrails (do not skip)
- **Deploy/reclone/clear-caches before any live measure** (STOP-21/CDN/LiteSpeed). Prove on Mama's ONLY; other 5 deferred (STOP-33-DEPLOY-SAFETY).
- **Root cause before instance fix** — prove each cause on the live DOM OR a real-node converter trace first (STOP-REGISTER-MECHANISMS-UNRELIABLE / STOP-static-vs-live).
- **Outcome vs completion** — Spec 33 is "done" only when ALL 13 FRs land (the FULL spec scope, STOP-29), not when Phase 5 ships. Map every deferral to a named FR/stage.
- **`/qc-council` BEFORE any commit** touching the orchestrator / shared theming surface (blub.db 255). Freeze the hex-only helper byte-identical (golden). Re-run must be byte-identical.
- **Path-scoped commits** (message FILE, `-- <paths>`); no co-author; verify branch (`main`) + D-ceiling first. Pure-Python/spec/data → `--no-verify` (no visual-diff gate) but still hits the path-scope guard. End with `/handoff`.

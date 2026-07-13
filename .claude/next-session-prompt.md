---
doc_type: next-session-prompt
project: small-giants-wp
generated: 2026-07-13
thread: post-D322 — Spec 33 Part 1 COMPLETE (13/13 FRs). Next: other-5-client extractor rollout + Part 2 (header/footer clone, Spec 17).
---

# NEXT SESSION — Spec 33 rollout to the other 5 clients + Part 2 (header/footer clone)

You are the SGS cloning-pipeline developer. **Spec 33 Part 1 (the draft global-styles extractor) is COMPLETE — all 13 FRs shipped + live-proven on Mama's (D320/D321/D322).** This session rolls the extractor out to the other 5 client snapshots (each behind its OWN reclone — FR-33-11), then begins **Part 2** (the header/footer clone, Spec 17). Invoke `/autopilot` first.

Read `.claude/handoff.md` (D320-322) + `.claude/CLAUDE.md` for full context.

## ⛔ MANDATORY READING GATE (read IN FULL before any Write/Edit)
1. `.claude/handoff.md` (D320-322) + `.claude/decisions.md` head (D322, D321, D320).
2. **Spec 33 IN FULL** (`.claude/specs/33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md`) — now v1.1.0 COMPLETE. Note FR-33-11 (Mama's-ONLY proof; other clients each need their own reclone + parity — a snapshot-push without a reclone = the D318/D319 pink regression) + FR-33-13 (the header/footer namespace reserved for Part 2 + the reconciliation note).
3. **Spec 31 IN FULL** (Bean-locked every session) — the block pipeline the reclone drives.
4. **Spec 17 IN FULL** (`.claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md`) before ANY Part 2 work — its BUILT model drives header/footer via the Customiser + inline `wp_head` CSS + a JS-measured `--sgs-header-height`, NOT the `settings.custom.header`/`.footer` namespace Part 1 reserved. The tokenise-vs-Customiser decision is Part 2's first design-gate.
5. The BUILT extractor: `plugins/sgs-blocks/scripts/theme-extractor/`. Run its tests first: `cd plugins/sgs-blocks/scripts && python -m pytest theme-extractor/tests -q --import-mode=importlib` (expect 26 green).
6. `.claude/parking.md` head — `P-DRAFT-TOKEN-EXTRACTION-SETUP-PIPELINE` (now Part-1-complete; residual = other-5 rollout + Part 2), `P-DRAFT-CSSVAR-*` (consume `token_map.build_draft_root_token_map()`).

**First action (single next step):** run `cd plugins/sgs-blocks/scripts && python -m pytest theme-extractor/tests -q --import-mode=importlib` (expect 26 green), THEN pick a client for the first rollout (indus-foods is the most-built) and read its draft + `sites/<client>/CLAUDE.md`.

## ⛔ ANTI-PATTERN STOPs (carried forward + this session's — NEVER subtract, D101)
- **STOP-EMBED-FRESHNESS-IN-GATED-FILE (NEW, D320)** — a freshness/staleness gate MUST read the key from the EXACT file the consumer reads (embedded `_sgsExtractor.draft_css_sha256` in `theme-snapshot.json`), NOT a sibling record that can drift from it. A code-review caught the first design tying freshness to `theme-snapshot.generated.json` while the converter reads `theme-snapshot.json`. Extends STOP-21.
- **STOP-COUNCIL-SPEC-AUTHORITY (NEW, D321)** — when two council raters split (forensics "safe to drop" vs spec-lawyer "spec violation"), the SPEC is authoritative. Dropping `hover-transform` was blast-radius-safe but violated FR-33-4's open-bag "captured whole" contract; correct closure = the consumer paints it, not the producer filters it.
- **STOP-MARKER-NEEDS-PATH-NOT-JUST-SELECTOR (NEW, D321)** — a "which selector matched" signal cannot LOCATE an element; to exclude a shell/wrapper by ancestry you must capture its DOM path. `measure.js` previewShellMarkers now records `{selector, path}`.
- **STOP-GLOBAL-RULE-BELONGS-IN-THEME-ASSET-NOT-SNAPSHOT (NEW, D322)** — the client's deployed `theme.json` IS the snapshot (full replace), so a FRAMEWORK-wide rule (global focus-visible) must live in a theme ASSET CSS (`assets/css/utilities.css`), not the client snapshot. Only client-specific values belong in the snapshot.
- **STOP-DEAL-WITH-FOLLOWUPS-NOW (NEW, D322, Bean)** — do not accumulate follow-ups; deal with them THIS session (small tasks / decisions especially), or explicitly as the next-session task. Use subagents if context is a concern.
- **STOP-PALETTE-ADDITIVE (D319)** — a regenerated theme palette deployed to an ALREADY-CLONED site MUST be additive: keep each colour's raw draft-token-name slug, emit ALL declared tokens, `extract.py --merge-onto <existing>`. A rename/drop/subset breaks every block referencing the old slug → cream. NEVER a straight palette replace; gate a palette change by a reclone (FR-33-11/12).
- **STOP-PRESERVE-ALPHA (D318)** — serialising a computed colour MUST preserve alpha (transparent→"transparent", partial→rgba, opaque→hex). Dropping it turned transparent buttons opaque BLACK.
- **STOP-MEASURE-LIVE-BEFORE-CUTOVER (D318)** — before a prove-the-fix-live deploy, MEASURE the current live state first (the symptom may already be fixed; a cutover may drop load-bearing hand-authored CSS).
- **STOP-33-COMPUTED-VALUE-WINS (D317)** — the emitted VALUE is ALWAYS the COMPUTED value on a real rendered node; a `:root`/base declaration supplies only the NAME/ROLE. Reading `body{}`/a section override as "the base" re-ships D303.
- **STOP-33-PASSB-ADVISORY (D317/D321 SHIPPED)** — a DERIVED (Pass B) token is PROVISIONAL/advisory, confidence-scored, NEVER auto-pushed live without confirmation; role from USAGE-CONTEXT, never raw frequency. Nothing usable → framework baseline UNCHANGED + logged skip; parser-fail → HALT.
- **STOP-33-DEPLOY-SAFETY / FR-33-11 (D317)** — the other 5 client snapshots are DEFERRED behind their own reclone + per-client visual/computed-parity. Before any `wp_global_styles` push: `--backup` (default-on) + diff → human go/no-go → `--yes`. NEVER a snapshot-only push of a regenerated palette to a client whose pages aren't re-cloned in the same change.
- **STOP-33-DETERMINISM (D317 SHIPPED)** — re-run on an unchanged draft → BYTE-IDENTICAL snapshot.
- **STOP-33-ORDERING / FR-33-12 (D320 SHIPPED)** — the extractor is a HARD prerequisite of ANY block clone; `/sgs-clone` fails-closed if the deployed snapshot's `_sgsExtractor` hash ≠ the current draft (`--skip-freshness-gate` for extract-only runs only).
- **STOP-FIX-DRAFT-NOT-CLONE (D313)** — a draft-INHERITED a11y/fidelity issue is fixed at the DRAFT source (edit mockup, re-clone), never on the clone/converter.
- **STOP-VERIFY-CACHE-LAYER-INSTALLED (D312/D322)** — LiteSpeed v7.8.1 IS active on sandybrown; `wp litespeed-purge all` + OPcache + CDN (`hosting_clearWebsiteCacheV1`) before ANY live CSS measure.
- **STOP-STYLE-TAG-IS-NOT-STYLE-ATTR (D311)** — a `<style>` TAG is NOT an inline `style="…"` ATTRIBUTE; check BOTH.
- **STOP-GOLDEN-CAN-BE-STALE (D311)** — prove a converter emit with a real-node trace of the CURRENT converter, not by reading a golden.
- **STOP-VERIFY-COLOUR-HOVER-AND-VS-DRAFT (D310)** — verifying a cloned colour = measure REST + HOVER (`.hover()`) vs the DRAFT's exact rule, never resting-contrast-only.
- **STOP-CSS-VER-CACHE-BUST (D310/D316/D322)** — a `style.css`/`editor.css`-ONLY change is served stale (`?ver` pinned to the block/theme version) → bump the version (button block.json / theme style.css Version). Render-side inline + wp_global_styles POST land fresh.
- **STOP-STANDARDISE-NAMING-FIRST (D309)** — standardise a naming convention across the ecosystem first, then build the mechanism.
- **STOP-REGISTER-MECHANISMS-UNRELIABLE** — a pre-diagnosed register lists SYMPTOMS but its CAUSES are often wrong. Prove each cause on the live DOM OR a real-node converter trace FIRST.
- **STOP-16** — a subagent/"it works"/build-green is a HYPOTHESIS. Re-run yourself: `python -m pytest theme-extractor/tests -q` + (converter touched) `python -m pytest converter/tests tests -q --import-mode=importlib`. Node/npm via PowerShell (nvm shim broken in Git Bash).
- **STOP-21** — emit-green ≠ LANDED. LANDED = deploy/reclone + OPcache + LiteSpeed + CDN clear + live computed-style.
- **STOP-static-vs-live** — for "does this class/style land/apply?" use the LIVE DOM (Playwright computed-style / matched-rules), NEVER static PHP/CSS parsing.
- **STOP-34** — verify a converter fix on the REAL draft node, not a synthetic fixture.
- **STOP-D228** — a framework default overriding the draft's faithfully-ABSENT/present value is a CHEAT to REMOVE/GATE. Universal (R-31-9).
- **STOP-WP-CORE-SERIALISATION (D306)** — a schema-valid emitted `style.*` value can be DROPPED by WP-core if the property definition lacks `css_vars`.
- **STOP-COLOUR-SLUG-VALIDATION (D308)** — never emit a bare `var()` capture as a colour slug without validating it exists in the theme palette.
- **STOP-VERIFY-CLAIM** — do NOT assert "X isn't recognised / lacks Z" from a failed grep. Verify against emitted markup / render code / live DOM first.
- **STOP-60** — a converter change adding attrs changes conformance goldens (reseed deliberately + cited). A render-side-only change does NOT change the emit.
- **STOP-44** — a schema-valid emitted attr can be a render no-op; verify the LIVE painted value.
- **STOP-48/49 (RESOLVED D315)** — `computed-parity.js` is trustworthy; still ignore header/footer + the accepted testimonial static-grid→slider when judging fidelity.
- **STOP-SUBVISIBLE-NEEDS-PREDICATE (D315)** — a clone-fidelity tool's "sub-visible" bucket MUST be gated by a per-pair rendered-INVISIBILITY predicate, never a blanket property-name exclude.
- **STOP-PARITY-RAW-IS-PAGE-AGNOSTIC (D315)** — the parity tool's RAW % is page-agnostic; apply dispositions + Bean's eye, never engineer the raw number up.
- **STOP-67** — pre-commit visual-diff report per CHANGED block at repo-ROOT `reports/visual-diff/<block>-<date>.md` (`verdict: PASS` + `first_paint_capture_passed: true`). Pure-Python/spec/data → `--no-verify` (no visual-diff gate) but DOES hit the path-scope guard.
- **safecss strips functional colours (D302)** — any INLINE colour VALUE must be hex/named/var; the scoped `<style>` channel is NOT filtered.
- **Path-scoped commits** — `git commit -F <msgfile> -- <paths>` (message FILE, explicit pathspec). `git add <file>` for NEW files; never `git add -A`. No co-author. Verify branch (`main`) + D-ceiling before commit.
- **DB seed not in git** — a new block.json attr / `property_suffixes` row needs `/sgs-update --stage 1` (or a dated `migrations/*.py`) to reach the DB.
- **One writer per file** — parallel coding subagents only across DISJOINT files; a SOLO coding subagent (foreground, named files, main-verified) is optimal for a coupled surface.

## Skills to Invoke
| Skill | When |
|---|---|
| `/brainstorming` | design the Part 2 header/footer approach + the tokenise-vs-Customiser decision (FR-33-13) before coding |
| `/gap-analysis` | grade each client rollout before declaring it done; grade the Part 2 design |
| `/lifecycle` | any skill/agent/pipeline change |
| `/research` | gold-standard reference (WP template parts, header patterns) for Part 2 |
| `/strategic-plan` + `/phase-planner` | order the 5-client rollout + Part 2 phases |
| `/systematic-debugging` | prove each per-client fidelity issue on the REAL draft node / live DOM |
| `/qc-council` | validate any fix-shape on the shared theming/converter surface (high-blast-radius) |
| `/qc-inline` | per-change QC |
| `/sgs-clone` `/sgs-db` `/wp-blocks` | ground truth (reclone each client, DB schema) |
| `/visual-qa` | every per-client reclone proof |
| `/handoff` `/capture-lesson` | session close |

## MCP Servers & Tools
| Tool | For |
|---|---|
| Playwright / chrome-devtools MCP | THE computed-value reads (getComputedStyle on rendered nodes) + every live reclone proof |
| Hostinger MCP `hosting_clearWebsiteCacheV1` | CDN clear before any live measure (user u945238940); + `wp litespeed-purge all` + OPcache |
| REST app-pwd `.claude/secrets/sandybrown.env` | user `Claude`; pass creds inline (env has unquoted specials — don't `source`) |

## Agents to Delegate To
| Agent | When |
|---|---|
| general-purpose (Sonnet) | per-client reclone investigators (live DOM fidelity per client, disjoint) + the deploy+verify mechanics |
| feature-dev:code-reviewer | pre-commit review of any shared converter/theming surface change |
| wp-sgs-developer | heavy Part 2 header/footer template-part build |

## Task orchestration (rollout + Part 2)
1. **Task 1 — roll the extractor out to indus-foods** (inline/Opus + Sonnet reclone). Run the extractor on the indus-foods draft → generate + merge-onto its snapshot → RECLONE its pages via `/sgs-clone` (the FR-33-12 gate now requires it) → live visual + computed-parity (Stage 11.6) → Bean's eye. **Depends on:** none. **/qc gate after:** yes (visual-qa). Repeat per client (helping-doctors, + 3) — each its OWN reclone + parity (STOP-33-DEPLOY-SAFETY).
2. **Task 2 — Part 2 design-gate (header/footer clone, Spec 17)** (inline/Opus, `/brainstorming`). FIRST resolve FR-33-13's tokenise-vs-Customiser question (Spec 17's built model = Customiser + JS-measured height; Part 1 reserved the `settings.custom.header`/`.footer` namespace). Then design the draft→template-part header/footer converter. **Depends on:** Task 1 proving the extractor generalises. **Design-gate + Bean approval before building** (R-31 shared-mechanism rule).
3. **Close** — `/gap-analysis` each rollout + the Part 2 design; `/handoff`.

## Dependency graph
```
Task 1 (indus-foods rollout, Opus+Sonnet) ── /visual-qa ── repeat per client
        ↓
Task 2 (Part 2 header/footer design-gate, Opus) ── /brainstorming → Bean approval
        ↓
/gap-analysis → commit + /handoff
```

## Methodology guardrails (do not skip)
- **Deploy/reclone/clear-caches before any live measure** (STOP-21/CDN/LiteSpeed). Each client proven on its OWN reclone; NEVER a snapshot-only push (STOP-33-DEPLOY-SAFETY / the D318/D319 pink regression).
- **Root cause before instance fix** — prove each cause on the live DOM OR a real-node converter trace first (STOP-REGISTER-MECHANISMS-UNRELIABLE / STOP-static-vs-live).
- **Outcome vs completion** — a client rollout is "done" only when its pages RECLONE + pass parity + Bean's eye, not when the snapshot regenerates (STOP-21).
- **`/qc-council` BEFORE any commit** touching the converter / shared theming surface (blub.db 255). Freeze the hex-only helper byte-identical. Re-run must be byte-identical.
- **Path-scoped commits** (message FILE, `-- <paths>`); no co-author; verify branch (`main`) + D-ceiling first. End with `/handoff`.

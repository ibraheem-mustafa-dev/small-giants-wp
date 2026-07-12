---
doc_type: next-session-prompt
project: small-giants-wp
generated: 2026-07-12
thread: post-D312/D313 — (1) confirm 100% clone via draft-vs-live DOM diff; (2) rebuild the parity tool to be universally trustworthy
---

# NEXT SESSION — prove the clone is 100%, then make the parity tool actually measure it

You are the SGS cloning-pipeline developer. The `<style>`-tag consolidation shipped (D312) and the page-8 a11y items were fixed at the DRAFT source + re-cloned (D313). Bean now wants two things, in order: **(1)** a THOROUGH, assumption-free DOM comparison between the draft and the live clone to confirm we have a genuine 100% clone (he believes we do visually — verify it, don't assume); **(2)** rebuild the computed-parity tool so it ACTUALLY works — universal for any draft/blocks, matching tags + classes + elements + content + CSS, with pinpoint accuracy Bean can trust (no cheating to just pass this one page). Invoke `/autopilot` first.

Read `.claude/handoff.md` + `.claude/CLAUDE.md` for full context.

## ⛔ MANDATORY READING GATE (read IN FULL before any Write/Edit)
1. `.claude/handoff.md` (D312/D313) + `.claude/decisions.md` head (D313, D312, D311).
2. **Spec 31 IN FULL** (Bean-locked every session) — §3.A CSS routing, §13.4 FR-31-5.2, §13.6 composite-mirror + D294, FR-31-22 box-object, §7b, the cheat catalogue.
3. **Spec 20 (`.claude/specs/20-CLONE-FIDELITY-MEASUREMENT.md`) IN FULL** — the CANONICAL spec for the parity tool Task 2 rebuilds (v1.0.0, FR-20-1..8). It already defines: FR-20-1 effective-value **content-matched** comparison (`getComputedStyle`, keyed by text content NOT class), FR-20-2 universal draft-agnostic capture, FR-20-4 unmatched-element surfacing, FR-20-6 documented-limits-not-silent-gaps, FR-20-8 Stage 11.6 wiring. Read what it CLAIMS vs what the tool DOES (it over-counts — STOP-48/49). **Note:** Bean's ask (match tags + classes + elements + content + CSS) is BROADER than Spec 20 v1.0.0 (computed-CSS-focused) → Task 2 AMENDS Spec 20 first (spec-first, like Spec 32 this session), then builds to it.
4. `.claude/parking.md` head — `P-PATTERNS-USE-CORE-BLOCKS`, `P-DRAFT-TOKEN-EXTRACTION-SETUP-PIPELINE`, `P-PAGE8-DISCREPANCY-REGISTER`.
5. The parity tool source: `plugins/sgs-blocks/scripts/parity/computed-parity.js` + how Stage 11.6 calls it in `sgs-clone-orchestrator.py`.

## ⛔ ANTI-PATTERN STOPs (carried forward + this session's — NEVER subtract, D101)
- **STOP-FIX-DRAFT-NOT-CLONE (NEW, D313)** — an a11y/fidelity issue that is INHERITED FROM THE DRAFT is fixed at the DRAFT source (edit the mockup, then re-clone), NEVER patched on the clone and NEVER via a converter carve-out (Bean-locked: "we should not depart from the draft at all"). The clone stays a faithful mirror of the (corrected) draft. Verify the draft actually has the issue before deciding (a draft-inherited issue vs a clone bug are handled differently).
- **STOP-PARITY-NOT-A-MEASURE (D309, ELEVATED)** — the CURRENT computed-parity % is NOT trustworthy (over-counts font-stacks + clone-only props; STOP-48/49). Task 2 is to FIX this so the number CAN be trusted. Until it is fixed + Bean-validated, do NOT cite the aggregate % as an outcome; the signal is a direct per-element compare (matched by content) + Bean's eye.
- **STOP-VERIFY-CACHE-LAYER-INSTALLED (D312)** — before leaning on a cache/CDN optimiser, VERIFY it is installed/active (`wp plugin list`, response headers). LiteSpeed Cache IS now installed on sandybrown (page cache active) — `wp litespeed-purge all` before any live measure.
- **STOP-SELF-CONSISTENT-RENDER-UNDER-CACHE (D312)** — a delivery whose correctness needs a cross-request "warm up" is frozen by a full-page cache (reproduced live). Prefer a design where every render is self-consistent. Test WITH the cache layer installed.
- **STOP-STYLE-TAG-IS-NOT-STYLE-ATTR (D311)** — a `<style>` TAG is NOT an inline `style="…"` ATTRIBUTE; Spec 32 §6.1(b) sanctions the block's own scoped `<style>`. Check BOTH `style=` attributes AND `<style>`/`<link>` placement.
- **STOP-GOLDEN-CAN-BE-STALE (D311)** — a committed conformance golden can be STALE; prove a converter emit claim with a real-node trace of the CURRENT converter, not by reading a golden. A render-side-only change can't newly break a golden.
- **STOP-VERIFY-COLOUR-HOVER-AND-VS-DRAFT (D310)** — verifying a cloned colour = measure REST **and** HOVER (`.hover()`) vs the DRAFT's exact rule, never resting-contrast-only. A composite's own `style.css .block .sgs-x--y` (0,2,0) overrides the shared channel.
- **STOP-CSS-VER-CACHE-BUST (D310)** — a `style.css`-ONLY change is served STALE (`?ver` pinned to block.json version) → bump the version. Render-side inline/output-buffer changes land fresh.
- **STOP-STANDARDISE-NAMING-FIRST (D309)** — standardise a naming convention across the ecosystem FIRST, then build the mechanism; recognise capability by whether the block DECLARES the attr, never a name-guess.
- **STOP-REGISTER-MECHANISMS-UNRELIABLE** — a pre-diagnosed register lists SYMPTOMS but its CAUSES are often wrong. Prove each cause on the live DOM OR a real-node converter trace FIRST.
- **STOP-CDN-STALE-CACHE** — a block CSS change at an UNCHANGED `?ver` serves stale; always `hosting_clearWebsiteCacheV1` + OPcache + `wp litespeed-purge all` before any live CSS measure.
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
- **STOP-48/49** — do NOT trust `computed-parity.js` numbers or leftover-buckets; IGNORE header/footer + the accepted testimonial static-grid→slider. (Task 2 exists to make the tool trustworthy — until then this stands.)
- **STOP-67** — pre-commit visual-diff report per CHANGED block at repo-ROOT `reports/visual-diff/<block>-<date>.md` (frontmatter `verdict: PASS` + `first_paint_capture_passed: true`).
- **safecss strips functional colours (D302)** — any INLINE colour VALUE must be hex/named/var; the scoped `<style>` channel is NOT filtered.
- **Path-scoped commits** — `git commit -F <msgfile> -- <paths>` (message FILE). `git add <file>` for NEW files; never `git add -A`. No version bumps / deprecations pre-production (except a cache-bust bump). No co-author line. Verify branch + D-ceiling before commit.
- **DB seed not in git** — a new block.json attr / `property_suffixes` row needs `/sgs-update --stage 1` (or a dated `migrations/*.py`) to reach the DB.
- **One writer per file** — parallel coding subagents only across DISJOINT files; a SOLO coding subagent (foreground, named files, main-verified) is optimal for a coupled surface.
- **Re-clone command:** `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup "sites/mamas-munches/mockups/homepage/index.html" --auto-section --client mamas-munches --page homepage --media-map sites/mamas-munches/research/sandybrown-media-map.json --deploy-target page:8`. Deploy plugin (PHP-only): `python plugins/sgs-blocks/scripts/build-deploy.py --skip-build --allow-dirty`.

## Skills to Invoke
| Skill | When |
|---|---|
| `/brainstorming` | design the rebuilt parity-tool architecture (what "match" means per dimension) before coding |
| `/gap-analysis` | grade the parity tool against its acceptance criteria before delivery |
| `/lifecycle` | any skill/agent/pipeline change |
| `/research` | gold-standard DOM-diff / visual-regression approaches (how Percy/BackstopJS/axe structure element matching) |
| `/strategic-plan` | order the parity-tool rebuild |
| `/systematic-debugging` | prove each parity mis-count cause on the real draft-vs-live pair before fixing |
| `/qc-council` | validate the parity-tool fix-shapes before dispatch (it's a measurement instrument — get the design right) |
| `/qc-inline` | per-change QC |
| `/sgs-clone` `/sgs-db` `/wp-blocks` | ground truth (block schema, css_property, presets) |
| `/visual-qa` | per-section cropped visual compare to cross-check the tool's verdict |
| `/handoff` `/capture-lesson` | session close |

## MCP Servers & Tools
| Tool | For |
|---|---|
| Playwright / chrome-devtools MCP | THE draft-vs-live DOM diff (tags/classes/elements/content/computed-CSS) + the tool's live capture |
| Hostinger MCP `hosting_clearWebsiteCacheV1` | CDN clear before any live measure (user u945238940); plus `wp litespeed-purge all` (LiteSpeed active) |
| REST app-pwd `.claude/secrets/sandybrown.env` | user `Claude`; pass creds inline (env has unquoted specials — don't `source`) |

## Agents to Delegate To
| Agent | When |
|---|---|
| general-purpose (Sonnet) | parallel read-only draft-vs-live diff investigators (per-section) + the parity-tool implementer (solo, one writer) |
| feature-dev:code-reviewer | pre-commit review on the rebuilt parity tool (it's a trust-bearing instrument) |

## Research Approach
1. `/research` how mature visual-regression / DOM-diff tools structure element matching (Percy, BackstopJS, axe-core, Playwright's toMatchAriaSnapshot) — especially how they PAIR draft↔clone elements (by content? position? role?) and how they avoid false positives on inherited/computed values.
2. Enumerate the CURRENT `computed-parity.js` over-count/under-count causes (STOP-48/49 says font-family stacks + clone-only props inflate it) against the real page-8 draft-vs-live pair — pinpoint every mis-count before redesigning.

---

## Task 1 — Confirm the 100% clone: exhaustive draft-vs-live DOM diff
**What:** thoroughly compare the DRAFT (`sites/mamas-munches/mockups/homepage/index.html`) against the LIVE clone (sandybrown page 8) and produce a per-element ledger of what transferred and what did NOT — tags, classes, elements, text content, and computed CSS. Assume NOTHING; check every section.
**Why:** Bean believes visually it's 100% but wants it PROVEN element-by-element before trusting it — the ground truth Task 2's tool must reproduce.
**Estimated time:** ~30 min.
**Orchestration:**
- Execution: inline (main) to drive Playwright on both draft (open the mockup file's rendered form — serve it locally since `file://` is blocked in the MCP; e.g. `python -m http.server` in the mockup dir, or a scratch copy) and the live clone; dispatch parallel per-section read-only investigators (general-purpose Sonnet) if it sprawls.
- Depends on: none. Parallel with: none. /qc gate after: no (it's a read-only investigation; Bean reviews the ledger).
**Acceptance:** a per-section ledger (draft element → clone element, or MISSING/DIVERGENT with the exact tag/class/content/CSS delta), covering EVERY section, with header/footer + the accepted testimonial static-grid→slider explicitly noted as out-of-contract (memory `clone-fidelity-excludes-header-footer`). Any genuine gap → root-caused + presented to Bean (fix at the DRAFT or the converter per STOP-FIX-DRAFT-NOT-CLONE / R-31-9).

## Task 2 — Rebuild the parity tool to be universally trustworthy (SPEC-FIRST — amend Spec 20)
**What:** make the computed-parity tool (`plugins/sgs-blocks/scripts/parity/computed-parity.js`, Stage 11.6) ACTUALLY measure clone fidelity for ANY draft/blocks — matching **tags + classes + elements + content + CSS** — with pinpoint accuracy Bean can trust. No cheating to pass this one page. It must correctly PAIR draft↔clone elements and report exactly what matches vs diverges, per dimension.
**Why:** the current tool over-counts (STOP-48/49) so its % can't be trusted; Bean needs a dependable instrument to test the pipeline on future drafts. It ALREADY has a spec (Spec 20) — but Bean's tag/class/element scope is broader than Spec 20 v1.0.0's computed-CSS focus.
**Estimated time:** ~45–60 min (spec amend + design + build + validate).
**Orchestration:**
- **STEP 0 — SPEC FIRST (do NOT skip; Spec-Scope Binding):** read Spec 20 IN FULL. Bean's ask adds **tag + class + element-structure matching** on top of the existing content-matched computed-CSS (FR-20-1). AMEND Spec 20 to v1.1.0 with the added dimensions as new FRs (e.g. FR-20-9 tag/class/element-structure matching; extend FR-20-4 unmatched surfacing to all dimensions), a bumped `spec_version` + `status_history` entry — BEFORE writing tool code. This is exactly the spec-first sequence used for Spec 32 (FR-32-11) this session.
- Then `/brainstorming` the matching model (PAIR elements by normalised text content — ~96% present, FR-20-1/rule 4a — plus structural position; define "match" per dimension; exclude out-of-contract chrome per memory `clone-fidelity-excludes-header-footer`). Then `/qc-council` on the fix-shapes (it's a trust-bearing instrument — a wrong design gives Bean false confidence). Then a SOLO implementer (one writer).
- Depends on: Task 1 (its manual ledger is the ground truth the tool must reproduce). Parallel with: none.
- /qc gate after: yes — `/qc-council` on the design + `/qc-inline` on the build; then VALIDATE the tool's output against Task 1's hand-built ledger (they must agree).
**Acceptance:** (a) Spec 20 amended to define the full tag/class/element/content/CSS matching (spec-first); (b) the rebuilt tool, run on page 8, produces a per-element/per-dimension report that MATCHES Task 1's hand-verified ledger (no false matches, no false gaps) AND satisfies the amended Spec 20's FRs; (c) it runs on a DIFFERENT draft with no hardcoded page-8 assumptions (universal, R-31-9, FR-20-2); (d) Spec 20 `last_verified` + test-strategy rows updated. Do NOT declare done on a self-reported number — the tool's verdict must agree with the independent manual ledger.

## Dependency graph
```
Task 1 (inline, Opus — exhaustive draft-vs-live DOM ledger)
  ↓ (ledger = ground truth)
Task 2 STEP 0: amend Spec 20 → v1.1.0 (add tag/class/element FRs) — SPEC FIRST
  ↓
Task 2 design (/brainstorming) → /qc-council on fix-shapes
  ↓
Task 2 build (solo implementer, one writer) → /qc-inline
  ↓ VALIDATE tool output == Task 1 ledger AND == amended Spec 20 FRs
Commit (tool + Spec 20 together)
```

## Methodology guardrails (do not skip)
- Read the governing spec IN FULL (Spec 31 + Spec 20). Prove every parity mis-count on the real draft-vs-live pair before redesigning. NEVER cite the CURRENT computed-parity % as a measure (STOP-48/49) — the whole point is to make a future number trustworthy.
- **Fix at the draft, not the clone** (STOP-FIX-DRAFT-NOT-CLONE) — any fidelity gap Task 1 finds that stems from the draft is corrected in the mockup + re-cloned; the clone never diverges from the draft.
- **Deploy/re-clone before measure** — build + deploy + OPcache + CDN clear + `wp litespeed-purge all` before any live measurement (STOP-21/CDN).
- The parity tool is a TRUST-BEARING instrument — validate its verdict against an independent manual ledger, never against its own self-report. `/qc-council` its design before building (blub.db 255).
- Branch appropriately (core SGS = `main`); path-scoped commits (message FILE); no co-author line. `/qc-inline` per change; end with `/handoff`.

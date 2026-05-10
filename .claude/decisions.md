# small-giants-wp — Architectural Decisions Log

Append-only. Most-recent first.

## 2026-05-10 — Defer cross-platform emit pathway (P-CP-1/2/3) until M9 production-stable

**Decision:** Three parking entries (P-CP-1 `/sgs-emit`, P-CP-2 style translation, P-CP-3 animation translation) registered in `.claude/parking.md`. **No work starts on any of them until M9 is production-stable AND ≥3 successful clones are banked.**

**Why:** The Rosetta Stone infrastructure is structurally ready (uimax stack tables populated 49-60 rows each across 16 platforms; `equivalent_implementations` on every artefact; `design_tokens` in DTCG format; `animations` schema migrated 2026-05-10). Cost is the engineering pass per platform target — non-trivial but well-bounded. M9 ships first because clone fidelity is the upstream gate; cross-platform emit downstream of an unreliable clone is wasted work.

**Strategic alignment:** SGS-prefixed BEM (Spec 13) is the structural enabler. Without the convention, cross-platform translation needs probabilistic recogniser layers per source mockup; with it, literal slug match yields deterministic component mapping. This is why Spec 13 belongs as a hard prerequisite, not a soft preference.

## 2026-05-10 — Phase 2 DB cleanup audit: no DROPs this pass (conservative-keep)

**Decision:** Audit reports written for both DBs (`.claude/reports/db-audit-sgs-framework-2026-05-10.md` + `db-audit-uimax-pro-max-2026-05-10.md`). 8 empty tables identified as potential drop candidates. **No DROPs applied this session.**

**Why:** Bean flagged that empty tables may be recently-created scaffolding awaiting first population, not stale dead schema. The audit could not produce creation-timestamp evidence per table (SQLite has no built-in DDL timestamps). Conservative default per Phase 2 Step 3 ("if cross-reference unclear, default to keep"). Cost of wrong drop > cost of dead-schema noise.

**Drop candidates kept (8):**
- sgs-framework: `block_opportunities`, `extraction_cache`, `sections_detected`, `weaknesses`
- uimax: `stack_bootstrap`, `stack_html_css`, `stack_php`, `stack_wordpress`

**Reopen condition:** if any of these tables remains 0-row + 0-grep-hits-in-scripts after Phase 4 propagation completes (≥2 weeks post-2026-05-10), reopen the drop conversation with creation-timestamp evidence sourced from git history of the migration scripts.

**Related:** `.claude/plans/phase-2-db-cleanup-audit.md`, `.claude/specs/13-DRAFT-NAMING-CONVENTION.md` (Phase 1 outcome that informs Phase 4 propagation).

## 2026-05-10 — SGS-prefixed BEM is canonical for all Bean-controlled drafts (Spec 13 locked)

**Decision:** All Bean-controlled drafts (mockups, sketches, hand-coded HTML produced in-house) MUST use `.sgs-<block>__<element>--<modifier>`. `/sgs-clone` Stage 0 pre-flight gate hard-rejects on production runs; `--draft-mode` = soft warning; `--legacy` bypasses for pre-rule mockups. Live scrapes use lingua-franca-conversion at recognition time.

**Why:** Drafts and rendered SGS share class-name space; literal slug match collapses the 9-stage pipeline from probabilistic-with-fallback to deterministic for Bean-authored drafts. Probabilistic recognition stays only where Bean does NOT control source naming (live scrapes).

**Captured at:** blub.db row 236, pattern_key `bean-drafts-use-sgs-prefixed-bem-naming`. Canonical reference: `.claude/specs/13-DRAFT-NAMING-CONVENTION.md`.

**KJC #1:** `.sgs-` prefix chosen over `.draft-` / `.dft-` because drafts and rendered SGS share class-name space; literal slug match (`.sgs-hero` → `sgs/hero`) is unambiguous.

**KJC #2:** Hybrid validation enforcement chosen (Option C): hard pre-flight gate on production runs + soft lint warning under `--draft-mode`. Hard-only blocks rapid iteration; soft-only lets non-conforming drafts back into the pipeline.

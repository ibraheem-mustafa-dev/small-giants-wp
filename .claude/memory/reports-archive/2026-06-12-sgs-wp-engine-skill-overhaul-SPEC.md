# /sgs-wp-engine Skill Overhaul — Build Spec (pre-build, for adversarial-council)

**Date:** 2026-06-12 · **Author:** Claude (with Bean) · **Status:** DRAFT — pending `/adversarial-council` before build via `/lifecycle`.

## End-goal (what success looks like)
A single skill that, when it fires on any SGS WordPress work, **measurably reduces the recurring mistakes Bean has named**: inconsistent multi-block implementations, not reading the spec docs at point of use, hallucinating block/attribute state, shallow diagnosis, building in isolation (not as a system), and — the biggest — guessing from a tiny snapshot instead of analysing the actual page source HTML / docs / DB. The skill must stay current (not drift like the present one, which says "No WooCommerce" while the framework is now WooCommerce-based and whose mistake-ledger froze 2026-05-05).

## Context / constraints
- The skill is GLOBAL (`~/.claude/skills/sgs-wp-engine/`), serving a multi-spec WordPress framework repo (`small-giants-wp`).
- Edits go through `/lifecycle` (the `lifecycle-gate.py` hook blocks direct SKILL.md edits).
- Bean: non-technical business/marketing strategist with ADHD; needs simple, clear, example-led communication; relies on Claude to recommend decisions + the why. Claude = expert dev/designer who stays current with the latest WP platform features + coding standards.
- We are **Anthropic-only** now (no Gemini/Cerebras) — "cross-family" framing is RETIRED.
- The current SKILL.md is ~500 lines + 40+ reference files + a per-block wiki + scripts + an MCP server + a SQLite DB. Good bones (4-phase loop, Gotchas, DB integration); the problem is drift + missing surfaces, not a rebuild.

## Decision-making principles (every recommendation scored against these)
quality · long-term viability · commercial value / differentiation · innovation · every solution highly bespoke.

## The build — sections A–G

### A. Operating contract (top of skill, fires every task)
1. **The relationship:** Claude = expert developer/designer, always current with the latest WP platform features + coding standards. Bean = non-technical business/marketing strategist, ADHD; communicate simple/clear/example-led; ALWAYS tell Bean what to decide and why (menu + recommendation + reasoning).
2. **The 5 decision principles** (above) — cite them when recommending.
3. **THE anti-assumption rule (highest priority):** never diagnose or build from a snapshot or memory. For a page issue, READ THE ACTUAL PAGE SOURCE HTML (the canonical root-cause surface) + computed styles; for a block, read `block.json`/`render.php` + query `/sgs-db`/`/wp-blocks`; for WP behaviour, check the WP docs/hooks. Guessing when the source is one command away is the banned default.
4. **Build as a SYSTEM, to latest standards:** before building, consider the whole system (container model, shared components, the cascade, sibling blocks, the spec). Check the latest WP standard/practice for the thing being built. Isolated builds that ignore the system are what produced disjointed/broken/needs-rebuild output.

### B. The brain + ground-truth routing
1. **`/ui-ux-pro-max` + its DB is the brain** for ANY design/build/critique decision — query it first, never default to model memory.
2. **`/sgs-db` + `/wp-blocks`** for block roster / attrs / schema (the DB is authoritative — never hardcode counts).
3. **Task → spec map (read the relevant spec BEFORE touching that surface):** naming → Spec 00; blocks reference → Spec 02; header/footer/admin → Spec 17; container/wrapper + the converter/cloning pipeline → Spec 22 (+ `cloning-pipeline-flow.md`/`-stages.md`); WC/product/shop → Spec 27/28/30; styling traps → `common-wp-styling-errors.md`.

### C. Consistency (same feature = same canonical pattern)
- The shared components are MANDATORY: `TypographyControls` + `sgs_typography_css_rule()` (D209), `DesignTokenPicker`, `ResponsiveControl`. No bespoke re-implementations of a capability a shared component already provides.
- Before adding a feature/setting to a block: check how the reference block does it + check `wp-blocks` for the core pattern; apply the SAME pattern across all target blocks.
- The 6-point Block Customisation Standard (from the blocks CLAUDE.md) is surfaced here.

### D. Non-negotiable rules
- The project's **7 rules** (convert-don't-mirror · no-cheats · universal-no-carve-outs · no-skipping · verify-on-real-homepage · responsive-in-attrs-not-inline-CSS · design-gate-sensitive-changes).
- **Emit-green ≠ rendered:** verify the FULL render chain (attr TYPE → WP `supports` → render.php → `safecss_filter_attr`) on the live DOM.

### E. Workflow & ops
1. **QC tools (Anthropic-only):** `/qc-inline` (small artefact, inline), `/qc-council` (validate fix-shapes before dispatch / pre-commit on converter/SGS-block/schema/REST), `/adversarial-council` (pre-build red-team of a substantial artefact / security / draft-leak / PII-consent). Name WHEN to use each. NO "cross-family" language.
2. **Browser control:** default to the **chrome-devtools CLI/MCP** (own browser, no MCP lock — safe under parallel sessions); Playwright is an alternative, not the only method. On Playwright MCP "Browser already in use" → chrome-devtools.
3. **Multi-thread etiquette + merge discipline:** when ≥1 other session may share the tree — commit by EXPLICIT PATH, never `git add -A`; leave never-stage artefacts untouched; merge to main via temp-worktree cherry-pick. **Always merge to main (every session); don't hoard branches/stashes** — solo = commit + merge to main directly; clean up branches + stale stashes.
4. **Deploy cache-bust set:** block.json version bump for block style.css; theme `style.css` Version for theme CSS + new patterns; `*.asset.php` for viewScriptModule; Hostinger 7-day CDN `?ver`; web-pool OPcache reset via HTTP (not CLI).
5. **Orchestration model:** Opus orchestrates (plan/delegate/QC/live-test/commit); subagents implement (return uncommitted, no commit/deploy authority).

### F. WooCommerce reality (replaces the false "No WooCommerce" stance)
- The framework IS WooCommerce-based for the product/shop layer: WC product CPT, the variable-product configurator, the SEC-1/SEC-2 manifest, product-card dual-mode, the Store-API cart proxy, the schema emitters, WC page types, WC shop/filters.
- The WC trap-set: file-scope `extends \WC_*` fatal (lazy-require at the consumer hook); CPT singular-meta-cap breaks the cap site-wide (plural primitives); guard-on-one-path is not a guard; manifest seed-cap; draft-leak guard via `is_publicly_listable()`; VAT-label honesty (never hardcode "inc. VAT"; gate on `woocommerce_calc_taxes`); FAQPage is NOT dead (kept for AI/Bing).
- Rewrite/supersede `references/ecommerce.md` (its "Why Not WooCommerce" stance was reversed by the Spec 27+ decision).

### G. Anti-drift wiring
1. **`/sgs-update` skill-sync stage:** (a) replace hardcoded counts in SKILL.md with "query `/sgs-db`" pointers; (b) sync `category=framework` lessons from blub.db into the skill's gotchas/ledger + stamp a freshness date.
2. **Point, don't copy:** the skill ROUTES to live ground truth (DB, project specs, `mistakes.md`, blub.db) rather than duplicating it.

## Paired doc-process changes (separate from the skill; do alongside)
- Convert `mistakes.md` from stub-index to FULL entries; rely on it + blub.db (decisions.md is bloated — out of scope to fix here, just stop the skill depending on it).
- Revive `common-wp-styling-errors.md` as an actively-updated doc (still valuable, currently stale).

## Acceptance (SUPERSEDED — see v2 below)
- ~~SKILL.md fires the Operating contract... `/lifecycle` grading ≥ A-~~ (council: measures DOCUMENT quality, not behaviour; research FLAG 4: only EVALS measure behaviour change).

---

# v2 — RESEARCH-GROUNDED FINAL PLAN (supersedes A–G framing above)

Adversarial-council (NO-GO on v1) + `/research` (2026-06-12, 13 sources incl. Anthropic hooks/skills/context-engineering/harnesses docs, AgentSpec ICSE-2026, Chroma context-rot, Fiberplane drift-linter). **Core finding: prose does not reliably change agentic-LLM behaviour; structural enforcement (hooks) does (100% fire rate, model-independent). The overhaul is a HARNESS change, not a longer doc.**

## The 6 build items (priority order)

1. **EVIDENCE GATE — `PreToolUse` hook on Edit/Write (THE high-leverage fix).** Blocks an SGS-file edit unless a `GROUND-TRUTH:` block exists in the conversation (a `/sgs-db` query / live-DOM read / spec citation). Exit 2 with a corrective message → model gathers evidence, emits the block, retries. (Research FLAG 1: PreToolUse, NOT Stop — Stop fires after the edit already happened.) This is the structural version of the inert "read before you build" prose rule.
2. **CUT SKILL.md to ≤150 lines.** Net-DELETE everything already in CLAUDE.md/specs; replace inline content with single-line pointers loaded just-in-time (progressive disclosure — Anthropic Agent Skills). Hard rules first (primacy), self-report format last (recency). (Chroma context-rot + primacy/recency: longer = followed LESS.)
3. **MACHINE-READABLE self-report + `Stop` hook.** Last line of every SGS turn: `SKILL-STATUS: spec=[file|none] gt=[db|dom|none] state=[verified|assumed]`. A Stop hook rejects a turn with `state=assumed` or `gt=none`. (FLAG 2 — parseable, enforceable, AND Bean-visible.)
4. **FRESHNESS GATE (anti-drift, structural).** SKILL.md frontmatter carries `db_schema_version: N`; a hook compares to `sgs-framework.db` `PRAGMA user_version`; mismatch → block + "run /sgs-update". (FLAG 3: `/sgs-update` is an OPERATOR action — the skill only CONSUMES the DB + checks version; there is NO "skill-sync code stage" to build. Fiberplane/Atlan: freshness must be a FAILING gate, not a hoped-for stamp.)
5. **EVALS — the only way to know it worked (highest-leverage MISSING item, FLAG 4).** 5–10 test prompts replaying the documented failure modes (diagnosis without reading; guessing a block count instead of querying `/sgs-db`; skipping the spec; the "No WooCommerce" hallucination). Run vs the OLD skill, then the NEW — count correct-behaviour fire rate. "Without evals you cannot know if the overhaul worked." This replaces the `/lifecycle ≥A-` acceptance.
6. **WooCommerce reality** — the one actively-wrong content fix: replace the "No WooCommerce" stance with a pointer to Spec 27/28/30 + supersede the `ecommerce.md` header. (Council: pure content fix, ~10 min.)

## Content rules (apply throughout)
- **Pointers, not copies** (validated by Anthropic's own just-in-time skill loading). The 7 rules → pointer to CLAUDE.md §NON-NEGOTIABLE; the 6-point standard → pointer to blocks CLAUDE.md; the WC trap-set → pointer to the feedback files; specs by ROLE → a generated `spec-map` (stable role → current file) so renames don't dangle.
- **Anti-assumption surface-of-truth (council M4):** "live rendered DOM + computed styles after confirming the served `?ver` is fresh" — NOT raw page source (often stale via CDN ?ver).
- **`/ui-ux-pro-max` brain** keeps its existing `|| fall back to model knowledge` graceful-degradation clause (support MF-2 — no absolutism without a fallback).
- **QC tools:** name `/qc-inline` / `/qc-council` / `/adversarial-council` (when each); DROP "cross-family" (Anthropic-only).
- **Merge discipline:** decision gate — `git worktree list` shows 1 → commit+push to main directly; ≥2 → temp-worktree cherry-pick. Session-close cleanup of merged branches + stale stashes.

## DROPPED (wrong premise / violates locked rules)
- `mistakes.md` → full entries (violates the Bean-locked stub-index-only rule; AND it's not actually stale — entries 2026-06-09/10).
- Reviving `common-wp-styling-errors.md` (touched 2026-06-07 — not stale; skill just ROUTES to it).
- A bespoke `/sgs-update` "skill-sync stage" (FLAG 3 — skill consumes the DB, doesn't own updates).

## Optional higher-leverage (park unless cheap)
- `PostCompact` hook re-injecting the 5 hard rules after compaction (long sessions).
- Subagent-as-enforcer: a read-only triage subagent emits the GROUND-TRUTH block before any build subagent (FLAG 5).
- JSON state/ledger files (model overwrites JSON less than Markdown; PostToolUse validates).

## Acceptance (v2 — behaviour, not document quality)
- The EVIDENCE GATE hook blocks an SGS Edit with no `GROUND-TRUTH:` block (tested live).
- SKILL.md ≤150 lines; grep finds 0 "No WooCommerce"/"Why Not WooCommerce" in the skill tree; 0 hardcoded block counts; 0 "cross-family".
- The eval set's correct-behaviour fire rate is measurably higher on the new skill than the old (the real metric).
- The freshness gate blocks when `db_schema_version` ≠ `PRAGMA user_version`.

## Build split (where each item lives)
- SKILL.md rewrite (items 2, 6, content rules) → `/lifecycle` (skill-writer).
- Hooks (items 1, 3, 4 + optional PostCompact) → hook scripts in `~/.claude/hooks/` + `settings.json` (the `update-config` skill / direct).
- Evals (item 5) → a small test set + a manual before/after run.

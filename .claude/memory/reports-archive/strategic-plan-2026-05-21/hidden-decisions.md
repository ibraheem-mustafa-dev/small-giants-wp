# Hidden Decisions Pass — SGS Architecture Programme

**Generated:** 2026-05-21 (strategic-plan Phase 5.2 cold reviewer, Haiku)
**Role:** Cold reviewer simulating "what would pause a Sonnet implementer mid-execution"
**Goal:** Find what's not auto-runnable yet

## Summary

**Largest pre-dispatch blockers (top 5):**

1. **Where are cached blocks.db + hooks.db files sourced from?** Phase 1 fails open if implementer can't find them. Resolution: source from `C:/Users/Bean/.wp-blockmarkup-mcp/blocks.db` and `C:/Users/Bean/.wp-devdocs-mcp/hooks.db` (already-cached MCP outputs).
2. **Variation seeding strategy when sources conflict?** If both `class-sgs-block-variations.php` AND `block.json styles[]` declare a variation, which wins? Resolution: `block.json` is authoritative (WP-native source); PHP class is the loader. If they diverge, audit reveals PHP class is out of date.
3. **Has Decision 24 research truly been completed, or do I repeat it?** YES, completed. Report at `.claude/reports/2026-05-21-pattern-overrides-research.md`. Implementer prompt for Phase 3 MUST cite this explicitly.
4. **How do I verify button presets migrate correctly without breaking existing sites?** Phase 5b property-coverage audit script (per Risk Assessment Phase 5b risk 1). Audit script is a HARD GATE before deleting the CSS bridge.
5. **Is the parallel-session sequencing correct?** Mostly yes, but Phase 5b should NOT run in parallel with Phase 6 because button preset changes in 5b affect block markup examples authored in 6. Update §13: Phase 5b serialised before Phase 6, NOT parallel.

## Per-phase pause points

(Full ~40-decision-points list captured by the cold reviewer; condensed here to the items that need pre-dispatch resolution.)

### Phase 0.5 — Structural QC hook
- **Pause:** "Does the hook fail the commit or just warn?" → **Resolved:** Warn only via systemMessage. Commits proceed; gate is informational. Future evolution: PreToolUse hook on git commit Bash command that warns + requires explicit `[qc-skipped:<reason>]` marker to bypass.
- **Pause:** "How does session state persist across turns?" → **Resolved:** Use a transient file at `.claude/.qc-edit-tracker.json` updated on Write/Edit, read on Bash commit. Stale-purge entries older than 2 hours.

### Phase 1 — DB merge
- **Pause:** "Merge by id or by name+type?" → **Resolved:** By `(block_name, source)` or `(hook_name, source)` composite key. IDs are auto-increment, not portable.
- **Pause:** "Where are the cached .db files?" → **Resolved:** `~/.wp-blockmarkup-mcp/blocks.db` and `~/.wp-devdocs-mcp/hooks.db` (local cache from previously-deleted MCP servers).
- **Pause:** "indexed_files: from src/ or build/?" → **Resolved:** `src/` (the source of truth; `build/` is compiled output).

### Phase 2 — Variations indexing
- **Pause:** "Are sgs/button's 4 variations the ONLY variations, or discover more?" → **Resolved:** Discover via `register_block_variation()` calls in `class-sgs-block-variations.php` + `block.json` styles arrays. Cross-reference editor block inserter via Playwright snapshot post-seeding (per risk mitigation).
- **Pause:** "If sources conflict, which wins?" → **Resolved:** `block.json` styles is WP-native authoritative. PHP class is loader. Diff and report; don't silently overwrite.

### Phase 3 — INNER_BLOCK_PATTERNS retirement
- **Pause:** "Decision 24 status — is research done?" → **RESOLVED.** Phase 3 cold prompt MUST cite `.claude/reports/2026-05-21-pattern-overrides-research.md` and forbid re-investigation.
- **Pause:** "Adjacent grouping — what defines 'same parent'?" → **Resolved:** Same `parent_block` value AND same DOM-adjacency (no non-button siblings between them). Use BeautifulSoup `find_next_sibling` and check class membership.

### Phase 4 — /sgs-update rebuild + Option B port
- **Pause:** "Where are cached MCP .db files?" → Same as Phase 1.
- **Pause:** "Pin to WP 7.0 tag forever?" → **Resolved:** Add `--wp-version` flag defaulting to `latest-stable-major`. Operators override for testing future versions.
- **Pause:** "9 stages — phases within Phase 4 or stages of single script?" → **Resolved:** 9 stages of a single `sgs-update-v2.py` script. Each stage is a function with explicit pre/post conditions.

### Phase 5a — Variation system kill
- **Pause:** "Strip styles JSONs — delete locally, gitignore, or exclude from tar?" → **Resolved:** Move (not delete) to `sites/<client>/theme-snapshot.json`. Add `theme/sgs-theme/styles/` to `.gitignore` so any future-created files don't accidentally ship. Exclude from tar deploy via existing exclude list.
- **Pause:** "Push CLI authentication — SSH or REST?" → **Resolved:** SSH via existing `id_ed25519` key + scp + WP-CLI for theme.json placement. REST endpoint NOT created (avoids new attack surface).
- **Pause:** "Migration safety for sites currently using variations?" → **Resolved:** One-time admin notice (already exists pattern: `Sgs_Site_Info_Admin_Notices::maybe_show_deprecated_blocks_notice`) — show "Style variations migrated to per-site theme.json; see docs/migration-2026-05.md".

### Phase 5b — Customiser migration
- **Pause:** "Customiser sections — new or extend existing?" → **Resolved:** New SGS-prefixed sections (`sgs_header`, `sgs_footer`, `sgs_site_info`) following `Sgs_Floating_UI_Customiser` pattern exactly. Don't add to native sections.
- **Pause:** "postMessage vs refresh per control?" → **Resolved:** Resolution rule baked into the implementation: control attribute name maps to transport via lookup table (colours/typography/spacing → postMessage; conditional rules / structural toggles → refresh).
- **Pause:** "Button preset migration safety?" → **Resolved:** Property-coverage audit script (Phase 5b risk 1 mitigation). Hard gate before deleting CSS bridge.

### Phase 6 — Markup examples + audits + Lucide REST
- **Pause:** "markup_examples format?" → **Resolved:** Match core blocks.db schema exactly: stringified HTML with WP block comment markup. Auto-generate where attributes are templatable; hand-author the ~15 complex composites (sgs/hero, sgs/card-grid, sgs/tabs, etc.).
- **Pause:** "role: content definition?" → **Resolved:** "Attribute whose value is rendered as user-visible text/media content" (per WP 7.0 docs). Excludes spacing, color, visibility toggles, layout, behaviour.
- **Pause:** "apiVersion 3 bump — safe?" → **Resolved:** NOT safe without canary. Per Risk Assessment Phase 6 risk 1: canary group of 3 representative static blocks tested in iframed editor on dev site before bulk-bump.

### Phase 7 — WP 7.0 alignment
- **Pause:** "Sgs_Ai_Connector — makes actual AI calls?" → **Resolved:** Infrastructure-only. No calls. Registers provider hooks via `wp_connectors_init`. Future feature work plugs in.
- **Pause:** "Skills audit — what counts as deprecated?" → **Resolved:** Anything removed in WP 7.0 OR marked deprecated in `developer.wordpress.org/reference/deprecated-7.0/`. "No longer recommended but still works" is a soft flag, not a hard fix.
- **Pause:** "Audit completeness — block on any critical incompatibility?" → **Resolved:** Audit reports findings + remediation cost per skill. Bean decides whether to block Phase 7 for critical findings or split into Phase 7a (critical) + 7b (deferrable).

## Plan-level hidden decisions

1. **Parallel session coordination — actual hidden dependency:** Phase 5b should NOT run in parallel with Phase 6 (button preset changes in 5b affect block markup examples authored in 6). Update §13 phase plan: Phase 5b serialised before Phase 6 if Phase 6 includes button-block markup examples.

2. **Empirical gates between phases:** Each phase's post-condition needs an explicit verifier. Pattern: `/qc-council` Stage 5 baseline check before subagent dispatch, `/qc-inline` post-dispatch verification, Bean eyes-on for Customiser UX.

3. **Cost blowout for Phase 5b button preset coverage:** If property-coverage audit reveals >2 properties uncovered by WP 7.0 native CSS generation, escalate Phase 5b to a parking item ("WP 7.1 may add coverage; defer until then"). Don't burn 4+ hr building a slim PHP shim for a temporary gap.

4. **Definition of "done" for Phase C spec revisions:** Cross-check via `/qc-council` re-run on each revised spec. If new contradictions surface, fix before declaring Phase C done.

5. **Variation system kill migration safety:** One-time admin notice via existing pattern. No data migration needed (variations were CSS overlays, no operator data lost).

---
doc_type: handoff
project: small-giants-wp
generated: 2026-07-12
session: D312 (CSS consolidation) + D313 (page-8 a11y fixed at the DRAFT source, re-cloned) — Lighthouse 96/100/100 + green CWV
---

# Session Handoff — 2026-07-12

## Completed This Session
1. **Spec 32 → v1.2 (FR-32-11 + §6.2)** — encoded the CSS-consolidation contract as source of truth BEFORE any code (Bean-directed). Commit `9dfcaa6e`.
2. **`/qc-council` (3 cross-model raters) = GO-WITH-FIXES** — caught the editor-parity predicate bug (`!is_admin()` is false during REST → would unstyle 8 ServerSideRender blocks), the 6 emit-shapes, and predicted the LiteSpeed-freeze. Corrections folded into design + spec.
3. **Collector built as a single `render_block` chokepoint** (`includes/class-sgs-css-registry.php`) — lifts every `sgs/*` block's `<style>` from rendered HTML into one buffer (dedup by content hash, D303 residual order preserved). Dissolves the 6-shapes risk; touches no per-block render.php. Commit `72c0387a`.
4. **Delivery = ONE output buffer** injecting into `<head>` every render (self-consistent under caching). **Two operator modes** (`sgs_css_output_mode`, default `file`): `file` = cached content-hashed external `<link>` (immutable cache header, atomic write, epoch invalidation + LiteSpeed purge + GC); `head` = inline `<style>` (draft's model, self-contained). Commit `c30dd5e2`.
5. **Settings page** (`includes/class-css-output-settings.php`, SGS → CSS Output) — mode choice + recommended-optimisation-plugin table (LiteSpeed/Autoptimize/WP Rocket/Perfmatters + exact setting). Renders live.
6. **Bean-directed test: installed LiteSpeed Cache on the canary.** First VERIFIED no cache plugin was installed. Then reproduced the generate-then-serve model FAILING live under LiteSpeed page cache (froze cold inline) → replaced with the unified buffer. File mode now stable under LiteSpeed.
7. **Both modes LANDED + live-verified** (sandybrown page 8): 1 head style/link, 0 body `<style>`, correct cascade + computed values 375/768/1440, D303 intact, editor parity (block-renderer REST keeps inline), 0 console errors.
8. **Docs:** D312 logged; P-STYLE-TAG-CONSOLIDATION moved parking → archive (CLOSED); memory lesson `test-with-actual-cache-layer-and-self-consistent-render` captured. Commit `c85bb91c`.
9. **Full DOM audit (live page 8):** the ~100 per-block body `<style>` tags are gone — 1 cached head `<link>`, 0 SGS `<style>` in the body. **Zero SGS blocks emit a forbidden inline `style=` declaration** (all SGS inline styles are permitted CSS-variable values); the ~15 real inline declarations are WP-core/WooCommerce/theme header+footer + core-blocks-in-patterns (`P-PATTERNS-USE-CORE-BLOCKS`). The 16 SGS `<style>` in the HEAD are block base `style.css` that WP itself inlines (separate layer).
10. **Lighthouse audit:** Performance CWV green (LCP 274ms, CLS 0.06), Best Practices 100, SEO 100, Accessibility 95→**96**. Located the exact a11y failures.
11. **Page-8 a11y fixed at the DRAFT source, then re-cloned (D313, `904fe02e`) — Bean-locked "fix the mockup not the clone".** Gift-card tag contrast 2.34→**8.4** (draft `--primary-dark`→`--text` charcoal, on-palette); ingredient headings `<h4>`→`<h3>` (+ the `.sgs-info-box h4` selector) so the section hierarchy is h2→h3 (no skip). LANDED live. Ghost button (3.67) + Trustpilot green (brand) left faithful-to-draft (Bean's call).

## Current State
- **Branch:** `main` at `904fe02e` (all pushed)
- **Tests:** converter unit suite unaffected (render-side PHP only — no converter/JS change); conformance goldens unchanged (15 pre-existing red, 0 new)
- **Build:** n/a this session (no JS/CSS `src/` change; PHP-only deploy via `build-deploy.py --skip-build`)
- **Uncommitted changes:** none from this session (pre-existing untracked `sgs-framework.db` + `phase4-*.txt` dirt is not this session's)
- **Live:** sandybrown page 8 = file mode (default), external `<link>` consolidated CSS; **LiteSpeed Cache now installed + active** on the canary (page cache)

## Known Issues / Blockers
- LiteSpeed Cache is now active on sandybrown (installed to test file mode). Its CSS async/critical-CSS optimisation (QUIC.cloud) is NOT configured — optional, per the settings-page guidance. If it ever misbehaves, `wp plugin deactivate litespeed-cache`.
- None blocking the next session.

## Next Priorities (in order) — Bean-directed
1. **Confirm the 100% clone via an exhaustive draft-vs-live DOM diff** — Bean believes it's 100% visually; PROVE it element-by-element (tags/classes/elements/content/CSS), assuming nothing. Produce a per-section transferred/missing ledger.
2. **Rebuild the computed-parity tool to be universally trustworthy** — `plugins/sgs-blocks/scripts/parity/computed-parity.js` (Stage 11.6) must actually work for ANY draft/blocks (match tags/classes/elements/content/CSS), no cheating to pass this page; validate its verdict against Task 1's manual ledger. This is what makes the pipeline testable on other drafts.
3. (Then, later) the parked architectural items: `P-PATTERNS-USE-CORE-BLOCKS`, `P-DRAFT-TOKEN-EXTRACTION-SETUP-PIPELINE`.

Full orchestration in `.claude/next-session-prompt.md`.

## Files Modified
| File path | What changed |
|---|---|
| plugins/sgs-blocks/includes/class-sgs-css-registry.php | NEW — collector chokepoint + unified head output buffer + file/head modes + epoch/GC/atomic-write |
| plugins/sgs-blocks/includes/class-css-output-settings.php | NEW — SGS → CSS Output settings page + plugin guidance |
| plugins/sgs-blocks/sgs-blocks.php | require the registry + settings class; register the settings page |
| .claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md | v1.2 — FR-32-11 + §6.2 (final shipped architecture) |
| .claude/plans/2026-07-12-style-tag-consolidation-design.md | NEW — design + research trail + BUILT note |
| .claude/{decisions.md,parking.md} + memory/parking-archive.md | D312; P-STYLE-TAG-CONSOLIDATION archived |
| reports/visual-diff/css-consolidation-2026-07-12.md + 2 jpeg | LANDED evidence + settings-page screenshot |
| sites/mamas-munches/mockups/homepage/index.html | D313 a11y: gift-tag colour → `--text`; 4 ingredient headings h4→h3 + `.sgs-info-box h4` selector (re-cloned to page 8) |

## Notes for Next Session
- **The generate-then-serve external-CSS model does NOT survive a full-page cache** — reproduced live under LiteSpeed (froze the cold inline response). The shipped fix makes EVERY render self-consistent (output buffer injects into head each render), so the cached HTML always carries the correct link/style. Memory: `test-with-actual-cache-layer-and-self-consistent-render`.
- **Verify what's actually installed before recommending a solution that leans on it** — I recommended "let LiteSpeed optimise the file" before checking; no LiteSpeed plugin was installed. Bean: "research first, no guessing."
- **CSS delivery is now operator-selectable** — `file` (default, needs an optimisation plugin for best CWV) vs `head` (self-contained). Settings page documents when each is optimal. The `sgs_css_output_mode` filter also overrides.
- Editor parity predicate is `!is_admin() && !wp_is_serving_rest_request()` — do not simplify to `!is_admin()` (breaks ServerSideRender editor previews).

## Next Session Prompt

~~~
You are the SGS cloning-pipeline developer. Two Bean-directed tasks, in order: (1) PROVE the page-8 clone is 100% via an exhaustive draft-vs-live DOM diff (tags/classes/elements/content/CSS), assuming nothing; (2) rebuild the computed-parity tool (`plugins/sgs-blocks/scripts/parity/computed-parity.js`, Stage 11.6) to be universally trustworthy for any draft/blocks — no cheating to pass this page — validated against Task 1's manual ledger. Invoke `/autopilot` first.

**The FULL orchestration (mandatory reading gate, the complete STOP catalogue, per-task orchestration blocks, dependency graph, and methodology guardrails) is in `.claude/next-session-prompt.md` — read it in full before acting.** Do NOT act from this summary alone.

Headlines:
- **Skills:** `/brainstorming` `/gap-analysis` `/lifecycle` `/research` `/strategic-plan` `/systematic-debugging` `/qc-council` `/qc-inline` `/visual-qa` `/sgs-clone` `/sgs-db` `/wp-blocks`.
- **MCP/tools:** Playwright + chrome-devtools (the draft-vs-live DOM diff); Hostinger `hosting_clearWebsiteCacheV1` + `wp litespeed-purge all` (LiteSpeed now active); REST creds `.claude/secrets/sandybrown.env` (user `Claude`).
- **Agents:** general-purpose (Sonnet) parallel per-section diff investigators + solo parity-tool implementer; feature-dev:code-reviewer pre-commit on the tool.
- **New STOP (D313):** fix a11y/fidelity issues at the DRAFT source + re-clone, never on the clone or via a converter carve-out (Bean-locked). Current computed-parity % is NOT trustworthy until Task 2 fixes it (STOP-48/49).
- **Guardrails:** read Spec 31 + Spec 20 IN FULL; prove every parity mis-count on the real draft-vs-live pair; deploy/re-clone + OPcache + CDN + `wp litespeed-purge all` before any live measure; `/qc-council` the parity-tool design before building; validate the tool's verdict against the independent manual ledger, never its own self-report.
~~~

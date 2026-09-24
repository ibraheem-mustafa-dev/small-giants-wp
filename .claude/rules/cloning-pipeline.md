---
paths:
  - "plugins/sgs-blocks/scripts/converter/**"
  - "plugins/sgs-blocks/scripts/orchestrator/**"
  - "plugins/sgs-blocks/scripts/parity/**"
  - "plugins/sgs-blocks/scripts/cheat-gate/**"
  - "plugins/sgs-blocks/scripts/excluded-gate/**"
  - "plugins/sgs-blocks/scripts/ledger/**"
  - "plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py"
  - "plugins/sgs-blocks/includes/class-sgs-container-wrapper.php"
  - "sites/*/mockups/**"
  - ".claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md"
---

# Cloning pipeline rules

**Success:** the pipeline CONVERTS any SGS-BEM draft into native SGS blocks driven by their attributes, faithful to the draft on the real homepage, with zero cheats. Read `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` in full before pipeline work — its binding rules R-31-1…15 (§13.1) are the authoritative list; the seven below are the ones that gate every change.

1. **Convert, don't mirror** — no emitted block `className` carries a draft BEM element class (`sgs-x__y`). Enforced by `orchestrator/check_no_mirror.py` after every clone.
2. **No cheats** — no `sourceMode='bound'` emit, no echo-`$content` passthrough, no shallow-test workaround. The only legitimate `sourceMode` values are the WC configurator's `'wc-product'` / `'sgs-cpt'` on `sgs/product-card`; `sgs/trust-bar` has no `sourceMode` at all.
3. **Universal, no carve-outs** — a fix applies to every qualifying block and case; no "except for X block".
4. **No skipping** — every draft class's content and CSS transfers, or is reported skipped-with-reason, per class.
5. **Verify on the real homepage** — Playwright live DOM + computed style vs the draft's real values, never a test page or the emit alone.
6. **Responsive values go in block attributes, never inline CSS** — inline beats `@media` and kills responsiveness.
7. **Design-gate shared-mechanism changes** (wrapper, walker, converter) and get Bean's approval before building.

## Fidelity

- Measure with Spec 20's computed-parity (`scripts/parity/computed-parity.js`, pipeline Stage 11.6, auto): computed values on each rendered element, matched by TEXT CONTENT — never a source-declaration diff (blind to inherited values) or wrapper-class keying.
- Pixel-diff misleads: an empty section scores a false win. Gate on `innerText` + layout checks.
- Numbers alone never close fidelity, and Bean's eye alone never does; both are consulted. Accepted divergences for a particular clone live in that clone's plan.
- The input-side logs (`leftover-buckets.json`, `attribute_gap_candidates`) are debug data, not a fidelity signal.

## Structure

- The walker is one recursive function with exactly three exceptions (atomic-tag swap, top-level chrome skip, top-level container wrap). Every BEM-classed node resolves to a block via `slot_synonyms.standalone_block`; behaviour comes from DB rows, not code branches. BEM is the only recognition signal; the HTML tag is shape only.
- A composite VARIANT's grid is defined by `variant_slots` + `blocks.variant_attr` — query them before theorising: `sgs-db.py sql "SELECT * FROM variant_slots WHERE block_slug='sgs/hero'"`.
- Every composite with a built-in wrapper mirrors `sgs/container`'s capabilities (Spec 31 §13.6). Section/layout-KIND composites render through `SGS_Container_Wrapper`; content-KIND composites using only box+width may render block-private. A missing capability is added to the composite, never worked around in the converter.
- A hardcoded default the wrapper injects over the draft's transferred CSS is a cheat to remove, not a blocker. The `sgs-cols-tablet-N` / `sgs-cols-mobile-N` class is emitted for a tier only when that tier has no explicit `gridTemplateColumns*` ratio.
- Breakpoints: the device-tier system (`…Mobile` / `…Tablet` attrs) is fixed at 768/1024; an arbitrary visual breakpoint in one CSS rule is legitimate and must never be swept. Classify before changing one.
- Drafts use SGS-BEM (Spec 00 §3); Stage 0 hard-rejects non-conforming drafts on production runs (`--draft-mode` warns, `--legacy` bypasses).
- A migrated composite never carries a server-side legacy fallback in `render.php`; existing posts migrate by WP-CLI batch (R-31-14).
- Before committing a change under `scripts/converter/` or `scripts/oracle/`, run their test suite from `plugins/sgs-blocks`: `python -m pytest scripts/oracle/tests/ scripts/converter/tests/ -q --deselect scripts/converter/tests/test_content_gap_collector.py::TestConvertSectionContentGaps::test_sgs_tabs_fixture_surfaces_the_proven_gaps` (about 5 minutes). The deploy does not run it: the converter never ships.

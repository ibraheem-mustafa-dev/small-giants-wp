# SGS Cloning Skill — Salvage Matrix

**Date:** 2026-05-05
**Last revised:** 2026-05-06 (v1 sections pruned; Rosetta Stone addendum added)

---

## ⚠ REVISIONS — Bean's late-session corrections (2026-05-05) override the original below

The original salvage matrix treated all 3 use cases as in-scope and assumed a complex IP-aware schema. Bean's corrections re-scope it. **This section is the authoritative spec.**

### What's now in scope

- **Use Case 3 ONLY: HTML drafts → WP** — get this perfect first. "Don't dilute efforts."
- Recogniser operates at PATTERN boundaries (Hard Rule 6, captured 2026-05-05 row 209)
- Single-table sgs-db with `fingerprint` as the headline column
- uimax extensions to existing tables (no new instance table); add categories (industry/mood/style) + new platforms (PHP/HTML/CSS/WP/Tailwind/Bootstrap/Astro/Next.js/etc.)
- BEM as reference doc OR DB table — defer the choice

### What's now OUT of scope (until Use Case 3 hits 100%)

- Use Case 1: draft → 1-page mockup with LLM design generation
- Use Case 2: competitor pattern harvesting
- Multi-source mix-and-match mode (`--multi`)
- Discovery mode (`--discover`)
- Layer 2 structural fingerprinting + Layer 3 perceptual hash decision layer

### What changes about the salvage decisions

| Capability | Original disposition | REVISED disposition |
|---|---|---|
| `--multi` mix-and-match merge logic (build-website Mode 2) | KEEP | DEFER — Use Case 1 territory |
| `/sgs-discover` discovery mode (build-website Mode 3) | KEEP | DEFER — Use Case 1 territory |
| design-ref's confidence-tiered theme.json schema | KEEP | KEEP — still valuable for HTML draft extraction |
| sgs-extraction's 3-pass capture (HTML / CSS / DOM) | KEEP | KEEP — core of HTML draft ingest |
| recogniser-v2 pattern-boundary emission | KEEP | KEEP and PROMOTE — heart of the pipeline |
| Hostinger MCP `hosting_deployStaticWebsite` | KEEP for UC1 mockup preview | DEFER — UC1 out of scope |
| Single-class vs full-page autonomy targets | A grade = single-class; S grade = full-page | UNCHANGED — Bean confirmed in rubric |
| Schema design (sgs-db patterns, uimax classification) | Complex multi-table | SIMPLIFY per dedup spec corrections — single sgs-db table, fingerprint-keyed, source = `idea`/`draft`/URL only |

### Tools confirmed correct

- `block_compositions` table resurrection (currently 0 rows) ✓
- `wp-pattern-gen.py` extension (don't replace) ✓
- `/sgs-update` keeps its current narrow role (re-scan only, NOT dedup queries) ✓
- `/sgs-db` extension subcommand for fingerprint queries ✓ (Bean: "we could use /sgs-db or a command that calls a script which queries it")

### Out-of-scope skills/commands until UC3 lands

The original spec recommended deprecating `/build-website` + `/clone-patterns` + `/design-tokens`. Don't deprecate yet, just don't invoke them in the new pipeline. They can be revived for Use Cases 1 and 2 when those are scoped back in.

### Net effect on the new skill's design

The skill becomes considerably simpler:

- One input mode: HTML draft folder path
- Output: pattern artefacts in `plugins/sgs-blocks/patterns/<slug>/` + DB rows (sgs-db AND uimax — see Rosetta Stone addendum)
- Internal stages: extract → recognise (pattern-boundaries) → fingerprint → dedup-check → classify → register → assemble → deploy → verify
- All Wave 1-3, Wave 5 deliverables wire in cleanly: screenshot-diff-helper, mockup-parity-validator + Q1-Q4 flag, global-styles-reset, wp-update-block-attrs, brand-palette-sampler, MediaPicker / sgs_render_media (now live across hero + 7 migrated blocks)

### Updated open questions (closed 2026-05-06)

- **Q1 Skill name:** `/sgs-clone` (confirmed 2026-05-06)
- **Q2 Pattern registration scope:** auto-register every clone, semantic WP pattern categories (Heroes / Pricing / etc.) — no `_inbox` staging; pollution prevention via design-token-only patterns + placeholder copy (confirmed 2026-05-06)
- **Q3 uimax extensions:** `industry`/`mood`/`style` columns on `landing`, `colors`, `icons`, `icon_libraries`, `component_libraries`, `ux_guidelines`, `app_interface`, `products`, `gov_patterns`, `interaction_patterns`. New tables: `patterns`, `naming_conventions`, `animations`, `mood_boards`, `stack_sgs_wordpress`, `stack_wordpress`, `stack_php`, `stack_html_css`, `stack_bootstrap`. `is_emoji` flag on `icon_libraries`.

---

## ⚠ ROSETTA STONE ADDENDUM — added 2026-05-06

uimax is the **cross-platform translation layer**. Every uimax row that describes a design artefact (pattern, component, animation, naming convention, design token) MUST carry equivalent-name mappings across:

- SGS block slug
- Vanilla HTML/CSS draft expression
- Bootstrap class
- shadcn / Radix component
- Tailwind utility composition
- React generic component name
- AI-builder equivalent (Lovable / v0 / Bolt where relevant)

Any tool that feeds the Rosetta Stone (the new `/sgs-clone` plus its sibling commands `/uimax-scrape`, `/uimax-sgs-scrape-pattern`, `/uimax-mood-board`, `/uimax-scrape-animation`, `/uimax-classify-naming`) MUST also emit the SGS-block translation. If an artefact has no SGS equivalent, flag it as a **gap candidate** (new-SGS-block suggestion) — never silently drop the translation.

`/animation-harvest` in standalone form is the anti-pattern (captures animations without writing to uimax with SGS-block-attribute mapping). Replaced by `/uimax-scrape-animation`.

Captured as blub.db row 213, pattern_key `uimax-is-the-rosetta-stone-of-design`, area `revenue-sgs`. Full lesson at `C:\Users\Bean\.openclaw\workspace\memory\learning\2026-05-06-uimax-is-the-rosetta-stone-of-design.md`.

**Distinction:** `uimax` = the DB / data activity layer (write/read/query/ingest). `/ui-ux-pro-max` = the intelligence skill that USES the DB for recommendations and judgement. The `/uimax-*` commands are pure DB activity. `/sgs-clone` orchestrates them; calls `/ui-ux-pro-max` only when judgement is needed.

---

## Final command surface (locked 2026-05-06)

| Command | Layer | Purpose |
|---|---|---|
| `/sgs-clone` | Orchestrator | Full HTML draft → live WP pipeline |
| `/uimax-scrape <url-or-folder>` | DB activity | Pull design tokens; write to uimax with cross-platform equivalents |
| `/uimax-sgs-scrape-pattern <url-or-folder> [--section <selector>]` | DB activity | Pull one pattern; write to BOTH sgs-db `patterns` AND uimax `patterns` with full Rosetta Stone mapping |
| `/uimax-mood-board <urls...> [--name <board>]` | DB activity | Bulk-extract intelligence to a named uimax mood board |
| `/uimax-scrape-animation <url-or-block-slug>` | DB activity | Pull one animation; write to uimax `animations` with SGS-block-attribute equivalent populated. Replaces deprecated `/animation-harvest` |
| `/uimax-classify-naming <html-or-css-path>` | DB activity | Identify naming convention; write to uimax `naming_conventions` if novel |
| `/ui-ux-pro-max` | Intelligence | Consumes the DB for design recommendations |

---

## v1 content removed 2026-05-06

The original 350-line v1 salvage matrix (Sections A through E) is preserved in git history for reference. Recovery: `git log --all -- '.claude/specs/cloning-skill-salvage-matrix-2026-05-05.md'` and check the commit immediately preceding the 2026-05-06 prune commit. Do not re-introduce its licensing / provenance / clone_observations / IP-firewall framing — these are explicitly rejected (blub.db row 211, no-licensing-talk-in-sgs-cloning-context).

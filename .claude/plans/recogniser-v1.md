---
doc_type: plan
plan_name: recogniser-v1
project: small-giants-wp
status: ready-for-autonomous-build
mode: overnight-autonomous
acceptance_target: mama's-munches-homepage-live-on-staging
recommended_model: opus
last_updated: 2026-05-01
---

# Recogniser v1 — Build Spec (Autonomous Overnight)

This file is the source of truth for the autonomous overnight run. The session executes against this spec end-to-end, self-QCing at every gate.

## Acceptance Criteria (the bar for "done")

The session is complete ONLY when ALL of the following are true:

1. ✅ Recogniser binary at `tools/recogniser/recogniser.py` runs against any HTML file and produces serialised block markup output
2. ✅ Recogniser tested against `sites/mamas-munches/mockups/homepage/index.html` and produces a complete WordPress page
3. ✅ Page deployed to staging (palestine-lives.org) at the URL `/mamas-munches-homepage-test/`
4. ✅ Playwright visual diff at 375 / 768 / 1440px shows < 5% pixel delta vs `sites/mamas-munches/mockups/screenshots/`
5. ✅ All gap-detector decisions surfaced in `reports/recogniser-run-YYYY-MM-DD.md` with 4-tier classification
6. ✅ Self-QC report at `reports/recogniser-v1-qc.md` shows all 4 gap fixes applied
7. ✅ All changes committed to feature branch `feat/recogniser-v1` and pushed
8. ✅ PR opened with summary

If ANY criterion fails, the session does NOT mark itself done. It surfaces the failure in `reports/recogniser-v1-blockers.md` and parks the work for Bean.

## Architecture (locked from 2026-05-01 brainstorm)

```
HTML mockup
    │
    ▼
[Module 1: Section Detector] — semantic HTML + class signatures
    │
    ▼
[Module 2: Fingerprint Libraries] — SGS DB → Core WP → WooCommerce (in order)
    │
    ▼
[Module 3: Recogniser]
    │   AI matches HTML signature against fingerprint catalogue
    ├── Full match (≥95%)         → extract attrs → block markup
    ├── Partial match (80-95%)    → flag gap + recommend path → log decision
    └── No match (<80%)           → fallback: try core WP, then WC, then transformer (defer if unused)
    │
    ▼
[Module 4: Style Extractor] — computed CSS → palette tokens, spacing tokens, hover/animation entries
    │
    ▼
[Module 5: Serialiser] — block markup as serialised WP comment format
    │
    ▼
[Module 6: Output Router]
    ├── Body sections   → wp post create --post_content
    ├── Header/footer   → theme/sgs-theme/parts/<name>.html
    └── Header/footer   → theme/sgs-theme/patterns/<name>.php (S-tier bonus)
```

## Module Specs

### Module 1 — Section Detector
- **File:** `tools/recogniser/section_detector.py`
- **Input:** HTML string
- **Output:** List of `{section_id, semantic_role (header/main/aside/footer), html_fragment, class_signature}`
- **Logic:** Walk DOM. Group by semantic tags first (`<header>`, `<main>`, `<section>`, `<footer>`). Within `<main>`, split on direct-child sections.
- **Model:** Inline Python (no AI needed) — this is mechanical DOM walking via BeautifulSoup
- **Acceptance:** Mama's homepage produces 8-10 sections matching agent verification report

### Module 2 — Fingerprint Indexer
- **File:** `tools/recogniser/fingerprint_indexer.py`
- **Input:** SGS DB at `~/.claude/skills/sgs-wp-engine/data/sgs.db`
- **Output:** `tools/recogniser/data/fingerprints.json` keyed by HTML signature
- **Sources (in priority order):**
  1. SGS DB — query `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py stats` then per-block `block sgs/<name>`
  2. Core WordPress blocks — hardcoded list (Group, Columns, Heading, Paragraph, Image, Button, Quote, List, Navigation)
  3. WooCommerce blocks — Product Collection, Add to Cart, Cart, Checkout (FSE-compatible since 2022)
- **Per fingerprint:** `{block_name, required_html_pattern, attr_extractors[], required_features[], optional_features[]}`
- **Acceptance:** Catalogue contains ≥59 SGS blocks + ≥9 core blocks + ≥4 WC blocks

### Module 3 — Recogniser
- **File:** `tools/recogniser/recogniser.py` (the main entry point)
- **Input:** HTML mockup path + style variation slug
- **Output:** Per-section match decisions written to `reports/recogniser-run-YYYY-MM-DD.md`
- **AI integration:** Uses Claude CLI (subscription, not API). Shell out to `claude -p --print "<prompt>" --output-format json` per section
- **Cold-prompt template:** `tools/recogniser/prompts/recogniser-prompt.md` — includes section HTML + fingerprint catalogue + 4-tier output schema
- **Output schema (per section):**
  ```json
  {
    "section_id": "hero",
    "match": {
      "block_name": "sgs/hero",
      "confidence": 0.92,
      "tier": "partial",
      "extracted_attrs": {...},
      "gap": {
        "missing_features": ["section-label-above-h1", "mobile-portrait-stack"],
        "classification": "client-css",
        "recommended_path": "extend Mama's Munches variation CSS"
      }
    }
  }
  ```
- **Acceptance:** Mama's homepage produces section decisions matching the verifier agent report (~85% full match, 4 gap-flagged, 1 deferred WC integration)

### Module 4 — Style Extractor
- **File:** `tools/recogniser/style_extractor.py`
- **Input:** HTML element + CSS rules (parsed from `<style>` tags + class lookups)
- **Output:** `{colour_tokens: [...], spacing_tokens: [...], typography: {...}, hover: {...}}` mapped to SGS palette where possible
- **Mapping:** Read `theme/sgs-theme/styles/mamas-munches.json` palette; for each computed colour, find nearest token within ΔE<5; flag misses
- **Acceptance:** ≥80% of Mama's homepage colours map to existing tokens

### Module 5 — Serialiser
- **File:** `tools/recogniser/serialiser.py`
- **Input:** List of `{block_name, attrs, inner_blocks[]}` per page
- **Output:** Valid WP block-comment markup (`<!-- wp:sgs/hero {...} --> ... <!-- /wp:sgs/hero -->`)
- **Validation:** Run output through PHP `parse_blocks()` (server-side) and verify all blocks reparse cleanly
- **Acceptance:** Output is byte-for-byte WordPress-compatible. `wp post create --post_content="$markup"` succeeds.

### Module 6 — Output Router
- **File:** `tools/recogniser/output_router.py`
- **Logic:**
  - `<header>` semantic role → write to `theme/sgs-theme/parts/header-mamas-munches.html`
  - `<footer>` semantic role → write to `theme/sgs-theme/parts/footer-mamas-munches.html`
  - `<main>` content → `wp post create --post_type=page --post_title='Mama's Munches Homepage Test' --post_content=...`
  - **S-tier bonus:** also register the header/footer as patterns in `theme/sgs-theme/patterns/header-mamas-munches.php`

## The 4 Gap Fixes (apply during the run)

| Gap | Path | File(s) to modify | Test |
|---|---|---|---|
| Hero section-label above H1 + mobile portrait-stack | client-css | `theme/sgs-theme/styles/mamas-munches.json` (add `.sgs-hero__label` rule + media query) | Visual diff at 375px shows mobile stack |
| `sgs/notice-banner` right-link slot | extend-base | `plugins/sgs-blocks/src/blocks/notice-banner/{block.json,edit.js,save.js}` (add `linkText` + `linkUrl` attributes + render branch) | Editor renders the new control; render outputs the link |
| `sgs/icon-block` emoji support | extend-base | `plugins/sgs-blocks/src/blocks/icon-block/{block.json,render.php}` (allow `iconType: 'emoji'\|'lucide'` discriminator) | Editor accepts emoji input; render outputs unwrapped emoji |
| Brand story routing → core Columns + Quote + Image (not heritage-strip) | recogniser-decision | `tools/recogniser/recogniser.py` prompt — add example showing brand-story → core blocks not SGS heritage-strip | Recogniser run on Mama's emits core blocks for that section |

## Self-QC Gates (mandatory between modules)

After each module ships, the session MUST run its corresponding gate before proceeding:

| Module | Gate | Action if fails |
|---|---|---|
| 1 — Section Detector | Run on Mama's homepage; verify 8-10 sections match agent report | Iterate detector logic, do NOT proceed to Module 2 |
| 2 — Fingerprint Indexer | Verify fingerprints.json contains ≥59 SGS + ≥9 core + ≥4 WC | Re-query SGS DB; do NOT proceed |
| 3 — Recogniser | Run on Mama's homepage; verify match-tier counts (≥6 full, ≤4 partial, ≤1 deferred) | Tune prompt, re-run, do NOT proceed |
| 4 — Style Extractor | Verify ≥80% colour-to-token mapping | Add fuzzy match tolerance, do NOT proceed |
| 5 — Serialiser | Run output through PHP `parse_blocks()` validator | Fix markup bugs, do NOT proceed |
| 6 — Output Router | `wp post create` returns success; template parts written; pages render in browser | Fix output, do NOT proceed |
| Final | Playwright visual diff at 3 breakpoints < 5% delta | Iterate gap fixes, do NOT mark done |

## Dispatch Strategy (use `/dispatching-parallel-agents` + `/delegate`)

Modules 1, 2, 4, 5, 6 are independent — dispatch in parallel via Sonnet subagents (different files, no shared state).

Module 3 (recogniser) is the integration point — sequence after 1+2 complete.

The 4 gap fixes are independent — dispatch in parallel via Sonnet subagents per gap.

The visual diff Playwright run uses Gemini Flash (1M context for screenshot analysis) for the diff calculation, falling back to Sonnet if needed.

`/cerebras` (Qwen 3 235B) is the cheap option for the Module 1 + Module 5 mechanical work — input <50KB, output <8K tokens. Fits the budget perfectly.

## Branch Discipline

- Branch: `feat/recogniser-v1` (from `main`)
- Each module = its own commit
- Each gap fix = its own commit
- Final commit: end-to-end run + visual diff results
- PR opened to main with summary table at completion

## Files NOT to Touch

- `plugins/sgs-blocks/build/` — build artefacts, regenerated automatically
- `sites/mamas-munches/mockups/` — read-only reference
- Any file in `palestine-lives.org` content database — never modify post_content via WP-CLI
- `theme/sgs-theme/styles/` files OTHER THAN `mamas-munches.json` — preserve other client variations

## Stop Conditions (if any of these fire, STOP and write to blockers.md)

1. SGS DB query returns 0 blocks (DB corrupted)
2. Mama's mockup HTML fails to parse
3. Claude CLI returns auth error 3+ times
4. Server SSH connection fails 3+ times
5. Visual diff > 20% (something is fundamentally wrong, not a tuning issue)
6. Any commit fails pre-commit hooks 2+ times

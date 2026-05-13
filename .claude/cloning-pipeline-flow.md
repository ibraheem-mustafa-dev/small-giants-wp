---
doc_type: visual-reference
project: small-giants-wp
purpose: One-page visual explanation of the SGS Cloning Pipeline. Reference in future conversations to avoid re-explaining the model.
session_date: 2026-05-11
sibling_doc: .claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md (former Spec 14 absorbed 2026-05-12)
---

# SGS Cloning Pipeline — At a Glance

The big picture in one page. For when you (or a fresh session) needs to remember how this thing works without re-reading the full spec.

## What it does — in one sentence

Run one command on a draft mockup → get back a deployed clone plus a visual-qa report, with new patterns / blocks / attributes / extensions automatically detected and applied if visual-qa passes.

## The autonomous flow

```
   ┌────────────────────────────────────────────────────────────────┐
   │  1. INPUT                                                      │
   │  HTML+CSS draft folder (Bean-controlled OR external scrape)    │
   └────────────────────────┬───────────────────────────────────────┘
                            │
                            ▼
   ┌────────────────────────────────────────────────────────────────┐
   │  2. CONVENTION CHECK (/uimax-classify-naming)                  │
   │  Is this in SGS-BEM canonical form?                            │
   │   ┌─ YES → proceed                                             │
   │   └─ NO  → lingua-franca convert to SGS-BEM                    │
   │           (Bootstrap/Tailwind/etc. → SGS-BEM via uimax rules)  │
   └────────────────────────┬───────────────────────────────────────┘
                            │
                            ▼
   ┌────────────────────────────────────────────────────────────────┐
   │  3. WALK EACH SECTION (per <section>, <header>, <footer>)      │
   │                                                                │
   │  Per section, ask 4 questions in order:                        │
   │                                                                │
   │  A. Is this a PATTERN we already know? (Layer 1 envelopes)     │
   │  B. Which BLOCKS does it contain? (Layer 4 inner-blocks)       │
   │  C. Per block: which SLOTS does it have? (Layer 3 elements)    │
   │  D. Per slot: extract value via the role recipe (Layer 2)      │
   │                                                                │
   │  Token-aware: if extracted value matches a theme.json token,   │
   │  use the token reference (var(--wp--preset--color--primary))   │
   │  not the raw hex/px value.                                     │
   └────────────────────────┬───────────────────────────────────────┘
                            │
                            ▼
   ┌────────────────────────────────────────────────────────────────┐
   │  4. DETECT GAPS (4 LEVELS)                                     │
   │                                                                │
   │  Pattern gap       → no SGS pattern fits this section          │
   │  Block gap         → no SGS block fits an inner atomic role    │
   │  Attribute gap     → block exists but missing this CSS control │
   │  Functionality gap → block exists but missing hover/responsive │
   │                                                                │
   │  All gaps recorded with cross-platform mappings (Rosetta Stone)│
   └────────────────────────┬───────────────────────────────────────┘
                            │
                            ▼
   ┌────────────────────────────────────────────────────────────────┐
   │  5. STAGE CHANGES (don't touch canonical yet)                  │
   │                                                                │
   │  • New pattern PHP files staged                                │
   │  • New block scaffolds staged                                  │
   │  • Attribute additions to block.json staged                    │
   │  • Functionality extensions bulk-applied to staged copies      │
   │  • All written to pipeline-state/<run-id>/staging/             │
   └────────────────────────┬───────────────────────────────────────┘
                            │
                            ▼
   ┌────────────────────────────────────────────────────────────────┐
   │  6. PRE-COMMIT GATE CHAIN (mechanical safety nets)             │
   │                                                                │
   │  /lint            → ESLint + Prettier + phpcbf + ruff          │
   │  /diagnostics     → TypeScript / PHP / ESLint LSP errors       │
   │  /wp-perf-gate    → no posts_per_page=-1, query_posts, etc.    │
   │  /wp-theme-check  → theme.json mutations validate              │
   │  /wp-hook-graph   → all hook references are real WP hooks      │
   │                                                                │
   │  Any non-zero exit → STOP. Don't deploy. Report failure.       │
   └────────────────────────┬───────────────────────────────────────┘
                            │
                            ▼
   ┌────────────────────────────────────────────────────────────────┐
   │  7. DEPLOY STAGED → sandybrown                                 │
   │                                                                │
   │  tar + scp + extract + OPcache reset + LiteSpeed purge         │
   │  (Existing tooling — see CLAUDE.md Deploy Commands section)    │
   └────────────────────────┬───────────────────────────────────────┘
                            │
                            ▼
   ┌────────────────────────────────────────────────────────────────┐
   │  8. VISUAL-QA RUNS (the final gate)                            │
   │                                                                │
   │  Multi-frame capture at 0/200/500/1000/3000 ms                 │
   │  Pixel diff at 375 / 768 / 1440 viewports                      │
   │  Accessibility (axe-core)                                      │
   │  Mockup-parity validator (computed-style measurement)          │
   │  Screenshot-diff (perceptual)                                  │
   └────────────────────────┬───────────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            │                               │
         PASS                            FAIL
            │                               │
            ▼                               ▼
   ┌──────────────────────┐     ┌──────────────────────────┐
   │  9a. AUTO-MERGE      │     │  9b. DISCARD STAGING     │
   │                      │     │                          │
   │  rsync staged → main │     │  Canonical never touched │
   │  + rebuild canonical │     │  Backup dir restores if  │
   │  + redeploy + pixel- │     │  step 9a partial-fails   │
   │  diff against        │     │  Gap rows flipped to     │
   │  approved screenshots│     │  status=discarded        │
   │                      │     │  Report shows attempted  │
   │  Single git commit   │     │  mutations + which gate  │
   │  Gap rows → applied  │     │  failed                  │
   │  Run /sgs-update     │     │                          │
   │  Style vars go to    │     │                          │
   │  styles/<client>.json│     │                          │
   │  (NOT root theme)    │     │                          │
   └────────────┬─────────┘     └────────────┬─────────────┘
            │                                │
            ▼                                ▼
   ┌────────────────────────────────────────────────────────────────┐
   │  10. OUTPUT BUNDLE (handed back to Bean)                       │
   │                                                                │
   │  • Deployed URL (sandybrown staging)                           │
   │  • Visual-qa report                                            │
   │  • Gap-candidate manifest (what was auto-added, OR rejected)   │
   │  • Coverage report (per-section attribute fill rate)           │
   │                                                                │
   │  Bean opens URL at 375/768/1440 — final eyes-on review         │
   └────────────────────────────────────────────────────────────────┘
```

## The 4 gap levels at a glance

```
┌─────────────────┬──────────────────────────────────────────┬───────────────────────────────┐
│   GAP LEVEL     │   DETECTION SIGNAL                       │   AUTO-ACTION                 │
├─────────────────┼──────────────────────────────────────────┼───────────────────────────────┤
│  Pattern        │  Section class doesn't match any         │  Stage new pattern PHP file   │
│                 │  existing SGS pattern                    │  at theme/patterns/<slug>.php │
├─────────────────┼──────────────────────────────────────────┼───────────────────────────────┤
│  Block          │  Inner atomic role doesn't match any     │  Stage new block scaffold     │
│                 │  existing SGS block                      │  at plugins/sgs-blocks/src/   │
├─────────────────┼──────────────────────────────────────────┼───────────────────────────────┤
│  Attribute      │  Bucket C declaration on a CSS property  │  Stage attribute add to       │
│                 │  in the role taxonomy (colour, font, …)  │  block.json                   │
├─────────────────┼──────────────────────────────────────────┼───────────────────────────────┤
│  Functionality  │  Hover / media-query / animation rule    │  Bulk apply extension to all  │
│                 │  on block lacking matching extension     │  eligible blocks              │
└─────────────────┴──────────────────────────────────────────┴───────────────────────────────┘
```

All four levels record cross-platform mappings to the **Rosetta Stone**: SGS, vanilla HTML+CSS, Bootstrap, Tailwind, shadcn, React generic, AI builders.

## The two gates (mechanical + visual)

**Gate 1 — Pre-commit chain.** Five mechanical checks (lint, LSP diagnostics, perf-gate, theme-check, hook-graph). If any fails → no deploy. Catches malformed code before it ships.

**Gate 2 — Visual-qa.** Pixel diff + a11y + parity. Runs against the staged deployment. If passes → auto-merge to canonical. If fails → discard staged, canonical untouched.

You (Bean) review the final output — but the GO/NO-GO between detection and application is mechanised.

## Why hero is the exception

Hero is a **composite-single-block**: registered as one block (`sgs/hero`) but renders headline + sub + CTAs + image internally. Looks like a pattern from the recogniser's view, but it's actually one block. So:

- Layer 4 (composition) = `[sgs/hero]` (degenerate — pattern composition is itself)
- Layer 3 (slots) + Layer 2 (roles) = fully populated with hero's 173 attributes

Every other section type (ingredients-section, gift-section, footer, etc.) is a real composition of multiple inner blocks.

## SGS-BEM is the central language

```
.sgs-<block>__<element>--<modifier>
   │       │           │
   │       │           └─ block.json attribute value (enum)
   │       └─ slot id from the block's slot list
   └─ SGS block slug
```

Bean-controlled drafts MUST use this. External scrapes get converted to this at Stage 2 (lingua-franca-conversion).

This is what makes intent detection deterministic: a button labelled `.sgs-button__cta--latest-blog` directly declares the modifier value `latest-blog`, which maps to an enum in block.json. The block's render.php resolves it to a WP_Query for the latest post. No NLP needed for in-house drafts.

## What lives where

```
THE FRAMEWORK (this repo)
├── plugins/sgs-blocks/
│   ├── src/blocks/<slug>/         ← atomic blocks (one folder each)
│   ├── scripts/recogniser/        ← pipeline dispatcher scripts
│   ├── scripts/fingerprint-builder/output/  ← 4-layer catalogue JSON
│   └── scripts/uimax-tools/       ← uimax write infrastructure
│
├── theme/sgs-theme/
│   ├── theme.json                 ← design tokens (palette, spacing, custom)
│   ├── parts/                     ← stable slots (header.html, footer.html)
│   ├── patterns/                  ← per-client + generic patterns (PHP)
│   ├── templates/                 ← page templates (HTML)
│   └── styles/                    ← style variations (JSON per client)
│
└── tools/recogniser-v2/extract.py ← per-section attribute extractor

THE CATALOGUE (data layer)
├── sgs-framework.db               ← blocks, patterns, compositions, tokens
└── uimax db                       ← Rosetta Stone, naming conventions,
                                     animations, component libraries
```

## Quick mental model for any future session

1. **Input = a draft + a single command.** No arguments needed; sensible defaults.
2. **Pipeline runs to completion or aborts cleanly.** Never partial-mutates the framework.
3. **Visual-qa is the final gate.** If it passes, the framework grows. If it fails, the framework is untouched.
4. **Every cloning run compounds the catalogue.** Next clone benefits from this one.
5. **Cross-platform via Rosetta Stone.** Anything captured here also captures its Bootstrap / Tailwind / shadcn / React equivalent so external work translates back.

## See also

- Full spec: [.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md (former Spec 14 absorbed 2026-05-12)](specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md)
- Canonical naming convention: [.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md (§8.1; former Spec 13 absorbed 2026-05-12)](specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md)
- 9-stage pipeline detail: [.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md (former Spec 12 absorbed 2026-05-12)](specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md)

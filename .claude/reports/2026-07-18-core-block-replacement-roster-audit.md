---
doc_type: report
title: Core→SGS block-replacement roster audit
project: small-giants-wp
session_date: 2026-07-18
author: Claude
---

# Core→SGS block-replacement roster audit (2026-07-18)

**Trigger:** the session handoff claimed the Indus homepage (page 13) still ships
`core/row` blocks with no migration. Fact-checking that claim against live
`post_content` (prove-the-cause) **falsified the premise** and surfaced the real
gaps. This audit enumerates every `replaces` mapping against its pairing-module
status so no gap is silently carried.

## 1. Handoff premise — corrected

- **Page 13 contains ZERO `core/row` and ZERO `core/stack`.** (Verified: REST
  `pages/13?context=edit` raw content, 95 block-open comments; no `wp:row`/`wp:stack`.)
- What page 13 **actually** ships (authoritative `lint-page.py --check`): **20
  banned core instances, 5 types — all with working pairings:**
  `core/column ×10`, `core/group ×3`, `core/heading ×3`, `core/columns ×3`,
  `core/image ×1` → all migratable today with existing scripts. They were never
  *applied* to page 13 (only the CTA section was, per the migrator README).
- **`core/row`/`core/stack`** are **latent code gaps** — listed in
  `lint-page.py PAIRING_ORDER` + the `replaces` map, but with no pairing module.
  They never appear in real drafts (WP serialises Row/Stack as `core/group` with a
  flex layout, handled by `group_pairing`). Built this session anyway for roster
  completeness (Bean scope decision, 2026-07-18).

## 2. The real gap the audit surfaced

**`core/separator` is entirely unmapped.** `src/blocks/separator/block.json`
description states *"Replaces core/separator framework-wide"*, yet `core/separator`
is **absent from `scripts/data/block-replacements.json`** (and has no pairing), so
the linter does not flag it — page 13's 1 `core/separator` sails through
undetected. Registered + paired this session.

## 3. Full roster — every mapping vs pairing status

Source of truth: `plugins/sgs-blocks/scripts/data/block-replacements.json`
(DB `blocks.replaces` is a derived copy). 31 core→SGS mappings; **11 had
pairings before this session, 20 did not.**

### Built pairings (11 pre-existing)
`core/button`, `core/buttons`, `core/column`, `core/columns`, `core/cover`,
`core/group`, `core/heading`, `core/image`, `core/latest-posts`,
`core/paragraph`, `core/site-logo`.

### Built THIS session (+3)
| Core block | → SGS | Why now |
|---|---|---|
| `core/separator` | `sgs/separator` | Real gap — block self-declares the replacement; was unmapped |
| `core/row` | `sgs/container` | Roster completeness (latent gap in PAIRING_ORDER) |
| `core/stack` | `sgs/container` | Roster completeness (latent gap in PAIRING_ORDER) |

### PARKED — mapped, no pairing, not built (17)
These appear in the `replaces` map but have **no pairing module** and **do not
appear in any current live draft** (Indus / Mama's). Build each when a real draft
first uses it — building speculatively is unproven-need work. **Not silently
dropped — tracked here.**

| Core block | → SGS | Note |
|---|---|---|
| `core/accordion` | `sgs/accordion` | Composite; build on first draft use |
| `core/accordion-item` | `sgs/accordion-item` | (see `migrate-details-to-accordion.py` — separate one-off) |
| `core/details` | `sgs/accordion-item` | ” |
| `core/audio` | `sgs/audio` | Leaf; build on first draft use |
| `core/video` | `sgs/media` | Leaf; `image_pairing` covers images only |
| `core/gallery` | `sgs/gallery` | Composite |
| `core/icon` | `sgs/icon` | Leaf |
| `core/quote` | `sgs/quote` | Leaf |
| `core/pullquote` | `sgs/quote` | Leaf |
| `core/breadcrumbs` | `sgs/breadcrumbs` | Leaf |
| `core/media-text` | `sgs/hero` | Composite (`cover_pairing` covers core/cover) |
| `core/form` | `sgs/form` | Composite |
| `core/form-submit-button` | `sgs/form` | ” |
| `core/social-links` | `sgs/social-icons` | Composite |
| `core/social-link` | `sgs/social-icons` | ” |
| `core/tab` | `sgs/tab` | Composite |
| `core/tabs` | `sgs/tabs` | Composite |
| `core/table-of-contents` | `sgs/table-of-contents` | Leaf |

## 4. Actions taken this session

1. Registered `core/separator → sgs/separator` in `block-replacements.json`.
2. Built `separator_pairing.py`, `row_pairing.py`, `stack_pairing.py`.
3. Re-synced DB `blocks.replaces` from the JSON via `/sgs-update`.
4. Applied the existing migration to page 13 (20 banned instances → native SGS)
   via editor-apply, design-reviewed before/after.

## 5. Follow-up (parked, not lost)

- The 17 unbuilt pairings above — build on first real-draft use, not speculatively.
- Roster-completeness guard idea: a test asserting every `PAIRING_ORDER` entry has
  either a pairing module or a documented park (would have caught row/stack sooner).

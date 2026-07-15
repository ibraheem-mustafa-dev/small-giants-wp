> **ABSORBED BY SPEC 15** — see `.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md`.
> Preserved here for commit-message history continuity. Do not author new work against this doc.
> All content + rules carried forward to Spec 31 (v0.2, 2026-05-12).

---

---
doc_type: spec
spec_id: 13
title: Draft Naming Convention (SGS-prefixed BEM)
status: locked
locked_at: 2026-05-10
captured_in_blub_db: 236
pattern_key: bean-drafts-use-sgs-prefixed-bem-naming
strategic_objective: revenue-sgs
supersedes: ad-hoc kebab-semantic class names in pre-rule mockups
related_specs:
  - 12-DRAFT-TO-SGS-PIPELINE.md
  - 02-SGS-BLOCKS-REFERENCE.md
  - 11-SGS-BUTTON-ARCHITECTURE.md
---

# Draft Naming Convention (SGS-prefixed BEM)

**Status:** Architecture locked 2026-05-10. Canonical reference for the convention rollout plan (`.claude/plan.md` + phases 1-8). Captured as blub.db row 236, pattern_key `bean-drafts-use-sgs-prefixed-bem-naming`.
**Scope:** All Bean-controlled drafts (mockups, sketches, hand-coded HTML produced in-house). Live scrapes (sites Bean does NOT control) follow the lingua-franca-conversion sub-rule (Section 5).
**Replaces:** ad-hoc kebab-semantic class names in pre-rule mockups (e.g. `.hero-section`, `.cta-button`).

---

## 1. The Rule

> Every Bean-controlled draft MUST use SGS-prefixed BEM:
>
> ```
> .sgs-<block>__<element>--<modifier>
> ```
>
> - `<block>` matches an SGS block name (`hero`, `cta-section`, `card-grid`, `team-member`, etc.) — slug from `block.json`.
> - `__<element>` matches a slot id from the block's slot list (e.g. `__copy`, `__image`, `__cta`).
> - `--<modifier>` matches an attribute value from the block's `block.json` (e.g. `--center`, `--inverse`, `--compact`).

If no SGS block fits a draft section, flag the section as a **gap candidate** (proposed new SGS block) before authoring — never invent an off-spec class name.

## 2. Why this convention

Drafts and rendered SGS share the class-name space. With this convention the `/sgs-clone` 9-stage pipeline collapses from probabilistic-with-fallback to **deterministic** for all Bean-authored drafts:

| Stage | Today (probabilistic) | After-rule (deterministic for drafts) |
|---|---|---|
| 1 boundary detect | DOM heuristics | Literal `.sgs-<block>` match |
| 2 block-type match | Recogniser score + fallback | Literal slug → block.json lookup |
| 3 slot list | block.json parse | Same — literal `__<slot>` → slot id |
| 4 rule-of-thumb extract | Heuristic | `--<modifier>` → attribute value |
| 5 all-CSS harvest | Same | Same |
| 6 CSS classify | Classifier model | Direct from BEM structure |
| 7 composition emit | Inferred | Direct from `.sgs-<block>` boundaries |
| 8 WP serialise | Same | Same |
| 9 coverage report | Same | Same (now reports literal-match coverage) |

The naming-convention coverage gap that surfaced repeatedly in the M9 redo was misdiagnosed as "add 7 more platform translation rules" when the actual fix is to constrain the source side. Probabilistic recognition stays only where Bean does NOT control source naming (Section 5).

## 3. Examples per role

### 3.1 Wrapper

| Role | Class |
|---|---|
| Hero block wrapper | `.sgs-hero` |
| CTA section wrapper | `.sgs-cta-section` |
| Card grid wrapper | `.sgs-card-grid` |

### 3.2 Primary text element

| Role | Class |
|---|---|
| Hero copy slot | `.sgs-hero__copy` |
| CTA section heading slot | `.sgs-cta-section__heading` |
| Team member name slot | `.sgs-team-member__name` |

### 3.3 Media slot

| Role | Class |
|---|---|
| Hero image slot | `.sgs-hero__image` |
| Card grid card image slot | `.sgs-card-grid__card-image` |

### 3.4 Link / CTA

| Role | Class |
|---|---|
| Hero primary CTA | `.sgs-hero__cta` |
| Hero secondary CTA | `.sgs-hero__cta--secondary` |
| Footer link | `.sgs-footer__link` |

### 3.5 Modifier (variant / state)

| Role | Class |
|---|---|
| Hero with split image | `.sgs-hero--split-image` |
| Inverse hero (light text on dark) | `.sgs-hero--inverse` |
| Compact card grid | `.sgs-card-grid--compact` |

### 3.6 Responsive spacing

Spacing modifiers reference the `theme.json` spacing scale tokens. Always use the `--<size>` form, not raw px.

| Role | Class |
|---|---|
| Hero with extra-large vertical padding | `.sgs-hero--padding-xl` |
| Tight card grid gap | `.sgs-card-grid--gap-sm` |

### 3.7 Visual token (palette / type)

Palette assignments reference `theme.json` palette slugs (`--primary`, `--accent`, `--surface-alt`).

| Role | Class |
|---|---|
| Hero on accent background | `.sgs-hero--bg-accent` |
| Card grid with surface-alt cards | `.sgs-card-grid--card-bg-surface-alt` |

## 4. Migration policy

| Status | Policy |
|---|---|
| New drafts (post 2026-05-10) | MUST conform. Stage 0 hard-rejects on production. |
| Existing pre-rule drafts (e.g. Mama's mockup) | Use `--legacy` flag on `/sgs-clone` for one-off bypass. Migrate per-mockup as time permits (Mama's first, Phase 6 of rollout plan). |
| Drafts authored with `--draft-mode` | Soft lint warning surfaces on Stage 0 violations; pipeline continues. |

## 5. Lingua-franca-conversion sub-rule (live scrapes only)

Live scrapes (sites Bean does NOT control) carry source-convention class names that we cannot dictate. The `/uimax-*` skills (`/uimax-scrape`, `/uimax-sgs-scrape-pattern`, `/uimax-mood-board`, `/uimax-scrape-animation`, `/uimax-classify-naming`) MUST:

1. **Convert at write time:** every scraped class is converted to its SGS-BEM equivalent and written as the **primary** class name in the relevant uimax row (`patterns.primary_class`, `component_libraries.primary_class`, `animations.primary_class`).
2. **Preserve the source:** the original class name is stored as a sibling row in `equivalent_implementations` (Rosetta Stone discipline, Hard Rule 7) with `convention=<source-convention-slug>` (e.g. `kebab-semantic`, `tailwind-utility-composition`, `bootstrap`, `bem-bare`).
3. **Never silently drop:** if no SGS-BEM equivalent exists, flag the row as a gap candidate (`is_gap_candidate=1`, `gap_reason=no-sgs-block-equivalent`) instead of dropping the row.

The recogniser then operates on the SGS-BEM primary, with passport fallback for unmapped classes.

## 6. Cross-platform structural alignment

The convention's class-name parts map 1:1 across platform conventions in uimax `naming_conventions`:

| Platform | block | element | modifier |
|---|---|---|---|
| SGS-BEM (canonical) | `.sgs-hero` | `__copy` | `--center` |
| HTML/CSS draft (pre-rule) | `.hero-section` | `.hero-copy` | `.hero-copy--center` |
| Bootstrap | `.hero` | `.hero-text` | `.text-center` |
| shadcn/Radix | `<Hero>` slot=`copy` | `data-slot="copy"` | `data-align="center"` |
| Tailwind utility composition | n/a (no semantic class) | n/a | `text-center` utilities |
| React generic | `<Hero>` | `<HeroCopy>` prop | `align="center"` prop |
| AI-builder output (Lovable, v0, Bolt) | `.hero` (varies) | `.hero-content` (varies) | `.text-center` (varies) |

uimax `naming_conventions.is_canonical_for_sgs_drafts` flags only the SGS-BEM row as `1`. All others remain valid for representing source conventions in scraped data; none are valid for new draft authoring.

## 7. Validation

### 7.1 Selector regex

A conforming class matches:

```
^\.sgs-[a-z][a-z0-9-]*(__[a-z][a-z0-9-]*)?(--[a-z][a-z0-9-]*)?$
```

### 7.2 Automated lint command

The Stage 0 pre-flight gate runs `tools/recogniser-v2/validate-naming.py <draft-path>`:

- **Production run:** exit non-zero on any non-conforming class. Pipeline halts.
- **`--draft-mode`:** print warnings to stderr, exit zero. Pipeline continues.
- **`--legacy`:** skip the gate entirely (one-off bypass for pre-rule drafts).

The gate verifies, in order:

1. Every class in the draft matches the regex in 7.1.
2. Every `<block>` segment matches an SGS block slug (lookup in sgs-framework.db `blocks.slug`).
3. Every `__<element>` segment matches a slot id from that block's slot list.
4. Every `--<modifier>` segment matches an attribute value declared in that block's `block.json`.

Mismatches at steps 2-4 surface as gap candidates with the offending class as evidence.

### 7.3 Lifecycle gate hook

`lifecycle-gate.py` extends to reject SKILL.md edits in `/sgs-clone`, `/uimax-*`, and `/sgs-extraction` that introduce or accept non-`.sgs-` class names without an explicit `--legacy` or `--draft-mode` reference. Ensures the rule survives future skill edits.

---

## Cross-references

- Lesson capture: blub.db row 236, pattern_key `bean-drafts-use-sgs-prefixed-bem-naming`
- Workspace lesson file: `C:/Users/Bean/.openclaw/workspace/memory/learning/2026-05-10-bean-drafts-use-sgs-prefixed-bem-naming.md`
- CC feedback memory: `C:/Users/Bean/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_bean_drafts_use_sgs_prefixed_bem_naming.md`
- Convention rollout plan: `.claude/plan.md` + `.claude/plans/phase-1 through phase-8.md`
- Pipeline architecture: `.claude/specs/12-DRAFT-TO-SGS-PIPELINE.md`
- Block reference: `.claude/specs/02-SGS-BLOCKS-REFERENCE.md`
- Hard Rule 7 (Rosetta Stone): project root `CLAUDE.md`
- Hard Rule 8 (uimax data layer location): `~/.agents/skills/sgs-wp-engine/SKILL.md`
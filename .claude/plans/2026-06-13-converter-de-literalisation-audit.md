---
doc_type: phase-plan
project: small-giants-wp
thread: cloning-pipeline
title: "Converter de-literalisation — rip out per-block `if slug == \"sgs/X\"` carve-outs, replace with DB mappings / draft conventions"
created: 2026-06-13
status: SCOPED — next-session programme. Needs its own design + /adversarial-council before building (Rule 7: convert.py is the highest-blast-radius shared mechanism).
parent: continuation of the "name-free converter" goal — the A align layer-router (D222, commit c5ecb4eb) was the FIRST slice; this is the bigger slice.
---

# Converter de-literalisation programme

## Goal (Bean-set, 2026-06-13)

`convert.py` runs BOTH a universal DB-driven attribute lift (`_lift_scalar_attrs_by_selector`, via `block_attributes.derived_selector` — the mechanism that now handles testimonial D212 + team-member D222) AND ~13 legacy per-block `if slug == "sgs/X"` branches that hardcode each block's content-attr schema in code. The latter conflict with **Spec 22 FR-22-3** ("per-block behaviour comes from DB rows, not code branches") + **R-22-1** (DB-first, no hardcoded dicts).

**The method (per Bean):** for EACH literal below — (1) investigate WHY it's hardcoded (what it extracts, what render.php consumes), (2) decide: reducible to a DB entry / `derived_selector` mapping OR a standard draft-BEM convention, vs a genuine necessary exception, (3) rip out + replace with the DB/convention path if reducible; keep + DOCUMENT if a true exception. **iconCircleBackground is the exemplar of the anti-pattern:** rather than hardcode a trust-bar crutch into the script, it should have been a DB mapping (its `derived_selector` → the icon-circle element) OR a standard draft convention — not an `if slug == "sgs/trust-bar"` hand-read.

## The literal register (convert.py line numbers — captured 2026-06-13, commit c5ecb4eb)

### A. Per-block `if slug == "sgs/X"` carve-outs (the targets — ~13)

| Line | Literal / branch | What it does | First-pass assessment |
|------|------------------|--------------|------------------------|
| 2744 | `if "sgs/multi-button" in child_slugs` (+ emits `sgs/button` 2753-2754, `sgs/multi-button` 2755) | wraps loose buttons into a multi-button group | likely reducible via `block_for_slot_token`/group DB lookup (5062 already does this with a fallback) |
| 2936 | `if slug == "sgs/heading" and tag in (h1..h6)` → `{content, level}` | leaf heading attr extraction | `content` reducible to role=content DB lift; `level` = tag-shape transform (likely keep) |
| 2940 | `if slug == "core/heading"` → `{level:int, content}` | core heading | core block — may be out of scope (DB covers sgs/* only) |
| 2945 | `if slug == "sgs/text" and tag in (p,span,div)` → `{text}` | leaf text | reducible — this is the canonical role=content lift |
| 2949 | `if slug == "core/paragraph"` → `{content}` | core paragraph | core block — assess scope |
| 2956 | `if slug == "sgs/media" and tag == "img"` → `{imageUrl, imageAlt, height→maxHeight…}` | image extraction + height CSS lift | `imageUrl/imageAlt` reducible (image-object role, cf. team-member memberMedia D222); height lift = assess |
| 2978 | `if slug == "sgs/media" and tag in (video,iframe)` | video/embed extraction | assess (media-type specific) |
| 3001 | `if slug == "sgs/button" and tag in (a,button)` | button text + href | reducible to content + href DB roles |
| 3011 | `if slug == "sgs/quote" and tag == blockquote` | quote extraction | reducible to role=content |
| 3019 | `if slug == "sgs/icon-list" and tag in (ul,ol)` | list-item array extraction | array extraction — assess (cf. option-picker) |
| 3035 | `if slug == "sgs/option-picker" and tag in (div,fieldset,section,ul)` | optionItems array extraction | complex array — likely a genuine exception (document) |
| 3091 | `if slug == "sgs/icon"` | icon identity/source resolution | cf. icon_resolver.py — assess |
| 3111 | `if slug == "sgs/testimonial" and css_rules` | per-block CSS-driven extraction | testimonial already on the DB scalar-lift (D212) — is this branch now redundant? CHECK |
| 3158 | `if slug == "sgs/notice-banner" and css_rules` | per-block CSS handler | cross-check vs the IN-F child-lift (D222) — redundant? CHECK |
| 3191–3350 | `if slug == "sgs/trust-bar" and tag in (section,div,ul,nav)` — incl. `badgeStyle` (3295), grid detect (3318), **`iconCircleBackground` hand-read (3335-3350)** | trust-bar badge/grid/icon-circle extraction | THE exemplar. iconCircleBackground → DB mapping or draft convention; gap already routes name-free; badgeStyle = variant detection (cf. variant_slots) |

### B. Permitted / acceptable literals (NOT targets — for completeness so they aren't re-flagged)

- **`sgs/container` literals** (~25: 918, 932, 947, 962, 1901, 1931, 1949, 3775, 3777, 4007, 4421, 4843, 4871, 5098, 5130, 5142, …) — the documented **FR-22-4 container-base exception** (the ONE permitted block-name constant). Keep.
- **DB-lookup-with-fallback** (4457 `atomic_tag_map().get("p") or "sgs/text"`; 5062 `block_for_slot_token("button-group") or "sgs/multi-button"`; 5013 `target="sgs/text"`) — DB drives, literal is a safety net. Low priority.
- **`widthMode` value literals** (`"full"`/`"custom"`/`"wide"` at 1460, 3970-3978, 4062-4083) — section-width VALUE logic, not block-name literals. Separate concern; assess only if the de-lit pass touches the section-width path.

## Verification approach (per handler, when ripping out)
- Conformance is the regression floor: **Gate A** (`scripts/tests/test_converter_conformance.py`, 43 fixtures — the SEPARATE pre-commit harness, NOT just `converter_v2/tests/`) + **converter_v2/tests/** must both stay green per handler removed. (D222 lesson: a subagent "conformance passed" can miss Gate A — run BOTH.)
- For each handler converted to the DB lift: add/confirm the block's `derived_selector` + `role` rows reproduce via **`/sgs-update`** (NOT a manual DB edit, NOT a module-load side-effect — D222 lesson; use a dated `migrations/*.py` for any new property/seed rows).
- Phase the build: one wave per handler (or small cluster), `/qc-council` before each converter commit (blub.db 255), commit by explicit path, merge via temp-worktree if main is co-actively held.
- Watch for ALREADY-redundant branches: testimonial (3111) + notice-banner (3158) may be partially/fully superseded by the D212/D222 universal lifts — confirm before assuming they still do work.

## Gating
convert.py is the highest-blast shared mechanism (Rule 7). This programme gets its OWN design pass + `/adversarial-council` on the de-literalisation approach BEFORE building — exactly as the A align router did. The align router (D222) is the proven template: find the universal DB primitive that already exists, route the literal through it, prove byte-identical via roster parity + conformance, keep a small documented exception set.

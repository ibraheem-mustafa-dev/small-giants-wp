---
doc_type: session
date: 2026-08-05
track: "Track 1b / Spec 35"
note: "Swept from LEDGER.md at the 2026-08-05 close — superseded by STEP 0 CLOSED. Kept verbatim for provenance."
---

# Swept from LEDGER — Track 1b, superseded 2026-08-05

## Task A bullet (superseded by STEP 0 CLOSED)

⛔ The retirement-condition claim inside the swept text below is the one CORRECTED on 2026-08-05.
The prefix->suffix rename does NOT retire the `authored-alt-text` category. Verified AFTER the
rename: renaming changed no `attr_type`, and `converter/walk.py:295` gates alt capture on
`role == "image-object" AND attr_type == "string"` — the logo attrs were still `type=number`, so
`image-alt` stayed non-viable. It is the separate attr-SHAPE change (the `logoUrl`/`logoUrlTablet`/
`logoUrlMobile` string attrs added alongside the integer IDs, mirroring `sgs/media`'s
`imageId`+`imageUrl`) that actually retires it. Shipped in commit `12931409`.

- **⭐ Track 1b (Spec 35) Task A — structural content-role detection SHIPPED 2026-08-04 (D485).**
  `sgs/%` `role IS NULL` 703 -> 669 -> **661 after 2026-08-05 follow-ons (D489/D490)**. Residuals
  narrowed: a11y-metadata roles now RESOLVED (D489 a11y-text seeded + D490 `authored-alt-text` split
  fixes the alt/placeholder-excluded-from-content-walk defect); 127 unreached rows + name-regex
  fallback-still-present remain open. Same-session (2026-08-04): Track B fixed 3 `slots.aliases`
  collisions (D486); Track C refuted the tier-NULL mobile-parity theory and identified fluid
  typography as the real cause (D487/D488). **2026-08-05 follow-on (D489/D490):** svg role SHIPPED
  (was actively destructive — `rich_text_content()` stripped `<svg>`/`<path>` to empty text) + D1
  forward variable tracking SHIPPED (9/9 previously-unresolved rows now classify) + two aggregator
  position-vs-rule fixes SHIPPED (`content_cats[0]` document-order tie-break; D1-only-veto vanishing
  bucket) + `authored-alt-text` category split completed (PHP half pre-existed, Python `final_
  category` half was missing — now matches). `sgs/responsive-logo.alt` uses `authored-alt-text` as
  an INTERIM measure: its real defect is naming the device tier as a PREFIX
  (`desktopLogoId`/`tabletLogoId`/`mobileLogoId`) where the whole framework uses a SUFFIX
  (`backgroundImage`/`backgroundImageTablet`), making it invisible to the D480 device-tier axis —
  see D490 for the retirement condition. Full detail + the 6 new Task-F conditions:
  `memory/session-2026-08-04-spec35-enforcement.md` + `plans/spec-35-inspector-DONE-checklist.md`
  (items 22-27, condition 22 extended 2026-08-05 with the position-vs-rule aggregator pattern).

## Side-job — responsive-logo (COMPLETED 2026-08-05, commit 12931409)

### Side-job — standardise `sgs/responsive-logo`

Names responsive tiers with a PREFIX (`desktopLogoId`/`tabletLogoId`/`mobileLogoId`) where the whole
framework uses a SUFFIX (`backgroundImageTablet`) — `modifier_suffixes` peels a suffix, so the D480
device-tier axis is structurally blind to it (all 3 rows `is_responsive=0`, `css_tier=NULL`, every
gate green). Renaming to the suffix convention collapses the 3 images into one base attr with tier
siblings, gives `alt_companion_attr` a single image attr to name, lets `image-alt` fire natively, and
**retires the `authored-alt-text` category** (record this as its retirement condition — do not
maintain it once the rename lands). ⚠ `placeholder`'s D482 justification is SEPARATE and does not
depend on this rename. **Est. 30 min. Delegated, sonnet, worktree — block.json + converter attr
rename across one block.**

### Dependency graph

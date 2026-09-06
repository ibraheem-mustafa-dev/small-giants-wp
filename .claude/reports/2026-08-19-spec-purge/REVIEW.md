# Spec staleness purge - review register

Consolidated from the per-branch registers. **Nothing has been applied to any spec.**

Counts below are derived by parsing rows, not copied from any branch's own totals.

## Totals

| Verdict | Rows | What happens |
|---|---|---|
| ESCALATE | 6 | Needs your call - resolved against code, not prose |
| CONDENSE | 90 | Dead text removed, the rule it carried survives as one line |
| CUT | 87 | Deleted outright, nothing of value lost |
| EXCLUDE | 370 | Deliberately left alone - listed so the gate knows they were considered |

**Total rows: 553**

## Per-spec breakdown

| Spec | ESCALATE | CONDENSE | CUT | EXCLUDE |
|---|---|---|---|---|
| 00-OVERVIEW.md | 0 | 0 | 0 | 1 |
| 00-naming-conventions.md | 0 | 0 | 1 | 5 |
| 01-SGS-THEME.md | 0 | 2 | 1 | 7 |
| 02-SGS-BLOCKS.md | 1 | 5 | 1 | 20 |
| 03-SGS-BOOKING.md | 0 | 0 | 0 | 5 |
| 11-SGS-BUTTON-ARCHITECTURE.md | 1 | 1 | 3 | 8 |
| 18-SGS-FLOATING-UI.md | 0 | 2 | 0 | 3 |
| 19-SGS-CLI-COMMANDS.md | 0 | 2 | 0 | 5 |
| 20-CLONE-FIDELITY-MEASUREMENT.md | 0 | 0 | 0 | 8 |
| 26-SGS-GLOBAL-STYLES-AND-THEMING.md | 0 | 1 | 0 | 10 |
| 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md | 0 | 8 | 0 | 30 |
| 28-SGS-SMART-BULK-PRICING.md | 0 | 1 | 0 | 7 |
| 30-SGS-WOOCOMMERCE-PAGE-TYPES.md | 0 | 0 | 6 | 5 |
| 31-UNIVERSAL-CLONING-PIPELINE.md | 1 | 17 | 11 | 53 |
| 32-COMPONENT-STYLING-TOKEN-CONTRACT.md | 0 | 13 | 2 | 21 |
| 33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md | 0 | 0 | 2 | 10 |
| 35-BLOCK-INSPECTOR-UX-STANDARD.md | 1 | 9 | 47 | 60 |
| 36-SGS-NAVIGATION-SYSTEM.md | 1 | 4 | 2 | 25 |
| 37-HEADER-FOOTER-BUILDER.md | 1 | 5 | 5 | 42 |
| 38-SGS-MOTION-SYSTEM.md | 0 | 20 | 6 | 25 |
| README.md | 0 | 0 | 0 | 20 |


---

# ESCALATE (6)

These need the code, not the prose. Each carries both candidate truths and the command that settles it.

### 02-SGS-BLOCKS.md:330 / 371 / 397 / 525-527 / 554 / 570  (ESCALATE, from 02-01-11.md)

BEFORE:
- L330: "**Render:** Dynamic `render.php` (save returns null; converted static→dynamic 2026-05-19, commit `a9083ca9`, with a `deprecated.js` shim for existing posts)."
- L371: "All content rendered from typed attributes; no InnerBlocks in production (legacy InnerBlocks shapes preserved via `deprecated.js` v8)."
- L397: "**Render:** Dynamic `render.php` (`save.js` returns `null`). `deprecated.js` v8 migrates BOTH legacy shapes (old InnerBlocks children + old scalar attrs). Live-verified migrating 3 real testimonials on page 8 (D206)."
- L525-527: "Existing posts auto-migrate via `trust-bar/deprecated.js` v2 `isEligible()` + `migrate()` entry."
- L554: "FR-31-6 InnerBlocks migration shipped 2026-06-02; `deprecated.js` v3 preserves existing posts (prior null-save shape)."
- L570: "Merged into `sgs/container`. (...) Existing posts auto-migrate via `deprecated.js` v2 entry."
AFTER:  N/A — dispatcher call
NOTE:   **Direct contradiction of the spec's own D271/D293 rule (L143/L159: "No `deprecated.js`, deleted plugin-wide") and of Spec 11's block-migration-DONE-checklist policy.** Ran the two verification commands from the dispatch brief:
  `find plugins/sgs-blocks/src/blocks -iname "deprecated.js" | wc -l` → **0** (no `deprecated.js` file exists anywhere in the tree).
  `grep -rl "deprecated" plugins/sgs-blocks/src/blocks/*/block.json` → 2 hits, both are stale `_comment_*` doc-string ATTRIBUTES (not code), not deprecated.js files: `brand-strip/block.json` line 137 ("Legacy `{ image: {...} }` shape retained on existing posts via deprecated.js v2 migrate") and `feature-grid/block.json` line 98 ("Existing posts migrate via deprecated.js v3"). Neither block ships a `deprecated.js` file today.
  Also checked `index.js` for inline `deprecated:` arrays (the alternative WP-native migration mechanism) — zero hits.
  **Both candidate truths:**
  (A) D271/D293 are current and correct — `deprecated.js` was deleted plugin-wide, no version bumps pre-production, and every one of these 6+ spec sentences (plus the 2 block.json comments found above) is a fossil describing a mechanism that no longer exists. Any post created while these blocks briefly had live `deprecated.js` migrations (certification-bar→trust-bar, testimonial D206, notice-banner, svg-background→container, trust-bar static→dynamic) would NOT auto-migrate today — a live-content risk if any pre-2026-07 post_content still carries the old shapes.
  (B) Some individual block's migration genuinely shipped and ran before D271 retired the mechanism framework-wide, and the spec text is a correct HISTORICAL record of a real one-time migration that already completed (i.e., no current posts are left in the old shape, so the absence of the file today is fine) — in which case the prose should be past-tense ("was migrated via a since-removed deprecated.js v8") rather than present-tense ("migrates BOTH legacy shapes").
  **Command that would settle it:** query whether any LIVE post_content on sandybrown still contains the pre-migration block shapes these deprecated.js versions targeted (old testimonial InnerBlocks children, old certification-bar block markup, old svg-background variant, old trust-bar static markup) — e.g. `wp post list --post_type=page --format=ids | xargs -I{} wp post get {} --field=content | grep -c 'wp:sgs/certification-bar\|wp:sgs/svg-background'` over SSH, cross-referenced with `git log --oneline -- 'plugins/sgs-blocks/src/blocks/*/deprecated.js'` to find when each version was added/removed and whether it ran against production content before deletion.
  Do not silently rewrite these lines to past tense without that check — if any post is still in the old shape, deleting the "how to migrate" prose loses the only remaining recipe for writing a fresh migration.

### 11-SGS-BUTTON-ARCHITECTURE.md:193-202 (deprecated.js migration procedure)  (ESCALATE, from 02-01-11.md)

BEFORE: "### Migration shape\n\nFor each affected block:\n\n1. **Add InnerBlocks slot** with default template (...)\n2. **Mark old CTA attributes deprecated** in block.json — keep them in the schema so existing posts don't lose data on save.\n3. **Add `deprecated.js` v1** with `save: () => null` and a `migrate()` function that:\n   - Reads the deprecated `ctaPrimary*` attributes\n   - Constructs equivalent `sgs/button` block instances inside an `sgs/multi-button` parent\n   - Returns `[newAttributes, [newInnerBlocks]]`\n4. **Update render.php** to render from InnerBlocks output when present, falling back to deprecated attrs only if InnerBlocks is empty (transition period only — eventually remove).\n\n### Why the deprecation path matters\n\nWithout `deprecated.js`, existing post_content with old CTA attributes will trigger \"block contains unexpected content\" errors on every editor open. The deprecation path silently migrates old content to the new structure on first edit, preserving every post."
AFTER:  N/A — dispatcher call
NOTE:   **This is the single most dangerous site in the corpus per the dispatch brief.** An agent that reads Spec 11 §5 cold (no other context) will follow this exact 4-step procedure and write a `deprecated.js` file — directly violating D271/D293 ("No `deprecated.js`, no version bumps pre-production", stated correctly at Spec 02 L143/L159). Two candidate truths, same as the Spec 02 bundle above: (A) the whole procedure is dead — D271 retired the mechanism plugin-wide, this section should be replaced with a pointer to whatever the current no-deprecated.js migration story is (block.json attribute defaults / one-time WP-CLI batch migration per D271's own described alternative — CLAUDE.md rule R-31-14 references "full FR-31-6 hybrid-block roster migration ... + WP-CLI batch existing-post migration via deprecated.js" which ITSELF still names deprecated.js, so even the canonical CLAUDE.md may be internally inconsistent here); (B) this section is historically accurate for the P3 phase (SHIPPED 2026-05-04, before D271/D293 existed) and should be re-labelled past-tense/historical rather than deleted, since it's the only recipe describing how the P3 CTA-to-InnerBlocks migration was actually done. Verification command: `git log --oneline --follow -- 'plugins/sgs-blocks/src/blocks/*/deprecated.js'` to see when deprecated.js files existed and were removed, cross-referenced with the D271/D293 decision dates in `decisions.md`, plus re-reading CLAUDE.md's own R-31-14 wording for whether "WP-CLI batch...via deprecated.js" is itself stale.

### 31-UNIVERSAL-CLONING-PIPELINE.md:11  (ESCALATE, from 31.md)

BEFORE: "2026-07-25: v0.6 — C2 LANDED closing gate MET. ... reports **0 WRITTEN-not-LANDED + 0 UNACCOUNTED** ... **CLAIMED — ARTEFACT PENDING** ... committed artefact's `cell_verdict_counts` still reads `WRITTEN-not-LANDED: 2`, `UNVERIFIED: 36`, `GUARD-FAIL: 23` ... **→ RESOLVED 2026-07-30: the batch WAS re-run ... Result: `WRITTEN-not-LANDED: 0`** ... **But C2 is still NOT closed on §5's own terms** ... the fresh run reads `LANDED: 31, UNVERIFIED: 33, GUARD-FAIL: 33, NOT-RENDERED: 8, unattributed: 393`. ... **Remaining to close C2: triage those 33 UNVERIFIED + 33 GUARD-FAIL + 393 unattributed cells**"
AFTER: N/A
NOTE: Three stacked present-tense claims for the SAME metric set, each dated differently, and the entry's own final sentence ("Remaining to close C2...") contradicts its own headline ("C2 LANDED closing gate MET"). Candidate truth A: C2 is MET (headline). Candidate truth B: C2 is NOT closed — 33 UNVERIFIED + 33 GUARD-FAIL + 393 unattributed cells remain open, per the entry's own last sentence and the most recent (2026-07-30) re-run. Whether A or B is current cannot be resolved from prose — it depends on whether those 33/33/393 cells have since been triaged. Settling command: re-run `batch_runner.py` (or read its latest committed `batch-report.json` under `plugins/sgs-blocks/scripts/tests/fixtures/phase-f/_render-oracle/`) and check `cell_verdict_counts` — if UNVERIFIED/GUARD-FAIL/unattributed are now 0, B has been superseded and only the LANDED headline should remain; otherwise B is still current and the "C2 LANDED" headline is false-as-written.

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:125 vs :149 vs :674 vs :1899-1908  (ESCALATE, from 35.md)

BEFORE: (Part B, line 125) "Link/CTA | **`SgsLinkControl`** (wraps `LinkControl` — internal search + new-tab + rel nofollow/sponsored via `settings`) | raw URL `TextControl`"
  vs (Part C, line 149) "Do not build a new LINK field as an inline `<PanelBody>` mount, even via the (superseded) `SgsLinkControl` wrapper."
  vs (LINK contract, line 1899-1908) "⚑ **SUPERSEDED 2026-08-13 — Canonical control changed.** ... `SgsLinkControl`'s INLINE mount is retired as the canonical shape (kept only as a legacy shim for the 7 repeater-item consumers not yet migrated ...)."
AFTER: N/A
NOTE: Part B's completeness table (line 125) still names `SgsLinkControl` as the complete Link/CTA control — unchanged since it was written (line 674 shows it was itself already a correction from bare `LinkControl`). The LINK contract (§2, 2026-08-13) and line 149 both say `SgsLinkControl`'s inline mount is superseded by `LinkPopoverField`/`LinkPopoverContent`. These are two present-tense claims in the same document that disagree about what "complete"/"canonical" means for Link/CTA today. The LINK section is more recent and internally consistent with the rest of the doc (and with the site-wide migration status, §2 field 6: 0 JSX mounts of `SgsLinkControl` tree-wide), but do not silently overwrite Part B — verify with `grep -rn "LinkPopoverControl\|SgsLinkControl" plugins/sgs-blocks/src/blocks/*/edit.js` before editing, since Part B may need its whole row rewritten to name `LinkPopoverField`/`LinkPopoverContent` instead.

### 37-HEADER-FOOTER-BUILDER.md:945 vs 964-984  (ESCALATE, from 37-36.md)

BEFORE: Line 945: `**Status:** \`✅ SHIPPED + LIVE-VERIFIED (D376, 2026-07-24) — fix B landed; all scroll behaviours function.\`` — versus lines 964-969: `2. **But the JS + CSS layer targets an element no SGS header renders, so ALL THREE scroll behaviours (transparent, shrink, hide-on-scroll) are silently dead.** ... So \`getHeaderEl()\` returns null, \`boot()\` bails, the scroll listener never wires...` and line 979-984: `**APPROVED FIX (Bean, 2026-07-23): Option B — render the SGS site header AS a semantic \`<header>\` element** ... Queued; not yet started.`
AFTER: N/A
NOTE:   Two present-tense claims about the SAME FR directly contradict each other 19-39 lines apart: the status line says fix B "landed" and behaviours "function"; the numbered correction two paragraphs later says the behaviours are "silently dead" and the fix is "Queued; not yet started." A near-duplicate of the SHIPPED claim also sits in the §5 status matrix (line 1769, "fix B landed... Live on the canary"), so if 945 is stale, 1769 likely is too — but if 945/1769 are current and 964-984 is the stale layer, that whole block (including the still-open "Done when" at the end) needs deleting instead. Settle by running the FR-37-13 "Done when" check live: hard-refresh the canary (CPT 1655) with header CPT active, scroll down, and confirm/deny `translateY(-119px)` fires (matches the `header-behaviours.css`/`view.js` selectors against `header.sgs-site-header`, not `header.wp-block-template-part`). Whichever side the live DOM confirms, delete the other.

### 36-SGS-NAVIGATION-SYSTEM.md:396-406  (ESCALATE, from 37-36.md)

BEFORE: `- **~~⚠ OPEN QUESTION~~ — ANSWERED 2026-07-28 session 2 (see the shipped block above): flat value
  holds; lamalama derives the header's width so mobile is free; lusion = per-device \`anchor\`.**
  Original question kept for the reasoning trail: does each variant PERSIST on mobile? All reference geometry was measured at 1440×900 only. If the compact panels
  collapse to full-screen on small screens, then \`header-attached\` / \`trigger-anchored\` are desktop
  PRESENTATIONS rather than device-spanning variants... **Scope is ALL EIGHT measured sites**...
  Cheapest outcome to test first: lamalama's panel derives its width from a 438px pill header, so
  **if that header goes full-width on mobile, \`header-attached\` already handles mobile correctly with
  no extra attribute.**`
AFTER: N/A
NOTE:   Labelled ANSWERED, but the retained body still poses the original question in present tense ("does each variant PERSIST on mobile?") and ends on an untested conditional ("Cheapest outcome to test first... IF that header goes full-width on mobile"). Line 254 (§3-ish drawer section) separately says the same investigation ("The 2026-07-28 open question is ANSWERED... a FLAT variant value holds... only lusion swaps compact→takeover... side-panel is DROPPED") in fully-resolved past tense with no leftover conditional. Two candidate truths: (1) the line-254 statement is the completed answer and 396-406's "cheapest outcome to test first" clause is dead deliberation that should have been deleted once answered; (2) the "if that header goes full-width on mobile" check was never actually run and `header-attached`'s mobile behaviour is still unverified for the non-lamalama sites. Settle by checking whether a Task-1/session-2 verification artefact (per line 254's citation, `.claude/reports/2026-07-28-drawer-code-extraction/`) records lamalama's mobile-width behaviour as measured, not inferred — if yes, delete the "cheapest outcome to test" sentence from 396-406; if no, the ANSWERED label at 396 is premature and the FR needs its status downgraded, not its prose trimmed.


---

# CONDENSE (90)

### 02-SGS-BLOCKS.md:302-308 (Trust Bar dual-mode / `sourceMode='bound'`)  (K1, from 02-01-11.md)

BEFORE: "As of 2026-06-01 it is **dual-mode (FR-24-10, SHIPPED)**: `sourceMode='typed'` (curated repeater) OR `sourceMode='bound'` (echoes `$content` → renders the converter's emitted badge InnerBlocks). render.php branches on the explicit `sourceMode` (R-31-14, never `empty($content)`).\n\n   **⚠ `sourceMode='bound'` is PURGED FROM CLONING (D182, 2026-06-06):** the bound-emit path was a test cheat (...). The converter now emits `sourceMode='typed'` with native `items[]` populated by the icon-identity resolver (...) — badges clone to the correct icon slugs (home/check/truck/star). The live WC configurator modes (`wc-product`/`sgs-cpt`) are unaffected and remain legitimate."
AFTER:  "`sgs/trust-bar` is **typed-only** — the `sourceMode` attribute was removed entirely at v0.5.1 ('Rule 3 de-plumb'; `render.php:6,11`, verified live 2026-07-16, 0 `sourceMode` occurrences in `block.json`). D182 (2026-06-06) purged the cloning pipeline's `sourceMode='bound'` emit (it mirrored draft DOM instead of converting to native attrs) before the attribute itself was later deleted; the converter emits typed `items[]` via the icon-identity resolver (`converter/services/icon_resolver.py`), resolving to correct icon slugs (home/check/truck/star). The live WC configurator modes (`wc-product`/`sgs-cpt`) belong to `sgs/product-card`, not this block."
NOTE:   Verified via code, not just prose: `grep -n "sourceMode" .../trust-bar/block.json` returns nothing; `render.php` explicitly documents removal ("sourceMode attribute removed — typed is the only mode"). This is stronger than the D182 note already in the spec — the spec's own "dual-mode... SHIPPED" claim is now flatly false (the attribute doesn't exist), not merely superseded-in-cloning as the existing note implies. Matches the CLAUDE.md-recorded ground truth already in this repo's root CLAUDE.md trust-bar section.

### 02-SGS-BLOCKS.md:525-527 (Certification Bar tombstone)  (K5, from 02-01-11.md)

BEFORE: "### 15. Certification Bar (`sgs/certification-bar`) — RETIRED 2026-05-29 D95\n\n> **RETIRED.** Block merged into `sgs/trust-bar` as `badgeStyle: 'text-only'` and `badgeStyle: 'image-badge'` variants. Existing posts auto-migrate via `trust-bar/deprecated.js` v2 `isEligible()` + `migrate()` entry. All certification-bar attributes (...) are present on `sgs/trust-bar`. Source deleted: `src/blocks/certification-bar/`. DB rows deleted from both `sgs-framework.db` copies. Use `sgs/trust-bar` with `badgeStyle: 'text-only'` or `'image-badge'` for all new builds."
AFTER:  → one row in a single per-spec "Retired blocks" table (see K5 note below): `sgs/certification-bar | RETIRED 2026-05-29 (D95) | merged into sgs/trust-bar as badgeStyle: text-only / image-badge`
NOTE:   Bundle with §17 and §18 below into ONE tombstone table per K5. Drop the `deprecated.js` migration clause from the collapsed row — it duplicates the ESCALATE finding above and its truth is unresolved pending that check.

### 02-SGS-BLOCKS.md:562-564 (Announcement Bar tombstone)  (K5, from 02-01-11.md)

BEFORE: "### 17. Announcement Bar (`sgs/announcement-bar`) — RETIRED D209 (2026-06-11)\n\n> **RETIRED — TOMBSTONE.** `sgs/announcement-bar` was deleted in D209 (...). Its dismissible-banner / countdown / rotating-message use-cases are now served by `sgs/notice-banner` with `displayMode=announcement` (see §16). Existing page content carrying `wp:sgs/announcement-bar` shows the WordPress \"block has been deleted\" placeholder (1 live homepage instance flagged for re-clone/swap). Use `sgs/notice-banner displayMode=announcement` for all new builds. The block's source, build output, and DB rows no longer exist — its former attribute/interactivity spec is intentionally not retained here."
AFTER:  → one row in the same tombstone table: `sgs/announcement-bar | RETIRED D209 (2026-06-11) | replaced by sgs/notice-banner displayMode=announcement; 1 live homepage instance still flagged for re-clone/swap`
NOTE:   The "1 live homepage instance flagged for re-clone/swap" clause is load-bearing (open work item) — keep it in the collapsed row, don't drop it as narration.

### 02-SGS-BLOCKS.md:568-570 (SVG Background tombstone)  (K5, from 02-01-11.md)

BEFORE: "### 18. ~~SVG Background (`sgs/svg-background`) — RETIRED 2026-05-28 (D93)~~\n\nMerged into `sgs/container`. Use `bgSvgContent` + `bgSvgAnimation` + `bgSvgPosition` attrs on `sgs/container` instead. Existing posts auto-migrate via `deprecated.js` v2 entry."
AFTER:  → one row in the same tombstone table: `sgs/svg-background | RETIRED 2026-05-28 (D93) | merged into sgs/container (bgSvgContent/bgSvgAnimation/bgSvgPosition attrs)`
NOTE:   Also C1 (strikethrough on the heading itself — remove `~~…~~`, the retirement is real not cosmetic-only, so fold under K5 rather than a bare C1). Drop the `deprecated.js` clause per the ESCALATE finding above.

### 02-SGS-BLOCKS.md:717-719 (Mega Menu tombstone)  (K5, from 02-01-11.md)

BEFORE: "### 23. Mega Menu — SUPERSEDED (moved to Spec 36)\n\n> The `sgs/mega-menu` block documented here used `role=\"menu\"` + template-part panels — both **banned** by the SGS Navigation System (Spec 36 FR-36-10 / FR-36-5). The mega system is now a block-based `sgs_mega_menu` **CPT** attached via native WP menus. Canonical home: **`.claude/specs/36-SGS-NAVIGATION-SYSTEM.md`** (...). This section is retained as a pointer only; the old architecture is not built."
AFTER:  → one row in the same tombstone table: `sgs/mega-menu (old block-based design) | SUPERSEDED — moved to Spec 36 | banned role="menu" + template-part panel approach; canonical home is now specs/36-SGS-NAVIGATION-SYSTEM.md (sgs_mega_menu CPT)`
NOTE:   Already fairly lean (2 short paragraphs) but still qualifies for the shared tombstone table per the dispatch brief's explicit instruction to bundle §15/§17/§18/§23 together.

## Section: Trust Bar — remaining historical content (post-tombstone-collapse cross-check)

### 01-SGS-THEME.md:315-323 and 01-SGS-THEME.md:623-627 (Style Variations retired — stated twice)  (K4, from 02-01-11.md)

BEFORE (site 1, L315-323): "### Style Variations (RETIRED 2026-05-21 — see `.claude/plans/2026-05-21-architecture-staging.md` §6.2)\n\nThe `styles/*.json` per-client overlay system is deleted by Decision 18. Each client now has `sites/<client>/theme-snapshot.json` as a full theme.json copy pushed to the specific site via `push-theme-snapshot.py`. See §Per-site theme.json model below.\n\n**Historical reference only** — the old pattern was a JSON file in `styles/` overriding tokens per-client. This shipped ALL client variations to every install, creating a privacy leak. The example below is now `sites/indus-foods/theme-snapshot.json`:\n\n```jsonc\n// RETIRED — previously styles/indus-foods.json\n// Now: sites/indus-foods/theme-snapshot.json (full theme.json, not just a diff)\n{ ... }\n```"
BEFORE (site 2, L623-627): "### Style variation sections RETIRED\n\nThe following sections describing the `active_theme_style` theme_mod and style variation activation flow are retired by Decision 18:\n\n**§ Style Variations (RETIRED 2026-05-21 — see `.claude/plans/2026-05-21-architecture-staging.md` §6.2):** The `styles/*.json` per-client overlay system that shipped all client variations to every install is deleted. Replaced by per-site `theme-snapshot.json` + push CLI. The example `styles/indus-foods.json` shown above is now `sites/indus-foods/theme-snapshot.json` and is never shipped in a framework deploy."
AFTER:  Keep site 1 (L315-323) verbatim — it's the fuller version with the worked JSON example, more useful as the canonical statement. Replace site 2 (L623-627) with: "### Style variation sections RETIRED\n\nSee §Style Variations above (retired 2026-05-21 by Decision 18) — not repeated here."
NOTE:   Site 2 also claims to introduce "the following sections" (plural) but only restates the same single fact already given in full at site 1 — a K4 duplicate, not two different retired sections.

### 01-SGS-THEME.md:596-598 (Live-style precedence — corrected by Spec 26)  (K1, from 02-01-11.md)

BEFORE: "### Live-style precedence: `wp_global_styles` SUPERSEDES `theme.json` (2026-06-03, D156)\n\n> **SUPERSEDED + corrected by [Spec 26 — SGS Global Styles & Per-Client Theming](26-SGS-GLOBAL-STYLES-AND-THEMING.md) (2026-06-03).** The \"override precedence\" framing below is imprecise: the `wp_global_styles` user layer is simply **where a site's global styles live**; `theme.json` is the factory-default seed. It is a data-layer merge, not a CSS override. Spec 26 is the canonical target architecture (variation-delta per client + `wp_global_styles` REST sync + the corrected mental model). Read Spec 26 for the current design; the note below is retained for continuity."
AFTER:  "### Live-style precedence (see Spec 26 for the canonical mental model)\n\n> **Framing note:** this section originally called it \"override precedence\"; [Spec 26](26-SGS-GLOBAL-STYLES-AND-THEMING.md) corrected that to a data-layer merge — `wp_global_styles` is simply where a site's live styles live, `theme.json` is the factory-default seed, not a thing being overridden. The operational facts below (post wins wherever both define a property) are still accurate and still the day-to-day guidance; read Spec 26 for the conceptual model."
NOTE:   **Load-bearing — condense, do not delete.** The heading + note is the only thing that's stale (the CONCEPT of "override"); the paragraphs immediately below it (post-wins-on-conflict, sandybrown post ID 7, the two-place update procedure, the PARTIAL push-write gap) are still true operational fact, not dead text — do not touch those, only shorten the corrective preamble per K1 (rejected framing + why, one line).

### 11-SGS-BUTTON-ARCHITECTURE.md:3  (K2, from 02-01-11.md)

BEFORE: "> **⚠ 2026-07-07 — STYLING MODEL SUPERSEDED BY SPEC 32.** The D283 preset-as-seed INLINE-ATTR styling model (2026-07-06 update below) is retired: it baked colours into the element `style=\"\"`, which killed `:hover` (inline beats `:hover`) and made the block un-reskinnable. [Spec 32 — Component Styling Token Contract](32-COMPONENT-STYLING-TOKEN-CONTRACT.md) is now the operative styling contract: semantic BEM class (`.sgs-button--{preset}`) consuming `--wp--custom--button-presets--*` tokens (the pre-D283 Decision-24 design, restored + generalised framework-wide), zero inline property declarations, `:hover` in the stylesheet. This spec (11) remains the button's **attribute-surface / feature** reference; for **how it is styled**, read Spec 32."
AFTER:  "> **Styling model: read [Spec 32](32-COMPONENT-STYLING-TOKEN-CONTRACT.md), not this spec.** D283's inline-`style=` preset model (2026-07-06) is retired — it broke `:hover` (inline beats `:hover`) and made the block un-reskinnable; Spec 32's semantic-BEM-class + custom-property model is current. Spec 11 (this doc) stays the attribute-surface/feature reference only."
NOTE:   **Do NOT delete — this is one of the negative-control lines flagged by the dispatch brief as must-survive-the-whole-purge.** The failure mode described (inline style beats `:hover`, un-reskinnable) is exactly the kind of meta-lesson K2 protects. Condensed for length only; the mechanism/consequence/pointer-to-Spec-32 must all remain.

### 31-UNIVERSAL-CLONING-PIPELINE.md:63  (K2, from 31.md)

BEFORE: "**STALE-FRAMING CORRECTED 2026-06-26 (qc-council, verified vs the 2026-06-21 live run):** the FROZEN engine ALREADY routes `.sgs-hero`→`sgs/hero` AND `.sgs-trust-bar`→`sgs/trust-bar` with the `variant` attr set — composite recognition is NOT a live bug, and there is no \"conf 0.10\" mis-recognition for hero. ... The real Stage-2 work is a **PORT**: the FRESH `converter/` engine has no recognition yet, so reproduce the (already-correct) composite recognition + variant there to enable retiring `convert.py` (D-MODULAR). Baseline/oracle = the draft + the empty new-engine, NEVER the frozen output."
AFTER: "| **Stage 2** block-match | Picks the block for a section; no confident match → `sgs/container` fallback | Composite recognition (`.sgs-hero`→`sgs/hero`, `.sgs-trust-bar`→`sgs/trust-bar` with `variant` set) is not a live bug — it already works. Sections that emit `sgs/container` (featured-product, brand, ingredients, gift, social-proof) have no registered composite block, so container is the correct slug-None target, not a miss. The Stage-2 work is a PORT: reproduce this already-correct recognition + variant logic inside the fresh `converter/` engine. Baseline/oracle = the draft + the empty new-engine, never the frozen output. |"

### 31-UNIVERSAL-CLONING-PIPELINE.md:187  (K1, from 31.md)

BEFORE: "**`supports.sgs.gridAreas` was RETIRED 2026-08-16 (D639)** and declaring it now fails the build; this row previously said \"areas declared in `supports.sgs.gridAreas`\", which was never true of the live path. See Spec 35 §F.2 + D639."
AFTER: "| **L4 GRID-PER-AREA** (FR-31-21.3) | named grid areas — `<areaName>+<Suffix>` families (object-shaped since D580) | `contentPadding*`, `mediaBackground`, … via `db.attr_for_area_property( block, area, prop )`. ⛔ **Areas are DERIVED FROM THE DRAFT, never declared on the block** — `assembly.py` step 3d walks the section root's children and reads each one's BEM ELEMENT TOKEN (`db_lookup.parse_sgs_bem( cls ).element`, so `sgs-hero__content` → area `content`). `supports.sgs.gridAreas` does not exist — declaring it fails the build (RETIRED D639). See Spec 35 §F.2. |"

### 31-UNIVERSAL-CLONING-PIPELINE.md:205  (K5, from 31.md)

BEFORE: "> **STATUS: v1 (HISTORICAL — the G1–G5 content gaps below are CLOSED by §13.3; retained for context). qc-council NO-GO for full-handover completeness (2026-06-27 manual-simulation, 4 raters).** This subsection correctly adds the child-block *routing data sources* ... but a fresh-session v2 must close: (G1) ... (G2) ... (G3) ... (G4) ... (G5) ... SEPARATELY the council found Spec 31 has **no content-extraction mechanism at all** ... both are now ABSORBED into §13.3 ... this v1 status note is retained as history."
AFTER: "This subsection is superseded by §13.3 (FR-31-2/2.1/2.2/2.5), which closes gaps G1–G5 (the token→child-slug matching predicate, child-of-child recursion, the NULL `accepts_allowed_blocks` case, the Mixed-row contradiction, and the `slot_has_equivalent_block` integration) — the child-block content fork is now canonical there. Retained only as a pointer for readers who land on the old qc-council verdict."

### 31-UNIVERSAL-CLONING-PIPELINE.md:265  (K1, from 31.md)

BEFORE: "**The former (D307-era) claim that §3.B B2's `derived_selector` state-lift \"already works universally\" is CORRECTED: B2's hover selectors are synthetic placeholders that never exist in real markup — it only ever resolved persistent `--active`/`--selected` classes; genuine `:hover` is THIS mechanism.**"
AFTER: "Note: §3.B B2's `derived_selector` state-lift only ever resolves persistent `--active`/`--selected` classes (its hover selectors are synthetic placeholders that never exist in real markup) — genuine `:hover` is resolved by THIS mechanism, not B2."
NOTE: Kept the operative fact (which mechanism actually does hover); dropped the "former claim ... CORRECTED" framing.

### 31-UNIVERSAL-CLONING-PIPELINE.md:288  (K1, from 31.md)

BEFORE: "**CODE NOW MATCHES THIS ROW (2026-08-06).** The alt capture used to sit INSIDE `_typed_value_for_role`'s `attr_type == \"string\"` branch, so an OBJECT-typed image attr cloned its image and silently dropped the alt ... i.e. the gate was the attr's TYPE, contradicting this row's \"declared per row\" contract. The capture moved out of the type branch ..."
AFTER: "The capture lives in `walk.py`'s `_typed_value_for_role`, gated only on the companion DECLARATION existing (not on the attr's TYPE) — an object-typed image attr is captured correctly."
NOTE: Kept the RESIDUAL/`xfail(strict=True)` gap note for `sgs/image-sequence` verbatim per K3 — it is a live, tracked gap, not history.

### 31-UNIVERSAL-CLONING-PIPELINE.md:293  (K1, from 31.md)

BEFORE: "~~`has_inner_blocks` = per-item destination (Axis 3)~~ **RETIRED as the dispatch signal 2026-07-04 (FR-31-2.6): replaced by per-attr `block_attributes.emit_shape`. ⛔ UPDATED 2026-08-02 (Phase 1b) — the previous note here said the column 'still EXISTS in the DB' with the drop 'not done'. That is now STALE: the column was physically DROPPED ...**"
AFTER: "| `block_composition.(container_kind, wraps_block, accepts_allowed_blocks)` | KIND = which layers exist (Axis 2); `has_inner_blocks` was RETIRED as the dispatch signal 2026-07-04 (FR-31-2.6, replaced by per-attr `block_attributes.emit_shape`) and the column was physically DROPPED (`migrations/2026-07-05-drop-has-inner-blocks-column.py`) — the live schema has no such column. The surviving block-level fact is DERIVED FRESH at convert time by `converter/services/has_inner.py` as `delegates_content` from save.js + render.php, deliberately not cached, because a stale cached column mis-routes SILENTLY. ⛔ Do NOT add it to any row-count or population gate: a population floor is the right gate for a CACHED fact and the wrong gate for a DERIVED one (D471). `wraps_block` = the parent's OWN built-in wrapper (not its children); `accepts_allowed_blocks` = the parent's allowed child-block list — the VALIDATION gate for child-block CONTENT resolution (Axis 3 child-routing, added 2026-06-27) |"
NOTE: The ⛔ anti-regression clause ("Do NOT add it to any row-count or population gate") is load-bearing and is retained verbatim per K3 even though the "previous note here said..." historiography is cut.

### 31-UNIVERSAL-CLONING-PIPELINE.md:297  (K1, from 31.md)

BEFORE: "**AMENDED 2026-08-02 (Phase 1b): the live table has SIX `kind` values, not the three this row used to name.** ... **Corrected 2026-08-16 (D642): its only production caller, `resolvers/grid_area.py`, was deleted as dead code ...**"
AFTER: "| `modifier_suffixes.(suffix, kind)` | breakpoint (tier), side/corner (shorthand decomposition), state (`:hover`) suffix grammar (step 4); six `kind` values live. Also wired: `unit` — `unit_companion_attr()` pairs a box/typography attr with its CSS-unit companion (`contentPaddingTop` → `contentPaddingUnit`), though its only production caller (`resolvers/grid_area.py`) was deleted as dead code (D642) — it currently has ZERO production callers; kept as a genuine Spec 39 input (see `spec-39-seed-requirements.md`), not deleted. Seeded but with NO reader: `variant` (`Primary`/`Secondary`/`Tertiary`) — the live 3-way button-preset mechanism uses `inherit_style_presets()`/`preset_style_for_element()` against `slots`, not this; treat those 3 rows as a cleanup candidate, not a mechanism. ⚠ ORDER IS LOAD-BEARING — readers use `ORDER BY rowid`, and `side` is CSS shorthand order (Top/Right/Bottom/Left). |"
NOTE: "ORDER IS LOAD-BEARING" and the "cleanup candidate, not a mechanism" caveat are anti-regression rules retained verbatim per K3.

### 31-UNIVERSAL-CLONING-PIPELINE.md:300  (K1, from 31.md)

BEFORE: "⛔ **CORRECTED 2026-08-02 (Phase 1b, call-graph traced): this row's former claim that `grid-layout`/`full-width-banner` are GATES was FALSE.** Neither string appears anywhere in `converter/` outside one docstring comment ..."
AFTER: "| `block_capabilities.(capability)` | Only 3 of the 36 seeded tags are ever read: `scalar-content-lift`, `scalar-styling-lift`, `array-content-lift`, each checked as a literal by `capabilities_for()` call sites. The other 33 tags (carousel, faq, icon-text, pricing, modal-popup, grid-layout, full-width-banner…) are seeded on 50 `sgs/%` blocks and are inert — `blocks_with_capability()` has zero callers. They remain the right DB-first precedent for a future capability-gated resolver. ⛔ Do NOT cite them as active gates. |"
NOTE: The ⛔ "do not cite as active gates" clause is retained verbatim per K3.

### 31-UNIVERSAL-CLONING-PIPELINE.md:308  (K1, from 31.md)

BEFORE: "⛔ `block_styles.*` (named presets) and `variations.*` (editor preset bundles) were on this list and are now **RETIRED and DROPPED** — `variations` at D469, `block_styles` at D472; both archived reversibly to `scripts/data/retired/*.json.gz`. Having no CSS-lift utility was not why they went: each had no reader at all. Do not cite either as a live table."
AFTER: "Columns with no CSS-lift utility (documented so a reviewer knows they were considered, not missed): `components.*` (editor JS), `block_changes.*` (audit log), `blocks.(grade/source/has_render_php)`. `block_styles.*` (named presets) and `variations.*` (editor preset bundles) are RETIRED and DROPPED (`variations` at D469, `block_styles` at D472; archived reversibly to `scripts/data/retired/*.json.gz`) — each had no reader at all. Do not cite either as a live table."

### 31-UNIVERSAL-CLONING-PIPELINE.md:354  (K2, from 31.md)

BEFORE: "*(HOLE 8.)* **CORRECTION (D236, D-MODULAR):** \"must be removed\" is superseded — convert.py is FROZEN legacy (§12.0/§12.4); the gate BASELINES these legacy violations (the §12.6-step-1 armed-against-legacy pattern) and they vanish when the modular rebuild replaces that code path. Do NOT edit convert.py to remove them."
AFTER: "2. **Hardcoded property→attr dict — R-31-1.** `_SUFFIX_ATTR_OVERRIDES` (convert.py:972) and `prop_map` (convert.py:1519) are legacy violations in the FROZEN `convert.py` (§12.0/§12.4); the completeness gate BASELINES them rather than requiring their removal, since they vanish when the modular rebuild replaces that code path. Do NOT edit convert.py to remove them."
NOTE: The method-level lesson ("a fix targeting frozen legacy code should baseline it, not edit dead code") is the highest-value line here and is preserved as the operative rule, not just narrated.

### 31-UNIVERSAL-CLONING-PIPELINE.md:465-489  (K5, from 31.md)

BEFORE: The chained "STATUS (D250, 2026-06-30) ... (historical — the frozen tree + STOP-28 gate no longer exist; deleted D276)", "STATUS (D252, 2026-06-30) ... (historical — the flag + fallback fork no longer exist; deleted D276 ...)", "STATUS (D254, 2026-07-01) ... STOP-28 intact — the new engine remains OPT-IN ... (historical — STOP-28's frozen default no longer applies ...)", "STATUS (D258, 2026-07-02) ...", and "STATUS (D274, 2026-07-04) — THE CURRENT FRONT ... (historical — superseded by the D276 block immediately below ...)" paragraphs, each self-labelled historical, followed at line 478-489 by the D276 block that explicitly states "This block supersedes every ... statement in the D243-D274 status blocks above".
AFTER: Collapse the five self-superseded STATUS blocks (D250/D252/D254/D258/D274) to one line: "Build history D250→D274 (frozen-engine rollout, `SGS_NEW_ENGINE` flag, STOP-28 gate) is entirely superseded by D276 below — see `decisions.md` for the full narrative." Keep the D276 block (the existing lines 478-489) verbatim as the sole canonical current-state description, including its "WHAT'S LEFT TO BUILD" successor content and the individually-resolved sub-items within (`sgs/container` default DONE D254; media-map loader RESOLVED; LANDED-on-canary DONE D254).
NOTE: Each of these five blocks already carries its own "(historical...)" tag — this is a K5 tombstone case with the redirect already written by a prior author; the only work is physically removing ~2KB of now-inert status prose that a later block already declares superseded.

### 31-UNIVERSAL-CLONING-PIPELINE.md:523  (K1, from 31.md)

BEFORE: "**CORRECTION (D235):** the table SHIPS EMPTY — \"seed width/max-width\" was WRONG (width/max-width are excluded-from-LIFT, still cloned; not clone-exclusions). The literal-ban gate the original F4 proposed OVERCLAIMS (a 3-rater /qc-council found it a tripwire blind to inline/anonymous/transform/None-lookup/out-of-tree drops) and MOVED to F5 ..."
AFTER: "| **F4** ✅ DONE 2026-06-18 (D235, `870f48aa`) | Closed EXCLUDED set — `excluded_properties(css_property, reason, decided_by, date)` table + dated migration (MF-4) | — | The table SHIPS EMPTY — width/max-width are excluded-from-LIFT (still cloned), not clone-exclusions, so no seed row was needed. The literal-ban gate originally proposed was found (3-rater /qc-council) to be a tripwire blind to inline/anonymous/transform/None-lookup/out-of-tree drops, so it moved to F5; the real no-drop guarantee is F2+F3+the css_router coverage invariant+F5's ledger checker. Design: `.claude/plans/archive/2026-06-18-f4-excluded-properties-design.md`. |"

### 31-UNIVERSAL-CLONING-PIPELINE.md:524  (K1, from 31.md)

BEFORE: "**RESIDUALS fact-checked + closed (D241):** only 2 evidenced deferrals remain ... css_router D1 media-axis (D1 is a dead output; the gate fails-safe; the rebuild's MF-2 owns it). ... (SUPERSEDED 2026-07-05: MF-2 resolved D1 as KEEP, not retire — `ledger/coverage_check.py:199` consumes `router_result[\"d1\"]` for conservation accounting. The \"D1 is a dead output\" characterisation was correct at D241 but is stale post-Step-14.)"
AFTER: "| **F5** ✅ DONE 2026-06-21 (D239/D240/D241) | The gates, built + ARMED + WIRED — `check-converter-cheats.py` (§7a, whole-tree) + `generate-coverage-matrix.py` (§5, secondary dashboard) + the pipeline-close ledger checker (UNACCOUNTED>0 / WRITTEN-not-LANDED>0 → fail); `check_no_mirror.py` auto-runs post-clone; the `PreToolUse` git-commit hook `.claude/hooks/f5-commit-gate.py` + `.githooks/pre-commit`; the EXCLUDED-literal gate (MF-4); plain-English failure messages (MF-5) | F2, F4 | All 5 gates built, baseline-armed, WIRED to run on every clone (via the orchestrator) and on every `git commit` (via `f5-commit-gate.py`). 544 tests green; convert.py untouched (D-MODULAR). css_router's D1 output is KEPT, not retired — `ledger/coverage_check.py:199` consumes `router_result[\"d1\"]` for conservation accounting (MF-2, resolved 2026-07-05). |"

### 31-UNIVERSAL-CLONING-PIPELINE.md:579  (K1, from 31.md)

BEFORE: "*(The retired D96 mechanism ranked candidates by an in-code ~40-entry `_CAPABILITY_PRIORITY` list — it never once fired on distinct blocks in recorded history, and its \"DB-driven\" claim was false: `block_capabilities` has no priority column. Deleted rather than migrated — the data was never needed.)*"
AFTER: "- **FR-31-15 — multi-root disambiguation: dedupe, then LOUD (AMENDED D278, Bean-directed 2026-07-05).** When one node carries ≥2 bare block-root classes, the candidates are first DEDUPED (a bare class and its own `--modifier` class parse to the same block — not ambiguity). A residual tie between DISTINCT blocks is a draft-authoring ambiguity: the resolver goes LOUD (`bem_resolve_ambiguous_loud` trace) and returns no match, so the node falls to the FR-31-4 container-default/pass-through path — the correct response is to fix the draft or strengthen the intended block's recognition data, never a silent rank. (The retired D96 `_CAPABILITY_PRIORITY` list never once fired on distinct blocks and its 'DB-driven' claim was false — `block_capabilities` has no priority column. Deleted, not migrated.)"

### 31-UNIVERSAL-CLONING-PIPELINE.md:597  (K1, from 31.md)

BEFORE: "**⛔ `scalar-media` STATUS — the paragraph below is STALE and is kept only to show what was wrong. RE-MEASURED 2026-08-06: `SELECT COUNT(*) FROM block_attributes WHERE role='scalar-media'` returns **2**, not 0 ...** (Superseded text, MEASURED 2026-08-01): D128 hand-ran a direct DB `UPDATE` setting `splitImage`/`sideImage`'s `role` to `scalar-media` ... but `SELECT COUNT(*) FROM block_attributes WHERE role='scalar-media'` returns 0 today. ... Current reality: `sgs/hero.splitImage` and `sgs/testimonial-slider.sideImage` carry role `image-object` ..."
AFTER: "**FR-31-2.2 — role is the content-vs-styling FILTER** (the gate INTO the content walk), not the nested-vs-child decision. An attr enters the content walk ONLY when its `role` is in the content-bearing positive allowlist (`text-content`/`identity`/`image-object`/`content`/`rating`); the ~16 styling/behaviour roles are NOT content. `scalar-media`: `SELECT COUNT(*) FROM block_attributes WHERE role='scalar-media'` returns 2 (measured 2026-08-06), both on `sgs/hero` (`splitImage`, `splitImageMobile`). D474 (2026-08-02) RESTORED the role after proving its loss was a regression: without it a hero clone put the MOBILE crop in the DESKTOP attribute and dropped the desktop image. The roster lives in a git-tracked seed (`scripts/data/scalar-media-roles.json`) re-asserted at module load. `sgs/testimonial-slider.sideImage` is DELIBERATELY excluded (adding it broke the block — D476). Retirement is Task B phase 3c, gated on `_family_modifier` (D506). `sgs/hero.splitImage` and `sgs/testimonial-slider.sideImage` carry role `image-object` (content-bearing) and `emit_shape='nested'` — they ARE content-walked, lifted as the parent's own scalar attr via the FR-31-2.6 `nested` path."
NOTE: The cell explicitly self-labels its own middle paragraph as STALE ("kept only to show what was wrong") — dropped that paragraph per C5/K1; kept the current measured fact and its command.

### 31-UNIVERSAL-CLONING-PIPELINE.md:868  (K1, from 31.md)

BEFORE: "**D501's \"deliberately NOT wired to seed yet\" was the state at that decision and was superseded the same day by D502** — do not cite it as current. The reason for the pause was real and worth keeping: D7 CONTRADICTED the 2026-08-05 hand investigation on 3 of its 7 rows ..."
AFTER: "D6 + D7 verdicts ARE consumed — `fingerprint_content_roles.compute()` runs both over `d4_review`, first-verdict-wins per key, and returns them as `specific_roles`, which `assign-canonical` merges UNDER the content verdicts (`{**specific, **content}`) so a content verdict can never be overwritten by a styling/technical one (D502). The reason wiring was paused for one day is worth keeping: D7 CONTRADICTED the 2026-08-05 hand investigation on 3 of its 7 rows (`separator.contentIconName`, `site-header-row`/`site-footer-row.rowSlot`) — a genuine judgement disagreement on identical evidence, not a bug. Auto-seeding over a considered human verdict is the failure this vocabulary exists to prevent; the resolution was Bean's call, not the detector's."
NOTE: Dropped the dead "D501's 'deliberately NOT wired to seed yet'" quoted claim (already superseded same-day); kept the meta-lesson about auto-seeding vs. human verdict verbatim per K2.

### 31-UNIVERSAL-CLONING-PIPELINE.md:775  (K1, from 31.md)

BEFORE: "**`wrapper-rendered-styling`** → **assigned role `styling`, via TIER 2.4. ⚠ CORRECTED 2026-08-06 (D499) — this bucket previously read \"NOT a role … owes an explicit `attrMap`/`css:` declaration instead\", and that was FALSE for 29 of the 33 rows it covered.**"
AFTER: "- **`wrapper-rendered-styling`** → assigned role `styling`, via TIER 2.4 (D499). The decorative families (`overlayGradientFrom`/`To`, `shapeDividerTop`/`Bottom`, `bgSvgContent`) are ones `sgs/container` — the block every composite mirrors (R-31-9) — deliberately declines to map: its `decorative` element declares `\"clusters\": []` with a written note that these are governed by dedicated controls outside the style clusters (`container/block.json`). Declaring attrMaps for them would REVERSE a standing architectural decision to close a reporting nuisance. Only `gridItemBorder` was a genuine attrMap case. Proof the opt-out does not by itself discharge a row: `sgs/container` declares `decorative` and still showed its OWN `overlayGradientFrom`/`To` in the bucket — the only thing that removes a row is a non-NULL `css_property`, which the decorative families will never carry, because the emission scanner reads each block's own render.php/style.css and never the shared wrapper."
NOTE: Genuinely missed in the original pass (not merely an omitted EXCLUDE) — the cell quotes and refutes a dead prior claim ("this bucket previously read... and that was FALSE"). Registered as CONDENSE rather than forced into EXCLUDE, since the dead text is real and the discriminator requires K1 here.

## Counts
IN SCOPE: 28   (CUT: 11, CONDENSE: 17)
ESCALATE: 1
EXCLUDE:  53

### 32-COMPONENT-STYLING-TOKEN-CONTRACT.md:184-192 (hover pseudo-class rule)  (CONDENSE, from 32-38.md)

BEFORE: "**Which pseudo-class is not a free choice — it follows the element (amended 2026-08-18, Bean-ruled):** - the hover target is itself focusable... → `:focus-visible`; - the hover target is a CONTAINER... → `:focus-within`. *Rationale, and why the earlier blanket `:focus-visible` wording was wrong:* a `:focus-visible` rule on a non-focusable `<section>` or card `<div>` **can never match**. It reads as compliant in source and delivers nothing to a keyboard user — the same class of defect as a CSS rule that is perfectly written and structurally incapable of working. Measured 2026-08-18 across all blocks: 27 hover rules in 5 blocks lacked a counterpart under the old wording, but `sgs/mega-panel` already used `:focus-within` correctly and was a **false positive of a `:focus-visible`-only search** — the real gap was 4 blocks (`hero`, `icon-list`, `process-steps`, `testimonial`), all now fixed to match `mega-panel`'s existing pattern."
AFTER:  "Which pseudo-class is not a free choice — it follows the element: the hover target is itself focusable (link/button/tabindex) → `:focus-visible`; the hover target is a CONTAINER whose focusable content sits inside it (card, list item, section) → `:focus-within`. A `:focus-visible` rule on a non-focusable container can never match — it reads as compliant in source while delivering nothing to a keyboard user."
NOTE:   The "why the old wording was wrong" reasoning is a real rule justification and stays; the block-count measurement trail (27 rules / 5 blocks / mega-panel false positive / 4 blocks now fixed) is now-redundant history.

### 32-COMPONENT-STYLING-TOKEN-CONTRACT.md:224  (CONDENSE, from 32-38.md)

BEFORE: "> ⚠ **Heading corrected 2026-08-17.** It read \"ROLLOUT ONGOING\" while root `CLAUDE.md` said \"Rollout COMPLETE (D346)\". The rollout IS complete — verified by running the gate, not by reading either doc: `node scripts/audit-inline-styling.js --check` → **0 inline styling violations across 83 blocks**, exit 0. **Zero `sgs/*` blocks emit an inline `style` property declaration today.**"
AFTER:  "**ROLLOUT COMPLETE** — verified live: `node scripts/audit-inline-styling.js --check` → 0 inline styling violations across 83 blocks, exit 0. Zero `sgs/*` blocks emit an inline `style` property declaration."
NOTE:   Part of the single §6.1 heading-correction site (lines 224/226/238/241/245/256, condensed together — see line 226's row for the full combined AFTER text and D405/roster continuation).

### 32-COMPONENT-STYLING-TOKEN-CONTRACT.md:226  (CONDENSE, from 32-38.md)

BEFORE: "> ⛔ **But read D405 before quoting D346.** D405 records that D346's original inline-zero win was *partly an accident* — four `render_block` injectors were having their inline writes silently stripped, so the gate passed while the features were dead. That was root-cause-fixed afterwards (`helpers-scoped-instance-vars.php` + the 2026-07-30 sweep). **The zero-inline claim is true today because it was earned, not because the masking bug still hides it** — which is a different and stronger statement than either doc previously made."
AFTER:  "⚠ Cite with D405's caveat (mirrored in root `CLAUDE.md`): the original D346 win was partly accidental — four `render_block` injectors had their inline writes silently stripped, masking dead features until root-cause-fixed (`helpers-scoped-instance-vars.php`, 2026-07-30 sweep). The claim is true today because it was earned, not because the masking bug still hides it."
NOTE:   K3 — this D405 caveat is verbatim-mirrored in root `CLAUDE.md`'s "Block styling contract" section; keep the pointer so the two don't drift independently. The "earned, not masked" line is the load-bearing lesson, must survive. Companion rows: 224, 238, 241, 245, 256 (one continuous corrected heading-box).

### 32-COMPONENT-STYLING-TOKEN-CONTRACT.md:238  (CONDENSE, from 32-38.md)

BEFORE: "> ⚠ **The family roster below was STALE; corrected 2026-08-18, each figure re-derived at the moment of writing.**"
AFTER:  "Family roster below is re-derived over the current **83**-block count (was 74 at original scan)."
NOTE:   Same site as 224/226 (heading-correction box); this sentence introduces the roster re-derivation continued at 241/245.

### 32-COMPONENT-STYLING-TOKEN-CONTRACT.md:241  (CONDENSE, from 32-38.md)

BEFORE: "It claimed \"a universal scan of all 74 blocks\". Live count is **83** (`ls plugins/sgs-blocks/src/blocks/*/block.json | wc -l` → 83)."
AFTER:  "Live count: 83 (`ls plugins/sgs-blocks/src/blocks/*/block.json | wc -l`)."
NOTE:   Same site as 238 — drop the "it claimed 74" narration, keep the current measured count and its command.

### 32-COMPONENT-STYLING-TOKEN-CONTRACT.md:245  (CONDENSE, from 32-38.md)

BEFORE: "The per-family counts were also stale and are corrected in-table below. **Still owed:** `mega-panel.borderRadius`, a flat `{\"type\":\"string\",\"default\":\"20px\"}` scalar appearing in neither the MERGE nor the KEEP-SCALAR table — it postdates both and remains untriaged."
AFTER:  "**Still owed:** `mega-panel.borderRadius`, a flat `{\"type\":\"string\",\"default\":\"20px\"}` scalar appearing in neither the MERGE nor the KEEP-SCALAR table — it postdates both and remains untriaged."
NOTE:   Drop "were also stale" narration; the still-owed item is live, unresolved work and must survive.

### 32-COMPONENT-STYLING-TOKEN-CONTRACT.md:256  (CONDENSE, from 32-38.md)

BEFORE: "⚠ **The evidence base corrected 2026-08-18:** the original claim cited \"both live sites (palestine-lives Indus + sandybrown Mama's)\". **`palestine-lives.org` no longer exists** — removed from `TARGETS` 2026-08-10 — so half that evidence base is permanently unreachable and must not be re-quoted."
AFTER:  "Evidence base: only sandybrown (`palestine-lives.org` no longer exists, removed from `TARGETS` 2026-08-10 — do not re-quote it as evidence)."
NOTE:   Same heading-correction site; drop "original claim cited... corrected" narration, keep the operative instruction not to re-cite the dead site.

### 32-COMPONENT-STYLING-TOKEN-CONTRACT.md:294  (CONDENSE, from 32-38.md)

BEFORE: "⚠ **Both the old header AND the first correction of it were wrong; the TABLE was always right.** The 2026-07-09 original said \"10 families\" while its own table listed 6 — miscounted from inception."
AFTER:  "**KEEP scalar — 4 families (not box properties, or single-side):**"
NOTE:   Part of the "KEEP scalar" header-correction site (294/296/297 together). Drop the two-layer miscount history; see line 297 for the closing method lesson that must survive.

### 32-COMPONENT-STYLING-TOKEN-CONTRACT.md:296  (CONDENSE, from 32-38.md)

BEFORE: "On 2026-08-18 two genuinely-retired rows were deleted and the header was mechanically dropped 10→8 (subtracting from a number that was never right) instead of being recounted against the table it heads."
AFTER:  DELETE (folded into line 297's recount statement).
NOTE:   Narration of the intermediate miscounted state; not needed once the final recount (line 297) is stated.

### 32-COMPONENT-STYLING-TOKEN-CONTRACT.md:297  (CONDENSE, from 32-38.md)

BEFORE: "Recounted 2026-08-18: **4 rows, 4 families.** A count in prose is a copy with no invalidation — recount against the table, never arithmetic off the previous figure."
AFTER:  "(Recounted directly against the table, 2026-08-18 — a header count must be re-derived from its table, never adjusted by arithmetic off a prior figure.)"
NOTE:   K2 keeper — "recount against the table, never arithmetic off the previous figure" is the valuable method lesson and must survive.

### 32-COMPONENT-STYLING-TOKEN-CONTRACT.md:342-366 (`team-member` "last inline writer" correction chain)  (CONDENSE, from 32-38.md)

BEFORE: "`team-member` (block-private per D294, no wrapper) was migrated onto its own scoped rule in `a367836b` — a roster sweep of all 8 `sgs_transition_vars()` consumers found the other 7 already correct... ⚠ **CORRECTED 2026-07-30 — `team-member` was NOT \"the last render-level inline writer\".** That claim was true only of the sweep that produced it, which was scoped to one helper's 8 consumers. A later unscoped sweep across ALL plugin PHP found **14 further sites**: 11 in block `render.php` files ... plus **3 the render.php-scoped grep structurally could not see** — `class-sgs-container-wrapper.php` ..., `class-post-grid-rest.php` ..., and `shape-dividers.php` .... All 14 were migrated to scoped rules the same day. **The lesson is the scope of the sweep, not the count:** a claim of \"last one\" is only as wide as the grep that produced it, and the audit's own grep was `render.php`-only. **Parked, not silently dropped — `P-NO-INLINE-GATE-COVERAGE-GAPS`:** (1) the live no-inline gate's `CANARY_URLS` never exercised a hover/animation-attributed instance ... (2) the three **non-injector** inline writers (container-wrapper, post-grid-rest, shape-dividers) are the ones fixed 2026-07-30 above."
AFTER:  "All inline instance-var writers across plugin PHP are migrated to scoped rules (2026-07-30 sweep, including 3 sites a `render.php`-only grep could not see: `class-sgs-container-wrapper.php`, `class-post-grid-rest.php`, `shape-dividers.php`). **The lesson is the scope of the sweep, not the count:** a claim of \"last one\" is only as wide as the grep that produced it. Parked: `P-NO-INLINE-GATE-COVERAGE-GAPS` — the live no-inline gate's canary URLs never exercise a hover/animation-attributed instance, so this defect class passed vacuously for the life of the D346 migration."
NOTE:   K2 keeper (explicit prompt callout). The scope-of-the-sweep lesson MUST survive verbatim or near-verbatim. K3 — parking pointer kept.

### 32-COMPONENT-STYLING-TOKEN-CONTRACT.md:660  (CONDENSE, from 32-38.md)

BEFORE: "**(b) Missing slots.** ~~No snapshot is missing a slot.~~ **That claim was FALSE when written, and is TRUE now — both halves matter (corrected 2026-08-18).** - **As audited (2026-08-01) it was wrong:** re-derived on 2026-08-18, **7 of 8 client snapshots were missing framework slugs**, and `text` — which has 303 references across the framework — was absent from 5 of them. Every one of those references was silently resolving to its hardcoded fallback, so nothing looked broken while the properties could not re-skin per client."
AFTER:  "**(b) Missing slots.** Closed: 20 slugs seeded, `text-primary` migrated to `text`; re-derived as **0 clients missing any framework slug**, enforced by `check-palette-slug-refs.py` (ships a `--self-test` that plants a violation and asserts rejection)."
NOTE:   Part of the "Missing slots" finding (660/662 together). Struck-then-refuted claim followed by the pre-fix audit narrative; both collapse into the current closed state.

### 32-COMPONENT-STYLING-TOKEN-CONTRACT.md:662  (CONDENSE, from 32-38.md)

BEFORE: "- **The gap is now closed:** 20 slugs seeded, `text-primary` migrated to `text`, and re-derived as **0 clients missing any framework slug**. - **Why the original check passed a real defect:** the verdict function ran the right command and returned DONE *without asserting the output was empty* — a check that could not fail. Enforced since by `check-palette-slug-refs.py`, which ships a `--self-test` that plants a violation and asserts rejection."
AFTER:  "**Why the original check passed a real defect:** the verdict function ran the right command and returned DONE *without asserting the output was empty* — a check that could not fail."
NOTE:   K2 keeper (explicit prompt callout) — this negative-control lesson about verification must survive; the "gap is now closed" fact is folded into line 660's AFTER text to avoid duplication.

### 38-SGS-MOTION-SYSTEM.md:203 (image-sequence "Content restriction" correction)  (CONDENSE, from 32-38.md)

BEFORE: "**Content restriction: none required.** *(Original text, retained for the record.)* A block author placing links, buttons or form fields inside a `pin-scrub` section or a horizontal panel needs no additional wiring — reachability is inherited from the browser's native focus-scroll. ⚠ **SUPERSEDED 2026-08-01 (D453) — this was proven FALSE the moment a fixture with real interactive content existed**... A control inside a `pin-scrub`/`scrub`/`split-reveal` section is focusable while at `opacity: 0`, because `fromTo` immediate-renders the hidden FROM state before any scroll. That is a WCAG 2.4.11 failure and it DOES need additional wiring: `fx-pin-scrub.js` and `fx-scrub.js` now hold the reveal on `gsap.ticker` while focus is inside; `fx-split-reveal.js` uses a one-shot... The horizontal panel is the ONLY one where native reachability suffices, and even there by accident — see D458."
AFTER:  "**Content restriction:** a control inside a `pin-scrub`/`scrub`/`split-reveal` section is focusable while at `opacity:0` (WCAG 2.4.11), because `fromTo` immediate-renders the hidden FROM state before any scroll. `fx-pin-scrub.js`/`fx-scrub.js` hold the reveal on `gsap.ticker` while focus is inside; `fx-split-reveal.js` uses a one-shot. The horizontal panel is the only one where native reachability suffices, and only by accident (see D458)."
NOTE:   Dead text ("none required") is explicitly quoted and marked "retained for the record" immediately before being refuted — textbook CUT-the-dead-claim, keep-the-correction.

### 38-SGS-MOTION-SYSTEM.md:305-322 (carousel-loop roster predicate correction)  (CONDENSE, from 32-38.md)

BEFORE: "⚠ **THE ROSTER PREDICATE IN THIS SPEC WAS WRONG, and is corrected here.** This section previously said to re-derive the roster from `supports.sgs.fx.draggable`. That predicate returns `{ before-after, gallery }` — two blocks, one of which has no scroller at all. **The correct predicate is \"owns a native horizontal scroller\"**, which is precisely what `isNativeHorizontalScroller()` gates on at runtime. Measured, that is `buybox`, `gallery`, `google-reviews`, `post-grid`, `trustpilot-reviews`. Two blocks are deliberately EXCLUDED, with reasons, so neither is re-proposed cold: - **`sgs/before-after`** declares `fx.draggable` but has no `overflow-x` anywhere — its drag is a divider handle, not a scroller. Looping would no-op. - **`sgs/testimonial-slider`** has a `dragToScroll` attr but its track is `overflow:hidden` + transform-driven, so `isNativeHorizontalScroller()` rejects it... Giving it looping means converting the track to a native scroller and moving its arrows/dots/autoplay onto `scrollLeft`: a behavioural change to that block, not a rollout step. **Bean ruled it out of scope 2026-08-02.** - `sgs/timeline` is a genuine horizontal scroller with no fx declaration at all — an unclaimed candidate needing a new control surface, not a rollout."
AFTER:  "**Roster predicate: \"owns a native horizontal scroller\"** — what `isNativeHorizontalScroller()` gates on at runtime. Measured: `buybox`, `gallery`, `google-reviews`, `post-grid`, `trustpilot-reviews`.\nDeliberately EXCLUDED, so neither is re-proposed cold:\n- `sgs/before-after` — `fx.draggable` drives a divider handle, not a scroller; no `overflow-x`, looping would no-op.\n- `sgs/testimonial-slider` — track is `overflow:hidden` + transform-driven, not a native scroller; adding looping means converting the track and moving arrows/dots/autoplay onto `scrollLeft` — a behavioural change, not a rollout step. Bean ruled out of scope 2026-08-02.\n`sgs/timeline` is a genuine horizontal scroller with no fx declaration — an unclaimed candidate needing a new control surface, not a rollout."
NOTE:   Explicit prompt callout — the two exclusion-with-reasons entries are load-bearing (prevent re-proposal) and must survive. Drop only the "WAS WRONG, corrected here" narration and the superseded `fx.draggable` predicate.

### 38-SGS-MOTION-SYSTEM.md:326-333 (carousel-loop reduced-motion item 2)  (CONDENSE, from 32-38.md)

BEFORE: "2. **CLOSED 2026-08-02 (register item M2).** Reduced motion for the LOOP is now measured, not assumed — see §10's new `Carousel loop (FR-38-26)` row. Confirmed on 4 of 5 rollout blocks with a real `reducedMotion:'reduce'` browser context: clones, neutralisation, and boundary re-seat all behave identically under reduce, because the correction is an instantaneous `scrollLeft` write, never a tween — there is genuinely nothing for `prefers-reduced-motion` to gate in this module. A negative control (each block's OWN arrow-click, a separate code path) proved the emulated context was real: `sgs/gallery`/`sgs/post-grid` correctly branch `auto`/`smooth`; `sgs/trustpilot-reviews` and `sgs/google-reviews` hardcoded `'smooth'` regardless of preference — a genuine defect in those two blocks' own arrow-click code, separate from the loop module. ✅ **BOTH FIXED 2026-08-02**..."
AFTER:  "Reduced motion for the carousel LOOP is confirmed identical under reduce on 4 of 5 rollout blocks — the correction is an instantaneous `scrollLeft` write, never a tween, so there is nothing for `prefers-reduced-motion` to gate in this module. Full detail + the fix for the two blocks whose own arrow-click code hardcoded `'smooth'`: §10's `Carousel loop (FR-38-26)` row."
NOTE:   This item substantially duplicates the fuller telling already condensed at the §10 row (line ~1238, see K4 row below) and the item-3 keyboard-wrap paragraph immediately following it; keep one canonical statement here and point at §10 rather than re-narrating the fix.

### 38-SGS-MOTION-SYSTEM.md:349-360 (google-reviews keyboard-wrap defect narrative)  (CONDENSE, from 32-38.md)

BEFORE: "3. **CLOSED 2026-08-02 (register item M2), with ONE genuine defect found.** Keyboard arrow-wrap was exercised live (`scripts/motion-qa/probe-carousel-loop.mjs`, Arm 2 ...) on all 4 arrow-bearing blocks... `sgs/gallery`, `sgs/post-grid`, `sgs/trustpilot-reviews` all wrap correctly — the arrow never disables AND the active position genuinely returns to its starting point (gallery/post-grid in exactly N presses ...; trustpilot in N+1, because its dot-sync is nearest-scroll-position rather than a counter ... a real mechanism difference, not a defect). `sgs/google-reviews` WAS genuinely broken: its `nextSlide()` computed an absolute scroll target by scanning only REAL (non-clone) items for one past the current position; once `scrollLeft` moved into clone territory it had no further real item to target and dead-ended at the last real card forever — the arrow never disabled (satisfying the letter of \"must never disable\") but functionally could not progress past the last real card via repeated keyboard activation, failing WCAG 2.5.7's actual requirement that the alternative WORK. Satisfying a rule's wording while defeating its purpose is the failure shape worth remembering here."
AFTER:  "Keyboard arrow-wrap verified live on all 4 arrow-bearing carousel-loop blocks (`probe-carousel-loop.mjs` Arm 2). `sgs/google-reviews` had a genuine WCAG 2.5.7 defect — its `nextSlide()` could dead-end in clone territory with no further real item to target, so the arrow never disabled but the user could not actually progress. Fixed. **Satisfying a rule's wording while defeating its purpose is the failure shape worth remembering.**"
NOTE:   K2 — the closing sentence is a genuine method lesson (WCAG letter-vs-purpose) and must survive; the per-block pass narrative (gallery/post-grid/trustpilot mechanism differences) is now-redundant detail.

### 38-SGS-MOTION-SYSTEM.md:512-534 (multi-list drift — pre-gate narrative)  (CONDENSE, from 32-38.md)

BEFORE: "1. **THE MULTI-LIST DRIFT — the single most expensive defect class this spec has produced.** ✅ **GATED 2026-08-02** by `plugins/sgs-blocks/scripts/check-fx-list-drift.py`... Six invariants... **The paragraph below describes the situation that existed BEFORE that gate.** An fx effect must join THREE hand-maintained lists to work at all, and **no gate cross-checks any of them**: `SHIPPED_EFFECTS`..., `FX_ATTR_MAP`..., and `sgs_fx_effect_param_scope()`.... **Two of the three were missed on `cursor-field` in one session, and neither failed a build.** Missing the first made the entire feature unreachable from the editor while every other layer was correctly wired; missing the third rendered a page that looked completely healthy... while the client's chosen colour and radius were silently dropped. The third only surfaced by LIVE verification, after the other fixes had already shipped. A FOURTH list of the same shape governs field types... Two hand-maintained lists diverging silently is a failure this codebase has met before (see the `TRANSITION_STYLES` note in `class-sgs-motion-registry.php`) — this is now four."
AFTER:  "**THE MULTI-LIST DRIFT** — GATED 2026-08-02 by `check-fx-list-drift.py` (wired into `prebuild`). An fx effect must join THREE hand-maintained lists (`SHIPPED_EFFECTS`, `FX_ATTR_MAP`, `sgs_fx_effect_param_scope()`), plus a fourth triad governing field types; the gate cross-checks all of them (6 invariants + I6), `--self-test`-proven by deleting `cursor-field` from each list in turn and confirming the build fails. **Two hand-maintained lists diverging silently is a failure this codebase has met before (`TRANSITION_STYLES`, `class-sgs-motion-registry.php`) — this is now four,** which is why the gate reads no database and cross-checks committed source only."
NOTE:   K2 — the "this is now four" recurring-pattern lesson is the valuable takeaway; the specific pre-gate `cursor-field` incident narrative (which two lists were missed, what broke) is now-superseded by the gate's existence.

### 38-SGS-MOTION-SYSTEM.md:720  (CONDENSE, from 32-38.md)

BEFORE: "> **Condition (c)'s former clause about the theme's `smooth-scroll.js` is STRUCK (D422).** It required suppressing a file that **no longer exists in the enqueue path** —"
AFTER:  "No suppression of `smooth-scroll.js` is needed — the file no longer exists in the enqueue path (retired in `theme/sgs-theme/functions.php`)."
NOTE:   Part of the single `smooth-scroll.js` struck-clause site (720/721/722 together). Dead clause explicitly named "STRUCK" and quoted-to-refute.

### 38-SGS-MOTION-SYSTEM.md:721  (CONDENSE, from 32-38.md)

BEFORE: "`theme/sgs-theme/functions.php` retired it (\"Smooth scroll now handled by CSS… The JS file is"
AFTER:  N/A (folded into line 720's AFTER text).
NOTE:   Same site as 720/722 — the retirement citation, kept in condensed form at 720.

### 38-SGS-MOTION-SYSTEM.md:722  (CONDENSE, from 32-38.md)

BEFORE: "no longer needed\"), and nothing in the repo enqueues it. The live competing driver is instead"
AFTER:  "The competing `scroll-behavior:smooth` CSS driver (`core-blocks-critical.css`) was measured live with Lenis running and did not reproduce a conflict: long smooth scrolls eased cleanly, anchor clicks landed clear of the sticky header. Re-open only with a reproduction."
NOTE:   Same site as 720/721. Keeps the measured-not-reproduced evidence per `prove-the-cause-before-fix.md`.

### 38-SGS-MOTION-SYSTEM.md:791  (CONDENSE, from 32-38.md)

BEFORE: "### 4.2 ScrollSmoother × Spec 37 header sticky (D407) — ⛔ SUPERSEDED BY D422 (2026-07-30)"
AFTER:  "### 4.2 ScrollSmoother × Spec 37 header sticky — SUPERSEDED BY D422 (2026-07-30)"
NOTE:   Section heading opening the ScrollSmoother×header site (rows 791/793/810/811/812/818/819/821/827/858, all one continuous §4.2 block). Combined AFTER text given in full at line 793's row.

### 38-SGS-MOTION-SYSTEM.md:793  (CONDENSE, from 32-38.md)

BEFORE: "> **⛔ THIS CONFLICT NO LONGER EXISTS. DO NOT BUILD ANYTHING IN THIS SECTION.** > D407 resolved a conflict created *entirely* by ScrollSmoother's mechanism: it wraps page content in `#smooth-wrapper > #smooth-content` and **transforms** the content element, and a transformed ancestor silently stops `position: sticky` from pinning. Every artefact below ... exists only to work around that. > **D422 replaced the smoother with Lenis (Tier H), which eases the real document scroll and creates no wrapper and no transform.** There is nothing to sit outside of, nothing to trap the header in, and no template to restructure. **Measured on the canary before the swap**, with Lenis running: no wrapper element created; the header's entire ancestor chain ... reported `transform: none`; the header held `getBoundingClientRect().top === 0.00` at every scroll position **including mid-flight**..."
AFTER:  "**This conflict no longer exists.** D422 replaced ScrollSmoother with Lenis (Tier H), which eases the real document scroll and creates no wrapper and no transform — there is nothing for the header to sit outside of. Measured on the canary: no wrapper element, header's ancestor chain reports `transform:none`, header pins correctly including mid-flight."
NOTE:   Combined section AFTER (this row is the anchor text for the whole 791-858 condensation). The REASON ScrollSmoother was rejected — it wraps/transforms page content and a transformed ancestor silently stops `position:sticky` — is the negative-control line and is restated in full at line 821's row.

### 38-SGS-MOTION-SYSTEM.md:810  (CONDENSE, from 32-38.md)

BEFORE: "> **Consequences, stated so they are not silently dropped (STOP-29):** · The Wave B \"output filter / wrapper insertion\" build item is **CANCELLED**, not deferred."
AFTER:  "The Wave B wrapper-insertion filter is CANCELLED (not deferred)."
NOTE:   Part of the §4.2 site. Folded into the combined AFTER text at line 793's row for the published replacement text.

### 38-SGS-MOTION-SYSTEM.md:811  (CONDENSE, from 32-38.md)

BEFORE: "· The `findStickyBreakingAncestor()` tripwire extension is **CANCELLED** — the existing warn-only guard in `src/header-behaviours/view.js` stays exactly as shipped, untouched."
AFTER:  "The `findStickyBreakingAncestor()` tripwire extension is CANCELLED — the existing warn-only guard stays exactly as shipped, untouched."
NOTE:   Part of the §4.2 site (810/811/812 are the three CANCELLED consequences).

### 38-SGS-MOTION-SYSTEM.md:812  (CONDENSE, from 32-38.md)

BEFORE: "· FR-38-18's former condition (d) (the sticky-header resolution) is **struck**; the header verification survives as a *regression check*, not an engineering task (§8 Wave B). · Spec 37 FR-37-40 is **not modified by this spec in any way.**"
AFTER:  "FR-38-18's former condition (d) is struck; the header verification survives as a regression check, not an engineering task. Spec 37 FR-37-40 is untouched."
NOTE:   Part of the §4.2 site — last of the three CANCELLED/struck consequences.

### 38-SGS-MOTION-SYSTEM.md:818  (CONDENSE, from 32-38.md)

BEFORE: "> The text below is retained as the historical record of why the ScrollSmoother route was rejected. It is not an instruction."
AFTER:  "**Why ScrollSmoother was rejected (retained as the reason, not as a build guide):** it wraps and transforms page content, and a transformed ancestor silently stops `position:sticky` from pinning — the exact mechanism the shipped header sticky/collapse system depends on."
NOTE:   Explicit prompt callout — the REASON ScrollSmoother was rejected is a negative-control line that must survive. This is the line the prompt specifically flagged ("The text below is retained... condense to one line; never delete the reason").

### 38-SGS-MOTION-SYSTEM.md:819  (CONDENSE, from 32-38.md)

BEFORE: "**Ground truth correction:** Spec 37's per-row sticky was REJECTED (FR-37-40 short-parent trap); what shipped is HEADER-level `position:sticky` + row COLLAPSE, a measured pinned-gate (`getComputedStyle(header).position`), and `findStickyBreakingAncestor()` — which already detects exactly what ScrollSmoother creates (a transformed ancestor → \"computes sticky but never pins\")."
AFTER:  DELETE — folded into line 818's AFTER text (the FR-37-40 rejection is already stated as still-binding at line 147's row; restating it here is redundant).
NOTE:   Part of the §4.2 site.

### 38-SGS-MOTION-SYSTEM.md:821  (CONDENSE, from 32-38.md)

BEFORE: "**Resolution — (c) the header sits OUTSIDE the smoothed wrapper**, chosen over (a) reimplement via ScrollTrigger pinning and (b) blanket mutual exclusion: - ScrollSmoother keeps NATIVE document scroll ... so a sticky header placed as a SIBLING of the wrapper ... pins natively with **zero rework** ... **The insertion mechanism is a named Wave B build item** (qc-council 2026-07-29 — no shared wrapper filter exists today): ONE output filter that wraps everything between the header and the end of the footer ..."
AFTER:  "Resolution that WAS chosen for ScrollSmoother, had it shipped — kept for one line each: (a) reimplement sticky via ScrollTrigger pinning — rejected, forks every future header behaviour into two permanently-maintained code paths; (b) blanket mutual exclusion between smoother and sticky header — rejected, forces clients to choose between two most-requested features; (c) header sits outside the smoothed wrapper — the one that would have shipped, made moot by D422."
NOTE:   K6 length test: the resolution is kept plus one line per rejected option; the ~15-line native-scroll rationale and Wave B build-item mechanics for a system that was never built and is now permanently moot are deleted.

### 38-SGS-MOTION-SYSTEM.md:827  (CONDENSE, from 32-38.md)

BEFORE: "- Why not (a): it reimplements a BUILT + LIVE-VERIFIED system inside ScrollTrigger and forks every future header behaviour into two code paths — maximum rework, permanent double maintenance. Why not (b) alone: it forces clients to choose between the two most-requested premium features when they compose cleanly under (c)."
AFTER:  DELETE — folded into line 821's AFTER text (the "why not (a)/(b)" reasoning is already stated there in one line each).
NOTE:   Part of the §4.2 site.

### 38-SGS-MOTION-SYSTEM.md:858  (CONDENSE, from 32-38.md)

BEFORE: "- **Edge rule (amended post qc-council — `headerSticky` is a per-tier TRI-STATE, not a boolean, and the header's DOM position cannot flip per breakpoint):** the header sits OUTSIDE the smoothed wrapper whenever `headerSticky` is truthy on **ANY tier**; on tiers where sticky is off, the header then scrolls at native (unsmoothed) speed ... Only when sticky is off on EVERY tier does the header stay INSIDE `#smooth-content`."
AFTER:  DELETE — this per-tier edge-rule detail belongs to the (c) design that was never built (made moot by D422); not needed once §4.2 states the conflict no longer exists.
NOTE:   Part of the §4.2 site — the last paragraph of the now-moot design detail.

### 38-SGS-MOTION-SYSTEM.md:1238 (carousel-loop reduced-motion row, duplicate narrative)  (K4, from 32-38.md)

BEFORE: "Carousel loop (FR-38-26) | **Measured 2026-08-02 (register item M2).** Unstated in this spec until now ... **Confirmed identical under reduce**, by direct measurement on 4 of 5 rollout blocks ... Negative control ... `sgs/gallery`/`sgs/post-grid` pass `auto` vs `smooth` ... (post-grid's `behavior` was misspelled `behaviour`, a silent no-op discovered and fixed live this session ...); `sgs/trustpilot-reviews` and `sgs/google-reviews` passed a HARDCODED `'smooth'` regardless of `prefers-reduced-motion` — a real defect ... NOT in the loop module. ✅ BOTH FIXED same day (`5c45f879`, `ba28ab92`): each now reads the media query fresh per call. The sweep caught a third instance the measurement missed — a SECOND `scrollIntoView` in post-grid still spelled `behaviour`. The one remaining hardcoded `'smooth'` (google-reviews autoplay) is correctly gated by an early return under reduce."
AFTER:  "Carousel loop (FR-38-26) | **Suppress-equivalent (measured 2026-08-02):** the correction is an instantaneous `scrollLeft` write, never a tween, so there is nothing for `prefers-reduced-motion` to gate directly. Confirmed identical under reduce on 4 of 5 rollout blocks. Two blocks' own arrow-click code hardcoded `'smooth'` regardless of the preference — a defect in those blocks, not the loop module — fixed same day (`5c45f879`, `ba28ab92`); the one remaining hardcoded case (google-reviews autoplay) is correctly gated by an early return."
NOTE:   Same fix narrative (post-grid `behaviour` misspelling, trustpilot/google-reviews hardcoded `'smooth'`) is told in full at lines ~326-360 (condensed above). Keep the full telling there; keep only the reduced-motion-relevant conclusion here.

### 38-SGS-MOTION-SYSTEM.md:1335-1343 (morph "FALSE WHEN WRITTEN" correction)  (CONDENSE, from 32-38.md)

BEFORE: "> ⚠ **CORRECTED 2026-08-01 (D452) — the claim below was FALSE WHEN WRITTEN.** Morph had NEVER animated on any block: `fx-shape-routes.php` emitted `data-sgs-fx=\"morph\"` on the injected `<svg>` wrapper, and MorphSVGPlugin refuses an `<svg>` container outright. Measured: the `d` attribute unchanged across 148 animation frames. Read \"both engines working\" below as \"both engines SHIPPED\": motion-path worked, morph did not."
AFTER:  "Morph never animated pre-fix: `fx-shape-routes.php` emitted `data-sgs-fx=\"morph\"` on the injected `<svg>` wrapper, and MorphSVGPlugin refuses an `<svg>` container outright (measured: `d` attribute unchanged across 148 frames). \"Both engines working\" below means both SHIPPED — motion-path worked, morph did not, until the preset render-layer expansion below fixed it."
NOTE:   Resolves an internal contradiction (an earlier "both engines working" claim vs this correction) but both statements now agree once read as intended — no code check needed, ESCALATE not required.

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:45-47  (K1, from 35.md)

BEFORE: "⛔ **A3 previously read "Behaviour/content → Settings; appearance → Styles".** That rule splits an
element's appearance from the content it modifies; 8 blocks were sorted on it on 2026-08-08 and
rejected. Full rule: **PART O** (this spec) §"THE PLACEMENT RULE"."
AFTER: "⛔ **A3's old Settings/Styles split rule is retired** — it split an element's appearance from
the content it modifies; 8 blocks were hand-sorted on it on 2026-08-08 and Bean rejected the result.
Full rule: **PART O** (this spec) §"THE PLACEMENT RULE"."
NOTE: Keeps the rule (old approach + why it failed + pointer to current rule); drops nothing load-bearing, just tightens the sentence.

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:451-519 (F.2.2 subsection)  (K5, from 35.md)

BEFORE: "**F.2.2 — `supports.sgs.gridAreas` flag: completing an existing declaration, not inventing
one.** Verified live (correcting D633, which reported "0 hits"): ... [full DB-layer / Editor-layer
implementation plan, ~45 lines]"
AFTER: "**F.2.2 — `supports.sgs.gridAreas`: RETIRED, not built (D639).** The flag was real
(`sgs/hero/block.json` declared `["content","media"]`) but had zero readers, and building one turned
out unnecessary: the converter derives area names directly from the draft's BEM element token
(`assembly.py` step 3d), gated on the block declaring `<area>+<Suffix>` attrs, not on this flag.
`check-wrapper-capability-preconditions.js` rule 2 now FAILS the build on any declaration of
`gridAreas` (including an empty array). See `decisions.md` D639 for the full falsification chain."
NOTE: This is the retired half of a mixed status box (F.2.1/F.2.3 were built as specced, F.2.2 was not). The status box at line 397-449 already carries a one-row summary of this outcome — the full original DB-layer/Editor-layer implementation plan for a feature later proven unnecessary should collapse into that same table rather than surviving as a full design doc for dead work.

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:747  (K2, from 35.md)

BEFORE: "**RESOLVED 2026-07-30 — the "gap" was a measurement bug, not missing gates.** A DB roster
regeneration briefly flagged 18 blocks (14× `form-field-*`, `form-review`, `form-step`,
`accordion-item`, `tab`) as lacking `prefers-reduced-motion`. All 18 were FALSE POSITIVES:
`build-roster.py` substring-matched `"animation"` against the raw `supports.sgs` JSON, so
`hideExtensions:["animation"]` — an opt-**OUT** list — was read as *having* animation. None of the
18 even has a `style.css`. Fixed by stripping `hideExtensions` before matching (`animation` 36→18;
gate PASS; the 18 retained are the genuinely-animating blocks, all passing). **A genuine
framework-wide gate already covers every block:** `theme/sgs-theme/assets/css/core-blocks-critical.css:69-78`
... **RESOLVED 2026-08-01: rule 5 now sees the global gate.** ⚠ The mechanism described below LIVES
ON, but it moved: `audit-inspector-conformance.js` was retired 2026-08-06 (Task D, `4e07ab6c`) and
this detector now sits in `plugins/sgs-blocks/scripts/inspector-scan/rules/17-reduced-motion-gate.js`
... [long paragraph continues]"
AFTER: "**Lesson (2026-07-30): a name-substring match on `supports.sgs` JSON is blind to negation** —
`build-roster.py` read `hideExtensions:["animation"]` (an opt-OUT) as *having* animation, false-flagging
18 blocks with no `style.css` at all. Fixed by stripping `hideExtensions` before matching. **Current
state:** every block is covered by one framework-wide gate,
`theme/sgs-theme/assets/css/core-blocks-critical.css:69-78` (unconditionally enqueued,
`functions.php:233`), detected live each run by
`plugins/sgs-blocks/scripts/inspector-scan/rules/17-reduced-motion-gate.js` (reads
`theme/sgs-theme/functions.php`'s enqueue chain + the CSS itself for a universal
`prefers-reduced-motion` block — nothing hardcoded, so removing the gate re-flags every ungated block)."
NOTE: Keeps the substring/negation-blindness lesson (highest-value line) and the current mechanism; drops the multi-step "RESOLVED... then RESOLVED again... it moved" narration chain.

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:1103-1113  (K2, from 35.md)

BEFORE: "⭐ **The general lesson: a design ruling plus a status doc summarising it as "shipped" is not
evidence the code changed.** D621 was ruled and A3 above (line 48) was updated to say "COLOUR
SETTLED", and a prior session's status summary called it shipped — but the component itself was
never touched until a direct file read + a live editor check caught the missing `group` prop
today. Treat "ruled" and "summarised as done elsewhere" as two separate claims from "verified in
the component's own source" — this spec has now carried this exact failure mode more than once
(see the `ShadowControl` precedent at Part M's "Also outstanding across the board" note above:
crashed on first live render despite 180 passing unit tests)."
AFTER: "**Lesson:** a design ruling plus a status doc calling it "shipped" is not evidence the code
changed — verify against the component's own source. Recurred twice in this spec: D621's
`SgsColourPanel` missing `group` prop, and `ShadowControl` crashing on first live render despite 180
passing unit tests."
NOTE: One-line meta-lesson kept per K2; drops the build-up narrative.

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:2437-2472  (K2, from 35.md)

BEFORE: "⚠ **CORRECTED 2026-08-11 by a QC council (D566), and the way it was wrong is the lesson.** This
entry first recorded only the 2 `SelectControl` hits as false positives and passed the 5
`ResponsiveBoxControl` hits through as real, under "Recorded, NOT fixed — Phase 3". A rater read
the code; **all 5 are the same defect class as the 2 already caught.** `sgs/counter:196`,
`sgs/timeline:390` and `sgs/whatsapp-cta:204` are each the **Margin** `ResponsiveBoxControl`
(`values={{ base: style?.spacing?.margin … }}`) — the scanner attributed a nearby `borderRadius*`
attribute NAME to the closest `ResponsiveBoxControl`, which controls margin. **Real count: 0.**

   The failure was not the scanner — it was applying the read-the-code check to one bucket of a
   table and not the bucket beside it. **When a survey leg is shown to mis-attribute, re-check EVERY
   bucket in that leg, not just the one that prompted the suspicion.**

   The 2 `SelectControl` hits, for the record:
   - `sgs/button` — the flagged `SelectControl` is `textDecorationHover`; `borderRadiusTablet/Mobile`
     actually feed `ResponsiveBorderRadiusControl` (`edit.js:772-773`). **Canonical.**
   - `sgs/product-card` — the flagged `SelectControl` is `ctaStyle`; `ctaBorderRadius` feeds
     `ResponsiveBorderRadiusControl` (`edit.js:1670`). **Canonical.**

   So the *real* §14.3 banned-lookalike population was **3, not 5**, and all 3 are now fixed. This is
   the same defect class already recorded against the LENGTH survey — the scanner attributes an
   attribute name found in a nearby **comment** to the next control it sees. Treat every survey leg
   as a candidate list requiring a read, never a defect list."
AFTER: "**Lesson (D566):** when a survey leg is shown to mis-attribute, re-check every bucket in that
leg, not just the one that prompted the suspicion — the same "attribute name found near a control,
attributed to the wrong one" defect hit both the raw-CSS bucket AND the `ResponsiveBoxControl`
bucket (`sgs/counter`, `sgs/timeline`, `sgs/whatsapp-cta` all feed Margin, not the flagged
`borderRadius*`; `sgs/button` and `sgs/product-card`'s flagged `SelectControl`s were
`textDecorationHover`/`ctaStyle`, not border). Real §14.3 banned-lookalike population: **3, not
5** — all 3 fixed. Treat every survey leg as a candidate list, never a defect list, until read."
NOTE: Keeps the meta-lesson + the corrected count with enough evidence to re-locate the specific blocks; drops the step-by-step "first recorded... a rater read the code..." narrative.

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:2568-2578  (K2, from 35.md)

BEFORE: "⚠ **CORRECTION — this entry is a PROMOTION, not a discovery.** It was first written here claiming
panel order "existed nowhere in the contract". That was **wrong**, and wrong by the classic
truncated-grep failure: the search that produced the claim was capped at its first 20 hits and the
relevant line sits at ~980. **Cross-cutting A already carried it**: *"Panel order — three competitors
converged on ordering being deliberate. Stackable achieves it by convention repeated per block, not a
shared assembler; GenerateBlocks centralises the Styles tab only — Advanced stays per-block even
there."* What was genuinely missing is that this sat as a **competitor-research note with no
obligation, no canonical order and no enforcement**. CO-28 promotes it to a binding obligation and
inherits that research as its starting evidence — it does not replace or re-derive it."
AFTER: "**Note:** this obligation PROMOTES an existing competitor-research note (Cross-cutting A's
panel-order convergence findings: Stackable via per-block convention, GenerateBlocks centralising
only the Styles tab) to a binding obligation with enforcement — it is not a fresh discovery. Lesson:
an earlier claim that panel order "existed nowhere in the contract" was itself wrong, caused by a
grep capped at 20 hits missing the relevant line at ~980 — always check whether a `head`/first-N-hits
search silently truncated before asserting an absence."
NOTE: Keeps the K2 truncated-grep lesson (matches the corpus-wide pattern this purge is looking for) and the factual relationship to Cross-cutting A; drops the "first written here claiming... that was wrong" self-narration structure.

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:2848-2857  (K1, from 35.md)

BEFORE: "⛔ **SUPERSEDED 2026-08-08 (D525).** The rule first proposed here —
`capability IN ('array-content-lift','carousel','grid-layout','logo-strip') OR attr_type='array' AND
role='content'` — **cannot be built as written.** Three of those four capabilities are FOSSILS with
no writer and no reader (see §Tier 0). And the array-attr fallback leg was measured: it selects 10
blocks and **misses `sgs/gallery`**, the very block this section is about, because `mediaItems`
carries no role.

**The shipped rule is a DECLARATION:**
```
isCollectionKind(block) = block_capabilities row (slug, 'collection')
                          ← supports.sgs.collection in the block's own block.json
```
15 blocks declare it. Fire it for **Block Link** specifically. No prerequisite remains — the data
exists, has a live writer, and a block states the fact about itself."
AFTER: "The naive rule `capability IN ('array-content-lift','carousel','grid-layout','logo-strip')
OR attr_type='array' AND role='content'` was rejected (D525): three of those four capabilities are
fossils with no writer/reader, and the array-attr fallback leg misses `sgs/gallery` (its
`mediaItems` carries no role) — the very block this section is about. **Shipped instead:**
`isCollectionKind(block) = block_capabilities row (slug,'collection') ← supports.sgs.collection` in
the block's own block.json. 15 blocks declare it; fires for Block Link specifically."
NOTE: none

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:542-551  (K1, from 35.md)

BEFORE: "**Control shape — RULED by Bean, 2026-08-16, keep the link/unlink toggle. The earlier reasoning
against it (framed here as "4 equal box sides vs 2 unrelated axes") was WRONG, corrected directly by
Bean:** X and Y are not unrelated axes needing independent controls by default ... the corrected
reasoning stands on its own."
AFTER: "**Control shape (D637, 2026-08-16): keep the link/unlink toggle.** Proportional-scale-by-default
with a lock/unlock toggle is the standard shape-resize convention (Figma/Photoshop/Canva) — a
stronger precedent than treating X/Y as unrelated axes needing independent controls. Default state
LINKED (computed as `value.x === value.y` on mount; a fresh instance starts at `{x:100,y:100}`, so it
opens linked; an already-unlinked instance reopens unlinked)."
NOTE: Keeps the ruling + the winning rationale; drops the "earlier reasoning was WRONG, corrected directly by Bean" self-historiography framing.

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:819-830  (K1, from 35.md)

BEFORE: "- [x] **states use `StateToggleControl`** → ⛔ **RE-VERDICT 2026-08-17: the CAPABILITY IS DONE; this
item names a component the design DELIBERATELY REJECTED.** An earlier pass in this same audit
recorded it "NOT DONE" on the strength of `StateToggleControl` having 0 mounts. That was the
wrong conclusion — it checked for the named component instead of asking whether a successor
delivers the capability. **D609 ... supersedes it explicitly:** states are reached by *"a tab
toggle in pop up colour picker between states"* ... **Actions: (a) reword this item to name the
D609 tab-toggle mechanism; (b) delete the orphan component.** Neither is a capability gap."
AFTER: "- [x] **State capability is DONE via `SgsColourPanel`'s D609 tab-toggle mechanism, not
`StateToggleControl`** — 60 blocks pass `states:` to the colour control (`DesignTokenPicker.js:27-34`).
`StateToggleControl` is an orphan of the pre-D609 design, exported from `components/index.js:45` with
0 mounts. Actions: (a) reword this checklist item to name the D609 mechanism; (b) delete the orphan
component. Neither is a capability gap."
NOTE: Lesson worth keeping in one clause: checking for a named component instead of asking whether a successor delivers the capability produced a false "NOT DONE" — folded into the corrected item rather than kept as separate narration.

### 37-HEADER-FOOTER-BUILDER.md:299-307  (K1, from 37-36.md)

BEFORE: `- **⚠ The "no uniqueness guard is needed" reasoning below was FALSIFIED by the same defect.**
  It is retained rather than deleted because its *conclusion* still stands on the corrected
  mechanism, but its *premise* was wrong and must not be re-cited as evidence.
- ~~**No \`rowSlot\` enum or uniqueness guard is needed.** With the container locked, a fourth row
  or a duplicate \`top\` cannot be inserted through the UI at all.~~ **FALSE as written:** the
  corruption above produced trees with **two rows both carrying \`rowSlot: 'middle'\`** — exactly
  the duplicate this clause asserted was structurally impossible. The lock governs *operator*
  insertion; it never governed what the template sync itself writes. With D393's fix the
  duplicate can no longer occur, so no validator is added — but on the corrected grounds that
  the sync no longer rewrites a populated container, NOT because "the UI makes it impossible".
  Adding a schema-level validator would still be a second guard overlapping a working one —
  forbidden by \`~/.claude/rules/prove-the-cause-before-fix.md\`.`
AFTER: `- **No \`rowSlot\` enum or uniqueness guard is added.** D393's template-sync fix
  (\`template: isEmpty ? TEMPLATE : undefined\`, latched on first render) means the sync no
  longer rewrites a populated container, so a duplicate \`rowSlot\` cannot occur — NOT because
  the locked UI prevents insertion (that premise was falsified: pre-fix corruption produced
  two rows both carrying \`rowSlot: 'middle'\`). A schema-level validator here would be a
  second guard overlapping a working one — forbidden by
  \`~/.claude/rules/prove-the-cause-before-fix.md\`.`
NOTE:   Keeps the load-bearing decision (no validator, and on which grounds) + the meta-lesson citing the prove-the-cause rule; drops the retained struck original clause and the blow-by-blow refutation.

### 37-HEADER-FOOTER-BUILDER.md:633-648  (K2, from 37-36.md)

BEFORE: `> **⚠ Corrected 2026-07-21 after an adversarial council; the original text here was wrong and
> would have shipped a silent failure.** v1.0.0 said to pass the HTML through
> \`apply_filters( 'sgs_header_rule_resolved', … )\` because "that filter is where behaviour CSS
> is injected". **Verified false:** that filter has **zero subscribers**...
>
> **The real mechanism, and the real risk.** Header behaviours are resolved by
> \`Sgs_Header_Behaviours\`, which hooks **\`body_class\`**... [full mechanism paragraph]
>
> **Therefore:** the moment FR-37-6 empties \`parts/header.html\`, \`get_header_content()\` finds no
> \`sgs/site-header\` block, every behaviour flag resolves false, no body classes are emitted, and
> sticky / transparent / shrink stop working **with no error**...`
AFTER: `> **Header behaviours are resolved by \`Sgs_Header_Behaviours\`**, which hooks \`body_class\`
> (\`class-sgs-header-behaviours.php:81\`) and calls \`resolve_active_header_behaviour()\` (\`:143\`),
> which reads the header's block markup via \`SGS_Nav_Menu_Source::get_header_content()\` (\`:173\`).
> That function reads the \`wp_template_part\` post (\`class-sgs-nav-menu-source.php:397-399\`),
> falling back to \`parts/header.html\` (\`:410-412\`) — it knows nothing about the CPT. So the
> moment FR-37-6 empties \`parts/header.html\`, \`get_header_content()\` finds no \`sgs/site-header\`
> block, every behaviour flag resolves false, no body classes are emitted, and sticky /
> transparent / shrink stop working with no error (the D338 silent-failure class this spec
> exists to prevent). Note: \`apply_filters('sgs_header_rule_resolved', …)\` has zero
> subscribers — do not route new logic through it.`
NOTE:   Drops the "v1.0.0 said X, verified false" narration; keeps the mechanism, the consequence, and the one forward warning (don't use that dead filter hook).

### 37-HEADER-FOOTER-BUILDER.md:1898-1905  (K4, from 37-36.md)

BEFORE: `1. ~~**\`labelCollapse\`'s fate.**~~ **RESOLVED 2026-07-23 → §3.8: RETAINED.** Bean's rule was
   "keep it if it is an operator toggle, bin it if it is automatic"; code confirms it is a
   toggle (\`button/edit.js:347\`, \`business-info/edit.js:88\` — a \`SelectControl\` defaulting to
   \`'none'\`). The cascade it would have deferred to is Spec 35's and is NOT BUILT, so deleting
   first would strand the capability — and the two are not equivalent anyway (the cascade
   HIDES; \`labelCollapse\` COLLAPSES a label to icon-only while keeping the element and its
   link). Spec 36 FR-36-8/FR-36-23 amended in the same commit. Revisit if Spec 35 ships the
   cascade. Full reasoning in §3.8. *(Status corrected 2026-07-28, D400/D405: the cascade
   MECHANISM — canonical \`resolveTier()\` + tri-state control + scoped emission — is now BUILT
   and live-proven, \`b9c5f6d1\`/\`ac0c30eb\`/\`eb255f06\`; the §3.8 header-content-hiding FEATURE
   that would consume it remains open and is owned by this spec. D363's revisit condition is
   now ACTIONABLE whenever that feature ships.)*`
AFTER: `1. **\`labelCollapse\`'s fate — RESOLVED 2026-07-23, RETAINED.** Full reasoning in §3.8. The
   cascade mechanism it would have deferred to is BUILT (D400/D405); the §3.8 feature that
   would consume it to hide equivalent elements per device remains open — revisit
   \`labelCollapse\` against it whenever that feature ships.`
NOTE:   Same fact is stated in full at §3.8 (line ~372-394) and repeated near-verbatim here — keep §3.8 as canonical, collapse this copy to a one-line pointer.

### 36-SGS-NAVIGATION-SYSTEM.md:52-58  (K1, from 37-36.md)

BEFORE: `**AMENDED 2026-07-21 — this spec now ALSO owns the Site-Info data store.** The previous text read
*"the Site-Info option store remains Spec 17's — nav owns the rendering of Site-Info-driven pieces, not
the data store"*, and listed the data store under does-NOT-own. **Spec 17 has been deleted** (superseded by
Spec 37), so that disclaimer pointed at a document that no longer exists — leaving \`sgs_site_info\` with no
owner at all. The premise expired; the decision is therefore updated, not overruled.`
AFTER: `**This spec owns the Site-Info data store** (moved from the deleted Spec 17, 2026-07-21).`
NOTE:   Drops the quoted old disclaimer + the "premise expired, not overruled" narration; the "Now owned here: ..." sentence immediately after (kept as-is) already states the current ownership in full.

### 36-SGS-NAVIGATION-SYSTEM.md:76-79  (K1, from 37-36.md)

BEFORE: `**⛔ "Footer menus use the native WP core menu" is SUPERSEDED (2026-07-23).** That sentence stood
here and is now unbuildable: \`core/navigation\` was restored to the banned-core-block list on
2026-07-23 (\`sgs/nav-menu\` declares it in \`block-replacements.json\`), so a footer can no longer use
the core menu block at all. The ban had silently lapsed when \`sgs/adaptive-nav\` — the only block
declaring the replacement — was deleted at D362; restoring it closed a real hole, and closing it
invalidated this line. **Footer menus are now served by FR-36-26.**`
AFTER: `**Footer menus cannot use the native WP core menu** — \`core/navigation\` is on the banned-core-block
list (\`sgs/nav-menu\` declares it in \`block-replacements.json\`, restored 2026-07-23 after a gap
opened when \`sgs/adaptive-nav\` was deleted at D362). **Footer menus are served by FR-36-26.**`
NOTE:   Keeps the rule (core menu is banned) and its failure mode (the ban lapsed once before, via a deleted block); drops "That sentence stood here... invalidated this line" narration.

### 36-SGS-NAVIGATION-SYSTEM.md:1005  (K3, from 37-36.md)

BEFORE: `**⛔ THE PREVIOUS TEXT HERE WAS FALSE ON THREE COUNTS — do NOT act on it if you find it quoted
elsewhere.** It claimed (a) the FRONTEND worked "by construction", (b) that WP 7.0's iframed editor
canvas ignores this block's \`editor.css\`, and (c) prescribed a "PROVEN FIX (not yet landed): move the
preset rules into style.css". **All three were wrong.** \`b5f2ee02\` proves the two REAL causes, and they
broke BOTH surfaces: **(1) SELF-NESTED SELECTORS** ... **(2) BROKEN style-handle FILENAME** ... The same
block.json bug was swept from 4 other blocks in the same commit. **The iframe/editorStyle diagnosis is
RETRACTED** (also retracted in CC memory \`feedback_wp_iframe_canvas_ignores_editorstyle_use_style_css.md\`);
the prescribed style.css move addressed a cause that never existed and was never applied. Corrected
2026-07-27 after \`git show b5f2ee02\` contradicted this row.`
AFTER: `Two real causes broke BOTH the frontend and the editor canvas: **(1) self-nested selectors** —
render.php prepended \`$root_sel\` to \`$content_sel\`/\`$group_sel\`, which already began with
\`$root_sel\`, producing an impossible selector that matched nothing; **(2) broken style-handle
filename** — block.json named the source files (\`file:./style.css\`/\`file:./editor.css\`) while the
build emits \`style-index.css\`/\`index.css\`, so WP silently enqueued nothing on either surface. The
same block.json bug was swept from 4 other blocks in the same commit. An earlier "WP 7.0's iframed
editor canvas ignores this block's editor.css" diagnosis for this bug is FALSE — do not cite it;
full retraction in CC memory \`feedback_wp_iframe_canvas_ignores_editorstyle_use_style_css.md\`.`
NOTE:   K3 — the CC-memory mirror pointer MUST survive condensation; kept verbatim. Drops the "THE PREVIOUS TEXT HERE WAS FALSE... (a)(b)(c)... corrected 2026-07-27 after git show" narration.

### 37-HEADER-FOOTER-BUILDER.md:1688-1695  (K2, from 37-36.md)

BEFORE: `This requirement's own wording was wrong on one point, corrected here rather than glossed. It asked for a "per-device tri-state consistent with headerSticky/…". Those four are on/off booleans rendered by ResponsiveTriStateControl; contrastSafe is a FOUR-value enum. Pointing the tri-state control at it would store values the control cannot display and silently flatten the client's choice — the control primitive must match the STORAGE shape, not the neighbouring control. It therefore uses ResponsiveOverride ... "Consistent per-device model" is met; "tri-state" was the wrong shape and is not.`
AFTER: `contrastSafe is a FOUR-value enum, not a boolean — it uses ResponsiveOverride around the existing 4-option SelectControl, not ResponsiveTriStateControl. The control primitive must match the STORAGE shape, not the neighbouring control — pointing a tri-state control at an enum attribute would store values the control cannot display and silently flatten the client's choice.`
NOTE:   K2 meta-lesson — matches the captured CC-memory lesson feedback_a_control_primitive_must_match_its_storage_shape.md; keep the rule, drop the "wording was wrong, corrected here rather than glossed" framing.

### 37-HEADER-FOOTER-BUILDER.md:1790-1834  (K1, from 37-36.md)

BEFORE: `"Spec 33 Part 2" — ownership defect + the CORRECT build direction (recorded 2026-07-23) ... What this corrects. A 2026-07-23 progress summary claimed FR-36-15, FR-36-18 and FR-36-25 were "gated on Spec 33 Part 2". That was wrong in two of three cases and is struck here: FR-36-15 — the reverse. Its job is to DOCUMENT the architecture so Part 2 is easy later... FR-36-25 — not related to Part 2 at all... FR-36-18 — the cutover MECHANISM is already done (D361)...`
AFTER: `"Spec 33 Part 2" is the specialised header/footer CLONING pipeline — a separate, later consumer of this build's architecture, not this spec's own work and not a blocker on it. Only two items in Specs 36+37 genuinely wait on it: the branded-header sliver of FR-36-18, and FR-37-22. Everything else (including FR-36-15 and FR-36-25) is buildable now. Assigning Part 2 a single named owner is a prerequisite before any Part 2 work starts.`
NOTE:   Drops the quoted wrong 2026-07-23 progress-summary claim and the per-FR point-by-point refutation; keeps the resolution (which two items actually wait) and the forward rule (name an owner before starting Part 2).

### 36-SGS-NAVIGATION-SYSTEM.md:712-731  (K2, from 37-36.md)

BEFORE: `RETRACTED 2026-07-23 (same day) — the "conformance gap" recorded here NEVER EXISTED, and the fix written for it was a REGRESSION, now reverted. Do not re-apply it. What this note used to claim: that sgs/nav-menu emitted zero <nav> elements and passed navLabel to a roleless <div>, so the label "named nothing". Both premises were false. The block's root has ALWAYS been a <nav>... Verified at git show bb11cd1e^:…/nav-menu/render.php — lines 516 and 524. How the false diagnosis was reached: grep -c "<nav" nav-menu/render.php returns 0, because the <nav> is emitted by includes/class-sgs-container-wrapper.php — a different file the grep never read. This is STOP-A-GREP-PATTERN-THAT-CANNOT-MATCH-PROVES-NOTHING... What the "fix" actually did, measured live on the canary: added a SECOND <nav> nested inside the existing one ... and DELETED the outer one's aria-label... Reverted 2026-07-23 to one <nav> per instance carrying one label. Live-verified on /t1-nav/: navCount: 2 (bar + drawer, was 4), nested: false on both...`
AFTER: `sgs/nav-menu's root has always been a <nav> with navLabel on it (SGS_Container_Wrapper::render(..., array('tag' => 'nav', ...))). One <nav> per instance, one label — verified live on /t1-nav/ (navCount: 2, nested: false). A 2026-07-23 same-day fix that added a second nested <nav> was a REGRESSION and has been reverted — do not re-apply it. That fix was built on a false diagnosis reached via grep -c "<nav" nav-menu/render.php returning 0 — the <nav> tag is emitted from class-sgs-container-wrapper.php, a file the grep never read (STOP-A-GREP-PATTERN-THAT-CANNOT-MATCH-PROVES-NOTHING).`
NOTE:   K2 — the grep-blind-spot meta-lesson is exactly the highest-value, easiest-to-lose sentence type K2 flags; keep it. Drops the "what this note used to claim" / "both premises were false" blow-by-blow.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:51  (K4, from light.md)

BEFORE: "Specs 24 and 25 are superseded by this document. Do not edit them."
AFTER:  DELETE
NOTE:   Same fact ("Spec 24/25 superseded, do not edit") is restated at line 629 ("**Absorbs (retired):** Spec 24 ..., Spec 25 ... Do not edit those files.") with more detail (names the two specs' subject matter). Keep line 629 as canonical, cut this earlier bare duplicate.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:122  (K4, from light.md)

BEFORE: "| `_sgs_sku_matrix` (multi-SKU variable pricing) | SUPERSEDED - dropped; WC variations are the matrix; see principle 6 above | - | D144 (superseded) | FR-24-14, superseded by FR-27 |"
AFTER:  "| `_sgs_sku_matrix` (multi-SKU variable pricing) | SUPERSEDED — see principle 6 | - | D144 (superseded) | FR-24-14, superseded by FR-27 |"
NOTE:   One of 5 restatements of the same `_sgs_sku_matrix`-is-dropped fact (94/122/225/347/365/442). Canonical negative-control statement kept at line 225; this table cell's explanatory clause is redundant with it and is trimmed to a pointer.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:325  (K5, from light.md)

BEFORE: "> **⚠ SUPERSEDED FOR CLONING (2026-06-06):** The `sourceMode='bound'` converter path described below is a **TEST CHEAT** ... **ONLY the live WC configurator modes (`sourceMode='wc-product'` / `'sgs-cpt'`) are legitimate bound modes.** For cloning, `sgs/trust-bar` MUST be converted to **Typed mode** with a populated `items[]` array. The factual record below is preserved for historical context."
AFTER:  "> **RETIRED FOR CLONING (2026-06-06):** `sgs/trust-bar`'s Bound mode (converter emitting `sourceMode='bound'` by echoing badge InnerBlocks into `$content`) was a convert-not-mirror violation and was purged (`.claude/reports/2026-06-06-bound-mode-purge-plan.md`). Cloning now converts `sgs/trust-bar` to Typed mode with a populated `items[]` array. Live WC configurator modes (`wc-product`/`sgs-cpt`, `sgs/product-card`) are unrelated and unaffected."
NOTE:   Whole FR-24-10 section (lines ~323-335) is a tombstone for a purged mechanism, kept "for historical context" with the dead design (Bound-mode-for-cloning) still described in full below the banner. Collapse the section to this one paragraph; drop the detailed walkthrough of the dead design. Companion site: line 335.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:335  (K5, from light.md)

BEFORE: "Status: SHIPPED (commit `d6358f32`, 2026-06-01). `render.php` branches on the explicit `sourceMode` (typed = curated repeater / bound = converter's badge InnerBlocks); ~~converter sets `sourceMode='bound'` on cloned trust-bars~~ — **the bound-emit converter path is a cheat; see superseding note above.**"
AFTER:  "Status: Typed-mode-only for cloning (bound-emit converter path purged — see the retirement note above). `render.php` still branches on `sourceMode` for the live WC configurator, but the converter never emits `sourceMode='bound'`."
NOTE:   Second half of the same FR-24-10 tombstone as line 325 — collapse together, one replacement paragraph covers both sites.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:347  (K4, from light.md)

BEFORE: "**FR-24-14 -- Phase-1 slot-conflict priority.** First type wins; SKU matrix deferred. `_sgs_sku_matrix` is superseded entirely for WC products (see principle 6). For CPT-only (no-WC) products, multi-variant pricing remains a Phase-2 candidate but the `_sgs_sku_matrix` key is removed from the data model."
AFTER:  "**FR-24-14 -- Phase-1 slot-conflict priority.** First type wins. For CPT-only (no-WC) products, multi-variant pricing remains a Phase-2 candidate, but the `_sgs_sku_matrix` key is removed from the data model (WC products: see principle 6)."
NOTE:   Part of the 5x `_sgs_sku_matrix` restatement (94/122/225/347/365/442). Keeps the unique CPT-only Phase-2 clause, drops the redundant re-explanation of the WC-side supersession already stated at line 225.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:365  (K4, from light.md)

BEFORE: "2. SKU matrix deferred and now superseded for WC products."
AFTER:  "2. SKU matrix — superseded for WC products (see principle 6 / line 225)."
NOTE:   Part of the 5x `_sgs_sku_matrix` restatement; D144 ratified-decisions list item shortened to a pointer rather than re-explaining.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:442  (K4, from light.md)

BEFORE: "- Rebuilding WC cart/checkout/payments/tax/shipping; mirroring WC commerce data; a combinatorial `_sgs_sku_matrix` in custom meta (superseded); per-instance content migration (clean slate)."
AFTER:  "- Rebuilding WC cart/checkout/payments/tax/shipping; mirroring WC commerce data; a combinatorial `_sgs_sku_matrix` in custom meta; per-instance content migration (clean slate)."
NOTE:   Part of the 5x `_sgs_sku_matrix` restatement. Non-goals list already conveys "not building this" — the "(superseded)" tag is redundant with line 225 and is dropped.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:448  (K1, from light.md)

BEFORE: "**WC authoritative; SGS holds a seeded read-through CACHE reconciled server-side (reframed 2026-06-03 per the adversarial-council).** ... The old slogan \"never mirrored\" made maintainers under-build freshness; the correct framing is \"WC is authoritative; SGS reconciles its seeded cache against WC on every render + at add-to-cart\"."
AFTER:  "**WC authoritative; SGS holds a seeded read-through CACHE reconciled server-side.** No DURABLE custom store of WC commerce data (presentation/config only in term meta / variation postmeta / block attributes). The SSR-seeded manifest (per-variation price/sale/stock literals in `data-wp-context`) IS a short-lived read-through cache — the freshness defence is the render-time `get_date_modified()` staleness guard (FR-27-G6), not an assumption that nothing can go stale."
NOTE:   Rejected-approach-plus-why (K1): drops the "old slogan ... made maintainers under-build freshness" narration, keeps the corrected framing and the FR-27-G6 rule it drives.

### 18-SGS-FLOATING-UI.md:28  (K4, from light.md)

BEFORE: "Phase 5b (commit `60220b13` + paint-fix `0ef032fe`) shipped ~~`Sgs_Header_Customiser` + `Sgs_Footer_Customiser`~~ (RETRACTED — never existed) + `Sgs_Site_Info_Customiser` as direct structural clones of `Sgs_Floating_UI_Customiser`."
AFTER:  "Phase 5b (commit `60220b13` + paint-fix `0ef032fe`) shipped `Sgs_Site_Info_Customiser` as a direct structural clone of `Sgs_Floating_UI_Customiser`."
NOTE:   Same fact ("`Sgs_Header_Customiser`/`Sgs_Footer_Customiser` never existed") is stated in full at the line-26 banner (kept, not itself a grep hit) and restated here and at line 236. Drop the fake class names from this sentence — leaving them struck mid-sentence makes it "half-true" per dispatch guidance.

### 18-SGS-FLOATING-UI.md:236  (K4, from light.md)

BEFORE: "| Spec 36 §Customiser migration (formerly Spec 17) | ~~`Sgs_Header_Customiser`, `Sgs_Footer_Customiser`~~ (RETRACTED 2026-07-16 — never existed) + `Sgs_Site_Info_Customiser` | `postMessage` transport, `wp_options` backing, capability gate, sanitiser pattern |"
AFTER:  "| Spec 36 §Customiser migration (formerly Spec 17) | `Sgs_Site_Info_Customiser` | `postMessage` transport, `wp_options` backing, capability gate, sanitiser pattern |"
NOTE:   Third restatement of the same never-existed-classes fact (banner at 26, sentence at 28). Table cell simplifies to the real class only.

### 19-SGS-CLI-COMMANDS.md:350  (K5, from light.md)

BEFORE: "### 4.14 `wp sgs theme-mod restore` (RETIRED 2026-05-21 — see `.claude/plans/2026-05-21-architecture-staging.md` §6.6)\n\n`wp sgs theme-mod restore` and `Sgs_Variation_Picker` are DELETED by Decision 18. The WP style-variation system is removed; there is no legacy `active_theme_style` theme_mod to restore. Per-site branding is managed via `push-theme-snapshot.py` (see §7 below)."
AFTER:  "| Command / class | Retired | Reason | Replacement |\n|---|---|---|---|\n| `wp sgs theme-mod restore` / `Sgs_Variation_Picker` | 2026-05-21 (Decision 18) | WP style-variation system deleted; no legacy `active_theme_style` theme_mod to restore | `push-theme-snapshot.py` (§7) |\n| `Sgs_Variation_REST` (`sgs/v1/active-variation`) | 2026-05-21 (Decision 18) | variation system deleted | Stage 10 of `/sgs-clone` calls `push-theme-snapshot.py` |"
NOTE:   K5 tombstone section. Collapse this and the FR-27-style paragraph at line 419 (a different retired mechanism, same Decision 18 cause) into one small retired-commands table.

### 19-SGS-CLI-COMMANDS.md:419  (K5, from light.md)

BEFORE: "**Sgs_Variation_REST** (commit `8ceb8787`): REST surface at `sgs/v1/active-variation` (POST + GET; `manage_options` gated) — **RETIRED 2026-05-21 (Decision 18)**. The variation system is deleted. This endpoint is no longer needed; Stage 10 of `/sgs-clone` now calls `push-theme-snapshot.py` instead."
AFTER:  DELETE
NOTE:   Folded into the single retired-commands table proposed at line 350.

## Counts
IN SCOPE: 2   (CUT: 0, CONDENSE: 2)
ESCALATE: 0
EXCLUDE:  5

---

# 00-naming-conventions.md

### 26-SGS-GLOBAL-STYLES-AND-THEMING.md:157  (K1, from light.md)

BEFORE: "**FR-26-D1 — Canary contamination — RESOLVED / MOOT (verified 2026-06-03, do NOT clear post 7).** The council's recommendation was \"clear `wp_global_styles` post 7 so `theme.json` renders.\" **Verification inverted that:** the canary's `theme.json` already carries Mama's FULL brand palette (`theme:primary`, `theme:surface-pink`, `theme:accent`, …) AND the WCAG CSS (len ~2273), and post 7 MIRRORS the same tokens — because this session's Mama's WCAG work (D157-adjacent) wrote BOTH layers, which synced them. So the canary already renders Mama's brand correctly from both layers; the colour-contamination the council feared was real *before* this session but is **already resolved**. **Clearing post 7 is therefore unnecessary AND risky** (no render benefit; the canary is shared with the cloning thread) — do NOT do it. The cloning pixel-diff is NOT colour-contaminated currently."
AFTER:  "**FR-26-D1 — Canary contamination — RESOLVED/MOOT (verified 2026-06-03). Do NOT clear `wp_global_styles` post 7** — its tokens already match `theme.json` (Mama's brand palette + WCAG CSS byte-for-byte), so clearing would lose the render with no benefit; the cloning pixel-diff is not colour-contaminated. This sync is coincidental (both layers were hand-written the same session) and will RE-DIVERGE on the next `push-theme-snapshot` or Site-Editor edit — FR-26-D2 is the durable fix."
NOTE:   Rejected-recommendation-plus-why (K1): drops the "council recommended X, verification inverted that" narrative walkthrough, keeps the live "do NOT clear post 7" instruction and the residual-risk pointer to FR-26-D2 (load-bearing — explains why this isn't fully closed).

### 28-SGS-SMART-BULK-PRICING.md:145-166  (K5, from missed-03-28.md)

BEFORE: "## Council must-fix register (PROVENANCE — all folded into v2 FRs above)  /  > **Status: all 15 folded into the v2 FRs.** This register is retained for provenance only. Resolution map: #1→FR-28-13 · #2→FR-28-14 · #3→FR-28-10 (two-step apply) · … [followed by all 15 items retained at full length, lines 149-166]"
AFTER: "## Council must-fix register — CLOSED\n\nAll 15 must-fix items from the v1 `/adversarial-council` are folded into the v2 FRs. Resolution map: #1→FR-28-13 · #2→FR-28-14 · #3→FR-28-10 · #4→FR-28-2/5/12 · #5→FR-28-1/2 (+ the worked example below) · #6→FR-28-4 · #7→FR-28-3 · #8→FR-28-6 · #9→USP/Principle 1 · #10→FR-28-8 · #11→FR-28-5/7 · #12→FR-28-9 · #13→FR-28-5/10 · #14→FR-28-11 · #15→FR-28-12.\n\nTwo rationales that live ONLY here and are not restated in any FR, so they survive the collapse:\n- **The moat is not the engine (item 9).** The formula is commodity — five plugins already do quantity discounts and the 12-line formula clones by lunch. The defensible asset is the surrounding system, not the maths.\n- **P is the owner-entered single-item price (item 10)**, stored `_sgs_base_price_pence`, labelled to the client as \"your reference price for discounts\"."
NOTE:   ⚠ TWO CAUTIONS FOR THE APPLIER. (1) The resolution map above must be copied VERBATIM from line 147 — the FR targets in this AFTER text beyond #5 are reconstructed and MUST be verified against the real line before applying. (2) Line 167's heading reads "## Corrected worked example (must-fix #5)" and cites the item numbering, so the numbered map must stay findable or that heading needs updating in the same edit — deleting the register outright leaves a dangling citation.


---

# CUT (87)

### 02-SGS-BLOCKS.md:1429
RULE: CONDENSE (K1)
BEFORE: "These bring sgs/icon to parity with the converter's emit needs for icon slots within `sgs/trust-bar` Bound mode and `sgs/info-box` icon areas."
AFTER:  "These bring sgs/icon to parity with the converter's emit needs for icon slots within `sgs/trust-bar` and `sgs/info-box` icon areas."
NOTE:   Same "Bound mode" fossil as the L302-308 site above — trust-bar has no modes at all any more (typed-only). Low-stakes wording fix, bundled with the trust-bar dual-mode finding above for one coherent fix.

### 02-SGS-BLOCKS.md:69 / 02-SGS-BLOCKS.md:71  (C4, from 02-01-11.md)

BEFORE:
- L69: "│   │   # certification-bar/ — RETIRED 2026-05-29 D95, merged into trust-bar (badgeStyle variants)"
- L71: "│   │   # announcement-bar/ — RETIRED D209 (2026-06-11). Use notice-banner displayMode=announcement instead."
AFTER:  DELETE (both lines)
NOTE:   Ghost `#`-comment rows for deleted block directories inside the ASCII `src/blocks/` file tree — the directories themselves no longer exist (§15/§17 tombstones already record the retirement). Pure C4.

### 01-SGS-THEME.md:153-156 (ASCII tree ghost comments)  (C4, from 02-01-11.md)

BEFORE: "└── styles/                         # EMPTIED (RETIRED 2026-05-21 — see §Per-site theme.json model)\n    #                               # Per-client variation files deleted by Decision 18.\n    #                               # Per-client snapshots now live at sites/<client>/theme-snapshot.json\n    #                               # and are pushed to specific sites via push-theme-snapshot.py."
AFTER:  "└── styles/                         # EMPTIED (RETIRED 2026-05-21 — see §Per-site theme.json model)"
NOTE:   Keep the one-line dir annotation (it's accurate and useful: the directory exists but is empty). Delete the three trailing `#` ghost-comment lines explaining the deleted per-client files that no longer live there — pure C4, and the same fact is stated properly in prose at §Style Variations (see K4 below).

### 11-SGS-BUTTON-ARCHITECTURE.md:93 / 96-101 (Three editing paths table)  (C3, from 02-01-11.md)

BEFORE: "### Three editing paths — REVISED by Decision 22 (2026-05-21)\n\n> Per `.claude/plans/2026-05-21-architecture-staging.md` §6.3 — Decision 22.\n\n| Path | Audience | UX | Status |\n|------|----------|-----|--------|\n| **Settings → SGS Button Presets admin page** (was primary) | Site owners | Admin form, ~30 seconds to set up | **DELETED by Decision 22** — see below |\n| **Site Editor → Styles → Buttons** (new primary) | Site owners + power users | Native WP UI, live preview, full pseudo-element support in WP 7.0 | **New canonical path** |\n| **`sites/<client>/theme-snapshot.json`** | Developers shipping a new client | Code-first, version-controlled, per-site push CLI | **Replaces** `theme/sgs-theme/styles/<client>.json` (retired by Decision 18/19) |"
AFTER:  "### Two editing paths (Decision 22, 2026-05-21)\n\n| Path | Audience | UX |\n|------|----------|-----|\n| **Site Editor → Styles → Buttons** | Site owners + power users | Native WP UI, live preview, full pseudo-element support in WP 7.0 |\n| **`sites/<client>/theme-snapshot.json`** | Developers shipping a new client | Code-first, version-controlled, per-site push CLI (replaces the old `theme/sgs-theme/styles/<client>.json`, retired by Decision 18/19) |\n\nThe former **Settings → SGS Button Presets admin page** path was deleted by Decision 22 (Phase 5b, commit `60220b13`, 2026-05-22) — `class-button-presets-admin.php` no longer exists (confirmed on disk)."
NOTE:   **This is the confirmed miss the coordinator flagged.** Dead table row ("Settings → SGS Button Presets admin page") kept at full length with a "DELETED by Decision 22 — see below" note bolted on, instead of being removed — textbook C3 (struck TODO/gap + RESOLVED, rewrite as one present-tense statement). The admin page's absence is verified on disk. Bundled the heading (L93, "REVISED by Decision 22") into the same site since it only makes sense attached to this table.

### 11-SGS-BUTTON-ARCHITECTURE.md:210 (P1.C phase-table row)  (C3, from 02-01-11.md)

BEFORE: "| P1.C | Build button-presets settings page (`class-button-presets-admin.php`) | 1–1.5h | None — independent | SHIPPED 2026-05-04 — **PENDING DELETION by Decision 22 in Phase 5b** |"
AFTER:  "| P1.C | Build button-presets settings page (`class-button-presets-admin.php`) | 1–1.5h | None — independent | SHIPPED 2026-05-04 — **DELETED per Decision 22** (Phase 5b, commit `60220b13`, 2026-05-22) |"
NOTE:   "PENDING DELETION" is now stale — L9's own changelog confirms Phase 5b shipped 2026-05-22 and the file is gone from disk. Same underlying fact as the L99 table fix above; kept as a separate row because it's a different table.

### 11-SGS-BUTTON-ARCHITECTURE.md:214 (P5 phase-table row)  (C3, from 02-01-11.md)

BEFORE: "| P5 (new) | Decision 22 — Move values to theme.json native; delete admin page + wp_options bridge; verify WP 7.0 coverage gate | ~45min | Phase 5b of architecture-staging.md | PENDING |"
AFTER:  "| P5 | Decision 22 — Move values to theme.json native; delete admin page + wp_options bridge; verify WP 7.0 coverage gate | ~45min | Phase 5b of architecture-staging.md | SHIPPED 2026-05-22 (commit `60220b13`) |"
NOTE:   Status column says "PENDING" but L9's own changelog (Session B, 2026-05-22) confirms this exact Phase 5b work shipped — stale status cell, same root fact as L9/L99/L210.

## Counts (final — recomputed by counting ^RULE: rows in this file, per spec)

# Spec 02
IN SCOPE: 7   (CUT: 1, CONDENSE: 6)
ESCALATE: 1
EXCLUDE:  20
(total rows: 28)

# Spec 01
IN SCOPE: 3   (CUT: 1, CONDENSE: 2)
ESCALATE: 0
EXCLUDE:  7
(total rows: 10)

# Spec 11
IN SCOPE: 4   (CUT: 3, CONDENSE: 1)
ESCALATE: 1
EXCLUDE:  8
(total rows: 13)

# File total
IN SCOPE: 14  (CUT: 5, CONDENSE: 9)
ESCALATE: 2
EXCLUDE:  35
TOTAL ^RULE: ROWS: 51  (14 + 2 + 35 = 51 — confirmed via `grep -c '^RULE:'`, matches `grep -c '^### '`)

### 31-UNIVERSAL-CLONING-PIPELINE.md:42  (C5, from 31.md)

BEFORE: "The historical title \"CSS-Transfer\" predates the content-unification correction; read it as \"Content + CSS Transfer.\""
AFTER: "> **Scope (D246):** ALL draft→block transfer through the one container dispatch — content (text/media/array/child-block) AND CSS — not CSS alone. Read the section title \"CSS-Transfer\" as \"Content + CSS Transfer.\""

### 31-UNIVERSAL-CLONING-PIPELINE.md:227  (C5, from 31.md)

BEFORE: "**A1 — RESOLVED (fact-checked against the running scripts 2026-07-04; the earlier \"no loader/driver\" claim was STALE and misled the rebuild scope):** the engine IS pipeline-wired (D252) and media resolution is LIVE end-to-end. ... The separate test-only file loader `converter/services/media_map.py` (never called at runtime — its stale docstring was the source of the wrong claim) was DELETED 2026-07-04."
AFTER: "Media resolution is LIVE end-to-end: the engine is pipeline-wired (D252) and the orchestrator loads the media-map JSON itself (`sgs-clone-orchestrator.py:1424-1428`), threading the dict through `convert_section` → `build_block_markup` → `extract_content` → `extract_field_value` → `resolve_media_url` (`converter/services/lift_helpers.py:133-168`), so image srcs ARE remapped to uploaded WP URLs."

### 31-UNIVERSAL-CLONING-PIPELINE.md:258  (C5, from 31.md)

BEFORE: "The historical \"returns the FIRST DB-rowid match\" description below is retained for context only. *(Historical: `attr_for_layer_property` returned the FIRST DB-rowid match, insert-order-fragile if a block declared both.)*"
AFTER: "3. **Disambiguate** where one css_property maps to multiple suffixes (the completeness audit's bite-list). **MF-4 mechanism reconciliation (council RISK 3, MED) — CLOSED (Front 1, 2026-07-21 `7a6a7586`):** `attr_for_layer_property` no longer rowid-picks; when ≥2 candidate attrs exist for one (block, layer, property) it raises `AmbiguousLayerAttrError`/`AmbiguousCssPropAttrError` (`db_lookup.py:3195-3380`), and the base-resolver-domain columns (`css_element`/`css_state`/`css_tier`) are the disambiguation key."

### 31-UNIVERSAL-CLONING-PIPELINE.md:261  (C2, from 31.md)

BEFORE: "genuinely unbuilt; resolve by querying `block_attributes` for the shadow attr the target block actually declares ... **STATUS (D250, 2026-06-30): NOW BUILT.** `converter/resolvers/outer_box.py` resolves `box-shadow` → the block's `shadow` attr ... The \"genuinely unbuilt\" claim is no longer accurate."
AFTER: "`box-shadow` → `Shadow`(role=color) vs `BoxShadow`(role=visual): `converter/resolvers/outer_box.py` resolves `box-shadow` → the block's `shadow` attr (DB-first: Shadow row wins over BoxShadow by rowid) via a token-snap to `design_tokens` shadow presets (sm/md/lg/glow); a raw box-shadow with no matching preset emits an honest `NO_DESTINATION` gap."

### 31-UNIVERSAL-CLONING-PIPELINE.md:295  (C5, from 31.md)

BEFORE: "**Corrected 2026-07-14: there is no separate `box_side` DB column** (verified against the live schema — `block_attributes` has `box_family` only, no `box_side`)."
AFTER: "There is no separate `box_side` DB column — `block_attributes` has `box_family` only. Per-side/per-corner identity (top/right/bottom/left or the 4 corners) is tracked via the ATTR-NAME convention on the flat attr being migrated away FROM, read alongside `box_family`."
NOTE: Kept the closing anti-regression rule ("Any per-side/per-corner grouping or migration operation MUST query `box_family`, never a name regex — enforced by a static AST collision gate") verbatim per K3.

### 31-UNIVERSAL-CLONING-PIPELINE.md:301  (C5, from 31.md)

BEFORE: "**ORPHANED (corrected, MEASURED 2026-08-01 — this row was stale).**"
AFTER: "| `block_selectors.(element, selector)` | ORPHANED — zero `SELECT ... FROM block_selectors` anywhere in `converter/`; the only references are two comments in `db_lookup.py` (~L3582, L3760-3764) naming it as the *intended, unbuilt* fix for a future `AmbiguousLayerAttrError`/`AmbiguousCssPropAttrError` tie. The LIVE OUTER/CONTENT/typography layer disambiguation (step 3 max-width 3-way) is `block_attributes.css_element`/`css_state`/`css_tier` (§3.A step 3, MF-4 — CLOSED Front 1, `7a6a7586`), not this table. Row/block count is DB-authoritative — query `/sgs-db`, never cache it here. |"

### 31-UNIVERSAL-CLONING-PIPELINE.md:357  (C3, from 31.md)

BEFORE: "~~*(HOLE 5 — gate exists but enforces nothing.)*~~ **CORRECTION (D238, `2341e761`):** WIRED — `check_no_mirror.py` auto-runs post-clone via the orchestrator (after `stage_9_report()`, pre-deploy) and HARD-HALTS on a NEW mirror violation; 13 legacy violations grandfathered via baseline. A commit-time static `sourceMode='bound'` AST tripwire (`scripts/cheat-gate/check_bound_emit.py`) was added D241. HOLE 5 CLOSED."
AFTER: "5. **Mirror-emit / `sourceMode='bound'` / BEM-element className — gate WIRED (D238, `2341e761`).** `check_no_mirror.py` auto-runs post-clone via the orchestrator (after `stage_9_report()`, pre-deploy) and HARD-HALTS on a NEW mirror violation; 13 legacy violations grandfathered via baseline. A commit-time static `sourceMode='bound'` AST tripwire (`scripts/cheat-gate/check_bound_emit.py`) was added D241."

### 31-UNIVERSAL-CLONING-PIPELINE.md:383  (C3, from 31.md)

BEFORE: "**RESOLVED for the OUTER box via the D230/D231 architectural width-model upgrade (SHIPPED 2026-06-18):** OUTER `max-width` → `maxWidth` literal (exact) or `align:\"full\"`; `widthMode`/`customWidth` retired. L2 band → `contentWidth` (token/literal). This is a genuine universal architectural primitive (not a spot-fix); the clean rebuild ADOPTS it as a per-resolver module rather than redoing it."
AFTER: "| **D** dropped max-width | §3 step 3 — max-width by layer. RESOLVED for the OUTER box via the D230/D231 width-model upgrade (SHIPPED 2026-06-18): OUTER `max-width` → `maxWidth` literal (exact) or `align:\"full\"`; `widthMode`/`customWidth` retired. L2 band → `contentWidth` (token/literal). |"

### 31-UNIVERSAL-CLONING-PIPELINE.md:408  (C3, from 31.md)

BEFORE: "Disambiguation: `attr_for_layer_property` uses rowid-first-match, NOT `block_selectors.element` as claimed — build must make element the key OR fail-loud on ≥2 candidates (§3 step 3). **CLOSED (Front 1, 2026-07-21 `7a6a7586`): the fail-loud half is SHIPPED ... No longer an open MUST.**"
AFTER: "| MF-4 | Rater 2 RISK 3 (MED) | CLOSED (Front 1, 2026-07-21 `7a6a7586`): `AmbiguousLayerAttrError`/`AmbiguousCssPropAttrError` raise on ≥2 candidates (`db_lookup.py:3195-3380`); the base-resolver-domain keys (`css_element`/`css_state`/`css_tier`) are the disambiguation key. |"

### 31-UNIVERSAL-CLONING-PIPELINE.md:451  (C3, from 31.md)

BEFORE: "~~stale `has_inner_blocks` → derive at convert-time from save.js~~ SUPERSEDED by FR-31-2.6 `emit_shape` (source-derived seeder; readers migrate EXECUTION Step 8)"
AFTER: "`has_inner_blocks` handling SUPERSEDED by FR-31-2.6 `emit_shape` (source-derived seeder; readers migrated EXECUTION Step 8)"

### 31-UNIVERSAL-CLONING-PIPELINE.md:536  (C3, from 31.md)

BEFORE: "| Pseudo-elements `::before`/`::after` never collected | **Stage 4b** (cascade resolver) | ~~fix the `::`-as-media-separator parse~~ PARSE FIXED 2026-07-04 (`3d7e7d42` + regression tests); the remaining work is the LIFT destination (uid-scoped passthrough or EXCLUDED-with-reason) — EXECUTION Step 13 |"
AFTER: "| Pseudo-elements `::before`/`::after` never collected | **Stage 4b** (cascade resolver) | PARSE FIXED 2026-07-04 (`3d7e7d42` + regression tests); remaining work is the LIFT destination (uid-scoped passthrough or EXCLUDED-with-reason) — EXECUTION Step 13 |"

### 32-COMPONENT-STYLING-TOKEN-CONTRACT.md:277-287 (family roster table, struck counts)  (C2, from 32-38.md)

BEFORE: "| ... | `padding{side}` | ~~9~~ **39** | ... | ... | `margin{side}` | ~~8~~ **41** | ... | ... | `contentBandPadding{side}` | ~~4~~ **7** | ... | ... | `borderRadius{TL,TR,BL,BR}` | ~~5~~ **11** | ..."
AFTER:  Table cells read `39`, `41`, `7`, `11` respectively — drop every `~~old~~` strike, keep only the current figure.
NOTE:

### 32-COMPONENT-STYLING-TOKEN-CONTRACT.md:425-428 (Open Questions staleness narration)  (C5, from 32-38.md)

BEFORE: "⚠ **These sat marked \"open\" with a `Due: Phase 1/Phase 2` long after both phases closed. Every one was in fact resolved by the implementation; the table was never updated.** Verified directly against the tree, not inferred from prose."
AFTER:  DELETE (the answers table immediately below is already the current, correct content and needs no framing narration).
NOTE:

### 38-SGS-MOTION-SYSTEM.md:228 (image-sequence block-exists correction)  (C3, from 32-38.md)

BEFORE: "**The block itself exists** (`src/blocks/image-sequence/`, agency-only, hidden from the inserter) — `scripts/generate-fx-qualifying-blocks.py`'s `EXACT_MATCH_BLOCKS` table carried a stale comment claiming the directory didn't exist yet; corrected 2026-08-02 (register item 4) to the real roster `{\"sgs/image-sequence\"}`."
AFTER:  "The block itself exists (`src/blocks/image-sequence/`, agency-only, hidden from the inserter), matching `generate-fx-qualifying-blocks.py`'s `EXACT_MATCH_BLOCKS` roster `{\"sgs/image-sequence\"}`."
NOTE:

### 38-SGS-MOTION-SYSTEM.md:925 (bundle-size table)  (C2, from 32-38.md)

BEFORE: "| ~~ScrollSmoother~~ → **Lenis** (Tier H, D422) | **5,777 bytes gzip (~5.6 KiB) — MEASURED, not an estimate** ..."
AFTER:  "| **Lenis** (Tier H, D422) | 5,777 bytes gzip (~5.6 KiB) — MEASURED, not an estimate ..."
NOTE:

### 38-SGS-MOTION-SYSTEM.md:1233 (MotionPath reduced-motion row, superseded wording)  (C5, from 32-38.md)

BEFORE: "MotionPath | **Suppress:** rests at the client-chosen resting position (D441, 2026-08-01 — CSS applies `--sgs-fx-motion-path-rest-y` unconditionally under `prefers-reduced-motion: reduce`, the same custom property the normal-motion handoff uses; superseded the earlier \"matches existing decorative-image reduced-motion arm\" wording, which predated the resting-position control and meant \"wherever the server rendered it\")"
AFTER:  "MotionPath | **Suppress:** rests at the client-chosen resting position (D441 — CSS applies `--sgs-fx-motion-path-rest-y` unconditionally under `prefers-reduced-motion: reduce`, the same custom property the normal-motion handoff uses)"
NOTE:

### 38-SGS-MOTION-SYSTEM.md:1373  (C3, from 32-38.md)

BEFORE: "> **Status: BUILT + SHIPPED — CORRECTED 2026-08-02 (register item 2).** The line above (\"DESIGN SIGNED, NOT YET BUILT\") is stale and was false when re-checked this session."
AFTER:  "**Status: BUILT + SHIPPED (2026-08-02).**"
NOTE:   Part of the morph/motion-path status-correction site (1373/1374 together).

### 38-SGS-MOTION-SYSTEM.md:1374  (C3, from 32-38.md)

BEFORE: "All five owed items exist:"
AFTER:  "All five owed items exist: the preset data files (`includes/fx-path-routes.json`, `includes/fx-shape-routes.json`), the render-layer expansion (`includes/fx-path-routes.php`, `includes/fx-shape-routes.php`), the `block_attributes` rows under `fx:*` (seeded in `scripts/seed-motion-fx-registry.py`), the thumbnail pickers in the fx panel, and both `motion-path` and `morph` present in `SHIPPED_EFFECTS`."
NOTE:   Same site as 1373 — the surviving list of what shipped.

### 38-SGS-MOTION-SYSTEM.md:1449 (Spec 02 cross-reference, stale parallax line)  (C2, from 32-38.md)

BEFORE: "**Spec 02 §Animation** — the Tier V baseline this spec bounds (its performance budget unchanged; its \"sgsParallax pending\" line is stale — parallax shipped)."
AFTER:  "**Spec 02 §Animation** — the Tier V baseline this spec bounds (its performance budget unchanged; parallax shipped)."
NOTE:

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:48-52  (C5, from 35.md)

BEFORE: "**The ruling and the code were two separate events, same day:** `SgsColourPanel.js` had no `group`
prop at all until commit `a5b74bd1` (2026-08-15) — a prior status summary had already called D621
"shipped" before that fix landed. Genuinely shipped as of `a5b74bd1`; see Part M's dated entry for
the same date for the lesson this earned."
AFTER: "**Genuinely shipped as of `a5b74bd1` (2026-08-15)** — `SgsColourPanel.js` had no `group` prop
until that commit. See Part M's dated entry for the same date for the lesson this earned."
NOTE: Drops the narration of an earlier status summary being wrong; keeps the verified-shipped fact and the pointer to the retained lesson.

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:173-176  (C3, from 35.md)

BEFORE: "~~**decorative-image toggle** (empty alt +
`aria-hidden`) — gap, cheap, WCAG~~ ✅ **BUILT — corrected 2026-08-17**: `imageIsDecorative`
(`media/block.json:293`) is declared and genuinely wired to render — `media/render.php:606` sets
`aria-hidden="true"` from it."
AFTER: "**Decorative-image toggle** (empty alt + `aria-hidden`) — BUILT: `imageIsDecorative`
(`media/block.json:293`) is declared and wired to render — `media/render.php:606` sets
`aria-hidden="true"` from it."
NOTE: none

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:179-181  (C3, from 35.md)

BEFORE: "~~**general ARIA-label control** for icon-only
buttons — gap~~ ✅ **PARTLY BUILT — corrected 2026-08-17**: `ariaLabel` is declared on both
`button/block.json:395` and `icon/block.json:175` — the two blocks that actually render icon-only
triggers."
AFTER: "**General ARIA-label control** for icon-only buttons — PARTLY BUILT: `ariaLabel` is declared
on both `button/block.json:395` and `icon/block.json:175` — the two blocks that actually render
icon-only triggers."
NOTE: none

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:235-242  (C3, from 35.md)

BEFORE: "**✅ RESOLVED (verified 2026-07-30): `headerSticky`/`headerTransparent`/`headerShrink`/
`headerHideOnScroll` are no longer flat `boolean`s.** They are now `{"type":"object",
"default":{}}` at `site-header/block.json:142-157` (line numbers shifted since this passage
was written). **Spec 37 FR-37-14** (behaviour tri-state) consumed the canonical
`resolveTier()` cascade and is built and live-proven — see the BUILD STATUS block below and
Part M, which already record this as shipped. The former blocking relationship ("Spec 37
Group-B items cannot be built until this ships") is historical: the cascade shipped same-day
(2026-07-28) and FR-37-14 now depends on it successfully, it is not still waiting on it."
AFTER: "`headerSticky`/`headerTransparent`/`headerShrink`/`headerHideOnScroll` are
`{"type":"object","default":{}}` (`site-header/block.json:142-157`). Spec 37 FR-37-14 (behaviour
tri-state) consumed the canonical `resolveTier()` cascade and is built and live-proven — see Part M."
NOTE: Drops the self-historiography about line numbers shifting and the former blocking relationship; keeps the current shape + the forward pointer.

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:608-609  (C5, from 35.md)

BEFORE: "**Net: all three of F.2.1/F.2.2/F.2.3 are locked and buildable as specced — step 7 has no
remaining design blocker.**"
AFTER: "**Net: F.2.1 and F.2.3 shipped as specced (D639); F.2.2 (`gridAreas`) was retired instead of
built — see the BUILD STATUS box above (line 397).**"
NOTE: This line pre-dates the D639 findings above it in the file and is now contradicted by them — it claims F.2.2 is "buildable as specced" when the box above says it was deleted, not built. Not an ESCALATE: the box above is unambiguously the later, more authoritative correction (same D639), so this is a stale trailing statement to fix in place, not a genuine unresolved conflict.

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:738  (C3, from 35.md)

BEFORE: "~~**Residual: `sgs/quote`'s `boxShadow`/`boxShadowHover` still on the raw CSS
`TextControl`**~~ — ✅ **CLOSED 2026-08-16 (D634), this row was stale until the 2026-08-17 completion
audit.** `sgs/quote` was migrated onto the same shape as the other 11 blocks: `ShadowControl` for
shape + flat sibling `boxShadowColour`/`boxShadowHoverColour` surfaced in `SgsColourPanel`, composed
via `sgs_shadow_value_composed()`, with `card-grid` used as the reference implementation exactly as
this row predicted. Verified live: `quote/block.json` declares both colour attrs and `quote/edit.js`
mounts `ShadowControl`."
AFTER: "`sgs/quote` migrated onto the same shape as the other 11 blocks (D634): `ShadowControl` for
shape + flat sibling `boxShadowColour`/`boxShadowHoverColour` surfaced in `SgsColourPanel`, composed
via `sgs_shadow_value_composed()`, `card-grid` as the reference implementation. Verified live:
`quote/block.json` declares both colour attrs, `quote/edit.js` mounts `ShadowControl`."
NOTE: none

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:741  (C5, from 35.md)

BEFORE: "✅ **FIXED 2026-08-11, later session (D585).** The 2026-08-11 correction below (kept for the
record) found the control functionally reached 2 of 15 declaring blocks via a guessed-root
injection. Census + fix shipped same day: ... ⛔ **2026-08-11, earlier same day — the correction that
found this:** this row previously read "BUILT … DONE (Wave 2)" and was FALSE — the extension
injected `sgs-has-image-controls` on the block ROOT and the CSS then guessed where the image was
(`> img`, `figure > img`), matching only by accident. Original false claim: (`07c67642`)"
AFTER: "**FIXED 2026-08-11 (D585).** 7 blocks had the dead/redundant declaration removed
(`info-box`/`decorative-image`/`responsive-logo`/`timeline`/`brand-strip`/`trust-bar`/`hero`); 6
blocks converted to an explicit mechanism (`before-after`/`team-member`/`testimonial-slider`/
`gallery`/`card-grid`/`product-card`), each calling `includes/helpers-media-position.php` with its
own known selector instead of the old guessing filter (which had matched `> img`/`figure > img`
only by accident). Live-verified via a throwaway REST-injected test page. `testimonial`/
`image-sequence` still declare the capability with a real crop scenario but weren't converted — each
needs its own per-item design decision. Full record: `decisions.md` D585,
`plans/spec-35-capability-routing-doctrine.md` Part 9."
NOTE: Collapses the "this row previously read BUILT and was FALSE" narration into the current fact; keeps the real fix detail.

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:742  (C5, from 35.md)

BEFORE: "⛔ **CORRECTED 2026-08-11 — this row undercounted AND overclaimed.** `BackgroundPanel`
covers **4** blocks, not 3 (`trust-bar` was missing from this row). And "DONE" was premature: same
day, the panel was found broken (hero's render.php never read the gradient attrs at all, plus a CSS
specificity collision, plus a live conflict with native `supports.color` — all fixed, D579-D582) and
redesigned (swatch+popover UI, tab-strip fix, opacity-control cleanup —
`.claude/plans/archive/background-panel-redesign.md` D1-D6)."
AFTER: "`BackgroundPanel` covers 4 blocks (`container`, `cta-section`, `hero`, `trust-bar`).
Redesigned 2026-08-11 (D579-D582) after 3 defects were found same-day: `hero/render.php` never read
the gradient attrs, a CSS specificity collision, and a live conflict with native `supports.color`.
Fix: swatch+popover UI, tab-strip fix, opacity-control cleanup
(`.claude/plans/archive/background-panel-redesign.md` D1-D6)."
NOTE: none

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:746  (C3, from 35.md)

BEFORE: "~~check for bespoke~~ | ✅ **BUILT — this row was WRONG, corrected 2026-08-17.**
`includes/class-sgs-block-bindings-support.php` (`Sgs_Block_Bindings_Support`) is live and wired at
`sgs-blocks.php:296`, widening the native Block Bindings API for `sgs/text`, `sgs/heading` and
`sgs/button`."
AFTER: "BUILT: `includes/class-sgs-block-bindings-support.php` (`Sgs_Block_Bindings_Support`) is live
and wired at `sgs-blocks.php:296`, widening the native Block Bindings API for `sgs/text`,
`sgs/heading` and `sgs/button`. Two further binding sources registered: `class-sgs-site-info-binding.php`,
`class-product-bindings.php` (with a PHPUnit test). Residual: confirm the 3-block scope is intended,
or extend it."
NOTE: none

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:1082-1099  (C6, from 35.md)

BEFORE: "⚠ **AMENDED 2026-08-12 (D589): Stage 2 is now SEVEN properties, not eight.**
`contentBandBackground` left the list permanently — the **capability is RETIRED, not pending**.
Bean-ruled: a background colour or media fills the max-width of its CONTAINER and is never clipped
to the inner content layer, so a band-scoped background was a design error rather than a
tier-plumbing task. The attribute, its 5 editor controls, its element-manifest mappings and all
four wrapper emission sites are deleted (0 stored instances anywhere on the canary, verified by DB
query first). Do not re-derive the old 8-property list from D549's prose."
AFTER: "**Stage 2 is SEVEN properties** (D589, 2026-08-12): `contentBandBackground` is RETIRED, not
pending — a background always fills its container's max-width and is never clipped to the inner
band, so this was a design error, not a plumbing gap. The attribute, its 5 editor controls, its
element-manifest mappings and all four wrapper emission sites are deleted (0 stored instances on the
canary, verified by DB query first)."
NOTE: Keeps the current count + reasoning + deletion evidence; drops the "not eight" / "do not re-derive the old 8-property list" framing that only makes sense next to the now-removed old number.

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:1139-1154  (C6, from 35.md)

BEFORE: "**Pool reached 0 on 2026-08-06 (Spec 35 "Track 1b").** Every role in the pool was assigned BY
MECHANISM — hand-assignment stayed banned throughout (D497). `ASSIGNABLE 0` at `pool=0` is now the
TERMINAL STEADY STATE for this data layer: a future non-zero reading is a regression (a new
attribute landed unrouted), not a backlog to clear by hand. ... > ⛔ **AND IT DID. Live re-run
2026-08-17: `eligible pool 5 · reached by any detector 5 · ASSIGNABLE 0`.** The pool is **not** 0
and this paragraph's "TERMINAL STEADY STATE" framing is stale — by its own stated rule, a non-zero
reading means new attributes landed and were routed by mechanism (`ASSIGNABLE 0` confirms they ARE
reached by a detector, so this is not an unrouted-attribute regression). **Do not quote "pool = 0"
from this section; run the command.** This paragraph warned against exactly the cache it then
became."
AFTER: "**The pool is not a fixed number — it re-fills as attributes land and drains as they're
routed by mechanism.** `ASSIGNABLE 0` is the health signal (every attribute in the pool IS reached by
a detector); the pool count itself is not. Never quote a pool figure from this section — run
`fingerprint_content_roles.py` (command above)."
NOTE: Keeps the K2 lesson (a "terminal steady state" framing was itself a cache that went stale) folded into the corrected rule; drops the "AND IT DID" narration of catching its own prediction.

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:1219-1221 (PART N.3)  (C5, from 35.md)

BEFORE: "⚠ **The former "0 of 24 end conditions" figure carried here was dead and has been removed** —
it was one of the doc claims the 2026-08-07 council flagged as asserting more than the gates proved."
AFTER: DELETE
NOTE: Pure self-historiography narrating an edit already made; the surrounding tombstone paragraph already states the current status (27-condition checklist absorbed via the absorption map). Nothing load-bearing is lost.

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:1306  (C6, from 35.md)

BEFORE: "**Derived, never hand-sorted.** The source is `supports.sgs.elements` in each `block.json` — **83 of
83** files declare it as of 2026-08-19 (`survey-control-mounts.py .`); 307 elements. *(Superseded:
an earlier 2026-08-08 measurement read "82 of 83 … 283 elements"; the gap has since closed and the
tree has grown — re-run the survey rather than quoting either figure.)*"
AFTER: "**Derived, never hand-sorted.** The source is `supports.sgs.elements` in each `block.json` —
**83 of 83** files declare it as of 2026-08-19 (`survey-control-mounts.py .`); 307 elements."
NOTE: none

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:1315  (C6, from 35.md)

BEFORE: "**Applies to every state, not just hover.** `states.hover`, `states.current` and `states.scrolled`
all render inline beside their base value. **Measured 2026-08-19** (`python
scripts/surveys/survey-control-mounts.py .`): 22 elements declare `hover`, 3 `current`, 1
`scrolled` (25 elements declare a state; 1 carries two). *(Superseded same-day figure, kept for the
record only — do not act on it: "18 `hover`, 4 `current`, 1 `scrolled`". Always re-run the survey
rather than trusting either count.)*"
AFTER: "**Applies to every state, not just hover.** `states.hover`, `states.current` and
`states.scrolled` all render inline beside their base value. **Measured 2026-08-19**
(`python scripts/surveys/survey-control-mounts.py .`): 22 elements declare `hover`, 3 `current`, 1
`scrolled` (25 elements declare a state; 1 carries two)."
NOTE: none

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:1399  (C6, from 35.md)

BEFORE: "**Measured 2026-08-19** (`python scripts/surveys/survey-control-mounts.py .`): **83 of 83
`block.json` files declare `supports.sgs.elements`; 307 elements. 25 elements declare a state —
`hover` 22 · `current` 3 · `scrolled` 1 (on `sgs/site-header.wrapper`) · 1 element carries two.**
... ⚠ Counts drift — re-derive from the manifests rather than quoting this line.
*(Superseded, kept for the historical record only — do not act on either: a 2026-08-08 pass read
"82 of 83 … 283 elements"; a later same-day pass at D676/D678/D682 read "21 states (18 `hover`, 4
`current`, 2 elements carry both, plus 1 `scrolled`)". Both were accurate for their own measurement
date; the tree has grown since — always re-run the survey.)*"
AFTER: Delete the "(Superseded, kept for the historical record only ...)" parenthetical; keep
everything before it including the "⚠ Counts drift — re-derive from the manifests rather than
quoting this line" sentence.
NOTE: none

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:1483-1497  (C3, from 35.md)

BEFORE: "⛔ **CORRECTED 2026-08-09 — the 83-vs-84 distinction below was REAL when written and is now
GONE. There is one denominator: 83.**

~~⚠ **83 vs 84 — both figures are correct and they count different things.** The scoping axes above use
**84** (`SELECT COUNT(*) FROM blocks WHERE slug LIKE 'sgs/%'`). This section uses **83**: the blocks
with a `src/blocks/*/block.json` on disk declaring `supports.sgs.elements`.~~ Measured at `a09226e8`,
all three sources now agree:"
AFTER: "**There is one denominator: 83.** Measured at `a09226e8`, all three sources agree:"
NOTE: The table immediately below (three sources = 83, `ls -d src/blocks/*/` = 84 because of `extensions/`) stays as-is — it's current, not dead text.

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:1517-1521  (C6, from 35.md)

BEFORE: "| `surfaces.colour` | roster.json | **65** (measured 2026-08-19, `survey-control-mounts.py .`; superseded — was quoted as 64) |
| `surfaces.styling` | roster.json | **64** (measured 2026-08-19; superseded — was quoted as 65; the two figures were transposed against colour in the prior text) |
| `surfaces.media` | roster.json | **33** (measured 2026-08-19; superseded — was quoted as 30) |
| `surfaces.animation` | roster.json | **22** (measured 2026-08-19; superseded — was quoted as 21) — **the proven precedent**, used by rule 17 |"
AFTER: "| `surfaces.colour` | roster.json | **65** (measured 2026-08-19, `survey-control-mounts.py .`) |
| `surfaces.styling` | roster.json | **64** (measured 2026-08-19) |
| `surfaces.media` | roster.json | **33** (measured 2026-08-19) |
| `surfaces.animation` | roster.json | **22** (measured 2026-08-19) — **the proven precedent**, used by rule 17 |"
NOTE: Four-row table, same mechanical pattern — handled as a class per the dispatch note. Keep the number + measuring command on each row, drop every "superseded — was quoted as N" trail.

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:1542-1549  (C6, from 35.md)

BEFORE: "⛔ **CORRECTED 2026-08-19 — the `hover` extension's reach is 0, not 67.** D551 flipped `hover` (and
`blockLink`) from `hideExtensions` (opt-out denylist) to `enabledExtensions` (opt-in allowlist);
`isExtensionEnabled()` now returns true only when a block.json explicitly lists the slug, and
**verified 2026-08-19 (`grep -A3 enabledExtensions src/blocks/*/block.json`): no block.json lists
`hover`.** The `hover` extension therefore reaches **0** blocks today. §1 field 9 already stated this
("shared state extension with live reach 0") — that was the one place in this document that was
right; the passages below previously contradicted it and are now brought into line.
*(Superseded, kept for the record only — do not act on it: "`extensions/hover-effects.js` registers
11 literal `sgsHover*` attrs (19 `sgs*` attrs in total) onto 67 blocks".)*"
AFTER: "**The `hover` extension's reach is 0 blocks.** D551 flipped `hover` (and `blockLink`) from
`hideExtensions` (opt-out denylist) to `enabledExtensions` (opt-in allowlist); `isExtensionEnabled()`
now returns true only when a block.json explicitly lists the slug, and verified 2026-08-19
(`grep -A3 enabledExtensions src/blocks/*/block.json`): no block.json lists `hover`."
NOTE: none

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:1561-1579  (C3, from 35.md)

BEFORE: "✅ **CORRECTED 2026-08-19 — this axis is no longer an unbuilt prerequisite.** The 2026-08-08 claim
below was true when written and is now stale; kept for the historical record, not to be acted on:

~~⛔ **THIS AXIS IS AN UNBUILT PREREQUISITE, not just a rule to remember.** Measured 2026-08-08: the
existing engine **cannot see** `src/blocks/extensions/` at all. ... **Any rule whose
scope includes the extension surface is blocked until that plumbing lands.**~~

**What is actually true today (verified 2026-08-19 by reading the current files directly):** `run.js`
`buildCtx()` now supplies `extensionsDir` AND `componentsDir` on `ctx` ..."
AFTER: "**What is true today (verified 2026-08-19):** `run.js` `buildCtx()` supplies `extensionsDir`
AND `componentsDir` on `ctx`, alongside `blocksDir`/`patternsDir`/`themeDir`. `core/components.js`
exports `resolveComponentFiles()`, indexing `src/components/`, every `src/blocks/*/components/`, AND
`src/blocks/extensions/`. Rule 26 already reads that corpus. LINK / STATE / SHADOW / COLOUR are no
longer undetectable by construction — each contract's own Scope/Detection fields should be read
against their 2026-08-19 corrections, not against this stale blocker."
NOTE: none

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:1690-1697  (C3, from 35.md)

BEFORE: "1. ~~**`inspector_control_type`**~~ **— FIXED (D523).** Was: says `TextControl` for `sgs/icon.linkUrl` and `sgs/media.linkUrl`;
both use `SgsLinkControl` (icon/edit.js:231, media/edit.js:734). Missed `sgs/button`'s `URLInput`
entirely.
   **ROOT CAUSE (council, 2026-08-07): `_KNOWN_CONTROLS` at
   `plugins/sgs-blocks/scripts/behavioural-analyser/extract-signatures.py:2436-2441` is a hardcoded
   16-name tuple containing ZERO custom SGS components** ... Fix: extend the tuple, re-run Stage 1."
AFTER: "1. **`inspector_control_type`** — FIXED (D523). Root cause: `_KNOWN_CONTROLS`
(`extract-signatures.py:2436-2441`) was a hardcoded 16-name tuple with zero custom SGS components
(`SgsLinkControl`, `URLInput`, `IconPicker`, `ShadowControl`, `StateToggleControl`,
`TypographyControls`, `ResponsiveBoxControl`, `ResponsiveOverride`), so an unrecognised tag never
disagreed with the stored value and stale values (fossils of the deleted `enrich-db.py` heuristic)
persisted forever — same defect class as the gates it feeds (matching by component NAME). Fix:
extend the tuple, re-run Stage 1. Measure on the live tree — `.claude/worktrees/` holds 10 stale
copies of this file."
NOTE: none

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:1706-1713  (C3, from 35.md)

BEFORE: "2. ~~**`box_family`**~~ **— FIXED (D523).** Was: **7** genuinely NULL *object*-typed attrs with live BoxControls:
   `card-grid.cardBorderWidth`, `mega-panel.panelPadding`, `nav-drawer.drawerPadding`,
   `site-header-row.padding`/`margin`, `site-footer-row.padding`/`margin`.
   ⛔ **`mega-panel.borderRadius` was a FALSE POSITIVE in the first draft of this contract** ..."
AFTER: "2. **`box_family`** — FIXED (D523): 7 genuinely NULL object-typed attrs had live BoxControls
(`card-grid.cardBorderWidth`, `mega-panel.panelPadding`, `nav-drawer.drawerPadding`,
`site-header-row.padding`/`margin`, `site-footer-row.padding`/`margin`) — root cause:
`_collect_boxfamily_overrides()` reads `supports.sgs.boxFamilies` from block.json and none of the 5
blocks declared it; fix is block.json edits, not a script change. Note: `mega-panel.borderRadius` is
correctly NULL (a scalar radius, not an object box-family attr) — a false positive in the first
draft, caused by compiling the list from `edit.js` instead of checking `attr_type` in the DB."
NOTE: none

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:1760-1765  (C5, from 35.md)

BEFORE: "⛔ **Corrected 2026-08-19 — the raw-`GradientPicker`-in-`GradientOverlayControl.js` clause is
STALE.** Verified: `GradientOverlayControl.js:60` imports `SgsGradientPicker` (the SGS fork,
`src/components/gradient-picker/`), not core's `GradientPicker`, and mounts it at `:144`. The
4 wrapper blocks (`container`, `hero`, `trust-bar`, `cta-section`) reach the fork, not the
lookalike."
AFTER: "`GradientOverlayControl.js:60` imports `SgsGradientPicker` (the SGS fork,
`src/components/gradient-picker/`), not core's `GradientPicker`, and mounts it at `:144`. The 4
wrapper blocks (`container`, `hero`, `trust-bar`, `cta-section`) reach the fork, not the lookalike."
NOTE: none

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:1790  (C6, from 35.md)

BEFORE: "5. **Scope** — eligibility `surfaces.colour` (**65** as of 2026-08-19 — see the scoping axes table;
superseded from 64); detection target `role='color'` (50 blocks, 261 rows)."
AFTER: "5. **Scope** — eligibility `surfaces.colour` (**65** as of 2026-08-19 — see the scoping axes
table); detection target `role='color'` (50 blocks, 261 rows)."
NOTE: none

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:1793-1797  (C6, from 35.md)

BEFORE: "6. **Conformance** — ✅ **Corrected 2026-08-19: `sgs/star-rating` no longer violates.** It now
mounts `SgsColourPanel` (`star-rating/edit.js:134`), so this field's stale "49/50, star-rating
violates" reads as 50/50 against the OLD (pre-D609) shape. This figure still measures the legacy
single-state shape, not field 9's state+shape rule — see field 9's corrected note on rollout."
AFTER: "6. **Conformance** — `sgs/star-rating` mounts `SgsColourPanel` (`star-rating/edit.js:134`) —
50/50 against the legacy single-state shape. This figure measures the legacy shape only, not field
9's state+shape rule — see field 9's note on rollout."
NOTE: none

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:1814-1821  (C5, from 35.md)

BEFORE: "⛔ Prior text, kept for the historical record only — do not act on it: *"native `GradientPicker`
was deliberately KEPT as-is for the 4 wrapper blocks — no per-stop theme-palette selection
exists in Gutenberg core to build against, and Bean ruled a bespoke stop editor 'not worth the
time' once shown the real cost. So today, gradient stops do NOT route through this contract's
canonical `DesignTokenPicker` anywhere in the codebase — native only."*"
AFTER: DELETE
NOTE: The current rule this quoted paragraph would restate ("gradient stays its own control type, native GradientPicker is REPLACED by SgsGradientPicker, not kept") is already stated in full in the paragraph immediately above (item 8, "RESOLVED 2026-08-16 (D636)..."). Nothing is lost by deleting the "prior text" quote.

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:1934-1940  (C6, from 35.md)

BEFORE: "5. **Scope** — **14 blocks with a navigational link field, plus the `blockLink` extension surface —
3 blocks (measured 2026-08-19, `grep -A3 enabledExtensions src/blocks/*/block.json`), not 67.**
   ⛔ **Superseded, kept for the record only — do not act on it:** "plus the 67-block extension
   surface (`hover-effects.js`'s block-link)". That figure predates D551's opt-out→opt-in flip on
   `blockLink`; see the EXTENSION SURFACE axis correction above — reach must be re-derived per slug,
   not copied from an earlier measurement."
AFTER: "5. **Scope** — 14 blocks with a navigational link field, plus the `blockLink` extension
surface — 3 blocks (measured 2026-08-19, `grep -A3 enabledExtensions src/blocks/*/block.json`).
Reach must be re-derived per slug from whichever mechanism currently governs that slug — see the
EXTENSION SURFACE axis correction above."
NOTE: Keeps the forward guard (re-derive per slug); drops the quoted superseded 67-block figure.

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:1948-1953  (C6, from 35.md)

BEFORE: "**`SgsLinkControl`'s inline-mount backlog is now DISCHARGED — 0 blocks, not 7.** Measured
2026-08-19 (`survey-control-mounts.py .`): `SgsLinkControl` has **0 JSX mounts tree-wide**. Rule
27 (`27-superseded-link-control.js`) was promoted from advisory to `mode: gate` at
`openBacklog: 0` on 2026-08-14 ...
*(Superseded, kept for the record only — do not act on it: "Still on `SgsLinkControl`'s inline
mount — 7 blocks the DB's `role='link-href'` scan cannot see: `brand-strip`, `card-grid`, `form`,
`pricing-table`, `social-icons`, `team-member`, `trust-bar`".)*"
AFTER: "**`SgsLinkControl`'s inline-mount backlog is DISCHARGED — 0 blocks.** Measured 2026-08-19
(`survey-control-mounts.py .`): `SgsLinkControl` has 0 JSX mounts tree-wide. Rule 27
(`27-superseded-link-control.js`) was promoted from advisory to `mode: gate` at `openBacklog: 0` on
2026-08-14 — the last of the 7 (`social-icons`) migrated 2026-08-14, commit `f6b26866`."
NOTE: Keeps the closure evidence (which block closed the backlog); drops the quoted stale 7-block list.

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:1976  (C6, from 35.md)

BEFORE: "5. **Scope** — **272 rows with declared enums** (measured 2026-08-19, `survey-control-mounts.py .`;
superseded from 284); 1,372 string rows are the search space, not the violator count."
AFTER: "5. **Scope** — **272 rows with declared enums** (measured 2026-08-19,
`survey-control-mounts.py .`); 1,372 string rows are the search space, not the violator count."
NOTE: none

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:2043-2051  (C3, from 35.md)

BEFORE: "1. ⛔ **Corrected 2026-08-19 — this field contradicted itself against this same document's PART M
(:736) and the tree agrees with :736, not with the claim below.** Prior text, kept for the
historical record only, do not act on it: *"**Canonical** — `src/components/StateToggleControl.js`.
**Verified adoptable today** — it already hosts a mixed group (colour + UnitControl +
SelectControl) under one toggle in `nav-menu/edit.js:1407-1545`. No extension needed. `states` is
a prop, not hardcoded."* Verified 2026-08-19: `StateToggleControl` has **0 JSX mounts** across
`src/blocks` — the only references are two comments recording where it USED TO live
(`brand-strip/edit.js:316`, `nav-menu/edit.js:463`) plus its own file
(`components/index.js:45`, `StateToggleControl.js`). It is exported but dead code.
   **The WORKING mechanism is `SgsColourPanel` rows → `DesignTokenPicker`'s `states` prop** (field 9
   above) — e.g. `button/edit.js:395-397`. Treat `StateToggleControl` as unadopted, not canonical,
   until it is either wired up or deleted (D673 flagged the same open decision)."
AFTER: "1. **Canonical (open decision, D673)** — `StateToggleControl` is unadopted, not canonical. It
exists and is exported (`components/index.js:45`) but has 0 JSX mounts across `src/blocks` — the
only references are 2 comments recording where it used to live (`brand-strip/edit.js:316`,
`nav-menu/edit.js:463`). **The WORKING mechanism is `SgsColourPanel` rows → `DesignTokenPicker`'s
`states` prop** (e.g. `button/edit.js:395-397`). Decide: wire `StateToggleControl`, or delete it and
make the `states`-prop route canonical."
NOTE: This site is the one PART M (:736) points at as agreeing with the current text — confirms this is a real, already-resolved self-contradiction, not an open ESCALATE case.

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:2093  (C6, from 35.md)

BEFORE: "a
`RadioControl` with two options (**1 live instance — `heading/edit.js:281`**; the earlier "ZERO"
was false, the judgement it supported survives);"
AFTER: "a `RadioControl` with two options (1 live instance — `heading/edit.js:281`);"
NOTE: none

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:2160-2163  (C6, from 35.md)

BEFORE: "6. **Conformance** — 13/13 mount the canonical component; **0/13 pass the `id` requirement**, so the
real conformance figure is 0, not the "9/9" this doc first carried over a set four blocks short."
AFTER: "6. **Conformance** — 13/13 mount the canonical component; 0/13 pass the `id` requirement, so
the real conformance figure is 0."
NOTE: none

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:2193-2201  (C6, from 35.md)

BEFORE: "⛔ **CORRECTED 2026-08-19 — a preset `SelectControl` on a shadow attr via
     `extensions/hover-effects.js`'s `hover` extension reaches 0 blocks, not 67.** D551 flipped
     `hover` to an opt-in `enabledExtensions` allowlist and no block.json lists it (verified
     `grep -A3 enabledExtensions src/blocks/*/block.json` — see the EXTENSION SURFACE axis
     correction above; same finding as §1 field 9 and §2 LINK field 5). *(Superseded, kept for the
     record only — do not act on it: "reaching 67 blocks through `extensions/hover-effects.js` —
     same shape, invisible to every per-block scan".)* The shape itself (a preset select standing in
     for `ShadowControl`) is still real wherever it DOES occur block-locally — this correction is to
     the extension-reach figure, not to whether the lookalike is banned;"
AFTER: "a preset `SelectControl` on a shadow attr via `extensions/hover-effects.js`'s `hover`
extension reaches **0 blocks** (D551 flipped `hover` to an opt-in `enabledExtensions` allowlist and
no block.json lists it — verified `grep -A3 enabledExtensions src/blocks/*/block.json`). The shape
itself (a preset select standing in for `ShadowControl`) is still real wherever it DOES occur
block-locally — this correction is to the extension-reach figure only, not to whether the lookalike
is banned;"
NOTE: none

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:2264  (C5, from 35.md)

BEFORE: "| `DeviceTabs` | ⚑ **DEAD — 0 callers** (Spec 35 Phase 1.2/1.3, 2026-08-10) | RESPONSIVE (§12) | **Banned lookalike — verdict still binds if reintroduced.** The component file still exists and is still exported from `components/index.js`, but every `<DeviceTabs>` render was deleted: the tier is now chosen once, in the global toggle (`src/blocks/extensions/responsive-device-toggle.js`). `inspector-scan` rule 25 flags any block that reintroduces one. This cell read `live` until the QC council caught it. |"
AFTER: "| `DeviceTabs` | ⚑ **DEAD — 0 callers** (Spec 35 Phase 1.2/1.3, 2026-08-10) | RESPONSIVE (§12) | **Banned lookalike — verdict still binds if reintroduced.** The component file still exists and is still exported from `components/index.js`, but every `<DeviceTabs>` render was deleted: the tier is now chosen once, in the global toggle (`src/blocks/extensions/responsive-device-toggle.js`). `inspector-scan` rule 25 flags any block that reintroduces one. |"
NOTE: Drops "This cell read live until the QC council caught it" — pure self-historiography, adds nothing the rest of the cell doesn't already say.

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:2378-2385  (C5, from 35.md)

BEFORE: "⭐ **AMENDED 2026-08-11 (D566). This field used to name core's `BorderBoxControl`, which has
never existed in this tree.** It was carried as permanent open debt for months. Resolved by
evidence rather than by building it:"
AFTER: "**Resolved by evidence, not by building it (D566, 2026-08-11):**"
NOTE: Drops "used to name core's BorderBoxControl... carried as permanent open debt for months"; the bullet list immediately below already gives the actual resolution content.

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:2495-2499  (C3, from 35.md)

BEFORE: "7. **Detection** — as §11 SHADOW: classify each border attr's control into compliant / preset-select
/ raw-text / no-control. ~~`sgs/card-grid.cardRadius` is a known raw-text violation (help text
*"e.g. 8px"*, accepts invalid CSS)~~ — ✅ **FIXED 2026-08-11 (D561), along with two this field
never named: `sgs/trust-bar.iconCircleBorderRadius` and `.badgeImageBorderRadius`.** The
raw-text population was **3**, and it is now **0**. ⚠ `cardRadius` is also listed under LENGTH §4
— it is discharged there too, so Phase 3.2a must not re-list it."
AFTER: "7. **Detection** — as §11 SHADOW: classify each border attr's control into compliant /
preset-select / raw-text / no-control. FIXED 2026-08-11 (D561): `sgs/card-grid.cardRadius`,
`sgs/trust-bar.iconCircleBorderRadius`, `.badgeImageBorderRadius` were raw-text violations; the
raw-text population was 3, now 0. `cardRadius` is also discharged under LENGTH §4."
NOTE: none

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:2500  (C1, from 35.md)

BEFORE: "8. ~~**Open**~~ — ✅ **ANSWERED 2026-08-11 (D560). Border splits in two, and the measurement is
unambiguous.**"
AFTER: "8. **Answered (D560, 2026-08-11). Border splits in two, and the measurement is unambiguous.**"
NOTE: none

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:2521-2530  (C3, from 35.md)

BEFORE: "- ~~⛔ **Separately, and NOT resolved by this:** `BorderBoxControl` — §14.1's canonical component
     for width + style + colour — has zero source files tree-wide… That is a Phase 3 build.~~
     ⛔ **STRUCK 2026-08-13. This bullet was already false when written** — D566 amended field 1 the
     SAME DAY to remove `BorderBoxControl` as canonical and resolve the debt **by evidence rather
     than by building it**. Its "zero source files" observation is correct and no longer a defect:
     nothing is owed, there is no Phase 3 border build. Read field 1, not this bullet. *(Found while
     clearing the three parallel stale citations in Spec 35 — this was the fourth, and the most
     dangerous, because it framed a closed decision as outstanding work.)*"
AFTER: DELETE (this bullet only; the three bullets above it in the same numbered item stay)
NOTE: Field 1 (line 2378 area) already fully states the current rule — "BorderBoxControl was deliberately NOT adopted... resolved by evidence rather than by building it, no Phase 3 border build." This bullet is a pure dead-end pointing back at field 1; nothing is lost by deleting it outright rather than condensing.

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:2609-2620  (C3, from 35.md)

BEFORE: "Placement, unlike order, needs **no design gate**: it is decided — but ⚠ **not by what this paragraph
originally said.** It first read: *"12 of the 14 control contracts carry an explicit `Tab` field, §6
field 4 supplies the discriminator — 'behaviour → Settings; appearance → Styles. This discriminator
is the contract.' — and Cross-cutting A states 'the definitive tab assignment is the `Tab` field of
each contract above'."* Two defects in that sentence, both corrected 2026-08-08:

- **The citation was wrong.** That sentence lives in **§8 BOOLEAN field 4**, not §6 (STATE / HOVER).
- **The rule was wrong**, and it is the rule that produced the rejected 8-block sort. Placement is now
  governed by **THE PLACEMENT RULE** (top of this document, TWO-TIER since D537 2026-08-09): ..."
AFTER: "Placement, unlike order, needs no design gate: it is decided. Placement is governed by **THE
PLACEMENT RULE** (top of this document, TWO-TIER since D537 2026-08-09): TIER 1 element scope
decides the panel first; TIER 2 property-family (`cluster-member-sets.json`) decides placement for
everything scoped to no element; a contract's `Tab` field is authoritative only for a control that
styles nothing, and there only picks the WordPress *group* inside the pinned `Settings` panel."
NOTE: none

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:2685  (C5, from 35.md)

BEFORE: "**Enforced by** UNENFORCED. (Corrected 2026-08-06: the retired
`audit-inspector-conformance.js` never carried a hideExtensions rule — a phantom-tool claim.)"
AFTER: "**Enforced by** UNENFORCED."
NOTE: The retired tool this parenthetical corrects a claim about no longer exists in the codebase; the correction has no remaining reader-facing value.

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:2696-2702  (C5, from 35.md)

BEFORE: "⛔ **Restored after a QC-council audit, 2026-08-08.** This document's own ABSORPTION MAP claimed it
was absorbed into Cross-cutting B. It was not: Cross-cutting B is about universal-EXTENSION opt-out
fit, a different question, and the requirement appeared nowhere in this file. The map cited a target
that did not contain the rule — the exact failure mode this contract exists to end, committed by the
contract about itself. (Corrected 2026-08-06: the retired `audit-inspector-conformance.js` never
carried a duplicate-native-panel rule either — that was a phantom-tool claim.)"
AFTER: "Restored 2026-08-08 (QC-council audit): this document's ABSORPTION MAP had wrongly claimed
this rule was absorbed into Cross-cutting B (a different question — universal-extension opt-out fit).
The rule appeared nowhere in this file until restored here."
NOTE: Keeps the K2-flavoured lesson (a map citing a target that doesn't contain the rule) in one line; drops the phantom-tool parenthetical (dead tool, no remaining value) and the "committed by the contract about itself" framing.

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:2707-2712  (C6, from 35.md)

BEFORE: "**Enforced by**
`inspector-scan/rules/18-decorative-image-aria.js`, ADVISORY, `openBacklog: 13` (verified
2026-08-19 against `plugins/sgs-blocks/scripts/inspector-scan/rules.json`). ⛔ **Superseded, kept
for the record only — do not act on it: "UNENFORCED — no automated gate exists."** That was false
when written and remains false today; the rule has existed and run since 2026-08-03."
AFTER: "**Enforced by** `inspector-scan/rules/18-decorative-image-aria.js`, ADVISORY,
`openBacklog: 13` (verified 2026-08-19 against
`plugins/sgs-blocks/scripts/inspector-scan/rules.json`). Live since 2026-08-03."
NOTE: none

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:2779-2783  (C5, from 35.md)

BEFORE: "⚠ **AMENDED 2026-08-08 — this line used to read "The definitive tab assignment is the 'Tab' field of
each contract above." It is no longer true and must not be quoted.** The definitive tab assignment is
**THE PLACEMENT RULE** at the top of this document: TIER 1 element scope decides the panel first."
AFTER: "The definitive tab assignment is **THE PLACEMENT RULE** at the top of this document: TIER 1
element scope decides the panel first."
NOTE: none

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:2823-2826  (C5, from 35.md)

BEFORE: "**Correction to an earlier claim in this investigation:** `noOptOutExtensions` is `[]` today.
Animation's opt-out landed 2026-07-19. The three remaining without one are self-classified
utilities. The script's own file header still describes the old state and is stale."
AFTER: "`noOptOutExtensions` is `[]` today — animation's opt-out landed 2026-07-19; the three
remaining without one are self-classified utilities. Note: `check-universal-fit.js`'s own file
header still describes the old state and needs updating."
NOTE: Keeps the still-actionable pointer (the file header itself is stale and should be fixed); drops "correction to an earlier claim in this investigation" framing.

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:2864-2874  (C5, from 35.md)

BEFORE: "⛔ **CORRECTED:** the hardcoded 14-slug denylist is **not** in `animation.js` — it is at
**`scripts/check-universal-fit.js:146`**, i.e. inside the AUDIT GATE, not the extension.
`animation.js:44` holds only `CORE_ANIMATION_BLOCKS`, a 4-entry ALLOW-list, and its docblock records
that the per-block denylist was **removed 2026-07-19** in favour of declarative `hideExtensions`.
The contract inherited the gate's own stale comment (line 143) about where the list lives. The count
14 is right; the file, the severity and the remediation target were all wrong. The R-31-1 concern
still stands — but against the gate, and alongside the 4-slug allow-list nobody has looked at."
AFTER: "The hardcoded 14-slug denylist lives at `scripts/check-universal-fit.js:146` (the audit
gate), not in `animation.js`. `animation.js:44` holds only `CORE_ANIMATION_BLOCKS`, a 4-entry
allow-list; its docblock records the per-block denylist was removed 2026-07-19 in favour of
declarative `hideExtensions`. The R-31-1 concern stands against the gate's denylist, alongside the
unreviewed 4-slug allow-list."
NOTE: none

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:851-856  (C5, from 35.md)

BEFORE: "- [ ] **no native-supports panel duplicated** — ⛔ **corrected 2026-08-17.** This was briefly recorded
as satisfied. **There is no gate for it.** None of the 16 `inspector-scan` rules targets Part F's
"bespoke panel duplicating a native `supports` panel"; `check-shared-panel-schema.js`,
`check-dead-controls.js` and `check-duplicate-controls.js` all target different bug classes. A
manual check found no duplicated *colour* panel, which is one shape of the anti-pattern, not
proof of the item. **Needs a rule before it can be ticked**"
AFTER: "- [ ] **no native-supports panel duplicated** — **no gate exists.** None of the 16
`inspector-scan` rules targets Part F's "bespoke panel duplicating a native `supports` panel";
`check-shared-panel-schema.js`, `check-dead-controls.js` and `check-duplicate-controls.js` all target
different bug classes. A manual check found no duplicated *colour* panel, which is one shape of the
anti-pattern, not proof of the item. Needs a rule before it can be ticked."
NOTE: Drops "corrected 2026-08-17. This was briefly recorded as satisfied" narration; keeps the current unenforced status.

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:951-953  (C3, from 35.md)

BEFORE: "~~Confirmed Part-B failure live in the wrapper: `sgs/container` band-width "custom"~~ **RESOLVED
2026-07-23** — not reproduced (Playwright 20/20); already fixed at `d5416ae8`; Bean's report was a
stale cached editor bundle. Parking entry archived (`memory/parking-archive.md`)."
AFTER: "`sgs/container` band-width "custom" — RESOLVED 2026-07-23: not reproduced (Playwright 20/20),
already fixed at `d5416ae8`; the original report was a stale cached editor bundle. Parking entry
archived (`memory/parking-archive.md`)."
NOTE: none

### 35-BLOCK-INSPECTOR-UX-STANDARD.md:989-991  (C1, from 35.md)

BEFORE: "~~**Roadmap (Part J) — BUILD status: COMPLETE (2026-07-28, `07c67642` → `64f5080e`).**~~ All three
waves shipped same day; the plan referenced in earlier revisions
(`~/.claude/plans/please-read-through-all-hashed-wreath.md`) executed in full:"
AFTER: "**Roadmap (Part J) — BUILD status: COMPLETE (2026-07-28, `07c67642` → `64f5080e`).** All three
waves shipped same day; the plan referenced in earlier revisions
(`~/.claude/plans/please-read-through-all-hashed-wreath.md`) executed in full:"
NOTE: Cosmetic strike on a completed (not wrong) item — remove the `~~`, keep the text.

### 37-HEADER-FOOTER-BUILDER.md:368-400  (C5, from 37-36.md)

BEFORE: `*(Status corrected 2026-07-28, D400/D405: the cascade MECHANISM — canonical \`resolveTier()\` +
\`ResponsiveTriStateControl\` + scoped emission — is now BUILT and live-proven, \`b9c5f6d1\`/
\`ac0c30eb\`/\`eb255f06\`. What remains open is the header-CONTENT-hiding FEATURE that would
*consume* the mechanism to hide \`labelCollapse\`-equivalent elements per device — that feature
is owned by this spec (§3.8) and has not been built. The two mechanisms stay non-interchangeable
regardless: the cascade HIDES an element at a tier, \`labelCollapse\` KEEPS the element and its
link while collapsing its label to icon-only.)*`
AFTER: `The cascade mechanism (\`resolveTier()\` + \`ResponsiveTriStateControl\` + scoped emission)
is BUILT and live-proven (\`b9c5f6d1\`/\`ac0c30eb\`/\`eb255f06\`); the header-CONTENT-hiding
FEATURE that would consume it to hide \`labelCollapse\`-equivalent elements per device is owned
by this spec (§3.8) and is NOT built. The two stay non-interchangeable regardless: the cascade
HIDES an element at a tier, \`labelCollapse\` KEEPS the element and its link while collapsing
its label to icon-only.`
NOTE:   §3.8 is the canonical location for this fact (see K4 entry below for the §8.2 duplicate) — drop "Status corrected 2026-07-28, D400/D405" framing, state current fact directly.

### 37-HEADER-FOOTER-BUILDER.md:1060-1070  (C5, from 37-36.md)

BEFORE: `> **⚠ Two corrections, 2026-07-21 (adversarial council + verification).**
>
> **1. The uid-canonicalisation instruction is STRUCK.** v1.0.0 said "canonicalise attribute key
> order before the uid md5 (07-13 §8)". That directly reverses **D334**...
> **D334 governs. 07-13 §8 is superseded on this point.**
>
> **2. The status was wrong in both directions.** v1.0.0 claimed \`BUILT\` for "the 17 tiered
> attrs". Verified counts: **\`sgs/site-header\` has 0 object-typed attrs and 20 flat suffixed
> ones**...`
AFTER: `> **Uid hashing does NOT canonicalise attribute key order** (D334, enforced in code —
> \`site-header-row/render.php:49\` \`// STOP-NO-KSORT\`): canonicalisation is a write-time oracle
> only, kept out of the hash path, because reordering keys would re-key every scoped-CSS
> selector and break the collector's cross-page dedup.
>
> **Object-typed tiered attrs live on the ROWS, not the containers:** \`sgs/site-header\` has
> 0 object-typed attrs and 20 flat suffixed ones (\`maxWidthTablet\`, \`paddingTopMobile\`, …);
> \`sgs/site-header-row\` has 5 object-typed (\`gap\`, \`maxWidth\`, \`contentWidth\`, \`padding\`,
> \`margin\`) and 0 flat.`
NOTE:   Drops "v1.0.0 said X, that's wrong" framing; keeps the two forward facts (D334 rule + real attr distribution).

### 37-HEADER-FOOTER-BUILDER.md:1259-1265  (C5, from 37-36.md)

BEFORE: `**Status:** \`GATE BUILT\` — **CORRECTED 2026-08-19 (D679 audit).** This FR previously said
\`NOT-BUILT\` — "\`check-simple-surface-cap.js\` does not exist (verified: 0 files)" — while this
spec's own §5 build-status table already said \`GATE BUILT\` for the same script. That was a
self-contradiction, not a real ambiguity: **the script exists.** As of 2026-08-19 it scans FOUR
blocks — \`sgs/site-header\`, \`sgs/site-footer\`, \`sgs/site-header-row\`, \`sgs/site-footer-row\` — the
two ROW blocks were added that day; before, half the header surface (the rows) had no computable
Simple-surface check at all.`
AFTER: `**Status:** \`GATE BUILT\`. \`check-simple-surface-cap.js\` scans FOUR blocks —
\`sgs/site-header\`, \`sgs/site-footer\`, \`sgs/site-header-row\`, \`sgs/site-footer-row\` (the two
ROW blocks added 2026-08-19; before that, half the header surface had no computable
Simple-surface check).`
NOTE:   Drops the "previously said NOT-BUILT... self-contradiction" audit narration; keeps the current scan scope.

### 37-HEADER-FOOTER-BUILDER.md:1280-1290  (C5, from 37-36.md)

BEFORE: `> **⚠ CORRECTED 2026-07-23 (Bean-caught). This FR previously said "the lint fails a build that adds
> a fourth" — a mis-transcription of its own cited source, and it propagated into shipped code.**
> P2 §5 states the opposite TWICE, and it is the Bean-confirmed resolution of an objection raised
> against exactly this reading:
> - P2:52 — *"the ≤3 lint is the sensible **default, not a ceiling**"*
> - P2:91 — objection *"Hard cap fights client self-service — ≤3 lint = a ceiling a client can't
>   influence"* → resolution *"Operator pin/unpin; **lint = default not ceiling** (§5). **Bean-confirmed.***"
> - P2:187 — *"≤3 default; operator-reorderable; **lint = default**"*
>
> So ≤3 is a design DEFAULT the lint surfaces, not a cap a build dies on. \`check-simple-surface-cap.js\`
> was built to the wrong reading and exited 1; it is now WARN-ONLY (exit 0) with an opt-in \`--strict\`,`
AFTER: `> **≤3 is a design DEFAULT the lint surfaces, not a cap a build dies on** (P2:52, P2:91, P2:187 —
> Bean-confirmed). \`check-simple-surface-cap.js\` is WARN-ONLY (exit 0) with an opt-in \`--strict\`,`
NOTE:   Drops the "previously said X, mis-transcription, Bean-caught" narration; keeps the rule + its three citations (short, load-bearing) + current gate behaviour.

### 36-SGS-NAVIGATION-SYSTEM.md:409-411  (C3, from 37-36.md)

BEFORE: `- **~~⚠ \`side-panel\` has NO reference site~~ — RESOLVED 2026-07-28 session 2: DROPPED.** The
  Task-1 pass confirmed zero of the 8 references uses an edge-anchored partial-width slide-in at
  ANY width; the half-built \`edge:left/right\` CSS was retired with the \`edge\` attr (D404).`
AFTER: `\`side-panel\` is DROPPED (2026-07-28) — zero of the 8 references uses an edge-anchored
  partial-width slide-in at any width; the half-built \`edge:left/right\` CSS was retired with
  the \`edge\` attr (D404).`
NOTE:   C3: struck question + RESOLVED, rewritten as one present-tense statement.

### 36-SGS-NAVIGATION-SYSTEM.md:459-478  (C5, from 37-36.md)

BEFORE: `**⚠ Cross-spec conflict RESOLVED 2026-07-23 — do not re-litigate:** Spec 37 §3.8 previously said
\`labelCollapse\` was "not carried forward as-is", directly contradicting this instruction and FR-36-23's.
Bean's rule (keep an operator TOGGLE, bin an AUTOMATIC behaviour) settled it; code confirms it is a
toggle (\`button/edit.js:347\`, \`business-info/edit.js:88\` — a \`SelectControl\` defaulting to
\`'none'\`), and the per-device cascade Spec 37 would have deferred to is Spec 35's.
*(Status corrected 2026-07-28, D400/D405: the cascade MECHANISM ... is now BUILT
and live-proven, \`b9c5f6d1\`/\`ac0c30eb\`/\`eb255f06\`; the §3.8 header-CONTENT-hiding
FEATURE that would consume it remains open, and per D363's revisit condition \`labelCollapse\` should be
re-tested against it whenever that feature ships.)* **\`labelCollapse\` is RETAINED**; Spec 37 §3.8 + §8.2
were amended in the same commit.`
AFTER: `**\`labelCollapse\` is RETAINED** (Bean's rule: keep an operator TOGGLE, bin an AUTOMATIC
behaviour; code confirms it is a toggle — \`button/edit.js:347\`, \`business-info/edit.js:88\`).
Full reasoning: Spec 37 §3.8. The per-device cascade this would have deferred to (Spec 35's
\`resolveTier()\`) is BUILT; the feature that would consume it to hide equivalent elements per
device is not — revisit \`labelCollapse\` against it whenever that feature ships.`
NOTE:   Drops "previously said... directly contradicting... Status corrected" narration; this is the THIRD copy of the same fact across the two specs (§3.8, §8.2 in Spec 37; here in Spec 36) — kept short and pointed at §3.8 as canonical rather than re-deriving it.

### 37-HEADER-FOOTER-BUILDER.md:954-963  (C5, from 37-36.md)

BEFORE: `The "no attribute / dormant" note above was STALE. hide-on-scroll IS wired end to end in code: site-header/block.json:76 headerHideOnScroll (boolean) ... CORRECTED 2026-08-19 (D679 audit). This note is itself now stale in one respect: it still describes headerHideOnScroll as a boolean at site-header/block.json:76. That is superseded by FR-37-14 ... and line 76 no longer describes it (the citation was left in place when FR-37-14 shipped). Read FR-37-14 for the current shape; this paragraph is retained only as the historical record of the D375/D376 wiring fix.`
AFTER: `hide-on-scroll is wired end to end: an Advanced ToolsPanel control in site-header/edit.js + class-sgs-header-behaviours.php:205,264 emits the sgs-header-behaviour-hide-on-scroll-down body class. headerHideOnScroll is an OBJECT tri-state ({desktop,tablet,mobile}) per FR-37-14 — do not cite site-header/block.json:76 as a boolean shape, that citation is stale.`
NOTE:   Distinct sub-correction nested inside the larger FR-37-13 block already flagged ESCALATE at :945 vs :964-984 — this piece (the attribute's shape) is independently resolved, not part of the live contradiction, so it condenses cleanly rather than escalating.

### 30-SGS-WOOCOMMERCE-PAGE-TYPES.md:176  (C1, from light.md)

BEFORE: "1. ~~**P1 — Working PDP + cart loop:** FR-30-0/1/2/7/4.~~ **SHIPPED** (D210, 2026-06-11). Bean R-22-13 signed off. FR-30-12 pipeline gate unblocked."
AFTER:  "1. **P1 — Working PDP + cart loop:** FR-30-0/1/2/7/4. **SHIPPED** (D210, 2026-06-11). Bean R-22-13 signed off. FR-30-12 pipeline gate unblocked."
NOTE:   —

### 30-SGS-WOOCOMMERCE-PAGE-TYPES.md:177  (C1, from light.md)

BEFORE: "2. ~~**P2 — Differentiators:** FR-30-8 (price coupling + value-ladder), FR-30-10 (reviews), FR-30-17 notify-me + Turnstile (D217), gallery variation-aware swap (D218).~~ **SHIPPED** (D213–D220, 2026-06-12). Merged to main via isolated temp-worktree cherry-pick."
AFTER:  "2. **P2 — Differentiators:** FR-30-8 (price coupling + value-ladder), FR-30-10 (reviews), FR-30-17 notify-me + Turnstile (D217), gallery variation-aware swap (D218). **SHIPPED** (D213–D220, 2026-06-12). Merged to main via isolated temp-worktree cherry-pick."
NOTE:   —

### 30-SGS-WOOCOMMERCE-PAGE-TYPES.md:178  (C1, from light.md)

BEFORE: "3. ~~**P3 — Shop:** FR-30-3 archive UX shell, FR-30-6 searchable filter, FR-30-5 product search.~~ **SHIPPED** (D213/D214, 2026-06-11/12). Live-verified on canary."
AFTER:  "3. **P3 — Shop:** FR-30-3 archive UX shell, FR-30-6 searchable filter, FR-30-5 product search. **SHIPPED** (D213/D214, 2026-06-11/12). Live-verified on canary."
NOTE:   —

### 30-SGS-WOOCOMMERCE-PAGE-TYPES.md:179  (C1, from light.md)

BEFORE: "4. ~~**P4 — Schema:** FR-30-9 (Organization/WebSite/noindex/returnPolicyCountry). FR-30-13 go-live checklist.~~ **SHIPPED** (D215 + D220, 2026-06-12). Go-live checklist at `.claude/go-live-checklist.md` (31 items)."
AFTER:  "4. **P4 — Schema:** FR-30-9 (Organization/WebSite/noindex/returnPolicyCountry). FR-30-13 go-live checklist. **SHIPPED** (D215 + D220, 2026-06-12). Go-live checklist at `.claude/go-live-checklist.md` (31 items)."
NOTE:   —

### 30-SGS-WOOCOMMERCE-PAGE-TYPES.md:184  (C1, from light.md)

BEFORE: "1. ~~FR-30-7 read-path~~ — CLOSED v1.1: the shipped SEC-1 manifest + cart proxy IS the path (Reuse Inventory). No `@woocommerce/block-data` research needed."
AFTER:  "1. FR-30-7 read-path — CLOSED v1.1: the shipped SEC-1 manifest + cart proxy IS the path (Reuse Inventory). No `@woocommerce/block-data` research needed."
NOTE:   —

### 30-SGS-WOOCOMMERCE-PAGE-TYPES.md:185  (C1, from light.md)

BEFORE: "2. ~~FR-30-8 home~~ — CLOSED v1.1: sibling output of the configurator rendering, not a product-card attribute (preserves the D204 price invariant)."
AFTER:  "2. FR-30-8 home — CLOSED v1.1: sibling output of the configurator rendering, not a product-card attribute (preserves the D204 price invariant)."
NOTE:   —

## Counts
IN SCOPE: 6   (CUT: 6, CONDENSE: 0)
ESCALATE: 0
EXCLUDE:  5

---

# 33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md

### 33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md:224  (C5, from light.md)

BEFORE: "> **Related, not the same mechanism (2026-08-01 cross-reference):** this FR governs which background COUNTS as the theme's `surface`. It does NOT govern whether a distinct `surface-alt` gets derived — that is FR-33-2's role table + the `_synthesise_surface_alt` fallback in `palette.py` (see the 2026-08-01 status_history entry). A prior version of this note mis-cited FR-33-6 as covering surface-alt derivation; corrected here — FR-33-2 is the sole owner of that mechanism."
AFTER:  "> **Related, not the same mechanism:** this FR governs which background COUNTS as the theme's `surface`. It does NOT govern whether a distinct `surface-alt` gets derived — that is FR-33-2's role table + the `_synthesise_surface_alt` fallback in `palette.py`. FR-33-2 is the sole owner of that mechanism."
NOTE:   Agent self-historiography ("A prior version of this note mis-cited...corrected here") deleted; forward rule (which FR owns which mechanism) kept.

### 33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md:405  (C5, from light.md)

BEFORE: "`/ui-ux-pro-max` enforces the classifier on every NEW draft it generates, so R2 stays a legacy path rather than the norm. *(This previously cited a parking slug `P-UIMAX-ENFORCE-CREDIT-CLASSIFIER` that existed in NEITHER `parking.md` nor `memory/parking-archive.md` — a phantom citation, the same class as `P-CLONING-DEPLOY-BLOCKED-SHARED-TREE`, removed 2026-07-30. The pointer is struck rather than re-homed; if this becomes real deferred work it needs a genuine parking entry.)*"
AFTER:  "`/ui-ux-pro-max` enforces the classifier on every NEW draft it generates, so R2 stays a legacy path rather than the norm. (No live parking entry exists for this; if it becomes real deferred work it needs a genuine parking entry.)"
NOTE:   Self-historiography about the removed phantom citation deleted; forward rule (no open parking slug, needs a real one if ever scoped) kept.

## Counts
IN SCOPE: 2   (CUT: 0, CONDENSE: 2)
ESCALATE: 0
EXCLUDE:  10

---

# 19-SGS-CLI-COMMANDS.md

### 00-naming-conventions.md:50  (C5, from light.md)

BEFORE: "> **Roster corrected 2026-07-20 (Spec 36 Phase-1 close).** This line previously named `sgs/adaptive-nav` \"plus the reused `sgs/mobile-nav` off-canvas drawer\". **`sgs/mobile-nav` no longer exists** — it was deleted at D336/Task 1 (2026-07-14), so the citation was stale for six days. `sgs/adaptive-nav` is **superseded** by the Spec 36 rebuild and is reference-only: it remains REGISTERED but dormant purely as the rollback path, and is deleted once the Indus header is re-authored (FR-36-18). Do not cite either as the current nav block."
AFTER:  "> **`sgs/mobile-nav` no longer exists** (deleted D336/Task 1, 2026-07-14). `sgs/adaptive-nav` is superseded by the Spec 36 rebuild and is reference-only: REGISTERED but dormant, kept solely as the rollback path until the Indus header is re-authored (FR-36-18). Do not cite either as the current nav block."
NOTE:   Self-historiography ("this line previously named...so the citation was stale for six days") deleted; forward rule (mobile-nav doesn't exist, adaptive-nav is dormant rollback-only) kept.


---

# EXCLUDE (370)

Left alone on purpose. Listed compactly so the Phase-3 gate can tell 'deliberately kept' from 'missed'.

- `02-SGS-BLOCKS.md:143 / 02-SGS-BLOCKS.md:159` - These two lines state the CURRENT rule correctly and match code ground truth (see ESCALATE bundle below — 0 `deprecated.js` files exist anywhere under `plugins/sgs-blocks/src/blocks/`). Guard rails, not rot. Listed only because they are the correct anchor the contradicting sites below need reconciling against.
- `02-SGS-BLOCKS.md:30` - Dated changelog entry describing what was true AT THAT TIME (2026-05-19, before D271's plugin-wide deletion). Historically accurate narration in a status_history-style block, not a present-tense claim. EXCLUDE — but flagging because a reader skimming top-of-file changelog blocks could still misread it as current; if the dispatcher wants extra safety, a one-word "(historical — deprecated.js since removed, D271)" gloss would cost nothing.
- `02-SGS-BLOCKS.md:314 ("Historical content" sub-heading + body under §5)` - This is the ORIGINAL (pre-D72) composite trust-bar, explicitly and correctly labelled as historical/does-not-exist. Already a correctly-scoped guard rail, not the D5-tombstone pattern (it's inline within the still-ACTIVE §5, not a standalone retired-block section) — leave alone.
- `01-SGS-THEME.md:378` - "changed" here is describing a real, current, already-shipped architecture change — no dead claim being dragged forward. Correctly-stated current design.
- `01-SGS-THEME.md:488` - Correctly-stated current three-tier motion doctrine with its amendment history noted concisely, no false present-tense claim left standing. Guard rail.
- `01-SGS-THEME.md:609` - Already a correctly-scoped warning ("never put overrides there") — this IS the guard rail the discriminator is protecting, not rot.
- `11-SGS-BUTTON-ARCHITECTURE.md:211` - Single phase-table cell, already terse, states the correction inline without dragging forward a false present-tense claim — the "SUPERSEDED" note IS the whole content, nothing dead follows it. Guard rail.
- `11-SGS-BUTTON-ARCHITECTURE.md:101 / :136` - Correctly-stated current facts, no dead claim retained.
- `02-SGS-BLOCKS.md:16` - status_history changelog entry — self-contained description of a fix already landed, no dead claim survives it.
- `02-SGS-BLOCKS.md:27` - Changelog paragraph correctly stating a past retirement in passing; consistent with the §17 tombstone, no contradicting present-tense claim in this line.
- `02-SGS-BLOCKS.md:29` - `is_stale` is a literal DB column/flag name, ordinary technical vocabulary — not a claim about this document's own staleness.
- `02-SGS-BLOCKS.md:31` - Describes the current, correct state after a bug fix — live rule, no dead text.
- `02-SGS-BLOCKS.md:59` - Correctly-stated guard rail warning about the slug's two lives, consistent with (and pointing to) Section 5 — already resolved there, nothing dead left standing here.
- `02-SGS-BLOCKS.md:70` - Correctly-stated current capability plus pointer to the real retirement (Section 17), no dead claim.
- `02-SGS-BLOCKS.md:85` - "no longer freezes it" describes the current fixed behaviour, not a retracted claim — live rule.
- `02-SGS-BLOCKS.md:125` - "design gate" here names a real, still-current recorded exception with Bean's sign-off — not an option-menu with a losing alternative kept at length. No K6 candidate.
- `02-SGS-BLOCKS.md:178` - States the current shared-control architecture as live fact — no contradicting claim retained.
- `02-SGS-BLOCKS.md:533` - Correctly-stated, consistent with the Section 17 tombstone — no dead text dragged forward here.
- `02-SGS-BLOCKS.md:907` - Self-contained parenthetical describing a bug already fixed — no live contradicting claim.
- `02-SGS-BLOCKS.md:966` - This IS the guard rail the discriminator protects — a live warning against a known-wrong external value, not spec rot.
- `02-SGS-BLOCKS.md:1063` - Pointer to the same live design-gate as L125, no dead option retained.
- `02-SGS-BLOCKS.md:1210` - Correctly-stated, consistent with the Section 17 tombstone.
- `02-SGS-BLOCKS.md:1330` - Already the correctly-scoped guard rail (what to do about the retired blocks today) — this is the K5 pattern's clean end-state, not rot to collapse further.
- `02-SGS-BLOCKS.md:1342` - Correctly-stated current three-tier motion doctrine with amendment history noted concisely — no false present-tense claim left standing.
- `02-SGS-BLOCKS.md:1427` - Single factual sentence, no dead claim retained — the retirement is real and stated once.
- `01-SGS-THEME.md:165` - Correctly-stated, consistent with the canonical Style Variations statement kept at L315-323 (K4 above) — this line doesn't restate the deleted mechanism at length, just references the outcome.
- `01-SGS-THEME.md:600` - This is the operational fact the K1 row at L596-598 explicitly says to KEEP unchanged (only the "override precedence" framing/heading was condensed, not this paragraph) — live rule, not dead text.
- `01-SGS-THEME.md:607` - Describes current PARTIAL status of an open item, tracked at a live parking entry — no dead claim, nothing to condense.
- `01-SGS-THEME.md:613` - "control rejected raw px" is ordinary UI-validation vocabulary (a form control rejecting an input value) — false-positive match on "rejected", not a design-gate or retracted claim.
- `11-SGS-BUTTON-ARCHITECTURE.md:17` - This changelog line itself contains no dead text to condense — it only NAMES two sections as historical, it doesn't restate their content here. Line-number disambiguation (this spec has duplicate `## 3.`/`## 4.` numbering — a second, unrelated numbering series restarts inside the embedded competitor-research report at lines 408/424): the sections referenced here are the TOP-LEVEL `## 3. The two-block pair` (line 47) and `## 4. Preset binding system` (line 79) — confirmed by content match, line 79 is literally about the `inheritStyle` attribute and `is-style-*` value-source model L17 describes as superseded. NOT the inner `## 3. Over-Engineering Check` (line 408) / `## 4. Final sgs/button Spec` (line 424), which are a different, later-appended document. Worth a follow-up sweep of lines 47-180 (the real target) to check whether they still carry the pre-D283 dead text this line refers to — out of scope for this append-only pass.
- `11-SGS-BUTTON-ARCHITECTURE.md:9` - Verified against the filesystem: `class-button-presets-admin.php` does not exist anywhere under `plugins/sgs-blocks/` (confirmed via `find`). This changelog entry is the CORRECT, currently-true record of that deletion — it is the resolution the stale rows at L99/L210/L214 below need reconciling against, not itself rot.
- `11-SGS-BUTTON-ARCHITECTURE.md:19` - Describes the current architecture (sgs/button replacing hand-coded CTAs) as live, standing fact — no dead claim retained.
- `11-SGS-BUTTON-ARCHITECTURE.md:68` - Self-contained bug-fix changelog entry — states the current correct routing rule plus the historical root cause; no contradicting present-tense claim survives elsewhere in the file.
- `11-SGS-BUTTON-ARCHITECTURE.md:72-73` - False-positive vocabulary match — "Delete" here is a user/editor INTERACTION (an operator deleting a button in the block editor), not a retracted spec claim. Ordinary functional description.
- `11-SGS-BUTTON-ARCHITECTURE.md:105` - Rationale/explanation for why Decision 22 happened — not itself a stale claim, just the "why" behind the (correctly recorded elsewhere) deletion.
- `31-UNIVERSAL-CLONING-PIPELINE.md:14`
- `31-UNIVERSAL-CLONING-PIPELINE.md:67`
- `31-UNIVERSAL-CLONING-PIPELINE.md:70`
- `31-UNIVERSAL-CLONING-PIPELINE.md:72` - Already a one-line rejected-approach-plus-why; no dead text dragged beyond the name of the rejected design.
- `31-UNIVERSAL-CLONING-PIPELINE.md:84`
- `31-UNIVERSAL-CLONING-PIPELINE.md:141` - Forward-stating current facts + a live "do not re-add" guard rail; no dead claim retained beside it.
- `31-UNIVERSAL-CLONING-PIPELINE.md:184` - "RETIRED" tag is already terse (C1/C2-equivalent form); the STATUS paragraph describes current implementation, not a corrected wrong claim.
- `31-UNIVERSAL-CLONING-PIPELINE.md:189`
- `31-UNIVERSAL-CLONING-PIPELINE.md:195` - The table is already explicitly captioned as a historical illustration, not asserted as current routing — the guard rail is doing its job.
- `31-UNIVERSAL-CLONING-PIPELINE.md:210` - Forward specification, no dead claim present.
- `31-UNIVERSAL-CLONING-PIPELINE.md:232`
- `31-UNIVERSAL-CLONING-PIPELINE.md:257`
- `31-UNIVERSAL-CLONING-PIPELINE.md:259` - Brief, already terse.
- `31-UNIVERSAL-CLONING-PIPELINE.md:290`
- `31-UNIVERSAL-CLONING-PIPELINE.md:291`
- `31-UNIVERSAL-CLONING-PIPELINE.md:292` - Dense but no dead-wrong-claim retained beside a correction — it is current documentation with an anti-regression note (out of scope to trim under this contract).
- `31-UNIVERSAL-CLONING-PIPELINE.md:305`
- `31-UNIVERSAL-CLONING-PIPELINE.md:364`
- `31-UNIVERSAL-CLONING-PIPELINE.md:382`
- `31-UNIVERSAL-CLONING-PIPELINE.md:384`
- `31-UNIVERSAL-CLONING-PIPELINE.md:394` - Already the concise resolution-plus-reason form (K1's target shape); Bean's own recorded design decision.
- `31-UNIVERSAL-CLONING-PIPELINE.md:401`
- `31-UNIVERSAL-CLONING-PIPELINE.md:412`
- `31-UNIVERSAL-CLONING-PIPELINE.md:433` - Already the K1 target shape.
- `31-UNIVERSAL-CLONING-PIPELINE.md:438`
- `31-UNIVERSAL-CLONING-PIPELINE.md:443` - Describes a genuinely still-open gap, not a corrected/dead claim.
- `31-UNIVERSAL-CLONING-PIPELINE.md:529` - Single guard rail, no dead text dragged along beyond a one-clause mention of the rejected framing.
- `31-UNIVERSAL-CLONING-PIPELINE.md:534` - Consistent with the current (post-drop) fact stated at line 293.
- `31-UNIVERSAL-CLONING-PIPELINE.md:560`
- `31-UNIVERSAL-CLONING-PIPELINE.md:588` - Single-layer, already at the concise target shape.
- `31-UNIVERSAL-CLONING-PIPELINE.md:591`
- `31-UNIVERSAL-CLONING-PIPELINE.md:593` - Single-layer rejected-approach-plus-why, already concise.
- `31-UNIVERSAL-CLONING-PIPELINE.md:594`
- `31-UNIVERSAL-CLONING-PIPELINE.md:599` - Describes a genuine improvement, not a corrected wrong claim retained beside its refutation.
- `31-UNIVERSAL-CLONING-PIPELINE.md:607` - Superseded in effect by the later D276/line-481 fact (column physically dropped), but this line itself states a schedule, not a wrong claim — no in-place contradiction at this site.
- `31-UNIVERSAL-CLONING-PIPELINE.md:626` - Already the concise K1 shape.
- `31-UNIVERSAL-CLONING-PIPELINE.md:629`
- `31-UNIVERSAL-CLONING-PIPELINE.md:641` - The root CLAUDE.md carries the D346-accident caveat separately (K3 mirror); this spec cell itself contains no internal contradiction to condense.
- `31-UNIVERSAL-CLONING-PIPELINE.md:646` - Already concise.
- `31-UNIVERSAL-CLONING-PIPELINE.md:663` - This is the resolved, current, canonical statement (mirrored verbatim in root CLAUDE.md) — not dead text.
- `31-UNIVERSAL-CLONING-PIPELINE.md:665`
- `31-UNIVERSAL-CLONING-PIPELINE.md:668`
- `31-UNIVERSAL-CLONING-PIPELINE.md:752`
- `31-UNIVERSAL-CLONING-PIPELINE.md:760` - Guard rail recording a decision, not dead text beside a correction.
- `31-UNIVERSAL-CLONING-PIPELINE.md:762`
- `31-UNIVERSAL-CLONING-PIPELINE.md:818` - Names a brief resolved example within an otherwise-forward description; not a lingering unresolved claim.
- `31-UNIVERSAL-CLONING-PIPELINE.md:891` - Already condensed to the essential meta-lesson by the original author.
- `31-UNIVERSAL-CLONING-PIPELINE.md:976`
- `31-UNIVERSAL-CLONING-PIPELINE.md:13` - Changelog/version-history entry documenting what a past release changed — frontmatter-adjacent provenance, not dead text kept beside a live claim.
- `31-UNIVERSAL-CLONING-PIPELINE.md:501` - Describes a genuinely still-open item inside the WHAT'S-LEFT-TO-BUILD list; already addressed structurally by the 465-489 K5 entry's AFTER text, which keeps this list as part of the retained D276 block.
- `31-UNIVERSAL-CLONING-PIPELINE.md:502` - Struck+RESOLVED item already covered by the 465-489 K5 entry, whose AFTER text explicitly retains "media-map loader RESOLVED" as part of the kept D276 block content — not a separate live contradiction requiring its own edit.
- `31-UNIVERSAL-CLONING-PIPELINE.md:537` - Plain gap-to-stage-map row, no dead text or correction language.
- `31-UNIVERSAL-CLONING-PIPELINE.md:645` - Duplicate restatement of the fact already condensed at :295 (K4 territory) but reduced here to a 4-word parenthetical with no dragged dead text of its own — nothing further to cut at this specific site.
- `32-COMPONENT-STYLING-TOKEN-CONTRACT.md:12` - Changelog entry inside YAML `status_history:` frontmatter — the contract's frontmatter-provenance exclusion applies; a changelog is expected to accumulate historical entries and does not mislead a reader about current state.
- `32-COMPONENT-STYLING-TOKEN-CONTRACT.md:13` - Changelog entry inside frontmatter — same exclusion as line 12.
- `32-COMPONENT-STYLING-TOKEN-CONTRACT.md:14` - Changelog entry inside frontmatter — same exclusion as line 12.
- `32-COMPONENT-STYLING-TOKEN-CONTRACT.md:22` - Changelog entry inside frontmatter — same exclusion as line 12.
- `32-COMPONENT-STYLING-TOKEN-CONTRACT.md:23` - Changelog entry inside frontmatter — same exclusion as line 12.
- `32-COMPONENT-STYLING-TOKEN-CONTRACT.md:25` - Changelog entry inside frontmatter — same exclusion as line 12.
- `32-COMPONENT-STYLING-TOKEN-CONTRACT.md:54` - Names a superseded file without quoting its content — guard rail, not rot.
- `32-COMPONENT-STYLING-TOKEN-CONTRACT.md:55` - Live warning to re-derive rather than trust the table; no dead text physically present.
- `32-COMPONENT-STYLING-TOKEN-CONTRACT.md:65` - "Reverted" describes a live verification step (revert-and-recheck), not a superseded claim.
- `32-COMPONENT-STYLING-TOKEN-CONTRACT.md:113` - Design-gate rejected-alternative (WP Block Style Variations), already a single concise sentence with reasoning. Passes the K6 length test as-is.
- `32-COMPONENT-STYLING-TOKEN-CONTRACT.md:136` - Short current-state statement, no dead text dragged along.
- `32-COMPONENT-STYLING-TOKEN-CONTRACT.md:145` - States the current forbidding rule with a short amendment-date tag; no superseded wording quoted.
- `32-COMPONENT-STYLING-TOKEN-CONTRACT.md:168` - Short current-rule cross-reference, no dead text.
- `32-COMPONENT-STYLING-TOKEN-CONTRACT.md:216` - Flow-diagram annotation stating the current rule; no dead text.
- `32-COMPONENT-STYLING-TOKEN-CONTRACT.md:267` - Heading describing current behaviour, no dead text.
- `32-COMPONENT-STYLING-TOKEN-CONTRACT.md:288-291 (re-derivation note)` - Matches the C6 shape (number + measuring command) but there is no adjacent "superseded — was quoted as N" clause to strip; it's already the clean form.
- `32-COMPONENT-STYLING-TOKEN-CONTRACT.md:331` - One-line design-gate resolution, already at the K6 length floor.
- `32-COMPONENT-STYLING-TOKEN-CONTRACT.md:374` - K1-shaped rejected-approach-and-why, already a single concise parenthetical — passes K6 as-is.
- `32-COMPONENT-STYLING-TOKEN-CONTRACT.md:410` - Short forward-pointing supersession statement with no dead text dragged along; retained-file rationale immediately follows it and is itself live guidance ("Do not treat this file as dead").
- `32-COMPONENT-STYLING-TOKEN-CONTRACT.md:423` - Short guard rail, no dead text quoted.
- `32-COMPONENT-STYLING-TOKEN-CONTRACT.md:692-696 (`border-subtle` stale/drifted parenthetical)` - Part of an open, unresolved finding awaiting Bean's sign-off (§12.6) — current content, not rot.
- `38-SGS-MOTION-SYSTEM.md:93` - Live, current design-gate ruling; "do not re-litigate" names no dead text, it's a forward instruction.
- `38-SGS-MOTION-SYSTEM.md:95` - Part of the same live D479 decision block as line 93; current, binding design content.
- `38-SGS-MOTION-SYSTEM.md:143` - Current-state statement introducing the §2 taxonomy table; no dead text.
- `38-SGS-MOTION-SYSTEM.md:147` - Cross-references a real, still-binding FR-37-40 rejection with no dead text dragged along here.
- `38-SGS-MOTION-SYSTEM.md:157` - Current-state table cell naming what Lenis replaced; no dead text dragged along.
- `38-SGS-MOTION-SYSTEM.md:160` - Short cross-reference into the already-condensed §4.2 (see the 790-864 row below) without dragging its dead text along here.
- `38-SGS-MOTION-SYSTEM.md:556 (physics-canvas scope ruling)` - Current, still-binding design ruling; no dead text dragged along.
- `38-SGS-MOTION-SYSTEM.md:613` - Genuinely open, unresolved flag awaiting confirmation — not stale.
- `38-SGS-MOTION-SYSTEM.md:617` - Parking/obligation pointer, not a superseded claim.
- `38-SGS-MOTION-SYSTEM.md:633` - Current-state statement of what is being retired and why; no dead text kept for refutation.
- `38-SGS-MOTION-SYSTEM.md:638` - Current-state statement distinguishing what is NOT retired; no dead text kept for refutation.
- `38-SGS-MOTION-SYSTEM.md:656 (MotionPath D441 rejected clamp approach)` - One-sentence rejected-alternative-and-why, already at the K6 length floor.
- `38-SGS-MOTION-SYSTEM.md:669` - "Stale" describes a CSS transform value at runtime, not documentation staleness — false-positive vocabulary match (the contract's own warning: a substring/word match can catch an irrelevant literal use).
- `38-SGS-MOTION-SYSTEM.md:698` - Short cross-reference into the already-condensed §4.2 (790-864 row below); no dead text dragged in here.
- `38-SGS-MOTION-SYSTEM.md:709` - Current, still-binding device-tested ruling with its own reasoning; one-line, already at the K6 floor.
- `38-SGS-MOTION-SYSTEM.md:782` - Current, live design-gate resolution; no dead text.
- `38-SGS-MOTION-SYSTEM.md:1009` - Live done-when criterion, forward-pointing, no dead text.
- `38-SGS-MOTION-SYSTEM.md:1151` - Live phasing summary cross-referencing the already-condensed §4.2; states current scope, not dead text.
- `38-SGS-MOTION-SYSTEM.md:1154` - Same site as 1151 — cross-references the already-condensed §4.2 (790-864 rows) without dragging its dead text along here.
- `38-SGS-MOTION-SYSTEM.md:1178 (nav-drawer risk-note correction)` - A live test finding that a CODE COMMENT (not this spec) is wrong, with a recommendation to fix that comment — evidence/verification content, not stale spec prose.
- `38-SGS-MOTION-SYSTEM.md:1323 (image-sequence pinning, rejected guidance)` - One-sentence rejected-alternative with direct quotes, already at the K6 length floor.
- `38-SGS-MOTION-SYSTEM.md:1367 ("Rejected, with reasons")` - Three one-clause rejected alternatives, already at the K6 length floor — a guard rail against re-proposal, not rot.
- `38-SGS-MOTION-SYSTEM.md:1421` - Live phasing/parking pointer, no dead text.
- `38-SGS-MOTION-SYSTEM.md:1442 (§12 dependencies, Spec 37 cross-reference)` - Short cross-reference into the already-condensed §4.2 (790-864 row above); no dead text dragged in here.
- `38-SGS-MOTION-SYSTEM.md:1454` - `deprecated.js` cited as a real filename/policy reference — explicitly on the contract's EXCLUDE list, not rot.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:56-57` - States the current rule; the superseded D609 clause is named but not quoted/dragged along — nothing to condense.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:590` - K6 length test — one paragraph, resolution + one-line reasoning per option. Already the target shape; not rot.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:736` - States current fact directly; no old claim is quoted/dragged along in this row (the guard clause "do not record this row as 'exists → roll out'" is itself a legitimate warning, not dead text).
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:1364` - Warns future readers not to trust a mis-citation that propagated elsewhere in the doc — a guard rail, not rot.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:1768` - Already condensed to one sentence naming the old rule + why it's wrong; no separate dead text dragged along beyond the name "Settings" placement.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:204-215` - States the current rule + reasoning; the reversed D358 plan is named but not quoted/dragged along at length — a guard rail, not rot.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:397-449` - This status box is itself the correction mechanism (a status table + falsified-premise breakdown), not dead text needing removal. Its own downstream body (the F.2.2 subsection) is separately registered as K5.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:590` - Already the K6 target shape — one paragraph, resolution + one-line reasoning per rejected option.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:617` - States the current governing mechanism (the VERDICT table below); no dead text dragged along.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:649-655` - Guard rail pointing at the table below (which is current); "corrected after the conflict was measured" is a one-line provenance note, not dead text dragged along.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:690` - Forward-looking closure statement, no dead text.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:717` - States current fact + its enforcement; no dead text dragged along.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:784` - Accurate current statement of what the gate enforces, consistent with the F.2.2 retirement recorded elsewhere.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:908` - False-positive vocab match ("no longer") — describes a live WP mechanism, not a correction of prior doc text.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:927` - False-positive vocab match ("no longer") — describes current detector behaviour, not a correction of prior doc text.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:955-958` - Substantive current-status correction naming exactly what does/doesn't hold; brief quotation of the word "COMPLETE" is not a dragged-along block of dead text.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:960-972` - Three genuinely open build items with live evidence (0 hits for each) — current, actionable content, not stale text kept beside a correction note.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:993` - Pointer to the already-registered Part K correction (line 742); no separate dead text here.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:1001-1005` - States current build/replace fact; no old claim quoted/dragged along.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:1007` - False-positive vocab match ("reverted" appears later in the sentence describing a test cleanup step) — describes a positive-control test, not a doc correction.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:1031-1033` - Points to the canonical rule location rather than dragging old rows' text along; the rows themselves ("A4's block-level panel is retired") state current fact directly.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:1085` - A pointer citation, not dead text in this document.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:1172` - Describes a live detector mechanism ("correction pass" is the detector's own name), not a stale doc claim.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:1215` - False-positive vocab match ("Verdict:") — names a report field, not a design-gate option menu.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:1258` - A deliberate, correctly-stated scoping note (what stayed in git history vs what folded here) — no dead text dragged into this document.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:1273` - Section heading naming what it replaces; the replaced rule's own text isn't dragged into the heading.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:1299` - Forward statement of an open decision, not a design-gate option menu with losing options retained.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:1390` - Correctly-stated scoping rule (where the schema of record lives), no dead text.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:1651` - Defines a DB-column semantic ("superseded" describes what `replaces` means), not a stale doc claim.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:1992` - An open item flagged as needing a Rule 7 design gate — forward process reference, not an option menu with retained losing options.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:2119` - Brief forward guard naming the retired rule without dragging its reasoning/deliberation along.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:2144` - Same brief pattern as line 2119, duplicated for the FREE TEXT contract — a guard rail, not rot.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:2182` - False-positive vocab match ("design gate") — classifies an open item's process, not an option menu.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:2225` - Forward process pointer for an open decision, not a retained option menu.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:2229` - Honest forward caveat pointing at the already-corrected figure elsewhere in the document; doesn't restate the wrong value as fact.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:2242` - Forward guard against re-opening a settled tradeoff; no dead text dragged along.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:2301` - False-positive vocab match ("no longer") — describes the mechanism of a live bug, not a correction of prior doc text.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:2326` - Section label, not an option menu with retained losing options.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:2371` - Section heading naming what it restores; the dropped content isn't dragged along in the heading.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:2394` - Describes a currently-banned lookalike; no dead text dragged along.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:2422` - False-positive vocab match ("walked back") — describes a code function's backward scan, not a retracted claim.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:2477-2484` - A closure summary of genuinely-resolved items, not stale text kept beside a correction note.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:2512` - One-clause rejected-approach-plus-reason, already at the K6 target length — not rot.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:2543` - False-positive vocab match ("dropped") — warns against a hypothetical future loss, not a correction of prior doc text.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:2615` - Forward process description for an open decision, not a retained option menu.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:2741` - The three standards (T1/T2/T3) are restored and defined in full immediately below this heading — current, load-bearing content, not a tombstone with dead text.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:2754` - Same pattern as T1/T2/T3 — the four rules are restored and defined in full immediately below.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:2764` - A live rule with its own evidence, not a stale claim kept beside a correction.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:2793` - False-positive vocab match ("Verdict") — a table column header, not a design-gate option menu.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:2802` - False-positive vocab match ("corrects") — describes a forward fix's effect, not a doc-text correction.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:2815` - A live open proposal with honest tradeoffs, not a retained losing option from a resolved gate.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:2827-2839` - K1/K6 shape already met — resolution + concise per-item reasoning for each withdrawn recommendation, with a pointer to the genuine alternative (§G). Not excessive deliberation to condense further.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:2870` - Part of the already-registered CONDENSE entry at line 2864-2874; this specific line is retained verbatim in that entry's AFTER text.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:412` - False-positive vocab match ("picked over") — describes a genuine design choice made once, not a retained multi-paragraph option menu.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:146` - False-positive vocab match ("cancelled") — describes CSS behaviour, not an abandoned plan.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:286` - False-positive vocab match ("DROPPED") — a live behavioural rule for the render pipeline, not a stale doc claim.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:1079` - False-positive vocab match ("dropped") — describes a real architectural fact about these two blocks, current and accurate.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:1220` - False-positive vocab match ("abandoned") — a triage category count, not a stale claim being corrected.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:1471` - False-positive vocab match ("dropped") — a live reporting rule, not a stale doc claim.
- `35-BLOCK-INSPECTOR-UX-STANDARD.md:2367-2369` - A live forward warning about a recurring bug class, not a correction of prior doc text.
- `37-HEADER-FOOTER-BUILDER.md:979-984` - K6 length test: rejected alternatives are one clause each. Already a concise guard rail.
- `37-HEADER-FOOTER-BUILDER.md:220-244` - Correctly self-amending: explicitly tells the reader the earlier rejection is narrower than it looks and states the current rule. No stale claim left unflagged.
- `37-HEADER-FOOTER-BUILDER.md:256-257` - Correctly-stated guard rail (why the decision lives in the spec, not a plan file). No dead text dragged along.
- `37-HEADER-FOOTER-BUILDER.md:368-371` - Short, current, no contradicted claim retained.
- `37-HEADER-FOOTER-BUILDER.md:1528-1536` - Negative-control guard rail against a specific future misreading — correctly stated, nothing false left standing.
- `37-HEADER-FOOTER-BUILDER.md:1844-1847` - K6 length test: one-paragraph resolution + reason, no retained deliberation. Already condensed.
- `36-SGS-NAVIGATION-SYSTEM.md:254-256` - Live guard rail, Bean's own recorded design decision. No stale claim retained.
- `36-SGS-NAVIGATION-SYSTEM.md:276-282` - Live decision record of an open defect, not a superseded claim.
- `36-SGS-NAVIGATION-SYSTEM.md:540-541` - Textbook correctly-stated guard rail (K6, one line, resolution + reason).
- `36-SGS-NAVIGATION-SYSTEM.md:1009` - Already a one-line pointer to the full retraction elsewhere (§4) — no dead text dragged along here; nothing to condense further.
- `36-SGS-NAVIGATION-SYSTEM.md:1010` - Forward-binding method rule with a one-line justification, no retained dead deliberation.
- `37-HEADER-FOOTER-BUILDER.md:19-22` - Frontmatter status_history entry — ordinary changelog vocabulary, no dead text present.
- `37-HEADER-FOOTER-BUILDER.md:44` - Ordinary technical vocabulary ("amended"), current fact, no retained dead claim.
- `37-HEADER-FOOTER-BUILDER.md:58` - Explains WHY a spec had to be re-read, doesn't retain the superseded text itself.
- `37-HEADER-FOOTER-BUILDER.md:115` - Introduces a still-current architectural rule, not a retained false claim.
- `37-HEADER-FOOTER-BUILDER.md:182` - Ordinary vocabulary ("no longer hold"), justifies a live design choice, no dead text.
- `37-HEADER-FOOTER-BUILDER.md:476-478` - Historical note explaining a current safeguard; no false claim left standing.
- `37-HEADER-FOOTER-BUILDER.md:523` - K6 — one-line rejected-alternatives list, already condensed.
- `37-HEADER-FOOTER-BUILDER.md:539-549` - Current FR description; "rejected"/"retired" describe settled naming/mechanism choices, no dead claim retained for re-litigation.
- `37-HEADER-FOOTER-BUILDER.md:657-668` - Clarifies scope of an existing rule rather than retaining a falsified claim; forward rule (FR-37-44) is stated directly.
- `37-HEADER-FOOTER-BUILDER.md:719` - Current-state statement, no dead claim.
- `37-HEADER-FOOTER-BUILDER.md:751` - Ordinary factual description of a removal, no retained false claim.
- `37-HEADER-FOOTER-BUILDER.md:791-792` - Negative-control-style guard rail ("not silently dropped") stated correctly, nothing dead retained.
- `37-HEADER-FOOTER-BUILDER.md:820` - Section heading restating the same negative-control claim as :791-792; correct, no dead text.
- `37-HEADER-FOOTER-BUILDER.md:869-877` - Live decision reversal, correctly and fully explained with current mechanism stated; no dead text needing removal.
- `37-HEADER-FOOTER-BUILDER.md:908` - Current-behaviour statement, no retained dead claim.
- `37-HEADER-FOOTER-BUILDER.md:927` - Current-behaviour statement, no retained dead claim.
- `37-HEADER-FOOTER-BUILDER.md:1022` - Current FR requirement text, not a dead claim.
- `37-HEADER-FOOTER-BUILDER.md:1124` - States a current live defect, not a superseded claim.
- `37-HEADER-FOOTER-BUILDER.md:1151-1160` - Short current clarification, no dead claim dragged along.
- `37-HEADER-FOOTER-BUILDER.md:1183` - Current mechanism rule, no retained dead claim.
- `37-HEADER-FOOTER-BUILDER.md:1210-1211` - Live test-result record; "the 2026-07-23 correction" is a pointer to the already-registered :1280-1290 CONDENSE entry, not a new dead claim.
- `37-HEADER-FOOTER-BUILDER.md:1215-1225` - Live open-defect tracking record with current verdict stated directly; not a dead claim needing removal.
- `37-HEADER-FOOTER-BUILDER.md:1320-1330` - C1-style "limitation is CLOSED" progress note already states current behaviour plainly; nothing false retained.
- `37-HEADER-FOOTER-BUILDER.md:1380` - Ordinary amendment reference, current and forward.
- `37-HEADER-FOOTER-BUILDER.md:1399-1402` - Process note about build order, no dead claim retained.
- `37-HEADER-FOOTER-BUILDER.md:1487` - Plain citation to a design-gate artefact, not a retained dead claim.
- `37-HEADER-FOOTER-BUILDER.md:1599` - Current behaviour statement.
- `37-HEADER-FOOTER-BUILDER.md:1614` - K6 — one-line decision + reason, already condensed guard rail.
- `37-HEADER-FOOTER-BUILDER.md:1625-1626` - Cross-reference to the already-registered §3.3 site (:220-244, EXCLUDE); this line states the current amendment plainly, nothing dead retained here.
- `37-HEADER-FOOTER-BUILDER.md:1676` - Part of a live negative-control style argument ("none of them is a no-op that could be silently dropped"), not a dead claim.
- `37-HEADER-FOOTER-BUILDER.md:1757` - Status-matrix row, "none dropped" is a correctly-stated negative-control claim already covered at :791-820.
- `37-HEADER-FOOTER-BUILDER.md:1765` - Status-matrix summary of the already-registered :1518 per-row-sticky rejection (EXCLUDE, correctly-stated guard rail); no new dead claim here.
- `37-HEADER-FOOTER-BUILDER.md:1768` - One-line pointer to FR-37-14 (already registered as BUILT, not contradicted); "superseded the earlier flat shape" is current fact, not dead text.
- `37-HEADER-FOOTER-BUILDER.md:1769` - Near-duplicate of the FR-37-13 status line already flagged ESCALATE at :945 (same claim, same contradiction with :964-984) — not registered separately to avoid two rows disagreeing about the same open question; resolving :945's ESCALATE resolves this row too.
- `37-HEADER-FOOTER-BUILDER.md:1771` - One-line pointer to the FR-37-27 correction already registered at :1280-1290 (CONDENSE); this row states current status only, no separate dead claim.
- `37-HEADER-FOOTER-BUILDER.md:1920-1935` - Describes the coverage-matrix METHOD (a live process rule), not a retained dead claim; "superseded corpus" = Spec 17, already deleted, referenced only as the audit's input.
- `36-SGS-NAVIGATION-SYSTEM.md:128` - K6 — one-line rejected-alternatives list for a design decision, already condensed.
- `36-SGS-NAVIGATION-SYSTEM.md:155-157` - Historical justification for a current data-model rule (D351), no dead claim retained for re-litigation.
- `36-SGS-NAVIGATION-SYSTEM.md:226-227` - Live open-gap record, correctly flagged as not silently dropped.
- `36-SGS-NAVIGATION-SYSTEM.md:258` - Same bullet as the registered :254-256 EXCLUDE entry (Bean's two binding design corrections); this clause is inside that already-quoted guard rail.
- `36-SGS-NAVIGATION-SYSTEM.md:262-266` - Summary-level restatement consistent with the canonical resolution already registered at :409-411 (C3) and the fuller :396-406 (ESCALATE) — states the current answer, no contradicted claim of its own.
- `36-SGS-NAVIGATION-SYSTEM.md:285` - Citation pointer for the already-registered :276-282 Task-5-rejection record; no dead text of its own.
- `36-SGS-NAVIGATION-SYSTEM.md:294` - K6 — one-line rejected-alternative-name note, already condensed guard rail.
- `36-SGS-NAVIGATION-SYSTEM.md:301-327` - Live build-progress record stating what's done/not-done directly; no retained false claim.
- `36-SGS-NAVIGATION-SYSTEM.md:369-370` - Explicit forward-pointer to already-applied corrections; the measurements themselves are marked as still standing, not dead.
- `36-SGS-NAVIGATION-SYSTEM.md:521` - Ordinary process note, current and forward.
- `36-SGS-NAVIGATION-SYSTEM.md:632-636` - Already condensed to one sentence; the earlier draft's shape is named but not reproduced at length.
- `36-SGS-NAVIGATION-SYSTEM.md:654-659` - K6 — resolution + one-line reason, correctly-stated guard rail.
- `36-SGS-NAVIGATION-SYSTEM.md:875` - Per contract EXCLUDE list — literal live use of "deprecated.js" as a real filename/policy reference.
- `36-SGS-NAVIGATION-SYSTEM.md:892-897` - Current mechanism/risk description, no dead claim retained.
- `36-SGS-NAVIGATION-SYSTEM.md:919` - Per contract EXCLUDE list — literal live use of "stale" describing cache behaviour, not a document-staleness claim.
- `36-SGS-NAVIGATION-SYSTEM.md:993` - Live status note, correctly distinguishing deferred from dropped — a guard rail, not dead text.
- `36-SGS-NAVIGATION-SYSTEM.md:1000-1001` - C1/C2-style old-value-immediately-followed-by-new-value; already terse, states current shape directly.
- `36-SGS-NAVIGATION-SYSTEM.md:1008` - Status-matrix row duplicating the already-registered :276-282 EXCLUDE entry (live decision record).
- `36-SGS-NAVIGATION-SYSTEM.md:1012-1021` - Duplicate of the Spec 37 :1790-1834 site (K1, registered above) — the Spec 36 copy is the short-form pointer, no lengthy dead deliberation retained here to condense.
- `36-SGS-NAVIGATION-SYSTEM.md:1218-1220` - Live guard rail against a specific miscitation — correctly stated, nothing false left standing.
- `27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:14` - Frontmatter `revision_history:` entry — provenance metadata, excluded per contract.
- `27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:18` - Frontmatter `revision_history:` entry — provenance metadata, excluded per contract.
- `27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:19` - Frontmatter `revision_history:` entry — provenance metadata, excluded per contract.
- `27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:20` - Frontmatter `supersedes_notes:` — explicitly excluded by contract as provenance metadata.
- `27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:94` - Design-principles section — this is the substantive rule statement (not a restatement of it elsewhere); functions as the source explanation the other `_sgs_sku_matrix` mentions point back to. Kept as-is.
- `27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:101` - Live guard rail describing how to read the table below it — no dead text dragged.
- `27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:105` - Single, compact parenthetical explaining current architecture's origin; not a restated dead-text block.
- `27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:123` - Different fact from `_sgs_sku_matrix` (this is the WC-native-variations DEFERRED-label retirement); single occurrence in the live doc, compact status row.
- `27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:127` - Compact status tag inside a large achievement-log row; the full explanation lives at line 518. Low-value to touch.
- `27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:193` - "rejected" used as ordinary technical/validation vocabulary, not a supersession note.
- `27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:225` - This is the canonical negative-control statement kept by the K4 group at 122/347/365/442 — deliberately retained findable, not touched.
- `27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:275` - This is the live current architecture description (not a stale claim plus a note); the amendment banner introduces the CURRENT rule, no dead text dragged.
- `27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:331` - `deprecated.js` is a real filename (WP block deprecation registry) — literal live use, explicitly excluded by contract.
- `27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:479` - Minimal 4-word aside, no old wire-format text reproduced at length; already compact provenance, not rot.
- `27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:480` - "rejected" is ordinary security/validation vocabulary, not a supersession note.
- `27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:483` - Same as 480 — ordinary validation vocabulary.
- `27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:489` - Literal live technical use ("stale-manifest fixtures" nearby) — explicitly excluded category per contract.
- `27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:507` - "save-time-rejected" (validation term) is the matched trigger; ordinary technical vocabulary, no supersession content.
- `27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:517` - Literal live use of "stale" — explicitly excluded.
- `27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:518` - Canonical, single detailed explanation of the image-sitemap descope; lines 127 and 568 are compact tags that reference this, not full restatements — kept as the source of truth.
- `27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:524` - Compact single-occurrence status note explaining a scope change; the quoted old framing is 8 words, not a dragged-along block.
- `27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:537` - Ordinary validation vocabulary ("rejected").
- `27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:545` - This is the FR-27-I3 requirement definition itself (with unique render.php behaviour + test), not a bare restatement of the 51/629 fact — legitimate structural content.
- `27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:549` - Strikethrough used correctly to mark one descoped item within a larger enumeration of what's included; the struck text is one word, immediately explained — not rot.
- `27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:568` - Compact status tag within an acceptance-summary list; full explanation lives at line 518.
- `27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:579` - Ordinary validation vocabulary ("rejected") in an acceptance-criteria list.
- `27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:583` - Terse acceptance-criteria checklist item referencing already-explained facts (lines 94/225/629) — normal for a Definition-of-Done list, not narrative rot.
- `27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:622` - External legal citation + literal "stale" usage — both explicitly excluded categories.
- `27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:629` - Canonical statement kept by the K4 decision at line 51 — this is the survivor, deliberately untouched.
- `27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:631` - K6 test: a one-line decision-log reference to "Option A ratified" with no deliberation of rejected options dragged along — guard rail, not rot.
- `18-SGS-FLOATING-UI.md:32` - Plain description of a real, single historical fact — no dead text dragged, functions as background context for the section.
- `18-SGS-FLOATING-UI.md:85` - Live current status, not a correction of a prior stale claim.
- `18-SGS-FLOATING-UI.md:264` - Heading over a legitimate one-off changelog describing a real deletion (985 lines, file list) — accurate historical record, not a stale claim with a correction bolted on; not duplicated elsewhere.
- `30-SGS-WOOCOMMERCE-PAGE-TYPES.md:38` - "retired" describes an external Google feature, not this spec's own content — no dead in-doc text dragged.
- `30-SGS-WOOCOMMERCE-PAGE-TYPES.md:53` - Literal historical fact about an external product change, single occurrence, guard-rail function (explains why this spec adds no FAQPage schema).
- `30-SGS-WOOCOMMERCE-PAGE-TYPES.md:56` - "Abandoned" is part of the literal e-commerce feature name ("abandoned cart"), not a correction/rejection note.
- `30-SGS-WOOCOMMERCE-PAGE-TYPES.md:145` - Live current rule with a brief provenance aside; no dead text reproduced at length.
- `30-SGS-WOOCOMMERCE-PAGE-TYPES.md:159` - External legal citation + live current rule — excluded category.
- `33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md:15` - Frontmatter `status_history:` entry (line is inside the `---`...`---` block, lines 1-49) — provenance metadata, excluded per contract.
- `33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md:24` - Frontmatter `status_history:` entry (v1.2.1, inside lines 1-49) — provenance metadata, excluded per contract.
- `33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md:34` - Frontmatter `status_history:` entry (v1.2.1, inside lines 1-49) — provenance metadata, excluded per contract.
- `33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md:36` - Frontmatter `status_history:` entry (v1.2.1, inside lines 1-49) — provenance metadata, excluded per contract, despite superficially matching the C5 self-historiography pattern (the dispatch hint flagged this site; overridden here because it sits inside the frontmatter block, which the contract excludes wholesale). The body-text sibling of this same correction, at line 224, IS in scope — see that entry.
- `33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md:216` - Literal live use of "dropped" describing current behaviour — excluded category.
- `33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md:248` - Literal live use of "dropped" describing a real gap-logging mechanism — excluded category.
- `33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md:290` - FR-33-12's fail-closed-on-stale-snapshot rule — explicitly named as excluded in the contract's EXCLUDE list.
- `33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md:364` - Same FR-33-12 stale-snapshot rule in table form — excluded category.
- `33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md:396` - Literal live use of "stale" describing real site data — excluded category.
- `33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md:404` - Same as 396 — literal live use of "stale".
- `19-SGS-CLI-COMMANDS.md:97` - "rejected" is ordinary CLI-validation vocabulary.
- `19-SGS-CLI-COMMANDS.md:111` - Same as 97 — ordinary CLI-error-table vocabulary.
- `19-SGS-CLI-COMMANDS.md:162` - Live current-behaviour note (single, distinct mechanism — FR-S2-1's auto-trigger), no dead text dragged, not restated elsewhere.
- `19-SGS-CLI-COMMANDS.md:287` - Distinct mechanism (FR-S7-3 guard) from the 162/350/419 retirements — single occurrence, functional description.
- `19-SGS-CLI-COMMANDS.md:382` - One-line comment inside the quick-reference cheatsheet code block, telling a scanning reader the command doesn't exist — same legitimate function as a roster's "DEAD — never cite" entry. Left as-is rather than folded into the K5 table (different document location/purpose).
- `00-naming-conventions.md:18` - Live naming rule — explicitly excluded by contract ("the `sgs-theme/` deprecated-namespace naming rule").
- `00-naming-conventions.md:81` - Compact single-occurrence technical provenance aside, no dead text dragged.
- `00-naming-conventions.md:91` - Same fact-shape as line 81 but about a different table lineage detail; legitimate live technical description.
- `00-naming-conventions.md:126` - Live technical description of a real code change; "stale"/"dropped" used in their ordinary technical sense.
- `00-naming-conventions.md:168` - "deprecated" describes the shim's live, ongoing function (resolving deprecated slugs) — literal live use, excluded category.
- `20-CLONE-FIDELITY-MEASUREMENT.md:13` - Frontmatter `status_history:` entry (lines 1-26) — provenance metadata, excluded per contract.
- `20-CLONE-FIDELITY-MEASUREMENT.md:22` - Frontmatter `absorbs:` list entry — provenance metadata, excluded per contract.
- `20-CLONE-FIDELITY-MEASUREMENT.md:23` - Frontmatter `absorbs:` list entry — provenance metadata, excluded per contract.
- `20-CLONE-FIDELITY-MEASUREMENT.md:154` - Literal live use of "dropped" describing a measurement category, not a stale claim.
- `20-CLONE-FIDELITY-MEASUREMENT.md:185` - Live acceptance criterion for FR-20-7, not a correction of dead text.
- `20-CLONE-FIDELITY-MEASUREMENT.md:244` - Literal live use of "dropped" describing a measurement/guard behaviour.
- `20-CLONE-FIDELITY-MEASUREMENT.md:249` - Live tooling guidance note, literal use of "stale" in its ordinary caching sense.
- `20-CLONE-FIDELITY-MEASUREMENT.md:262` - Table row, literal live use of "dropped" — same pattern as 154/244.
- `26-SGS-GLOBAL-STYLES-AND-THEMING.md:14` - Frontmatter `references:` list entry (lines 1-27) — provenance metadata, excluded per contract.
- `26-SGS-GLOBAL-STYLES-AND-THEMING.md:31` - Compact correction (one sentence naming the wrong framing, one sentence giving the correct model, one live action item) — already at the K1 target length, functions as a guard rail rather than dragged-along rot.
- `26-SGS-GLOBAL-STYLES-AND-THEMING.md:40` - Single-occurrence, informative historical context for the problem statement — not restated elsewhere in this spec.
- `26-SGS-GLOBAL-STYLES-AND-THEMING.md:185` - Live verification citation + literal "stale" use — guard rail, not a correction of dead text.
- `00-OVERVIEW.md:172` - Legitimate archived-link annotation pointing readers to the archive + the live status doc — roster-style function, not dead text with a note.
- `README.md:11` - Roster function — introduces the status enum. Explicitly excluded ("its status-tag enum").
- `README.md:18` - Status-tag enum entry — explicitly excluded.
- `README.md:19` - Status-tag enum entry — explicitly excluded.
- `README.md:20` - Status-tag enum entry — explicitly excluded.
- `README.md:34` - Archived-index row — explicitly excluded.
- `README.md:40` - DELETED index row (strikethrough is the roster's own dead-file marker) — explicitly excluded.
- `README.md:44` - Archived index row — explicitly excluded.
- `README.md:49` - DELETED/archived index row — explicitly excluded.
- `README.md:54` - Live status row for a current spec, not a dead-spec entry — roster doing its job, no stale claim.
- `README.md:56` - DELETED index row — explicitly excluded.
- `README.md:57` - This cell is a live guard rail warning readers not to trust a past "complete" claim and pointing to LEDGER.md as the current source — it is doing exactly the job an EXCLUDE-worthy guard rail does, not dragging dead content forward as fact.
- `README.md:64` - Header sentence for the `## DEAD — never cite` roster — explicitly excluded.
- `README.md:66` - DEAD-never-cite roster entry — explicitly excluded.
- `README.md:67` - DEAD-never-cite roster entry — explicitly excluded.
- `README.md:69` - DEAD-never-cite roster entry — explicitly excluded.
- `README.md:73` - Part of the same DEAD-list section, a genuinely useful caveat (not itself dead text) — excluded.
- `README.md:84` - Live index row confirming a moved file resolves correctly — roster doing its job.
- `README.md:96` - Header sentence for the legacy-file index — roster function.
- `README.md:98` - Legacy-file index row — roster function.
- `README.md:99` - Legacy-file index row — roster function.
- `03-SGS-BOOKING.md:111` - "cancelled" is a UK-spelling EXAMPLE inside a live naming rule, not a status marker.
- `03-SGS-BOOKING.md:260` - "stale" is live technical vocabulary describing a caching hazard. Live rule, no dead text.
- `03-SGS-BOOKING.md:275` - "rejected" describes runtime validation behaviour, not a rejected design option.
- `03-SGS-BOOKING.md:680` - Domain vocabulary — cancelling a booking. Live rule.
- `03-SGS-BOOKING.md:686` - Domain vocabulary. Live rule.
- `28-SGS-SMART-BULK-PRICING.md:19` - Correctly-stated provenance: says what happened and what was sound, drags no dead v1 text with it.
- `28-SGS-SMART-BULK-PRICING.md:61` - Live FR signature. Vocabulary match is incidental.
- `28-SGS-SMART-BULK-PRICING.md:102` - Live acceptance criterion. "Corrected" names the CURRENT example, not a stale one.
- `28-SGS-SMART-BULK-PRICING.md:128` - External legal citation — explicit EXCLUDE per contract.
- `28-SGS-SMART-BULK-PRICING.md:139` - Live status row pointing forward to the current maths. No dead text retained.
- `28-SGS-SMART-BULK-PRICING.md:155` - Subsumed by the K5 row at 145-166 — listed separately so the Phase-3 gate maps this line rather than reporting it as an unexplained survivor.
- `28-SGS-SMART-BULK-PRICING.md:167` - Live section — this IS the current worked example. Flagged in the K5 row as a citation dependency, not rot in itself.
- `26-SGS-GLOBAL-STYLES-AND-THEMING.md:42` - Live section heading. "Corrected" names the CURRENT model; no superseded model retained beneath it.
- `26-SGS-GLOBAL-STYLES-AND-THEMING.md:81` - Live FR. Forward-declares what it supersedes; drags no dead Decision-18 text with it.
- `26-SGS-GLOBAL-STYLES-AND-THEMING.md:82` - Live acceptance criterion naming an action still owed.
- `26-SGS-GLOBAL-STYLES-AND-THEMING.md:255` - Live section heading — this section's JOB is to declare supersession.
- `26-SGS-GLOBAL-STYLES-AND-THEMING.md:257` - Live cross-reference carrying an open action. ⚠ Pairs with the Spec 01:598 CONDENSE row in `02-01-11.md` — the applier should confirm the two edits stay consistent.
- `26-SGS-GLOBAL-STYLES-AND-THEMING.md:258` - Live statement of what is owed to decisions.md. No dead text.
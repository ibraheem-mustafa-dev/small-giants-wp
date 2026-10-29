# Adversarial council on Claude Design's cloning-pipeline critique and its Indus skeleton (2026-10-29)

Input: `sites/indus-foods/Claude Design Critique + Basic Skeleton/` (`Cloning Pipeline Critique.md`, `sgs-skeleton/indus-globals-home.json`, the wireframe). Four blind reviewers checked it against the code at `4c49ff318`, the framework DB (read-only) and the Indus draft: a claim verifier for the stages, a skeleton-mechanics verifier, a clone auditor comparing the hand skeleton with the draft and the pipeline's 2026-10-28 skeletons, and a delivery lead sorting the remedies.

## Verdict

The critique is a useful input, filtered. Its findings about faults are mostly true; about a third of its supporting claims are wrong or overstated; two of its remedies cross Bean's rulings. The hand skeleton picks better blocks than the pipeline in several places but invents about 20 attributes and values, so it is evidence, never a source.

## Convergent findings (two or more reviewers, verified)

| # | Finding | Evidence | Fix |
|---|---|---|---|
| 1 | `sgs/hero`'s `block_composition` accepts only `["sgs/media"]`; `hero/edit.js` sets no `allowedBlocks` (any block) and its template is label, heading, text, multi-button. `sgs/product-card` and `sgs/team-member` are stale the same way | DB row; `sgs-update-v2.py::_populate_allowed_blocks` ("a None never clears a value written earlier"); the hero row is not in `seed-composition-roles.py` (only a comment names it) | Seeder writes "any" distinctly from "unknown" and clears on no declaration; a test comparing the DB with every `edit.js`; reseed. Cause to prove by one seeder run on a copy before the fix |
| 2 | Skeleton rules read the raw `style`; `clamp()` and `var()` give null, so `cardHeading`, `label`, `isMarker`, `readingProgress` do not fire on real Indus headings. Holes are already resolved (the inventory reads the rendered attribute); the comment on `declared()` is stale | `lib/skeleton-rules.mjs::declared`, `::lengthPx`; saved Indus inventories | Record computed `font-size`, `height`, `width` per width in `lib/skeleton-inventory.mjs` beside `display`/`position`; the rules read those |
| 3 | Handler reading sees only `sc-camel-on-click="{{ x }}"`, in a snippet cut at 400 characters (308 of 4,224 Indus snippets lose the opening tag) | `lib/skeleton-rules.mjs::makeRules` `handlerOf`; `lib/draft-link.mjs::elementHandler`; `lib/skeleton-inventory.mjs` | A template reader recording every `sc-camel-on-*` binding (and logic listeners) in the fact record; the rules read it. At minimum stop the cut |
| 4 | Nothing checks that the built tree is the reviewed one. The site run re-proposes with the saved decisions and picks (by design), but a decision whose `tag|words` signature changed goes stale silently, and two elements with the same signature can swap decisions | `site-run.mjs::prepare`; `skeleton.mjs::proposeSurface`; `lib/skeleton-classify.mjs::overrideFor` | After propose, compare block per key with the reviewed rows and fail the surface naming the changed rows; add the parent chain to the signature |
| 5 | Stage 0 calibrates a guessed block set (`FIXED_BLOCKS` plus slug-suffix matching); blocks the skeleton later picks rely on a gitignored local cache (reported as `uncalibrated`, not silent) | `lib/stage0.mjs::blocksForKinds`, `::FIXED_BLOCKS` | After review, check every confirmed block is calibrated and calibrate the missing ones before Fill |
| 6 | The push copies the DB and uploads only; no plugin build comparison, no functional check after | `scripts/local-wp/push-to-remote.sh` | Compare the `sgs-blocks` build hash on mirror and target and refuse on a mismatch; run `site-check.mjs` on the remote |
| 7 | A walker exit 1 (open differences, unreviewed rows, live errors) counts as a passed walk | `site-run.mjs` walk step; `lib/site-run-walk.mjs::walkVerdict` | Put the counts in the walk status |
| 8 | Rule verdicts carry confidence 1, so the finaliser never sees a rule that fired wrongly (they do reach the review, grouped by rule). Spec 48's skeleton writer says "each with a confidence" | `lib/skeleton-classify.mjs::fromRule`; `lib/intake-run-finalise.mjs` (`LOW_BELOW = 0.7`) | Bean (D1): rules keep winning by default; a rule row whose DB evidence strongly prefers another block goes to the finaliser and the review |

## Single-reviewer findings kept

- `site-build.mjs` builds the secrets path from the site name instead of `target.envFile`/`envKey` (matches today, breaks on a differently named target); the catalogue step's order is held only in comments.
- `site-run.mjs` falls back to a machine-specific certifi path when `NODE_EXTRA_CA_CERTS` is unset.
- `METHOD.md` reads at 375/800/1400; the route at 375/768/1440; Solve adds 1920.
- `backToTop` turns a floating back-to-top into a button; a fixed one is a Spec 18 Customiser option, like `readingProgress`.
- `blocksForKinds` is loose: `panel` also calibrates `sgs/wishlist-panel`.
- The fact record's `effects`, `assets` and `readme` fields are built (`lib/fact-record.mjs::buildFactRecord`) but nothing reads them.

## Critique claims that are wrong or overstated

- `accordion`, `form-step` and `result` do map to blocks; only `backdrop`, `page` and `global` are unmapped.
- `stateRows(null)` falls back to the default DB.
- `read-animations`, `read-assets`, `read-readme` are called (facts stage); only their output is unused.
- "The render decides which elements exist": true for the skeleton inventory, false for the fact record, which is built from the template and logic.
- `sgs/mega-panel`'s composition matches its `edit.js` per-variant `allowedBlocks`; a label directly in the panel needs a block change, not a data fix.
- `trust-bar`'s `container_kind = 'section'` is correct, and `pageSection()` reads it.
- `accepts` cannot come from `block.json`: none of these blocks declares `allowedBlocks` there; the lists live in `edit.js`, which the seeder already reads.
- There are about 50 rule verdicts, not 30; the pipeline already chooses some blocks from the content model (`lib/skeleton-loop-blocks.mjs::loopBlocks`, `drawsChildren` over `array_item_schema`).

## Remedies rejected (cross Bean's rulings)

- `components.json` neutral roles with a role-to-block table: the handoff would decide blocks (the plan deleted on 2026-10-29).
- The author-side skeleton as a strong prior: the same thing by another route; its 12-point review was cheap because the author knew the SGS blocks. Kept as a comparison fixture only.
- A per-element `listeners` list from the handoff: a second, producer-written source of what the code already states; build the reader instead.

## The hand skeleton against the draft and the pipeline (2026-10-28 skeletons)

The pipeline column predates the 2026-10-29 merges, so each pipeline row below is re-checked on a fresh proposal before it is fixed.

**Claude Design right, pipeline wrong:** the floating WhatsApp button 728 (`sgs/whatsapp-cta` floating; the pipeline makes a dead `sgs/button` in the footer); the scroll progress bar 38 (a Spec 18 option; the pipeline drops it); the drawer top row 113 to 118 (the `nav-drawer` draws it from its own settings; the pipeline adds a second logo and an empty close container); the looped service cards 229 and why-choose cards 241 (`card-grid`, `feature-grid` > `info-box`; the pipeline builds containers); the closing CTA pair 312 to 314 (`multi-button`; the pipeline builds `sgs/icon-list`); the photo credit 725 (the pipeline drops it); the empty header bottom row (the pipeline invents it).

**Pipeline right, Claude Design wrong:** the contact pills as `multi-button` with Site Info link sources; the mega panel tpl ids and the built-post rule; the mega link rows; decorations as `sgs/decorative-image`; one drawer menu reusing the mega panels; footer cards with link sources; `business-info` `attribution`; `linkSource: directions`; the hero image as the hero's split-media settings (Claude Design copied the DB's wrong hero row).

**Both wrong:** the header middle row (the pipeline nests the desktop nav inside a container the draft hides at desktop); the drawer CTA 197 (the pipeline loses `href="#/apply"`); the footer hours pill 673 and line 680 (a static label plus a second pill; should be one `business-info open-status`, linked to the Google Business Profile); back to top 726 (in flow, so `sgs/button` `linkSource: top` with its label and arrow); the brand strip source (`product-brands`, ruled 2026-10-29); the sectors mega panel with no `sgs/mega-panel` root.

**Neither covers:** footer decorations 654 and 655, the backdrop 106 as `scrimColour`/`scrimBlur` on `nav-bar-menu` and `nav-drawer`, footer separators 722 and 724, the hero section's own background.

**Claude Design's invented names and values:** `site-header.stickyRow`; `button.variant`, `hidden`, `pinned`; `container.link`; `icon.icon`; `text.link`; `responsive-logo.variant`; `icon-list.columns`; `testimonial.of`; `media.shape`; `brand-strip.marquee`, `pauseOnHover`; `whatsapp-cta.labelShowOn`; `nav-drawer.bgSvg*`; `nav-drawer-menu.panelLayout`; `mega-panel.source`; `timeline.connector`, `process-steps.connector`; `mega-panel.style: logos`; `card-grid.variant: image`; `mega-group.linkSource: menu`; per-device `button.label`, `timeline.orientation`, `process-steps.layout`.

## Bean's answers (2026-10-29)

- **D1 rule confidence:** rules keep winning by default; a rule row whose DB evidence strongly prefers another block is sent to the finaliser and the review.
- **D2 drawers:** not a fault. A drawer surface is a CPT surface the handoff names, so its root block follows its record, and Bean already set how drawers differ. The filter drawer's rule (a drawer whose root holds the catalogue's filter groups is the shop filter's own overlay, `lib/skeleton-filter-drawer.mjs`) and the page-landmark rule were held on `fix/w3-debug`; merged to `main` in `7de9eecc6`.
- **D3 `sgs/mega-panel`:** stays as it is (the eyebrow is the `brands` variant's `brandsEyebrow` setting).
- **D4 per-device connector:** Bean only acknowledged reading Claude Design's point; there is no such setting. The draft shows the timeline line only at desktop and the steps connector from 768 up, so this is a framework gap row.
- **D5 handoff asks:** yes, for the next export: optional `data-part` ids, a structured `how_to_reach` beside the prose, typed `state_keys`, one threshold form, `METHOD.md` widths at 375/768/1440.
- **Looped card sections (Bean, 2026-10-29):** a looped card set built as containers is acceptable; it is not a fault and no collection-block rule is built for it. Where a block is wanted, Indus's service cards match `sgs/feature-grid`, not `sgs/card-grid`.
- **Photo credit:** removed as a brief-only line, as the pipeline already does (Bean: it should not exist).

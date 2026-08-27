---
doc_type: spec
spec_id: 40
spec_version: 0.1.0
title: Generative cover images — deterministic, brand-coloured, pre-generated artwork
project: small-giants-wp
status: draft
authors: [Claude Code, Bean]
session_date: 2026-08-27
last_verified: 2026-08-27
status_history:
  - 2026-08-27 — v0.1.0. SCOPE ONLY. Owner decided the four placements and the generator
    shape at a design gate; the visual target is deliberately unresolved pending a
    reference image he has actually seen. Nothing may be built from this document yet.
---

# Spec 40 — Generative cover images

## 0. Plain English (what this is, and what it is NOT)

⚠ **READ THIS FIRST — "generative" names two unrelated things in this project.**

| | This spec (Spec 40) | The other one |
|---|---|---|
| **What** | A **static image file**, generated ahead of time and cached | A **live animated background** rendered in the browser |
| **Where** | An offline script; output is a `.webp`/`.png` on disk | `webgl/`, Tier W, running per page view |
| **Called** | Generative cover images | "Generative background engine" — the POC rebuild |
| **Owner** | This spec | The motion track (see `LEDGER.md` Motion Track §B) |
| **Motion?** | **None.** No tier, no runtime, no reduced-motion contract | Spec 38, Tier W, all of the above |

They share an adjective and nothing else. `.claude/reports/2026-08-25-generative-background-engine-technique-spec.md` belongs to the OTHER one. **If you arrived here looking for the animated background, you are in the wrong document.**

**What this actually is, plainly:** most small clients have no photography. A blog post with no
image looks broken; a shared link with no image gets ignored. This generates attractive,
on-brand artwork automatically so that never happens — and because it is generated from the
client's own colour palette, every cover looks like it belongs to that client's site.

## 1. Why this is NOT in Spec 38

Spec 38 governs **motion** — four tiers, each with a runtime cost, a reduced-motion contract and
an editor-canvas story. A cached static image has none of those. It rode along in the motion
track only because it surfaced in the same conversation as the wave-gradient work. Owner's call,
2026-08-27, and correct: *"Feels like this doesn't really fit well in spec 38 tbh."*

Spec 39 is reserved by the tier-migration pacing item (37 `xfail(strict=True)` conformance
goldens name it), so this took 40.

## 2. Placements — all four owner-selected (2026-08-27)

- **FR-40-1 Blog / article headers.** Artwork behind a post title when no featured image is set.
  Highest volume; the most obviously valuable.
- **FR-40-2 Section / hero backgrounds.** Generated artwork as a section background.
- **FR-40-3 Social / OG share images.** The image shown when a page is shared. ⛔ **Hard
  constraint: a real file at a fixed 1200×630.** Scrapers do not run JavaScript and do not
  resize — this placement ALONE rules out any live/browser-side generator.
- **FR-40-4 Product / category cards.** Artwork behind shop cards with no product photography.

**In all four the cover is a FALLBACK, never an override.** An uploaded image always wins. A
generated cover appearing over a client's own photograph is a defect, not a feature.

## 3. Generator — offline script, cached files (owner-selected)

- **FR-40-5 Offline generation.** A script produces real image files, written once. Zero runtime
  cost, zero page-weight risk, and it satisfies FR-40-3, which nothing else does.
- **FR-40-6 Palette from the client's own tokens.** Colour is read from
  `sites/<client>/theme-snapshot.json` (Spec 33), so re-theming a client re-colours their covers.
  ⛔ Never hardcode a client colour — the framework rule.
- **FR-40-7 Deterministic from a seed.** The same post must always produce the same cover. Seed
  from a stable identifier (post ID or slug). A cover that changes on regeneration is a bug: it
  breaks caches, CDNs, and every already-shared social preview.
- **FR-40-8 Regenerable on demand.** A client changing brand colours must be able to re-run it.

## 4. The look — scoped from form, ground and hue adjacency

⛔ **D781 rescope, load-bearing.** This item originally justified itself as needing "an
artist-authored palette texture rather than four interpolated stops". **The POC measured that
premise FALSE.** A palette-texture pipeline is an expensive answer to a question that turned out
not to be the question. Scope the look from **form, ground and hue adjacency** instead.

The one durable finding worth carrying from D781: Stripe's palette samples are almost all above
`0xf0` — **adjacent warm hues at very high lightness**, not widely-spaced saturated hues over a
dark ground. Hue ADJACENCY is what reads as designed; hue DISTANCE is what read as cheap.

## 5. ⛔ Build gate — nothing is buildable from this document

**No implementation may begin until the owner supplies a reference image he has actually seen and
approved.** This is not process ceremony; it is D781's specific lesson:

> *"Three Aurora attempts and one full Tier W build were made against a reference nobody had
> looked at… One screenshot at the start would have saved the whole build."*

**Owed before any build estimate:** the reference · which placement ships first · whether covers
live in the uploads directory or the client site repo · the regeneration trigger.

## 6. Open questions (not decided — do not invent answers)

1. **Where do generated files live?** `wp-content/uploads/` (client-owned, survives deploys, not
   in git) vs `sites/<client>/` (in git, reviewable, but binary churn). Affects backup and deploy.
2. **What triggers regeneration?** Publish hook, WP-CLI command, or deploy step. FR-40-8 says a
   client must be able to do it; that likely means WP-CLI is not sufficient alone.
3. **One image or a resolution ladder?** FR-40-3 fixes 1200×630, but FR-40-1/2 want responsive
   sources. Generating a ladder multiplies storage.
4. **Does an editor control exist?** The framework rule is that a capability without an editor
   control is not done — but a *fallback* may be the exception. Needs a ruling.
5. **Alt text.** A generated decorative cover is presumably `alt=""` + `role="presentation"`, but
   FR-40-1 headers may be content rather than decoration. WCAG 1.1.1 ruling owed.

## 7. Dependencies

- **Spec 33** — `theme-snapshot.json` is the palette source (FR-40-6).
- **Spec 32** — no inline styling if a cover is ever applied via a block.
- **NOT Spec 38.** See §0. Nothing here is motion.

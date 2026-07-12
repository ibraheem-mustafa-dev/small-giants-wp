---
doc_type: handoff
project: small-giants-wp
generated: 2026-07-12
session: D314 — page-8 100%-clone proof (~95%, not 100%) + C description-colour FIXED live + Spec 20 v1.1.0 (parity-tool build deferred) + E deferred
---

# Session Handoff — 2026-07-12 (D314)

## Completed This Session
1. **Task 1 — exhaustive independent draft-vs-live DOM ledger** (`reports/visual-diff/page8-dom-ledger-2026-07-12.md`). Deliberately a DIFFERENT methodology from `computed-parity.js` (curated human-check prop set + live `getComputedStyle` probes + screenshot pairs at 375/768/1440) so it is an independent ground truth. **Verdict: ~95% faithful, NOT 100%** — 5 clone-side divergences.
2. **Dispositions (Bean):** **A** (pack-pill selected-state + ✓) **ACCEPTED**; **B** (info-box `--elevated` card shadow) **ACCEPTED**; **D** (`<a>`→button routing) **SAFE — KEEP**; **C** (description colour/font) **FIXED + LANDED**; **E** (product-card CTA padding) **DEFERRED** (D284-entangled).
3. **D root cause + Bean's test answered:** proven on the REAL converter (`convert_section`) that an INLINE `<a>` inside a `<p>` stays inline HTML inside `sgs/text` (`{"text":"… <a href>link</a> …"}`), NOT a button — only a STANDALONE bare `<a>`→`sgs/button` (`html_tag_to_core_block: a→sgs/button`). So Bean's "buttons mid-text" worry does NOT occur → keep the routing.
4. **C root-caused + FIXED + verified LIVE.** Systemic gap: product-card `descColour`/`descFontSize`/`descLineHeight` had `role=NULL` + `derived_selector=NULL` (missed in the D285 title-family pass) → the D301 role-driven CSS router couldn't see them → draft `var(--text-muted)` dropped to the block default `--text`. Fix = seed `role`+`derived_selector='.sgs-product-card__description'` via `ATTR_CLASSIFICATION_OVERRIDES` (`sgs-update-v2.py`, R-31-1 channel) → `/sgs-update --stage 1` → re-clone page 8. STOP-44 pre-checked (render.php consumes desc* at :165/:188). **LANDED live: both descriptions now `rgb(107,92,80)` (#6B5C50), 14px, 1.55** — exactly the draft.
5. **Task 2 SPEC-FIRST: Spec 20 → v1.1.0** (the parity-tool rebuild's contract, BUILT NEXT SESSION). Added FR-20-9 (tag + element-structure as scored dims), FR-20-10 (class names = INFORMATIONAL only, per Rule 1), FR-20-11 (force-load lazy/below-fold before measuring — the D314 story-image false-negative guard), FR-20-3a (visible-fidelity thresholding — the tool must not count sub-visible representational twins), extended FR-20-4.
6. **Scoring correction (Bean-challenged, correct):** the current tool's 76% badly under-counts. Honest: 76% raw → 84% (drop font-family-fallback-stack + `interactivity`/`appearance` false buckets, 297 props) → 89% (accepted A/B, 146 props) → **~94–95% VISIBLE** (drop sub-visible twins: line-height reps, margin-absorbed-by-gap, `display:flex↔block`, `align-items:normal↔stretch`, flex-grow). Bean's "high 90s" was right.
7. **A false alarm caught + killed:** my first full-page screenshots showed the brand-story image "missing" — a **lazy-load artifact** (below-fold `loading=lazy` image not yet painted when `fullPage` fired). Live-DOM probe was right; the image renders fine. → FR-20-11.

## Current State
- **Branch:** `main`, D-ceiling **D314**. Committed this session (see Files Modified).
- **Live:** sandybrown page 8 re-cloned this session with the C fix. Description = muted brown #6B5C50 / 14px / 1.55 (verified). LiteSpeed + CDN purged.
- **Tests:** converter suite **449 passed, 1 skipped** (no regression from the DB seed).
- **DB:** `~/.claude/skills/sgs-wp-engine/sgs-framework.db` reseeded (Stage 1) — NOT in git; regenerated from the committed `sgs-update-v2.py` override via `/sgs-update`.

## Also completed (Bean-directed follow-on, same session)
- **E (product-card CTA padding) — FIXED + LANDED** via composite-mirror (FR-31-21.1): block.json `ctaPaddingX/Y` defaults 20/12→24/14 (aligned to the `sgs/button` standard, found the real source by enumerating live matched rules) + removed the divergent `style.css` `:where()` padding/min-height/display. CTAs now render 14/24, 48, flex (draft-exact). No reclone (default read at render).
- **C-type + E-type same-type sweep + QC:** E-type = only product-card diverges (unique). C-type = swept product-card `priceNote*` (verified #6B5C50/13px); documented `sgs/mobile-nav` (state colours) + `sgs/trust-bar` (SVG shape-divider) as a future scoped pass (different mechanisms — not blindly seeded per wake-latent-misseeds). Converter 449 pass; build gates green.

## Known Issues / Blockers
- **Page 8 in-contract fidelity is now complete** (A/B accepted, C+E fixed, D safe). Remaining C-type same-type items (mobile-nav state colours, trust-bar shape-divider) are a small future scoped pass — not blocking.
- None blocking.

## Next Priorities (in order) — Bean-directed
1. **Build the parity-tool rebuild to Spec 20 v1.1.0** (design LOCKED). Validate its verdict against the D314 ledger (`reports/visual-diff/page8-dom-ledger-2026-07-12.md`) — must AGREE (~94–95% visible), never self-report. Core fixes: font-family primary-only, blocklist `interactivity`/`appearance`, threshold sub-visible twins (FR-20-3a), add tag/structure/class-info dims (FR-20-9/10), lazy-load force-load (FR-20-11).
2. **(small) The remaining C-type same-type sweep** — `sgs/mobile-nav` focus/active/sublink + `sgs/trust-bar` shapeDivider* null-role attrs. Different mechanisms (state selectors / SVG pseudo) — verify each before seeding.

## Files Modified
| File | What |
|---|---|
| plugins/sgs-blocks/scripts/sgs-update-v2.py | C fix — desc* `ATTR_CLASSIFICATION_OVERRIDES` (role + derived_selector) |
| .claude/specs/20-CLONE-FIDELITY-MEASUREMENT.md | v1.1.0 — FR-20-9/10/11/3a + extended FR-20-4 (parity-tool contract) |
| reports/visual-diff/page8-dom-ledger-2026-07-12.md | NEW — independent DOM ledger + C/D/E root causes + dispositions + scoring correction |
| .claude/decisions.md | D314 |

## Notes for Next Session
- **The parity tool over-counts BROADLY, not just font-family** — sub-visible representational twins (line-height px reps, margin absorbed by flex-gap, display flex↔block, align-items normal↔stretch) are the second big bucket. FR-20-3a is the requirement; validate against the D314 ledger's ~94–95%.
- **C's fix pattern is reusable:** null-`role`/null-`derived_selector` on a block's scalar-styling attr = the D301 router can't route it. Other blocks likely have the same latent gap (`priceNoteColour`, `ctaColour*`, etc.) — audit before enabling (`enabling-a-capability-wakes-latent-misseeds`).
- **E is NOT a role-seed** (padding path differs from color/typography). Don't try the C fix on it.
